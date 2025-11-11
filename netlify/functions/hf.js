// netlify/functions/hf.js
// This function now handles MULTIPLE text-only models

import { InferenceClient } from "@huggingface/inference";

// 1. Define an "allow-list" of models this function can call
// --- MODIFIED ---
// Replaced the old models with the new, faster ones from aiService.jsx
const ALLOWED_MODELS = {
  'microsoft/Phi-3-mini': true,
  'mistralai/Mistral-7B-Instruct-v0.3': true
};
// ----------------

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.error("HF_TOKEN is not set in Netlify environment variables!");
    return { statusCode: 500, body: 'API Key not configured.' };
  }

  const client = new InferenceClient(HF_TOKEN);

  try {
    // 2. Read 'model', 'inputs' (for textgen) and 'prompt' (for chat)
    // aiService.jsx sends 'inputs', so we'll look for that.
    const body = JSON.parse(event.body || '{}');
    const { model, maxOutputTokens = 2048 } = body;
    
    // Handle both 'prompt' (from older code) and 'inputs' (from aiService)
    const prompt = body.prompt || body.inputs;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing 'prompt' or 'inputs' field." }) };
    }

    // 3. Validate the requested model against the allow-list
    if (!model || !ALLOWED_MODELS[model]) {
      console.warn(`Attempt to call disallowed or missing model: ${model}`);
      return { statusCode: 400, body: JSON.stringify({ message: `Invalid or missing 'model' field. Received: ${model}` }) };
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

    // 5. --- BUG FIX ---
    // Return the response in the format aiService.jsx expects
    // aiService.jsx expects: { response: [{ generated_text: "..." }] }
    // This function was sending: { text: "..." }
    return {
      statusCode: 200,
      body: JSON.stringify({
        response: [
          { generated_text: generatedText || "Error: No text generated" }
        ]
      })
    };
    // -----------------

  } catch (error) {
    console.error("Netlify Function execution error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message || "An internal server error occurred." })
    };
  }
};