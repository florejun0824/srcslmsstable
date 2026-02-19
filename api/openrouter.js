export const config = {
  runtime: 'edge',
};

// --- KEY MANAGEMENT: SEPARATE POOLS ---
const getApiKey = (tier) => {
  let keys = [];

  if (tier === 'backup') {
    // BACKUP POOL (Used by Chatbot & Fallbacks)
    if (process.env.OPENROUTER_API_KEY_2) keys.push(process.env.OPENROUTER_API_KEY_2);
    if (process.env.OPENROUTER_API_KEY_3) keys.push(process.env.OPENROUTER_API_KEY_3);
    if (process.env.OPENROUTER_API_KEY_4) keys.push(process.env.OPENROUTER_API_KEY_4);
    if (process.env.OPENROUTER_API_KEY_5) keys.push(process.env.OPENROUTER_API_KEY_5);
    
    // Safety: If no backups exist, fall back to Primary to prevent crashing
    if (keys.length === 0 && process.env.OPENROUTER_API_KEY) {
        keys.push(process.env.OPENROUTER_API_KEY);
    }
  } else {
    // PRIMARY POOL (Default)
    if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY);
  }

  // Filter empty keys and pick one randomly
  keys = keys.filter(k => k && k.length > 10);
  
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
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
    
    // Destructure inputs including TIER
    const { prompt, imageUrl, model: requestedModel, maxOutputTokens, tier } = body; 

    // 3. Validate Inputs
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: "Missing or invalid 'prompt'" }), { status: 400, headers: corsHeaders });
    }

    // SELECT KEY BASED ON TIER
    const apiKey = getApiKey(tier); 
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `Server Error: No OpenRouter Keys found for tier: ${tier || 'primary'}` }), { status: 500, headers: corsHeaders });
    }

    // 4. Construct Messages & Select Model
    let selectedModel = requestedModel || "openai/gpt-oss-120b:free"; 
    let messages = [];

    if (imageUrl) {
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
        max_tokens: maxOutputTokens || 8192,
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