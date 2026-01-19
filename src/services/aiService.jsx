import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// --- KEY HIDING UTILITY ---
const sanitizeError = (text) => {
    if (!text || typeof text !== 'string') return text;
    // Regex to find Google/OpenAI Keys and hide them
    return text.replace(/(api_key|Bearer)\s*[:=]\s*[a-zA-Z0-9_\-]{20,}/gi, '$1:[HIDDEN]');
};

// --- ENVIRONMENT SETUP ---
// Point strictly to your Vercel backend where the API folder lives
const PROD_API_URL = "https://srcslms.vercel.app"; 

const isNative = Capacitor.isNativePlatform();

// Always use the Vercel URL, whether you are on Mobile or the new Firebase Site
const API_BASE = PROD_API_URL;

// --- CONFIGURATION ---
// TIER 1: OpenRouter (Primary Account) - Configured for single paid key
const PRIMARY_CONFIGS = [
    { service: 'openrouter', url: `${API_BASE}/api/openrouter`, name: 'Deep Seek (Primary)' },
];

// TIER 2: Google Gemini - RELIABLE BACKUP
const GEMINI_MODEL = 'gemma-3-27b-it'; 
const FALLBACK_CONFIGS = [
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Backup 1' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Backup 2' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Backup 3' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Backup 4' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Backup 5' },
];

let primaryIndex = 0;
let fallbackIndex = 0;

const FREE_API_CALL_LIMIT_PER_MONTH = 500000; // Effectively unlimited for now
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
        console.error("Error checking AI usage:", sanitizeError(error.message));
        return false; 
    }
};

// --- CORE API CALLER (GENERIC) ---
const callProxyApiInternal = async (prompt, jsonMode = false, config, maxOutputTokens = undefined) => {
    try {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: prompt,
                jsonMode: jsonMode,
                maxOutputTokens: maxOutputTokens,
                model: config.model // Only used for Gemini, ignored by OpenRouter endpoint
            }),
        });

        const rawText = await response.text();

        if (!response.ok) {
            const safeErrorText = sanitizeError(rawText);
            console.error(`Proxy Failed (${config.name}): ${response.status}. Response: ${safeErrorText}`);
            
            const error = new Error(safeErrorText.substring(0, 200)); 
            error.status = response.status;
            throw error;
        }

        if (!rawText) throw new Error("Proxy response was empty.");

        // Handle JSON Errors that come as 200 OK
        if (rawText.trim().startsWith('{"error"')) {
            try {
                const errorJson = JSON.parse(rawText);
                const safeMessage = sanitizeError(errorJson.error || "Unknown error");
                throw new Error(safeMessage);
            } catch (e) {
                if (e.message !== "Unknown error") throw e; 
            }
        }

        return rawText;

    } catch (error) {
        error.message = sanitizeError(error.message);
        throw error;
    }
}

// --- TIERED LOAD BALANCER ---
const callGeminiWithLoadBalancing = async (prompt, jsonMode = false, maxOutputTokens = undefined) => {
    const errors = {};
    
    // PHASE 1: Try Primary Tier (OpenRouter / MiMo)
    // We try 3 attempts on Primary before giving up to save time
    const maxPrimaryAttempts = 3; 

    for (let i = 0; i < maxPrimaryAttempts; i++) {
        // We use modulus even with 1 item so the logic remains valid if you add more keys later
        const config = PRIMARY_CONFIGS[primaryIndex];
        primaryIndex = (primaryIndex + 1) % PRIMARY_CONFIGS.length;

        try {
            // --- LOG WHICH AI IS BEING USED ---
            console.log(`Using ${config.name} (Attempt ${i+1})...`); 
            
            const response = await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
            
            // CLEAN MIMO OUTPUT: Remove <think> tags
            let cleanResponse = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            return cleanResponse;

        } catch (error) {
            console.warn(`${config.name} failed (Attempt ${i+1}):`, error.message); 
            errors[`${config.name}-${i}`] = error.message;
            // If it's a Rate Limit (429) or Server Error (5xx), wait briefly then retry
            if ([429, 503, 500, 504].includes(error.status)) {
                await delay(1000); 
            }
        }
    }

    console.warn("Primary AI tier failed. Switching to FALLBACK TIER (Gemini).");

    // PHASE 2: Try Fallback Tier (Google Gemini)
    // Try all configured backup keys
    for (let i = 0; i < FALLBACK_CONFIGS.length; i++) {
        const config = FALLBACK_CONFIGS[fallbackIndex];
        fallbackIndex = (fallbackIndex + 1) % FALLBACK_CONFIGS.length;

        try {
            // --- LOG WHICH BACKUP IS BEING USED ---
            console.log(`Using ${config.name}...`);
            
            const response = await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
            return response; // Gemini usually doesn't need <think> cleaning

        } catch (error) {
            console.warn(`${config.name} failed:`, error.message);
            errors[config.name] = error.message;
            if ([429, 503, 500, 504].includes(error.status)) {
                await delay(1500);
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

        let safeResponse = rawResponse ? String(rawResponse) : '';
        
        // Final cleanup for JSON markdown wrappers
        safeResponse = safeResponse.replace(/^```json\s*|```$/g, '').trim();

        return safeResponse;

    } catch (error) {
        usageCache.callCount -= 1; 
        console.error("callGeminiWithLimitCheck failed:", sanitizeError(error.message));
        throw error;
    }
};

export const callChatbotAi = async (prompt) => {
    return await callGeminiWithLimitCheck(prompt);
};

// --- GRADING FUNCTION (Preserved) ---
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
    2.  For EACH criterion in the rubric JSON, assign points based *only* on how well the student's answer meets that specific criterion.
    3.  Provide a concise justification (1-2 sentences).
    4.  Return ONLY a single, valid JSON object matching the specified structure EXACTLY.
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
        console.log("Sending grading prompt to AI...");
        const jsonResponseText = await callGeminiWithLoadBalancing(gradingPrompt, true);

        let data;
        try {
             const safeText = typeof jsonResponseText === 'string' ? jsonResponseText : JSON.stringify(jsonResponseText);
             // Ensure no markdown lingers
             const cleanText = safeText.replace(/^```json\s*|```$/g, '').trim();
             data = JSON.parse(cleanText);
        } catch (e) {
             if (typeof jsonResponseText === 'object') {
                 data = jsonResponseText;
             } else {
                 throw e;
             }
        }

        const validatedData = validateAndCleanGradingResponse(data, validRubric, "AI Grader");

        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });
        
        return validatedData;

    } catch (error) { 
        usageCache.callCount -= 1;
        console.error("gradeEssayWithAI failed:", sanitizeError(error.message));
        throw error;
    } 
};

// --- VALIDATION HELPER (Preserved) ---
function validateAndCleanGradingResponse(data, validRubric, source = "AI") {
     if (!data || !Array.isArray(data.scores) || typeof data.totalScore !== 'number' || data.scores.length === 0) {
        console.error(`Invalid grading JSON structure from ${source}:`, JSON.stringify(data, null, 2));
        throw new Error(`${source} grading response JSON structure is invalid.`);
    }

    let calculatedTotal = 0;
    const validatedScores = [];

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
             validatedScores.push({
                 criteria: rubricItem.criteria,
                 pointsAwarded: 0,
                 justification: `${source} did not evaluate this criterion.`
             });
        }
    });

    const finalTotalScore = Math.round(calculatedTotal);

    return {
        scores: validatedScores,
        totalScore: finalTotalScore,
        overallFeedback: data.overallFeedback || "No overall feedback provided."
    };
}