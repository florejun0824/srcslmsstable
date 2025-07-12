import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import { languageInstruction as filipinoLanguageInstruction } from '../../constants/aiPrompts';
import Spinner from '../common/Spinner';
import { XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
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

export default function CreateLearningGuideModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [extraInstruction, setExtraInstruction] = useState('');

    const [formData, setFormData] = useState({
        format: 'AMT',
        content: '',
        lessonCount: 1,
        pagesPerLesson: 10,
        learningCompetencies: '',
        contentStandard: '',
        performanceStandard: '',
        language: 'English',
    });
    
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = async (regenerationNote = '') => {
        setIsGenerating(true);
        if (!regenerationNote) setPreviewData(null);

        try {
            if (!formData.content || !formData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

            let languageInstruction;
            if (formData.language === 'Filipino') {
                languageInstruction = filipinoLanguageInstruction;
            } else {
                languageInstruction = `**CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in English. Do not use any Filipino words, phrases, or translations unless they are part of a direct quote related to the topic.`;
            }

            let formatSpecificInstructions = '';
            // (Your switch statement for lesson formats remains here)
            switch (formData.format) {
                case 'AMT':
                    formatSpecificInstructions = `
                    **Lesson Structure (AMT Model):** You MUST structure the lesson pages in this order:
                    1.  **Acquisition Pages:** Deliver the core knowledge, facts, and concepts clearly.
                    2.  **Meaning-making Pages:** Create interactive activities to deepen understanding.
                    3.  **Transfer Page:** Design a practical task for real-world application.`;
                    break;
                case '5Es':
                    formatSpecificInstructions = `
                    **Lesson Structure (5E Model):** You MUST structure the lesson pages to follow the 5Es:
                    1.  **Engage:** A hook to capture interest.
                    2.  **Explore:** An activity for student investigation.
                    3.  **Explain:** Formal presentation of concepts.
                    4.  **Elaborate:** A task to apply learning.
                    5.  **Evaluate:** An assessment of learning.`;
                    break;
                case '4As':
                    formatSpecificInstructions = `
                    **Lesson Structure (4As Model):** ... your detailed instructions ...`;
                    break;
                case 'Gradual Release':
                    formatSpecificInstructions = `
                    **Lesson Structure (Gradual Release Model):** ... your detailed instructions ...`;
                    break;
                case 'Standard Lecture':
                    formatSpecificInstructions = `
                    **Lesson Structure (Standard Lecture Model):** ... your detailed instructions ...`;
                    break;
                default:
                    formatSpecificInstructions = `
                    **Lesson Structure (Standard Format):**
                    1.  **Introduction:** Briefly introduce the topic.
                    2.  **Content Presentation:** Break the topic into logical sub-topics.
                    3.  **Summary:** Conclude with key takeaways.`;
                    break;
            }

            // ✅ --- START: REINFORCED SVG PROMPT --- ✅
            const studentLessonInstructions = `
                **CRITICAL JSON FORMATTING RULES (NON-NEGOTIABLE):**
                1.  **Entire response MUST be a single JSON object.**
                2.  **No Trailing Commas.**

                **OTHER CRITICAL INSTRUCTIONS:**
                3.  **Intelligent SVG Diagram Generation:** If the topic requires a diagram (e.g., for a process, system, or concept), you MUST generate one.
                    * Set the page "type" to **"diagram-data"**.
                    * The "content" for this page **MUST** be a string containing a complete, valid, self-contained **SVG code block** and nothing else.
                    
                    * **SVG Rules (CRITICAL):**
                        * The SVG must have a responsive \`viewBox\` attribute. Do not use fixed \`width\` or \`height\` attributes in the top-level \`<svg>\` tag.
                        * All text labels MUST be legible and positioned carefully to PREVENT ANY OVERLAPPING.
                        * Use clear fonts and colors for high readability.

                    * 🛑 **ABSOLUTE PROHIBITION:** Under no circumstances should you ever use an \`<img>\` tag. The content for a diagram page MUST be raw SVG code, starting with \`<svg ...>\` and ending with \`</svg>\`.

                    * If no diagram is needed, set the page "type" to **"text"**.
                4.  ${languageInstruction}
                5.  **Instructional Model Integrity:** ${formatSpecificInstructions} You MUST follow this structure precisely, but DO NOT write the framework terms (e.g., "Engage," "Acquisition") in the student-facing content.
            `;
            // ✅ --- END: REINFORCED SVG PROMPT --- ✅

            let finalPrompt;
            const isRegeneration = !!regenerationNote && !!previewData;

            if (isRegeneration) {
                // ... (Regeneration prompt is unchanged)
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
                // ... (Initial generation prompt is unchanged)
                 finalPrompt = `You are an expert instructional designer creating student-friendly lessons.
                **Core Content Information:**
                ---
                **Topic:** "${formData.content}"
                **Content Standard:** "${formData.contentStandard}"
                **Learning Competencies:** "${formData.learningCompetencies}"
                **Performance Standard:** "${formData.performanceStandard}"
                ---
                **Lesson Details:**
                - **Number of Lessons:** ${formData.lessonCount}
                - **Pages Per Lesson:** ${formData.pagesPerLesson}
                - **Format:** "${formData.format}"
                
                ${studentLessonInstructions}

                **Final Output Structure:**
                {"generated_lessons": [{"lessonTitle": "...", "learningObjectives": ["..."], "pages": [{"title": "...", "content": "...", "type": "text|diagram-data"}, ... ]}, ... ]}`;
            }
            
            const aiText = await callGeminiWithLimitCheck(finalPrompt);
            const jsonText = extractJson(aiText);
            const parsedResponse = JSON.parse(jsonText);

            setPreviewData(parsedResponse);
            showToast("Content generated successfully!", "success");

        } catch (err) {
            console.error("Error during generation:", err);
            showToast(err.message, "error");
        } finally {
            setIsGenerating(false);
        }
    };
    
    // ... (rest of your component's functions and JSX are unchanged)
    const handleSave = async () => { /* ... Your save logic ... */ };
    const isValidPreview = previewData && !previewData.error && Array.isArray(previewData.generated_lessons);

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <Dialog.Panel className="relative bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {isGenerating && <div className="absolute inset-0 bg-white/80 flex flex-col justify-center items-center z-50 rounded-2xl"><Spinner /><p className="mt-2 text-slate-600">AI is generating content...</p></div>}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Lesson Format</label>
                                        <select name="format" value={formData.format} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="5Es">5Es</option>
                                            <option value="4As">4As</option>
                                            <option value="AMT">AMT</option>
                                            <option value="Gradual Release">Gradual Release</option>
                                            <option value="Standard Lecture">Standard Lecture</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Language of Instruction</label>
                                        <select name="language" value={formData.language} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="English">English</option>
                                            <option value="Filipino">Filipino</option>
                                        </select>
                                    </div>
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
                            <button onClick={() => setPreviewData(null)} className="btn-secondary">Back to Edit</button>
                            <div className="flex gap-3">
                                <button onClick={() => handleGenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary">Regenerate</button>
                                <button onClick={handleSave} className="btn-primary" disabled={!isValidPreview}>Accept & Save</button>
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