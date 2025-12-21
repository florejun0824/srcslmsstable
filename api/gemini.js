import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. ENABLE EDGE RUNTIME (Critical for streaming)
export const config = {
  runtime: 'edge', 
};

const getApiKeyPool = () => {
  const keys = new Set();
  if (process.env.GEMINI_API_KEY) keys.add(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_FALLBACK_API_KEY) keys.add(process.env.GEMINI_FALLBACK_API_KEY);
  if (process.env.GEMINI_FALLBACK_API_KEY_2) keys.add(process.env.GEMINI_FALLBACK_API_KEY_2);
  if (process.env.GEMINI_FALLBACK_API_KEY_3) keys.add(process.env.GEMINI_FALLBACK_API_KEY_3);
  if (process.env.GEMINI_FALLBACK_API_KEY_4) keys.add(process.env.GEMINI_FALLBACK_API_KEY_4);
  if (process.env.GEMINI_FALLBACK_API_KEY_5) keys.add(process.env.GEMINI_FALLBACK_API_KEY_5);
  if (process.env.VITE_GEMINI_API_KEY) keys.add(process.env.VITE_GEMINI_API_KEY);
  return Array.from(keys).filter(k => k && k.length > 10);
};

const API_KEYS = getApiKeyPool();

const getRandomKey = () => {
  if (API_KEYS.length === 0) return null;
  return API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    if (!bodyText) return new Response(JSON.stringify({ error: "Empty body" }), { status: 400, headers: corsHeaders });
    
    const body = JSON.parse(bodyText);
    const { prompt, model: requestedModel } = body;

    if (!prompt) {
        return new Response(JSON.stringify({ error: "No prompt provided" }), { status: 400, headers: corsHeaders });
    }

    const apiKey = getRandomKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Error: No valid API Keys found." }), { status: 500, headers: corsHeaders });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: requestedModel || 'gemma-3-27b-it' });

    // --- STREAMING LOGIC START ---
    // Instead of waiting for full response, we stream it chunk by chunk.
    const result = await model.generateContentStream(prompt);
    
    // Create a ReadableStream to pipe the data to the client immediately
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) {
                        controller.enqueue(encoder.encode(chunkText));
                    }
                }
            } catch (err) {
                console.error("Stream Error:", err);
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, { 
        status: 200, 
        headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/plain; charset=utf-8' // Return raw text, not JSON
        } 
    });
    // --- STREAMING LOGIC END ---

  } catch (error) {
    console.error("Vercel Gemini Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}