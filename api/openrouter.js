export const config = {
  runtime: 'edge',
};

// 1. POOL OF OPENROUTER KEYS (Updated for Fallbacks 2-5)
const getApiKeyPool = () => {
  const keys = new Set();
  
  // Primary Key
  if (process.env.OPENROUTER_API_KEY) keys.add(process.env.OPENROUTER_API_KEY);
  
  // Fallback Keys
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

  // 1. Handle Preflight / OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 2. Validate Method
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
    
    // Destructure inputs
    const { prompt, imageUrl, model: requestedModel, maxOutputTokens } = body; 

    // 3. Validate Inputs
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid 'prompt'" }), { status: 400, headers: corsHeaders });
    }

    const apiKey = getRandomKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Server Error: No OpenRouter API Keys configured." }), { status: 500, headers: corsHeaders });
    }

    // 4. Construct Messages & Select Model
    // Note: If you want "MiMo Flash" behavior, ensure the requestedModel passed from frontend 
    // is "google/gemini-2.0-flash-001" or similar.
    // Defaulting to DeepSeek R1 Chimera if no model provided.
    let selectedModel = requestedModel || "tngtech/deepseek-r1t2-chimera:free"; 
    let messages = [];

    if (imageUrl) {
      // DeepSeek R1 usually doesn't support Vision. Fallback to Gemini 2.0 Flash for images.
      console.log("Image detected: Switching to Gemini 2.0 Flash for Vision");
      selectedModel = "google/gemini-2.0-flash-exp:free";
      
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ];
    } else {
      // Standard Text Path
      messages = [
        {
          role: "system",
          content: "You are a helpful and highly intelligent educational assistant. Think step-by-step and use deep reasoning to ensure accuracy."
        },
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
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
        messages: messages,
        stream: true,
        // Pass the max tokens to ensure we get long lesson outputs (default to 8k if missing)
        max_tokens: maxOutputTokens || 8192,
        // Optional: Include reasoning for models that support it natively
        include_reasoning: true 
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ error: `OpenRouter Failed (${selectedModel}): ${errText}` }), { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // 6. TRANSFORM STREAM
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
            buffer = lines.pop(); 

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
                } catch (e) {}
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