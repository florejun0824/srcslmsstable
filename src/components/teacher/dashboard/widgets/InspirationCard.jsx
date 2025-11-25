// src/components/teacher/dashboard/widgets/InspirationCard.jsx
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

    // --- MD3 Tonal Color Styles ---
    const colorStyles = {
        blue: { 
            bg: 'bg-blue-100 dark:bg-blue-900/30', 
            text: 'text-blue-600 dark:text-blue-400' 
        },
        green: { 
            bg: 'bg-green-100 dark:bg-green-900/30', 
            text: 'text-green-600 dark:text-green-400' 
        },
        purple: { 
            bg: 'bg-purple-100 dark:bg-purple-900/30', 
            text: 'text-purple-600 dark:text-purple-400' 
        },
        red: { 
            bg: 'bg-red-100 dark:bg-red-900/30', 
            text: 'text-red-600 dark:text-red-400' 
        },
        indigo: { 
            bg: 'bg-indigo-100 dark:bg-indigo-900/30', 
            text: 'text-indigo-600 dark:text-indigo-400' 
        },
        pink: { 
            bg: 'bg-pink-100 dark:bg-pink-900/30', 
            text: 'text-pink-600 dark:text-pink-400' 
        },
        gray: { 
            bg: 'bg-slate-100 dark:bg-slate-700/50', 
            text: 'text-slate-600 dark:text-slate-400' 
        },
    };
    
    const currentColors = colorStyles[quote.color] || colorStyles.gray;

    return (
        <div className={`p-6 h-full flex flex-col justify-center ${className}`}>
            <div className="flex items-start gap-4">
                {/* --- Icon Container (Tonal Surface) --- */}
                <div className={`p-3.5 rounded-2xl shrink-0 ${currentColors.bg} transition-colors duration-300`}>
                    <LightBulbIcon className={`w-6 h-6 ${currentColors.text}`} strokeWidth={2} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-base leading-none mb-2">
                        Daily Inspiration
                    </p>
                    <blockquote className="relative">
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic">
                            "{quote.text}"
                        </p>
                        <footer className="mt-2 flex items-center gap-2">
                            <div className={`h-px w-4 ${currentColors.bg.replace('bg-', 'bg-').replace('/30', '')} opacity-50`}></div>
                            <cite className="not-italic text-xs font-bold text-slate-500 dark:text-slate-400">
                                {quote.author}
                            </cite>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>
    );
};

export default InspirationCard;