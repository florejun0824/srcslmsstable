import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        const id = new Date().getTime();
        setToast({ id, message, type });
        setTimeout(() => setToast(null), 3000);
    };
    
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
                        <div className="bg-neumorphic-base shadow-neumorphic p-4 rounded-xl flex items-center gap-3">
                            {toast.type === 'success' ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-500" />
                            ) : (
                                <ExclamationCircleIcon className="w-6 h-6 text-red-500" />
                            )}
                            <span className="font-semibold text-slate-700">{toast.message}</span>
                        </div>
                    </motion.div>
                }
            </AnimatePresence>
        </ToastContext.Provider>
    );
};