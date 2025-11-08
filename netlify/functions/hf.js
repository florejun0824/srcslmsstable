// netlify/functions/call-hf-api.js
const fetch = require('node-fetch');

// The model URL is hardcoded here to prevent users from calling arbitrary APIs
const HF_MODEL_URL = 'https://api-inference.huggingface.co/models/moonshotai/Kimi-K2-Thinking';

// This is the main handler function Netlify will call
exports.handler = async (event) => {
    // 1. Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // 2. Safely get the API Key from Netlify environment variables
    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) {
        console.error("HF_API_KEY is not set in Netlify environment variables!");
        return { statusCode: 500, body: 'API Key not configured.' };
    }

    try {
        // 3. Parse the data sent from your frontend
        const body = JSON.parse(event.body);
        const prompt = body.prompt;
        const maxOutputTokens = body.maxOutputTokens || 2048;

        // 4. Perform the secure server-to-server request to Hugging Face
        const response = await fetch(HF_MODEL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}` 
            },
            body: JSON.stringify({ 
                inputs: prompt,
                parameters: { max_new_tokens: maxOutputTokens }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('HF Function Failed:', data);
            return {
                statusCode: response.status,
                body: JSON.stringify({ message: 'External API Error', details: data })
            };
        }

        // 5. Return the result to your frontend (Netlify automatically adds CORS headers)
        return {
            statusCode: 200,
            body: JSON.stringify({
                text: data?.[0]?.generated_text || "Error: No text generated"
            }),
        };

    } catch (error) {
        console.error("Netlify Function execution error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Serverless function failed.", error: error.message })
        };
    }
};