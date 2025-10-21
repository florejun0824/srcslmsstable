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
        <Dialog.Title as="h3" className="text-2xl font-bold text-center text-slate-800 mb-2">
            Create New Lesson
        </Dialog.Title>
        <p className="text-center text-slate-500 mb-8">How would you like to build your lesson?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
                onClick={() => onSelect('ai')}
                className="group flex flex-col items-center justify-center p-6 bg-neumorphic-base rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset text-center"
            >
                <div className="p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-full mb-4">
                    <SparklesIcon className="w-8 h-8 text-sky-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">AI-Assisted Creation</h4>
                <p className="text-sm text-slate-700">Generate a lesson from a topic, document, or YouTube video.</p>
                <ChevronRightIcon className="w-6 h-6 text-slate-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
                onClick={() => onSelect('manual')}
                className="group flex flex-col items-center justify-center p-6 bg-neumorphic-base rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset text-center"
            >
                <div className="p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-full mb-4">
                    <DocumentPlusIcon className="w-8 h-8 text-green-700" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">Manual Creation</h4>
                <p className="text-sm text-slate-700">Build your lesson page by page with our rich content editor.</p>
                <ChevronRightIcon className="w-6 h-6 text-slate-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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
        switch (creationMode) {
            case 'ai':
                return "w-screen h-screen max-w-full max-h-screen md:max-w-6xl md:max-h-[90vh] md:rounded-2xl bg-neumorphic-base shadow-neumorphic p-6 flex flex-col";
            case 'manual':
                return "w-screen h-screen max-w-full max-h-screen rounded-none bg-neumorphic-base shadow-neumorphic p-6 flex flex-col";
            default:
                return "w-full max-w-2xl rounded-2xl bg-neumorphic-base shadow-neumorphic";
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
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className={`relative transition-all duration-300 ease-in-out ${getPanelClassName()}`}>
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-6 h-6 text-slate-600" />
                    </button>
                    <Suspense fallback={<LoadingPanel />}>
                        {renderContent()}
                    </Suspense>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}