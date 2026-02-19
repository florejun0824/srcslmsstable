import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. ENABLE EDGE RUNTIME
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
    
    // Extract jsonMode so we can enforce JSON output for essay grading
    const { prompt, model: requestedModel, jsonMode } = body;

    if (!prompt) {
        return new Response(JSON.stringify({ error: "No prompt provided" }), { status: 400, headers: corsHeaders });
    }

    const apiKey = getRandomKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Error: No valid API Keys found." }), { status: 500, headers: corsHeaders });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Set up configuration. If jsonMode is true, strictly return JSON.
    const generationConfig = {};
    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    // Default to Gemini 3 Pro
    const model = genAI.getGenerativeModel({ 
      model: requestedModel || 'gemini-3-pro-preview',
      generationConfig 
    });

    const result = await model.generateContentStream(prompt);
    
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
            'Content-Type': 'text/plain; charset=utf-8'
        } 
    });

  } catch (error) {
    console.error("Vercel Gemini Error:", error);
    
    // CRITICAL: Identify rate limit (429) errors so the frontend load balancer knows to switch to OpenRouter
    const isRateLimit = error.status === 429 || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('429');
    const statusCode = isRateLimit ? 429 : (error.status || 500);

    return new Response(JSON.stringify({ error: error.message }), { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}