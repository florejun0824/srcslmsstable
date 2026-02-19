import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

const sanitizeError = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/(api_key|Bearer)\s*[:=]\s*[a-zA-Z0-9_\-]{20,}/gi, '$1:[HIDDEN]');
};

const PROD_API_URL = "https://srcslms.vercel.app"; 
const API_BASE = PROD_API_URL;

// TIER 1: Direct Google SDK (Using your 1,500 RPD and 20 RPD quotas)
const DIRECT_CONFIGS = [
    { 
        service: 'google-direct', 
        name: 'Gemini 3 Pro (Direct)',
        model: 'gemini-3-pro', // Primary: 1,500 RPD
        tier: 'direct'
    },
    { 
        service: 'google-direct', 
        name: 'Gemini 3 Flash (Direct)',
        model: 'gemini-3-flash', // Secondary: 20 RPD
        tier: 'direct'
    }
];

// TIER 2: OpenRouter Primary
const PRIMARY_CONFIGS = [
    { 
        service: 'openrouter', 
        url: `${API_BASE}/api/openrouter`, 
        name: 'OpenRouter Gemini',
        model: 'google/gemini-2.5-flash-lite',
        tier: 'primary' 
    },
];

// TIER 3: Backup Models
const FALLBACK_CONFIGS = [
  { 
      service: 'openrouter', 
      url: `${API_BASE}/api/openrouter`, 
      name: 'Hermes Backup 1', 
      model: 'openai/gpt-oss-120b:free', 
      tier: 'backup' 
  },
  { 
      service: 'openrouter', 
      url: `${API_BASE}/api/openrouter`, 
      name: 'Meta LLama Backup 2', 
      model: 'openai/gpt-oss-120b:free',
      tier: 'backup'
  }
];

let primaryIndex = 0;
let fallbackIndex = 0;

const FREE_API_CALL_LIMIT_PER_MONTH = 500000; 
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let usageCache = { callCount: 0, resetMonth: 0, lastChecked: 0 };
const CACHE_DURATION_MS = 60000;

const checkAiLimitReached = async () => {
    const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
    const currentTime = Date.now();

    if (currentTime - usageCache.lastChecked < CACHE_DURATION_MS) {
        if (usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH) return true;
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

        return usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH;

    } catch (error) {
        console.error("Error checking AI usage:", sanitizeError(error.message));
        return false; 
    }
};

const callProxyApiInternal = async (prompt, jsonMode = false, config, maxOutputTokens = undefined) => {
    try {
        if (config.service === 'google-direct') {
            const apiKey = process.env.VITE_GEMINI_API_KEY; 
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: config.model });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }

        const response = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: prompt,
                jsonMode: jsonMode,
                maxOutputTokens: maxOutputTokens,
                model: config.model,
                tier: config.tier 
            }),
        });

        const rawText = await response.text();

        if (!response.ok) {
            const safeErrorText = sanitizeError(rawText);
            throw new Error(safeErrorText.substring(0, 200));
        }

        return rawText;

    } catch (error) {
        throw error;
    }
}

const callGeminiWithLoadBalancing = async (prompt, jsonMode = false, maxOutputTokens = undefined, useFlash = false) => {
    const errors = {};
    
    // TIER 1: Direct Google SDK (Prioritize Pro unless Flash is requested)
    const directConfig = useFlash ? DIRECT_CONFIGS[1] : DIRECT_CONFIGS[0];
    try {
        console.log(`Attempting Direct: ${directConfig.name}...`);
        return await callProxyApiInternal(prompt, jsonMode, directConfig, maxOutputTokens);
    } catch (error) {
        console.warn(`${directConfig.name} failed:`, error.message);
        errors[directConfig.name] = error.message;
    }

    // TIER 2: Primary OpenRouter
    for (let i = 0; i < PRIMARY_CONFIGS.length; i++) {
        const config = PRIMARY_CONFIGS[primaryIndex];
        primaryIndex = (primaryIndex + 1) % PRIMARY_CONFIGS.length;
        try {
            console.log(`Attempting Primary: ${config.name}...`);
            return await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
        } catch (error) {
            console.warn(`${config.name} failed:`, error.message);
            errors[config.name] = error.message;
        }
    }

    // TIER 3: Fallback Backups
    for (let i = 0; i < FALLBACK_CONFIGS.length; i++) {
        const config = FALLBACK_CONFIGS[fallbackIndex];
        fallbackIndex = (fallbackIndex + 1) % FALLBACK_CONFIGS.length;
        try {
            console.log(`Attempting Fallback: ${config.name}...`);
            return await callProxyApiInternal(prompt, jsonMode, config, maxOutputTokens);
        } catch (error) {
            console.warn(`${config.name} failed:`, error.message);
            errors[config.name] = error.message;
        }
    }
    
    throw new Error(`All AI services failed. Details: ${JSON.stringify(errors)}`);
};

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
            options.useFlash 
        );
        
        await updateDoc(doc(db, 'usage_trackers', 'ai_usage'), { callCount: increment(1) });

        let safeResponse = rawResponse ? String(rawResponse) : '';
        safeResponse = safeResponse.replace(/^```json\s*|```$/g, '').trim();

        return safeResponse;

    } catch (error) {
        usageCache.callCount -= 1; 
        throw error;
    }
};

