import React, { useState, useEffect } from 'react';
import { BookOpenIcon } from '@heroicons/react/24/solid';

const loadingMessages = [
    "Brewing up some brilliant ideas...",
    "Assembling atoms of knowledge...",
    "Teaching the AI about your topic...",
    "Turning good ideas into great lessons...",
    "Unpacking the mysteries of the universe...",
    "Finding the perfect words...",
    "Polishing the lesson plan...",
    "Consulting the muses of education...",
    "Just a moment, creating something amazing!",
    "Did you know? The human brain has about 86 billion neurons.",
    "Warming up the creativity engines...",
];

const InteractiveLoadingScreen = ({ topic, isSaving }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (isSaving) return; // Don't cycle messages when saving

        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 3000); // Change message every 3 seconds

        return () => clearInterval(interval);
    }, [isSaving]);

    return (
        <div className="text-center p-4">
            <div className="relative w-24 h-24 mx-auto mb-4">
                <BookOpenIcon className="w-24 h-24 text-blue-500 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                    <BookOpenIcon className="w-16 h-16 text-indigo-600" />
                </div>
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">
                {isSaving ? 'Saving Your Lesson...' : `Generating Lesson on "${topic}"`}
            </h2>
            <div className="h-6"> {/* Keep space consistent */}
                 <p key={messageIndex} className="text-slate-500 animate-fade-in">
                    {isSaving ? "Almost there..." : loadingMessages[messageIndex]}
                </p>
            </div>
        </div>
    );
};

export default InteractiveLoadingScreen;