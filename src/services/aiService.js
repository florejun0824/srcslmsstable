// In src/services/aiService.js

import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
// CORRECTED: Using the 'gemini-2.5-flash' model name as specified by the user.
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const FREE_API_CALL_LIMIT_PER_MONTH = 50000;

// Helper function to create a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A reusable function to call the Gemini API that includes free-tier usage checks
 * and exponential backoff for handling rate limit (429) and server unavailable (503) errors.
 * @param {string} prompt The prompt to send to the AI.
 * @param {number} retries The number of times to retry on a 429 or 503 error.
 * @param {number} backoff The initial time to wait before retrying, in milliseconds.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} Throws an error with message "LIMIT_REACHED" or a generic error if retries fail.
 */
export const callGeminiWithLimitCheck = async (prompt, retries = 7, backoff = 3000) => {
    // 1. Get reference to our tracker document
    const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
    const usageSnap = await getDoc(usageDocRef);

    if (!usageSnap.exists()) {
        await setDoc(usageDocRef, { callCount: 1, resetMonth: new Date().getMonth() + 1 });
    } else {
        let { callCount, resetMonth } = usageSnap.data();
        const currentMonth = new Date().getMonth() + 1;

        if (resetMonth !== currentMonth) {
            await updateDoc(usageDocRef, {
                callCount: 1,
                resetMonth: currentMonth
            });
        } else {
            if (callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
                console.warn("AI monthly limit reached.");
                throw new Error("LIMIT_REACHED");
            }
            await updateDoc(usageDocRef, { callCount: increment(1) });
        }
    }

    // 4. If all checks pass, proceed with the API call
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        // Check for retryable server errors
        if (response.status === 429 || response.status === 503) {
            const error = new Error(response.status === 429 ? "Rate limit exceeded." : "Model is overloaded.");
            error.status = response.status;
            throw error;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed with status: ${response.status}. Response: ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error("Invalid response structure from AI:", data);
            throw new Error("AI response was not in the expected format.");
        }

        const textResponse = data.candidates[0].content.parts[0].text;
        return textResponse.replace(/```json|```/g, '').trim();

    } catch (error) {
        // Exponential backoff logic for both 429 and 503 errors
        if ((error.status === 429 || error.status === 503) && retries > 0) {
            console.warn(`API Error (${error.status}): ${error.message} Retrying in ${backoff / 1000}s... (${retries} retries left)`);
            
            await delay(backoff);
            
            await updateDoc(usageDocRef, { callCount: increment(-1) });

            return callGeminiWithLimitCheck(prompt, retries - 1, backoff * 2);
        }

        console.error("Error calling AI service:", error);
        throw error;
    }
};
