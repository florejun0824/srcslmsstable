// In src/services/aiService.js

import { db } from './firebase'; // Adjust path if needed
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// --- API KEYS AND ENDPOINTS ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // <-- ADD THIS TO YOUR .env

// CORRECTED: Using the 'gemini-2.5-flash' model name
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- NEW: FALLBACK MODEL CONSTANTS ---
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-120b'; // User-specified model

const FREE_API_CALL_LIMIT_PER_MONTH = 500000;

// Helper function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Global state for caching Firestore reads ---
let usageCache = {
    callCount: 0,
    resetMonth: 0,
    lastChecked: 0,
};
const CACHE_DURATION_MS = 60000; // Cache for 60 seconds

/**
 * Checks the AI usage against the monthly limit using a cache.
 * (This function is unchanged)
 * @returns {Promise<boolean>} True if the limit has been reached, false otherwise.
 */
const checkAiLimitReached = async () => {
    const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
    const currentTime = Date.now();

    // 1. Check if cache is valid and limit reached
    if (currentTime - usageCache.lastChecked < CACHE_DURATION_MS) {
        if (usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
            console.warn("AI monthly limit reached (from cache).");
            return true; // Limit reached
        }
        return false; // Limit not reached (from cache)
    }

    // 2. Cache is stale, fetch from Firestore
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

        // 3. Final check after potential fetch/reset
        if (usageCache.callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
            console.warn("AI monthly limit reached (from Firestore).");
            return true; // Limit reached
        }
        return false; // Limit not reached

    } catch (error) {
        console.error("Error checking or initializing AI usage tracker:", error);
        throw new Error(`Failed to verify AI usage limit: ${error.message}`);
    }
};


// --- NEW: FALLBACK API CALLER ---
/**
 * Internal function to call the Groq API as a fallback.
 * Includes exponential backoff for its own rate limits.
 * @param {string} prompt The prompt to send.
 * @param {boolean} jsonMode Whether to request JSON output.
 * @param {number} retries Retries for 429/503 errors.
 * @param {number} backoff Initial backoff.
 * @returns {Promise<string>} The raw text response from the AI.
 */
const callGroqApi = async (prompt, jsonMode = false, retries = 5, backoff = 2000) => {
    console.warn(`Attempting fallback call to Groq (model: ${GROQ_FALLBACK_MODEL})...`);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
    };

    const body = {
        model: GROQ_FALLBACK_MODEL,
        messages: [{ role: "user", content: prompt }]
    };

    if (jsonMode) {
        body.response_format = { "type": "json_object" };
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
        });

        if (response.status === 429 || response.status === 503) {
            const error = new Error(response.status === 429 ? "Groq rate limit exceeded." : "Groq model is overloaded.");
            error.status = response.status;
            throw error; // Trigger retry
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Groq API call failed: ${response.status}. Response: ${errorText}`);
            throw new Error(`Groq API failed: ${response.status}. ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

        if (!data.choices?.[0]?.message?.content) {
            const finishReason = data.choices?.[0]?.finish_reason;
            if (finishReason === 'content_filter') {
                 console.warn("Groq response blocked by content filter.");
                 throw new Error("Groq response blocked by content filter.");
            }
            console.error("Invalid response structure from Groq:", JSON.stringify(data, null, 2));
            throw new Error("Groq response was not in the expected format.");
        }

        const textResponse = data.choices[0].message.content;
        return textResponse; // Return the raw text (which might be a JSON string if jsonMode=true)

    } catch (error) {
        if ((error.status === 429 || error.status === 503) && retries > 0) {
            console.warn(`Groq API Error (${error.status}): ${error.message} Retrying in ${backoff / 1000}s... (${retries} retries left)`);
            await delay(backoff);
            return callGroqApi(prompt, jsonMode, retries - 1, backoff * 2);
        }
        console.error("Error calling Groq fallback service:", error);
        throw new Error(`Groq fallback failed: ${error.message}`); // Propagate error
    }
};


/**
 * A reusable function to call the Gemini API that includes free-tier usage checks
 * and automatic failover to Groq for 429/503 errors.
 * @param {string} prompt The prompt to send to the AI.
 * @param {boolean} jsonMode Whether to request JSON output. // --- FIX: Add new parameter
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} Throws an error with message "LIMIT_REACHED" or a generic error if retries fail.
 */
