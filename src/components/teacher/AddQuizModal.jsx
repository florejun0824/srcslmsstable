import React, { useState, useCallback, Suspense, lazy } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import {
    XMarkIcon, SparklesIcon, DocumentPlusIcon, ChevronRightIcon, DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner'; // Adjust path if needed

// Lazy load the main panel components
const AiQuizGenerator = lazy(() => import('./AiQuizGenerator')); // <-- NEW
const ManualQuizCreator = lazy(() => import('./ManualQuizCreator')); // <-- NEW (was AddQuizModal)

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
            Create New Quiz
        </Dialog.Title>
        <p className="text-center text-slate-500 mb-8">How would you like to build your quiz?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
                onClick={() => onSelect('ai')}
                className="group flex flex-col items-center justify-center p-6 bg-neumorphic-base rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset text-center"
            >
                <div className="p-4 bg-neumorphic-base shadow-neumorphic-inset rounded-full mb-4">
                    <DocumentArrowUpIcon className="w-8 h-8 text-sky-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-1">Upload & AI Generate</h4>
                <p className="text-sm text-slate-700">Generate a quiz from a DOCX, PDF, or TXT file.</p>
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
                <p className="text-sm text-slate-700">Build your quiz question by question with the editor.</p>
                <ChevronRightIcon className="w-6 h-6 text-slate-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
        </div>
    </div>
);


export default function AddQuizModal({ isOpen, onClose, unitId, subjectId }) {
    const [creationMode, setCreationMode] = useState(null);
    // State to hold AI-generated data to pass to the manual editor
    const [generatedQuizData, setGeneratedQuizData] = useState(null);

    const handleClose = useCallback(() => {
        // Add a delay to allow animations to finish before resetting state
        setTimeout(() => {
            setCreationMode(null);
            setGeneratedQuizData(null); // Clear generated data
        }, 300);
        onClose();
    }, [onClose]);

    // This is the new data flow: AI -> Manual Editor
    const handleAiComplete = (quizData) => {
        setGeneratedQuizData(quizData); // Store the generated data
        setCreationMode('manual'); // Switch to the manual editor
    };

    const handleBack = () => {
        setCreationMode(null);
        setGeneratedQuizData(null); // Clear data when going back
    };

	const getPanelClassName = () => {
	        switch (creationMode) {
	            case 'ai':
	                // AI generator panel
	                return "w-full max-w-4xl rounded-2xl bg-neumorphic-base shadow-neumorphic p-6 flex flex-col";
	            case 'manual':
	                // --- MODIFICATION: Make Manual Creator Full Screen ---
	                return "w-screen h-screen max-w-full max-h-screen rounded-none bg-neumorphic-base shadow-neumorphic flex flex-col transition-all";
	                // --- END MODIFICATION ---
	            default:
	                // Selection panel
	                return "w-full max-w-2xl rounded-2xl bg-neumorphic-base shadow-neumorphic";
	        }
	    };

    const renderContent = () => {
        switch (creationMode) {
            case 'ai':
                return <AiQuizGenerator
                            onBack={handleBack}
                            onAiComplete={handleAiComplete} // Pass the new handler
                        />;
            case 'manual':
                return <ManualQuizCreator
                            onBack={handleBack}
                            onClose={handleClose}
                            unitId={unitId}
                            subjectId={subjectId}
                            initialData={generatedQuizData} // Pass generated data as a prop
                        />;
            default:
                return <ModeSelection onSelect={setCreationMode} />;
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className={`relative transition-all duration-300 ease-in-out ${getPanelClassName()}`}>
                    <button
                        onClick={handleClose}
                        // Use neumorphic style for AI/Manual, but keep original for selection
                        className={`absolute top-4 right-4 z-10 p-2 rounded-full
                            ${creationMode === 'manual' 
                                ? 'h-10 w-10 flex items-center justify-center bg-slate-200 text-slate-600 shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]' 
                                : 'bg-neumorphic-base shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset'
                            }`}
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-6 h-6 text-slate-600" />
                    </button>
                    <Suspense fallback={<LoadingPanel />}>
                        {renderContent()}
                    </Suspense>
                </DialogPanel>
            </div>
        </Dialog>
    );
}