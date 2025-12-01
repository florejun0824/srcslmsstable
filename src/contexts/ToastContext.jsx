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
    const themeStyles = useMemo(() => {
        const base = "backdrop-blur-2xl border shadow-2xl ring-1 ring-inset ring-white/10";
        
        switch (activeOverlay) {
            case 'christmas':
                return {
                    container: `${base} bg-red-950/60 border-red-500/30 shadow-red-900/40`,
                    iconColor: "text-red-400",
                    textColor: "text-red-100"
                };
            case 'valentines':
                return {
                    container: `${base} bg-pink-950/60 border-pink-500/30 shadow-pink-900/40`,
                    iconColor: "text-pink-400",
                    textColor: "text-pink-100"
                };
            case 'graduation':
                return {
                    container: `${base} bg-blue-950/70 border-yellow-500/30 shadow-blue-900/40`,
                    iconColor: "text-yellow-400",
                    textColor: "text-blue-100"
                };
            case 'cyberpunk':
                return {
                    container: `${base} bg-slate-900/80 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)]`,
                    iconColor: "text-cyan-400",
                    textColor: "text-cyan-50"
                };
            case 'space':
                return {
                    container: `${base} bg-[#0f1115]/80 border-indigo-500/40 shadow-indigo-900/50`,
                    iconColor: "text-indigo-400",
                    textColor: "text-indigo-100"
                };
            case 'rainy':
                return {
                    container: `${base} bg-slate-800/70 border-teal-500/30 shadow-teal-900/30`,
                    iconColor: "text-teal-400",
                    textColor: "text-slate-200"
                };
            case 'spring':
                return {
                    container: `${base} bg-stone-900/60 border-pink-400/30 shadow-pink-900/20`,
                    iconColor: "text-pink-400",
                    textColor: "text-stone-100"
                };
            default: // Standard / None
                return {
                    container: `${base} bg-slate-900/60 border-white/10 shadow-black/50`,
                    iconColor: "text-white",
                    textColor: "text-white"
                };
        }
    }, [activeOverlay]);

    // --- Helper to get icon visuals based on Message Type (Success/Error) ---
    // We mix the "Monet" theme style with the standard "Success/Error" logic
    const getToastVisuals = (type) => {
        switch (type) {
            case 'success':
                return { 
                    icon: <CheckCircleIcon className={`w-6 h-6 ${activeOverlay !== 'none' ? themeStyles.iconColor : 'text-green-400'}`} />,
                    accent: activeOverlay !== 'none' ? themeStyles.container : "bg-black/60 border-white/10 shadow-black/40 backdrop-blur-xl border ring-1 ring-white/5"
                };
            case 'error':
                return { 
                    icon: <XCircleIcon className="w-6 h-6 text-red-500" />,
                    accent: "bg-red-950/80 border-red-500/20 shadow-red-900/30 backdrop-blur-xl border ring-1 ring-white/5"
                };
            case 'warning':
                return { 
                    icon: <ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />,
                    accent: "bg-orange-950/80 border-orange-500/20 shadow-orange-900/30 backdrop-blur-xl border ring-1 ring-white/5"
                };
            case 'info':
            default:
                return { 
                    icon: <InformationCircleIcon className={`w-6 h-6 ${activeOverlay !== 'none' ? themeStyles.iconColor : 'text-blue-400'}`} />,
                    accent: themeStyles.container
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
                        initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.5 }}
                        className="fixed bottom-8 right-8 z-[9999] flex items-center justify-center pointer-events-none"
                    >
                        {/* MACOS 26 STYLE CONTAINER */}
                        <div className={`
                            relative overflow-hidden pointer-events-auto
                            flex items-center gap-4 py-4 px-5 pr-8
                            rounded-[1.5rem] 
                            ${toast.type === 'error' || toast.type === 'warning' ? getToastVisuals(toast.type).accent : themeStyles.container}
                        `}>
                            
                            {/* Glossy sheen effect at top */}
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
                            
                            {/* Icon Wrapper with Glow */}
                            <div className={`relative flex-shrink-0 p-1`}>
                                <div className={`absolute inset-0 blur-lg opacity-40 ${toast.type === 'error' ? 'bg-red-500' : themeStyles.iconColor.replace('text-', 'bg-')}`}></div>
                                {getToastVisuals(toast.type).icon}
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col">
                                <span className={`text-[13px] font-bold tracking-wide uppercase opacity-70 ${themeStyles.textColor}`}>
                                    {toast.type}
                                </span>
                                <span className={`text-[15px] font-medium tracking-tight leading-snug ${themeStyles.textColor}`}>
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