export const callGeminiWithLimitCheck = async (prompt, jsonMode = false) => { // --- FIX: Add new parameter
    // Check limit before proceeding
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    // Optimistically update cache (will be reverted on failure)
    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now(); // Update last checked time

    try {
        // --- FIX: Build body object ---
        const body = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        // --- FIX: Add generationConfig if jsonMode is true ---
        if (jsonMode) {
            body.generationConfig = {
                responseMimeType: "application/json",
            };
        }
        // --- END FIX ---

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), // --- FIX: Use body object
        });

        // Check for retryable server errors
        if (response.status === 429 || response.status === 503) {
            const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded or unavailable.");
            error.status = response.status;
            throw error; // Throw to trigger fallback logic
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API call failed with status: ${response.status}. Raw Response: ${errorText}`);
            throw new Error(`API call failed: ${response.status}. ${errorText.substring(0, 200)}`);
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

        // Validate structure
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
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

        const textResponse = data.candidates[0].content.parts[0].text;

        // --- Final Write Operation ---
        // Increment Firestore count *after* successful API call
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });

        // --- FIX: Only strip backticks if NOT in jsonMode ---
        if (jsonMode) {
            return textResponse; // This is a raw JSON string
        }
        return textResponse.replace(/^```json\s*|```$/g, '').trim();
        // --- END FIX ---

    } catch (error) {
        // Revert optimistic cache update on any failure
        usageCache.callCount -= 1;

        // --- MODIFIED: FALLBACK LOGIC ---
        if (error.status === 429 || error.status === 503) {
            console.warn(`Gemini API Error (${error.status}): ${error.message}. Failing over to Groq...`);
            try {
                // 1. Re-increment cache for the fallback attempt
                usageCache.callCount += 1;
                usageCache.lastChecked = Date.now();

                // 2. Call fallback
                // --- FIX: Pass jsonMode to fallback ---
                const fallbackResponse = await callGroqApi(prompt, jsonMode);
                // --- END FIX ---

                // 3. If fallback succeeds, update Firestore
                const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                await updateDoc(usageDocRef, { callCount: increment(1) });

                // 4. Return fallback response
                // --- FIX: Only strip backticks if NOT in jsonMode ---
                if (jsonMode) {
                    return fallbackResponse; // This is a raw JSON string
                }
                return fallbackResponse.replace(/^```json\s*|```$/g, '').trim();
                // --- END FIX ---

            } catch (fallbackError) {
                // 5. If fallback *also* fails, revert the cache increment
                usageCache.callCount -= 1;
                console.error("Groq fallback also failed.", fallbackError);
                throw new Error(`Gemini failed (${error.message}) and Groq fallback failed (${fallbackError.message})`);
            }
        }
        // --- END FALLBACK LOGIC ---

        console.error("Error calling AI service (callGeminiWithLimitCheck):", error);
        // Propagate other errors (limit reached, network errors, parsing errors, safety blocks etc.)
        throw error;
    }
};


// --- NEW FUNCTION: gradeEssayWithAI ---
/**
 * Grades a student's essay using the Gemini AI based on a provided rubric.
 * Includes usage limit checks and failover to Groq.
 * @param {string} promptText The essay question/prompt given to the student.
 * @param {Array<object>} rubric Array of rubric items, e.g., [{ id: '...', criteria: '...', points: number }]
 * @param {string} studentAnswer The student's written answer.
 * @returns {Promise<object>} A JSON object with the grading results: { scores: [{ criteria, pointsAwarded, justification }], totalScore, overallFeedback }
 */
export const gradeEssayWithAI = async (promptText, rubric, studentAnswer) => {
    // 1. Check Limit
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    // 2. Construct the Grading Prompt
    const validRubric = (rubric || []).filter(item => item && item.criteria && Number(item.points) > 0);
    if (validRubric.length === 0) {
        throw new Error("Invalid or empty rubric provided for grading.");
    }
    const rubricJson = JSON.stringify(validRubric, null, 2);
    const maxTotalPoints = validRubric.reduce((sum, item) => sum + Number(item.points), 0);

    // This prompt is now shared by both Gemini and Groq
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

    // 3. Optimistically update cache
    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now();

    try {
        console.log("Sending grading prompt to AI (Gemini)...");
        // 4. Call Gemini API
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                 contents: [{ parts: [{ text: gradingPrompt }] }],
                 generationConfig: {
                     responseMimeType: "application/json",
                 },
                 safetySettings: [
                   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                 ],
            }),
        });

        // Handle retries (same logic as callGeminiWithLimitCheck)
        if (response.status === 429 || response.status === 503) {
            const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded or unavailable.");
            error.status = response.status;
            throw error; // Trigger fallback
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`AI Grading API call failed: ${response.status}. Response: ${errorText}`);
            throw new Error(`AI Grading API failed: ${response.status}. ${errorText.substring(0, 200)}`);
        }

        let data;
        let rawResponseTextForError = '';
        try {
            rawResponseTextForError = await response.text();
             const preliminaryData = JSON.parse(rawResponseTextForError);

             if (!preliminaryData.candidates?.[0]?.content?.parts?.[0]?.text) {
                if (preliminaryData.candidates?.[0]?.finishReason === 'SAFETY') throw new Error("AI response blocked for safety reasons.");
                if(preliminaryData.promptFeedback?.blockReason) throw new Error(`AI prompt blocked: ${preliminaryData.promptFeedback.blockReason}`);
                throw new Error("AI response structure unexpected (missing text part).");
             }

             // Parse the JSON *string* returned within the 'text' field
             data = JSON.parse(preliminaryData.candidates[0].content.parts[0].text);

        } catch (jsonError) {
            console.error("Failed to parse AI grading response JSON.", jsonError);
            console.error("Raw AI Response:", rawResponseTextForError);
            throw new Error(`AI grading response was not valid JSON. Raw: ${rawResponseTextForError.substring(0, 500)}...`);
        }

        // 5. Validate the Parsed JSON Grading Data (Gemini)
        // (This logic is now reused for Groq response)
        const validatedData = validateAndCleanGradingResponse(data, validRubric);

        // 6. Increment Firestore count
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });

        console.log("AI Grading (Gemini) successful:", validatedData);
        return validatedData;

    } catch (error) {
        // Revert optimistic cache update on error
        usageCache.callCount -= 1;

        // --- MODIFIED: FALLBACK LOGIC ---
        if (error.status === 429 || error.status === 503) {
            console.warn(`Gemini Grading Error (${error.status}): ${error.message}. Failing over to Groq...`);
            try {
                // 1. Re-increment cache for the fallback attempt
                usageCache.callCount += 1;
                usageCache.lastChecked = Date.now();

                // 2. Call fallback in JSON mode
                const fallbackResponseText = await callGroqApi(gradingPrompt, true);

                // 3. Parse the Groq JSON response
                let data;
                try {
                    data = JSON.parse(fallbackResponseText);
                } catch (jsonError) {
                    console.error("Failed to parse Groq grading response JSON.", jsonError);
                    console.error("Raw Groq Response:", fallbackResponseText);
                    throw new Error(`Groq grading response was not valid JSON. Raw: ${fallbackResponseText.substring(0, 500)}...`);
                }

                // 4. Validate the Parsed JSON (Groq)
                const validatedData = validateAndCleanGradingResponse(data, validRubric, "Groq");

                // 5. Increment Firestore count
                const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                await updateDoc(usageDocRef, { callCount: increment(1) });

                console.log("AI Grading (Groq Fallback) successful:", validatedData);
                return validatedData;

            } catch (fallbackError) {
                // 6. If fallback *also* fails, revert the cache increment
                usageCache.callCount -= 1;
                console.error("Groq fallback grading also failed.", fallbackError);
                throw new Error(`Gemini grading failed (${error.message}) and Groq fallback failed (${fallbackError.message})`);
            }
        }
        // --- END FALLBACK LOGIC ---


        console.error("Error during AI essay grading (gradeEssayWithAI):", error);
        if (error.message === "LIMIT_REACHED") throw error;
        if (error.message.includes("blocked due to safety")) throw new Error("AI grading response blocked for safety reasons.");
        if (error.message.includes("AI prompt blocked")) throw new Error(error.message);
        
        throw new Error(`AI essay grading failed: ${error.message}`);
    }
};


/**
 * Helper function to validate the JSON structure from an AI grading response.
 * @param {object} data The parsed JSON object from the AI.
 * @param {Array} validRubric The original rubric used for validation.
 * @param {string} [source="AI"] The source of the AI (e.g., "Gemini", "Groq") for logging.
 * @returns {object} The validated and cleaned grading data.
 * @throws {Error} If the structure is invalid.
 */
function validateAndCleanGradingResponse(data, validRubric, source = "AI") {
     if (!data || !Array.isArray(data.scores) || typeof data.totalScore !== 'number' || data.scores.length === 0) {
        console.error(`Invalid grading JSON structure from ${source}:`, JSON.stringify(data, null, 2));
        throw new Error(`${source} grading response JSON structure is invalid.`);
    }

    // --- Detailed Validation and Correction ---
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
// --- END NEW FUNCTION ---