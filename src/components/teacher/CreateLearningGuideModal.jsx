import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { Dialog } from '@headlessui/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../../contexts/ToastContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Spinner from '../common/Spinner';

// --- LAZY LOAD SCREENS ---
const TopicSelectionScreen = lazy(() => import('./TopicSelectionScreen'));
const GenerationScreen = lazy(() => import('./GenerationScreen'));
const PreviewScreen = lazy(() => import('./PreviewScreen'));

// --- FALLBACK ---
const LoadingFallback = () => (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center bg-white dark:bg-[#1C1C1E]">
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
    const [guideData, setGuideData] = useState(initialFormData); 
    
    const [generationResult, setGenerationResult] = useState({
        previewData: null, 
        failedLessonNumber: null,
    });
    
    const [lessonPlan, setLessonPlan] = useState(null); 
    const [startLessonNumber, setStartLessonNumber] = useState(1);

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
        setLessonPlan(null); 
    }, []);

    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    const handleTopicSubmit = (submittedFormData) => {
        setGuideData(submittedFormData);
        setStartLessonNumber(1);
        setLessonPlan(null); 
        setGenerationResult({ previewData: null, failedLessonNumber: null });
        setCurrentStep('generation');
    };

    const handleGenerationComplete = ({ previewData, failedLessonNumber, lessonPlan: completedPlan }) => {
        setGenerationResult({ previewData, failedLessonNumber });
        setLessonPlan(completedPlan); 
        setCurrentStep('preview');
    };
    
    const handleBackToEdit = () => {
        setCurrentStep('topic');
        setGenerationResult({ previewData: null, failedLessonNumber: null });
        setLessonPlan(null);
    };

    const handleBackToGeneration = (failedLessonNum) => {
        setStartLessonNumber(failedLessonNum); 
        setCurrentStep('generation'); 
    };

    const renderCurrentStep = () => {
        if (!subject || !unit) {
            return <LoadingFallback />;
        }

        switch (currentStep) {
            case 'generation':
                return (
                    <GenerationScreen
                        key={startLessonNumber} 
                        subject={subject}
                        unit={unit}
                        guideData={guideData}
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
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[100]">
            {/* 1. Standard Backdrop (No heavy blur/saturate) */}
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />
            
            {/* 2. Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
                <Dialog.Panel className="relative flex flex-col w-full h-full max-w-6xl max-h-[90vh] rounded-[2rem] bg-white dark:bg-[#1C1C1E] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all transform">
                    
                    {/* 3. Close Button (Integrated cleanly) */}
                    <button
                        onClick={handleClose}
                        className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors z-20"
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