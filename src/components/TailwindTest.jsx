// src/components/TailwindTest.jsx
import React from "react";

export default function TailwindTest() {
  return (
    <div className="p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg text-center text-white space-y-4">
      <h1 className="text-3xl font-bold animate-bounce">🚀 Tailwind is Working!</h1>
      <p className="text-lg">
        If you see this colorful box with rounded corners, shadows, and a bouncing title,
        your Tailwind setup is correct 🎉
      </p>
      <button className="px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg shadow hover:bg-indigo-50 transition">
        Test Button
      </button>
    </div>
  );
}
