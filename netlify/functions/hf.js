// netlify/functions/hf.js
// Hugging Face Proxy Function for Netlify (updated Nov 2025)
// Uses Node 18+ native fetch

// 1. FIX: Use the standard Chat Completion API endpoint
const HF_API_URL = 'https://api-inference.huggingface.co/v1/chat/completions';

// This is the model name you want to use
const HF_MODEL_NAME = 'moonshotai/Kimi-K2-Thinking:novita';

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

    const response = await fetch(HF_API_URL, { // <-- Use correct URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`
      },
      // 2. FIX: Use the Chat Completion (OpenAI-compatible) payload
      body: JSON.stringify({
        model: HF_MODEL_NAME, // <-- Specify model here
        messages: [
          { role: "user", content: prompt }
        ],
        max_tokens: maxOutputTokens
        // Note: 'max_new_tokens' is 'max_tokens' in this API
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

    // 3. FIX: Parse the Chat Completion response format
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