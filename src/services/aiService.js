// In src/services/aiService.js

import { db } from './firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// This is a high safety cap. The actual free limit is based on requests per minute/day.
const FREE_API_CALL_LIMIT_PER_MONTH = 50000;

/**
 * A reusable function to call the Gemini API that includes free-tier usage checks.
 * @param {string} prompt The prompt to send to the AI.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} Throws an error with message "LIMIT_REACHED" or a generic error.
 */
export const callGeminiWithLimitCheck = async (prompt) => {
    // 1. Get reference to our tracker document
    const usageDocRef = doc(db, 'usage_trackers', 'ai_usage');
    const usageSnap = await getDoc(usageDocRef);

    if (!usageSnap.exists()) {
        // If the document doesn't exist, create it and allow the call.
        await setDoc(usageDocRef, { callCount: 1, resetMonth: new Date().getMonth() + 1 });
    } else {
        let { callCount, resetMonth } = usageSnap.data();
        const currentMonth = new Date().getMonth() + 1; // Get current month (1-12)

        // 2. Automatically reset the counter on the first call of a new month
        if (resetMonth !== currentMonth) {
            await updateDoc(usageDocRef, {
                callCount: 1, // Reset to 1 for the current call
                resetMonth: currentMonth
            });
        } else {
            // 3. Check if we are under the usage limit for the current month
            if (callCount >= FREE_API_CALL_LIMIT_PER_MONTH) {
                console.warn("AI monthly limit reached.");
                throw new Error("LIMIT_REACHED");
            }
            // Increment the counter for the current call
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

        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }

        const data = await response.json();
        // Extract and return the text content, cleaning up any markdown formatting
        const textResponse = data.candidates[0].content.parts[0].text;
        return textResponse.replace(/```json|```/g, '').trim();

    } catch (error) {
        console.error("Error calling AI service:", error);
        // Important: If the API call fails, we should ideally decrement the counter.
        // For simplicity here, we accept that a failed API call still counts as one usage.
        throw error;
    }
};