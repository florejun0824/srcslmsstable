// In src/services/aiService.js

import { db } from './firebase'; // Adjust path if needed
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// CORRECTED: Using the 'gemini-2.5-flash' model name as specified by the user.
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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
 * Fetches from Firestore if the cache is stale.
 * @returns {Promise<boolean>} True if the limit has been reached, false otherwise.
 * @throws {Error} Throws if Firestore read/write fails during initialization/reset.
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
                // Month has reset, update cache and Firestore
                usageCache = { callCount: 0, resetMonth: currentMonth, lastChecked: currentTime };
                // Perform the reset write operation here
                await updateDoc(usageDocRef, { callCount: 0, resetMonth: currentMonth });
                console.log("AI usage counter reset for new month.");
            } else {
                // Update cache with fresh data
                usageCache = { callCount, resetMonth, lastChecked: currentTime };
            }
        } else {
            // Document doesn't exist, initialize it and the cache
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
        // Fail safe: assume limit might be reached if we can't check
        // Or you could choose to throw the error to halt the process
        // For now, let's throw to indicate a problem with tracking
        throw new Error(`Failed to verify AI usage limit: ${error.message}`);
    }
};


/**
 * A reusable function to call the Gemini API that includes free-tier usage checks
 * and exponential backoff for handling rate limit (429) and server unavailable (503) errors.
 * Handles Firestore increment *after* successful API call.
 * @param {string} prompt The prompt to send to the AI.
 * @param {number} retries The number of times to retry on a 429 or 503 error.
 * @param {number} backoff The initial time to wait before retrying, in milliseconds.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} Throws an error with message "LIMIT_REACHED" or a generic error if retries fail.
 */
