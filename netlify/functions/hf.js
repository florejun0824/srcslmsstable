// netlify/functions/hf.js
import { InferenceClient } from "@huggingface/inference";

// 1. Define an "allow-list" of models this function can call
const ALLOWED_MODELS = {
  'Qwen/Qwen3-4B-Instruct-2507': true,
  // 'meta-llama/Llama-3.1-8B-Instruct': true,
  // 'google/gemma-2-9b-it': true,
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// --- FIX: Use 'export const handler' instead of 'exports.handler' ---
export const handler = async (event) => {
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers: CORS_HEADERS, 
      body: 'Method Not Allowed' 
    };
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.error("HF_TOKEN is not set in Netlify environment variables!");
    return { 
      statusCode: 500, 
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'API Key not configured.' }) 
    };
  }

  const client = new InferenceClient(HF_TOKEN);

  try {
    const { prompt, model, maxOutputTokens = 2048 } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { 
        statusCode: 400, 
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Missing 'prompt' field." }) 
      };
    }

    if (!model || !ALLOWED_MODELS[model]) {
      console.warn(`Attempt to call disallowed or missing model: ${model}`);
      return { 
        statusCode: 400, 
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: `Invalid or missing 'model' field.` }) 
      };
    }

    const chatCompletion = await client.chatCompletion({
      model: model,
      messages: [
        { role: "user", content: prompt },
      ],
      max_new_tokens: maxOutputTokens
    });

    const generatedText = chatCompletion.choices?.[0]?.message?.content;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        text: generatedText || "Error: No text generated"
      })
    };

  } catch (error) {
    console.error("Netlify Function execution error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: error.message || "Internal server error." })
    };
  }
};