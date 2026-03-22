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

// --- PREMIUM NEO-GLASS TOAST CONFIG ---
const TOAST_CONFIG = {
    success: {
        icon: CheckCircleIcon,
        surface: 'bg-white/80 dark:bg-slate-900/80',
        border: 'border-emerald-200/50 dark:border-emerald-500/20',
        glow: 'shadow-[0_8px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_8px_30px_rgba(16,185,129,0.1)]',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-950 dark:text-emerald-50',
        subtext: 'text-emerald-600/80 dark:text-emerald-400/80',
        progress: 'bg-gradient-to-r from-emerald-400 to-teal-500',
        label: 'Success'
    },
    error: {
        icon: XCircleIcon,
        surface: 'bg-white/80 dark:bg-slate-900/80',
        border: 'border-rose-200/50 dark:border-rose-500/20',
        glow: 'shadow-[0_8px_30px_rgba(244,63,94,0.15)] dark:shadow-[0_8px_30px_rgba(244,63,94,0.1)]',
        iconBg: 'bg-rose-100 dark:bg-rose-500/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        text: 'text-rose-950 dark:text-rose-50',
        subtext: 'text-rose-600/80 dark:text-rose-400/80',
        progress: 'bg-gradient-to-r from-rose-400 to-pink-500',
        label: 'Error'
    },
    warning: {
        icon: ExclamationTriangleIcon,
        surface: 'bg-white/80 dark:bg-slate-900/80',
        border: 'border-amber-200/50 dark:border-amber-500/20',
        glow: 'shadow-[0_8px_30px_rgba(245,158,11,0.15)] dark:shadow-[0_8px_30px_rgba(245,158,11,0.1)]',
        iconBg: 'bg-amber-100 dark:bg-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-950 dark:text-amber-50',
        subtext: 'text-amber-600/80 dark:text-amber-400/80',
        progress: 'bg-gradient-to-r from-amber-400 to-orange-500',
        label: 'Warning'
    },
    info: {
        icon: InformationCircleIcon,
        surface: 'bg-white/80 dark:bg-slate-900/80',
        border: 'border-indigo-200/50 dark:border-indigo-500/20',
        glow: 'shadow-[0_8px_30px_rgba(99,102,241,0.15)] dark:shadow-[0_8px_30px_rgba(99,102,241,0.1)]',
        iconBg: 'bg-indigo-100 dark:bg-indigo-500/20',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        text: 'text-indigo-950 dark:text-indigo-50',
        subtext: 'text-indigo-600/80 dark:text-indigo-400/80',
        progress: 'bg-gradient-to-r from-indigo-400 to-purple-500',
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

    const showToast = useCallback((message, type = 'success', duration = 3500) => {
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
                                className="pointer-events-auto w-full max-w-[400px]"
                            >
                                <div className={`
                                    relative overflow-hidden
                                    flex items-start gap-4 py-3.5 px-4
                                    rounded-[20px] border backdrop-blur-2xl
                                    ${config.glow}
                                    ${isThemed
                                        ? 'bg-[#1a1a2e]/90 border-white/10'
                                        : `${config.surface} ${config.border}`
                                    }
                                `}>
                                    {/* Glass Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 dark:from-white/0 dark:via-white/5 dark:to-white/0 opacity-50 pointer-events-none" />

                                    {/* Icon */}
                                    <div className={`
                                        w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm
                                        ${isThemed ? 'bg-white/10' : config.iconBg}
                                    `}>
                                        <Icon className={`w-5 h-5 ${isThemed ? 'text-white/80' : config.iconColor}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pt-0.5">
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
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all border border-transparent
                                            ${isThemed
                                                ? 'text-white/30 hover:text-white/80 hover:bg-white/10'
                                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                            }
                                        `}
                                    >
                                        <XMarkIcon className="w-4 h-4 stroke-2" />
                                    </button>

                                    {/* Progress Bar */}
                                    <motion.div
                                        initial={{ scaleX: 1 }}
                                        animate={{ scaleX: 0 }}
                                        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                                        style={{ transformOrigin: 'left' }}
                                        className={`absolute bottom-0 left-0 right-0 h-[4px] ${isThemed ? 'bg-white/20' : config.progress} opacity-90 rounded-b-[20px]`}
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

export const triggerToast = (message, type = 'success', duration = 3500) => {
    if (toastRef) {
        toastRef(message, type, duration);
    } else {
        console.warn("Toast system not ready yet.");
    }
};