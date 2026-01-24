export const config = {
  runtime: 'edge',
};

// 1. POOL OF OPENROUTER KEYS
// Good practice for redundancy. Ensure these are set in Vercel/Netlify env vars.
const getApiKeyPool = () => {
  const keys = new Set();
  if (process.env.OPENROUTER_API_KEY) keys.add(process.env.OPENROUTER_API_KEY);
  
  // --- TEMPORARILY DISABLED (Uncomment when topped up) ---
  // if (process.env.OPENROUTER_API_KEY_2) keys.add(process.env.OPENROUTER_API_KEY_2);
  // if (process.env.OPENROUTER_API_KEY_3) keys.add(process.env.OPENROUTER_API_KEY_3);
  // -------------------------------------------------------

  // Add more as needed
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
    // Security Note: Updated to include protocol for strict CORS compliance
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  };

  // 1. Handle Preflight / OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 2. Validate Method (Reject GET or others)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const bodyText = await req.text();
    if (!bodyText) return new Response(JSON.stringify({ error: "Empty body" }), { status: 400, headers: corsHeaders });
    
    const body = JSON.parse(bodyText);
    const { prompt, imageUrl } = body; 

    // 3. Validate Inputs
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid 'prompt'" }), { status: 400, headers: corsHeaders });
    }

    const apiKey = getRandomKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Error: No OpenRouter API Keys configured." }), { status: 500, headers: corsHeaders });
    }

    // 4. Construct Messages & Select Model (Hybrid Logic)
    let selectedModel = "nousresearch/hermes-3-llama-3.1-405b"; // Default: Best Logic
    let messagesContent;

    if (imageUrl) {
      // CRITICAL FIX: Switch to Gemini for Vision support if image exists
      console.log("Image detected: Switching to Gemini 2.0 Flash");
      selectedModel = "google/gemini-2.0-flash-exp:free";
      
      messagesContent = [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
    } else {
      // Standard Text-only: DeepSeek R1
      // Note: Using array format is generally safer for OpenRouter compatibility across models
      messagesContent = [
        { type: "text", text: prompt }
      ];
    }

    // 5. CALL OPENROUTER
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://srcslms.vercel.app", 
        "X-Title": "LMS Teacher Assistant",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: messagesContent }],
        stream: true, 
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `OpenRouter Failed (${selectedModel}): ${errText}` }), { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 6. TRANSFORM STREAM (OpenAI SSE -> Raw Text)
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