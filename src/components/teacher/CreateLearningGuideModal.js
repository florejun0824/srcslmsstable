import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// Helper functions (extractJson, tryParseJson)
const extractJson = (text) => {
    let match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) match = text.match(/```([\s\S]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    throw new Error("AI response did not contain a valid JSON object.");
};

// Using a safer parser that only fixes trailing commas.
const tryParseJson = (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn("Standard JSON.parse failed. Attempting to fix trailing commas.", e);
        const sanitized = jsonString.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(sanitized);
        } catch (finalError) {
            console.error("Sanitization failed. The error is likely in the generated JSON structure.", finalError);
            throw e; 
        }
    }
};


export default function CreateLearningGuideModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [extraInstruction, setExtraInstruction] = useState('');
    const [existingLessonCount, setExistingLessonCount] = useState(0);

    const [availableUnits, setAvailableUnits] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [subjectName, setSubjectName] = useState('');

    const [formData, setFormData] = useState({
        content: '',
        lessonCount: 1,
        learningCompetencies: '',
        contentStandard: '',
        performanceStandard: '',
        language: 'English',
        gradeLevel: '7',
    });

    useEffect(() => {
        if (subjectId) {
            const fetchSubjectName = async () => {
                const subjectRef = doc(db, 'subjects', subjectId);
                const subjectSnap = await getDoc(subjectRef);
                if (subjectSnap.exists()) {
                    setSubjectName(subjectSnap.data().title);
                } else {
                    setSubjectName('');
                }
            };
            fetchSubjectName();
        }
    }, [subjectId]);


    useEffect(() => {
        if (unitId) {
            setSelectedUnitId(unitId);
            setAvailableUnits([]);
            return;
        }

        if (isOpen && !unitId && subjectId) {
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
            const unsubscribe = onSnapshot(unitsQuery, (snapshot) => {
                const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailableUnits(unitsData);
                if (unitsData.length > 0) {
                    setSelectedUnitId(unitsData[0].id);
                } else {
                    setSelectedUnitId('');
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen, unitId, subjectId]);

    useEffect(() => {
        const unitToQuery = unitId || selectedUnitId;
        if (isOpen && unitToQuery) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitToQuery));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [isOpen, unitId, selectedUnitId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'lessonCount' ? Number(value) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleGenerate = async (regenerationNote = '') => {
        setIsGenerating(true);
        if (!regenerationNote) setPreviewData(null);
        
        let lastError = null;
        let lastResponseText = null;

        try {
            if (!formData.content || !formData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

            // Define all labels and instructions once.
            const objectivesLabel = formData.language === 'Filipino' ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives';
            const letsGetStartedLabel = formData.language === 'Filipino' ? 'Simulan Natin!' : "Let's Get Started!";
            const checkUnderstandingLabel = formData.language === 'Filipino' ? 'Suriin ang Pag-unawa' : "Check for Understanding";
            const lessonSummaryLabel = formData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
            const wrapUpLabel = formData.language === 'Filipino' ? 'Pagbubuod' : "Wrap-Up";
            const endOfLessonAssessmentLabel = formData.language === 'Filipino' ? 'Pagtatasa sa Katapusan ng Aralin' : "End-of-Lesson Assessment";
            const referencesLabel = formData.language === 'Filipino' ? 'Mga Sanggunian' : "References";
            const answerKeyLabel = formData.language === 'Filipino' ? 'Susi sa Pagwawasto' : 'Answer Key';
            
            const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
            let perspectiveInstruction = '';
            if (catholicSubjects.includes(subjectName)) {
                perspectiveInstruction = `
                **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**. This is non-negotiable. All explanations, examples, and interpretations must align with Catholic teachings, doctrines, and values. You must integrate principles from the Catechism of the Catholic Church, relevant encyclicals, and Sacred Scripture where appropriate.
                `;
            }

            const masterInstructions = `
                **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer. Think of yourself as writing a chapter for a "page-turner" textbook that makes readers feel smarter.
                **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${formData.gradeLevel}**. Your writing must be clear, accessible, and tailored to the cognitive and developmental level of this grade. The complexity of vocabulary, sentence structure, and conceptual depth should be appropriate for a ${formData.gradeLevel}th grader.
                ${perspectiveInstruction}
                **CRITICAL INSTRUCTION FOR CORE CONTENT:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the science or the concept. Introduce key figures, explore historical context, and delve into fascinating real-world applications. Use vivid analogies and metaphors to illuminate complex ideas. The content should flow logically and build on itself, like a well-structured story.
				**CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
                You MUST use LaTeX for all mathematical equations, variables, and chemical formulas. Rule: Every LaTeX expression MUST start with a single dollar sign (\`$\`) and end with a single dollar sign (\`$\`). Example (Equation): To write F = ma, you MUST write \`$F = ma$\`. Example (Chemical Formula): To write H₂O, you MUST write \`$H_2O$\`.
				**ABSOLUTE RULE FOR CONTENT CONTINUATION (NON-NEGOTIABLE):** When a single topic or section is too long for one page and its discussion must continue onto the next page, the heading for that topic (the 'title' in the JSON) MUST ONLY appear on the very first page. ALL subsequent pages for that topic MUST have an empty string for their title: \`"title": ""\`.
                **Textbook Chapter Structure (NON-NEGOTIABLE):** You MUST generate the lesson pages in this exact sequence. The 'title' field for each special section MUST be exactly as specified.
                1. **${objectivesLabel}:** The lesson MUST begin with the learning objectives (in the "learningObjectives" array).
                2. **Engaging Introduction:** The first page of the 'pages' array must be a captivating opening.
                3. **Introductory Activity ("${letsGetStartedLabel}"):** A single page with a short warm-up activity. The 'title' MUST be exactly "${letsGetStartedLabel}".
                4. **Core Content Sections:** The main narrative content across multiple pages.
                5. **Check for Understanding ("${checkUnderstandingLabel}"):** A page with a thoughtful activity. The 'title' MUST be exactly "${checkUnderstandingLabel}".
                6. **Summary ("${lessonSummaryLabel}"):** A page with a concise summary. The 'title' MUST be exactly "${lessonSummaryLabel}".
                7. **Conclusion ("${wrapUpLabel}"):** A page with a powerful concluding statement. The 'title' MUST be exactly "${wrapUpLabel}".
                8. **Assessment ("${endOfLessonAssessmentLabel}"):** A multi-page assessment section. The first page's 'title' MUST be "${endOfLessonAssessmentLabel}". It must contain 8-10 questions.
                9. **Answer Key ("${answerKeyLabel}"):** A page with the answers. The 'title' MUST be exactly "${answerKeyLabel}".
                10. **References ("${referencesLabel}"):** The absolute last page must ONLY contain references. The 'title' MUST be exactly "${referencesLabel}".
                **CRITICAL INSTRUCTION FOR REFERENCES:** You MUST provide real, verifiable academic or reputable web sources.
                **ABSOLUTE RULE FOR DIAGRAMS (NON-NEGOTIABLE):**
                When a diagram is necessary, you MUST generate a clean, modern, SVG diagram. The page 'type' MUST be set to "diagram-data". The 'content' MUST contain the full SVG code. CRITICAL SVG STYLING RULES: Use small font sizes (\`font-size="8px"\`), use \`<tspan>\` for text wrapping, and include a \`viewBox\` attribute.
                **CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in ${formData.language}.**
            `;

            for (let attempt = 1; attempt <= 3; attempt++) {
                let prompt;
                if (attempt === 1) {
                    const isRegeneration = !!regenerationNote && !!previewData;
                    if (isRegeneration) {
                        prompt = `You are a JSON editing expert. Modify the following JSON based on: "${regenerationNote}". EXISTING JSON: ${JSON.stringify(previewData, null, 2)}. Return ONLY the valid JSON.`;
                    } else {
                        prompt = `You are an expert instructional designer.
                        **ABSOLUTE PRIMARY RULE: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT.**
                        **JSON SYNTAX RULES (NON-NEGOTIABLE):**
                        1. All property names must be in double quotes.
                        2. A colon (:) MUST follow every property name.
                        3. All backslashes (\\) must be escaped (\\\\).
                        4. No trailing commas.
                        **CRITICAL PRE-FLIGHT CHECK (NON-NEGOTIABLE):**
                        Before outputting, verify: 1. No missing colons? 2. No missing commas in arrays? 3. No missing commas in objects? 4. All brackets/braces matched? 5. All backslashes escaped?
                        **OUTPUT JSON STRUCTURE:** {"generated_lessons": [{"lessonTitle": "...", "learningObjectives": [...], "pages": [{"title": "...", "content": "...", "type": "text|diagram-data"}, ... ]}, ... ]}
                        ---
                        **GENERATION TASK DETAILS**
                        ---
                        **Core Content:** Subject: "${subjectName}", Grade: ${formData.gradeLevel}, Topic: "${formData.content}", Content Standard: "${formData.contentStandard}", Performance Standard: "${formData.performanceStandard}"
                        **Learning Competencies:** "${formData.learningCompetencies}"
                        **CRITICAL OBJECTIVES INSTRUCTION:** Generate a 'learningObjectives' array with 3-5 distinct objectives starting with a verb.
                        **Lesson Details:** Number of Lessons: ${formData.lessonCount}. Title Rule: Each "lessonTitle" must be unique and start with "Lesson #[Lesson Number]: ".
                        **PAGE COUNT/DEPTH:** Minimum of **30 pages for EACH lesson**. Achieve this with deep narrative richness (history, applications, analogies).
                        ---
                        **MASTER INSTRUCTION SET:**
                        ---
                        ${masterInstructions}`;
                    }
                } else {
                    showToast(`AI response was invalid. Attempting to self-correct (Attempt ${attempt})...`, "warning");
                    prompt = `The following text is not valid JSON and produced this error: "${lastError.message}". Correct the syntax errors and return ONLY the complete, valid JSON object.
                    ---
                    BROKEN JSON TEXT:
                    ${lastResponseText}
                    ---`;
                }

                try {
                    const aiResponse = await callGeminiWithLimitCheck(prompt);
                    lastResponseText = extractJson(aiResponse);
                    const parsedResponse = tryParseJson(lastResponseText);
                    setPreviewData(parsedResponse);
                    showToast("Content generated successfully!", "success");
                    setIsGenerating(false);
                    return;
                } catch (error) {
                    console.error(`Attempt ${attempt} failed:`, error);
                    lastError = error;
                }
            }
            throw lastError;
        } catch (err) {
            console.error("Error during generation after all retries:", err);
            // ✅ FIXED: Show a much more helpful error message to the user.
            const userFriendlyError = `The AI failed to generate valid content after 3 attempts. This can happen with very complex requests.

Error: ${err.message}

What to do next:
1. Try generating again with a smaller request (e.g., 1 lesson instead of 3).
2. If it still fails, the AI's response below can be checked with an online tool like JSONLint to find the exact error.`;
            
            showToast(userFriendlyError, "error", 15000); // Show toast for 15 seconds
            console.log("--- LAST FAILED AI RESPONSE (for debugging) ---");
            console.log(lastResponseText);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        const finalUnitId = unitId || selectedUnitId;

        if (!previewData || !Array.isArray(previewData.generated_lessons) || previewData.generated_lessons.length === 0) {
            showToast("Cannot save: Invalid or empty lesson data.", "error");
            return;
        }
        if (!finalUnitId || !subjectId) {
            showToast("Could not save: Please select a destination unit.", "error");
            return;
        }

        setIsSaving(true);
        showToast(`Saving ${previewData.generated_lessons.length} lesson(s)...`, "info");

        try {
            const batch = writeBatch(db);

            previewData.generated_lessons.forEach((lesson, index) => {
                const newLessonRef = doc(collection(db, 'lessons'));
                batch.set(newLessonRef, {
                    title: lesson.lessonTitle,
                    pages: lesson.pages || [],
                    objectives: lesson.learningObjectives || [],
                    unitId: finalUnitId,
                    subjectId: subjectId,
                    contentType: "studentLesson",
                    createdAt: serverTimestamp(),
                    order: existingLessonCount + index,
                });
            });

            await batch.commit();

            showToast(`${previewData.generated_lessons.length} lesson(s) saved successfully!`, "success");
            onClose();

        } catch (err) {
            console.error("Save error:", err);
            showToast("Failed to save lessons.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const isValidPreview = previewData && !previewData.error && Array.isArray(previewData.generated_lessons);
    const currentObjectivesLabel = formData.language === 'Filipino' ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives';
    const objectivesIntro = formData.language === 'Filipino' 
        ? 'Sa pagtatapos ng araling ito, magagawa ng mga mag-aaral na:' 
        : 'By the end of this lesson, students will be able to:';

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-slate-50 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-md lg:max-w-5xl max-h-[90vh] flex flex-col">
                {(isGenerating || isSaving) && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl">
                        <InteractiveLoadingScreen topic={formData.content || "new ideas"} isSaving={isSaving} />
                    </div>
                )}
                <div className="flex justify-between items-start mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 sm:p-3 rounded-xl text-white shadow-lg flex-shrink-0">
                            <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:h-8" />
                        </div>
                        <div>
                            <Dialog.Title className="text-base sm:text-2xl font-bold text-slate-800">AI Learning Guide Generator</Dialog.Title>
                            <p className="text-xs sm:text-sm text-slate-500">Create new student-facing lessons from scratch.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto -mr-2 pr-2 sm:-mr-4 sm:pr-4">
                    {!previewData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md space-y-4">
                                <h3 className="font-bold text-base sm:text-lg text-slate-700 border-b pb-2">Core Content</h3>
                                {availableUnits.length > 0 && !unitId && (
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Destination Unit</label>
                                        <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                                            {availableUnits.map(unit => (<option key={unit.id} value={unit.id}>{unit.title}</option>))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Main Content / Topic</label>
                                    <textarea placeholder="e.g., The Photosynthesis Process" name="content" value={formData.content} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={3} />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Learning Competencies</label>
                                    <textarea placeholder="e.g., Describe the process of photosynthesis..." name="learningCompetencies" value={formData.learningCompetencies} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={4} />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Content Standard (Optional)</label>
                                    <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={2} />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Performance Standard (Optional)</label>
                                    <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={2} />
                                </div>
                            </div>
                            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md space-y-4">
                               <h3 className="font-bold text-base sm:text-lg text-slate-700 border-b pb-2">Settings</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Language</label>
                                        <select name="language" value={formData.language} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="English">English</option>
                                            <option value="Filipino">Filipino</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Grade Level</label>
                                        <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="7">Grade 7</option>
                                            <option value="8">Grade 8</option>
                                            <option value="9">Grade 9</option>
                                            <option value="10">Grade 10</option>
                                            <option value="11">Grade 11</option>
                                            <option value="12">Grade 12</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-600 mb-1">Number of Lessons</label>
                                    <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-700">Preview Content</h2>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto border rounded-lg p-2 sm:p-4 bg-slate-100">
                                {isValidPreview ? previewData.generated_lessons.map((lesson, index) => (
                                    <div key={index}>
                                        <h3 className="font-bold text-base sm:text-xl sticky top-0 bg-slate-100 py-2 z-10">{lesson.lessonTitle}</h3>
                                        {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                                            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-200 text-blue-800 rounded-r-lg text-sm">
                                                <p className="font-semibold mb-2">{currentObjectivesLabel}</p>
                                                <p className="mb-2">{objectivesIntro}</p>
                                                <ul className="list-disc list-inside pl-4">
                                                    {lesson.learningObjectives.map((objective, objIndex) => (
                                                        <li key={objIndex} className="mb-1">{objective}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {lesson.pages.map((page, pageIndex) => <LessonPage key={`${index}-${pageIndex}`} page={page} />)}
                                    </div>
                                )) : <p className="text-red-600">Could not generate a valid preview.</p>}
                            </div>
                            <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="Request changes..." className="w-full border p-2 rounded-lg text-sm" rows={2} />
                        </div>
                    )}
                </div>
                <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200 mt-4 sm:mt-6">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} disabled={isSaving || isGenerating} className="btn-secondary w-full sm:w-auto text-sm">Back to Edit</button>
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button onClick={() => handleGenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary w-full sm:w-auto text-sm">Regenerate</button>
                                <button onClick={handleSave} className="btn-primary w-full sm:w-auto text-sm" disabled={!isValidPreview || isSaving}>
                                    {isSaving ? 'Saving...' : 'Accept & Save'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => handleGenerate()} disabled={isGenerating} className="btn-primary ml-auto w-full sm:w-auto text-sm">
                            {isGenerating ? 'Generating...' : 'Generate Document'}
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}