import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// --- ADD THESE NEW DEBUG LINES ---
console.log("!!!!!!!!!! AISERVICE.JSX: Build 125 (String Safety Fix) IS RUNNING !!!!!!!!!!");
// ---------------------------------

// --- THIS IS THE FIX ---
// 1. Get the production URL from environment variables
const PROD_API_URL = import.meta.env.VITE_API_BASE_URL;

// 2. Check if running in a native container (like an APK)
const isNative = Capacitor.isNativePlatform();

// 3. Determine the base URL
//    If it's native, use the full production URL.
//    If it's web, use a relative path (empty string).
const API_BASE = isNative ? PROD_API_URL : '';
// --- END OF FIX ---

// --- ADD THIS NEW DEBUG LINE ---
console.log("!!!!!!!!!! AISERVICE.JSX: API_BASE is:", API_BASE);
// -------------------------------

// --- Model & URL Definitions ---
const GEMINI_MODEL = 'gemma-3-27b-it'; 

// --- Unified API Configuration (UPDATED - Removed HuggingFace) ---
const API_CONFIGS = [
    // We point all URLs to the same Vercel endpoint. 
    // The 'model' field stays exactly as you defined it (GEMINI_MODEL).
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Primary' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 1' },
    { service: 'gemini', model: GEMINI_MODEL, url: `${API_BASE}/api/gemini`, name: 'Gemini Fallback 2' },
];

// This will now be 3
const NUM_CONFIGS = API_CONFIGS.length;
let currentApiIndex = 0;

const FREE_API_CALL_LIMIT_PER_MONTH = 500000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let usageCache = {
    callCount: 0,
    resetMonth: 0,
    lastChecked: 0,
};
const CACHE_DURATION_MS = 60000;

// --- Usage Tracking (Unchanged) ---
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
                console.log("AI usage counter reset for new month.");
            } else {
                usageCache = { callCount, resetMonth, lastChecked: currentTime };
            }
        } else {
            usageCache = { callCount: 0, resetMonth: currentMonth, lastChecked: currentTime };
            await setDoc(usageDocRef, { callCount: 0, resetMonth: currentMonth });
            console.log("AI usage tracker initialized.");
        }

        if (usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
            console.warn("AI monthly limit reached (from Firestore).");
            return true;
        }
        return false;

    } catch (error) {
        console.error("Error checking or initializing AI usage tracker:", error);
        throw new Error(`Failed to verify AI usage limit: ${error.message}`);
    }
};

// --- Internal Proxy API Caller (UPDATED) ---
// This function now sends the model name to the proxy
const callProxyApiInternal = async (prompt, jsonMode = false, config, maxOutputTokens = undefined) => {
    
    const response = await fetch(config.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            prompt: prompt,
            jsonMode: jsonMode,
            maxOutputTokens: maxOutputTokens,
            model: config.model // <-- This tells the proxy which model to use
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Proxy Function Failed (${config.url}): ${response.status}. Response: ${errorText}`);
        const error = new Error(`Proxy failed: ${response.status}. ${errorText.substring(0, 200)}`);
        error.status = response.status; // Pass status for retry logic
        throw error;
    }

    let data;
    try {
        data = await response.json();
    } catch (jsonError) {
        const errorText = await response.text();
        console.error(`Failed to parse JSON response from proxy (${config.url}). Raw text: ${errorText}`);
        throw new Error(`Failed to parse JSON response from proxy.`);
    }

    // Standard Gemini/Proxy response check
    const fullText = data.text || data.response?.[0]?.generated_text; 
    
    if (fullText === undefined || fullText === null) {
        console.error(`Invalid response structure from Proxy (${config.url}):`, JSON.stringify(data, null, 2));
        throw new Error("Proxy response was not in the expected format (missing 'text' field).");
    }

    return fullText;
}

// --- Load Balancer (UPDATED) ---
const callGeminiWithLoadBalancing = async (prompt, jsonMode = false, maxOutputTokens = undefined) => {
    const startIndex = currentApiIndex;
    
    currentApiIndex = (currentApiIndex + 1) % NUM_CONFIGS;

    const errors = {};

    for (let i = 0; i < NUM_CONFIGS; i++) {
        const keyIndex = (startIndex + i) % NUM_CONFIGS;
        const config = API_CONFIGS[keyIndex];
        const keyName = config.name;

		try {
		    console.log(`Attempting AI API with ${keyName} (Index ${keyIndex})...`);
            let response;
            
            // Simplified: All services now use the proxy caller
            if (config.service === 'gemini') {
                response = await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
            } else {
                throw new Error(`Unknown service type: ${config.service}`);
            }
					
            console.log(`AI API call with ${keyName} successful.`);
            return response;

        } catch (error) {
            errors[keyName] = error.message;

            if (error.status === 429 || error.status === 503 || error.status === 500 || error.status === 504) {
                console.warn(`AI API ${keyName} failed with retryable status ${error.status}: ${error.message}. Waiting 2 seconds before retry...`);
                await delay(2000); 
            } else {
                console.error(`AI API ${keyName} failed with non-retryable error.`, error);
            }
        }
    }

    console.error("All AI keys failed.", errors);
    throw new Error(`All AI keys failed: ${JSON.stringify(errors)}`);
};

// --- Exported Functions (UPDATED FOR SAFETY) ---
export const callGeminiWithLimitCheck = async (prompt, options = {}) => {
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now();

    try {
        // Pass the new maxOutputTokens option if present
        const rawResponse = await callGeminiWithLoadBalancing(prompt, false, options.maxOutputTokens);
        
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });

        // FIX: Ensure rawResponse is a string before replacing
        // This prevents "TypeError: rawResponse.replace is not a function" if API returns a number/object
        const safeResponse = rawResponse !== null && rawResponse !== undefined ? String(rawResponse) : '';
        
        return safeResponse.replace(/^```json\s*|```$/g, '').trim();

    } catch (error) {
        usageCache.callCount -= 1; 
        console.error("callGeminiWithLimitCheck failed:", error);
        throw error;
    }
};

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
        console.error("gradeEssayWithAI failed:", error);
        throw error;
    } 
};

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

export const callChatbotAi = async (prompt) => {
    try {
        const response = await callGeminiWithLimitCheck(prompt);
        return response;
    } catch (error) {
        console.error("Error in callChatbotAi:", error);
        throw error;
    }
};