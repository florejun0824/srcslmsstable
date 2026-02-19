// src/components/quizzes/AddQuizModal.jsx
import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog } from '@headlessui/react';
import {
    SparklesIcon,
    DocumentPlusIcon,
    AcademicCapIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import { useTheme } from '../../contexts/ThemeContext';

// Lazy load panels
const AiQuizGenerator = lazy(() => import('./AiQuizGenerator'));
const ManualQuizCreator = lazy(() => import('./ManualQuizCreator'));

// --- MACOS UI COMPONENTS ---

const MacTrafficLights = ({ onClose }) => (
    <div className="flex gap-2 group px-4 z-50">
        <button 
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] flex items-center justify-center hover:brightness-90 transition-all shadow-sm"
        >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c0b0b]">✕</span>
        </button>
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] flex items-center justify-center shadow-sm cursor-default">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c3e0b]">-</span>
        </div>
        <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] flex items-center justify-center shadow-sm cursor-default">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#0b4c14]">＋</span>
        </div>
    </div>
);

// List Row Item (System Settings Style)
const MacOptionRow = ({ title, description, icon: Icon, color, onClick, delay }) => (
    <button
        onClick={onClick}
        style={{ animationDelay: `${delay}ms` }}
        className="group w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                   bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm
                   hover:bg-blue-500 hover:border-blue-500 hover:shadow-md
                   active:scale-[0.99] animate-in slide-in-from-right-4 fade-in fill-mode-backwards"
    >
        <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm
            ${color} group-hover:bg-white/20 group-hover:text-white transition-colors
        `}>
            <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 text-left">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-white transition-colors">
                {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-100 transition-colors line-clamp-1">
                {description}
            </p>
        </div>

        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-white/80 transition-colors" />
    </button>
);

// --- SCREENS ---

const ModeSelection = ({ onSelect }) => (
    <div className="flex flex-col md:flex-row h-full w-full">
        {/* LEFT SIDEBAR */}
        <div className="w-full md:w-[260px] flex-none bg-gray-50/80 dark:bg-black/20 backdrop-blur-md border-r border-gray-200/50 dark:border-white/5 p-6 md:p-8 flex flex-col justify-between">
            <div>
                <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg flex items-center justify-center mb-6 ring-1 ring-black/5 dark:ring-white/10">
                    <AcademicCapIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight mb-2">
                    Create <br /> Quiz
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Select a method to generate assessment content.
                </p>
            </div>
            
            <div className="hidden md:block">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Quiz Engine v3.1</p>
            </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 p-6 md:p-10 flex flex-col justify-center bg-white dark:bg-[#1e1e1e]">
            <div className="space-y-4 max-w-md mx-auto w-full">
                <MacOptionRow
                    title="AI Generator"
                    description="Upload docs (PDF, DOCX) to auto-create questions."
                    icon={SparklesIcon}
                    color="bg-gradient-to-br from-blue-500 to-purple-600"
                    onClick={() => onSelect('ai')}
                    delay={100}
                />
                
                <MacOptionRow
                    title="Manual Editor"
                    description="Build questions one by one with visual tools."
                    icon={DocumentPlusIcon}
                    color="bg-gradient-to-br from-emerald-500 to-teal-600"
                    onClick={() => onSelect('manual')}
                    delay={200}
                />
            </div>
        </div>
    </div>
);

const AiLimitationWarning = ({ onConfirm, onCancel }) => (
    <div className="flex flex-col h-full w-full items-center justify-center p-8 bg-white dark:bg-[#1e1e1e]">
        <div className="max-w-md w-full text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-6 text-amber-500 dark:text-amber-400">
                <ExclamationTriangleIcon className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Limitation Notice
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
                The AI Generator is optimized for text-based content. Please note:
            </p>

            <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-left mb-8 shadow-sm">
                <ul className="space-y-3">
                    <li className="flex items-start text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        <span className="mr-2 text-amber-500">•</span>
                        <span><strong>Math & Chemistry:</strong> Complex formulas may not parse correctly.</span>
                    </li>
                    <li className="flex items-start text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        <span className="mr-2 text-amber-500">•</span>
                        <span><strong>Images:</strong> Diagrams in uploaded files are ignored.</span>
                    </li>
                </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={onCancel}
                    className="py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="py-2.5 px-4 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                    Proceed Anyway
                </button>
            </div>
        </div>
    </div>
);

// Fallback Loading
const LoadingPanel = () => (
    <div className="flex h-full w-full items-center justify-center">
        <Spinner />
    </div>
);

export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
    const [creationMode, setCreationMode] = useState(null);
    const [showWarning, setShowWarning] = useState(false);
    
    // Theme Context
    const { darkMode } = useTheme();

    const handleClose = useCallback(() => {
        setTimeout(() => {
            setCreationMode(null);
            setShowWarning(false);
        }, 300);
        onClose();
    }, [onClose]);

    // Mode Interception
    const handleModeSelect = (mode) => {
        if (mode === 'ai') {
            setShowWarning(true); // Show warning inside the modal
        } else {
            setCreationMode(mode);
        }
    };

    const confirmAiMode = () => {
        setShowWarning(false);
        setCreationMode('ai');
    };

    const cancelAiMode = () => {
        setShowWarning(false);
    };

    const handleBack = () => {
        setCreationMode(null);
        setShowWarning(false);
    };

    // --- DYNAMIC LAYOUT CLASSES ---

    const getWindowClasses = () => {
        const base = `
            relative flex flex-col overflow-hidden 
            transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
            bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-2xl
            shadow-2xl ring-1 ring-black/10 dark:ring-white/10
        `;

        if (creationMode) {
            // FULL SCREEN MODE:
            return `${base} w-screen h-[100dvh] rounded-none max-w-none`;
        }

        // SELECTION / WARNING MODE (Compact):
        return `${base} w-full max-w-2xl rounded-xl h-[450px]`;
    };

    const wrapperClasses = `
        fixed inset-0 z-[100] flex items-center justify-center 
        transition-all duration-500
        ${creationMode ? 'p-0' : 'p-4 sm:p-6'} 
    `;

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[100]">
            
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] transition-opacity duration-300" 
                aria-hidden="true" 
            />
            
            <div className={wrapperClasses}>
                <Dialog.Panel className={getWindowClasses()}>
                    
                    {/* --- HEADER --- */}
                    <div className={`flex-none h-10 flex items-center justify-between z-50 select-none 
                        ${creationMode ? 'bg-white/50 dark:bg-black/20 border-b border-gray-200/50 dark:border-white/5' : 'absolute top-0 left-0 w-full'}`}>
                        
                        <MacTrafficLights onClose={handleClose} />
                        
                        {/* Title only in Compact Mode */}
                        {!creationMode && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide opacity-80 uppercase">
                                    {showWarning ? 'Notice' : 'Quiz Studio'}
                                </span>
                            </div>
                        )}
                        
                        <div className="w-16" /> 
                    </div>

                    {/* --- BODY (Scrollable) --- */}
                    <div className="flex-1 w-full relative overflow-hidden bg-white dark:bg-[#1e1e1e]">
                        <Suspense fallback={<LoadingPanel />}>
                            
                            {/* Render Warning First */}
                            {showWarning ? (
                                <AiLimitationWarning 
                                    onConfirm={confirmAiMode}
                                    onCancel={cancelAiMode}
                                />
                            ) : (
                                <>
                                    {creationMode === 'ai' && (
                                        <div className="w-full h-full overflow-y-auto custom-scrollbar">
                                            <AiQuizGenerator 
                                                onBack={handleBack} 
                                                // Note: You might need to adjust AiQuizGenerator to accept onBack properly
                                                // or handle completion differently
                                            />
                                        </div>
                                    )}
                                    
                                    {creationMode === 'manual' && (
                                        <div className="w-full h-full overflow-y-auto custom-scrollbar">
                                            <ManualQuizCreator 
                                                onBack={handleBack} 
                                                onClose={handleClose}
                                                unitId={unitId}
                                                subjectId={subjectId}
                                            />
                                        </div>
                                    )}

                                    {!creationMode && (
                                        <ModeSelection onSelect={handleModeSelect} />
                                    )}
                                </>
                            )}
                        </Suspense>
                    </div>
                    
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}