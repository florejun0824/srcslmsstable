import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. CONFIG: Unlock 60-second timeout
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // 2. CORS: Allow your frontend to connect
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // 3. Extract the exact model you sent from frontend
    const { prompt, model: requestedModel } = body;

    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 4. Use the model requested by the frontend (or fallback to flash only if undefined)
    const model = genAI.getGenerativeModel({ model: requestedModel || 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text: text });

  } catch (error) {
    console.error("Vercel Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
}