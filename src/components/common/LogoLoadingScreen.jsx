import React from 'react';

const LogoLoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-100 dark:bg-[#0a0c10] transition-colors duration-300">
            
            {/* Logo Container with Breathing Animation */}
            <div className="relative mb-8">
                {/* Glow Effect behind logo */}
                <div className="absolute inset-0 bg-red-500/20 blur-[60px] rounded-full animate-pulse" />
                
                <img 
                    src="/logo.png" 
                    alt="Loading..." 
                    className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10 animate-[pulse_3s_ease-in-out_infinite]"
                />
            </div>

            {/* Modern Spinner */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-white/10 border-t-red-600 rounded-full animate-spin" />
                
                <p className="text-sm font-bold tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase animate-pulse">
                    Loading System
                </p>
            </div>

        </div>
    );
};

export default LogoLoadingScreen;