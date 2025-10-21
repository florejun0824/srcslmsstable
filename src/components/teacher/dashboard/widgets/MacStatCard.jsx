// ../widgets/MacStatCard.js

import React from 'react';
import { motion } from 'framer-motion';

const MacStatCard = ({ title, value, icon, color = 'bg-blue-500' }) => {
    return (
        <div className="h-full w-full p-5 bg-white/50 backdrop-blur-xl rounded-2xl shadow-md border border-black/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-700">
                <h3 className="font-semibold">{title}</h3>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${color}`}>
                    {icon}
                </div>
            </div>
            <p className="text-4xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
    );
};

export default MacStatCard;