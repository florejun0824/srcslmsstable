import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const ClockWidget = ({ className }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className={`p-6 flex flex-col justify-center items-center text-center h-full ${className}`}>
            {/* --- MODIFIED: Added dark mode text color --- */}
            <div className="flex items-center gap-2 text-lg text-slate-600 dark:text-slate-400">
                <CalendarDaysIcon className="w-5 h-5" />
                <span>{time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            {/* --- MODIFIED: Added dark mode text color --- */}
            <div className="text-5xl lg:text-6xl font-bold text-slate-800 dark:text-slate-100 my-2 tracking-wider">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

export default ClockWidget;