import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
    XMarkIcon, DocumentPlusIcon, ChevronRightIcon, DocumentArrowUpIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';
import { useTheme } from '../../contexts/ThemeContext'; // 1. Import Theme Context

// Lazy load the main panel components
const AiQuizGenerator = lazy(() => import('./AiQuizGenerator'));
const ManualQuizCreator = lazy(() => import('./ManualQuizCreator'));

// --- HELPER: MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay) return null;

    const base = {
        // Modal Container (Selection Mode)
        container: "backdrop-blur-xl shadow-2xl border", 
        // Solid Background (Editor Mode - No Blur for performance)
        solidBg: "bg-[#0f172a]", 
        textTitle: "text-white",
        textSub: "text-white/60",
        card: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white shadow-lg",
        iconBox: "bg-white/10 ring-white/10 text-white",
        accentText: "text-white",
        closeBtn: "bg-white/10 hover:bg-white/20 text-white border-transparent"
    };

    switch (activeOverlay) {
        case 'christmas':
            return {
                ...base,
                container: `${base.container} bg-[#0f172a]/95 border-emerald-500/20 shadow-emerald-900/20`,
                solidBg: "bg-[#020617]", // Deepest Blue/Green
                accentIcon: "text-emerald-400",
            };
        case 'valentines':
            return {
                ...base,
                container: `${base.container} bg-[#2c0b0e]/95 border-rose-500/20 shadow-rose-900/20`,
                solidBg: "bg-[#1f0508]", // Deepest Red
                accentIcon: "text-rose-400",
            };
        case 'graduation':
            return {
                ...base,
                container: `${base.container} bg-[#1a1400]/95 border-amber-500/20 shadow-amber-900/20`,
                solidBg: "bg-[#140f00]", // Deepest Gold
                accentIcon: "text-amber-400",
            };
        case 'rainy':
            return {
                ...base,
                container: `${base.container} bg-[#061816]/95 border-teal-500/20 shadow-teal-900/20`,
                solidBg: "bg-[#020909]", // Deepest Teal
                accentIcon: "text-teal-400",
            };
        case 'cyberpunk':
            return {
                ...base,
                container: `${base.container} bg-[#180a20]/95 border-fuchsia-500/20 shadow-fuchsia-900/20`,
                solidBg: "bg-[#0d0312]", // Deepest Purple
                accentIcon: "text-fuchsia-400",
            };
        case 'spring':
            return {
                ...base,
                container: `${base.container} bg-[#1f0f15]/95 border-pink-500/20 shadow-pink-900/20`,
                solidBg: "bg-[#120509]", // Deepest Pink
                accentIcon: "text-pink-400",
            };
        case 'space':
            return {
                ...base,
                container: `${base.container} bg-[#020617]/95 border-indigo-500/20 shadow-indigo-900/20`,
                solidBg: "bg-[#00020a]", // Deepest Void
                accentIcon: "text-indigo-400",
            };
        default:
            return null;
    }
};

// Fallback component for Suspense
const LoadingPanel = () => (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Spinner />
    </div>
);

