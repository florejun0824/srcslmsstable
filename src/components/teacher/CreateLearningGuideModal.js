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

const tryParseJson = (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        let sanitizedString = jsonString.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(sanitizedString);
        } catch (finalError) {
            throw error;
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

        try {
            if (!formData.content || !formData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

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

            const formatSpecificInstructions = `
                **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer. Think of yourself as writing a chapter for a "page-turner" textbook that makes readers feel smarter.

                **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${formData.gradeLevel}**. Your writing must be clear, accessible, and tailored to the cognitive and developmental level of this grade. The complexity of vocabulary, sentence structure, and conceptual depth should be appropriate for a ${formData.gradeLevel}th grader.
                
                ${perspectiveInstruction}

                **CRITICAL INSTRUCTION FOR CORE CONTENT:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the science or the concept. Introduce key figures, explore historical context, and delve into fascinating real-world applications. Use vivid analogies and metaphors to illuminate complex ideas. The content should flow logically and build on itself, like a well-structured story.
                
				**CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
                For all scientific content, especially in subjects like Science, Chemistry, Physics, and Math, you MUST use LaTeX for all chemical formulas and mathematical equations.
                - Enclose ALL LaTeX expressions in single dollar signs ($...$).
                - For subscripts, use an underscore. For example, to write H₂O, you MUST write \`$H_2O$\`.
                - For superscripts (like ions or exponents), use a caret. For example, to write Ca²⁺, you MUST write \`$Ca^{2+}$\`.
                - This is a strict requirement. Do not write plain text like 'H2O' or 'x = 2'. Always use LaTeX formatting like \`$H_2O$\` or \`$x = 2$\`.
				
                **ABSOLUTE RULE FOR CONTENT CONTINUATION (NON-NEGOTIABLE):** When a single topic or section (e.g., explaining the "Legislative Branch") is too long for one page and its discussion must continue onto the next page (or multiple subsequent pages), the heading for that topic (the 'title' in the JSON) MUST ONLY appear on the very first page where the topic is introduced.
                **ALL** subsequent pages that are continuations of that same topic **MUST** have an empty string for their title: \`"title": ""\`.
                **UNDER NO CIRCUMSTANCES** should you ever create headings like:
                - "Topic Title (Continuation)"
                - "Topic Title (Part 2)"
                - "Topic Title (Ikalawang Bahagi)"
                - "Continuation of Topic Title"
                - Any rephrasing or repetition of the original title.
                The content should flow seamlessly from one page to the next as if the page break doesn't exist. This is a strict formatting requirement.

                **Textbook Chapter Structure:** You MUST organize the lesson content in the following sequence:
                1.  **Standalone ${objectivesLabel} Section:** A "learningObjectives" array.
                2.  **Engaging Introduction:** A captivating opening that poses a fascinating question or tells a surprising anecdote related to the topic.
                3.  **Introductory Activity:** A single, thought-provoking warm-up activity labeled "${letsGetStartedLabel}".
                4.  **Core Content Sections:** The main, narrative-driven content.
                5.  **Check for Understanding:** After a major, substantial section of content (not frequently), you may include a single, thoughtful activity or a few critical thinking questions labeled "${checkUnderstandingLabel}". Avoid littering the text with constant, small activities.
                6.  **${lessonSummaryLabel}:** A concise summary of the key ideas.
                7.  **${wrapUpLabel}/Conclusion:** A powerful concluding statement that reinforces the topic's importance.
                8.  **${endOfLessonAssessmentLabel}:** A dedicated assessment with **8-10 questions** and a labeled "${answerKeyLabel}".
                9.  **Final Page - ${referencesLabel}:** The last page MUST be for references only.

                **CRITICAL INSTRUCTION FOR REFERENCES:** You MUST provide real, verifiable academic or reputable web sources. Do NOT invent sources. Every last page of the lesson should have references on it.
            `;

            const languageInstruction = `
                **CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in ${formData.language}.**
            `;
            const studentLessonInstructions = `
                **CRITICAL JSON FORMATTING RULES (NON-NEGOTIABLE):**
                1.  **Entire response MUST be a single JSON object.**
                2.  **No Trailing Commas.**
                
				**ABSOLUTE RULE FOR DIAGRAMS (NON-NEGOTIABLE):**
                When a diagram is necessary to explain a concept (e.g., photosynthesis, parts of a cell, a historical timeline), you MUST generate a clean, modern, and informative SVG diagram.
                - The page 'type' MUST be set to "diagram-data".
                - The page 'content' MUST contain the full, valid, and complete SVG code as a string (e.g., "<svg ...>...</svg>").

                **CRITICAL SVG STYLING AND LAYOUT RULES:**
                To prevent visual issues, every generated SVG MUST adhere to these styling rules:
                1.  **Font Size:** Use a small, consistent font size for all text labels, such as \`font-size="8px"\` or \`font-size="10px"\`, to ensure text fits within the diagram.
                2.  **Text Layout & Wrapping:** For labels with more than one word, you MUST use \`<tspan>\` elements to break the text into multiple lines. This prevents text from overflowing. Position text labels with adequate padding so they do not overlap with other text or diagram elements.
                3.  **Responsive Sizing:** The root \`<svg>\` element MUST include a \`viewBox\` attribute (e.g., \`viewBox="0 0 200 150"\`) to ensure the diagram scales correctly without distortion.
                4.  **Clean Design:** Keep the design simple. Use clean lines (e.g., \`stroke-width="1"\`) and a professional, limited color palette.

                - **UNDER NO CIRCUMSTANCES** should you ever return a textual description of a diagram, an image URL, or a placeholder. You must generate the SVG code itself. Failure to provide SVG code for a diagram will be considered a failed response.
                
                ${languageInstruction}
                ${formatSpecificInstructions}
            `;
            let finalPrompt;
            const isRegeneration = !!regenerationNote && !!previewData;
            if (isRegeneration) {
                const existingJsonString = JSON.stringify(previewData, null, 2);
                finalPrompt = `You are a JSON editing expert. Modify the following JSON data based on this user instruction: "${regenerationNote}".
                **EXISTING JSON TO MODIFY:**
                ---
                ${existingJsonString}
                ---
                You MUST adhere to all of the original rules that were used to create it, especially the 'Professor/Author' persona, the grade level targeting, the Catholic perspective (if applicable), the intelligent creation of learning objectives, and the absolute rule for content continuation.
                ${studentLessonInstructions}
                Return ONLY the complete, updated, and valid JSON object.`;
            } else {
                finalPrompt = `You are an expert instructional designer and author, creating a deeply engaging, narrative-driven textbook chapter for a specific high school grade level.
                **Core Content Information:**
                ---
                **Subject:** "${subjectName}"
                **Grade Level:** ${formData.gradeLevel}
                **Topic:** "${formData.content}"
                **Content Standard:** "${formData.contentStandard}"
                **Performance Standard:** "${formData.performanceStandard}"
                ---
                **Learning Competencies to Address (Use these as a guide):**
                "${formData.learningCompetencies}"
                
                **CRITICAL INSTRUCTION FOR LEARNING OBJECTIVES (NON-NEGOTIABLE):**
                Based on the topic and competencies, generate a 'learningObjectives' array with 3-5 distinct objectives.
                - **FORMATTING RULE:** Each objective MUST be a concise, action-oriented phrase starting with a verb (e.g., "Differentiate between talents and skills," "Analyze the author's use of foreshadowing," "Solve linear equations with two variables.").
                - **ABSOLUTE RESTRICTION:** **DO NOT** include introductory phrases like "Students will be able to" or "By the end of this lesson" within each objective string. Only the action phrase is allowed.
                - **DO NOT** simply copy the learning competencies. Create new, more specific objectives.

                **Lesson Details:**
                - **Number of Lessons to Generate:** ${formData.lessonCount}
                
                **CRITICAL LESSON TITLE RULE:**
                Each "lessonTitle" MUST be unique and intriguing, starting with "Lesson #[Lesson Number]: " (or "Aralin #[Lesson Number]: " for Filipino).

                **CRITICAL PAGE COUNT AND NARRATIVE DEPTH INSTRUCTION:**
                This is the most important instruction. You MUST generate a very substantial and comprehensive lesson with a minimum of **30 pages for EACH lesson**.
                You will achieve this length by providing **immense depth and narrative richness**. Do not just state facts; tell the story behind them. To fill the pages, you MUST:
                1.  **Explore Historical Context:** Discuss the origins of the ideas and the key people involved.
                2.  **Delve into Real-World Applications:** Provide detailed examples of how this topic matters in technology, nature, or society.
                3.  **Use Rich Analogies:** Use vivid, well-explained analogies and metaphors to make complex ideas intuitive.
                4.  **Build a Narrative:** Structure the content like a story, with a clear beginning, a building of ideas, and a satisfying conclusion.
                A "page" is a conceptual unit of about **200-300 words** of engaging, narrative-driven text, or a single complex diagram with a detailed explanation.

                ${studentLessonInstructions}

                **Final Output Structure:**
                {"generated_lessons": [{"lessonTitle": "...", "learningObjectives": ["Differentiate between...", "Analyze the use of..."], "pages": [{"title": "...", "content": "...", "type": "text|diagram-data"}, ... ]}, ... ]}`;
            }

            const aiText = await callGeminiWithLimitCheck(finalPrompt);
            const jsonText = extractJson(aiText);
            const parsedResponse = tryParseJson(jsonText);

            setPreviewData(parsedResponse);
            showToast("Content generated successfully!", "success");

        } catch (err) {
            console.error("Error during generation:", err);
            showToast(err.message, "error");
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
             {/* ✅ FIXED: Responsive padding and max-width for the dialog panel */}
            <Dialog.Panel className="relative bg-slate-50 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-md lg:max-w-5xl max-h-[90vh] flex flex-col">
                {(isGenerating || isSaving) && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl">
                        <InteractiveLoadingScreen topic={formData.content || "new ideas"} isSaving={isSaving} />
                    </div>
                )}
                 {/* ✅ FIXED: Responsive header with adaptive font sizes and layout */}
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
                 {/* ✅ FIXED: Responsive footer buttons */}
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