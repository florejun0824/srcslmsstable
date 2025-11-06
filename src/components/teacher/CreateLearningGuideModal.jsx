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
    // --- MODIFIED: Added dark theme background ---
    <div className="flex h-full min-h-[500px] w-full items-center justify-center dark:bg-neumorphic-base-dark">
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
    
    // --- START OF REFACTOR: State management for robust retries ---
    const [generationResult, setGenerationResult] = useState({
        previewData: null, // Holds { generated_lessons: [...] }
        failedLessonNumber: null,
    });
    // This state will hold the AI-generated plan (e.g., [{"title": "Lesson 1..."}, {"title": "Lesson 2..."}])
    const [lessonPlan, setLessonPlan] = useState(null); 
    const [startLessonNumber, setStartLessonNumber] = useState(1);
    // --- END OF REFACTOR ---

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
        setStartLessonNumber(1);
        setLessonPlan(null); // --- REFACTOR: Reset lesson plan ---
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    const handleTopicSubmit = (submittedFormData) => {
        setGuideData(submittedFormData);
        setStartLessonNumber(1);
        setLessonPlan(null); // --- REFACTOR: Clear any old plan ---
        setGenerationResult({ previewData: null, failedLessonNumber: null }); // --- REFACTOR: Clear old results ---
        setCurrentStep('generation');
    };

    // --- REFACTOR: This now receives the lessonPlan from the generation screen ---
    const handleGenerationComplete = ({ previewData, failedLessonNumber, lessonPlan: completedPlan }) => {
        setGenerationResult({ previewData, failedLessonNumber });
        setLessonPlan(completedPlan); // Save the plan in case of retry
        setCurrentStep('preview');
    };
    
    const handleBackToEdit = () => {
        setCurrentStep('topic');
        // Keep guideData, but clear results and plan
        setGenerationResult({ previewData: null, failedLessonNumber: null });
        setLessonPlan(null);
    };

    // --- REFACTOR: This handler is now simpler ---
    const handleBackToGeneration = (failedLessonNum) => {
        setStartLessonNumber(failedLessonNum); // Set the lesson to restart from
        setCurrentStep('generation'); // Go back to the generation screen
        // We DON'T clear the lessonPlan or generationResult, as GenerationScreen will use them
    };

    const renderCurrentStep = () => {
        if (!subject || !unit) {
            return <LoadingFallback />;
        }

        switch (currentStep) {
            case 'generation':
                return (
                    <GenerationScreen
                        // --- REFACTOR: Use startLessonNumber and a key for proper re-triggering ---
                        key={startLessonNumber} 
                        subject={subject}
                        unit={unit}
                        guideData={guideData}
                        // --- REFACTOR: Pass all state needed for retries ---
                        initialLessonPlan={lessonPlan}
                        existingLessons={generationResult.previewData?.generated_lessons || []}
                        startLessonNumber={startLessonNumber}
                        onGenerationComplete={handleGenerationComplete}
                        onBack={() => setCurrentStep('topic')}
                    />
                );
            case 'preview':
                return (
                    <PreviewScreen
                        subject={subject}
                        unit={unit}
                        guideData={guideData}
                        generationResult={generationResult}
                        onBackToEdit={handleBackToEdit}
                        onBackToGeneration={handleBackToGeneration}
                        onClose={handleClose}
                    />
                );
            case 'topic':
            default:
                return (
                    <TopicSelectionScreen
                        subject={subject}
                        unit={unit}
                        initialData={guideData} 
                        onSubmit={handleTopicSubmit}
                    />
                );
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/80" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className="relative flex flex-col w-full h-full max-w-5xl max-h-[90vh] rounded-2xl bg-slate-200 shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] border border-slate-300/50 dark:bg-neumorphic-base-dark dark:shadow-lg dark:border-slate-700">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-slate-600 bg-slate-200 shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_3px_3px_6px_#bdc1c6,inset_-3px_-3px_6px_#ffffff] transition-shadow duration-150 z-10
                                   dark:bg-neumorphic-base-dark dark:text-slate-400 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark"
                        aria-label="Close"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                    <Suspense fallback={<LoadingFallback />}>
                        {renderCurrentStep()}
                    </Suspense>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}