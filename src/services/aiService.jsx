import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// --- API Keys (REMOVED) ---
// All API keys are now handled in the serverless functions (proxies)
// or were removed (Groq).

// --- Model & URL Definitions ---
const GEMINI_MODEL = 'gemini-2.5-flash'; // Corrected from 2.5 to 1.5

// Hugging Face models (REPLACED WITH FASTER ALTERNATIVES)
const HF_MODEL_1 = 'microsoft/Phi-3-mini'; // <-- REPLACED Qwen
const HF_MODEL_2 = 'mistralai/Mistral-7B-Instruct-v0.3'; // <-- REPLACED deepseek-ai

// --- Unified API Configuration (UPDATED) ---
const API_CONFIGS = [
    // --- Gemini Endpoints ---
    { service: 'gemini', model: GEMINI_MODEL, url: `/api/gemini-primary`, name: 'Gemini Primary' },
    { service: 'gemini', model: GEMINI_MODEL, url: `/api/gemini-fallback`, name: 'Gemini Fallback 1' },

    // --- Hugging Face Endpoints (Both point to /api/hf) ---
    { service: 'huggingface', model: HF_MODEL_1, url: `/api/hf`, name: `HuggingFace (${HF_MODEL_1})` },
    { service: 'huggingface', model: HF_MODEL_2, url: `/api/hf`, name: `HuggingFace (${HF_MODEL_2})` }
];

// This will now be 4
const NUM_CONFIGS = API_CONFIGS.length;
const RATE_LIMIT_PERIOD = 60000; // 60 seconds
const MAX_REQUESTS_PER_PERIOD = 100; // Generous, but good for tracking

let requestTimestamps = [];
let apiUsageStats = API_CONFIGS.map(config => ({ ...config, success: 0, failure: 0, retries: 0 }));
let currentConfigIndex = 0; // Start with Gemini Primary

// --- Firestore Usage Tracking ---
const usageDocRef = doc(db, 'apiUsage', 'dailyStats');
let localUsageCache = {};
let lastDbSync = 0;
const DB_SYNC_INTERVAL = 60000; // Sync with Firestore every 60 seconds

async function updateApiUsage(service, model, status, retries = 0) {
    const timestamp = new Date();
    const date = timestamp.toISOString().split('T')[0];
    const hour = timestamp.getUTCHours().toString().padStart(2, '0');
    
    const dateHourKey = `${date}_${hour}`;
    
    if (!localUsageCache[dateHourKey]) {
        localUsageCache[dateHourKey] = {
            totalRequests: 0,
            services: {}
        };
    }
    
    const hourStats = localUsageCache[dateHourKey];
    
    hourStats.totalRequests = (hourStats.totalRequests || 0) + 1;
    
    const serviceKey = service.replace(/\./g, '_');
    const modelKey = model.replace(/\./g, '_').replace(/\//g, '_');
    
    if (!hourStats.services[serviceKey]) {
        hourStats.services[serviceKey] = { total: 0, models: {} };
    }
    
    if (!hourStats.services[serviceKey].models[modelKey]) {
        hourStats.services[serviceKey].models[modelKey] = {
            success: 0,
            failure: 0,
            retries: 0
        };
    }
    
    const modelStats = hourStats.services[serviceKey].models[modelKey];
    hourStats.services[serviceKey].total = (hourStats.services[serviceKey].total || 0) + 1;
    
    if (status === 'success') {
        modelStats.success = (modelStats.success || 0) + 1;
    } else if (status === 'failure') {
        modelStats.failure = (modelStats.failure || 0) + 1;
    }
    modelStats.retries = (modelStats.retries || 0) + retries;

    // Throttle Firestore writes
    if (Date.now() - lastDbSync > DB_SYNC_INTERVAL) {
        lastDbSync = Date.now();
        try {
            const updates = {};
            for (const [key, stats] of Object.entries(localUsageCache)) {
                updates[`hourlyStats.${key}.totalRequests`] = increment(stats.totalRequests);
                for (const [sKey, sStats] of Object.entries(stats.services)) {
                    updates[`hourlyStats.${key}.services.${sKey}.total`] = increment(sStats.total);
                    for (const [mKey, mStats] of Object.entries(sStats.models)) {
                        updates[`hourlyStats.${key}.services.${sKey}.models.${mKey}.success`] = increment(mStats.success);
                        updates[`hourlyStats.${key}.services.${sKey}.models.${mKey}.failure`] = increment(mStats.failure);
                        updates[`hourlyStats.${key}.services.${sKey}.models.${mKey}.retries`] = increment(mStats.retries);
                    }
                }
            }
            // Reset local cache after preparing updates
            localUsageCache = {};
            
            await updateDoc(usageDocRef, updates);
        } catch (error) {
            if (error.code === 'not-found') {
                // Document doesn't exist, create it
                await setDoc(usageDocRef, localUsageCache);
                localUsageCache = {}; // Clear cache after set
            } else {
                console.error("Failed to update API usage stats in Firestore:", error);
            }
        }
    }
}


// --- Rate Limiting (Local) ---
function checkRateLimit() {
    const now = Date.now();
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_PERIOD);
    
    if (requestTimestamps.length >= MAX_REQUESTS_PER_PERIOD) {
        console.warn("Rate limit exceeded. Please wait.");
        throw new Error("Rate limit exceeded. Please wait.");
    }
    
    requestTimestamps.push(now);
}

