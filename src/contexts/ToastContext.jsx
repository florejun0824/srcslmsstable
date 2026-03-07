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

// --- M3 TOAST TYPE CONFIG ---
const TOAST_CONFIG = {
    success: {
        icon: CheckCircleIcon,
        surface: 'bg-emerald-50 dark:bg-emerald-500/[0.12]',
        border: 'border-emerald-200/60 dark:border-emerald-500/20',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        text: 'text-emerald-900 dark:text-emerald-100',
        subtext: 'text-emerald-600/70 dark:text-emerald-400/70',
        progress: 'bg-emerald-500',
        label: 'Success'
    },
    error: {
        icon: XCircleIcon,
        surface: 'bg-red-50 dark:bg-red-500/[0.12]',
        border: 'border-red-200/60 dark:border-red-500/20',
        iconBg: 'bg-red-100 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        text: 'text-red-900 dark:text-red-100',
        subtext: 'text-red-600/70 dark:text-red-400/70',
        progress: 'bg-red-500',
        label: 'Error'
    },
    warning: {
        icon: ExclamationTriangleIcon,
        surface: 'bg-amber-50 dark:bg-amber-500/[0.12]',
        border: 'border-amber-200/60 dark:border-amber-500/20',
        iconBg: 'bg-amber-100 dark:bg-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-900 dark:text-amber-100',
        subtext: 'text-amber-600/70 dark:text-amber-400/70',
        progress: 'bg-amber-500',
        label: 'Warning'
    },
    info: {
        icon: InformationCircleIcon,
        surface: 'bg-blue-50 dark:bg-blue-500/[0.12]',
        border: 'border-blue-200/60 dark:border-blue-500/20',
        iconBg: 'bg-blue-100 dark:bg-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        text: 'text-blue-900 dark:text-blue-100',
        subtext: 'text-blue-600/70 dark:text-blue-400/70',
        progress: 'bg-blue-500',
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
                                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
                                transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.8 }}
                                className="pointer-events-auto w-full max-w-[420px]"
                            >
                                <div className={`
                                    relative overflow-hidden
                                    flex items-center gap-3 py-3 pl-3.5 pr-3
                                    rounded-[16px] border backdrop-blur-xl
                                    shadow-lg dark:shadow-black/30
                                    ${isThemed
                                        ? 'bg-[#1a1a2e]/90 border-white/10'
                                        : `${config.surface} ${config.border}`
                                    }
                                `}>

                                    {/* M3 Leading Icon */}
                                    <div className={`
                                        w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                                        ${isThemed ? 'bg-white/10' : config.iconBg}
                                    `}>
                                        <Icon className={`w-5 h-5 ${isThemed ? 'text-white/80' : config.iconColor}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 py-0.5">
                                        <div className={`text-[10px] font-semibold uppercase tracking-widest mb-0.5 ${isThemed ? 'text-white/40' : config.subtext}`}>
                                            {config.label}
                                        </div>
                                        <p className={`text-[13px] font-semibold leading-snug truncate ${isThemed ? 'text-white/90' : config.text}`}>
                                            {toast.message}
                                        </p>
                                    </div>

                                    {/* Dismiss */}
                                    <button
                                        onClick={() => dismissToast(toast.id)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                            ${isThemed
                                                ? 'text-white/30 hover:text-white/60 hover:bg-white/10'
                                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>

                                    {/* M3 Auto-dismiss Progress Bar */}
                                    <motion.div
                                        initial={{ scaleX: 1 }}
                                        animate={{ scaleX: 0 }}
                                        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                                        style={{ transformOrigin: 'left' }}
                                        className={`absolute bottom-0 left-0 right-0 h-[3px] ${isThemed ? 'bg-white/20' : config.progress} opacity-40 rounded-b-[16px]`}
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