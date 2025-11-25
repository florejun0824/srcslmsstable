import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { useToast } from '../../contexts/ToastContext';
import { useCourseData } from '../../hooks/useCourseData';
import SourceContentSelector from '../../hooks/SourceContentSelector';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// Import Firebase Firestore functions for saving
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Helper functions
const extractJson = (text) => {
    let match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) match = text.match(/```([\s\S]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    return null;
};

export default function CreateAtgModal({ isOpen, onClose, subjectId, unitId }) {
    const { showToast } = useToast();
    
    // --- iPadOS 26 Styles ---
    const iosInput = "w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF] transition-all resize-none";
    const iosCard = "bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col h-full";
    const iosBtnPrimary = "px-6 py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2 justify-center";
    const iosBtnSecondary = "px-6 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95";
    const iosLabel = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1";

    // --- State ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');

    const [contentStandard, setContentStandard] = useState('');
    const [performanceStandard, setPerformanceStandard] = useState('');
    const [learningCompetencies, setLearningCompetencies] = useState('');

    const [scope, setScope] = useState('byUnit');
    const [currentSelectedSubjectId, setCurrentSelectedSubjectId] = useState(subjectId || '');
    const [currentSelectedUnitIds, setCurrentSelectedUnitIds] = useState(new Set(unitId ? [unitId] : []));
    const [currentSelectedLessonId, setCurrentSelectedLessonId] = useState('');

    const { allSubjects, unitsForSubject, lessonsForUnit, loading } = useCourseData(currentSelectedSubjectId);

    // --- Generation Logic ---

    const generateAtgChunk = async (stepName, specificInstructions, sourceContent, previousContext) => {
        const prompt = `
        You are an expert PEAC / DepEd Curriculum Developer.
        Your task is to write specific sections of an Adaptive Teaching Guide (ATG).
        
        **CONTEXT (What you have written so far):**
        ${previousContext ? `...${previousContext.slice(-3000)}` : "No previous sections written yet."}

        **SOURCE LESSON CONTENT:**
        ---
        ${sourceContent.slice(0, 15000)}
        ---

        **YOUR CURRENT TASK:**
        Write the content for the following sections only. Do not write the whole document, just these specific parts. Follow the detailed instructions below strictly.
        
        ${specificInstructions}

        **OUTPUT:**
        Return only the formatted text content for these sections. Use clear Markdown headings (e.g., **1. Prerequisite...**).
        `;

        const result = await callGeminiWithLimitCheck(prompt, { maxOutputTokens: 4096 });
        return result;
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setPreviewData(null);
        setProgress(0);

        try {
            if (!learningCompetencies) throw new Error("Please fill in the learning competencies field.");

            // 1. Prepare Source Content
            let sourceContent = '';
            let sourceTitle = '';
            let generatedFromUnitId = null; 
            let generatedFromSubjectId = null;

            if (scope === 'byUnit') {
                if (currentSelectedUnitIds.size === 0) throw new Error("Please select at least one unit.");
                const unitDetails = Array.from(currentSelectedUnitIds).map(id => unitsForSubject.find(u => u.id === id)).filter(Boolean);
                sourceTitle = unitDetails.map(u => u.title).join(' & ');
                generatedFromUnitId = unitDetails[0]?.id || null;
                generatedFromSubjectId = currentSelectedSubjectId;
                const allLessonContents = [];
                for (const unit of unitDetails) {
                    const lessonsInUnit = lessonsForUnit.filter(l => l.unitId === unit.id);
                    lessonsInUnit.forEach(l => { allLessonContents.push(l.pages.map(p => p.content).join('\n')); });
                }
                sourceContent = allLessonContents.join('\n\n---\n\n');
            } else {
                if (!currentSelectedLessonId) throw new Error("Please select a lesson.");
                const lesson = lessonsForUnit.find(l => l.id === currentSelectedLessonId);
                if (!lesson) throw new Error("Selected lesson could not be found.");
                sourceTitle = lesson.title;
                sourceContent = lesson.pages.map(p => p.content).join('\n\n');
                generatedFromUnitId = lesson.unitId;
                generatedFromSubjectId = lesson.subjectId;
            }
            if (!sourceContent) throw new Error("No source content found.");

            // 2. Sequential Generation Steps (Context Aware)
            let accumulatedAtgText = "";

            // Step 1: Planning
            setProgress(10); setProgressLabel("Step 1/5: Planning Prerequisites...");
            const step1 = await generateAtgChunk("Planning", `
                **Part 1: PLANNING**

                **1. Prerequisite Content-Knowledge and Skills:**
                Based on the source lesson, identify the essential concepts, vocabulary, and skills students MUST have mastered in previous grade levels or lessons to access this new material.
                - Present this as a bulleted list.
                - For each item, provide a brief (1-sentence) justification explaining *why* it is a prerequisite for the current lesson.

                **2. Prerequisite Assessment:**
                Design a short, practical diagnostic tool to verify student mastery of the prerequisites listed in Section 1.
                - Create 5-10 targeted questions. You can use a mix of formats (e.g., Multiple Choice, Identification, a simple task).
                - If using Multiple Choice, provide four distinct options (A, B, C, D) for each item.
                - Provide a clear **Answer Key**, and for each question, include a brief explanation of what a correct answer demonstrates.

                **3. Pre-lesson Remediation Activities:**
                Create a targeted remediation plan for students who do not pass the Prerequisite Assessment. This plan must directly address the gaps identified in Section 2.
                - **For Online/Asynchronous Modality:** Provide a specific, high-quality online resource (e.g., a link to a specific Khan Academy video, a PhET simulation, or a practice quiz) that targets a key prerequisite skill. Describe the resource and what students should do with it.
                - **For In-person/Synchronous Modality:** Describe a concise, teacher-facilitated activity (e.g., a 10-minute mini-lesson using a whiteboard, a quick think-pair-share activity with guided questions, or a focused worksheet).
            `, sourceContent, accumulatedAtgText);
            accumulatedAtgText += step1 + "\n\n";

            // Step 2: Introduction
            setProgress(30); setProgressLabel("Step 2/5: Crafting Introduction...");
            const step2 = await generateAtgChunk("Introduction", `
                **Part 2: INSTRUCTION AND ASSESSMENT (Beginning)**

                **4. Introduction:**
                Craft a compelling introduction to motivate students and set clear expectations.
                - **Hook (Mental Primer):** Start with an engaging hook: a provocative question, a surprising statistic, a short, relevant anecdote, or a brief, interesting video clip.
                - **Connecting to the Performance Task:** Briefly state how the upcoming lesson will equip students with the skills needed for the final performance task.
                - **Learning Targets:** Clearly articulate the lesson's goals as specific, student-centered "I can..." statements. These should be unpacked from these competencies: ${learningCompetencies}.
            `, sourceContent, accumulatedAtgText);
            accumulatedAtgText += step2 + "\n\n";

            // Step 3: Lesson Proper
            setProgress(50); setProgressLabel("Step 3/5: Developing Lesson Proper...");
            const step3 = await generateAtgChunk("Lesson Proper", `
                **5. Student's Experiential Learning (The Lesson Proper):**
                This is the core of the lesson. Based on the source content, break down the lesson into **2-3 logical "Content Chunks."** For **EACH CHUNK**, you must provide the following structured sequence:
                - **A. Teacher Input / Student Activity:** Detail the learning experience. What will the teacher present, or what will the students *do*? (e.g., "Students will watch a 3-minute video on...", "Teacher will conduct a brief demonstration of..."). Specify materials needed.
                - **B. Formative Question(s):** Immediately following the activity, pose 1-2 specific questions to check for understanding of **that specific chunk**.
                - **C. Expected Student Response:** Provide and include the ideal answer(s) to the formative questions. This helps the teacher know what to listen for.
                - **D. Discussion:** Provide in-depth elaboration and explanation of the key concepts of the lessons or topics to strengthen student experiential learning.
            `, sourceContent, accumulatedAtgText);
            accumulatedAtgText += step3 + "\n\n";

            // Step 4: Synthesis & Post-Assessment
            setProgress(70); setProgressLabel("Step 4/5: Creating Assessments...");
            const step4 = await generateAtgChunk("Post-Lesson", `
                **6. Synthesis:**
                Design a powerful concluding activity that requires students to consolidate the learning from all the "chunks".
                - **Synthesis Question/Prompt:** Write a single, higher-order thinking question that forces students to connect the concepts from all chunks.
                - **Reinforcement Activity:** Design a tangible activity where students answer the synthesis question (e.g., concept map, exit ticket). Describe the activity and expected output.

                **7. Assessment of Student's Learning (Post-Lesson Assessment):**
                Create a formative assessment to measure how well students met the Learning Targets.
                - Design a 5-10 item quiz that is directly aligned with the learning targets and the content chunks.
                - Use a variety of question types (e.g., multiple choice, short answer, problem-solving).
                - Provide a detailed **Answer Key with explanations** for each item. Format this in a clear table.

                **8. Post-Lesson Remediation Activity:**
                Design a specific plan for students who scored poorly on the assessment.
                - Address the most common errors or misconceptions revealed by the assessment.
                - Describe a specific, focused activity (e.g., targeted worksheet, re-watching a specific part of a video) for both online and in-person contexts.

                **9. Post-Lesson Enrichment Activity:**
                For students who have mastered the content, design a challenging and engaging activity that extends their learning (higher-level thinking, application, analysis).
            `, sourceContent, accumulatedAtgText);
            accumulatedAtgText += step4 + "\n\n";

            // Step 5: Summative Task
            setProgress(85); setProgressLabel("Step 5/5: Designing Performance Task...");
            const step5 = await generateAtgChunk("Summative", `
                **Part 3: SUMMATIVE ASSESSMENT**

                **10. Final Unit Performance Task (GRASPS Format):**
                Design a meaningful, authentic summative performance task using the GRASPS model.
                - **Goal:** What is the main objective of the task?
                - **Role:** What role does the student assume?
                - **Audience:** Who is the target audience for their work?
                - **Situation:** What is the real-world context or scenario?
                - **Product:** What will the student create?
                - **Standards:** How will the product be judged?
                - **Scoring Rubric:** Create a detailed scoring rubric for the performance task. The rubric must have at least **three criteria** for success and at least **three proficiency levels** (e.g., Beginning, Developing, Accomplished) with clear descriptors for each level.
            `, sourceContent, accumulatedAtgText);
            accumulatedAtgText += step5 + "\n\n";

            // 3. Final Formatting (HTML Table)
            setProgress(95); setProgressLabel("Finalizing Document...");
            const finalPrompt = `
                Your task is to format the provided ATG content into a single JSON object containing an HTML table.
                
                **CRITICAL JSON FORMATTING RULES:** - Response MUST be valid JSON. 
                - Escape all quotes inside string values.
                
                **CONTENT TO FORMAT:**
                ---
                ${accumulatedAtgText}
                ---

                **HTML INSTRUCTIONS:**
                1. Create a two-column HTML table ("ATG Component", "Details").
                2. Create one row (\`<tr>\`) for each of the 10 sections defined in the text.
                3. Use bold headers inside the cells.
                4. Convert bullet lists to \`<ul>\` and \`<li>\`.

                **FINAL JSON OUTPUT STRUCTURE:**
                {"generated_lessons": [{"lessonTitle": "Adaptive Teaching Guide: ${sourceTitle}", "pages": [{"title": "PEAC Adaptive Teaching Guide", "content": "<table...>...</table>"}]}]}
            `;

            const formattedText = await callGeminiWithLimitCheck(finalPrompt, { maxOutputTokens: 8192 });
            const jsonText = extractJson(formattedText);
            
            if (!jsonText) throw new Error("Failed to format final output.");
            
            const parsedResponse = JSON.parse(jsonText);

            setPreviewData({
                ...parsedResponse,
                sourceSubjectId: generatedFromSubjectId, 
                sourceUnitId: generatedFromUnitId, 
                contentStandard,
                performanceStandard,
                learningCompetencies,
                sourceTitle,
            });
            
            setProgress(100);

        } catch (err) {
            console.error("Error generating ATG:", err);
            showToast(err.message, "error");
        } finally {
            setIsGenerating(false);
            setProgress(0);
        }
    };
    
    const handleSave = async () => {
        if (!previewData?.generated_lessons?.length) {
            showToast("No content to save.", "error");
            return;
        }
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const atgLesson = previewData.generated_lessons[0]; 
            const newAtgRef = doc(collection(db, 'lessons')); 
            
            batch.set(newAtgRef, {
                title: atgLesson.lessonTitle,
                pages: atgLesson.pages || [],
                unitId: unitId,
                subjectId: subjectId,
                contentType: "teacherAtg",
                contentStandard,
                performanceStandard,
                learningCompetencies,
                sourceSubjectId: previewData.sourceSubjectId,
                sourceUnitId: previewData.sourceUnitId,
                sourceOfAtgTitle: previewData.sourceTitle,
                createdAt: serverTimestamp(),
            });
            
            await batch.commit();
            showToast("ATG saved successfully!", "success");
            onClose();
        } catch (err) {
            console.error("Error saving ATG:", err);
            showToast("Failed to save ATG.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[110]">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4 sm:p-6">
                <Dialog.Panel className="relative flex flex-col w-full max-w-6xl max-h-[90vh] rounded-[2rem] bg-white dark:bg-[#1C1C1E] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden transition-all transform">
                    
                    {/* Loading Overlay */}
                    {(isGenerating || isSaving) && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 space-y-4">
                            {isGenerating ? <ProgressIndicator progress={progress} /> : <Spinner />}
                            <p className="text-gray-600 dark:text-gray-300 font-medium">{isGenerating ? progressLabel : 'Saving ATG...'}</p>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-[#007AFF]">
                                <DocumentTextIcon className="h-8 w-8" />
                            </div>
                            <div>
                                <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">AI ATG Generator</Dialog.Title>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">PEAC Adaptive Teaching Guide</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSaving || isGenerating} className="p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-[#1C1C1E]">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                                {/* Left: Inputs */}
                                <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                                    <section>
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">1. Authoritative Inputs</h3>
                                        <div className="space-y-5">
                                            <div><label className={iosLabel}>Content Standard</label><textarea value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className={iosInput} rows={3} /></div>
                                            <div><label className={iosLabel}>Performance Standard</label><textarea value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className={iosInput} rows={3} /></div>
                                            <div><label className={iosLabel}>Learning Competencies</label><textarea value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={iosInput} rows={4} /></div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right: Source Content */}
                                <div className="flex flex-col h-full overflow-hidden">
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">2. Source Content</h3>
                                    <div className={`${iosCard} flex-1`}>
                                        <SourceContentSelector
                                            scope={scope} handleScopeChange={(e) => setScope(e.target.value)}
                                            selectedSubjectId={currentSelectedSubjectId} 
                                            handleSubjectChange={(e) => { setCurrentSelectedSubjectId(e.target.value); setCurrentSelectedUnitIds(new Set()); setCurrentSelectedLessonId(''); }}
                                            allSubjects={allSubjects} 
                                            selectedUnitIds={currentSelectedUnitIds}
                                            handleUnitSelectionChange={(id) => {
                                                const newSet = new Set(currentSelectedUnitIds);
                                                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                                                setCurrentSelectedUnitIds(newSet);
                                            }}
                                            unitsForSubject={unitsForSubject} 
                                            selectedLessonId={currentSelectedLessonId}
                                            handleLessonChange={(e) => setCurrentSelectedLessonId(e.target.value)}
                                            lessonsForUnit={lessonsForUnit} 
                                            loading={loading}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full overflow-y-auto custom-scrollbar">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Adaptive Teaching Guide</h2>
                                        <p className="text-gray-500 dark:text-gray-400 mt-2">{previewData.sourceTitle}</p>
                                    </div>
                                    <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-sm overflow-x-auto">
                                        <div className="prose prose-slate dark:prose-invert max-w-none">
                                            {previewData?.generated_lessons?.[0] ? <LessonPage page={previewData.generated_lessons[0].pages[0]} /> : <p>Could not load preview.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 px-8 py-6 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] flex justify-end gap-3 z-20">
                        {previewData ? (
                            <>
                                <button onClick={() => setPreviewData(null)} disabled={isSaving || isGenerating} className={iosBtnSecondary}>Back to Edit</button>
                                <button onClick={handleSave} disabled={isSaving} className={iosBtnPrimary}>Accept & Save</button>
                            </>
                        ) : (
                            <button onClick={handleGenerate} disabled={isGenerating || loading} className={iosBtnPrimary}>
                                <SparklesIcon className="w-5 h-5" />
                                {isGenerating ? 'Generating...' : 'Generate ATG'}
                            </button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}