export const callChatbotAi = async (prompt) => {
    return await callGeminiWithLimitCheck(prompt, { useFlash: false });
};

export const callComplexTaskAi = async (prompt) => {
    return await callGeminiWithLimitCheck(prompt, { useFlash: true });
};

// --- DETAILED GRADING FUNCTION ---
export const gradeEssayWithAI = async (promptText, rubric, studentAnswer) => {
    const limitReached = await checkAiLimitReached();
    if (limitReached) throw new Error("LIMIT_REACHED");

    const validRubric = (rubric || []).filter(item => item && item.criteria && Number(item.points) > 0);
    if (validRubric.length === 0) throw new Error("Invalid or empty rubric provided.");
    
    const rubricJson = JSON.stringify(validRubric, null, 2);
    const maxTotalPoints = validRubric.reduce((sum, item) => sum + Number(item.points), 0);

    // DETAILED GRADING PROMPT
    const gradingPrompt = `
    You are an expert educator and research teacher. Your task is to evaluate a student's essay with high academic rigor.
    Evaluate the following student response STRICTLY based on the rubric provided.
    
    **CONTEXT:**
    - Essay Prompt: ${promptText}
    - Total Possible Points: ${maxTotalPoints}
    
    **RUBRIC:**
    ${rubricJson}
    
    **STUDENT ANSWER:**
    """
    ${studentAnswer || "(No answer provided)"}
    """
    
    **GRADING INSTRUCTIONS:**
    1. Analyze the student's answer for critical thinking and alignment with the prompt requirements.
    2. For each criterion in the rubric, assign a score based on the depth of the response.
    3. Provide a clear, constructive justification for each score that a teacher can share with the student.
    4. Provide "overallFeedback" that summarizes strengths and areas for improvement without explicitly citing source materials.
    5. Ensure the totalScore is exactly the sum of individual pointsAwarded.
    
    **OUTPUT FORMAT:**
    Return ONLY a single, valid JSON object with this exact structure:
    {
      "scores": [
        { "criteria": "string", "pointsAwarded": number, "justification": "string" }
      ],
      "totalScore": number,
      "overallFeedback": "string"
    }
    `;

    usageCache.callCount += 1;
    try {
        // We use 'useFlash: false' here because Gemini 3 Pro is better for nuanced grading
        const jsonResponseText = await callGeminiWithLoadBalancing(gradingPrompt, true, undefined, false);
        
        let data;
        const cleanText = jsonResponseText.replace(/^```json\s*|```$/g, '').trim();
        data = JSON.parse(cleanText);

        const validatedData = validateAndCleanGradingResponse(data, validRubric);
        await updateDoc(doc(db, 'usage_trackers', 'ai_usage'), { callCount: increment(1) });
        return validatedData;
    } catch (error) { 
        usageCache.callCount -= 1;
        throw error;
    } 
};

function validateAndCleanGradingResponse(data, validRubric) {
    if (!data || !Array.isArray(data.scores)) throw new Error("Invalid structure.");
    let calculatedTotal = 0;
    const validatedScores = validRubric.map(rubricItem => {
        const aiScoreItem = data.scores.find(s => s.criteria === rubricItem.criteria);
        let awarded = aiScoreItem ? Math.max(0, Math.min(Number(aiScoreItem.pointsAwarded) || 0, Number(rubricItem.points))) : 0;
        calculatedTotal += awarded;
        return {
            criteria: rubricItem.criteria,
            pointsAwarded: awarded,
            justification: aiScoreItem?.justification || "No justification provided."
        };
    });
    return { 
        scores: validatedScores, 
        totalScore: Math.round(calculatedTotal), 
        overallFeedback: data.overallFeedback || "Evaluation completed." 
    };
}