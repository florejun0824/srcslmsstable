// netlify/functions/hf.js
// This is the correct, final version.

// 1. Use the Chat Completion API endpoint specified by the 410 error
const HF_API_URL = 'https://router.huggingface.co/hf-inference/v1/chat/completions';

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

    // This fetch call uses the correct URL
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`
      },
      // 2. This uses the correct Chat Completion payload
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

    // 3. This parses the correct Chat Completion response
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