export const callGeminiWithLimitCheck = async (prompt, retries = 7, backoff = 3000) => {
    // Check limit before proceeding
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    // Optimistically update cache (will be reverted on failure)
    usageCache.callCount += 1;
    usageCache.lastChecked = Date.now(); // Update last checked time

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // Optional: Add safety settings if needed
                // safetySettings: [
                //   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                //   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                //   { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                //   { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                // ],
                // generationConfig: {
                //   responseMimeType: "application/json", // If you expect JSON *always*
                // }
            }),
        });

        // Check for retryable server errors
        if (response.status === 429 || response.status === 503) {
            const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded or unavailable.");
            error.status = response.status;
            throw error; // Throw to trigger retry logic
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API call failed with status: ${response.status}. Raw Response: ${errorText}`);
            throw new Error(`API call failed: ${response.status}. ${errorText.substring(0, 200)}`);
        }

        let data;
        let rawResponseTextForError = ''; // Store raw text in case JSON parsing fails
        try {
            // Read response text first
            rawResponseTextForError = await response.text();
            // Then try to parse
            data = JSON.parse(rawResponseTextForError);
        } catch (jsonError) {
            console.error("Failed to parse AI response as JSON.", jsonError);
            console.error("Raw AI Response (non-JSON):", rawResponseTextForError);
            throw new Error(`AI response was not valid JSON. Raw: ${rawResponseTextForError.substring(0, 500)}...`);
        }

        // Validate structure (adjust based on actual Gemini response format)
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
             // Check for safety ratings / blocked content
             if (data.candidates?.[0]?.finishReason === 'SAFETY') {
                 console.warn("AI response blocked due to safety settings:", data.candidates[0].safetyRatings);
                 throw new Error("AI response blocked due to safety settings.");
             }
             if(data.promptFeedback?.blockReason){
                 console.warn("AI prompt blocked:", data.promptFeedback.blockReason, data.promptFeedback.safetyRatings);
                 throw new Error(`AI prompt blocked: ${data.promptFeedback.blockReason}`);
             }
             // General structure error
            console.error("Invalid response structure from AI:", JSON.stringify(data, null, 2));
            throw new Error("AI response was not in the expected format.");
        }

        const textResponse = data.candidates[0].content.parts[0].text;

        // --- Final Write Operation ---
        // Increment Firestore count *after* successful API call and parsing
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });

        // Return cleaned text
        return textResponse.replace(/^```json\s*|```$/g, '').trim();

    } catch (error) {
        // Revert optimistic cache update on any failure before Firestore update
        usageCache.callCount -= 1;

        // Retry logic for specific errors
        if ((error.status === 429 || error.status === 503) && retries > 0) {
            console.warn(`API Error (${error.status}): ${error.message} Retrying in ${backoff / 1000}s... (${retries} retries left)`);
            await delay(backoff);
            // Re-call the function for retry (it will re-check limit and re-increment cache)
            return callGeminiWithLimitCheck(prompt, retries - 1, backoff * 2);
        }

        console.error("Error calling AI service (callGeminiWithLimitCheck):", error);
        // Propagate other errors (limit reached, network errors, parsing errors, safety blocks etc.)
        throw error;
    }
};


// --- NEW FUNCTION: gradeEssayWithAI ---
/**
 * Grades a student's essay using the Gemini AI based on a provided rubric.
 * Includes usage limit checks and retries.
 * @param {string} promptText The essay question/prompt given to the student.
 * @param {Array<object>} rubric Array of rubric items, e.g., [{ id: '...', criteria: '...', points: number }]
 * @param {string} studentAnswer The student's written answer.
 * @param {number} retries Number of retries for API errors.
 * @param {number} backoff Initial backoff delay for retries.
 * @returns {Promise<object>} A JSON object with the grading results: { scores: [{ criteria, pointsAwarded, justification }], totalScore, overallFeedback }
 * @throws {Error} Throws "LIMIT_REACHED", "AI essay grading failed: ...", or other specific errors.
 */
export const gradeEssayWithAI = async (promptText, rubric, studentAnswer, retries = 5, backoff = 4000) => {
    // 1. Check Limit (uses the same shared logic and cache)
    const limitReached = await checkAiLimitReached();
    if (limitReached) {
        throw new Error("LIMIT_REACHED");
    }

    // 2. Construct the Grading Prompt
    // Ensure rubric items have points > 0 for meaningful grading
    const validRubric = (rubric || []).filter(item => item && item.criteria && Number(item.points) > 0);
    if (validRubric.length === 0) {
        throw new Error("Invalid or empty rubric provided for grading.");
    }
    const rubricJson = JSON.stringify(validRubric, null, 2); // Use only valid items
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
        console.log("Sending grading prompt to AI..."); // For debugging
        // 4. Call Gemini API (using fetch directly or potentially reusing parts of callGeminiWithLimitCheck if refactored)
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                 contents: [{ parts: [{ text: gradingPrompt }] }],
                 // IMPORTANT: Request JSON output if model supports it
                 // Adjust model/API endpoint if necessary for JSON mode
                 generationConfig: {
                     responseMimeType: "application/json",
                 },
                 // Add safety settings if desired
                 safetySettings: [
                   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                   // Add others as needed
                 ],
            }),
        });

        // Handle retries (same logic as callGeminiWithLimitCheck)
        if (response.status === 429 || response.status === 503) {
            const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded or unavailable.");
            error.status = response.status;
            throw error;
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
            // The response should already be JSON due to responseMimeType
            // Need to parse the text part within the standard Gemini structure
             const preliminaryData = JSON.parse(rawResponseTextForError);

             if (!preliminaryData.candidates?.[0]?.content?.parts?.[0]?.text) {
                // Handle safety blocks or other API structural issues
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

        // 5. Validate the Parsed JSON Grading Data
        if (!data || !Array.isArray(data.scores) || typeof data.totalScore !== 'number' || data.scores.length === 0) {
            console.error("Invalid grading JSON structure:", JSON.stringify(data, null, 2));
            throw new Error("AI grading response JSON structure is invalid.");
        }

        // --- Detailed Validation and Correction ---
        let calculatedTotal = 0;
        const validatedScores = [];
        const originalCriteriaNames = validRubric.map(item => item.criteria);

        // Ensure scores match rubric items and points are valid
        validRubric.forEach(rubricItem => {
            const aiScoreItem = data.scores.find(s => s.criteria === rubricItem.criteria);
            if (aiScoreItem) {
                let awarded = Number(aiScoreItem.pointsAwarded) || 0;
                const maxPoints = Number(rubricItem.points) || 0;

                // Clamp points awarded to be within [0, maxPoints]
                awarded = Math.max(0, Math.min(awarded, maxPoints));

                validatedScores.push({
                    criteria: rubricItem.criteria, // Use original criteria name
                    pointsAwarded: awarded,
                    justification: aiScoreItem.justification || "No justification provided."
                });
                calculatedTotal += awarded;
            } else {
                 console.warn(`AI did not provide score for criteria: "${rubricItem.criteria}". Awarding 0 points.`);
                 validatedScores.push({
                     criteria: rubricItem.criteria,
                     pointsAwarded: 0,
                     justification: "AI did not evaluate this criterion."
                 });
            }
        });

        // Check if AI included extra criteria not in the rubric
         data.scores.forEach(aiScoreItem => {
             if (!originalCriteriaNames.includes(aiScoreItem.criteria)) {
                 console.warn(`AI included an extra criteria not in the rubric: "${aiScoreItem.criteria}". Ignoring.`);
             }
         });

        // Recalculate total score based on validated/clamped scores
        const finalTotalScore = Math.round(calculatedTotal); // Round final score

        if (finalTotalScore !== Math.round(data.totalScore)) {
            console.warn(`AI reported totalScore (${data.totalScore}) differs from calculated/validated score (${finalTotalScore}). Using calculated score.`);
        }

        const validatedData = {
            scores: validatedScores,
            totalScore: finalTotalScore,
            overallFeedback: data.overallFeedback || "No overall feedback provided."
        };
        // --- End Validation ---


        // 6. Increment Firestore count *after* successful call and validation
        const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
        await updateDoc(usageDocRef, { callCount: increment(1) });

        console.log("AI Grading successful:", validatedData); // Log validated data
        return validatedData; // Return the validated data

    } catch (error) {
        // Revert optimistic cache update on error
        usageCache.callCount -= 1;

        // Retry logic
        if ((error.status === 429 || error.status === 503) && retries > 0) {
            console.warn(`AI Grading Error (${error.status}): ${error.message} Retrying in ${backoff / 1000}s... (${retries} retries left)`);
            await delay(backoff);
            // Re-call for retry
            return gradeEssayWithAI(promptText, rubric, studentAnswer, retries - 1, backoff * 2);
        }

        console.error("Error during AI essay grading (gradeEssayWithAI):", error);
        // Add specific message for limit reached during retry exhaustion
        if (error.message === "LIMIT_REACHED") {
            throw error; // Propagate specific limit error
        }
        // Add specific message for safety blocks
        if (error.message.includes("blocked due to safety")) {
             throw new Error("AI grading response blocked for safety reasons.");
        }
         if (error.message.includes("AI prompt blocked")) {
             throw new Error(error.message); // Propagate prompt block reason
         }
        // Throw a generic grading failed error for others
        throw new Error(`AI essay grading failed: ${error.message}`);
    }
};
// --- END NEW FUNCTION ---