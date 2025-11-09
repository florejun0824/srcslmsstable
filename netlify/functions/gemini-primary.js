// netlify/functions/gemini-primary.js

// This is the Google API URL
const GEMINI_API_URL = 'https://generativelightlanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Securely get the API key from Netlify environment variables
  // IMPORTANT: This file uses your *primary* key.
  const API_KEY = process.env.VITE_GEMINI_API_KEY;
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not set!");
    return { statusCode: 500, body: JSON.stringify({ message: "API key not configured on server." }) };
  }

  try {
    // 2. Parse the prompt from the client
    const { prompt, jsonMode = false, maxOutputTokens = undefined } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing 'prompt' field." }) };
    }

    // 3. Build the Gemini request body (same as your old aiService.jsx)
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const generationConfig = {};
    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }
    if (maxOutputTokens) {
      generationConfig.maxOutputTokens = maxOutputTokens;
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    // 4. Call the Google API from the server
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // 5. Handle errors (like 429) and send them back to the client
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API call failed: ${response.status}`, errorText);
      // Pass the status and error back to aiService.jsx
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ message: "Gemini API failed.", error: errorText }) 
      };
    }

    // 6. Extract the text and return it in the format aiService.jsx expects
    const data = await response.json();
    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textPart) {
      // Handle safety blocks or other response issues
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        return { statusCode: 400, body: JSON.stringify({ message: "Response blocked for safety." }) };
      }
      return { statusCode: 500, body: JSON.stringify({ message: "Invalid response from Gemini." }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        // This is the response our client-side code will parse
        text: textPart 
      })
    };

  } catch (error) {
    console.error("Netlify Function execution error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Serverless function failed.", error: error.message })
    };
  }
};