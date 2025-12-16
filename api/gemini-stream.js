import { GoogleGenerativeAI } from '@google/generative-ai';

// Enable Edge Runtime
export const config = {
  runtime: 'edge',
};

// --- KEY POOL BUILDER ---
const getApiKeyPool = () => {
  const keys = new Set();

  // 1. Primary Key (Matches your "GEMINI_API_KEY")
  if (process.env.GEMINI_API_KEY) {
    keys.add(process.env.GEMINI_API_KEY);
  }

  // 2. Fallback 1 (Matches your "GEMINI_FALLBACK_API_KEY")
  if (process.env.GEMINI_FALLBACK_API_KEY) {
    keys.add(process.env.GEMINI_FALLBACK_API_KEY);
  }

  // 3. Fallback 2 (Matches your "GEMINI_FALLBACK_API_KEY_2")
  if (process.env.GEMINI_FALLBACK_API_KEY_2) {
    keys.add(process.env.GEMINI_FALLBACK_API_KEY_2);
  }

  // 4. Legacy/Frontend check (Just in case you use VITE_ prefix locally)
  if (process.env.VITE_GEMINI_API_KEY) {
    keys.add(process.env.VITE_GEMINI_API_KEY);
  }

  // Filter out empty strings and return array
  return Array.from(keys).filter(k => k && k.length > 10);
};

// Generate the pool once at startup
const API_KEYS = getApiKeyPool();

const getRandomKey = () => {
  if (API_KEYS.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * API_KEYS.length);
  return API_KEYS[randomIndex];
};

export default async function handler(req) {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { prompt } = await req.json();

    // 2. SELECT ROTATING KEY
    const apiKey = getRandomKey();

    if (!apiKey) {
      console.error("Stream Error: No valid API Keys found in environment.");
      return new Response(JSON.stringify({ error: "Server Configuration Error: Missing API Keys" }), { status: 500 });
    }

    // 3. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

    // 4. Generate Stream
    const result = await model.generateContentStream(prompt);

    // 5. Create ReadableStream
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
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error("Stream Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        }
    });
  }
}