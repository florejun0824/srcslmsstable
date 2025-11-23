// src/components/teacher/dashboard/widgets/AdminBannerEditModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { db } from '../../../../services/firebase'; 
import { doc, setDoc } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoIcon, ExclamationTriangleIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'; // Added CheckIcon
import { useToast } from '../../../../contexts/ToastContext'; 

const AdminBannerEditModal = ({ isOpen, onClose, currentImageUrl, currentStartDate, currentEndDate, onSaveSuccess }) => {
    const { showToast } = useToast();
    const [imageUrl, setImageUrl] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [imgLoadError, setImgLoadError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setImageUrl(currentImageUrl || '');
            setStartDate(currentStartDate?.seconds ? new Date(currentStartDate.seconds * 1000).toISOString().slice(0, 16) : '');
            setEndDate(currentEndDate?.seconds ? new Date(currentEndDate.seconds * 1000).toISOString().slice(0, 16) : '');
            setError('');
            setImgLoadError(false);
        }
    }, [isOpen, currentImageUrl, currentStartDate, currentEndDate]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        }
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSave = async () => {
        setError('');
        if (!imageUrl) {
            setError("The Image URL cannot be empty.");
            return;
        }

        setIsSaving(true);
        try {
            const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
            const startDateObj = startDate ? new Date(startDate) : null;
            const endDateObj = endDate ? new Date(endDate) : null;

            if (startDate && isNaN(startDateObj.getTime())) {
                setError("The start date format is invalid.");
                setIsSaving(false);
                return;
            }
            if (endDate && isNaN(endDateObj.getTime())) {
                setError("The end date format is invalid.");
                setIsSaving(false);
                return;
            }
            if (startDateObj && endDateObj && startDateObj >= endDateObj) {
                setError("The start date must be before the end date.");
                setIsSaving(false);
                return;
            }

            await setDoc(bannerDocRef, {
                imageUrl,
                startDate: startDateObj,
                endDate: endDateObj,
            }, { merge: true });

            showToast("Banner updated successfully!", "success");
            onSaveSuccess();
            onClose();
        } catch (e) {
            console.error("Error saving banner settings:", e);
            setError("A server error occurred. Please try again.");
            showToast("Failed to save banner settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
                    
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative glass-panel bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/40 dark:border-white/10"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 pb-2 border-b border-slate-100/50 dark:border-white/5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Edit Banner
                                </h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Update the main dashboard visual.
                                </p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            
                            {/* Image Preview */}
                            <div className="w-full aspect-video bg-slate-100/50 dark:bg-black/20 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-inner group">
                                {imageUrl && !imgLoadError ? (
                                    <img
                                        src={imageUrl}
                                        alt="Banner Preview"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        onError={() => setImgLoadError(true)}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                                        <PhotoIcon className="h-10 w-10 mb-2 opacity-50" />
                                        <span className="text-xs font-bold">{imgLoadError ? "Image Failed" : "Preview Area"}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* URL Input */}
                            <div className="space-y-1.5">
                                <label htmlFor="imageUrl" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">
                                    Image URL
                                </label>
                                <div className="relative group">
                                    <PhotoIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        id="imageUrl"
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e) => { setImageUrl(e.target.value); setImgLoadError(false); }}
                                        placeholder="https://example.com/image.png"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all shadow-sm placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Dates Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="startDate" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">
                                        Start Date
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="startDate"
                                            type="datetime-local"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:[color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="endDate" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">
                                        End Date
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="endDate"
                                            type="datetime-local"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:[color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Error Alert */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center space-x-3 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30"
                                    >
                                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-xs font-bold">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="p-6 pt-2 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                            {/* Cancel Button */}
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-4 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            {/* Save Button (Gem Style) */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="group relative w-full rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                <div className="relative flex items-center justify-center gap-2">
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                                            <span>Save Changes</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </motion.div>
                    <style>{`
                        @keyframes shimmer {
                            100% { transform: translateX(100%); }
                        }
                        .animate-shimmer {
                            animation: shimmer 1.5s infinite;
                        }
                    `}</style>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AdminBannerEditModal;