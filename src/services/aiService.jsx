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
const PROD_API_URL = "https://srcslms.vercel.app"; 
const API_BASE = PROD_API_URL;

// --- CONFIGURATION ---

// TIER 1: OpenRouter (Reasoning/Complex) - DeepSeek R1
const PRIMARY_CONFIGS = [
    { 
        service: 'openrouter', 
        url: `${API_BASE}/api/openrouter`, 
        name: 'Hermes 3)',
        model: 'nousresearch/hermes-3-llama-3.1-405b:free',
        tier: 'primary' // <--- Forces backend to use Key #1
    },
];

// TIER 2: OpenRouter (Fast/Backup) - Gemini Flash
const FALLBACK_CONFIGS = [
  { 
      service: 'openrouter', 
      url: `${API_BASE}/api/openrouter`, 
      name: 'Hermes 3 Backup 1', 
      model: 'openai/gpt-oss-120b:free', // Correct OpenRouter Model ID
      tier: 'backup' // <--- Forces backend to use Keys #2-5
  },
  { 
      service: 'openrouter', 
      url: `${API_BASE}/api/openrouter`, 
      name: 'Hermes 3 Backup 2', 
      model: 'openai/gpt-oss-120b:free',
      tier: 'backup'
  },
  { 
      service: 'openrouter', 
      url: `${API_BASE}/api/openrouter`, 
      name: 'Hermes Backup 3', 
      model: 'openai/gpt-oss-120b:free',
      tier: 'backup'
  },
  { 
      service: 'openrouter', 
      url: `${API_BASE}/api/openrouter`, 
      name: 'Meta LLama Backup 4', 
      model: 'openai/gpt-oss-120b:free',
      tier: 'backup'
  },
];

let primaryIndex = 0;
let fallbackIndex = 0;

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
                model: config.model,
                tier: config.tier // <--- Sends 'primary' or 'backup' to server logic
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
const callGeminiWithLoadBalancing = async (prompt, jsonMode = false, maxOutputTokens = undefined, skipPrimary = false) => {
    const errors = {};
    
    // PHASE 1: Try Primary Tier (OpenRouter / DeepSeek)
    if (!skipPrimary) {
        const maxPrimaryAttempts = 3; 

        for (let i = 0; i < maxPrimaryAttempts; i++) {
            const config = PRIMARY_CONFIGS[primaryIndex];
            primaryIndex = (primaryIndex + 1) % PRIMARY_CONFIGS.length;

            try {
                console.log(`Using ${config.name} (Attempt ${i+1})...`); 
                const response = await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
                return response;

            } catch (error) {
                console.warn(`${config.name} failed (Attempt ${i+1}):`, error.message); 
                errors[`${config.name}-${i}`] = error.message;
                if ([429, 503, 500, 504].includes(error.status)) {
                    await delay(1000); 
                }
            }
        }
        console.warn("Primary AI tier failed. Switching to FALLBACK TIER.");
    } else {
        console.log("Skipping Primary Tier. Using Fallback Tier directly.");
    }

    // PHASE 2: Try Fallback Tier (OpenRouter Gemini Flash)
    for (let i = 0; i < FALLBACK_CONFIGS.length; i++) {
        const config = FALLBACK_CONFIGS[fallbackIndex];
        fallbackIndex = (fallbackIndex + 1) % FALLBACK_CONFIGS.length;

        try {
            console.log(`Using ${config.name}...`);
            const response = await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
            return response; 

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
        const rawResponse = await callGeminiWithLoadBalancing(
            prompt, 
            false, 
            options.maxOutputTokens, 
            options.skipPrimary
        );
        
        await updateDoc(doc(db, 'usage_trackers', 'ai_usage'), { callCount: increment(1) });

        let safeResponse = rawResponse ? String(rawResponse) : '';
        safeResponse = safeResponse.replace(/^```json\s*|```$/g, '').trim();

        return safeResponse;

    } catch (error) {
        usageCache.callCount -= 1; 
        console.error("callGeminiWithLimitCheck failed:", sanitizeError(error.message));
        throw error;
    }
};

export const callChatbotAi = async (prompt) => {
    // This now sends 'tier: backup' -> Uses Keys 2-5 -> Uses Gemini Flash
    return await callGeminiWithLimitCheck(prompt, { skipPrimary: true });
};

// --- GRADING FUNCTION ---
export const gradeEssayWithAI = async (promptText, rubric, studentAnswer) => {
    const limitReached = await checkAiLimitReached();
    if (limitReached) throw new Error("LIMIT_REACHED");

    const validRubric = (rubric || []).filter(item => item && item.criteria && Number(item.points) > 0);
    if (validRubric.length === 0) throw new Error("Invalid or empty rubric provided.");
    
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
    1.  Carefully read the student's answer.
    2.  For EACH criterion in the rubric, assign points based *only* on the student's answer.
    3.  Provide a concise justification.
    4.  Return ONLY a single, valid JSON object matching the structure below.
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

// --- VALIDATION HELPER ---
function validateAndCleanGradingResponse(data, validRubric, source = "AI") {
     if (!data || !Array.isArray(data.scores) || typeof data.totalScore !== 'number' || data.scores.length === 0) {
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

    return {
        scores: validatedScores,
        totalScore: Math.round(calculatedTotal),
        overallFeedback: data.overallFeedback || "No overall feedback provided."
    };
}