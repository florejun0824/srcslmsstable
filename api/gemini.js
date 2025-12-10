import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  maxDuration: 60,
};

// --- KEY POOL BUILDER (Matches your specific variables) ---
const getApiKeyPool = () => {
  const keys = new Set();

  // 1. Primary Key
  if (process.env.GEMINI_API_KEY) {
    keys.add(process.env.GEMINI_API_KEY);
  }

  // 2. Fallback 1
  if (process.env.GEMINI_FALLBACK_API_KEY) {
    keys.add(process.env.GEMINI_FALLBACK_API_KEY);
  }

  // 3. Fallback 2
  if (process.env.GEMINI_FALLBACK_API_KEY_2) {
    keys.add(process.env.GEMINI_FALLBACK_API_KEY_2);
  }

  // 4. Legacy/Frontend check (Just in case)
  if (process.env.VITE_GEMINI_API_KEY) {
    keys.add(process.env.VITE_GEMINI_API_KEY);
  }

  // Filter out empty strings and return array
  return Array.from(keys).filter(k => k && k.length > 10);
};

// Generate the pool once
const API_KEYS = getApiKeyPool();

const getRandomKey = () => {
  if (API_KEYS.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * API_KEYS.length);
  return API_KEYS[randomIndex];
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

    // [FIX] Select a Random Key from your pool
    const apiKey = getRandomKey();

    if (!apiKey) {
      throw new Error("Server Error: No valid API Keys found in environment variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the model requested by the frontend (or fallback to flash)
    const model = genAI.getGenerativeModel({ model: requestedModel || 'gemma-3-27b-it' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ text: text });

  } catch (error) {
    console.error("Vercel Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
}