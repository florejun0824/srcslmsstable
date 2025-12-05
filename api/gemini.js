import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // CORS Setup
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
    const { prompt, model: requestedModel } = body;

    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    // [FIX] Check for BOTH variable names
    // This supports your "VITE_GEMINI_API_KEY" setup
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Server Error: API Key is missing. Check Vercel Environment Variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the model requested by the frontend (or fallback to flash)
    const model = genAI.getGenerativeModel({ model: requestedModel || 'gemini-flash-latest' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text: text });

  } catch (error) {
    console.error("Vercel Gemini Error:", error);
    // Return the actual error message so you can see it in the console
    res.status(500).json({ error: error.message });
  }
}