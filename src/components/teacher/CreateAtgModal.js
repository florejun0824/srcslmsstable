import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useToast } from '../../contexts/ToastContext';
import { useCourseData } from '../../hooks/useCourseData';
import SourceContentSelector from '../../hooks/SourceContentSelector';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { languageInstruction } from '../../constants/aiPrompts';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

const extractJson = (text) => {
    let match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) match = text.match(/```([\s\S]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    throw new Error("AI response did not contain a valid JSON object.");
};

export default function CreateAtgModal({ isOpen, onClose, subjectId, unitId }) {
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    const [contentStandard, setContentStandard] = useState('');
    const [performanceStandard, setPerformanceStandard] = useState('');
    const [learningCompetencies, setLearningCompetencies] = useState('');

    const [scope, setScope] = useState('byUnit');
    const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
    const [selectedUnitIds, setSelectedUnitIds] = useState(new Set(unitId ? [unitId] : []));
    const [selectedLessonId, setSelectedLessonId] = useState('');

    const { allSubjects, unitsForSubject, lessonsForUnit, loading } = useCourseData(selectedSubjectId);
    
    const handleGenerate = async () => {
        setIsGenerating(true);
        setPreviewData(null);
        try {
            if (!learningCompetencies) {
                throw new Error("Please fill in the learning competencies field.");
            }

            let sourceContent = '';
            let sourceTitle = '';
            if (scope === 'byUnit') {
                if (selectedUnitIds.size === 0) throw new Error("Please select at least one unit.");
                const unitDetails = Array.from(selectedUnitIds).map(id => unitsForSubject.find(u => u.id === id)).filter(Boolean);
                sourceTitle = unitDetails.map(u => u.title).join(' & ');
                const allLessonContents = [];
                for (const unit of unitDetails) {
                    const lessonsInUnit = lessonsForUnit.filter(l => l.unitId === unit.id);
                    lessonsInUnit.forEach(l => { allLessonContents.push(l.pages.map(p => p.content).join('\n')); });
                }
                sourceContent = allLessonContents.join('\n\n---\n\n');
            } else {
                if (!selectedLessonId) throw new Error("Please select a lesson.");
                const lesson = lessonsForUnit.find(l => l.id === selectedLessonId);
                if (!lesson) throw new Error("Selected lesson could not be found.");
                sourceTitle = lesson.title;
                sourceContent = lesson.pages.map(p => p.content).join('\n\n');
            }
            if (!sourceContent) {
                throw new Error("No source content found for the selected scope. Please ensure the selected units/lessons have content.");
            }

            showToast("Step 1/2: Generating PEAC ATG content...", "info");

            // ✅ YOUR NEW, DETAILED ATG INSTRUCTIONS ARE PLACED HERE
            const atgAnalysisPrompt = `Your task is to generate a complete and detailed ATG based on the provided source lesson or topic. The ATG must be student-centered, assessment-driven, and adaptable for different learning modalities (in-person, online, and hybrid). Adhere strictly to the 10-section structure and detailed instructions below.

                **Source Lesson Content:**
                ---
                ${sourceContent}
                ---

                **GUIDE SECTIONS (Generate detailed and specific content for each of the following 10 sections):**
                
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

                **Part 2: INSTRUCTION AND ASSESSMENT**

                **4. Introduction:**
                Craft a compelling introduction to motivate students and set clear expectations.
                - **Hook (Mental Primer):** Start with an engaging hook: a provocative question, a surprising statistic, a short, relevant anecdote, or a brief, interesting video clip.
                - **Connecting to the Performance Task:** Briefly state how the upcoming lesson will equip students with the skills needed for the final performance task (mentioned in Section 10).
                - **Learning Targets:** Clearly articulate the lesson's goals as specific, student-centered "I can..." statements. These should be unpacked from the curriculum standards. (e.g., "I can identify the three main causes of the water cycle.").

                **5. Student's Experiential Learning (The Lesson Proper):**
                This is the core of the lesson. Based on the source content, break down the lesson into **2-3 logical "Content Chunks."** For **EACH CHUNK**, you must provide the following structured sequence:
                - **A. Teacher Input / Student Activity:** Detail the learning experience. What will the teacher present, or what will the students *do*? (e.g., "Students will watch a 3-minute video on...", "Teacher will conduct a brief demonstration of..."). Specify materials needed.
                - **B. Formative Question(s):** Immediately following the activity, pose 1-2 specific questions to check for understanding of **that specific chunk**.
                - **C. Expected Student Response:** Provide and include the ideal answer(s) to the formative questions. This helps the teacher know what to listen for.
                - **D. Discussion:** Provide in-depth elaboration and explanation of the key concepts of the lessons or topics to strengthen student experiential learning.

                **6. Synthesis:**
                Design a powerful concluding activity that requires students to consolidate the learning from all the "chunks" in Section 5.
                - **Synthesis Question/Prompt:** Write a single, higher-order thinking question that forces students to connect the concepts from all chunks.
                - **Reinforcement Activity:** Design a tangible activity where students answer the synthesis question. Examples: creating a concept map, completing a graphic organizer, or writing an "exit ticket" summary. Describe the activity and the expected output.

                **7. Assessment of Student's Learning (Post-Lesson Assessment):**
                Create a formative assessment to measure how well students met the Learning Targets from Section 4.
                - Design a 5-10 item quiz that is directly aligned with the learning targets and the content chunks.
                - Use a variety of question types (e.g., multiple choice, short answer, problem-solving).
                - Provide a detailed **Answer Key with explanations** for each item. Format this in a clear table.

                **8. Post-Lesson Remediation Activity:**
                Design a specific plan for students who scored poorly on the assessment in Section 7.
                - This activity must be targeted, addressing the most common errors or misconceptions revealed by the assessment data.
                - Describe a specific, focused activity (e.g., a targeted worksheet, re-watching a specific part of a video, a one-on-one conference) that directly reinforces the weak areas. Provide both an online and an in-person option.

                **9. Post-Lesson Enrichment Activity:**
                For students who have mastered the content, design a challenging and engaging activity that extends their learning. This should not be "more of the same work."
                - The activity must encourage higher-level thinking (e.g., application, analysis, evaluation, creation).
                - **Examples:** Propose a solution to a more complex problem, research a related topic of interest, or design a creative project.

                **Part 3: SUMMATIVE ASSESSMENT**

                **10. Final Unit Performance Task (GRASPS Format):**
                Design a meaningful, authentic summative performance task using the GRASPS model. This task should allow students to apply the knowledge and skills from this lesson in a real-world context.
                - **Goal:** What is the main objective of the task?
                - **Role:** What role does the student assume?
                - **Audience:** Who is the target audience for their work?
                - **Situation:** What is the real-world context or scenario?
                - **Product:** What will the student create?
                - **Standards:** How will the product be judged?
                - **Scoring Rubric:** Following the GRASPS, create a detailed scoring rubric for the performance task. The rubric must have at least **three criteria** for success and at least **three proficiency levels** (e.g., Beginning, Developing, Accomplished) with clear descriptors for each level.`;

            const analysisText = await callGeminiWithLimitCheck(atgAnalysisPrompt);
            if (analysisText.toLowerCase().includes("i cannot")) throw new Error("AI failed during ATG content generation.");
            
            showToast("Step 2/2: Formatting ATG...", "info");
            const finalPrompt = `Your primary task is to return a single, valid JSON object by formatting the provided ATG content into a comprehensive HTML table.
                **CRITICAL JSON FORMATTING RULES:** Your entire response MUST be a single, valid JSON object. Escape all quotes inside string values.
                **Pre-Generated ATG Content:**
                ---
                ${analysisText}
                ---
                **CRITICAL HTML TABLE INSTRUCTIONS:**
                1.  Create a two-column HTML table ("ATG Component", "Details").
                2.  Create one row (\`<tr>\`) for each of the 10 ATG sections.
                3.  Convert bullet points to HTML lists (\`<ul>\`).
                
                **FINAL JSON OUTPUT STRUCTURE:**
                {"generated_lessons": [{"lessonTitle": "Adaptive Teaching Guide: ${sourceTitle}", "pages": [{"title": "PEAC Adaptive Teaching Guide", "content": "<table...>...</table>"}]}]}`;

            const aiText = await callGeminiWithLimitCheck(finalPrompt);
            const jsonText = extractJson(aiText);
            const parsedResponse = JSON.parse(jsonText);
            setPreviewData(parsedResponse);

        } catch (err) {
            console.error("Error generating ATG:", err);
            showToast(err.message, "error");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSave = async () => { /* ... Your save logic ... */ };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {isGenerating && <div className="absolute inset-0 bg-white/80 flex flex-col justify-center items-center z-50 rounded-2xl"><Spinner /><p className="mt-2 text-slate-600">AI is generating ATG...</p></div>}
                
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-3 rounded-xl text-white shadow-lg">
                            <DocumentTextIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <Dialog.Title className="text-2xl font-bold text-slate-800">AI ATG Generator</Dialog.Title>
                            <p className="text-slate-500">Create a PEAC Adaptive Teaching Guide from source content.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200"><XMarkIcon className="h-6 w-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                    {!previewData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                                <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Authoritative Inputs</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Content Standard</label>
                                    <textarea value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Performance Standard</label>
                                    <textarea value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Learning Competencies</label>
                                    <textarea placeholder="One competency per line..." value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500" rows={4} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold text-lg text-slate-700 border-b pb-2 mb-4">Source Content</h3>
                                <SourceContentSelector
                                    scope={scope} handleScopeChange={(e) => setScope(e.target.value)}
                                    selectedSubjectId={selectedSubjectId} handleSubjectChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedUnitIds(new Set()); setSelectedLessonId(''); }}
                                    allSubjects={allSubjects} selectedUnitIds={selectedUnitIds}
                                    handleUnitSelectionChange={(id) => {
                                        const newSet = new Set(selectedUnitIds);
                                        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                                        setSelectedUnitIds(newSet);
                                    }}
                                    unitsForSubject={unitsForSubject} selectedLessonId={selectedLessonId}
                                    handleLessonChange={(e) => setSelectedLessonId(e.target.value)}
                                    lessonsForUnit={lessonsForUnit} loading={loading}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-700">Preview ATG</h2>
                            <div className="max-h-[60vh] overflow-y-auto border rounded-lg p-4 bg-slate-100">
                                {previewData?.generated_lessons?.[0] ? <LessonPage page={previewData.generated_lessons[0].pages[0]} /> : <p>Could not load preview.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-slate-200 mt-6">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} className="btn-secondary">Back to Edit</button>
                            <button onClick={handleSave} className="btn-primary">Accept & Save</button>
                        </>
                    ) : (
                        <button onClick={handleGenerate} disabled={isGenerating || loading} className="btn-primary ml-auto">
                            {isGenerating ? 'Generating...' : 'Generate ATG'}
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}