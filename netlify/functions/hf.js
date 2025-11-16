// netlify/functions/hf.js
// This function now handles MULTIPLE text-only models

import { InferenceClient } from "@huggingface/inference";

// 1. Define an "allow-list" of models this function can call
// --- MODIFIED ---
const ALLOWED_MODELS = {
  'Qwen/Qwen3-4B-Instruct-2507': true,
  // 'meta-llama/Llama-3.1-8B-Instruct': true,    // <-- REMOVED
  // 'google/gemma-2-9b-it': true,              // <-- REMOVED
};
// ----------------

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

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.error("HF_TOKEN is not set in Netlify environment variables!");
    return { 
      statusCode: 500, 
      headers: CORS_HEADERS, // Add headers
      body: JSON.stringify({ message: 'API Key not configured.' }) 
    };
  }

  const client = new InferenceClient(HF_TOKEN);

  try {
    // 2. Read 'prompt', 'model', and 'maxOutputTokens' from the body
    const { prompt, model, maxOutputTokens = 2048 } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { 
        statusCode: 400, 
        headers: CORS_HEADERS, // Add headers
        body: JSON.stringify({ message: "Missing 'prompt' field." }) 
      };
    }

    // 3. Validate the requested model against the allow-list
    if (!model || !ALLOWED_MODELS[model]) {
      console.warn(`Attempt to call disallowed or missing model: ${model}`);
      return { 
        statusCode: 400, 
        headers: CORS_HEADERS, // Add headers
        body: JSON.stringify({ message: `Invalid or missing 'model' field.` }) 
      };
    }

    // 4. Call the chat completion API with the DYNAMIC model
    const chatCompletion = await client.chatCompletion({
      model: model, // <-- Use the validated model from the request
      messages: [
        { role: "user", content: prompt },
      ],
      max_new_tokens: maxOutputTokens
    });

    const generatedText = chatCompletion.choices?.[0]?.message?.content;

    // 5. Return the clean text
    // --- THIS IS THE CORS FIX ---
    return {
      statusCode: 200,
      headers: CORS_HEADERS, // Add headers
      body: JSON.stringify({
        text: generatedText || "Error: No text generated"
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