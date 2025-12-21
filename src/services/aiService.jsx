import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// --- KEY HIDING UTILITY ---
// This function removes any API key patterns (AIza...) from error text
const sanitizeError = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Regex to find Google API Keys and replace them with [HIDDEN]
    return text.replace(/api_key:[a-zA-Z0-9_\-]{35,}/g, 'api_key:[HIDDEN]');
};

// --- ENVIRONMENT SETUP ---
const PROD_API_URL = import.meta.env.VITE_API_BASE_URL;
const isNative = Capacitor.isNativePlatform();
const API_BASE = isNative ? PROD_API_URL : '';

// --- CONFIGURATION ---
const GEMINI_MODEL = 'gemini-3-flash-preview'; 

const API_CONFIGS = [
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Primary' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 1' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 2' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 3' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 4' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 5' },
];

const NUM_CONFIGS = API_CONFIGS.length;
let currentApiIndex = 0;
const FREE_API_CALL_LIMIT_PER_MONTH = 500000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let usageCache = { callCount: 0, resetMonth: 0, lastChecked: 0 };
const CACHE_DURATION_MS = 60000;

// --- USAGE TRACKING ---
const checkAiLimitReached = async () => {
    const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
    const currentTime = Date.now();

    if (currentTime - usageCache.lastChecked < CACHE_DURATION_MS) {
        if (usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
            console.warn("AI monthly limit reached (from cache).");
            return true;
        }
        return false;
    }

    try {
        const usageSnap = await getDoc(usageDocRef);
        const currentMonth = new Date().getMonth() + 1;

        if (usageSnap.exists()) {
            const { callCount, resetMonth } = usageSnap.data();
            if (resetMonth !== currentMonth) {
                usageCache = { callCount: 0, resetMonth: currentMonth, lastChecked: currentTime };
                await updateDoc(usageDocRef, { callCount: 0, resetMonth: currentMonth });
            } else {
                usageCache = { callCount, resetMonth, lastChecked: currentTime };
            }
        } else {
            usageCache = { callCount: 0, resetMonth: currentMonth, lastChecked: currentTime };
            await setDoc(usageDocRef, { callCount: 0, resetMonth: currentMonth });
        }

        if (usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
            console.warn("AI monthly limit reached (from Firestore).");
            return true;
        }
        return false;

    } catch (error) {
        // Sanitize error just in case
        console.error("Error checking AI usage:", sanitizeError(error.message));
        return false; // Fail open if tracker is down
    }
};

// --- CORE API CALLER (SECURE) ---
const callProxyApiInternal = async (prompt, jsonMode = false, config, maxOutputTokens = undefined) => {
    try {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: prompt,
                jsonMode: jsonMode,
                maxOutputTokens: maxOutputTokens,
                model: config.model 
            }),
        });

        // 1. Get raw text first
        const rawText = await response.text();

        if (!response.ok) {
            // 2. SANITIZE ERROR BEFORE LOGGING
            const safeErrorText = sanitizeError(rawText);
            console.error(`Proxy Failed (${config.url}): ${response.status}. Response: ${safeErrorText}`);
            
            const error = new Error(safeErrorText.substring(0, 200)); 
            error.status = response.status;
            throw error;
        }

        if (!rawText) throw new Error("Proxy response was empty.");

        // 3. Handle JSON Errors that come as 200 OK (Edge case)
        if (rawText.trim().startsWith('{"error"')) {
            try {
                const errorJson = JSON.parse(rawText);
                const safeMessage = sanitizeError(errorJson.error || "Unknown error");
                throw new Error(safeMessage);
            } catch (e) {
                if (e.message !== "Unknown error") throw e; // Re-throw real parsing errors if needed
            }
        }

        return rawText;

    } catch (error) {
        // Ensure even network errors are sanitized if they somehow contain sensitive info
        error.message = sanitizeError(error.message);
        throw error;
    }
}

// --- LOAD BALANCER ---
const callGeminiWithLoadBalancing = async (prompt, jsonMode = false, maxOutputTokens = undefined) => {
    const startIndex = currentApiIndex;
    currentApiIndex = (currentApiIndex + 1) % NUM_CONFIGS;
    const errors = {};

    for (let i = 0; i < NUM_CONFIGS; i++) {
        const keyIndex = (startIndex + i) % NUM_CONFIGS;
        const config = API_CONFIGS[keyIndex];

        try {
            // Simplified: Direct call to proxy
            const response = await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
            return response;

        } catch (error) {
            errors[config.name] = sanitizeError(error.message);

            if ([429, 503, 500, 504].includes(error.status)) {
                console.warn(`Retryable error on ${config.name}. Waiting...`);
                await delay(2000); 
            } else {
                console.error(`Non-retryable error on ${config.name}:`, errors[config.name]);
            }
        }
    }
    
    throw new Error(`All AI services failed. Details: ${JSON.stringify(errors)}`);
};

// --- EXPORTED HELPERS ---

export const callGeminiWithLimitCheck = async (prompt, options = {}) => {
    const limitReached = await checkAiLimitReached();
    if (limitReached) throw new Error("LIMIT_REACHED");

    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now();

    try {
        const rawResponse = await callGeminiWithLoadBalancing(prompt, false, options.maxOutputTokens);
        await updateDoc(doc(db, 'usage_trackers', 'ai_usage'), { callCount: increment(1) });

        const safeResponse = rawResponse ? String(rawResponse) : '';
        return safeResponse.replace(/^```json\s*|```$/g, '').trim();

    } catch (error) {
        usageCache.callCount -= 1; 
        console.error("callGeminiWithLimitCheck failed:", sanitizeError(error.message));
        throw error;
    }
};

