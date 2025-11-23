import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog } from '@headlessui/react';
import {
    XMarkIcon, SparklesIcon, DocumentPlusIcon, ChevronRightIcon, BookOpenIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';

// Lazy load the main panel components
const AiLessonGenerator = lazy(() => import('./AiLessonGenerator'));
const ManualLessonCreator = lazy(() => import('./ManualLessonCreator'));

// Fallback component for Suspense
const LoadingPanel = () => (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <Spinner />
    </div>
);

// Component for the initial mode selection
const ModeSelection = ({ onSelect }) => (
    <div className="p-6 sm:p-12 flex flex-col h-full justify-center">
        <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-[22px] flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 ring-4 ring-white/20">
                <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
            <Dialog.Title as="h3" className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Create New Lesson
            </Dialog.Title>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Choose how you'd like to start building your lesson content today.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            {/* AI Option */}
            <button
                onClick={() => onSelect('ai')}
                className="group relative flex flex-col items-start text-left p-6 h-auto
                           bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-xl 
                           border border-white/20 dark:border-white/10
                           rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center mb-4 shadow-inner ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300">
                    <SparklesIcon className="w-6 h-6 text-[#007AFF] dark:text-blue-400" />
                </div>
                
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                    AI Assistant
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Instantly generate comprehensive lessons from a topic, document, or video link.
                </p>
                
                <div className="mt-auto flex items-center text-sm font-bold text-[#007AFF] dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                    Start with AI <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[3]" />
                </div>
            </button>

            {/* Manual Option */}
            <button
                onClick={() => onSelect('manual')}
                className="group relative flex flex-col items-start text-left p-6 h-auto
                           bg-white/60 dark:bg-[#2c2c2e]/60 backdrop-blur-xl 
                           border border-white/20 dark:border-white/10
                           rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 
                           hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/30 flex items-center justify-center mb-4 shadow-inner ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300">
                    <DocumentPlusIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                    Manual Creation
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Build your lesson from scratch, page by page, using our powerful rich text editor.
                </p>

                <div className="mt-auto flex items-center text-sm font-bold text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform">
                    Start Blank <ChevronRightIcon className="w-4 h-4 ml-1 stroke-[3]" />
                </div>
            </button>
        </div>
    </div>
);

export default function AddLessonModal({ isOpen, onClose, unitId, subjectId, setIsAiGenerating }) {
    const [creationMode, setCreationMode] = useState(null);

    const handleClose = useCallback(() => {
        setTimeout(() => {
            setCreationMode(null);
        }, 300);
        onClose();
    }, [onClose]);

    const getPanelClassName = () => {
        const baseClasses = "relative flex flex-col transition-all duration-300 ease-out overflow-hidden border border-white/20 dark:border-white/10 shadow-2xl shadow-black/20 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-2xl";
        
        switch (creationMode) {
            case 'ai':
                return `${baseClasses} w-full h-[100dvh] sm:h-[90vh] sm:max-w-6xl sm:rounded-[32px] bg-[#f5f5f7]/95 dark:bg-[#1c1c1e]/95`;
            case 'manual':
                return `${baseClasses} w-screen h-screen max-w-full max-h-screen rounded-none bg-[#f5f5f7] dark:bg-[#1c1c1e]`;
            default:
                return `${baseClasses} w-full max-w-3xl rounded-[32px] bg-white/80 dark:bg-[#1c1c1e]/80`;
        }
    };

    const renderContent = () => {
        switch (creationMode) {
            case 'ai':
                return <AiLessonGenerator onClose={handleClose} onBack={() => setCreationMode(null)} unitId={unitId} subjectId={subjectId} setIsAiGenerating={setIsAiGenerating} />;
            case 'manual':
                return <ManualLessonCreator onClose={handleClose} onBack={() => setCreationMode(null)} unitId={unitId} subjectId={subjectId} />;
            default:
                return <ModeSelection onSelect={setCreationMode} />;
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            {/* Ultra-smooth backdrop blur */}
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-0 sm:p-4">
                <Dialog.Panel className={getPanelClassName()}>
                    
                    {/* Floating Close Button (Only show on initial selection to keep UI clean, let sub-components handle their own back/close nav if needed, or keep it global) */}
                    {!creationMode && (
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 p-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all duration-200 text-slate-500 dark:text-slate-400 backdrop-blur-md z-20"
                            aria-label="Close"
                        >
                            <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    )}

                    <Suspense fallback={<LoadingPanel />}>
                        {renderContent()}
                    </Suspense>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}