// --- Internal Proxy API Caller ---
async function callProxyApiInternal(functionName, payload, originalPrompt, timeout = 29000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`/.netlify/functions/${functionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Proxy Function Failed (/${functionName}): ${response.status}. Response: `, errorBody);
            throw new Error(`Proxy failed: ${response.status}.`);
        }

        const data = await response.json();
        
        if (data.error) {
             throw new Error(data.error);
        }
        
        // Handle HuggingFace's specific response structure
        if (functionName === 'hf' && data.response && Array.isArray(data.response) && data.response[0]?.generated_text) {
             return data.response[0].generated_text;
        }
        
        // Handle Gemini's response structure
        if (functionName.startsWith('gemini') && data.response) {
            return data.response;
        }

        console.error("Unexpected successful response structure:", data);
        throw new Error("Unexpected API response structure.");

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`API call (/${functionName}) timed out after ${timeout / 1000}s.`);
            throw new Error('Request timed out.');
        }
        console.error(`Error in callProxyApiInternal (/${functionName}):`, error.message);
        throw error;
    }
}


// --- Load Balancing & Fallback Logic ---
async function callGeminiWithLoadBalancing(prompt, timeout = 29000) {
    const startIndex = currentConfigIndex;
    let retries = 0;

    for (let i = 0; i < NUM_CONFIGS; i++) {
        const config = API_CONFIGS[currentConfigIndex];
        currentConfigIndex = (currentConfigIndex + 1) % NUM_CONFIGS; // Cycle to next config

        let payload;
        let functionName;

        try {
            if (config.service === 'gemini') {
                functionName = config.url.split('/').pop(); // e.g., 'gemini-primary'
                payload = {
                    model: config.model,
                    prompt: prompt
                };
            } else if (config.service === 'huggingface') {
                functionName = 'hf'; // Both HF models use the 'hf' proxy
                payload = {
                    model: config.model,
                    inputs: prompt,
                    parameters: { max_new_tokens: 1024, return_full_text: false }
                };
            }

            console.log(`Attempting API call with: ${config.name}`);
            const response = await callProxyApiInternal(functionName, payload, prompt, timeout);
            
            console.log(`API call successful with: ${config.name}`);
            updateApiUsage(config.service, config.model, 'success', retries);
            return response; // Success

        } catch (error) {
            console.warn(`API call failed for ${config.name}. Error:`, error.message);
            retries++;
            
            // Check if it's a non-retryable error (like a 504 from HF)
            if (error.message.includes("504") || error.message.includes("timed out")) {
                 console.error(`${config.name} failed with non-retryable error. Stopping attempts for this request.`);
                 updateApiUsage(config.service, config.model, 'failure', retries);
                 // Throw the error of the *last* attempted service
                 throw new Error(`AI API ${config.name} failed with non-retryable error. Error: ${error.message}`);
            }
            
            // If we've tried all configs and returned to the start, stop.
            if (currentConfigIndex === startIndex) {
                console.error("All API configs failed. Stopping retries.");
                updateApiUsage(config.service, config.model, 'failure', retries);
                throw new Error("All AI APIs are currently unavailable.");
            }
        }
    }
}


// --- Main Rate-Limited Caller ---
export async function callGeminiWithLimitCheck(prompt) {
    checkRateLimit(); // Check local rate limit first
    
    // The load balancer will handle API usage tracking
    return await callGeminiWithLoadBalancing(prompt);
}

// --- Public Functions ---

export const callAIApi = async (prompt) => {
    try {
        const response = await callGeminiWithLimitCheck(prompt);
        return response;
    } catch (error) {
        console.error("Error in callAIApi:", error);
        throw error; // Re-throw the error to be caught by the UI
    }
};

// ... (rest of the file, including validateAndStructureRubric, remains unchanged) ...

/**
 * Validates and structures the AI's rubric scoring response.
 * @param {object} data - The raw data object from the AI.
 * @param {Array} rubric - The original rubric array given to the AI.
 * @param {string} source - The name of the AI service for logging.
 * @returns {object} - A structured and validated rubric object.
 */
export function validateAndStructureRubric(data, rubric, source = "AI") {
    if (!data || typeof data !== 'object' || !Array.isArray(data.scores) || typeof data.totalScore === 'undefined' || typeof data.overallFeedback === 'undefined') {
        console.error(`${source} response is malformed. Data:`, data);
        throw new Error(`${source} provided a malformed response. Could not parse rubric.`);
    }

    const validatedScores = [];
    let calculatedTotal = 0;
    const originalCriteriaNames = rubric.map(item => item.criteria);

    rubric.forEach(rubricItem => {
        const aiScoreItem = data.scores.find(s => s.criteria === rubricItem.criteria);
        
        if (aiScoreItem) {
            let awarded = parseFloat(aiScoreItem.pointsAwarded);
            if (isNaN(awarded)) {
                console.warn(`${source} provided non-numeric points for "${rubricItem.criteria}". Awarding 0.`);
                awarded = 0;
            }
            
            if (awarded > rubricItem.points) {
                console.warn(`${source} awarded ${awarded} points for "${rubricItem.criteria}" which exceeds the max of ${rubricItem.points}. Clamping to max.`);
                awarded = rubricItem.points;
            }

            if (awarded < 0) {
                 console.warn(`${source} awarded negative points (${awarded}) for "${rubricItem.criteria}". Clamping to 0.`);
                 awarded = 0;
            }

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
             console.warn(`${source} included an extra criteria not in the rubric: \"${aiScoreItem.criteria}\". Ignoring.`);
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