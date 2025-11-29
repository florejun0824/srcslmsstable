// src/components/teacher/dashboard/widgets/InspirationCard.jsx
import React, { useState, useEffect } from 'react';
import { LightBulbIcon, SparklesIcon } from '@heroicons/react/24/solid';

const InspirationCard = ({ className }) => {
    const [quote, setQuote] = useState({ text: 'Loading...', author: '', color: 'blue' });

    useEffect(() => {
        const quotes = [
            // Original
            { text: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren", color: "cyan" },
            { text: "A good teacher can inspire hope, ignite the imagination, and instill a love of learning.", author: "Brad Henry", color: "emerald" },
            { text: "It is the supreme art of the teacher to awaken joy in creative expression and knowledge.", author: "Albert Einstein", color: "violet" },
            { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", color: "rose" },
            { text: "The best teachers are those who show you where to look but don't tell you what to see.", author: "A. K. Trenfor", color: "indigo" },
            { text: "Teaching is the greatest act of optimism.", author: "Colleen Wilcox", color: "pink" },
            
            // New Additions
            { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "William Butler Yeats", color: "orange" },
            { text: "Children must be taught how to think, not what to think.", author: "Margaret Mead", color: "fuchsia" },
            { text: "I am not a teacher, but an awakener.", author: "Robert Frost", color: "sky" },
            { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", color: "teal" },
            { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier", color: "lime" },
            { text: "Teachers plant seeds of knowledge that grow forever.", author: "Unknown", color: "green" },
            { text: "To teach is to learn twice.", author: "Joseph Joubert", color: "blue" },
            { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", color: "purple" },
            { text: "A mind when stretched by a new idea never regains its original dimensions.", author: "Oliver Wendell Holmes", color: "amber" },
            { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", color: "red" },
        ];

        // Seeded random for "Daily" quote consistency
        const now = new Date();
        const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
        const mulberry32 = a => () => { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
        const random = mulberry32(seed);
        
        const dailyQuote = quotes[Math.floor(random() * quotes.length)];
        setQuote(dailyQuote);
    }, []);

    // --- CANDY COLOR MAP ---
    const colorStyles = {
        cyan:    { gradient: 'from-cyan-400 to-blue-500', shadow: 'shadow-cyan-500/30', text: 'text-cyan-600' },
        emerald: { gradient: 'from-emerald-400 to-green-600', shadow: 'shadow-emerald-500/30', text: 'text-emerald-600' },
        violet:  { gradient: 'from-violet-400 to-purple-600', shadow: 'shadow-violet-500/30', text: 'text-violet-600' },
        rose:    { gradient: 'from-rose-400 to-red-600', shadow: 'shadow-rose-500/30', text: 'text-rose-600' },
        indigo:  { gradient: 'from-indigo-400 to-violet-600', shadow: 'shadow-indigo-500/30', text: 'text-indigo-600' },
        pink:    { gradient: 'from-pink-400 to-rose-500', shadow: 'shadow-pink-500/30', text: 'text-pink-600' },
        orange:  { gradient: 'from-orange-400 to-red-500', shadow: 'shadow-orange-500/30', text: 'text-orange-600' },
        fuchsia: { gradient: 'from-fuchsia-400 to-pink-600', shadow: 'shadow-fuchsia-500/30', text: 'text-fuchsia-600' },
        sky:     { gradient: 'from-sky-400 to-blue-500', shadow: 'shadow-sky-500/30', text: 'text-sky-600' },
        teal:    { gradient: 'from-teal-400 to-emerald-600', shadow: 'shadow-teal-500/30', text: 'text-teal-600' },
        lime:    { gradient: 'from-lime-400 to-green-500', shadow: 'shadow-lime-500/30', text: 'text-lime-600' },
        green:   { gradient: 'from-green-400 to-emerald-600', shadow: 'shadow-green-500/30', text: 'text-green-600' },
        blue:    { gradient: 'from-blue-400 to-indigo-600', shadow: 'shadow-blue-500/30', text: 'text-blue-600' },
        purple:  { gradient: 'from-purple-400 to-fuchsia-600', shadow: 'shadow-purple-500/30', text: 'text-purple-600' },
        amber:   { gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30', text: 'text-amber-600' },
        red:     { gradient: 'from-red-400 to-rose-600', shadow: 'shadow-red-500/30', text: 'text-red-600' },
    };
    
    // Fallback if color missing
    const current = colorStyles[quote.color] || colorStyles.blue;

    return (
        <div className={`relative p-6 h-full flex flex-col justify-center overflow-hidden ${className}`}>
            
            {/* --- Ambient Glow (Atmosphere) --- */}
            <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[60px] opacity-15 bg-gradient-to-br ${current.gradient}`} />

            <div className="relative z-10 flex items-start gap-5">
                {/* --- Candy Icon Container --- */}
                <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-br ${current.gradient} ${current.shadow} shadow-lg relative overflow-hidden group`}>
                    {/* Gloss Shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent opacity-80" />
                    <LightBulbIcon className="w-7 h-7 text-white drop-shadow-md relative z-10" />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className={`w-4 h-4 ${current.text} dark:text-white/80`} />
                        <p className="font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-widest">
                            Daily Inspiration
                        </p>
                    </div>
                    
                    <blockquote className="relative">
                        {/* Quote Mark Decoration */}
                        <span className={`absolute -left-2 -top-1 text-4xl font-serif leading-none opacity-20 ${current.text} dark:text-white`}>
                            &ldquo;
                        </span>
                        
                        <p className="text-slate-800 dark:text-slate-100 text-[15px] leading-relaxed font-medium italic pl-2">
                            {quote.text}
                        </p>
                        
                        <footer className="mt-3 flex items-center gap-2 pl-2">
                            <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${current.gradient} opacity-60`}></div>
                            <cite className="not-italic text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide">
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