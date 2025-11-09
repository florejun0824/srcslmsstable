// netlify/functions/gemini-fallback.js

// --- THIS IS THE FIX ---
// The URL has been corrected from "generativelightlanguage" to "generativelanguage"
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.VITE_GEMINI_FALLBACK_API_KEY;
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_FALLBACK_API_KEY is not set!");
    return { statusCode: 500, body: JSON.stringify({ message: "Fallback API key not configured on server." }) };
  }

  try {
    const { prompt, jsonMode = false, maxOutputTokens = undefined } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing 'prompt' field." }) };
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
      console.error(`Gemini (Fallback) API call failed: ${response.status}`, errorText);
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ message: "Gemini API failed.", error: errorText }) 
      };
    }

    const data = await response.json();
    const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textPart) {
      const finishReason = data.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        return { statusCode: 400, body: JSON.stringify({ message: "Response blocked for safety." }) };
      }
      return { statusCode: 500, body: JSON.stringify({ message: "Invalid response from Gemini." }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
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