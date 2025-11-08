// netlify/functions/hf.js
// Hugging Face Proxy Function for Netlify (updated Nov 2025)
// Uses Node 18+ native fetch

const HF_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/moonshotai/Kimi-K2-Thinking';

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

    const response = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: maxOutputTokens }
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: data?.[0]?.generated_text || "Error: No text generated"
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
