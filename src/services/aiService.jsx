// In src/services/aiService.js

import { db } from './firebase'; // Adjust path if needed
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

// --- API KEYS AND ENDPOINTS ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_FALLBACK_API_KEY = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY;
const GEMINI_FALLBACK_API_KEY_2 = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY_2;
const GEMINI_FALLBACK_API_KEY_3 = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY_3;
const GEMINI_FALLBACK_API_KEY_4 = import.meta.env.VITE_GEMINI_FALLBACK_API_KEY_4; // Fifth key

// All keys will use the same model
const GEMINI_MODEL = 'gemini-2.5-flash';

// Define all five API URLs
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_FALLBACK_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY}`;
const GEMINI_FALLBACK_API_URL_2 = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY_2}`;
const GEMINI_FALLBACK_API_URL_3 = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY_3}`;
const GEMINI_FALLBACK_API_URL_4 = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_FALLBACK_API_KEY_4}`;


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


/**
 * Internal function to call a specific Gemini API endpoint.
 * This handles the actual fetch and error parsing.
 * @param {string} prompt The prompt to send.
 * @param {boolean} jsonMode Whether to request JSON output.
 * @param {string} apiUrl The full API URL with key.
 * @returns {Promise<string>} The raw text response from the AI.
 */
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

    // Check for retryable server errors
    if (response.status === 429 || response.status === 503) {
        const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded or unavailable.");
        error.status = response.status;
        throw error; // Throw to trigger fallback
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

    // Validate structure
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

    return jsonMode ? textPart : textPart.replace(/^```json\s*|```$/g, '').trim();
};


/**
 * MODIFIED: This function now has a 5-layer-deep automatic failover.
 * It will try Key A, then B, then C, then D, then E.
 * @param {string} prompt The prompt to send to the AI.
 * @returns {Promise<string>} The text response from the AI.
 */
export const callGeminiWithLimitCheck = async (prompt) => {
    // Check limit before proceeding
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    // Optimistically update cache (will be reverted on failure)
    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now();

    try {
        // 1. Try Main API (Key A)
        console.log("Attempting main Gemini API (Key A)...");
        const textResponse = await callGeminiApiInternal(prompt, false, GEMINI_API_URL);
        
        // SUCCESS (Key A): Increment counter and return
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });
        return textResponse;

    } catch (errorA) {
        // 2. If Main API (Key A) fails (429/503), try Fallback 1 (Key B)
        if (errorA.status === 429 || errorA.status === 503) {
            console.warn(`Main Gemini (Key A) Error: ${errorA.message}. Failing over to Fallback 1 (Key B)...`);
            try {
                // 3. Call Fallback 1 API (Key B)
                const fallbackResponseB = await callGeminiApiInternal(prompt, false, GEMINI_FALLBACK_API_URL);
                
                // SUCCESS (Key B): Increment counter and return
                const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                await updateDoc(usageDocRef, { callCount: increment(1) });
                console.log("Fallback Gemini (Key B) successful.");
                return fallbackResponseB;

            } catch (errorB) {
                // 4. If Fallback 1 (Key B) *also* fails (429/503), try Fallback 2 (Key C)
                if (errorB.status === 429 || errorB.status === 503) {
                     console.warn(`Fallback Gemini (Key B) Error: ${errorB.message}. Failing over to Fallback 2 (Key C)...`);
                     try {
                        // 5. Call Fallback 2 API (Key C)
                        const fallbackResponseC = await callGeminiApiInternal(prompt, false, GEMINI_FALLBACK_API_URL_2);
                        
                        // SUCCESS (Key C): Increment counter and return
                        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                        await updateDoc(usageDocRef, { callCount: increment(1) });
                        console.log("Fallback Gemini (Key C) successful.");
                        return fallbackResponseC;

                     } catch (errorC) {
                        // 6. If Fallback 2 (Key C) *also* fails (429/503), try Fallback 3 (Key D)
                         if (errorC.status === 429 || errorC.status === 503) {
                            console.warn(`Fallback Gemini (Key C) Error: ${errorC.message}. Failing over to Fallback 3 (Key D)...`);
                            try {
                                // 7. Call Fallback 3 API (Key D)
                                const fallbackResponseD = await callGeminiApiInternal(prompt, false, GEMINI_FALLBACK_API_URL_3);

                                // SUCCESS (Key D): Increment counter and return
                                const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                                await updateDoc(usageDocRef, { callCount: increment(1) });
                                console.log("Fallback Gemini (Key D) successful.");
                                return fallbackResponseD;
                                
                            } catch (errorD) {
                                // 8. If Fallback 3 (Key D) *also* fails (429/503), try Fallback 4 (Key E)
                                if (errorD.status === 429 || errorD.status === 503) {
                                    console.warn(`Fallback Gemini (Key D) Error: ${errorD.message}. Failing over to Fallback 4 (Key E)...`);
                                    try {
                                        // 9. Call Fallback 4 API (Key E)
                                        const fallbackResponseE = await callGeminiApiInternal(prompt, false, GEMINI_FALLBACK_API_URL_4);
                                        
                                        // SUCCESS (Key E): Increment counter and return
                                        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                                        await updateDoc(usageDocRef, { callCount: increment(1) });
                                        console.log("Fallback Gemini (Key E) successful.");
                                        return fallbackResponseE;
                                        
                                    } catch (errorE) {
                                        // 10. All five failed
                                        usageCache.callCount -= 1;
                                        console.error("All five Gemini keys failed.", errorE);
                                        throw new Error(`All Gemini keys failed: A(${errorA.message}), B(${errorB.message}), C(${errorC.message}), D(${errorD.message}), E(${errorE.message})`);
                                    }
                                } else {
                                    // If Fallback 3 (Key D) fails for a *non-retryable* reason
                                    usageCache.callCount -= 1;
                                    console.error("Fallback Gemini (Key D) failed with non-retryable error.", errorD);
                                    throw errorD; // Throw non-retryable error from Key D
                                }
                            }
                         } else {
                            // If Fallback 2 (Key C) fails for a *non-retryable* reason
                            usageCache.callCount -= 1;
                            console.error("Fallback Gemini (Key C) failed with non-retryable error.", errorC);
                            throw errorC; // Throw non-retryable error from Key C
                         }
                     }
                } else {
                    // If Fallback 1 (Key B) fails for a *non-retryable* reason
                    usageCache.callCount -= 1;
                    console.error("Fallback Gemini (Key B) failed with non-retryable error.", errorB);
                    throw errorB; // Throw the non-retryable error from Key B
                }
            }
        } else {
            // If Main API (Key A) fails for a *non-retryable* reason
            usageCache.callCount -= 1;
            console.error("Main Gemini (Key A) failed with non-retryable error.", errorA);
            throw errorA; // Throw the non-retryable error from Key A
        }
    }
};


