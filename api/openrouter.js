export const config = {
  runtime: 'edge',
};

// 1. POOL OF OPENROUTER KEYS
// Make sure to add these to your Vercel/Netlify Environment Variables
const getApiKeyPool = () => {
  const keys = new Set();
  if (process.env.OPENROUTER_API_KEY) keys.add(process.env.OPENROUTER_API_KEY);
  if (process.env.OPENROUTER_API_KEY_2) keys.add(process.env.OPENROUTER_API_KEY_2);
  if (process.env.OPENROUTER_API_KEY_3) keys.add(process.env.OPENROUTER_API_KEY_3);
  if (process.env.OPENROUTER_API_KEY_4) keys.add(process.env.OPENROUTER_API_KEY_4);
  if (process.env.OPENROUTER_API_KEY_5) keys.add(process.env.OPENROUTER_API_KEY_5);
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
    const { prompt } = body;

    const apiKey = getRandomKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Error: No OpenRouter API Keys configured." }), { status: 500, headers: corsHeaders });
    }

    // 2. CALL OPENROUTER (OpenAI Compatible)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-lms-app.com", // Optional: Change to your actual site
        "X-Title": "LMS Teacher Assistant",
      },
      body: JSON.stringify({
        model: "xiaomi/mimo-v2-flash:free", // TARGET MODEL
        messages: [{ role: "user", content: prompt }],
        stream: true, 
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        // Return 429/500 so the frontend knows to failover to Gemini
        return new Response(JSON.stringify({ error: `OpenRouter Failed: ${errText}` }), { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 3. TRANSFORM STREAM (OpenAI SSE -> Raw Text)
    // We parse the "data: {...}" chunks and return just the text to match gemini.js output
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.replace('data: ', '').trim();
                if (dataStr === '[DONE]') continue;
                
                try {
                  const data = JSON.parse(dataStr);
                  const content = data.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch (e) {
                  // Ignore JSON parse errors on partial chunks
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
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