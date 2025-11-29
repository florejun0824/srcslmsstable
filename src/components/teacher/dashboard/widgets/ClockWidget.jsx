// src/components/teacher/dashboard/widgets/ClockWidget.jsx
import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const ClockWidget = ({ className }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className={`relative p-6 flex flex-col justify-center items-center text-center h-full overflow-hidden ${className}`}>
            
            {/* --- Ambient Candy Glows (Decorative Background) --- */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-[40px] pointer-events-none translate-x-10 -translate-y-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-[40px] pointer-events-none -translate-x-10 translate-y-10" />

            {/* --- Date Pill (Glassmorphic) --- */}
            <div className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100/80 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 shadow-sm transition-all hover:scale-105 cursor-default">
                <CalendarDaysIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" strokeWidth={2} />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
                    {time.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
            </div>

            {/* --- Time Display (Gradient Typography) --- */}
            <div className="relative z-10 mt-3 text-6xl lg:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 drop-shadow-sm select-none">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            
        </div>
    );
};

export default ClockWidget;