import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog } from '@headlessui/react';
import {
    XMarkIcon, SparklesIcon, DocumentPlusIcon, ChevronRightIcon
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
    <div className="p-8">
        {/* --- MODIFIED: Added dark theme text --- */}
        <Dialog.Title as="h3" className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
            Create New Lesson
        </Dialog.Title>
        {/* --- MODIFIED: Added dark theme text --- */}
        <p className="text-center text-slate-500 dark:text-slate-400 mb-8">How would you like to build your lesson?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
                onClick={() => onSelect('ai')}
                // --- MODIFIED: Added dark theme styles ---
                className="group flex flex-col items-center justify-center p-6 bg-neumorphic-base rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset text-center
                           dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
            >
                {/* --- MODIFIED: Added dark theme styles --- */}
                <div className="p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-full mb-4
                                dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                    {/* --- MODIFIED: Added dark theme icon --- */}
                    <SparklesIcon className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                </div>
                {/* --- MODIFIED: Added dark theme text --- */}
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">AI-Assisted Creation</h4>
                {/* --- MODIFIED: Added dark theme text --- */}
                <p className="text-sm text-slate-600 dark:text-slate-300">Generate a lesson from a topic, document, or YouTube video.</p>
                {/* --- MODIFIED: Added dark theme icon --- */}
                <ChevronRightIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
                onClick={() => onSelect('manual')}
                // --- MODIFIED: Added dark theme styles ---
                className="group flex flex-col items-center justify-center p-6 bg-neumorphic-base rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset text-center
                           dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
            >
                {/* --- MODIFIED: Added dark theme styles --- */}
                <div className="p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-full mb-4
                                dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                    {/* --- MODIFIED: Added dark theme icon --- */}
                    <DocumentPlusIcon className="w-8 h-8 text-green-700 dark:text-green-500" />
                </div>
                {/* --- MODIFIED: Added dark theme text --- */}
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Manual Creation</h4>
                {/* --- MODIFIED: Added dark theme text --- */}
                <p className="text-sm text-slate-600 dark:text-slate-300">Build your lesson page by page with our rich content editor.</p>
                {/* --- MODIFIED: Added dark theme icon --- */}
                <ChevronRightIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        </div>
    </div>
);


export default function AddLessonModal({ isOpen, onClose, unitId, subjectId, setIsAiGenerating }) {
    const [creationMode, setCreationMode] = useState(null);

    const handleClose = useCallback(() => {
        // Add a delay to allow animations to finish before resetting state
        setTimeout(() => {
            setCreationMode(null);
        }, 300);
        onClose();
    }, [onClose]);

    const getPanelClassName = () => {
        // --- MODIFIED: Added dark theme styles to all cases ---
        switch (creationMode) {
            case 'ai':
                return "w-screen h-screen max-w-full max-h-screen md:max-w-6xl md:max-h-[90vh] md:rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-lg p-6 flex flex-col";
            case 'manual':
                return "w-screen h-screen max-w-full max-h-screen rounded-none bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-lg p-6 flex flex-col";
            default:
                return "w-full max-w-2xl rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-lg";
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
            {/* --- MODIFIED: Added dark theme backdrop --- */}
            <div className="fixed inset-0 bg-black/30 dark:bg-black/80 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className={`relative transition-all duration-300 ease-in-out ${getPanelClassName()}`}>
                    <button
                        onClick={handleClose}
                        // --- MODIFIED: Added dark theme styles ---
                        className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset
                                   dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                        aria-label="Close"
                    >
                        {/* --- MODIFIED: Added dark theme icon --- */}
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                    <Suspense fallback={<LoadingPanel />}>
                        {renderContent()}
                    </Suspense>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}