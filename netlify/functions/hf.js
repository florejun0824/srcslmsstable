// netlify/functions/hf.js
// This function is now for TEXT-ONLY models

import { InferenceClient } from "@huggingface/inference";

// 1. Use the new, text-only model from your aiService.jsx
const HF_MODEL_NAME = 'Qwen/Qwen3-4B-Instruct-2507';

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
    // 2. Read only the 'prompt' from the body.
    // The 'imageUrl' logic has been removed.
    const { prompt, maxOutputTokens = 2048 } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing 'prompt' field." }) };
    }

    // 3. Call the chat completion API with a simple text prompt
    const chatCompletion = await client.chatCompletion({
      model: HF_MODEL_NAME,
      messages: [
        { role: "user", content: prompt }, // <-- Simplified text-only message
      ],
      max_new_tokens: maxOutputTokens
    });

    const generatedText = chatCompletion.choices?.[0]?.message?.content;

    // 4. Return the clean text in the format aiService.jsx expects
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