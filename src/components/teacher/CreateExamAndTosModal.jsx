// src/components/teacher/dashboard/views/courses/CreateExamAndTosModal.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import {
    XMarkIcon,
    ClipboardDocumentListIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';

// --- Extracted Utilities & Logic ---
import {
    getThemeStyles,
    calculateItemsForRange,
    extractJson,
    tryParseJson,
    roundPercentagesToSum100,
    gradeLevels,
} from './exam-tos/examTosUtils';
import { getTosPlannerPrompt } from './exam-tos/examTosPrompts';
import { generateExamComponent } from './exam-tos/examTosGeneration';
import { saveAsLesson, saveAsQuiz } from './exam-tos/examTosSaveHandlers';

// --- Extracted UI Sub-Components ---
import ExamConfigPanel from './exam-tos/ExamConfigPanel';
import SourceContentPanel from './exam-tos/SourceContentPanel';
import GradeLevelPanel from './exam-tos/GradeLevelPanel';
import TestStructurePanel from './exam-tos/TestStructurePanel';
import ExamPreview from './exam-tos/ExamPreview';
import SaveOptionsDialog from './exam-tos/SaveOptionsDialog';
import ExamGenerationOverlay from './exam-tos/ExamGenerationOverlay';

// --- MAIN COMPONENT ---

