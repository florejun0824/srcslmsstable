import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
    XMarkIcon, DocumentPlusIcon, ChevronRightIcon, DocumentArrowUpIcon, SparklesIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';

// Lazy load the main panel components
const AiQuizGenerator = lazy(() => import('./AiQuizGenerator'));
const ManualQuizCreator = lazy(() => import('./ManualQuizCreator'));

// Fallback component for Suspense
const LoadingPanel = () => (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Spinner />
    </div>
);

// --- REDESIGNED MODE SELECTION ---
const ModeSelection = ({ onSelect }) => (
    <div className="p-8 sm:p-12 flex flex-col h-full justify-center">
        <div className="text-center mb-10">
            <Dialog.Title as="h3" className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                New Quiz
            </Dialog.Title>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Choose how you'd like to create your assessment today.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            {/* AI Option */}
            <button
                onClick={() => onSelect('ai')}
                className="group relative flex flex-col items-start text-left p-6 h-auto
                           bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-xl 
                           border border-white/20 dark:border-white/10
                           rounded-[32px] shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 
                           transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30 ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                    <SparklesIcon className="w-7 h-7 text-white" />
                </div>
                
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                    AI Generator
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                    Upload a document (PDF, DOCX) and let AI generate questions automatically.
                </p>
                
                <div className="mt-auto flex items-center text-sm font-bold text-[#007AFF] dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    Generate with AI <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[2.5]" />
                </div>
            </button>

            {/* Manual Option */}
            <button
                onClick={() => onSelect('manual')}
                className="group relative flex flex-col items-start text-left p-6 h-auto
                           bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-xl 
                           border border-white/20 dark:border-white/10
                           rounded-[32px] shadow-sm hover:shadow-2xl hover:shadow-green-500/10 
                           transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300">
                    <DocumentPlusIcon className="w-7 h-7 text-white" />
                </div>
                
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                    Manual Creation
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                    Build your quiz question-by-question using our visual editor.
                </p>

                <div className="mt-auto flex items-center text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    Start Blank <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[2.5]" />
                </div>
            </button>
        </div>
    </div>
);

export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
    const [creationMode, setCreationMode] = useState(null);
    const [generatedQuizData, setGeneratedQuizData] = useState(null);

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
        const baseClasses = "relative flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-2xl";
        
        switch (creationMode) {
            case 'ai':
                return `${baseClasses} w-full max-w-5xl rounded-[32px] bg-[#f5f5f7]/90 dark:bg-[#1c1c1e]/90 min-h-[600px]`;
            case 'manual':
                return `${baseClasses} w-screen h-screen max-w-full max-h-screen rounded-none bg-[#f5f5f7] dark:bg-[#1c1c1e]`;
            default:
                return `${baseClasses} w-full max-w-3xl rounded-[36px] bg-white/80 dark:bg-[#1c1c1e]/80`;
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
                return <ModeSelection onSelect={setCreationMode} />;
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            {/* Ultra-smooth backdrop blur */}
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
                <DialogPanel className={getPanelClassName()}>
                    
                    {/* Floating Close Button */}
                    <button
                        onClick={handleClose}
                        className={`absolute top-6 right-6 z-20 p-2.5 rounded-full transition-all duration-200 backdrop-blur-md group
                            ${creationMode === 'manual' 
                                ? 'bg-white/80 dark:bg-black/50 text-slate-500 hover:text-red-500 hover:bg-white shadow-sm border border-black/5 dark:border-white/10' 
                                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400'
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