export const callChatbotAi = async (prompt) => {
    return await callGeminiWithLimitCheck(prompt);
};

// --- FULLY RESTORED ESSAY GRADING FUNCTION ---
export const gradeEssayWithAI = async (promptText, rubric, studentAnswer) => {
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    const validRubric = (rubric || []).filter(item => item && item.criteria && Number(item.points) > 0);
    if (validRubric.length === 0) {
        throw new Error("Invalid or empty rubric provided for grading.");
    }
    const rubricJson = JSON.stringify(validRubric, null, 2);
    const maxTotalPoints = validRubric.reduce((sum, item) => sum + Number(item.points), 0);

    const gradingPrompt = `
    You are a fair and objective teacher grading a student's essay based on a specific rubric.
    Evaluate the student's answer STRICTLY based on the provided prompt and rubric criteria.
    **Essay Prompt:**
    \`\`\`
    ${promptText}
    \`\`\`
    **Rubric (Total Possible Points: ${maxTotalPoints}):**
    \`\`\`json
    ${rubricJson}
    \`\`\`
    **Student's Answer:**
    \`\`\`
    ${studentAnswer || "(No answer provided)"}
    \`\`\`
    **Instructions:**
    1.  Carefully read the student's answer in relation to the essay prompt.
    2.  For EACH criterion in the rubric JSON, assign points based *only* on how well the student's answer meets that specific criterion. Adhere strictly to the definition and maximum points for each criterion.
    3.  Provide a concise justification (1-2 sentences) explaining the points awarded for EACH criterion, referencing parts of the student's answer if applicable.
    4.  Calculate the total score by summing the points awarded for all criteria. This total score MUST NOT exceed the total possible points (${maxTotalPoints}).
    5.  Provide brief overall feedback (2-3 sentences) summarizing the answer's key strengths and areas for improvement based *only* on the rubric criteria.
    6.  Return ONLY a single, valid JSON object matching the specified structure EXACTLY. Ensure all keys and value types match. Do NOT include any text, notes, or markdown formatting before or after the JSON block.
    **JSON Output Structure (Strict):**
    \`\`\`json
    {
      "scores": [
        { "criteria": "...", "pointsAwarded": number, "justification": "..." }
      ],
      "totalScore": number,
      "overallFeedback": "..."
    }
    \`\`\`
    `;

    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now();

    try {
        console.log("Sending grading prompt to AI (load balanced)...");
        const jsonResponseText = await callGeminiWithLoadBalancing(gradingPrompt, true);

        // Safety check for parsing
        let data;
        try {
             // FIX: Ensure it is a string before parsing
             const safeText = typeof jsonResponseText === 'string' ? jsonResponseText : JSON.stringify(jsonResponseText);
             data = JSON.parse(safeText);
        } catch (e) {
             // Fallback if already object
             if (typeof jsonResponseText === 'object') {
                 data = jsonResponseText;
             } else {
                 throw e;
             }
        }

        const validatedData = validateAndCleanGradingResponse(data, validRubric, "AI (Load Balanced)");

        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });
        
        console.log("AI Grading (Load Balanced) successful:", validatedData);
        return validatedData;

    } catch (error) { 
        usageCache.callCount -= 1;
        // Wrapped in sanitizeError
        console.error("gradeEssayWithAI failed:", sanitizeError(error.message));
        throw error;
    } 
};

// --- FULLY RESTORED CLEANING FUNCTION ---
function validateAndCleanGradingResponse(data, validRubric, source = "AI") {
     if (!data || !Array.isArray(data.scores) || typeof data.totalScore !== 'number' || data.scores.length === 0) {
        console.error(`Invalid grading JSON structure from ${source}:`, JSON.stringify(data, null, 2));
        throw new Error(`${source} grading response JSON structure is invalid.`);
    }

    let calculatedTotal = 0;
    const validatedScores = [];
    const originalCriteriaNames = validRubric.map(item => item.criteria);

    validRubric.forEach(rubricItem => {
        const aiScoreItem = data.scores.find(s => s.criteria === rubricItem.criteria);
        if (aiScoreItem) {
            let awarded = Number(aiScoreItem.pointsAwarded) || 0;
            const maxPoints = Number(rubricItem.points) || 0;
            awarded = Math.max(0, Math.min(awarded, maxPoints));
            validatedScores.push({
                criteria: rubricItem.criteria,
                pointsAwarded: awarded,
                justification: aiScoreItem.justification || "No justification provided."
            });
            calculatedTotal += awarded;
        } else {
             console.warn(`${source} did not provide score for criteria: "${rubricItem.criteria}". Awarding 0 points.`);
             validatedScores.push({
                 criteria: rubricItem.criteria,
                 pointsAwarded: 0,
                 justification: `${source} did not evaluate this criterion.`
             });
        }
    });

    data.scores.forEach(aiScoreItem => {
         if (!originalCriteriaNames.includes(aiScoreItem.criteria)) {
             console.warn(`${source} included an extra criteria not in the rubric: "${aiScoreItem.criteria}". Ignoring.`);
         }
     });

    const finalTotalScore = Math.round(calculatedTotal);
    if (finalTotalScore !== Math.round(data.totalScore)) {
        console.warn(`${source} reported totalScore (${data.totalScore}) differs from calculated/validated score (${finalTotalScore}). Using calculated score.`);
    }

    return {
        scores: validatedScores,
        totalScore: finalTotalScore,
        overallFeedback: data.overallFeedback || "No overall feedback provided."
    };
}