export default function CreateExamAndTosModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme();
    const themeStyles = getThemeStyles(activeOverlay);

    // --- Form State ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [previewData, setPreviewData] = useState(null);
    const [language, setLanguage] = useState('English');
    const [learningCompetencies, setLearningCompetencies] = useState('');
    const [testTypes, setTestTypes] = useState([]);
    const [totalHours, setTotalHours] = useState('');
    const [gradeLevel, setGradeLevel] = useState('');
    const [isSaveOptionsOpen, setIsSaveOptionsOpen] = useState(false);

    // --- Generation Progress State ---
    const [generationSteps, setGenerationSteps] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const isGenerationRunning = useRef(false);

    useEffect(() => {
        return () => { isGenerationRunning.current = false; };
    }, []);

    // Auto-detect grade level from selected course
    useEffect(() => {
        if (selectedCourse?.gradeLevel) {
            const found = gradeLevels.find(g => selectedCourse.gradeLevel.includes(g));
            setGradeLevel(found || selectedCourse.gradeLevel);
        }
    }, [selectedCourse]);

    const handleClose = useCallback(() => {
        isGenerationRunning.current = false;
        onClose();
    }, [onClose]);

    // --- Test Type Handlers ---
    const handleTestTypeChange = (index, field, value) => {
        const updatedTestTypes = [...testTypes];
        updatedTestTypes[index][field] = value;
        if (field === 'range') {
            updatedTestTypes[index].numItems = calculateItemsForRange(value);
        }
        setTestTypes(updatedTestTypes);
    };

    const addTestType = () => {
        setTestTypes([...testTypes, { type: 'Multiple Choice', range: '', numItems: 0 }]);
    };

    const removeTestType = (index) => {
        setTestTypes(testTypes.filter((_, i) => i !== index));
    };

    // --- Derived State ---
    const totalConfiguredItems = testTypes.reduce((sum, current) => sum + Number(current.numItems || 0), 0);
    const isValidForGeneration = totalConfiguredItems > 0 && selectedLessons.length > 0 && learningCompetencies.trim() !== '';
    const isValidPreview = previewData?.tos?.header && previewData?.examQuestions?.length > 0;

    // --- GENERATION HANDLER ---
    const handleGenerate = async () => {
        if (!selectedCourse || selectedLessons.length === 0 || learningCompetencies.trim() === '') {
            showToast("Please select a source subject, at least one lesson, and provide learning competencies.", "error");
            return;
        }
        setIsGenerating(true);
        isGenerationRunning.current = true;
        setPreviewData(null);

        // Build generation steps for the overlay
        const steps = [
            { label: 'Generating Table of Specifications', status: 'active' },
            ...testTypes.filter(tt => tt.numItems > 0).map(tt => ({
                label: `Generating ${tt.type} (Items ${tt.range})`,
                status: 'pending'
            }))
        ];
        setGenerationSteps(steps);
        setCurrentStepIndex(0);

        const combinedContent = selectedLessons.flatMap(lesson => lesson.pages?.map(page => page.content) || []).join('\n\n');
        const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');
        const formattedTestStructure = testTypes.map(tt => `${tt.type}: ${tt.numItems} items (from range(s) ${tt.range})`).join('; ');

        const guideData = {
            learningCompetencies, language, totalHours, totalConfiguredItems,
            formattedTestStructure, selectedCourse, selectedLessons,
            combinedContent, combinedLessonTitles, gradeLevel
        };

        let generatedTos = null;
        let allGeneratedQuestions = [];

        try {
            // --- STEP 1: TOS PLANNER ---
            const tosPrompt = getTosPlannerPrompt(guideData);

            if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
            const tosResponse = await callGeminiWithLimitCheck(tosPrompt, { forceTier: 'logic' });
            if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");

            const parsedTosData = tryParseJson(extractJson(tosResponse));

            if (parsedTosData.tos && parsedTosData.tos.competencyBreakdown) {
                const roundedBreakdown = roundPercentagesToSum100(parsedTosData.tos.competencyBreakdown);
                parsedTosData.tos.competencyBreakdown = roundedBreakdown;
                const breakdown = parsedTosData.tos.competencyBreakdown;
                const calculatedTotalHours = breakdown.reduce((sum, row) => sum + Number(row.noOfHours || 0), 0);
                const calculatedTotalItems = breakdown.reduce((sum, row) => sum + Number(row.noOfItems || 0), 0);
                parsedTosData.tos.totalRow = {
                    ...parsedTosData.tos.totalRow,
                    hours: String(calculatedTotalHours),
                    weightPercentage: "100%",
                    noOfItems: calculatedTotalItems,
                };

                generatedTos = parsedTosData.tos;

                setPreviewData({
                    examTitle: parsedTosData.examTitle,
                    tos: generatedTos,
                    examQuestions: []
                });

                if (calculatedTotalItems !== totalConfiguredItems) {
                    showToast(`Warning: AI generated ${calculatedTotalItems} items, but ${totalConfiguredItems} were requested.`, "warning", 6000);
                }
            } else {
                throw new Error("AI failed to return a valid TOS structure.");
            }

            // Mark TOS step as done
            setGenerationSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'done' } : s));

            // --- STEP 2: MICRO-WORKERS ---
            let stepOffset = 1;
            for (const testType of testTypes) {
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
                if (testType.numItems === 0) continue;

                setCurrentStepIndex(stepOffset);
                setGenerationSteps(prev => prev.map((s, i) =>
                    i === stepOffset ? { ...s, status: 'active' } : s
                ));

                const previousQuestionsSummary = allGeneratedQuestions
                    .map(q => `- ${q.question} (Type: ${q.type})`)
                    .join('\n');

                const componentData = await generateExamComponent(
                    guideData, generatedTos, testType,
                    previousQuestionsSummary, isGenerationRunning
                );

                if (componentData && componentData.questions) {
                    allGeneratedQuestions.push(...componentData.questions);
                    setPreviewData(prev => ({
                        ...prev,
                        examQuestions: [...allGeneratedQuestions]
                    }));
                }

                setGenerationSteps(prev => prev.map((s, i) =>
                    i === stepOffset ? { ...s, status: 'done' } : s
                ));
                stepOffset++;
            }

            if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
            showToast("Exam and TOS generated successfully!", "success");

        } catch (err) {
            if (err.message && err.message.includes("aborted")) {
                console.log("Generation loop aborted by user.");
                showToast("Generation cancelled.", "warning");
            } else {
                console.error("Generation error:", err);
                showToast(`Generation failed: ${err.message}`, "error", 15000);
            }
        } finally {
            setIsGenerating(false);
            isGenerationRunning.current = false;
            setGenerationSteps([]);
        }
    };

    // --- SAVE HANDLER ---
    const handleFinalSave = async (saveType) => {
        if (!previewData) {
            showToast("No exam data to save.", "error");
            return;
        }
        if (!unitId || !subjectId) {
            showToast("Save failed: Unit ID or Subject ID is missing.", "error");
            return;
        }

        setIsSaveOptionsOpen(false);
        setIsSaving(true);
        showToast("Saving...", "info");

        try {
            if (saveType === 'lesson') {
                await saveAsLesson(previewData, language, subjectId, unitId);
                showToast("Exam saved as a viewable lesson!", "success");
            } else if (saveType === 'quiz') {
                await saveAsQuiz(previewData, language, subjectId, unitId);
                showToast("Exam saved as an interactive quiz!", "success");
            } else if (saveType === 'both') {
                await saveAsLesson(previewData, language, subjectId, unitId);
                try {
                    await saveAsQuiz(previewData, language, subjectId, unitId);
                    showToast("Saved as both a lesson and a quiz!", "success");
                } catch (quizError) {
                    console.error("Quiz save error:", quizError);
                    showToast(`Lesson saved, but quiz failed: ${quizError.message}`, "warning", 8000);
                }
            }
            handleClose();
        } catch (err) {
            console.error("Save error:", err);
            showToast(`Failed to save: ${err.message}`, "error", 8000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelGeneration = useCallback(() => {
        isGenerationRunning.current = false;
    }, []);

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[9999]">
            {/* GPU-Lite Overlay: Solid color with opacity */}
            <div 
                className="fixed inset-0 bg-slate-900/60 transition-opacity" 
                aria-hidden="true" 
            />

            {/* Modal Container: Native slide-up animation, sharp shadows, flat colors */}
            <div className="fixed inset-0 z-10 flex items-end sm:items-center justify-center sm:p-6 pointer-events-none">
<Dialog.Panel
    className="relative w-full lg:w-[calc(100vw-2rem)] xl:w-[calc(100vw-3rem)] max-w-[1920px] bg-white dark:bg-slate-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col h-[95vh] sm:h-[90vh] lg:h-[calc(100vh-2rem)] xl:h-[calc(100vh-3rem)] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 pointer-events-auto"
>
                    {/* Enhanced Loading Overlay */}
                    <ExamGenerationOverlay
                        isVisible={isGenerating || isSaving}
                        isSaving={isSaving}
                        generationSteps={generationSteps}
                        currentStepIndex={currentStepIndex}
                        onCancel={handleCancelGeneration}
                    />

                    {/* Save Options Dialog */}
                    {isSaveOptionsOpen && (
                        <SaveOptionsDialog
                            isOpen={isSaveOptionsOpen}
                            onClose={() => setIsSaveOptionsOpen(false)}
                            onSave={handleFinalSave}
                            themeStyles={themeStyles}
                        />
                    )}

                    {/* === HEADER: Clean, Linear-style === */}
                    <div className="flex-none px-6 pt-6 pb-5 sm:px-8 sm:pt-8 flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 z-10">
                        <div className="flex gap-4 sm:gap-5 items-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/30 shrink-0">
                                <ClipboardDocumentListIcon className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
                            </div>
                            <div className="min-w-0 pr-2">
                                <Dialog.Title className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Exam & TOS Generator
                                </Dialog.Title>
                                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[250px] sm:max-w-md">
                                    Create a comprehensive exam and its Table of Specifications.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {/* Item Count Badge */}
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{totalConfiguredItems}</span>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items</span>
                            </div>
                            
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="p-2 sm:p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border border-slate-200/50 dark:border-slate-800 shrink-0 active:scale-95"
                            >
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>
                    </div>

								{/* === CONTENT AREA: Solid lite background === */}
								<div className="flex-1 overflow-y-auto hide-scrollbar relative z-10 bg-slate-50/50 dark:bg-slate-900/30">
								    {/* Updated from max-w-7xl to max-w-[1800px] w-full */}
								    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] w-full mx-auto space-y-6">
								        {!previewData ? (
								            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 xl:gap-12">
								                {/* LEFT COLUMN */}
                                    <div className="space-y-5">
                                        <ExamConfigPanel
                                            totalConfiguredItems={totalConfiguredItems}
                                            totalHours={totalHours}
                                            setTotalHours={setTotalHours}
                                            language={language}
                                            setLanguage={setLanguage}
                                            themeStyles={themeStyles}
                                        />
                                        <SourceContentPanel
                                            learningCompetencies={learningCompetencies}
                                            setLearningCompetencies={setLearningCompetencies}
                                            selectedCourse={selectedCourse}
                                            setSelectedCourse={setSelectedCourse}
                                            setSelectedLessons={setSelectedLessons}
                                            themeStyles={themeStyles}
                                        />
                                    </div>

                                    {/* RIGHT COLUMN */}
                                    <div className="space-y-5">
                                        <GradeLevelPanel
                                            gradeLevel={gradeLevel}
                                            setGradeLevel={setGradeLevel}
                                            themeStyles={themeStyles}
                                        />
                                        <TestStructurePanel
                                            testTypes={testTypes}
                                            onTestTypeChange={handleTestTypeChange}
                                            onAddTestType={addTestType}
                                            onRemoveTestType={removeTestType}
                                            totalConfiguredItems={totalConfiguredItems}
                                            themeStyles={themeStyles}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <ExamPreview
                                    previewData={previewData}
                                    language={language}
                                    themeStyles={themeStyles}
                                />
                            )}
                        </div>
                    </div>

                    {/* === FOOTER ACTIONS: Clean separation === */}
                    <div className="flex-none px-5 py-4 sm:px-8 sm:py-5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 z-10">
                        <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
                            {previewData ? (
                                <>
                                    <button
                                        onClick={() => setPreviewData(null)}
                                        disabled={isSaving || isGenerating}
                                        className="px-6 py-3 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
                                    >
                                        Back to Edit
                                    </button>
                                    <button
                                        onClick={() => setIsSaveOptionsOpen(true)}
                                        disabled={!isValidPreview || isSaving || isGenerating}
                                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                                    >
                                        {isSaving ? 'Saving...' : 'Accept & Save'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="px-6 py-3 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95 order-2 sm:order-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={!isValidForGeneration || isGenerating}
                                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 order-1 sm:order-2 ${
                                            !isValidForGeneration || isGenerating
                                                ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800'
                                                : 'bg-gradient-to-b from-indigo-500 to-purple-600 text-white shadow-[0_8px_20px_rgba(99,102,241,0.3)] border-t border-white/20 hover:scale-[1.02]'
                                        }`}
                                    >
                                        {isGenerating ? (
                                            'Generating...'
                                        ) : (
                                            <>
                                                <SparklesIcon className="w-5 h-5 stroke-[2]" />
                                                <span className="tracking-wide">Generate Exam & TOS</span>
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}