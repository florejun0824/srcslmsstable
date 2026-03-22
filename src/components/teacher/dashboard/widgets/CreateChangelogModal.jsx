// src/components/teacher/dashboard/widgets/CreateChangelogModal.jsx
import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, AlertTriangle, Info } from 'lucide-react';
import { Fragment } from 'react';

export default function CreateChangelogModal({ isOpen, onClose, onPost }) {
    const [version, setVersion] = useState('');
    const [content, setContent] = useState('');
    const [isMajor, setIsMajor] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!version.trim() || !content.trim()) return;

        setIsSubmitting(true);
        const success = await onPost(version, content, isMajor);
        setIsSubmitting(false);

        if (success) {
            setVersion('');
            setContent('');
            setIsMajor(false);
            onClose();
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                <div className="fixed inset-0 bg-slate-900/95 dark:bg-[#050505]/95 transition-opacity duration-300 ease-in-out" />
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#0f0f11] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] transition-all ring-1 ring-slate-200/50 dark:ring-white/5 relative">
                                
                                {/* Inner Top Gradient Accent */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />

                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex flex-col">
                                        <Dialog.Title as="h3" className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                            Post System Update
                                        </Dialog.Title>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                            Broadcast global release notes to all educators.
                                        </p>
                                    </div>
                                    <button onClick={onClose} className="p-3 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                                        <X size={20} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2.5">
                                            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">Version Number</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g., 1.5.2 or The Glass Update" 
                                                value={version}
                                                onChange={(e) => setVersion(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-[#151518] border-0 ring-1 ring-inset ring-slate-200/60 dark:ring-white/5 rounded-2xl px-5 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                                                required
                                            />
                                        </div>

                                        <div className="flex flex-col justify-end">
                                            <label className="group flex items-center gap-4 cursor-pointer p-4 rounded-2xl bg-slate-50 dark:bg-[#151518] ring-1 ring-inset ring-slate-200/60 dark:ring-white/5 hover:ring-indigo-500/30 transition-all h-[56px]">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isMajor}
                                                    onChange={(e) => setIsMajor(e.target.checked)}
                                                    className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-600/50 bg-white dark:bg-[#0f0f11] transition-colors cursor-pointer"
                                                />
                                                <div className="flex flex-col justify-center">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-200 leading-none">Major Release</span>
                                                    <span className="text-[11px] font-medium text-slate-500 mt-1 leading-none">Highlights update prominently</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2.5">
                                        <label className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">Release Notes (Markdown)</span>
                                            <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 transition-colors uppercase tracking-wider">
                                                <Info size={14} /> Formatting Guide
                                            </a>
                                        </label>
                                        <div className="relative group">
                                            <textarea 
                                                placeholder="Write your beautifully structured release notes here..." 
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                rows={12}
                                                className="w-full bg-slate-50 dark:bg-[#151518] border-0 ring-1 ring-inset ring-slate-200/60 dark:ring-white/5 rounded-2xl p-5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-inset focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-[13px] leading-relaxed resize-y custom-scrollbar"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-amber-50 dark:bg-[#20150d] ring-1 ring-inset ring-amber-200/50 dark:ring-amber-900/40">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                                        <p className="text-[13px] text-amber-900 dark:text-amber-200/80 font-medium leading-relaxed">
                                            This changelog will be instantly broadcasted to <strong className="font-bold dark:text-amber-100">all educators</strong> across the platform. Please verify your markdown structure before finalizing.
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5 mt-4">
                                        <button 
                                            type="button" 
                                            onClick={onClose}
                                            className="px-6 py-3.5 rounded-2xl font-bold text-[13px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors uppercase tracking-wider"
                                        >
                                            Discard
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting || !version.trim() || !content.trim()}
                                            className="px-8 py-3.5 rounded-2xl font-bold text-[13px] text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] active:scale-95 uppercase tracking-wider"
                                        >
                                            {isSubmitting ? 'Finalizing...' : 'Deploy Update'}
                                            {!isSubmitting && <Send size={16} strokeWidth={2.5} />}
                                        </button>
                                    </div>
                                    
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
