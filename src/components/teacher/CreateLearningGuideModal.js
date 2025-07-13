import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen'; // Assuming this component exists from previous request
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

    const [formData, setFormData] = useState({
        content: '',
        lessonCount: 1,
        pagesPerLesson: 10,
        learningCompetencies: '',
        contentStandard: '',
        performanceStandard: '',
        language: 'English',
    });
    
    // Fetch existing lesson count for proper ordering
    useEffect(() => {
        if (isOpen && unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [isOpen, unitId]);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = (name === 'lessonCount' || name === 'pagesPerLesson') ? Number(value) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleGenerate = async (regenerationNote = '') => {
        setIsGenerating(true);
        if (!regenerationNote) setPreviewData(null);

        try {
            if (!formData.content || !formData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

            // Define translated terms based on current language selection for prompt injection
            const objectivesLabel = formData.language === 'Filipino' ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives';
            const letsGetStartedLabel = formData.language === 'Filipino' ? 'Simulan Natin!' : "Let's Get Started!";
            const checkUnderstandingLabel = formData.language === 'Filipino' ? 'Suriin ang Pag-unawa' : "Check for Understanding";
            const lessonSummaryLabel = formData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
            const wrapUpLabel = formData.language === 'Filipino' ? 'Pagbubuod' : "Wrap-Up";
            const endOfLessonAssessmentLabel = formData.language === 'Filipino' ? 'Pagtatasa sa Katapusan ng Aralin' : "End-of-Lesson Assessment";
            const referencesLabel = formData.language === 'Filipino' ? 'Mga Sanggunian' : "References";
            const answerKeyLabel = formData.language === 'Filipino' ? 'Susi sa Pagwawasto' : 'Answer Key';

            const formatSpecificInstructions = `
                **Persona and Tone:** Adopt the persona of an enthusiastic and knowledgeable teacher who makes learning fun and like a grand adventure. The language MUST be student-friendly, avoiding overly academic or dry phrasing. Use analogies and real-world connections to make concepts relatable.

                **CRITICAL INSTRUCTION FOR CORE CONTENT:**
                The "Core Content Sections" MUST be detailed and information-rich, covering the topic comprehensively. However, the explanation should remain student-friendly, easy to understand, and engaging. Break down complex ideas into simpler parts, provide concrete examples, and ensure a logical flow of information that builds understanding step-by-step. Aim for depth without sacrificing clarity or readability for the target student audience.

                **CRITICAL HEADING RULE:**
                Use clear, concise, and non-redundant headings and subheadings throughout the lesson. Each heading MUST represent a distinct main idea or sub-topic. Avoid repeating phrases or rephrasing the lesson title or main topic in subheadings. For example, if the lesson is "The Water Cycle," do not have subheadings like "Introduction to Water Cycle" or "Water Cycle Processes." Instead, use "Introduction" or "Key Processes." Ensure there is only ONE main heading per distinct section.
                
                **CRITICAL HEADING CONTINUITY RULE:**
                When a single discussion (e.g., explaining 'Evaporation') is too long for one page and must continue on the next, its heading ('title' in the JSON) MUST only appear on the first page where it begins. Subsequent pages that continue the same discussion MUST have an empty string ("") for their 'title'. Do NOT create titles like "Evaporation (Continuation)". The content should flow seamlessly.

                **Textbook Chapter Structure:** You MUST organize the lesson content in the following sequence, ensuring no section's content bleeds into another:
                1.  **Standalone ${objectivesLabel} Section:** The lesson's JSON output MUST include a "learningObjectives" array containing a list of objectives.
                2.  **Engaging Introduction:** At the start of every lesson, write a compelling introduction that hooks the reader. **ABSOLUTE RULE: The introduction MUST NOT contain any list of objectives, goals, or learning outcomes, not even a rephrased version.** The introduction's purpose is to be a narrative hook. The objectives are handled *exclusively* by the "learningObjectives" array in the JSON and are displayed separately. Do not generate text like "In this lesson, you will learn to..." or "Our goals are..." or "Sa araling ito, inaasahang matututo ka ng sumusunod:" within the introduction page content.
                3.  **Introductory Activity:** Immediately after the introduction, include a short, interactive warm-up activity labeled "${letsGetStartedLabel}".
                4.  **Core Content Sections:** Present the main content, broken down with clear headings.
                5.  **Embedded Activities:** After explaining a major concept, include a short "${checkUnderstandingLabel}" activity.
                6.  **${lessonSummaryLabel}:** A concise summary of the key takeaways.
                7.  **${wrapUpLabel}/Conclusion:** Provide a clear conclusion that summarizes the main points.
                8.  **${endOfLessonAssessmentLabel}:** Conclude with a dedicated assessment section containing 5-10 questions and a labeled "${answerKeyLabel}".
                9.  **Final Page - ${referencesLabel}:** The VERY LAST page in the "pages" array for EACH lesson MUST be dedicated *exclusively* to references. This page object MUST have its "title" set to "${referencesLabel}" and its "content" must only list the references. Do not mix references with any other content on this final page.
                
                **CRITICAL INSTRUCTION FOR REFERENCES:** You MUST provide *only* real, verifiable academic or reputable web sources if you are confident they exist within your training data knowledge base. Under NO circumstances should you invent illusory authors, titles, journals, or URLs.
            `;

            const languageInstruction = `
                **CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in ${formData.language}.
                This includes all content, headings, subheadings, activity titles, and assessment sections.
                For example, if the language is Filipino, "Learning Objectives" should be translated to "Mga Layunin sa Pagkatuto",
                "Let's Get Started!" to "Simulan Natin!", "Check for Understanding" to "Suriin ang Pag-unawa",
                "Lesson Summary" to "Buod ng Aralin", "End-of-Lesson Assessment" to "Pagtatasa sa Katapusan ng Aralin",
                "Wrap-Up" to "Pagbubuod", and "References" to "Mga Sanggunian".
                You MUST use the translated terms for these sections.
            `;

            const studentLessonInstructions = `
                **CRITICAL JSON FORMATTING RULES (NON-NEGOTIABLE):**
                1.  **Entire response MUST be a single JSON object.**
                2.  **No Trailing Commas.**

                **OTHER CRITICAL INSTRUCTIONS:**
                3.  **Intelligent SVG Diagram Generation:** If the topic requires a diagram, you MUST generate one. Set the page "type" to "diagram-data" and the "content" MUST be a string of valid, complete SVG code. The SVG must be responsive and have legible, non-overlapping text. Do NOT use <img> tags.
                    
                    **CRITICAL SVG VISUAL GUIDELINES:**
                    - **Label Placement & Readability:** All text labels and annotations within the SVG MUST be clearly legible, adequately spaced, and positioned so they do NOT overlap with other elements.
                    - **No Overflow:** Text and shapes MUST stay within the bounds of the SVG viewport.
                    - **Visual Clarity & Simplicity:** Design the diagram to be clean, simple, and easy to understand.
                    - **Responsiveness:** Use a \`viewBox\` attribute to ensure the SVG scales well.
                    - **Font Size:** Use a reasonable font size that is easy to read.

                    If no diagram is needed, set the page "type" to "text".
                4.  ${languageInstruction}
                5.  ${formatSpecificInstructions}
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
                You MUST adhere to all of the following original rules that were used to create it.
                ${studentLessonInstructions}
                Return ONLY the complete, updated, and valid JSON object.`;
            } else {
                finalPrompt = `You are an expert instructional designer creating a student-friendly textbook chapter.
                **Core Content Information:**
                ---
                **Topic:** "${formData.content}"
                **Content Standard:** "${formData.contentStandard}"
                **Performance Standard:** "${formData.performanceStandard}"
                ---
                **Desired Learning Competencies for this topic (these will form the 'learningObjectives' array):**
                "${formData.learningCompetencies}"

                **Lesson Details:**
                - **Number of Lessons to Generate:** ${formData.lessonCount}
                - **Pages Per Lesson:** ${formData.pagesPerLesson}
                
                **CRITICAL LESSON TITLE RULE:**
                Each "lessonTitle" within the "generated_lessons" array MUST be unique, engaging, and catchy.
                The title MUST start with a specific prefix and include the lesson number.
                - If the language is Filipino, the title MUST start with "Aralin #[Lesson Number]: ".
                - If the language is English, the title MUST start with "Lesson #[Lesson Number]: ".
                
				**CRITICAL PAGE COUNT INSTRUCTION:**
                Each lesson's content (all 'pages' combined) MUST approximate the 'Target Pages Per Lesson' requested. Consider a "page" as a conceptual unit that contains roughly 150-250 words of prose, or equivalent content like a small activity or diagram. Adjust the depth and breadth of the content across the pages within a lesson to meet this target. The final number of 'pages' for each lesson should be as close as possible to the 'Target Pages Per Lesson'.
				
                
                ${studentLessonInstructions}

                **Final Output Structure:**
                {"generated_lessons": [{"lessonTitle": "...", "learningObjectives": ["Objective 1...", "Objective 2..."], "pages": [{"title": "...", "content": "...", "type": "text|diagram-data"}, ... ]}, ... ]}`;
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
        if (!previewData || !Array.isArray(previewData.generated_lessons) || previewData.generated_lessons.length === 0) {
            showToast("Cannot save: Invalid or empty lesson data.", "error");
            return;
        }
        if (!unitId || !subjectId) {
            showToast("Could not save: Destination unit or subject is missing.", "error");
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
                    // This correctly saves the 'learningObjectives' array from the JSON into the 'objectives' field in Firestore.
                    objectives: lesson.learningObjectives || [], 
                    unitId: unitId,
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

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {(isGenerating || isSaving) && (
                     <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl">
                        <InteractiveLoadingScreen topic={formData.content || "new ideas"} isSaving={isSaving} />
                    </div>
                )}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl text-white shadow-lg"><AcademicCapIcon className="h-8 w-8" /></div>
                        <div>
                            <Dialog.Title className="text-2xl font-bold text-slate-800">AI Learning Guide Generator</Dialog.Title>
                            <p className="text-slate-500">Create new student-facing lessons from scratch.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                    {!previewData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                                <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Core Content</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Main Content / Topic</label>
                                    <textarea placeholder="e.g., The Photosynthesis Process" name="content" value={formData.content} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={3} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Learning Competencies</label>
                                    <textarea placeholder="e.g., Describe the process of photosynthesis..." name="learningCompetencies" value={formData.learningCompetencies} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={4} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Content Standard (Optional)</label>
                                    <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={2} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Performance Standard (Optional)</label>
                                    <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={2} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                               <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Settings</h3>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Language of Instruction</label>
                                    <select name="language" value={formData.language} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                        <option value="English">English</option>
                                        <option value="Filipino">Filipino</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Number of Lessons</label>
                                            <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 mb-1">Pages per Lesson</label>
                                            <input type="number" name="pagesPerLesson" min="1" max="50" value={formData.pagesPerLesson} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-700">Preview Content</h2>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto border rounded-lg p-4 bg-slate-100">
                                {isValidPreview ? previewData.generated_lessons.map((lesson, index) => (
                                    <div key={index}>
                                        <h3 className="font-bold text-xl sticky top-0 bg-slate-100 py-2 z-10">{lesson.lessonTitle}</h3>
                                        {/* This block correctly displays the single 'learningObjectives' array at the top of the preview. */}
                                        {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                                            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-200 text-blue-800">
                                                <p className="font-semibold mb-1">{currentObjectivesLabel}:</p> 
                                                <ul className="list-disc list-inside">
                                                    {lesson.learningObjectives.map((objective, objIndex) => (
                                                        <li key={objIndex}>{objective}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {lesson.pages.map((page, pageIndex) => <LessonPage key={`${index}-${pageIndex}`} page={page} />)}
                                    </div>
                                )) : <p className="text-red-600">Could not generate a valid preview.</p>}
                            </div>
                            <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="Request changes..." className="w-full border p-2 rounded-lg" rows={2} />
                        </div>
                    )}
                </div>
                
                <div className="pt-6 flex justify-between items-center border-t border-slate-200 mt-6">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} disabled={isSaving || isGenerating} className="btn-secondary">Back to Edit</button>
                            <div className="flex gap-3">
                                <button onClick={() => handleGenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary">Regenerate</button>
                                <button onClick={handleSave} className="btn-primary" disabled={!isValidPreview || isSaving}>
                                    {isSaving ? 'Saving...' : 'Accept & Save'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => handleGenerate()} disabled={isGenerating} className="btn-primary ml-auto">
                            {isGenerating ? 'Generating...' : 'Generate Document'}
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}