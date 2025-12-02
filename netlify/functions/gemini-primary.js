// netlify/functions/gemini-primary.js

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

// --- THIS IS THE FIX ---
// Define headers that allow all origins (for development)
// and specify allowed methods.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS' // Allow POST and OPTIONS
};
// --- END OF FIX ---

export const handler = async (event) => {
  // --- THIS IS THE FIX ---
  // Handle the "preflight" OPTIONS request that browsers send
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers: CORS_HEADERS,
      body: ''
    };
  }
  // --- END OF FIX ---

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: CORS_HEADERS, // Add headers to errors
      body: 'Method Not Allowed' 
    };
  }

  // Use the correct variable name (no VITE_ prefix)
  const API_KEY = process.env.VITE_GEMINI_API_KEY; 
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not set!");
    return { 
      statusCode: 500, 
      headers: CORS_HEADERS, // Add headers to errors
      body: JSON.stringify({ message: "API key not configured on server." }) 
    };
  }

  try {
    const { prompt, jsonMode = false, maxOutputTokens = undefined } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { 
        statusCode: 400, 
        headers: CORS_HEADERS, // Add headers to errors
        body: JSON.stringify({ message: "Missing 'prompt' field." }) 
      };
    }

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

    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API call failed: ${response.status}`, errorText);
      return { 
        statusCode: response.status, 
        headers: CORS_HEADERS, // Add headers to errors
        body: JSON.stringify({ message: "Gemini API failed.", error: errorText }) 
      };
    }

    const data = await response.json();
    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textPart) {
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        return { 
          statusCode: 400, 
          headers: CORS_HEADERS, // Add headers to errors
          body: JSON.stringify({ message: "Response blocked for safety." }) 
        };
      }
      return { 
        statusCode: 500, 
        headers: CORS_HEADERS, // Add headers to errors
        body: JSON.stringify({ message: "Invalid response from Gemini." }) 
      };
    }

    // --- THIS IS THE FIX ---
    // Add the headers to your successful response
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        text: textPart 
      })
    };
    // --- END OF FIX ---

  } catch (error) {
    console.error("Netlify Function Error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS, // Add headers to errors
      body: JSON.stringify({ message: error.message || "Internal server error." })
    };
  }
};