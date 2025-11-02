import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'; // <-- Using XCircleIcon and others for more types

const ToastContext = createContext();
let toastRef; // 🔹 global reference

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    // --- MODIFIED: Added support for 'warning' and 'info' types ---
    const showToast = (message, type = 'success', duration = 3000) => {
        const id = new Date().getTime();
        setToast({ id, message, type });
        setTimeout(() => setToast(null), duration);
    };

    // ✅ expose globally
    toastRef = showToast;

    // --- NEW: Helper to get icon and color based on type ---
    const getToastVisuals = (type) => {
        switch (type) {
            case 'success':
                return {
                    icon: <CheckCircleIcon className="w-6 h-6 text-green-500 dark:text-green-400" />,
                    textClass: "text-slate-700 dark:text-slate-100"
                };
            case 'error':
                return {
                    icon: <XCircleIcon className="w-6 h-6 text-red-500 dark:text-red-400" />,
                    textClass: "text-red-700 dark:text-red-300"
                };
            case 'warning':
                return {
                    icon: <ExclamationTriangleIcon className="w-6 h-6 text-orange-500 dark:text-orange-400" />,
                    textClass: "text-orange-700 dark:text-orange-300"
                };
            case 'info':
                return {
                    icon: <InformationCircleIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />,
                    textClass: "text-slate-700 dark:text-slate-100"
                };
            default:
                return {
                    icon: <CheckCircleIcon className="w-6 h-6 text-green-500 dark:text-green-400" />,
                    textClass: "text-slate-700 dark:text-slate-100"
                };
        }
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <AnimatePresence>
                {toast && 
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed bottom-5 right-5 z-[200]"
                    >
                        {/* --- MODIFIED: Added dark mode classes --- */}
                        <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark p-4 rounded-xl flex items-center gap-3">
                            {getToastVisuals(toast.type).icon}
                            <span className={`font-semibold ${getToastVisuals(toast.type).textClass}`}>
                                {toast.message}
                            </span>
                        </div>
                    </motion.div>
                }
            </AnimatePresence>
        </ToastContext.Provider>
    );
};

// 🔹 Export global trigger for non-React files (like services)
export const triggerToast = (message, type = 'success', duration = 3000) => {
    if (toastRef) {
        toastRef(message, type, duration);
    } else {
        console.warn("Toast system not ready yet.");
    }
};