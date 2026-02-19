import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge', 
};

// 1. DYNAMIC API KEY POOLING
const getApiKeyPool = () => {
  const keys = new Set();
  const envKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_FALLBACK_API_KEY,
    process.env.GEMINI_FALLBACK_API_KEY_2,
    process.env.GEMINI_FALLBACK_API_KEY_3,
    process.env.GEMINI_FALLBACK_API_KEY_4,
    process.env.GEMINI_FALLBACK_API_KEY_5
  ];
  envKeys.forEach(k => { if (k && k.length > 10) keys.add(k); });
  return Array.from(keys);
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { prompt, model: requestedModel } = await req.json();
    const API_KEYS = getApiKeyPool();
    const apiKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

    if (!apiKey) throw new Error("No valid API Keys found.");

    // 2. SMART MODEL SELECTION
    // If no model is specified, default to Gemini 3 Pro (1,500 RPD) to save Flash quota.
    // Use 'gemini-3-flash' only when explicitly requested for complex coding.
    const activeModel = requestedModel || 'gemini-3-pro';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: activeModel });

    // 3. OPTIMIZED STREAMING
    const result = await model.generateContentStream(prompt);
    
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    if (chunkText) controller.enqueue(encoder.encode(chunkText));
                }
            } catch (err) {
                controller.error(err);
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}