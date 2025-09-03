import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentChartBarIcon, LanguageIcon, ChevronRightIcon } from '@heroicons/react/24/outline'; // Added ChevronRightIcon
import LessonPage from './LessonPage';
import ProgressIndicator from '../common/ProgressIndicator';
import SourceContentSelector from '../../hooks/SourceContentSelector';

// Helper function to extract JSON
const extractJson = (text) => {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
    }
    return null;
};

// A more robust JSON parsing function
const tryParseJson = (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn("Standard JSON.parse failed. Attempting to fix.", error);
        let sanitizedString = jsonString.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(sanitizedString);
        } catch (finalError) {
            console.error("Failed to parse JSON even after sanitization.", finalError);
            throw error;
        }
    }
};

export default function CreateUlpModal({ isOpen, onClose, unitId: initialUnitId, subjectId }) {
    const { showToast } = useToast();

    const [inputs, setInputs] = useState({
        contentStandard: '',
        performanceStandard: '',
        learningCompetencies: '',
    });

    const [generationTarget, setGenerationTarget] = useState('teacherGuide');
    const [allSubjects, setAllSubjects] = useState([]);
    const [unitsForSubject, setUnitsForSubject] = useState([]);
    const [lessonsForUnit, setLessonsForUnit] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('English');
    const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
    const [selectedUnitIds, setSelectedUnitIds] = useState(new Set(initialUnitId ? [initialUnitId] : []));
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set()); // <-- NEW: State for collapsible sections
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [existingLessonCount, setExistingLessonCount] = useState(0);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState('');
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

    // --- Data Fetching Hooks (Unchanged) ---
    useEffect(() => {
        if (!isOpen) return;
        setIsLoadingSubjects(true);
        const subjectsQuery = query(collection(db, 'courses'), orderBy('title'));
        const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
            const allFetchedSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const uniqueCategories = [...new Set(allFetchedSubjects.map(subject => subject.category).filter(Boolean))];
            const learnerCategoryNames = uniqueCategories.filter(name => !name.toLowerCase().includes("teach"));
            const learnerSubjects = allFetchedSubjects.filter(subject => subject.category && learnerCategoryNames.includes(subject.category));
            setAllSubjects(learnerSubjects);
            setIsLoadingSubjects(false);
        }, (error) => {
            console.error("Error fetching subjects:", error);
            showToast("Error fetching subjects.", "error");
            setIsLoadingSubjects(false);
        });
        return () => unsubscribe();
    }, [isOpen, showToast]);

    useEffect(() => {
        if (selectedSubjectId) {
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', selectedSubjectId), orderBy('order'));
            const unsub = onSnapshot(unitsQuery, (snapshot) => setUnitsForSubject(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsub();
        } else {
            setUnitsForSubject([]);
        }
    }, [selectedSubjectId]);
    
    useEffect(() => {
        if (selectedSubjectId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', selectedSubjectId), orderBy('order'));
            const unsub = onSnapshot(lessonsQuery, (snapshot) => setLessonsForUnit(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
            return () => unsub();
        } else {
            setLessonsForUnit([]);
        }
    }, [selectedSubjectId]);

    useEffect(() => {
        if (isOpen && initialUnitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', initialUnitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => setExistingLessonCount(snapshot.size));
            return () => unsubscribe();
        }
    }, [isOpen, initialUnitId]);

    // --- Handlers and Memos (with additions) ---
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    }, []);

    const sourceInfo = useMemo(() => {
        if (selectedUnitIds.size === 0) return { title: '', content: '', lessonTitles: [], error: "Please select at least one source unit." };
        const unitDetails = Array.from(selectedUnitIds).map(id => unitsForSubject.find(u => u.id === id)).filter(Boolean);
        const title = unitDetails.map(u => u.title).join(' & ');
        let formattedLessonList = [];
        unitDetails.forEach(unit => {
            formattedLessonList.push(`Unit: ${unit.title}`);
            const relevantLessons = lessonsForUnit.filter(lesson => lesson.unitId === unit.id);
            relevantLessons.forEach(lesson => formattedLessonList.push(`- ${lesson.title}`));
        });
        const relevantLessons = lessonsForUnit.filter(lesson => selectedUnitIds.has(lesson.unitId));
        const lessonTitles = formattedLessonList;
        const content = relevantLessons.map(l => l.pages.map(p => p.content).join('\n')).join('\n\n---\n\n');
        if (!content && generationTarget === 'teacherGuide') return { title, content: '', lessonTitles, error: `The selected unit(s) '${title}' appear to have no lesson content.`};
        return { title, content, lessonTitles, error: null };
    }, [selectedUnitIds, unitsForSubject, lessonsForUnit, generationTarget]);

    const scaffoldInfo = useMemo(() => {
        if (scaffoldLessonIds.size === 0) return { summary: '', error: null };
        const relevantScaffoldLessons = lessonsForUnit.filter(lesson => scaffoldLessonIds.has(lesson.id));
        if (relevantScaffoldLessons.length === 0) return { summary: '', error: 'Could not find selected scaffold lessons.' };
        const summary = relevantScaffoldLessons.map(lesson => {
            const pageContentSample = lesson.pages.map(p => p.content).join(' ').substring(0, 200);
            return `- Lesson Title: "${lesson.title}"\n  - Key Concepts/Activities Summary: ${pageContentSample}...`;
        }).join('\n');
        return { summary, error: null };
    }, [scaffoldLessonIds, lessonsForUnit]);

    // NEW: Handler to toggle unit expansion in scaffold selector
    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) {
            newSet.delete(unitId);
        } else {
            newSet.add(unitId);
        }
        setExpandedScaffoldUnits(newSet);
    };
    
    // NEW: Handler for the "select all" unit checkbox
    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
        const currentlySelectedInUnit = lessonIdsInUnit.filter(id => scaffoldLessonIds.has(id));
        
        const newSet = new Set(scaffoldLessonIds);

        if (currentlySelectedInUnit.length === lessonIdsInUnit.length) {
            // All are selected, so deselect all
            lessonIdsInUnit.forEach(id => newSet.delete(id));
        } else {
            // Some or none are selected, so select all
            lessonIdsInUnit.forEach(id => newSet.add(id));
        }
        setScaffoldLessonIds(newSet);
    };

    // --- Core Logic (handleGenerate, handleSave) remains unchanged ---
    const handleGenerate = async () => {
        if (generationTarget === 'teacherGuide') {
            if (!inputs.contentStandard || !inputs.performanceStandard || !inputs.learningCompetencies) {
                showToast("Please fill in all standard and competency fields.", "error"); return;
            } if (sourceInfo.error) { showToast(sourceInfo.error, "error"); return; }
            if (!sourceInfo.content) { showToast("No source content found for the selected scope.", "error"); return; }
        }
        setIsGenerating(true); setPreviewData(null); setProgress(0);
        try {
            setProgress(10); setProgressLabel('Analyzing requirements...');
const ulpAnalysisPrompt = `
                You are an expert instructional designer. Your task is to generate a detailed analysis for a Unit Learning Plan (ULP) based on the provided standards and content.

                **Authoritative Inputs (Non-Negotiable):**
                - **Content Standard:** ${inputs.contentStandard}
                - **Performance Standard:** ${inputs.performanceStandard}
                - **Learning Competencies:**
                    ${inputs.learningCompetencies}
                - **Lesson Titles from Source:** ${sourceInfo.lessonTitles.join('\n')}
                - **Source Content:** [Content is provided for context. Do NOT quote directly in the output.]
                - **Language Requirement:** You MUST generate the entire response exclusively in the following language: ${selectedLanguage}.

                **CRITICAL OVERARCHING RULES:**
                1.  **NO DIRECT QUOTING:** Under NO circumstances should you directly quote, reference, or instruct the user to "post" or "read from" the 'Source Content' in your generated activities. You must create NEW and ORIGINAL activities inspired by the competencies and themes.
                2.  **STRICT ADHERENCE:** You MUST follow the structure and formatting instructions below precisely and in order.
                3.  **SCAFFOLDING REQUIREMENT:** This is a non-negotiable rule. The activities you design from the Firm-Up to Transfer sections MUST directly and intentionally build the specific skills and knowledge students will need to successfully complete the final Performance Task. Each activity should be a clear step towards that final goal.

                **ULP STRUCTURE AND CONTENT (IN ORDER):**
                1.  **Explore Stage:** You MUST structure this stage in the following exact order:
                    * **Lessons List:** Start by listing the exact lesson titles provided in the 'Lesson Titles from Source' input. Do not invent or change them. Note: If multiple units are selected, the list will include unit headers.
                    * **Unit Overview:** Provide an engaging and catchy overview of the unit's purpose.
                    * **Hooked Activities:** Design engaging activities to capture student interest.
                    * **Map of Conceptual Change:** Create an activity for students to map their prior or new knowledge (e.g., a K-W-L chart).
                2.  **Essential Questions:** Formulate 2-5 thought-provoking Essential Questions that align directly with the provided Content and Performance Standards.
                3.  **Learning Plan Breakdown (Firm-Up, Deepen, Transfer):** Using ONLY the competencies from the 'Learning Competencies' input, classify each one and assign a unique code (A1, M1, T1, etc.).
                    * **Firm-Up (Acquisition, Code A#):** Foundational knowledge.
                    * **Deepen (Meaning-Making, Code M#):** Understanding the 'why' and 'how'.
                    * **Transfer (Code T#):** Applying knowledge to a new, real-world situation.
                    For each competency, you MUST provide all of the following:
                    * **Learning Target:** At least two "${selectedLanguage === 'Filipino' ? 'Kaya kong...' : 'I can...'}" statements.
                    * **Success Indicators:** 2-3 specific, observable indicators.
                    * **In-Person & Online Activities:** Design a scaffolded activity and its online alternative. Provide the detailed instructions for each activity and the Materials needed.
                    * **C-E-R Requirement:** At least one "Deepen (M)" activity MUST be a C-E-R task.
            		* **Support Discussion:** For Firm-Up (A), provide questions to check for understanding and an in-depth discussion for the lesson that will be a support to the activity so that students will better understand important concepts and ideas. For Deepen (M), provide a **detailed summarization** of key concepts in addition to in-depth elaboration and probing questions.
                    * **End-of-Lesson Assessment:** Design a specific, aligned end-of-lesson assessment for this competency.
                        * **For Acquisition (A) competencies, choose ONLY one of the following types:** Multiple Choice, Fill in the blank, Matching Type, Enumeration, Alternative Response, Hands-on operation, or Labeling.
                        * **For Meaning-Making (M) competencies, choose ONLY one of the following types:** Short Paragraph, Essay, Critique Writing, Concept Mapping, or Journal Writing.
                        * **Exception:** Omit this for Transfer (T#) competencies.
                    * **Activity Materials & Templates:** For any activity that lists materials like "scenario cards" or "templates", you MUST provide the complete content for those materials directly below the activity instructions. For example, if you list "5 scenario cards" as a material, you must then provide the content for those 5 cards.
                4.  **Final Synthesis:** A summary and wrap up that connects key points across lessons that would prepare students for the Performance Task.
                5.  **Unit Performance Task (Transfer):** Design a detailed GRASPS Performance Task based on the overall unit **Performance Standard**. Include a comprehensive scoring rubric in a tabular format.
                6.  **Values Integration (Automatic):** As the very last section, analyze all the content you have generated for this ULP. Based on the topics, activities, and performance task, identify 2-4 key values (e.g., integrity, stewardship, critical thinking, collaboration) that are naturally embedded or can be cultivated. For each identified value, provide a short enagaging and interactive overview in the ${selectedLanguage} explaining how it is reflected in the unit and can be fostered in students.
					`;
            const analysisText = await callGeminiWithLimitCheck(ulpAnalysisPrompt, { maxOutputTokens: 8192 });
            if (!analysisText || analysisText.toLowerCase().includes("i cannot")) throw new Error("AI failed to generate ULP analysis.");
            setProgress(50); setProgressLabel('Formatting content...');
const finalPrompt = `
                Your sole task is to convert the provided ULP analysis into a single, valid JSON object.
                **Source ULP Analysis:**
                ---
                ${analysisText}
                ---
                **CRITICAL JSON & HTML Formatting Rules:**
                1.  **Single JSON Object:** The entire response MUST be a single, valid JSON object.
                2.  **HTML Table:** The 'content' value must be a single string containing a complete '<table style='width: 100%; border-collapse: collapse;'>...</table>'.
                3.  **Main Column Headers:** The table MUST begin with a '<thead>' section. Inside it, create the main headers: '<thead><tr><th style='background-color: #4A5568; color: white; padding: 12px; text-align: left;'>Learning Focus</th><th style='background-color: #4A5568; color: white; padding: 12px; text-align: left;'>Learning Process</th></tr></thead>'.
                4.  **Explore Stage Generation:**
                    * Immediately after the '<thead>', start the '<tbody>'. The first rows in the body MUST be for the Explore stage.
                    * First, create a title row: '<tr><td colspan='2' style='background-color: #374151; color: white; font-weight: bold; padding: 10px;'>EXPLORE STAGE</td></tr>'.
                    * Next, create the content row. This row will have a single cell that spans both columns: '<td colspan='2' style='padding: 10px; border: 1px solid #E2E8F0;'>'.
                    * Inside this single '<td>', place the "Lessons List", "Unit Overview", "Hooked Activities", "Essential Questions", and "Map of Conceptual Change", in that order.
                5.  **Competency Section Generation:** After the Explore stage rows, continue adding rows to the SAME '<tbody>' for the following sections in this exact order: Firm-Up, Deepen, and Transfer. For each section, first output the main title row, then output the content rows for each competency belonging to that section.
                    * **A. Firm-Up (Acquisition) Section:**
                        * **Title Row:** Create a title row: '<tr><td colspan='2' style='background: linear-gradient(to right, #6366f1, #8b5cf6); color: white; padding: 10px; font-weight: bold;'>FIRM-UP (ACQUISITION)</td></tr>'.
                        * **Content Rows:** For each Acquisition (A#) competency, create one '<tr>' with two '<td>' cells styled with 'style='padding: 10px; border-bottom: 1px solid #E2E8F0; vertical-align: top;''.
                            * **First Cell ('Learning Focus'):** Must contain the competency code and text, the Learning Targets, and the Success Indicators.
                            * **Second Cell ('Learning Process'):** Must contain the Activities (In-person and Online with detailed instructions and materials), Support Discussion, End-of-Lesson Assessment, and any required templates/cards.
                    * **B. Deepen (Meaning-Making) Section:**
                        * **Title Row:** Create a title row: '<tr><td colspan='2' style='background: linear-gradient(to right, #10b981, #2dd4bf); color: white; padding: 10px; font-weight: bold;'>DEEPEN (MEANING-MAKING)</td></tr>'.
                        * **Content Rows:** For each Meaning-Making (M#) competency, create one '<tr>' with two '<td>' cells, following the same column content rules as above.
                    * **C. Final Synthesis Section:**
                        * **Title Row:** Create a title row: '<tr><td colspan='2' style='background: #4B5563; color: white; padding: 10px; font-weight: bold;'>FINAL SYNTHESIS</td></tr>'.
                        * **Content Row:** Create a single row after the title: '<tr><td colspan='2' style='padding: 10px; border-bottom: 1px solid #E2E8F0;'>'. This cell must contain the full summary.
                    * **D. Transfer Section:**
                        * **Title Row:** '<tr><td colspan="2" style="background: linear-gradient(to right, #f97316, #fbbf24); color: white; padding: 10px; font-weight: bold;">TRANSFER</td></tr>'.
                        * **Content Rows:** For each Transfer (T#) competency, create one '<tr>' with two '<td>' cells. The 'Learning Process' cell contains only activities and a summary.
                6.  **Unit Performance Task Section:** After all other sections, add this part.
                    * **Title Row:** '<tr><td colspan="2" style="background-color: #111827; color: white; font-weight: bold; padding: 10px; text-align: center;">UNIT PERFORMANCE TASK</td></tr>'.
                    * **Content Row:** Create one '<tr><td colspan="2" style="padding: 10px; border-bottom: 1px solid #E2E8F0;">' containing the full GRASPS Task and its scoring rubric worth 50 Points, which MUST be an HTML '<table>'.
                7.  **Values Integration Section:** As the final part of the table, add the Values Integration content.
                    * **Title Row:** '<tr><td colspan="2" style="background-color: #dbeafe; color: #1e40af; font-weight: bold; padding: 10px;">VALUES INTEGRATION</td></tr>'.
                    * **Content Row:** Create one '<tr><td colspan="2" style="padding: 10px;">' containing the full text generated for the automatically-detected Values Integration.
                **Final JSON Output Structure:**
                {"generated_lessons": [{"lessonTitle": "Unit Learning Plan: ${sourceInfo.title}", "learningObjectives": [], "pages": [{"title": "PEAC Unit Learning Plan", "content": "..."}]}]}
            `;
            const aiText = await callGeminiWithLimitCheck(finalPrompt, { maxOutputTokens: 8192 });
            setProgress(90); setProgressLabel('Finalizing...');
            const jsonText = extractJson(aiText);
            if (!jsonText) throw new Error("AI response did not contain a valid JSON object.");
            const parsedResponse = tryParseJson(jsonText);
            setPreviewData(parsedResponse); setProgress(100);
        } catch (err) {
            console.error("Error generating content:", err);
            showToast(err.message || "An unknown error occurred.", "error");
        } finally {
            setIsGenerating(false); setProgress(0); setProgressLabel('');
        }
    };
    const handleSave = async () => {
        if (!previewData || !Array.isArray(previewData.generated_lessons)) { showToast("Cannot save: Invalid lesson data.", "error"); return; }
        if (!initialUnitId || !subjectId) { showToast("Could not save: Destination unit or subject is missing.", "error"); return; }
        setIsSaving(true);
        const batch = writeBatch(db);
        previewData.generated_lessons.forEach((lesson, index) => {
            const newLessonRef = doc(collection(db, 'lessons'));
            batch.set(newLessonRef, {
                title: lesson.lessonTitle, pages: lesson.pages || [], objectives: lesson.learningObjectives || [],
                unitId: initialUnitId, subjectId: subjectId, contentType: "studentLesson",
                createdAt: serverTimestamp(), order: existingLessonCount + index,
            });
        });
        try {
            await batch.commit();
            showToast(`${previewData.generated_lessons.length} item(s) saved successfully!`, "success");
            onClose();
        } catch (err) {
            console.error("Save error:", err); showToast("Failed to save lessons.", "error");
        } finally { setIsSaving(false); }
    };
    
    return (
        <Dialog open={isOpen} onClose={!isSaving && !isGenerating ? onClose : () => {}} className="relative z-[110]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className="relative bg-zinc-50/90 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                    {(isGenerating || isSaving) && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl space-y-3">
                            {isGenerating ? <ProgressIndicator progress={progress} /> : <Spinner />}
                            <p className="text-zinc-600">{isGenerating ? progressLabel : 'Saving...'}</p>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-6 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="bg-violet-600 p-3 rounded-xl text-white shadow-lg">
                                <DocumentChartBarIcon className="h-8 w-8" />
                            </div>
                            <div>
                                <Dialog.Title className="text-xl sm:text-2xl font-bold text-zinc-900">AI PEAC ULP Generator</Dialog.Title>
                                <p className="text-sm text-zinc-500">Create a ULP that aligns with PEAC standards.</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSaving || isGenerating} className="p-1.5 rounded-full text-zinc-500 bg-zinc-200/80 hover:bg-zinc-300/80 flex-shrink-0">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pb-2">Generation Options</h3>
                                    <div>
                                        <label htmlFor="generationTarget" className="block text-sm font-medium text-zinc-600 mb-1.5">Document to Generate</label>
                                        <select name="generationTarget" value={generationTarget} onChange={(e) => setGenerationTarget(e.target.value)} className="form-input-ios">
                                            <option value="teacherGuide">PEAC Unit Learning Plan (ULP)</option>
                                            <option value="studentLesson">Student Learning Guide</option>
                                            <option value="peacAtg">Adaptive Teaching Guide (ATG)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="language" className="block text-sm font-medium text-zinc-600 mb-1.5">Output Language</label>
                                        <div className="relative">
                                            <select id="language" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className="form-input-ios pl-10">
                                                <option>English</option><option>Filipino</option>
                                            </select>
                                            <LanguageIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pt-2 pb-2">Authoritative Inputs</h3>
                                    <div>
                                        <label htmlFor="contentStandard" className="block text-sm font-medium text-zinc-600 mb-1.5">Content Standard</label>
                                        <textarea id="contentStandard" name="contentStandard" value={inputs.contentStandard} onChange={handleInputChange} className="form-input-ios" rows={3} />
                                    </div>
                                    <div>
                                        <label htmlFor="performanceStandard" className="block text-sm font-medium text-zinc-600 mb-1.5">Performance Standard</label>
                                        <textarea id="performanceStandard" name="performanceStandard" value={inputs.performanceStandard} onChange={handleInputChange} className="form-input-ios" rows={3} />
                                    </div>
                                    <div>
                                        <label htmlFor="learningCompetencies" className="block text-sm font-medium text-zinc-600 mb-1.5">Learning Competencies</label>
                                        <textarea id="learningCompetencies" name="learningCompetencies" placeholder="One competency per line..." value={inputs.learningCompetencies} onChange={handleInputChange} className="form-input-ios" rows={4} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                     <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pb-2">Source Content</h3>
                                    <div className="bg-white/50 p-4 rounded-xl">
                                        <SourceContentSelector
                                            selectedSubjectId={selectedSubjectId}
                                            handleSubjectChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedUnitIds(new Set()); setScaffoldLessonIds(new Set()); }}
                                            allSubjects={allSubjects}
                                            selectedUnitIds={selectedUnitIds}
                                            handleUnitSelectionChange={(id) => {
                                                const newSet = new Set(selectedUnitIds);
                                                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                                                setSelectedUnitIds(newSet);
                                            }}
                                            unitsForSubject={unitsForSubject}
                                            loading={isLoadingSubjects}
                                        />
                                    </div>
                                    {/* --- MODIFIED: Collapsible and Selectable Scaffold Section --- */}
                                    <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pt-2 pb-2">Scaffolding (Optional)</h3>
                                    <div className="bg-white/50 p-4 rounded-xl max-h-64 overflow-y-auto">
                                        <p className="text-xs text-zinc-500 mb-3">Select previous lessons to build upon. Default view is collapsed.</p>
                                        {unitsForSubject.length > 0 ? (
                                            unitsForSubject.map(unit => {
                                                const lessonsInUnit = lessonsForUnit.filter(lesson => lesson.unitId === unit.id);
                                                if (lessonsInUnit.length === 0) return null;

                                                const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                                const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                                const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                                const isExpanded = expandedScaffoldUnits.has(unit.id);

                                                return (
                                                    <div key={unit.id} className="pt-2 first:pt-0">
                                                        <div className="flex items-center bg-zinc-100 p-2 rounded-md">
                                                            <button onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1">
                                                                <ChevronRightIcon className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                            </button>
                                                            <input
                                                                type="checkbox"
                                                                id={`scaffold-unit-${unit.id}`}
                                                                checked={isAllSelected}
                                                                ref={el => { if(el) el.indeterminate = isPartiallySelected; }}
                                                                onChange={() => handleUnitCheckboxChange(lessonsInUnit)}
                                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-2"
                                                            />
                                                            <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-zinc-700 cursor-pointer">
                                                                {unit.title}
                                                            </label>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="pl-6 pt-2 space-y-2">
                                                                {lessonsInUnit.map(lesson => (
                                                                    <div key={lesson.id} className="flex items-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            id={`scaffold-lesson-${lesson.id}`}
                                                                            checked={scaffoldLessonIds.has(lesson.id)}
                                                                            onChange={() => {
                                                                                const newSet = new Set(scaffoldLessonIds);
                                                                                if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                                else newSet.add(lesson.id);
                                                                                setScaffoldLessonIds(newSet);
                                                                            }}
                                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                        <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-zinc-800">
                                                                            {lesson.title}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-sm text-zinc-400">Select a subject to see available lessons for scaffolding.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-zinc-800">Preview</h2>
                                <div className="max-h-[65vh] overflow-y-auto border border-zinc-200 rounded-lg p-4 bg-zinc-100">
                                    {previewData?.generated_lessons?.[0] ? (
                                        previewData.generated_lessons.map((lesson, index) => (
                                            <div key={index}>
                                                <h3 className="font-bold text-lg sticky top-0 bg-zinc-100/80 backdrop-blur-sm py-2">{lesson.lessonTitle}</h3>
                                                {Array.isArray(lesson.pages) && lesson.pages.map((page, pageIndex) => <LessonPage key={`${index}-${pageIndex}`} page={page} />)}
                                            </div>
                                        ))
                                    ) : ( <p>Could not load preview. The AI may have returned an invalid format.</p> )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-200/80 mt-6">
                        {previewData ? (
                            <>
                                <button onClick={() => setPreviewData(null)} disabled={isSaving || isGenerating} className="btn-secondary-ios w-full sm:w-auto">Back to Edit</button>
                                <button onClick={handleSave} disabled={isSaving || isGenerating} className="btn-primary-ios w-full sm:w-auto">
                                    {isSaving ? 'Saving...' : 'Accept & Save'}
                                </button>
                            </>
                        ) : (
                            <button onClick={handleGenerate} disabled={isGenerating || !selectedUnitIds.size} className="btn-primary-ios ml-auto w-full sm:w-auto">
                                {isGenerating ? 'Generating...' : 'Generate Content'}
                            </button>
                        )}
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}