// netlify/functions/hf.js
// Final corrected version

// 1. FIX: Use the correct router server AND the correct API path
const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

// --- MODIFICATION: Swapped to a model optimized for educational content ---
// 'google/gemma-2-9b-it' is strong for tutoring and factual accuracy.
// Added ':fastest' to prioritize speed.
const HF_MODEL_NAME = 'google/gemma-2-9b-it:fastest';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const HF_API_KEY = process.env.HF_API_KEY;
  if (!HF_API_KEY) {
    console.error("HF_API_KEY is not set in Netlify environment variables!");
    return { statusCode: 500, body: 'API Key not configured.' };
  }

  try {
    const { prompt, maxOutputTokens = 2048 } = JSON.parse(event.body || '{}');

    if (!prompt || typeof prompt !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid or missing 'prompt' field in request body." })
      };
    }

    // This fetch call is now correct
    const response = await fetch(HF_API_URL, { // <-- Use correct URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`
      },
      // 2. Use the Chat Completion (OpenAI-compatible) payload
      body: JSON.stringify({
        model: HF_MODEL_NAME, // <-- Specify model here
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: maxOutputTokens
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Hugging Face API error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: 'External API Error', details: data })
      };
    }

    // 3. Parse the Chat Completion response format
    const generatedText = data?.choices?.[0]?.message?.content;

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: generatedText || "Error: No text generated"
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