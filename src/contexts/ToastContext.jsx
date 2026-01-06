// src/contexts/ToastContext.jsx
import React, { useState, createContext, useContext, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    InformationCircleIcon, 
    ExclamationTriangleIcon 
} from '@heroicons/react/24/solid';
import { useTheme } from './ThemeContext'; // Import Theme Context for Monet Support

const ToastContext = createContext();
let toastRef; 

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const { activeOverlay } = useTheme(); // Access current season/theme

    const showToast = (message, type = 'success', duration = 3000) => {
        const id = new Date().getTime();
        setToast({ id, message, type });
        setTimeout(() => setToast(null), duration);
    };

    toastRef = showToast;

    // --- MONET SUPPORT: Generate Dynamic Styles based on Active Overlay ---
    // One UI 8.5 Style: Deep blur, super rounded, subtle borders
    const themeStyles = useMemo(() => {
        const base = "backdrop-blur-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]";
        
        switch (activeOverlay) {
            case 'christmas':
                return {
                    container: `${base} bg-[#1a0505]/90 border-red-500/30`,
                    iconBg: "bg-red-500/20 text-red-400",
                    textColor: "text-red-100"
                };
            case 'valentines':
                return {
                    container: `${base} bg-[#1f0a10]/90 border-pink-500/30`,
                    iconBg: "bg-pink-500/20 text-pink-400",
                    textColor: "text-pink-100"
                };
            case 'graduation':
                return {
                    container: `${base} bg-[#0f121a]/90 border-yellow-500/30`,
                    iconBg: "bg-yellow-500/20 text-yellow-400",
                    textColor: "text-blue-100"
                };
            case 'cyberpunk':
                return {
                    container: `${base} bg-[#050b14]/90 border-cyan-500/40`,
                    iconBg: "bg-cyan-500/20 text-cyan-400",
                    textColor: "text-cyan-50"
                };
            case 'space':
                return {
                    container: `${base} bg-[#0b0b14]/90 border-indigo-500/40`,
                    iconBg: "bg-indigo-500/20 text-indigo-400",
                    textColor: "text-indigo-100"
                };
            case 'rainy':
                return {
                    container: `${base} bg-[#0f172a]/90 border-teal-500/30`,
                    iconBg: "bg-teal-500/20 text-teal-400",
                    textColor: "text-slate-200"
                };
            case 'spring':
                return {
                    container: `${base} bg-[#1c1917]/90 border-pink-400/30`,
                    iconBg: "bg-pink-500/20 text-pink-400",
                    textColor: "text-stone-100"
                };
            default: // Standard / None
                return {
                    container: `${base} bg-white/90 dark:bg-[#2C2C2E]/90 border-white/40 dark:border-white/10`,
                    iconBg: "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300",
                    textColor: "text-slate-800 dark:text-slate-100"
                };
        }
    }, [activeOverlay]);

    // --- Helper to get visuals based on Message Type (Success/Error) ---
    const getToastVisuals = (type) => {
        // If there's an active theme, try to blend it, otherwise use standard One UI colors
        const isThemed = activeOverlay !== 'none';

        switch (type) {
            case 'success':
                return { 
                    icon: <CheckCircleIcon className="w-6 h-6" />,
                    iconClass: isThemed ? themeStyles.iconBg : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                    containerClass: themeStyles.container
                };
            case 'error':
                return { 
                    icon: <XCircleIcon className="w-6 h-6" />,
                    iconClass: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                    // Errors override the theme color to ensure visibility
                    containerClass: "backdrop-blur-3xl bg-white/95 dark:bg-[#2C2C2E]/95 border border-red-200 dark:border-red-900/50 shadow-2xl" 
                };
            case 'warning':
                return { 
                    icon: <ExclamationTriangleIcon className="w-6 h-6" />,
                    iconClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                    containerClass: themeStyles.container
                };
            case 'info':
            default:
                return { 
                    icon: <InformationCircleIcon className="w-6 h-6" />,
                    iconClass: isThemed ? themeStyles.iconBg : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                    containerClass: themeStyles.container
                };
        }
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="fixed bottom-6 right-0 left-0 flex justify-center z-[10000] pointer-events-none px-4"
                    >
                        {/* One UI 8.5 Toast Container */}
                        <div className={`
                            pointer-events-auto
                            flex items-center gap-4 py-3 pl-3 pr-6
                            rounded-[2rem]
                            ${getToastVisuals(toast.type).containerClass}
                        `}>
                            
                            {/* Icon Bubble */}
                            <div className={`
                                w-12 h-12 rounded-[1.5rem] flex items-center justify-center flex-shrink-0
                                ${getToastVisuals(toast.type).iconClass}
                            `}>
                                {getToastVisuals(toast.type).icon}
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col min-w-[200px] max-w-[300px]">
                                <span className={`text-[11px] font-bold uppercase tracking-wider opacity-60 mb-0.5 ${themeStyles.textColor}`}>
                                    {toast.type}
                                </span>
                                <span className={`text-[14px] font-bold leading-tight ${themeStyles.textColor}`}>
                                    {toast.message}
                                </span>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ToastContext.Provider>
    );
};

export const triggerToast = (message, type = 'success', duration = 3000) => {
    if (toastRef) {
        toastRef(message, type, duration);
    } else {
        console.warn("Toast system not ready yet.");
    }
};