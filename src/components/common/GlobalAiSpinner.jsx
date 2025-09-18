import React from 'react';
import Spinner from './Spinner';

const GlobalAiSpinner = ({ isGenerating, text }) => {
    if (!isGenerating) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex flex-col justify-center items-center">
            <Spinner />
            <p className="text-white text-lg mt-4">{text || "AI is working its magic..."}</p>
        </div>
    );
};

export default GlobalAiSpinner;