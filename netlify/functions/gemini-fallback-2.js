// netlify/functions/gemini-fallback-2.js

// The URL is now a base URL, without the model name
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const DEFAULT_MODEL = 'gemini-2.5-flash'; // Fallback if no model is provided

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // --- THIS IS THE ONLY CHANGE ---
  // It now uses your *second* fallback key
  const API_KEY = process.env.VITE_GEMINI_FALLBACK_API_KEY_2;
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_FALLBACK_2_API_KEY is not set!");
    return { statusCode: 500, body: JSON.stringify({ message: "Fallback 2 API key not configured on server." }) };
  }

  try {
    // We now read 'model' from the request body
    const { prompt, jsonMode = false, maxOutputTokens = undefined, model } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing 'prompt' field." }) };
    }

    // Use the provided model, or the default if it's missing
    const modelToUse = model || DEFAULT_MODEL;
    // Construct the full URL dynamically
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

    // Use the new dynamic URL
    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Add the model name to the error log for better debugging
      console.error(`Gemini (Fallback 2) API call failed for model ${modelToUse}: ${response.status}`, errorText);
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