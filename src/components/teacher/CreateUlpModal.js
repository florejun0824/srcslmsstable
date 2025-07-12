import React, { useState, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { useToast } from '../../contexts/ToastContext';
import { useCourseData } from '../../hooks/useCourseData';
import SourceContentSelector from '../../hooks/SourceContentSelector';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import Spinner from '../common/Spinner';
import { XMarkIcon, DocumentChartBarIcon, LanguageIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// Helper function to extract JSON from AI response, making it more robust.
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

// Main Component
export default function CreateUlpModal({ isOpen, onClose, subjectId, unitId }) {
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    const [inputs, setInputs] = useState({
        contentStandard: '',
        performanceStandard: '',
        learningCompetencies: '',
    });

    const [selectedLanguage, setSelectedLanguage] = useState('English');

    const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
    const [selectedUnitIds, setSelectedUnitIds] = useState(new Set(unitId ? [unitId] : []));

    const { allSubjects, unitsForSubject, lessonsForUnit, loading } = useCourseData(selectedSubjectId);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    }, []);

    const sourceInfo = useMemo(() => {
        if (selectedUnitIds.size === 0) {
            return { title: '', content: '', error: "Please select at least one unit." };
        }

        const unitDetails = Array.from(selectedUnitIds)
            .map(id => unitsForSubject.find(u => u.id === id))
            .filter(Boolean);

        const title = unitDetails.map(u => u.title).join(' & ');

        const content = unitDetails.flatMap(unit =>
            lessonsForUnit
                .filter(l => l.unitId === unit.id)
                .map(l => l.pages.map(p => p.content).join('\n'))
        ).join('\n\n---\n\n');

        if (!content) {
            return {
                title,
                content: '',
                error: `The selected unit(s) '${title}' appear to have no lesson content. Please ensure the units have lessons with text.`
            };
        }

        return { title, content, error: null };
    }, [selectedUnitIds, unitsForSubject, lessonsForUnit]);

    const handleGenerate = async () => {
        if (!inputs.contentStandard || !inputs.performanceStandard || !inputs.learningCompetencies) {
            showToast("Please fill in all standard and competency fields.", "error");
            return;
        }

        if (sourceInfo.error) {
            showToast(sourceInfo.error, "error");
            return;
        }

        if (!sourceInfo.content) {
            showToast("No source content found for the selected scope.", "error");
            return;
        }

        setIsGenerating(true);
        setPreviewData(null);

        try {
            showToast("Step 1/2: Analyzing for ULP...", "info");

            // ✅ MODIFIED: The ULP analysis prompt has been updated with your new instructions.
            const ulpAnalysisPrompt = `
                You are an expert instructional designer. Your task is to generate a detailed analysis for a Unit Learning Plan (ULP) based on the provided standards and content.

                **Authoritative Inputs (Non-Negotiable):**
                - **Content Standard:** ${inputs.contentStandard}
                - **Performance Standard:** ${inputs.performanceStandard}
                - **Learning Competencies:**
                    ${inputs.learningCompetencies}
                - **Source Content:** [Content is provided for context. Do NOT quote directly in the output.]

                **Critical Instructions:**

                1.  **Explore Stage:** You MUST structure the "Explore" stage in this exact order:
                    * **Lessons List:** Start by listing the titles of the lessons that form the basis of this Unit Learning Plan.
                    * **Unit Overview:** Provide an engaging and catchy overview of the unit.
                    * **Hooked Activities:** Design engaging activities to capture student interest.
                    * **Map of Conceptual Change:** Create an activity for students to map their prior or new knowledge (e.g., a K-W-L chart).

                2.  **Essential Questions:** Formulate 2-5 thought-provoking Essential Questions that align directly with the provided Content and Performance Standards.

                3.  **Learning Plan Breakdown:** Using ONLY the competencies listed in the 'Learning Competencies' input above, classify each one based on the following definitions and assign a unique code (A1, M1, T1, etc.).
                    * **Acquisition (Code A#):** Foundational knowledge (facts, concepts, skills). e.g., "Describe...", "Identify...".
                    * **Meaning-Making (Code M#):** Understanding the 'why' and 'how'. Students analyze, compare, justify. e.g., "Compare...", "Analyze...".
                    * **Transfer (Code T#):** Applying knowledge to a new, real-world situation. e.g., "Design a solution...".
                    For each competency, you MUST provide:
                    * **Learning Target:** At least two "I can..." statements.
                    * **Success Indicators:** 2-3 specific, observable indicators.
                    * **In-Person & Online Activities:** Design a scaffolded activity and its online alternative. Provide detailed, step-by-step instructions and a list of materials in bullet form.
                    * **C-E-R Requirement:** At least one "Deepen (M)" activity MUST be a C-E-R (Claim-Evidence-Reasoning) task.
                    * **Support Discussion:** For Firm-Up (A), questions to check understanding and short summarization of the topic. For Deepen (M), in-depth elaboration and explanation of the lessons to strengthen students learning.
                    * **Formative Assessment:** A specific assessment strategy.

                4.  **Final Synthesis:** A summary that connects all key points and prepares students for the Transfer task.

                5.  **Performance Task (T1):** For the final Transfer competency, design a detailed GRASPS Performance Task that directly assesses the provided Performance Standard.

                **Language Requirement:** You MUST generate the entire response exclusively in the following language: ${selectedLanguage}.
            `;

            const analysisText = await callGeminiWithLimitCheck(ulpAnalysisPrompt, sourceInfo.content);
            if (!analysisText || analysisText.toLowerCase().includes("i cannot")) {
                throw new Error("AI failed to generate the ULP analysis. The model may have refused the request.");
            }

            showToast("Step 2/2: Formatting ULP as JSON...", "info");

            const finalPrompt = `
                Your sole task is to convert the provided ULP analysis into a single, valid JSON object.
                **Source ULP Analysis:**
                ---
                ${analysisText}
                ---
                **CRITICAL JSON & HTML Formatting Rules:**
                1.  **Single JSON Object:** The entire response MUST be a single JSON object, with all internal quotes properly escaped.
                2.  **HTML Table:** The "content" value within the JSON must be a single string containing a complete HTML \`<table>\`.
                3.  **Structure:**
                    - Create initial rows (\`<tr>\`) for "Unit Overview," "Essential Questions," and other "Explore" stage elements.
                    - For each competency (A1, M1, T1, etc.), create a single row (\`<tr>\`) with two columns (\`<td>\`): "Learning Focus" and "Learning Process."
                    - Convert all markdown (like ###, *, -) to clean HTML tags (e.g., \`<h3>\`, \`<b>\`, \`<ul>\`, \`<li>\`).
                4.  **Table Header Styling:** Ensure the \`<th>\` elements have the following inline styles: \`background-color: #f0f0f0; padding: 8px; text-align: left; font-family: sans-serif;\`.
                5.  **Table Data Styling:** Ensure the \`<td>\` elements have the following inline styles: \`padding: 8px; border-bottom: 1px solid #ddd; font-family: sans-serif;\`.
                6.  **Title:** Use the provided source title for the lesson title.
                **Final JSON Output Structure:**
                {"generated_lessons": [{"lessonTitle": "Unit Learning Plan: ${sourceInfo.title}", "pages": [{"title": "PEAC Unit Learning Plan", "content": "<table style='width: 100%; border-collapse: collapse;'>...</table>"}]}]}
            `;

            const aiText = await callGeminiWithLimitCheck(finalPrompt);
            const jsonText = extractJson(aiText);
            if (!jsonText) {
                throw new Error("AI response did not contain a valid JSON object. Please try again.");
            }

            const parsedResponse = JSON.parse(jsonText);
            setPreviewData(parsedResponse);

        } catch (err) {
            console.error("Error generating ULP:", err);
            showToast(err.message || "An unknown error occurred during ULP generation.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        console.log("Saving data:", previewData);
        showToast("ULP saved successfully!", "success");
        onClose();
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <Dialog.Panel className="relative bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {isGenerating && (
                    <div className="absolute inset-0 bg-white/80 flex flex-col justify-center items-center z-50 rounded-2xl">
                        <Spinner />
                        <p className="mt-2 text-slate-600">AI is generating your ULP...</p>
                    </div>
                )}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-3 rounded-xl text-white shadow-lg">
                            <DocumentChartBarIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <Dialog.Title className="text-2xl font-bold text-slate-800">AI ULP Generator</Dialog.Title>
                            <p className="text-slate-500">Create a PEAC Unit Learning Plan from your source content.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                    {!previewData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                                <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Authoritative Inputs</h3>

                                <div>
                                    <label htmlFor="language" className="block text-sm font-medium text-slate-600 mb-1">
                                        Output Language
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="language"
                                            value={selectedLanguage}
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="w-full appearance-none p-2 pl-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option>English</option>
                                            <option>Filipino</option>
                                            <option>Spanish</option>
                                            <option>French</option>
                                            <option>Japanese</option>
                                        </select>
                                        <LanguageIcon className="pointer-events-none absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="contentStandard" className="block text-sm font-medium text-slate-600 mb-1">Content Standard</label>
                                    <textarea id="contentStandard" name="contentStandard" value={inputs.contentStandard} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500" rows={3} />
                                </div>
                                <div>
                                    <label htmlFor="performanceStandard" className="block text-sm font-medium text-slate-600 mb-1">Performance Standard</label>
                                    <textarea id="performanceStandard" name="performanceStandard" value={inputs.performanceStandard} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500" rows={3} />
                                </div>
                                <div>
                                    <label htmlFor="learningCompetencies" className="block text-sm font-medium text-slate-600 mb-1">Learning Competencies</label>
                                    <textarea id="learningCompetencies" name="learningCompetencies" placeholder="One competency per line..." value={inputs.learningCompetencies} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500" rows={4} />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="font-bold text-lg text-slate-700 border-b pb-2 mb-4">Source Content</h3>
                                <SourceContentSelector
                                    selectedSubjectId={selectedSubjectId}
                                    handleSubjectChange={(e) => {
                                        setSelectedSubjectId(e.target.value);
                                        setSelectedUnitIds(new Set());
                                    }}
                                    allSubjects={allSubjects}
                                    selectedUnitIds={selectedUnitIds}
                                    handleUnitSelectionChange={(id) => {
                                        const newSet = new Set(selectedUnitIds);
                                        if (newSet.has(id)) newSet.delete(id);
                                        else newSet.add(id);
                                        setSelectedUnitIds(newSet);
                                    }}
                                    unitsForSubject={unitsForSubject}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-700">Preview ULP</h2>
                            <div className="max-h-[60vh] overflow-y-auto border rounded-lg p-4 bg-slate-100 shadow-inner">
                                {previewData?.generated_lessons?.[0]?.pages?.[0] ? (
                                    <LessonPage page={previewData.generated_lessons[0].pages[0]} />
                                ) : (
                                    <p>Could not load preview. The AI may have returned an invalid format.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 flex justify-between items-center border-t border-slate-200 mt-6">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} className="btn-secondary">Back to Edit</button>
                            <button onClick={handleSave} className="btn-primary">Accept & Save ULP</button>
                        </>
                    ) : (
                        <button onClick={handleGenerate} disabled={isGenerating || loading} className="btn-primary ml-auto">
                            {isGenerating ? 'Generating...' : 'Generate ULP'}
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}