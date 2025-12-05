import { GoogleGenerativeAI } from '@google/generative-ai';

// Enable Edge Runtime
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. Handle CORS manually
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
    
    // Support both env variable naming conventions
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API Key" }), { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Using 'gemini-1.5-flash' for speed and lower cost
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // 2. Generate the stream from Google
    const result = await model.generateContentStream(prompt);

    // 3. Create a standard Web ReadableStream (Native Edge support)
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

    // 4. Return the stream response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error("Stream Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        }
    });
  }
}