import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { XMarkIcon, AcademicCapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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
        // This pre-processes the string to fix bad escape characters before parsing.
        const sanitizedString = jsonString.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        return JSON.parse(sanitizedString);
    } catch (e) {
        console.warn("Standard JSON.parse failed. Attempting to fix trailing commas.", e);
        const sanitizedWithCommas = jsonString.replace(/,\s*([}\]])/g, '$1');
        try {
            return JSON.parse(sanitizedWithCommas);
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

    const [failedLessonNumber, setFailedLessonNumber] = useState(null);

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

	const getMasterInstructions = () => {
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

	    return `
	            **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer. Think of yourself as writing a chapter for a "page-turner" textbook that makes readers feel smarter.

	            **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${formData.gradeLevel}**. Your writing must be clear, accessible, and tailored to the cognitive and developmental level of this grade. The complexity of vocabulary, sentence structure, and conceptual depth should be appropriate for a ${formData.gradeLevel}th grader.

	            ${perspectiveInstruction}

	            {/* ✅ NEW: Enhanced instructions for content depth */}
	            **CRITICAL INSTRUCTION FOR CORE CONTENT (NON-NEGOTIABLE):** Your primary goal is to create **rich, detailed, and engaging content**, not a brief summary.
	            - **Tell a Story:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the science or the concept. Introduce key figures, explore the historical context, and delve into fascinating real-world applications.
	            - **Unpack the Details:** Do not just state a fact; explain it. Provide background, context, and examples. Use vivid analogies and metaphors to illuminate complex ideas. The content should flow logically and build on itself, like a well-structured story.
	            - **ABSOLUTE RULE - NO SKIMMING:** You are explicitly forbidden from creating a high-level summary. You must **write with depth and detail**, assuming the reader has no prior knowledge.

	            **CRITICAL FORMATTING RULE (NON-NEGOTIABLE):** You MUST NOT use Markdown code block formatting (like indenting with four spaces or using triple backticks \`\`\`) for regular content like bulleted lists or standard paragraphs. Code block formatting is reserved ONLY for actual programming code snippets.

	            **CRITICAL JSON STRING RULE (NON-NEGOTIABLE):** When writing text content inside the JSON, do NOT escape standard quotation marks.
	            - **Correct:** \`"title": "The Art of \\"How Much?\\""\`
	            - **Incorrect:** \`"title": "The Art of \\\\\\"How Much?\\\\\\""\`

	            **CRITICAL TEXT FORMATTING RULE (NON-NEGOTIABLE):**
	            - To make text bold, you MUST use Markdown's double asterisks (**).
	            - You are STRICTLY FORBIDDEN from using LaTeX commands like \\textbf{} or \\textit{} for text formatting.

	            **CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
	            You MUST use LaTeX for all mathematical equations, variables, and chemical formulas.
	            - **For INLINE formulas** (within a sentence), you MUST use single dollar signs. Correct: The formula for water is $H_2O$.
	            - **For BLOCK formulas** (on their own line), you MUST use double dollar signs. This is for larger, centered formulas.
	            - **CRITICAL LATEX ESCAPING IN JSON:** To prevent the JSON from breaking, every single backslash \`\\\` in your LaTeX code MUST be escaped with a second backslash. So, \`\\\` becomes \`\\\\\`.
	            - **CORRECT EXAMPLE:** To write the LaTeX formula \`$$% \\text{ by Mass} = \\frac{\\text{Mass of Solute}}{\\text{Mass of Solution}} \\times 100\\%%$$\`, you MUST write it in the JSON string like this:
	              \`"content": "$$% \\\\text{ by Mass} = \\\\frac{\\\\text{Mass of Solute}}{\\\\text{Mass of Solution}} \\\\times 100\\%%$$"\`
	            - **INCORRECT (This will break):** \`"content": "$$% \\text{ by Mass} ..."\`

	            **ABSOLUTE RULE FOR CONTENT CONTINUATION (NON-NEGOTIABLE):** When a single topic or section is too long for one page and its discussion must continue onto the next page, the heading for that topic (the 'title' in the JSON) MUST ONLY appear on the very first page. ALL subsequent pages for that topic MUST have an empty string for their title: \`"title": ""\`.

	            **Textbook Chapter Structure (NON-NEGOTIABLE):** You MUST generate the lesson pages in this exact sequence. The 'title' field for each special section MUST be exactly as specified.
	            1. **${objectivesLabel}:** The lesson MUST begin with the learning objectives (in the "learningObjectives" array).
	            2. **Engaging Introduction:** The first page of the 'pages' array must be a captivating opening.
	            3. **Introductory Activity ("${letsGetStartedLabel}"):** A single page with a short warm-up activity. The 'title' MUST be exactly "${letsGetStartedLabel}".
	            4. **Core Content Sections:** The main narrative content across multiple pages.
	            5. **Check for Understanding ("${checkUnderstandingLabel}"):** A page with a thoughtful activity. The 'title' MUST be exactly "${checkUnderstandingLabel}".
	            6. **Summary ("${lessonSummaryLabel}"):** A page with a concise summary.
	            7. **Conclusion ("${wrapUpLabel}"):** A page with a powerful concluding statement.
	            8. **Assessment ("${endOfLessonAssessmentLabel}"):** A multi-page assessment section. The first page's 'title' MUST be "${endOfLessonAssessmentLabel}". It must contain 8-10 questions.
	            9. **Answer Key ("${answerKeyLabel}"):** A page with the answers. The 'title' MUST be exactly "${answerKeyLabel}".
	            10. **References ("${referencesLabel}"):** The absolute last page must ONLY contain references. The 'title' MUST be exactly "${referencesLabel}".

	            **ABSOLUTE RULE FOR DIAGRAMS (NON-NEGOTIABLE):**
	            When a diagram is necessary, you MUST generate a clean, modern, SVG diagram. The page 'type' MUST be "diagram-data". The 'content' MUST contain the full SVG code.

	            **CRITICAL GOAL FOR REALISM:** Your primary goal is to create a diagram that is a **faithful and structurally accurate representation of the real-world object**. You must act as a technical illustrator drawing from observation. Do not oversimplify or abstract the object into basic geometric shapes.

	            **Layout and Font Rules:**
	            - **ViewBox is Mandatory:** The SVG MUST have a \`viewBox\` attribute for proper scaling.
	            - **STRICT FONT SIZE RULE:** You MUST use a **font-size between "4px" and "6px"**.
	            - **Text Anchoring:** Use the \`text-anchor\` attribute (e.g., "middle", "start", "end") to align text.
	            - **NO LATEX IN SVG:** Use Unicode characters for symbols (e.g., 'δ', '→', '⁺').

	            - **Intelligent Label Placement with Leader Lines:** This is CRITICAL. Every label must be unambiguously connected to the component it describes. You MUST **draw a thin, straight <line> or simple dashed <path> from the text label directly to its corresponding feature** on the diagram. This removes all confusion.

	            **Visual Style & Detail Guide:**
	            - **Anatomical Accuracy:** The shape, proportions, and key components of the object MUST be true-to-life. For example, a laboratory beaker must have its **pouring spout and rolled rim**. A microscope must have its eyepiece, objective lenses, and stage in the correct arrangement. You must draw the object's specific, defining contours.
	            - **Use Gradients for Depth:** For container objects, use a \`<linearGradient>\` in the \`<defs>\` section to create a subtle 3D or glassy effect.
	            - **Add Highlights:** For glassy or shiny surfaces, add a small, white path or shape with partial opacity to simulate a reflection.
	            - **Use Professional Colors:** Avoid overly bright, saturated "cartoon" colors. Use a more muted, professional color palette.

	            **Advanced Example (Follow this style for a realistic, clearly-labeled beaker):**
	            \`<svg viewBox="0 0 160 180" font-family="sans-serif">
	              <defs>
	                <linearGradient id="glassyLook" x1="0%" y1="0%" x2="100%" y2="0%">
	                  <stop offset="0%" style="stop-color:#FFFFFF; stop-opacity:0.5" />
	                  <stop offset="50%" style="stop-color:#E0F7FA; stop-opacity:0.7" />
	                  <stop offset="100%" style="stop-color:#B2EBF2; stop-opacity:0.9" />
	                </linearGradient>
	              </defs>

	              {/* Structurally accurate beaker path with rolled rim and pouring spout */}
	              <path d="M25 15 C 20 15, 20 25, 25 25 V 170 H 125 V 25 C 130 25, 130 15, 125 15 H 90 C 85 5, 65 5, 60 15 H 25 Z" fill="url(#glassyLook)" stroke="#004D40" stroke-width="1.5"/>

	              {/* Liquid inside the beaker */}
	              <rect x="27" y="100" width="96" height="68" fill="#4DD0E1" opacity="0.75" rx="2"/>

	              {/* Glass highlight on the side */}
	              <path d="M 40 30 C 32 60, 32 120, 40 150" fill="white" opacity="0.6" stroke="none" />

	              {/* --- Labels with Leader Lines --- */}
	              <g font-size="6px" fill="#004D40" stroke="#37474F">
	                {/* Label for Pouring Spout */}
	                <text x="75" y="4" text-anchor="middle">Pouring Spout</text>
	                <path d="M75 7 L75 12" stroke-width="1"/>

	                {/* Label for Liquid */}
	                <text x="130" y="140" text-anchor="start">H₂O Solution</text>
	                <path d="M100 138 L128 138" stroke-width="1"/>

	                {/* Label for a Measurement Mark using a dashed line */}
	                <text x="0" y="103" text-anchor="start">100ml Mark</text>
	                <path d="M45 101.5 L25 101.5" stroke-width="1" stroke-dasharray="2 2"/>
	              </g>
	            </svg>\`

	            **CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in ${formData.language}.**
	    `;
	};
		
    const generateSingleLesson = async (lessonNumber, totalLessons, previousLessonSummary) => {
        let lastError = null;
        let lastResponseText = null;
        const masterInstructions = getMasterInstructions();

        let continuityInstruction = '';
        if (lessonNumber > 1 && previousLessonSummary) {
            continuityInstruction = `
                **CRITICAL CONTINUITY INSTRUCTION:** You are generating Lesson ${lessonNumber}. The previous lesson (Lesson ${lessonNumber - 1}) covered the following topics:
                ---
                **Summary of Previous Lesson:**
                ${previousLessonSummary}
                ---
                You MUST ensure this new lesson logically follows the previous one. Do not repeat the content from the summary. Begin with a brief recap or transition, and then introduce the new topics for this current lesson.
            `;
        }

        for (let attempt = 1; attempt <= 3; attempt++) {
            let prompt;
            if (attempt === 1) {
                prompt = `You are an expert instructional designer.
                    **ABSOLUTE PRIMARY RULE: YOUR ENTIRE RESPONSE MUST BE A SINGLE, VALID JSON OBJECT.**
                    **JSON SYNTAX RULES (NON-NEGOTIABLE):** 1. All keys in quotes. 2. Colon after every key. 3. Backslashes escaped (\\\\). 4. No trailing commas.
                    **CRITICAL PRE-FLIGHT CHECK:** Before outputting, verify: 1. No missing colons? 2. No missing commas? 3. Brackets/braces matched? 4. Backslashes escaped?
                    **OUTPUT JSON STRUCTURE:** {"generated_lessons": [{"lessonTitle": "...", "learningObjectives": [...], "pages": [...]}]}
                    ---
                    **GENERATION TASK DETAILS**
                    ---
                    **Core Content:** Subject: "${subjectName}", Grade: ${formData.gradeLevel}, Topic: "${formData.content}"
                    **Learning Competencies:** "${formData.learningCompetencies}"
                    **CRITICAL OBJECTIVES INSTRUCTION:** Generate 'learningObjectives' array with 3-5 objectives.
                    **Lesson Details:** You are generating **Lesson ${lessonNumber} of ${totalLessons}**. The "lessonTitle" MUST be unique and start with "Lesson ${lessonNumber}: ".
                    ${continuityInstruction}
                    **PAGE COUNT/DEPTH:** Minimum of **30 pages for this single lesson**. Achieve this with deep narrative richness.
                    ---
                    **MASTER INSTRUCTION SET:**
                    ---
                    ${masterInstructions}`;
            } else {
                showToast(`AI response was invalid. Retrying Lesson ${lessonNumber} (Attempt ${attempt})...`, "warning");
                prompt = `The following text is not valid JSON and produced this error: "${lastError.message}". Correct the syntax and return ONLY the valid JSON object. BROKEN JSON: ${lastResponseText}`;
            }

            try {
                const aiResponse = await callGeminiWithLimitCheck(prompt);
                lastResponseText = extractJson(aiResponse);
                const parsedResponse = tryParseJson(lastResponseText);
                return parsedResponse; 
            } catch (error) {
                console.error(`Attempt ${attempt} for Lesson ${lessonNumber} failed:`, error);
                lastError = error;
            }
        }
        throw lastError;
    };

    const runGenerationLoop = async (startLessonNumber) => {
        setIsGenerating(true);
        setFailedLessonNumber(null);
        
        let currentLessons = previewData ? previewData.generated_lessons : [];
        const lessonSummaryLabel = formData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";

        const findSummaryContent = (lesson) => {
            if (!lesson || !lesson.pages) return "";
            const summaryPage = lesson.pages.find(p => p.title === lessonSummaryLabel);
            return summaryPage ? summaryPage.content : "";
        };

        try {
            if (!formData.content || !formData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

            for (let i = startLessonNumber; i <= formData.lessonCount; i++) {
                showToast(`Generating Lesson ${i} of ${formData.lessonCount}...`, "info", 10000);
                
                const lastSuccessfulLesson = currentLessons.length > 0 ? currentLessons[currentLessons.length - 1] : null;
                const previousLessonSummary = lastSuccessfulLesson ? findSummaryContent(lastSuccessfulLesson) : "";

                const singleLessonData = await generateSingleLesson(i, formData.lessonCount, previousLessonSummary);
                
                if (singleLessonData && singleLessonData.generated_lessons && singleLessonData.generated_lessons.length > 0) {
                    currentLessons.push(...singleLessonData.generated_lessons);
                    setPreviewData({ generated_lessons: [...currentLessons] });
                } else {
                    throw new Error(`Received invalid or empty data for lesson ${i}.`);
                }
            }
            
            setPreviewData({ generated_lessons: currentLessons });
            showToast("All lessons generated successfully!", "success");

        } catch (err) {
            const failedLessonNum = currentLessons.length + 1;
            console.error(`Error during generation of Lesson ${failedLessonNum}:`, err);
            setFailedLessonNumber(failedLessonNum);
            const userFriendlyError = `Failed to generate Lesson ${failedLessonNum}. You can try to continue the generation.`;
            showToast(userFriendlyError, "error", 15000);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleInitialGenerate = async () => {
        setPreviewData(null);
        runGenerationLoop(1);
    };

    const handleContinueGenerate = () => {
        if (failedLessonNumber) {
            runGenerationLoop(failedLessonNumber);
        }
    };

    const handleBackToEdit = () => {
        setPreviewData(null);
        setFailedLessonNumber(null);
    };
    
    const handleRegenerate = async (regenerationNote) => {
        showToast("To regenerate, please go back to edit and start a new generation.", "warning");
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
                            <textarea value={extraInstruction} onChange={(e) => setExtraInstruction(e.target.value)} placeholder="Make changes to the entire set of lessons..." className="w-full border p-2 rounded-lg text-sm" rows={2} />
                        </div>
                    )}
                </div>
                <div className="pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-slate-200 mt-4 sm:mt-6">
                    {previewData ? (
                         <>
                         <button onClick={handleBackToEdit} disabled={isSaving || isGenerating} className="btn-secondary w-full sm:w-auto text-sm">Back to Edit</button>
                         <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {failedLessonNumber ? (
                                 <button onClick={handleContinueGenerate} disabled={isGenerating} className="btn-primary w-full sm:w-auto text-sm flex items-center justify-center gap-2">
                                     <ArrowPathIcon className="h-5 w-5" />
                                     Continue from Lesson {failedLessonNumber}
                                 </button>
                            ) : (
                                 <button onClick={() => handleRegenerate(extraInstruction)} disabled={isGenerating} className="btn-secondary w-full sm:w-auto text-sm">Regenerate</button>
                            )}
                             <button onClick={handleSave} className="btn-primary w-full sm:w-auto text-sm" disabled={!isValidPreview || isSaving || failedLessonNumber}>
                                 {isSaving ? 'Saving...' : 'Accept & Save'}
                             </button>
                         </div>
                     </>
                    ) : (
                        <button onClick={handleInitialGenerate} disabled={isGenerating} className="btn-primary ml-auto w-full sm:w-auto text-sm">
                            {isGenerating ? 'Generating...' : 'Generate Document'}
                        </button>
                    )}
                </div>
            </Dialog.Panel>
        </Dialog>
    );
}
