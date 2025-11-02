import React, { useState, useEffect } from 'react';
import { LightBulbIcon } from '@heroicons/react/24/outline';

const InspirationCard = ({ className }) => {
    const [quote, setQuote] = useState({ text: 'Loading...', author: '', color: 'gray' });

    useEffect(() => {
        const quotes = [
            { text: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren", color: "blue" },
            { text: "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.", author: "Brad Henry", color: "green" },
            { text: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein", color: "purple" },
            { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", color: "red" },
            { text: "The best teachers are those who show you where to look but don't tell you what to see.", author: "A. K. Trenfor", color: "indigo" },
            { text: "Teaching is the greatest act of optimism.", author: "Colleen Wilcox", color: "pink" },
        ];
        const now = new Date();
        const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
        const mulberry32 = a => () => { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
        const random = mulberry32(seed);
        const dailyQuote = quotes[Math.floor(random() * quotes.length)];
        setQuote(dailyQuote);
    }, []);

    // --- MODIFIED: Added dark mode text colors to all styles ---
    const colorStyles = {
        blue: { text: 'text-blue-500 dark:text-blue-400' },
        green: { text: 'text-green-500 dark:text-green-400' },
        purple: { text: 'text-purple-500 dark:text-purple-400' },
        red: { text: 'text-red-500 dark:text-red-400' },
        indigo: { text: 'text-indigo-500 dark:text-indigo-400' },
        pink: { text: 'text-pink-500 dark:text-pink-400' },
        gray: { text: 'text-gray-500 dark:text-gray-400' },
    };
    const currentColors = colorStyles[quote.color] || colorStyles.gray;

    return (
        <div className={`p-6 h-full flex flex-col justify-center ${className}`}>
            <div className="flex items-start gap-4">
                {/* --- MODIFIED: Added dark mode classes for icon container --- */}
                <div className="p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                    <LightBulbIcon className={`w-7 h-7 ${currentColors.text}`} />
                </div>
                <div>
                    {/* --- MODIFIED: Added dark mode text colors --- */}
                    <p className="font-bold text-slate-800 dark:text-slate-100">Inspiration for the Day</p>
                    <blockquote className="mt-1">
                        <p className="text-slate-600 dark:text-slate-300 text-sm">"{quote.text}"</p>
                        <cite className="block text-right not-italic text-xs text-slate-500 dark:text-slate-400 mt-2">- {quote.author}</cite>
                    </blockquote>
                </div>
            </div>
        </div>
    );
};

export default InspirationCard;