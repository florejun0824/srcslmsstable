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
    LinkIcon,
    CalendarIcon,
    DevicePhoneMobileIcon,
    ComputerDesktopIcon,
    DocumentTextIcon,
    SwatchIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../../../contexts/ToastContext';

// --- OPTIMIZED ANIMATIONS (GPU Friendly) ---
// We removed 'filter' transitions to fix the lag.
const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { duration: 0.2 } 
    },
    exit: { 
        opacity: 0, 
        transition: { duration: 0.2, delay: 0.1 } 
    }
};

const modalVariants = {
    hidden: { 
        opacity: 0, 
        scale: 0.95, 
        y: 20 
    },
    visible: { 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            mass: 0.8 
        } 
    },
    exit: { 
        opacity: 0, 
        scale: 0.95, 
        y: 10,
        transition: { duration: 0.2 } 
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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'mobile'

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
        }
    }, [isOpen, currentImageUrl, currentStartDate, currentEndDate, currentType, currentTitle, currentMessage, currentLinkUrl, currentLinkLabel]);

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e) => e.key === 'Escape' && onClose();
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSave = async () => {
        setError('');
        
        // Basic Validation
        if ((type === 'image' || type === 'combined') && !imageUrl) {
            setError("Image URL is required for this layout.");
            return;
        }
        if ((type === 'text' || type === 'combined') && (!title && !message)) {
            setError("Please provide content for the text layout.");
            return;
        }

        const startObj = startDate ? new Date(startDate) : null;
        const endObj = endDate ? new Date(endDate) : null;

        if (startObj && endObj && startObj >= endObj) {
            setError("Start date must be before end date.");
            return;
        }

        setIsSaving(true);

        try {
            const bannerRef = doc(db, "bannerSettings", "mainBanner");
            const payload = {
                type,
                startDate: startObj,
                endDate: endObj,
                linkUrl,
                linkLabel: type !== 'image' ? linkLabel : '',
            };

            if (type !== 'text') payload.imageUrl = imageUrl;
            if (type !== 'image') {
                payload.title = title;
                payload.message = message;
            }

            await setDoc(bannerRef, payload, { merge: true });
            showToast("Banner Configuration Synced", "success");
            if (onSaveSuccess) onSaveSuccess();
            onClose();

        } catch (e) {
            console.error(e);
            setError("Synchronization failed. Check console.");
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 overflow-hidden">
                    
                    {/* Backdrop */}
                    <motion.div
                        variants={overlayVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                        className="fixed inset-0 bg-[#000000]/60 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative w-full h-full sm:h-auto sm:max-h-[90vh] md:max-w-5xl bg-[#090c14] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
                    >
                        {/* --- TOP BAR --- */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#090c14] z-20 shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-white tracking-wide">Banner Editor</h2>
                                <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">Configuration & Preview</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* --- CONTENT GRID --- */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            
                            {/* LEFT COLUMN: LIVE PREVIEW (Sticky on Desktop) */}
                            <div className="md:w-5/12 lg:w-1/2 bg-[#020408] border-b md:border-b-0 md:border-r border-white/5 relative group flex flex-col">
                                {/* Preview Controls */}
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    <div className="bg-[#1a1f2e] p-1 rounded-lg border border-white/5 flex">
                                        <button 
                                            onClick={() => setPreviewMode('desktop')}
                                            className={`p-1.5 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <ComputerDesktopIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setPreviewMode('mobile')}
                                            className={`p-1.5 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <DevicePhoneMobileIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* The Rendered Preview */}
                                <div className="flex-1 flex items-center justify-center p-8 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-100">
                                    <div 
                                        className={`transition-all duration-500 ease-in-out relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 bg-[#0f1422] ${
                                            previewMode === 'mobile' ? 'w-[280px] aspect-[9/16]' : 'w-full aspect-video'
                                        }`}
                                    >
                                        {/* Mock Content Inside Preview */}
                                        {type !== 'text' && imageUrl && (
                                            <img src={imageUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                                        )}
                                        
                                        {(type !== 'image') && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 flex flex-col justify-end items-start">
                                                {title && <h3 className="text-white font-bold text-lg mb-1 leading-tight">{title}</h3>}
                                                {message && <p className="text-slate-300 text-xs mb-3 line-clamp-2">{message}</p>}
                                                {linkLabel && (
                                                    <span className="px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded-full uppercase tracking-wide">
                                                        {linkLabel}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        
                                        {!imageUrl && type !== 'text' && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                                <PhotoIcon className="w-12 h-12 mb-2 opacity-20" />
                                                <span className="text-[10px] uppercase tracking-widest opacity-40">No Signal</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="p-4 border-t border-white/5 bg-[#050810]">
                                    <p className="text-[10px] text-center text-slate-500 font-mono">LIVE RENDERING • 60 FPS</p>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: CONTROLS (Scrollable) */}
                            <div className="md:w-7/12 lg:w-1/2 overflow-y-auto custom-scrollbar bg-[#090c14]">
                                <div className="p-6 md:p-8 space-y-8">
                                    
                                    {/* Layout Selector */}
                                    <section>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 block">Layout Mode</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'image', icon: PhotoIcon, label: 'Visual' },
                                                { id: 'text', icon: DocumentTextIcon, label: 'Textual' },
                                                { id: 'combined', icon: SwatchIcon, label: 'Hybrid' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setType(opt.id)}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${
                                                        type === opt.id 
                                                            ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/20' 
                                                            : 'bg-[#0f1422] border-white/5 text-slate-500 hover:border-white/10 hover:bg-[#161b2c]'
                                                    }`}
                                                >
                                                    <opt.icon className="w-5 h-5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Dynamic Inputs */}
                                    <div className="space-y-5">
                                        {type !== 'text' && (
                                            <div className="group">
                                                <div className="flex justify-between mb-2">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Image Source</label>
                                                    <span className="text-[10px] text-indigo-400/80 cursor-pointer hover:underline">Browse Library</span>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={imageUrl}
                                                        onChange={(e) => setImageUrl(e.target.value)}
                                                        placeholder="https://..."
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                                                    />
                                                    <PhotoIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                                                </div>
                                            </div>
                                        )}

                                        {type !== 'image' && (
                                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="group">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Headline</label>
                                                    <input
                                                        type="text"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all font-medium"
                                                    />
                                                </div>
                                                <div className="group">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Body Content</label>
                                                    <textarea
                                                        value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                        rows={3}
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all resize-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action & Schedule */}
                                    <div className="pt-6 border-t border-white/5 space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="group">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Action URL</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={linkUrl}
                                                        onChange={(e) => setLinkUrl(e.target.value)}
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 pl-11 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                                                    />
                                                    <LinkIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
                                                </div>
                                            </div>
                                            {type !== 'image' && (
                                                <div className="group">
                                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Button Label</label>
                                                    <input
                                                        type="text"
                                                        value={linkLabel}
                                                        onChange={(e) => setLinkLabel(e.target.value)}
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="group">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Start Date</label>
                                                <div className="relative">
                                                    <input
                                                        type="datetime-local"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 pl-11 text-xs text-white focus:border-indigo-500/50 focus:outline-none transition-all [color-scheme:dark]"
                                                    />
                                                    <CalendarIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-600" />
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">End Date</label>
                                                <div className="relative">
                                                    <input
                                                        type="datetime-local"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="w-full bg-[#050810] border border-white/10 rounded-xl px-4 py-3 pl-11 text-xs text-white focus:border-indigo-500/50 focus:outline-none transition-all [color-scheme:dark]"
                                                    />
                                                    <CalendarIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Error Message */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
                                            >
                                                <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                                                <span className="text-red-400 text-xs font-bold uppercase">{error}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* --- FOOTER ACTION BAR --- */}
                        <div className="p-5 border-t border-white/5 bg-[#090c14] flex justify-end gap-4 shrink-0 z-20">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="relative overflow-hidden px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <CheckIcon className="w-4 h-4" />
                                )}
                                <span>{isSaving ? 'Syncing...' : 'Save Changes'}</span>
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