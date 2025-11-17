// netlify/functions/gemini-fallback.js

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_MODEL = 'gemini-flash-latest';

// --- THIS IS THE CORS FIX ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// --- END OF FIX ---

exports.handler = async (event) => {
  // --- THIS IS THE CORS FIX ---
  // Handle the "preflight" OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  // --- END OF FIX ---

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: CORS_HEADERS, // Add headers
      body: 'Method Not Allowed' 
    };
  }

  // --- YOUR VARIABLE NAME IS USED HERE ---
  const API_KEY = process.env.VITE_GEMINI_FALLBACK_API_KEY;
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_FALLBACK_API_KEY is not set!");
    return { 
      statusCode: 500, 
      headers: CORS_HEADERS, // Add headers
      body: JSON.stringify({ message: "Fallback API key not configured on server." }) 
    };
  }
  // --- END OF YOUR VARIABLE NAME ---

  try {
    const { prompt, jsonMode = false, maxOutputTokens = undefined, model } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { 
        statusCode: 400, 
        headers: CORS_HEADERS, // Add headers
        body: JSON.stringify({ message: "Missing 'prompt' field." }) 
      };
    }

    const modelToUse = model || DEFAULT_MODEL;
    const fullApiUrl = `${GEMINI_API_BASE_URL}${modelToUse}:generateContent?key=${API_KEY}`;

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

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini (Fallback) API call failed for model ${modelToUse}: ${response.status}`, errorText);
      return { 
        statusCode: response.status, 
        headers: CORS_HEADERS, // Add headers
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
          headers: CORS_HEADERS, // Add headers
          body: JSON.stringify({ message: "Response blocked for safety." }) 
        };
      }
      return { 
        statusCode: 500, 
        headers: CORS_HEADERS, // Add headers
        body: JSON.stringify({ message: "Invalid response from Gemini." }) 
      };
    }

    // --- THIS IS THE CORS FIX ---
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
    console.error("Netlify Function execution error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS, // Add headers
      body: JSON.stringify({ message: error.message || "Internal server error." })
    };
  }
};