// --- REDESIGNED MODE SELECTION ---
const ModeSelection = ({ onSelect, monet }) => {
    // Default Styles (Candy)
    const defaultCardClass = "bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10";
    const defaultTitle = "text-slate-900 dark:text-white";
    const defaultText = "text-slate-500 dark:text-slate-400";
    const defaultIconBox = "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30 ring-white/20";
    const defaultGreenIconBox = "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 ring-white/20";

    return (
        <div className="p-8 sm:p-12 flex flex-col h-full justify-center">
            <div className="text-center mb-10">
                <Dialog.Title as="h3" className={`text-3xl font-bold mb-3 tracking-tight ${monet ? monet.textTitle : 'text-slate-900 dark:text-white'}`}>
                    New Quiz
                </Dialog.Title>
                <p className={`text-lg max-w-md mx-auto leading-relaxed ${monet ? monet.textSub : 'text-slate-500 dark:text-slate-400'}`}>
                    Choose how you'd like to create your assessment today.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                {/* AI Option */}
                <button
                    onClick={() => onSelect('ai')}
                    className={`group relative flex flex-col items-start text-left p-6 h-auto
                           rounded-[32px] transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                           ${monet ? monet.card : defaultCardClass}`}
                >
                    {!monet && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
                    
                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mb-5 shadow-lg ring-1 group-hover:scale-110 transition-transform duration-300 ${monet ? monet.iconBox : defaultIconBox}`}>
                        <SparklesIcon className={`w-7 h-7 ${monet ? monet.accentIcon : 'text-white'}`} />
                    </div>
                    
                    <h4 className={`text-xl font-bold mb-2 tracking-tight ${monet ? monet.textTitle : defaultTitle}`}>
                        AI Generator
                    </h4>
                    <p className={`text-sm leading-relaxed mb-6 font-medium ${monet ? monet.textSub : defaultText}`}>
                        Upload a document (PDF, DOCX) and let AI generate questions automatically.
                    </p>
                    
                    <div className={`mt-auto flex items-center text-sm font-bold group-hover:translate-x-1 transition-transform ${monet ? monet.accentText : 'text-[#007AFF] dark:text-blue-400'}`}>
                        Generate with AI <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[2.5]" />
                    </div>
                </button>

                {/* Manual Option */}
                <button
                    onClick={() => onSelect('manual')}
                    className={`group relative flex flex-col items-start text-left p-6 h-auto
                           rounded-[32px] transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden
                           ${monet ? monet.card : defaultCardClass}`}
                >
                    {!monet && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}

                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center mb-5 shadow-lg ring-1 group-hover:scale-110 transition-transform duration-300 ${monet ? monet.iconBox : defaultGreenIconBox}`}>
                        <DocumentPlusIcon className={`w-7 h-7 ${monet ? monet.accentIcon : 'text-white'}`} />
                    </div>
                    
                    <h4 className={`text-xl font-bold mb-2 tracking-tight ${monet ? monet.textTitle : defaultTitle}`}>
                        Manual Creation
                    </h4>
                    <p className={`text-sm leading-relaxed mb-6 font-medium ${monet ? monet.textSub : defaultText}`}>
                        Build your quiz question-by-question using our visual editor.
                    </p>

                    <div className={`mt-auto flex items-center text-sm font-bold group-hover:translate-x-1 transition-transform ${monet ? monet.accentText : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Start Blank <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[2.5]" />
                    </div>
                </button>
            </div>
        </div>
    );
};

export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
    const [creationMode, setCreationMode] = useState(null);
    const [generatedQuizData, setGeneratedQuizData] = useState(null);
    
    // Theme Context
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    const handleClose = useCallback(() => {
        setTimeout(() => {
            setCreationMode(null);
            setGeneratedQuizData(null);
        }, 300);
        onClose();
    }, [onClose]);

    const handleAiComplete = (quizData) => {
        setGeneratedQuizData(quizData);
        setCreationMode('manual');
    };

    const handleBack = () => {
        setCreationMode(null);
        setGeneratedQuizData(null);
    };

    const getPanelClassName = () => {
        const baseClasses = "relative flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/5";
        
        // Background Logic
        const selectionBg = monet ? monet.container : 'bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800';
        const editorBg = monet ? `${monet.solidBg} border border-white/10 text-white` : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] border border-slate-200 dark:border-slate-800';

        switch (creationMode) {
            case 'ai':
                return `${baseClasses} w-full max-w-5xl rounded-[32px] min-h-[600px] ${editorBg}`;
            case 'manual':
                return `${baseClasses} w-screen h-screen max-w-full max-h-screen rounded-none ${editorBg}`;
            default:
                return `${baseClasses} w-full max-w-3xl rounded-[36px] ${selectionBg}`;
        }
    };

    const renderContent = () => {
        switch (creationMode) {
            case 'ai':
                return <AiQuizGenerator
                            onBack={handleBack}
                            onAiComplete={handleAiComplete}
                        />;
            case 'manual':
                return <ManualQuizCreator
                            onBack={handleBack}
                            onClose={handleClose}
                            unitId={unitId}
                            subjectId={subjectId}
                            initialData={generatedQuizData}
                        />;
            default:
                return <ModeSelection onSelect={setCreationMode} monet={monet} />;
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            {/* Backdrop */}
            <div className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ${monet ? 'bg-black/60' : 'bg-black/20 dark:bg-black/60'}`} aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
                <DialogPanel className={getPanelClassName()}>
                    
                    {/* Floating Close Button */}
                    <button
                        onClick={handleClose}
                        className={`absolute top-6 right-6 z-20 p-2.5 rounded-full transition-all duration-200 group
                            ${creationMode === 'manual' 
                                ? 'bg-white text-slate-500 hover:text-red-500 hover:bg-red-50 shadow-sm border border-slate-200' 
                                : (monet ? monet.closeBtn : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400')
                            }`}
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-5 h-5 stroke-[2.5] group-hover:scale-110 transition-transform" />
                    </button>

                    <Suspense fallback={<LoadingPanel />}>
                        {renderContent()}
                    </Suspense>
                </DialogPanel>
            </div>
        </Dialog>
    );
}