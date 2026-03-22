// src/components/teacher/dashboard/widgets/ChangelogTimelineModal.jsx
import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Trash2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

// Removed inline markdown renderer to simplify the Timeline view

export default function ChangelogTimelineModal({ isOpen, onClose, changelogs, isLoading, isAdmin, onOpenCreate, onDelete, onSelectLog }) {
    
    // Helper to format timestamp securely based on firestore structure
    const formatTime = (ts) => {
        if (!ts) return "Just now";
        try {
            const date = ts?.toDate ? ts.toDate() : new Date(ts);
            if (isNaN(date.getTime())) return "Unknown Date";
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch(e) {
            return "Just now";
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9990]" onClose={onClose}>
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" />
                <div className="fixed inset-0 overflow-hidden flex justify-center">
                    
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 translate-y-10 scale-95"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-10 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] mt-[5vh] mx-4 transform flex flex-col rounded-[2.5rem] bg-slate-50 dark:bg-[#0a0a0a] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/50 dark:border-white/10 relative overflow-hidden">
                            
                            {/* Header */}
                            <div className="shrink-0 p-6 sm:px-10 sm:py-8 border-b border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl flex items-center justify-between z-20">
                                <div className="flex flex-col">
                                    <Dialog.Title as="h2" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        System Updates
                                    </Dialog.Title>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Evolution timeline and unified patch notes</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isAdmin && (
                                        <button 
                                            onClick={onOpenCreate}
                                            className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-transform hover:scale-105"
                                        >
                                            <Plus size={16} /> <span className="hidden sm:inline">New Update</span>
                                        </button>
                                    )}
                                    <button onClick={onClose} className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500 transition-colors">
                                        <X size={20} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            {/* Timeline Content Feed */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 relative">
                                
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4">
                                        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                        <p className="text-slate-500 font-bold animate-pulse">Fetching history...</p>
                                    </div>
                                ) : changelogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto opacity-70">
                                        <AlertCircle className="w-16 h-16 text-slate-400 mb-4" strokeWidth={1.5} />
                                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No updates recorded</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">System updates posted by the administrators will appear organized here.</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-4 sm:pl-8">
                                        {/* Master Timeline Track */}
                                        <div className="absolute top-4 bottom-8 left-6 sm:left-10 w-0.5 bg-gradient-to-b from-indigo-500 via-slate-300 dark:via-white/10 to-transparent rounded-full" />
                                        
                                        <div className="flex flex-col gap-12">
                                            {changelogs.map((log, index) => (
                                                <div key={log.id} className="relative pl-10 sm:pl-14">
                                                    
                                                    {/* Timeline Node Node */}
                                                    <div className="absolute left-[-16px] sm:left-[-12px] top-4 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-[3px] border-slate-100 dark:border-[#0a0a0a] shadow-sm flex items-center justify-center z-10">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${log.isMajor ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                            {log.isMajor ? <Sparkles size={12} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400" />}
                                                        </div>
                                                    </div>

                                                    {/* Release Card Button */}
                                                    <button 
                                                        onClick={() => onSelectLog(log)}
                                                        className="w-full text-left bg-white dark:bg-[#18181b]/80 border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-5px_rgba(99,102,241,0.15)] hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all duration-300 group relative flex flex-col gap-3"
                                                    >
                                                        
                                                        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-2 mb-2 w-full">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Version {log.version}</span>
                                                                {log.isMajor && (
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
                                                                        Major Release
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{formatTime(log.createdAt)}</span>
                                                                {isAdmin && (
                                                                    <div 
                                                                        onClick={(e) => { e.stopPropagation(); onDelete(log.id); }}
                                                                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 z-20"
                                                                        title="Delete Update"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Stripped Markdown Preview */}
                                                        <div className="text-[13px] md:text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                                                            {log.content.replace(/[*#_`]/g, '')}
                                                        </div>

                                                        {/* View Details Tag */}
                                                        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
                                                            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest group-hover:tracking-[0.15em] transition-all duration-300">
                                                                Read Full Release Notes &rarr;
                                                            </span>
                                                        </div>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
