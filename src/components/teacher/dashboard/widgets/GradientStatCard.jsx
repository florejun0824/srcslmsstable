import React from 'react';

const GradientStatCard = ({ icon, title, value, gradient, className }) => (
    <div className={`relative p-6 overflow-hidden h-full ${className}`}>
        {/* --- MODIFIED: Added dark mode class for the big icon --- */}
        {React.cloneElement(icon, { className: "absolute -right-4 -top-4 w-28 h-28 text-neumorphic-shadow-dark dark:text-neumorphic-shadow-light-dark opacity-20 dark:opacity-20 -rotate-12 pointer-events-none" })}
        
        <div className="relative z-10 flex flex-col justify-center h-full">
            {/* --- MODIFIED: Added dark mode classes for icon container --- */}
            <div className="mb-4 p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-lg inline-block self-start shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                {/* --- MODIFIED: Added dark mode class for icon color --- */}
                {React.cloneElement(icon, { className: `w-7 h-7 text-sky-500 dark:text-sky-400` })}
            </div>
            
            {/* The main value uses the gradient for a colorful, dynamic effect. */}
            <p className={`text-4xl font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>{value}</p>
            
            {/* --- MODIFIED: Added dark mode text color --- */}
            <p className="text-slate-600 dark:text-slate-400">{title}</p>
        </div>
    </div>
);

export default GradientStatCard;