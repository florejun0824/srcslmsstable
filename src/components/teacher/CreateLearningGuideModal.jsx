import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';

// --- VITE OPTIMIZATION: Lazy load each step of the modal ---
const TopicSelectionScreen = lazy(() => import('./TopicSelectionScreen'));
const GenerationScreen = lazy(() => import('./GenerationScreen'));
const PreviewScreen = lazy(() => import('./PreviewScreen'));

// Fallback for Suspense
const LoadingFallback = () => (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center">
        <Spinner />
    </div>
);

const initialFormData = {
    content: '',
    lessonCount: 1,
    learningCompetencies: '',
    contentStandard: '',
    performanceStandard: '',
    language: 'English',
    gradeLevel: '7',
};

export default function CreateLearningGuideModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    
    const [currentStep, setCurrentStep] = useState('topic'); // topic, generation, preview
    const [guideData, setGuideData] = useState(initialFormData); // This holds the user's form input from step 1
    const [generationResult, setGenerationResult] = useState({
        previewData: null,
        failedLessonNumber: null,
    });
    
    // Data fetched once and passed down
    const [subject, setSubject] = useState(null);
    const [unit, setUnit] = useState(null);

    useEffect(() => {
        if (isOpen && subjectId && unitId) {
            const fetchData = async () => {
                try {
                    const subjectRef = doc(db, 'courses', subjectId);
                    const unitRef = doc(db, 'units', unitId);
                    
                    const [subjectSnap, unitSnap] = await Promise.all([
                        getDoc(subjectRef),
                        getDoc(unitRef)
                    ]);

                    if (subjectSnap.exists()) setSubject({ id: subjectSnap.id, ...subjectSnap.data() });
                    if (unitSnap.exists()) setUnit({ id: unitSnap.id, ...unitSnap.data() });

                } catch (error) {
                    console.error("Failed to fetch subject or unit data:", error);
                    showToast("Could not load necessary data for the generator.", "error");
                }
            };
            fetchData();
        }
    }, [isOpen, subjectId, unitId, showToast]);


    const resetState = useCallback(() => {
        setCurrentStep('topic');
        setGuideData(initialFormData);
        setGenerationResult({ previewData: null, failedLessonNumber: null });
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    const handleTopicSubmit = (submittedFormData) => {
        setGuideData(submittedFormData);
        setCurrentStep('generation');
    };

    const handleGenerationComplete = ({ previewData, failedLessonNumber }) => {
        setGenerationResult({ previewData, failedLessonNumber });
        setCurrentStep('preview');
    };
    
    // --- BUG FIX ---
    // This function now correctly takes the user back to the topic screen.
    const handleBackToEdit = () => {
        setCurrentStep('topic');
        // We keep the guideData so the form is pre-filled for editing
        setGenerationResult({ previewData: null, failedLessonNumber: null });
    };

    const renderCurrentStep = () => {
        if (!subject || !unit) {
            return <LoadingFallback />;
        }

        switch (currentStep) {
            case 'generation':
                return (
                    <GenerationScreen
                        subject={subject}
                        unit={unit}
                        guideData={guideData}
                        onGenerationComplete={handleGenerationComplete}
                        onBack={() => setCurrentStep('topic')}
                    />
                );
            case 'preview':
                return (
                    <PreviewScreen
                        subject={subject}
                        unit={unit}
                        generationResult={generationResult}
                        onBackToEdit={handleBackToEdit} // Correct handler passed
                        onClose={handleClose}
                    />
                );
            case 'topic':
            default:
                return (
                    <TopicSelectionScreen
                        subject={subject}
                        unit={unit}
                        // Pass existing form data back to the topic screen for editing
                        initialData={guideData} 
                        onSubmit={handleTopicSubmit}
                    />
                );
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl bg-zinc-50/90 backdrop-blur-2xl border border-white/20 shadow-xl">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-500 bg-zinc-200/80 hover:bg-zinc-300/80 z-10"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-5 w-5" />
                    </button>
                    <Suspense fallback={<LoadingFallback />}>
                        {renderCurrentStep()}
                    </Suspense>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}