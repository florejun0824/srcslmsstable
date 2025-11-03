import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_FALLBACK_API_KEY = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY;
const GEMINI_FALLBACK_API_KEY_2 = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY_2;
const GEMINI_FALLBACK_API_KEY_3 = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY_3;
const GEMINI_FALLBACK_API_KEY_4 = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY_4;

const GEMINI_MODEL = 'gemini-2.5-flash';

const API_URLS = [
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY}`,
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY_2}`,
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY_3}`,
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY_4}`
];

const NUM_KEYS = API_URLS.length;
let currentApiIndex = 0;

const FREE_API_CALL_LIMIT_PER_MONTH = 500000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let usageCache = {
    callCount: 0,
    resetMonth: 0,
    lastChecked: 0,
};
const CACHE_DURATION_MS = 60000;

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

const callGeminiApiInternal = async (prompt, jsonMode = false, apiUrl) => {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
           { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
         ],
    };

    if (jsonMode) {
        body.generationConfig = { responseMimeType: "application/json" };
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (response.status === 429 || response.status === 503) {
        const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded or unavailable.");
        error.status = response.status;
        throw error;
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API call failed: ${response.status}. Response: ${errorText}`);
        throw new Error(`Gemini API failed: ${response.status}. ${errorText.substring(0, 200)}`);
    }

    let data;
    let rawResponseTextForError = '';
    try {
        rawResponseTextForError = await response.text();
        data = JSON.parse(rawResponseTextForError);
    } catch (jsonError) {
        console.error("Failed to parse AI response as JSON.", jsonError);
        console.error("Raw AI Response (non-JSON):", rawResponseTextForError);
        throw new Error(`AI response was not valid JSON. Raw: ${rawResponseTextForError.substring(0, 500)}...`);
    }

    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) {
         if (data.candidates?.[0]?.finishReason === 'SAFETY') {
             console.warn("AI response blocked due to safety settings:", data.candidates[0].safetyRatings);
             throw new Error("AI response blocked due to safety settings.");
         }
         if(data.promptFeedback?.blockReason){
             console.warn("AI prompt blocked:", data.promptFeedback.blockReason, data.promptFeedback.safetyRatings);
             throw new Error(`AI prompt blocked: ${data.promptFeedback.blockReason}`);
         }
        console.error("Invalid response structure from AI:", JSON.stringify(data, null, 2));
        throw new Error("AI response was not in the expected format.");
    }

    return textPart;
};

const callGeminiWithLoadBalancing = async (prompt, jsonMode = false) => {
    const startIndex = currentApiIndex;
    
    currentApiIndex = (currentApiIndex + 1) % NUM_KEYS;

    const errors = {};

    for (let i = 0; i < NUM_KEYS; i++) {
        const keyIndex = (startIndex + i) % NUM_KEYS;
        const apiUrl = API_URLS[keyIndex];
        const keyName = `Key ${String.fromCharCode(65 + keyIndex)}`;

        try {
            console.log(`Attempting Gemini API with ${keyName} (Index ${keyIndex})...`);
            const response = await callGeminiApiInternal(prompt, jsonMode, apiUrl);
            
            console.log(`Gemini API call with ${keyName} successful.`);
            return response;

        } catch (error) {
            errors[keyName] = error.message;

            if (error.status === 429 || error.status === 503) {
                console.warn(`Gemini API ${keyName} failed: ${error.message}. Failing over to next key...`);
            } else {
                console.error(`Gemini API ${keyName} failed with non-retryable error.`, error);
                throw error;
            }
        }
    }

    console.error("All Gemini keys failed.", errors);
    throw new Error(`All Gemini keys failed: ${JSON.stringify(errors)}`);
};

export const callGeminiWithLimitCheck = async (prompt) => {
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now();

    try {
        const rawResponse = await callGeminiWithLoadBalancing(prompt, false);
        
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });

        return rawResponse.replace(/^```json\s*|```$/g, '').trim();

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

        const data = JSON.parse(jsonResponseText);
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