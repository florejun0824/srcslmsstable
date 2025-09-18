import React, { useState, useEffect } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

const ClockWidget = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col justify-center items-center text-center h-full">
            <div className="flex items-center gap-2 text-lg text-gray-300">
                <CalendarDaysIcon className="w-5 h-5" />
                <span>{time.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="text-5xl lg:text-6xl font-bold my-2 tracking-wider">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

export default ClockWidget;