/**
 * MODIFIED: This function now has a 5-layer-deep automatic failover for grading.
 * @returns {Promise<object>} A JSON object with the grading results.
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
        // 1. Try Main API (Key A - JSON Mode)
        console.log("Sending grading prompt to AI (Main Gemini - Key A)...");
        const mainResponseText = await callGeminiApiInternal(gradingPrompt, true, GEMINI_API_URL);
        const dataA = JSON.parse(mainResponseText);
        const validatedDataA = validateAndCleanGradingResponse(dataA, validRubric, "Main Gemini (Key A)");

        // SUCCESS (Key A): Increment counter and return
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });
        console.log("AI Grading (Main Gemini - Key A) successful:", validatedDataA);
        return validatedDataA;

    } catch (errorA) {
        // 2. If Main API (Key A) fails (429/503), try Fallback 1 (Key B)
        if (errorA.status === 429 || errorA.status === 503) {
            console.warn(`Main Gemini Grading (Key A) Error: ${errorA.message}. Failing over to Fallback 1 (Key B)...`);
            try {
                // 3. Call Fallback 1 API (Key B - JSON Mode)
                const fallbackResponseTextB = await callGeminiApiInternal(gradingPrompt, true, GEMINI_FALLBACK_API_URL);
                const dataB = JSON.parse(fallbackResponseTextB);
                const validatedDataB = validateAndCleanGradingResponse(dataB, validRubric, "Fallback Gemini (Key B)");

                // SUCCESS (Key B): Increment counter and return
                const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                await updateDoc(usageDocRef, { callCount: increment(1) });
                console.log("AI Grading (Fallback Gemini - Key B) successful:", validatedDataB);
                return validatedDataB;

            } catch (errorB) {
                // 4. If Fallback 1 (Key B) *also* fails (429/503), try Fallback 2 (Key C)
                if (errorB.status === 429 || errorB.status === 503) {
                    console.warn(`Fallback Gemini Grading (Key B) Error: ${errorB.message}. Failing over to Fallback 2 (Key C)...`);
                    try {
                        // 5. Call Fallback 2 API (Key C - JSON Mode)
                        const fallbackResponseTextC = await callGeminiApiInternal(gradingPrompt, true, GEMINI_FALLBACK_API_URL_2);
                        const dataC = JSON.parse(fallbackResponseTextC);
                        const validatedDataC = validateAndCleanGradingResponse(dataC, validRubric, "Fallback Gemini (Key C)");

                        // SUCCESS (Key C): Increment counter and return
                        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                        await updateDoc(usageDocRef, { callCount: increment(1) });
                        console.log("AI Grading (Fallback Gemini - Key C) successful:", validatedDataC);
                        return validatedDataC;

                    } catch (errorC) {
                        // 6. If Fallback 2 (Key C) *also* fails (429/503), try Fallback 3 (Key D)
                        if (errorC.status === 429 || errorC.status === 503) {
                            console.warn(`Fallback Gemini Grading (Key C) Error: ${errorC.message}. Failing over to Fallback 3 (Key D)...`);
                            try {
                                // 7. Call Fallback 3 API (Key D - JSON Mode)
                                const fallbackResponseTextD = await callGeminiApiInternal(gradingPrompt, true, GEMINI_FALLBACK_API_URL_3);
                                const dataD = JSON.parse(fallbackResponseTextD);
                                const validatedDataD = validateAndCleanGradingResponse(dataD, validRubric, "Fallback Gemini (Key D)");

                                // SUCCESS (Key D): Increment counter and return
                                const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                                await updateDoc(usageDocRef, { callCount: increment(1) });
                                console.log("AI Grading (Fallback Gemini - Key D) successful:", validatedDataD);
                                return validatedDataD;

                            } catch (errorD) {
                                // 8. If Fallback 3 (Key D) *also* fails (429/503), try Fallback 4 (Key E)
                                if (errorD.status === 429 || errorD.status === 503) {
                                    console.warn(`Fallback Gemini Grading (Key D) Error: ${errorD.message}. Failing over to Fallback 4 (Key E)...`);
                                    try {
                                        // 9. Call Fallback 4 API (Key E - JSON Mode)
                                        const fallbackResponseTextE = await callGeminiApiInternal(gradingPrompt, true, GEMINI_FALLBACK_API_URL_4);
                                        const dataE = JSON.parse(fallbackResponseTextE);
                                        const validatedDataE = validateAndCleanGradingResponse(dataE, validRubric, "Fallback Gemini (Key E)");

                                        // SUCCESS (Key E): Increment counter and return
                                        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
                                        await updateDoc(usageDocRef, { callCount: increment(1) });
                                        console.log("AI Grading (Fallback Gemini - Key E) successful:", validatedDataE);
                                        return validatedDataE;
                                        
                                    } catch (errorE) {
                                        // 10. All five failed
                                        usageCache.callCount -= 1;
                                        console.error("All five Gemini grading keys failed.", errorE);
                                        throw new Error(`All Gemini keys failed: A(${errorA.message}), B(${errorB.message}), C(${errorC.message}), D(${errorD.message}), E(${errorE.message})`);
                                    }
                                } else {
                                    // If Fallback 3 (Key D) fails for a *non-retryable* reason
                                    usageCache.callCount -= 1;
                                    console.error("Fallback Gemini Grading (Key D) failed with non-retryable error.", errorD);
                                    throw errorD; // Throw non-retryable error from Key D
                                }
                            }
                        } else {
                            // If Fallback 2 (Key C) fails for a *non-retryable* reason
                            usageCache.callCount -= 1;
                            console.error("Fallback Gemini Grading (Key C) failed with non-retryable error.", errorC);
                            throw errorC; // Throw non-retryable error from Key C
                        }
                    }
                } else {
                    // If Fallback 1 (Key B) fails for a *non-retryable* reason
                    usageCache.callCount -= 1;
                    console.error("Fallback Gemini Grading (Key B) failed with non-retryable error.", errorB);
                    throw errorB; // Throw non-retryable error from Key B
                }
            }
        } else {
            // 9. If Main API (Key A) fails for a *non-retryable* reason
            usageCache.callCount -= 1;
            console.error("Main Gemini Grading (Key A) failed with non-retryable error.", errorA);
            throw errorA; // Throw non-retryable error from Key A
        }
    }
};


/**
 * Helper function to validate the JSON structure from an AI grading response.
 */
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

/**
 * A dedicated function for the chatbot.
 * This uses the main callGeminiWithLimitCheck, so it gets
 * the same 5-layer Main -> FB1 -> FB2 -> FB3 -> FB4 protection.
 * @param {string} prompt The prompt to send to the AI.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} Throws "LIMIT_REACHED" or other errors from callGeminiWithLimitCheck.
 */
export const callChatbotAi = async (prompt) => {
    try {
        const response = await callGeminiWithLimitCheck(prompt);
        return response;
    } catch (error) {
        console.error("Error in callChatbotAi:", error);
        // Re-throw the error to be handled by the UI
        throw error;
    }
};