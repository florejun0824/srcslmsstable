import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import {
    XMarkIcon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';

// --- Extracted Utilities & Logic ---
import {
    getThemeStyles,
    btnExtruded,
    btnDisabled,
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
            let stepOffset = 1; // step index offset (step 0 was TOS)
            for (const testType of testTypes) {
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");
                if (testType.numItems === 0) continue;

                // Mark current step active
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

                // Mark step as done
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
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[110]">
            {/* M3 Scrim */}
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

            {/* M3 Full-screen container */}
            <div className="fixed inset-0 lg:inset-4 flex flex-col z-[110]">
                <Dialog.Panel
                    className="relative flex flex-col h-full w-full overflow-hidden rounded-none lg:rounded-[28px] transition-colors duration-500"
                    onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: themeStyles.modalBg }}
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

                    {/* === M3 TOP APP BAR === */}
                    <div className="flex items-center gap-3 px-4 lg:px-6 h-16 lg:h-[72px] flex-shrink-0 border-b" style={{ borderColor: themeStyles.outline || themeStyles.borderColor }}>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors flex-shrink-0"
                            style={{ color: themeStyles.onSurface || themeStyles.textColor }}
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        <div className="flex-1 flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)' }}>
                                <ClipboardDocumentListIcon className="h-5 w-5" style={{ color: themeStyles.primary || '#818cf8' }} />
                            </div>
                            <div className="min-w-0">
                                <Dialog.Title className="text-base lg:text-lg font-semibold truncate" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Exam & TOS Generator</Dialog.Title>
                                <p className="text-xs truncate hidden sm:block" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Create a comprehensive exam and its Table of Specifications.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}>
                                <span>{totalConfiguredItems}</span>
                                <span className="font-normal" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>items</span>
                            </div>
                        </div>
                    </div>

                    {/* === CONTENT AREA === */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                            {!previewData ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
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

                    {/* === M3 BOTTOM ACTION BAR === */}
                    <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 border-t flex flex-col sm:flex-row sm:justify-end gap-3" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.modalBg }}>
                        {previewData ? (
                            <>
                                <button
                                    onClick={() => setPreviewData(null)}
                                    disabled={isSaving || isGenerating}
                                    className={`py-3 px-6 rounded-full text-sm font-medium border ${btnExtruded} ${btnDisabled} order-2 sm:order-1`}
                                    style={{ borderColor: themeStyles.outline || themeStyles.borderColor, color: themeStyles.onSurface || themeStyles.textColor, backgroundColor: 'transparent' }}
                                >
                                    Back to Edit
                                </button>
                                <button
                                    onClick={() => setIsSaveOptionsOpen(true)}
                                    disabled={!isValidPreview || isSaving || isGenerating}
                                    className={`py-3 px-6 rounded-full text-sm font-semibold text-white ${btnExtruded} ${btnDisabled} order-1 sm:order-2`}
                                    style={{ backgroundColor: themeStyles.primary || '#818cf8' }}
                                >
                                    {isSaving ? 'Saving...' : 'Accept & Save'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className={`py-3 px-6 rounded-full text-sm font-medium border ${btnExtruded} order-2 sm:order-1`}
                                    style={{ borderColor: themeStyles.outline || themeStyles.borderColor, color: themeStyles.onSurface || themeStyles.textColor, backgroundColor: 'transparent' }}
                                    onClick={handleClose}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`py-3 px-6 rounded-full text-sm font-semibold text-white ${btnExtruded} ${btnDisabled} order-1 sm:order-2`}
                                    style={{ backgroundColor: themeStyles.primary || '#818cf8' }}
                                    onClick={handleGenerate}
                                    disabled={!isValidForGeneration || isGenerating}
                                >
                                    {isGenerating ? 'Generating...' : 'Generate Exam & TOS'}
                                </button>
                            </>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}