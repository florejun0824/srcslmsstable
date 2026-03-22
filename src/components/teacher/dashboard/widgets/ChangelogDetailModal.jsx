// src/components/teacher/dashboard/widgets/ChangelogDetailModal.jsx
import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Sparkles } from 'lucide-react';
import { Fragment } from 'react';
import ReactMarkdown from 'react-markdown';

const TimelineMarkdownRenderer = React.memo(({ content, primaryColor = '#6366f1' }) => {
    if (!content) return null;
    return (
        <ReactMarkdown
            components={{
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" style={{color: primaryColor}} className="hover:underline font-bold transition-colors" onClick={(e) => e.stopPropagation()} />,
                p: ({node, ...props}) => <p {...props} className="mb-4 last:mb-0 text-sm md:text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed font-sans" />,
                h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-black mt-6 mb-4 text-slate-900 dark:text-white tracking-tight" />,
                h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mt-5 mb-3 text-slate-800 dark:text-white" />,
                h3: ({node, ...props}) => <h3 {...props} className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100" />,
                ul: ({node, ...props}) => <ul {...props} className="space-y-3 my-4" />,
                ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5 my-4 space-y-3 text-sm md:text-[15px] font-medium text-slate-700 dark:text-slate-200" />,
                li: ({node, ...props}) => (
                    <div className="group flex gap-4 p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md">
                        <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-[#121212] shadow-sm border border-slate-100 dark:border-white/5">
                            <Check size={14} style={{ color: primaryColor }} strokeWidth={3} />
                        </div>
                        <div className="flex-1 text-sm md:text-[15px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed transition-colors">
                            {props.children}
                        </div>
                    </div>
                ),
                strong: ({node, ...props}) => <strong {...props} className="font-extrabold text-slate-900 dark:text-white" />,
                em: ({node, ...props}) => <em {...props} className="italic text-slate-600 dark:text-slate-400" />,
                hr: ({node, ...props}) => <hr {...props} className="my-6 border-t border-slate-200 dark:border-white/10" />,
                blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 pl-4 py-2 italic my-4 bg-slate-50 dark:bg-white/5 rounded-r-lg text-slate-600 dark:text-slate-400" style={{borderLeftColor: primaryColor}} />,
                code: ({node, inline, ...props}) => inline 
                    ? <code {...props} className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono font-semibold" style={{color: primaryColor}} /> 
                    : <pre className="bg-slate-900 dark:bg-black/50 p-4 rounded-xl overflow-x-auto text-[13px] font-mono text-slate-300 my-4 shadow-inner ring-1 ring-white/10"><code {...props} /></pre>
            }}
        >
            {content}
        </ReactMarkdown>
    );
});

export default function ChangelogDetailModal({ isOpen, onClose, log }) {
    if (!log) return null;

    const formatTime = (ts) => {
        if (!ts) return "Just now";
        try {
            const date = ts?.toDate ? ts.toDate() : new Date(ts);
            if (isNaN(date.getTime())) return "Unknown Date";
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch(e) {
            return "Just now";
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm transition-opacity" />
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#121212] shadow-2xl transition-all border border-slate-200/50 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5">
                                
                                {/* Header */}
                                <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <Dialog.Title as="h3" className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                Version {log.version}
                                            </Dialog.Title>
                                            {log.isMajor && (
                                                <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5">
                                                    <Sparkles size={10} /> Major
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-slate-500">{formatTime(log.createdAt)}</p>
                                    </div>
                                    <button onClick={onClose} className="p-3 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-500 transition-colors">
                                        <X size={20} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-8 sm:p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="prose prose-slate dark:prose-invert max-w-none">
                                        <TimelineMarkdownRenderer content={log.content} />
                                    </div>
                                    
                                    {log.authorName && (
                                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    {log.authorName.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Deployed By</span>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{log.authorName}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
