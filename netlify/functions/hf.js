// netlify/functions/hf-multimodal.js
// Multimodal Netlify function using the @huggingface/inference SDK

import { InferenceClient } from "@huggingface/inference";

// This is the model name you want to use
const HF_MODEL_NAME = 'meta-llama/Llama-4-Scout-17B-16E-Instruct'; // The multimodal model

// To run this code, you must:
// 1. Install the package: npm install @huggingface/inference
// 2. Configure Netlify to bundle this file (e.g., in netlify.toml)
// 3. Set the Netlify environment variable **HF_TOKEN** to your Hugging Face API token.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.error("HF_TOKEN is not set in Netlify environment variables!");
    return { statusCode: 500, body: 'API Key not configured.' };
  }

  // Initialize the client with the token
  const client = new InferenceClient(HF_TOKEN);

  try {
    // Expecting prompt (string) and an optional imageUrl (string) from the client
    const { prompt, imageUrl, maxOutputTokens = 2048 } = JSON.parse(event.body || '{}');

    if (!prompt || typeof prompt !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid or missing 'prompt' field in request body." })
      };
    }

    // Construct the multimodal message array
    const messageContent = [
        {
            type: "text",
            text: prompt,
        }
    ];

    if (imageUrl) {
        // Add the image content block if an image URL is provided
        messageContent.push({
            type: "image_url",
            image_url: {
                // Note: The Hugging Face client documentation often suggests
                // using a Base64 data URI (data:image/jpeg;base64,...) for
                // image_url. If this external URL fails, you may need to
                // convert the image to Base64 first.
                url: imageUrl, 
            },
        });
    }

    // Call the chat completion API
    const chatCompletion = await client.chatCompletion({
      model: HF_MODEL_NAME, 
      messages: [
        { 
          role: "user", 
          content: messageContent, // <-- Multimodal content array
        },
      ],
      // The @huggingface/inference SDK uses max_new_tokens for the output length
      max_new_tokens: maxOutputTokens 
    });

    // Parse the Chat Completion response format
    const generatedText = chatCompletion.choices?.[0]?.message?.content;

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