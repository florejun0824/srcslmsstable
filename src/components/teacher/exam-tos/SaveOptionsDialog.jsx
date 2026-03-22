import React from 'react';
import { Dialog } from '@headlessui/react';
import {
    DocumentTextIcon,
    PuzzlePieceIcon,
    DocumentDuplicateIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { btnExtruded } from './examTosUtils';

export default function SaveOptionsDialog({ isOpen, onClose, onSave, themeStyles }) {
    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[120]">
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <Dialog.Panel
                    className="w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] p-6 sm:p-7 border transition-all duration-300"
                    style={{ backgroundColor: themeStyles.modalBg, borderColor: themeStyles.outline || themeStyles.borderColor }}
                >
                    {/* M3 Bottom sheet handle (mobile) */}
                    <div className="flex justify-center mb-4 sm:hidden">
                        <div className="w-8 h-1 rounded-full" style={{ backgroundColor: themeStyles.onSurfaceVariant || themeStyles.textColor, opacity: 0.3 }} />
                    </div>
                    <Dialog.Title className="text-xl font-semibold flex items-center gap-3" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)' }}>
                            <DocumentArrowDownIcon className="w-5 h-5" style={{ color: themeStyles.primary || '#818cf8' }} />
                        </div>
                        Save Options
                    </Dialog.Title>
                    <p className="text-sm mt-2 ml-[52px]" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>How would you like to save the generated exam?</p>
                    <div className="mt-5 space-y-1">
                        <button onClick={() => onSave('lesson')} className="w-full flex items-center gap-4 text-left p-3.5 rounded-2xl hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                                <DocumentTextIcon className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-medium text-[15px]">Viewable Lesson</p>
                                <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Saves as markdown pages for reading.</p>
                            </div>
                        </button>
                        <button onClick={() => onSave('quiz')} className="w-full flex items-center gap-4 text-left p-3.5 rounded-2xl hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                                <PuzzlePieceIcon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <p className="font-medium text-[15px]">Interactive Quiz</p>
                                <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Creates a playable quiz experience.</p>
                            </div>
                        </button>
                        <button onClick={() => onSave('both')} className="w-full flex items-center gap-4 text-left p-3.5 rounded-2xl hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(56,189,248,0.12)' }}>
                                <DocumentDuplicateIcon className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                                <p className="font-medium text-[15px]">Both Lesson & Quiz</p>
                                <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Creates both formats simultaneously.</p>
                            </div>
                        </button>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button onClick={onClose} className={`py-2.5 px-5 rounded-full text-sm font-medium ${btnExtruded}`} style={{ backgroundColor: themeStyles.innerPanelBg, color: themeStyles.onSurface || themeStyles.textColor, border: `1px solid ${themeStyles.outline || themeStyles.borderColor}` }}>Cancel</button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}
