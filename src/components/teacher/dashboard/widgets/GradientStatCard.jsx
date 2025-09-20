import React from 'react';

const GradientStatCard = ({ icon, title, value, gradient, className }) => (
    <div className={`relative p-6 overflow-hidden h-full ${className}`}>
        {/* The big background icon is toned down to a subtle dark color */}
        {React.cloneElement(icon, { className: "absolute -right-4 -top-4 w-28 h-28 text-neumorphic-shadow-dark opacity-20 -rotate-12 pointer-events-none" })}
        
        <div className="relative z-10 flex flex-col justify-center h-full">
            {/* The small icon's container is "pressed in" */}
            <div className="mb-4 p-3 bg-neumorphic-base rounded-lg inline-block self-start shadow-neumorphic-inset">
                {/* FIX: The icon is now given a solid, vibrant color that is guaranteed to be visible. */}
                {React.cloneElement(icon, { className: `w-7 h-7 text-sky-500` })}
            </div>
            
            {/* The main value uses the gradient for a colorful, dynamic effect. */}
            <p className={`text-4xl font-bold bg-gradient-to-br ${gradient} bg-clip-text text-transparent`}>{value}</p>
            
            {/* The title is a solid, readable dark slate color. */}
            <p className="text-slate-600">{title}</p>
        </div>
    </div>
);

export default GradientStatCard;