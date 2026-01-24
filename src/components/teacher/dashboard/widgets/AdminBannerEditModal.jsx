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
    TagIcon,
    CalendarIcon 
} from '@heroicons/react/24/outline'; 
import { useToast } from '../../../../contexts/ToastContext'; 

// --- MOONLIGHT OS INTERFACE KIT ---

const modalBase = `
    relative w-full max-w-lg flex flex-col overflow-hidden
    bg-[#0b1021] rounded-[40px] shadow-2xl 
    border border-white/10 ring-1 ring-white/5
    max-h-[90vh]
`;

// Input Fields: "Obsidian Void"
const inputContainer = "relative group";
const inputStyle = `
    w-full bg-[#050810] border border-white/5 rounded-2xl
    pl-12 pr-4 py-4 text-white font-medium
    shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]
    focus:outline-none focus:border-indigo-500/40 focus:bg-[#080c1a] 
    focus:shadow-[inset_0_2px_20px_rgba(0,0,0,0.6),0_0_30px_rgba(99,102,241,0.1)]
    transition-all duration-500 ease-out text-[14px] tracking-wide
    placeholder-slate-700
`;

const labelStyle = `
    block text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] mb-2 ml-4
`;

const iconStyle = `
    absolute top-[18px] left-4 text-slate-600 
    transition-all duration-500 w-5 h-5
    group-focus-within:text-indigo-300 group-focus-within:scale-110 
    group-focus-within:drop-shadow-[0_0_12px_rgba(129,140,248,0.8)]
`;

// Primary Action Button
const primaryButtonStyles = `
    relative w-full py-4 rounded-2xl font-bold text-sm text-white uppercase tracking-[0.2em]
    bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 background-animate
    shadow-[0_0_30px_rgba(79,70,229,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] 
    hover:shadow-[0_0_50px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
    border border-white/10 transition-all active:scale-[0.98]
    flex items-center justify-center gap-3 overflow-hidden group
    disabled:opacity-50 disabled:cursor-not-allowed
`;

// --- ANIMATION VARIANTS (BUTTERY FLUID) ---
const backdropVariants = {
    hidden: { opacity: 0, backdropFilter: "blur(0px)" },
    visible: { 
        opacity: 1, 
        backdropFilter: "blur(12px)",
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } 
    },
    exit: { 
        opacity: 0, 
        backdropFilter: "blur(0px)",
        transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } 
    }
};

