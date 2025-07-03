import React, { useState, createContext, useContext } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const toastBgColor = toast?.type === 'success' ? 'bg-green-500' : 'bg-red-500';

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && 
                <div className={`fixed bottom-5 right-5 p-4 rounded-lg text-white shadow-lg z-[200] transition-opacity duration-300 ${toastBgColor}`}>
                    {toast.message}
                </div>
            }
        </ToastContext.Provider>
    );
};