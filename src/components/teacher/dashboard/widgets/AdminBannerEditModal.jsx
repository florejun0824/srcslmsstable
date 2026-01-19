// src/components/teacher/dashboard/widgets/AdminBannerEditModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { db } from '../../../../services/firebase'; 
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PhotoIcon, 
    ExclamationTriangleIcon, 
    XMarkIcon, 
    CheckIcon, 
    DocumentTextIcon, 
    Square2StackIcon, 
    LinkIcon,
    TagIcon 
} from '@heroicons/react/24/outline'; 
import { useToast } from '../../../../contexts/ToastContext'; 

const AdminBannerEditModal = ({ 
    isOpen, 
    onClose, 
    currentImageUrl, 
    currentStartDate, 
    currentEndDate, 
    currentType = 'image',
    currentTitle = '',
    currentMessage = '',
    currentLinkUrl = '',
    currentLinkLabel = '',
    onSaveSuccess 
}) => {
    const { showToast } = useToast();
    
    // Core Data State
    const [type, setType] = useState('image'); // 'image', 'text', 'combined'
    const [imageUrl, setImageUrl] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkLabel, setLinkLabel] = useState('');
    
    // Schedule State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [imgLoadError, setImgLoadError] = useState(false);

    // Initialize state when modal opens
    useEffect(() => {
        if (isOpen) {
            setType(currentType || 'image');
            setImageUrl(currentImageUrl || '');
            setTitle(currentTitle || '');
            setMessage(currentMessage || '');
            setLinkUrl(currentLinkUrl || '');
            setLinkLabel(currentLinkLabel || 'Learn More');
            
            setStartDate(currentStartDate?.seconds ? new Date(currentStartDate.seconds * 1000).toISOString().slice(0, 16) : '');
            setEndDate(currentEndDate?.seconds ? new Date(currentEndDate.seconds * 1000).toISOString().slice(0, 16) : '');
            
            setError('');
            setImgLoadError(false);
        }
    }, [isOpen, currentImageUrl, currentStartDate, currentEndDate, currentType, currentTitle, currentMessage, currentLinkUrl, currentLinkLabel]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        }
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSave = async () => {
        setError('');

        // --- Validation Logic ---
        // 1. Image Validation (Required for 'image' and 'combined')
        if ((type === 'image' || type === 'combined') && !imageUrl) {
            setError("The Image URL is required for this banner type.");
            return;
        }

        // 2. Text Validation (Required for 'text' and 'combined')
        if ((type === 'text' || type === 'combined') && !title && !message) {
            setError("Please provide at least a Title or a Message.");
            return;
        }

        // 3. Date Validation
        const startDateObj = startDate ? new Date(startDate) : null;
        const endDateObj = endDate ? new Date(endDate) : null;

        if (startDate && isNaN(startDateObj.getTime())) {
            setError("The start date format is invalid.");
            return;
        }
        if (endDate && isNaN(endDateObj.getTime())) {
            setError("The end date format is invalid.");
            return;
        }
        if (startDateObj && endDateObj && startDateObj >= endDateObj) {
            setError("The start date must be before the end date.");
            return;
        }

        setIsSaving(true);
        try {
            const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
            
            // Construct payload based on type to keep DB clean
            const payload = {
                type,
                startDate: startDateObj,
                endDate: endDateObj,
                // Always save link fields as they might be used across types
                linkUrl,
                linkLabel: (type !== 'image') ? linkLabel : '', // Link label irrelevant for image-only
            };

            // Add conditional fields
            if (type !== 'text') payload.imageUrl = imageUrl;
            if (type !== 'image') {
                payload.title = title;
                payload.message = message;
            }

            await setDoc(bannerDocRef, payload, { merge: true });

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
                        className="relative glass-panel bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-white/40 dark:border-white/10 max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-100/50 dark:border-white/5 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Edit Banner
                                </h3>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Customize the dashboard visual style.
                                </p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            
                            {/* Type Selector */}
                            <div className="flex p-1 bg-slate-100 dark:bg-black/20 rounded-xl">
                                {['image', 'text', 'combined'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setType(t)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                                            type === t 
                                                ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' 
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                    >
                                        {t === 'image' && <PhotoIcon className="w-4 h-4" />}
                                        {t === 'text' && <DocumentTextIcon className="w-4 h-4" />}
                                        {t === 'combined' && <Square2StackIcon className="w-4 h-4" />}
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {/* SECTION: IMAGE INPUT (Visible for Image & Combined) */}
                            {type !== 'text' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="w-full aspect-video bg-slate-100/50 dark:bg-black/20 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-inner group relative">
                                        {imageUrl && !imgLoadError ? (
                                            <>
                                                <img
                                                    src={imageUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={() => setImgLoadError(true)}
                                                />
                                                {type === 'combined' && (title || message) && (
                                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                                                        <div className="h-2 w-1/2 bg-white/50 rounded mb-2"></div>
                                                        <div className="h-2 w-3/4 bg-white/30 rounded"></div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                                                <PhotoIcon className="h-10 w-10 mb-2 opacity-50" />
                                                <span className="text-xs font-bold">{imgLoadError ? "Image Failed" : "Preview"}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <PhotoIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => { setImageUrl(e.target.value); setImgLoadError(false); }}
                                            placeholder="https://example.com/image.png"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SECTION: TEXT CONTENT (Visible for Text & Combined) */}
                            {type !== 'image' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-100 dark:border-white/5 pt-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., School Spirit Week"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Message</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Write a brief message..."
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SECTION: LINKS (Visible for All) */}
                            <div className="space-y-4 border-t border-slate-100 dark:border-white/5 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="relative group col-span-1 sm:col-span-2">
                                        <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="url"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="Action Link URL (Optional)"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        />
                                    </div>
                                    {type !== 'image' && (
                                        <div className="relative group col-span-1 sm:col-span-2">
                                            <TagIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                value={linkLabel}
                                                onChange={(e) => setLinkLabel(e.target.value)}
                                                placeholder="Button Label (e.g. Learn More)"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION: DATES */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none dark:[color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">End Date</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/50 outline-none dark:[color-scheme:dark]"
                                    />
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
                        <div className="p-6 pt-4 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 mt-auto flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-4 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Cancel
                            </button>

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
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default AdminBannerEditModal;