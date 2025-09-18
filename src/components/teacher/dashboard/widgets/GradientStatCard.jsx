import React from 'react';

const GradientStatCard = ({ icon, title, value, gradient }) => (
    <div className={`relative text-white p-6 rounded-xl shadow-lg overflow-hidden bg-gradient-to-br ${gradient} h-full`}>
        {React.cloneElement(icon, { className: "absolute -right-4 -top-4 w-28 h-28 text-white opacity-10 -rotate-12 pointer-events-none" })}
        <div className="relative z-10 flex flex-col justify-center h-full">
            <div className="mb-4 p-2 bg-white/20 rounded-lg inline-block self-start">
                {React.cloneElement(icon, { className: "w-7 h-7" })}
            </div>
            <p className="text-4xl font-bold">{value}</p>
            <p className="text-white/80">{title}</p>
        </div>
    </div>
);

export default GradientStatCard;