const modalVariants = {
    hidden: { 
        opacity: 0, 
        scale: 0.92, 
        y: 20, 
        filter: "blur(8px)" // Liquid entrance effect
    },
    visible: { 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        filter: "blur(0px)",
        transition: { 
            type: "spring", 
            damping: 30, 
            stiffness: 400, 
            mass: 0.8 // Heavier mass for "buttery" feel
        } 
    },
    exit: { 
        opacity: 0, 
        scale: 0.96, 
        y: 10, 
        filter: "blur(8px)", // Liquid exit effect
        transition: { 
            duration: 0.25, 
            ease: "circOut" 
        } 
    }
};

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
    const [type, setType] = useState('image'); 
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

        if ((type === 'image' || type === 'combined') && !imageUrl) {
            setError("The Image URL is required for this banner type.");
            return;
        }
        if ((type === 'text' || type === 'combined') && !title && !message) {
            setError("Please provide at least a Title or a Message.");
            return;
        }

        const startDateObj = startDate ? new Date(startDate) : null;
        const endDateObj = endDate ? new Date(endDate) : null;

        if (startDate && isNaN(startDateObj.getTime())) { setError("Invalid start date."); return; }
        if (endDate && isNaN(endDateObj.getTime())) { setError("Invalid end date."); return; }
        if (startDateObj && endDateObj && startDateObj >= endDateObj) { setError("Start date must be before end date."); return; }

        setIsSaving(true);
        
        try {
            const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
            const payload = {
                type,
                startDate: startDateObj,
                endDate: endDateObj,
                linkUrl,
                linkLabel: (type !== 'image') ? linkLabel : '', 
            };

            if (type !== 'text') payload.imageUrl = imageUrl;
            if (type !== 'image') {
                payload.title = title;
                payload.message = message;
            }

            await setDoc(bannerDocRef, payload, { merge: true });

            showToast("Banner updated successfully!", "success");
            
            if (onSaveSuccess) onSaveSuccess();
            onClose();

        } catch (e) {
            console.error("Error saving banner settings:", e);
            setError("A server error occurred. Please try again.");
            showToast("Failed to save banner settings.", "error");
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 font-sans">
                    
                    {/* Backdrop: Liquid Blur */}
                    <motion.div 
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed inset-0 bg-[#02040a]/80"
                        onClick={onClose}
                    />

                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={modalBase}
                    >
                        {/* Atmospheric Glow */}
                        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] pointer-events-none mix-blend-screen" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

                        {/* --- HEADER --- */}
                        <div className="relative flex-none px-8 py-7 border-b border-white/5 z-20 flex justify-between items-center bg-[#0b1021]/80 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-pulse" />
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.25em]">Admin Control</span>
                                </div>
                                <h3 className="text-2xl font-light text-white tracking-tight">
                                    Edit <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-slate-400">Banner</span>
                                </h3>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="group p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all active:scale-90"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        {/* --- SCROLLABLE BODY --- */}
                        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                            
                            {/* TYPE SELECTOR (Glass Segmented Control) */}
                            <div className="p-1.5 bg-[#050810] border border-white/5 rounded-2xl flex relative shadow-inner">
                                <motion.div 
                                    className="absolute top-1.5 bottom-1.5 bg-[#1e293b] border border-white/10 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                    initial={false}
                                    animate={{ 
                                        left: type === 'image' ? '6px' : type === 'text' ? '33.33%' : '66.66%', 
                                        width: 'calc(33.33% - 4px)'
                                    }}
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-xl opacity-50" />
                                </motion.div>

                                {['image', 'text', 'combined'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setType(t)}
                                        className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                                            type === t ? 'text-white text-shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                    >
                                        {t === 'image' && <PhotoIcon className="w-4 h-4" />}
                                        {t === 'text' && <DocumentTextIcon className="w-4 h-4" />}
                                        {t === 'combined' && <Square2StackIcon className="w-4 h-4" />}
                                        {t}
                                    </button>
                                ))}
                            </div>

                            {/* SECTION: IMAGE INPUT */}
                            {type !== 'text' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {/* Preview Viewport */}
                                    <div className="w-full aspect-video bg-[#050810] rounded-3xl flex items-center justify-center overflow-hidden border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] group relative">
                                        {imageUrl && !imgLoadError ? (
                                            <>
                                                <img
                                                    src={imageUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                                                    onError={() => setImgLoadError(true)}
                                                />
                                                {/* Text Overlay Preview */}
                                                {type === 'combined' && (title || message) && (
                                                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#02040a] via-[#02040a]/80 to-transparent">
                                                        <div className="h-2.5 w-1/2 bg-white/20 rounded-full mb-3 backdrop-blur-sm"></div>
                                                        <div className="h-2 w-3/4 bg-white/10 rounded-full backdrop-blur-sm"></div>
                                                    </div>
                                                )}
                                                {/* Scanline Effect */}
                                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,3px_100%] pointer-events-none opacity-20" />
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-600">
                                                <PhotoIcon className="h-12 w-12 mb-3 opacity-30" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{imgLoadError ? "Connection Failed" : "Awaiting Visual Feed"}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* URL Input */}
                                    <div className={inputContainer}>
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => { setImageUrl(e.target.value); setImgLoadError(false); }}
                                            placeholder="https://..."
                                            className={inputStyle}
                                        />
                                        <div className={iconStyle}>
                                            <PhotoIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECTION: TEXT CONTENT */}
                            {type !== 'image' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 pt-2">
                                    <div className={inputContainer}>
                                        <label className={labelStyle}>Headline</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g. System Update"
                                            className={inputStyle}
                                        />
                                    </div>
                                    <div className={inputContainer}>
                                        <label className={labelStyle}>Body Transmission</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Brief description..."
                                            rows={2}
                                            className={`${inputStyle} h-auto resize-none`}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* SECTION: LINKS */}
                            <div className="space-y-6 pt-2 border-t border-white/5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className={`${inputContainer} col-span-1 sm:col-span-2`}>
                                        <label className={labelStyle}>Action Link</label>
                                        <input
                                            type="url"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="https://..."
                                            className={inputStyle}
                                        />
                                        <div className={iconStyle}>
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    {type !== 'image' && (
                                        <div className={`${inputContainer} col-span-1 sm:col-span-2`}>
                                            <label className={labelStyle}>Button Label</label>
                                            <input
                                                type="text"
                                                value={linkLabel}
                                                onChange={(e) => setLinkLabel(e.target.value)}
                                                placeholder="e.g. Initialize"
                                                className={inputStyle}
                                            />
                                            <div className={iconStyle}>
                                                <TagIcon className="w-5 h-5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION: DATES */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-white/5">
                                <div className={inputContainer}>
                                    <label className={labelStyle}>Start Sequence</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`${inputStyle} [color-scheme:dark]`}
                                    />
                                    <div className={iconStyle}><CalendarIcon className="w-5 h-5" /></div>
                                </div>
                                <div className={inputContainer}>
                                    <label className={labelStyle}>End Sequence</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`${inputStyle} [color-scheme:dark]`}
                                    />
                                    <div className={iconStyle}><CalendarIcon className="w-5 h-5" /></div>
                                </div>
                            </div>

                            {/* Error Alert */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center space-x-3 text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                                    >
                                        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* --- FOOTER ACTIONS --- */}
                        <div className="p-8 pt-4 grid grid-cols-2 gap-4 border-t border-white/5 mt-auto flex-shrink-0 bg-[#0b1021]/80 backdrop-blur-md z-20">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="w-full rounded-2xl bg-white/5 border border-white/5 px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-[0.15em] hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                Abort
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={primaryButtonStyles}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                <div className="relative flex items-center justify-center gap-2">
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Syncing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="w-5 h-5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]" strokeWidth={2.5} />
                                            <span>Execute</span>
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