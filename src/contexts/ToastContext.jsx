// src/contexts/ToastContext.jsx
import React, { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircleIcon,
    XCircleIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';
import { useTheme } from './ThemeContext';

const ToastContext = createContext();
let toastRef;

export const useToast = () => useContext(ToastContext);

// --- ULTRA PREMIUM TOAST CONFIG ---
const TOAST_CONFIG = {
    success: {
        icon: CheckCircleIcon,
        surface: 'bg-gradient-to-br from-emerald-50/95 to-white/95 md:from-emerald-50/80 md:to-white/80 dark:bg-slate-900/95 md:dark:bg-slate-900/80',
        border: 'border-white/80 dark:border-slate-700/50',
        shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]',
        iconBg: 'bg-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        iconColor: 'text-white',
        text: 'text-slate-900 dark:text-white',
        subtext: 'text-emerald-700 dark:text-emerald-400',
        progress: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
        glow: 'from-emerald-300 to-teal-400 dark:from-emerald-600 dark:to-teal-900',
        label: 'Success'
    },
    error: {
        icon: XCircleIcon,
        surface: 'bg-gradient-to-br from-rose-50/95 to-white/95 md:from-rose-50/80 md:to-white/80 dark:bg-slate-900/95 md:dark:bg-slate-900/80',
        border: 'border-white/80 dark:border-slate-700/50',
        shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]',
        iconBg: 'bg-rose-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        iconColor: 'text-white',
        text: 'text-slate-900 dark:text-white',
        subtext: 'text-rose-700 dark:text-rose-400',
        progress: 'bg-gradient-to-r from-rose-400 to-rose-500',
        glow: 'from-rose-300 to-pink-400 dark:from-rose-600 dark:to-pink-900',
        label: 'Error'
    },
    warning: {
        icon: ExclamationTriangleIcon,
        surface: 'bg-gradient-to-br from-amber-50/95 to-white/95 md:from-amber-50/80 md:to-white/80 dark:bg-slate-900/95 md:dark:bg-slate-900/80',
        border: 'border-white/80 dark:border-slate-700/50',
        shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]',
        iconBg: 'bg-amber-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        iconColor: 'text-white',
        text: 'text-slate-900 dark:text-white',
        subtext: 'text-amber-700 dark:text-amber-400',
        progress: 'bg-gradient-to-r from-orange-400 to-orange-500',
        glow: 'from-amber-300 to-orange-400 dark:from-amber-600 dark:to-orange-900',
        label: 'Warning'
    },
    info: {
        icon: InformationCircleIcon,
        surface: 'bg-gradient-to-br from-sky-50/95 to-white/95 md:from-sky-50/80 md:to-white/80 dark:bg-slate-900/95 md:dark:bg-slate-900/80',
        border: 'border-white/80 dark:border-slate-700/50',
        shadow: 'shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]',
        iconBg: 'bg-sky-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        iconColor: 'text-white',
        text: 'text-slate-900 dark:text-white',
        subtext: 'text-sky-700 dark:text-sky-400',
        progress: 'bg-gradient-to-r from-sky-400 to-sky-500',
        glow: 'from-sky-300 to-blue-400 dark:from-sky-600 dark:to-blue-900',
        label: 'Info'
    }
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const { activeOverlay } = useTheme();
    const timersRef = useRef({});

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
            delete timersRef.current[id];
        }
    }, []);

    // Duration reduced from 3500ms to 2000ms
    const showToast = useCallback((message, type = 'success', duration = 1000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            // Keep max 3 toasts visible
            const next = prev.length >= 3 ? prev.slice(1) : [...prev];
            return [...next, { id, message, type, duration }];
        });
        timersRef.current[id] = setTimeout(() => dismissToast(id), duration);
    }, [dismissToast]);

    toastRef = showToast;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            Object.values(timersRef.current).forEach(clearTimeout);
        };
    }, []);

    // Themed overlay adjustments
    const isThemed = activeOverlay !== 'none';

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* M3 Snackbar Host — bottom center */}
            <div className="fixed bottom-5 left-0 right-0 flex flex-col items-center gap-2.5 z-[10000] pointer-events-none px-4">
                <AnimatePresence mode="popLayout">
                    {toasts.map((toast) => {
                        const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
                        const Icon = config.icon;

                        return (
                            <motion.div
                                key={toast.id}
                                layout
                                initial={{ opacity: 0, y: 50, scale: 0.85, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)', transition: { duration: 0.2 } }}
                                transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
                                className="pointer-events-auto w-full max-w-[400px] group"
                            >
                                <div className={`
                                    relative overflow-hidden
                                    flex items-start gap-4 py-3.5 px-4
                                    rounded-[20px] border md:backdrop-blur-2xl transition-all duration-300
                                    ${isThemed
                                        ? 'bg-[#1a1a2e]/90 border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)]'
                                        : `${config.surface} ${config.border} ${config.shadow}`
                                    }
                                `}>
                                    {/* Ambient Glow Orb Inside Toast */}
                                    {!isThemed && (
                                        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${config.glow} blur-[40px] opacity-20 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen pointer-events-none`} />
                                    )}

                                    {/* Glass Shine */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-50 pointer-events-none" />

                                    {/* Icon */}
                                    <div className={`
                                        w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm relative z-10
                                        group-hover:scale-110 transition-transform duration-500 ease-out
                                        ${isThemed ? 'bg-white/10' : config.iconBg}
                                    `}>
                                        <Icon className={`w-5 h-5 ${isThemed ? 'text-white/80' : config.iconColor}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-0.5 relative z-10">
                                        <div className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-1 ${isThemed ? 'text-white/40' : config.subtext}`}>
                                            {config.label}
                                        </div>
                                        <p className={`text-[14px] font-bold leading-snug ${isThemed ? 'text-white/90' : config.text}`}>
                                            {toast.message}
                                        </p>
                                    </div>

                                    {/* Dismiss */}
                                    <button
                                        onClick={() => dismissToast(toast.id)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all border border-transparent relative z-10
                                            ${isThemed
                                                ? 'text-white/30 hover:text-white/80 hover:bg-white/10'
                                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <XMarkIcon className="w-4 h-4 stroke-[2.5]" />
                                    </button>

                                    {/* Progress Bar */}
                                    <motion.div
                                        initial={{ scaleX: 1 }}
                                        animate={{ scaleX: 0 }}
                                        transition={{ duration: toast.duration / 1500, ease: 'linear' }}
                                        style={{ transformOrigin: 'left' }}
                                        className={`absolute bottom-0 left-0 right-0 h-[3px] ${isThemed ? 'bg-white/20' : config.progress} opacity-90 rounded-b-[20px]`}
                                    />
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

// Duration reduced from 3500ms to 2000ms
export const triggerToast = (message, type = 'success', duration = 1000) => {
    if (toastRef) {
        toastRef(message, type, duration);
    } else {
        console.warn("Toast system not ready yet.");
    }
};