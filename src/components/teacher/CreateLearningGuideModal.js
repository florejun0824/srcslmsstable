import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { collection, query, where, onSnapshot, writeBatch, doc, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { XMarkIcon, AcademicCapIcon, ArrowPathIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// Helper functions
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

const initialFormData = {
    content: '',
    lessonCount: 1,
    learningCompetencies: '',
    contentStandard: '',
    performanceStandard: '',
    language: 'English',
    gradeLevel: '7',
};

export default function CreateLearningGuideModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [failedLessonNumber, setFailedLessonNumber] = useState(null);
    const [lessonProgress, setLessonProgress] = useState({ current: 0, total: 0 });
    const [formData, setFormData] = useState(initialFormData);
    const [availableUnits, setAvailableUnits] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [existingLessonCount, setExistingLessonCount] = useState(0);
    const [subjectName, setSubjectName] = useState('');
    const [subjectContext, setSubjectContext] = useState(null);
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());

    const resetState = () => {
        setFormData(initialFormData);
        setPreviewData(null);
        setIsGenerating(false);
        setIsSaving(false);
        setFailedLessonNumber(null);
        setLessonProgress({ current: 0, total: 0 });
        setSubjectContext(null);
        setScaffoldLessonIds(new Set());
        setExpandedScaffoldUnits(new Set());
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // --- Data Fetching Effects ---
    useEffect(() => {
        if (isOpen && subjectId) {
            const fetchFullSubjectContext = async () => {
                try {
                    const subjectRef = doc(db, 'courses', subjectId);
                    const subjectSnap = await getDoc(subjectRef);
                    setSubjectName(subjectSnap.exists() ? subjectSnap.data().title : 'this subject');
                    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    const unitsData = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setSubjectContext({ units: unitsData, lessons: lessonsData });
                } catch (error) {
                    console.error("Error fetching subject context:", error);
                    showToast("Could not scan existing subject content.", "error");
                }
            };
            fetchFullSubjectContext();
        }
    }, [isOpen, subjectId, showToast]);

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
                if (unitsData.length > 0 && !selectedUnitId) {
                    setSelectedUnitId(unitsData[0].id);
                } else if (unitsData.length === 0) {
                    setSelectedUnitId('');
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen, unitId, subjectId, selectedUnitId]);

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
    
    // --- Handlers & Memos ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        const finalValue = name === 'lessonCount' ? Math.max(1, Number(value)) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const scaffoldInfo = useMemo(() => {
        if (scaffoldLessonIds.size === 0 || !subjectContext) return { summary: '' };
        const relevantScaffoldLessons = subjectContext.lessons.filter(lesson => scaffoldLessonIds.has(lesson.id));
        const summary = relevantScaffoldLessons.map(lesson => {
            const pageContentSample = lesson.pages.map(p => p.content).join(' ').substring(0, 200);
            return `- Lesson Title: "${lesson.title}"\n  - Key Concepts/Activities Summary: ${pageContentSample}...`;
        }).join('\n');
        return { summary };
    }, [scaffoldLessonIds, subjectContext]);

    const handleToggleUnitExpansion = (unitId) => {
        const newSet = new Set(expandedScaffoldUnits);
        if (newSet.has(unitId)) newSet.delete(unitId);
        else newSet.add(unitId);
        setExpandedScaffoldUnits(newSet);
    };

    const handleUnitCheckboxChange = (lessonsInUnit) => {
        const lessonIdsInUnit = lessonsInUnit.map(l => l.id);
        const currentlySelectedInUnit = lessonIdsInUnit.filter(id => scaffoldLessonIds.has(id));
        const newSet = new Set(scaffoldLessonIds);
        if (currentlySelectedInUnit.length === lessonIdsInUnit.length) {
            lessonIdsInUnit.forEach(id => newSet.delete(id));
        } else {
            lessonIdsInUnit.forEach(id => newSet.add(id));
        }
        setScaffoldLessonIds(newSet);
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
		                **CRITICAL SOURCE REQUIREMENT (NON-NEGOTIABLE):** For all content and for the "${referencesLabel}" section, you MUST prioritize citing and referencing official Catholic sources. This includes, but is not limited to: the **Catechism of the Catholic Church (CCC)**, the **Youth Catechism (Youcat)**, relevant **Apostolic Letters**, **Encyclical Letters**, and documents from Vatican II. Secular sources may be used sparingly, but the core foundation must be these official Church documents.
		        `;
		    }

		    return `
		                **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer. Think of yourself as writing a chapter for a "page-turner" textbook that makes readers feel smarter. Do not explicitly state your role or persona.
		                **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${formData.gradeLevel}**. Your writing must be clear, accessible, and tailored to the cognitive and developmental level of this grade. The complexity of vocabulary, sentence structure, and conceptual depth should be appropriate for a ${formData.grade_level}th grader.
		                ${perspectiveInstruction}
		                **CRITICAL INSTRUCTION FOR CORE CONTENT:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the science or the concept. Go beyond surface-level definitions; explain the "why" and "how". Introduce key figures, explore historical context, and delve into fascinating real-world applications. Use vivid analogies and metaphors to illuminate complex ideas. The content should flow logically and build on itself, like a well-structured story.
                
		                **CRITICAL INSTRUCTION FOR INTERACTIVITY (NON-NEGOTIABLE):** To keep students engaged, you MUST embed small, interactive elements directly within the core content pages. These are not full-page activities, but rather short, thought-provoking prompts that break up the text.
		                - Use Markdown blockquotes (\`>\`) to format these interactive elements.
		                - Precede the prompt with a bolded label.
		                - **Examples:**
		                    - **> Think About It:** If gravity suddenly disappeared, what's the first thing that would happen to you?
		                    - **> Quick Poll:** Raise your hand if you think plants breathe. We'll find out the answer in the next section!
		                    - **> Case Study Spotlight:** Let's look at how the discovery of penicillin was a complete accident...

		                **CRITICAL FORMATTING RULE (NON-NEGOTIABLE):** You MUST NOT use Markdown code block formatting (like indenting with four spaces or using triple backticks \\\`\\\`\\\`) for regular content like bulleted lists or standard paragraphs. Code block formatting is reserved ONLY for actual programming code snippets.
                
		                **CRITICAL JSON STRING RULE (NON-NEGOTIABLE):** When writing text content inside the JSON, do NOT escape standard quotation marks.
		                - **Correct:** \\\`"title": "The Art of \\"How Much?\\""\\\`
		                - **Incorrect:** \\\`"title": "The Art of \\\\\\"How Much?\\\\\\""\\\`
        
		                **CRITICAL TEXT FORMATTING RULE (NON-NEGOTIABLE):**
		                - To make text bold, you MUST use Markdown's double asterisks (**).
		                - You are STRICTLY FORBIDDEN from using LaTeX commands like \\textbf{} or \\textit{} for text formatting.
		                - **✅ NEW (ABSOLUTE RULE):** You are **STRICTLY FORBIDDEN** from bolding the introductory phrase or "title" of a bullet point. Bolding should only be used for genuine emphasis on specific words within a sentence.
		                    - **Correct:** \`* Handle with Care: Carry glassware with two hands if it's large.\`
		                    - **INCORRECT:** \`* **Handle with Care**: Carry glassware with two hands if it's large.\`

		                **CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
		                You MUST use LaTeX for all mathematical equations, variables, and chemical formulas.
		                - **For INLINE formulas** (within a sentence), you MUST use single dollar signs. Correct: The formula for water is $H_2O$.
		                - **For BLOCK formulas** (on their own line), you MUST use double dollar signs. This is for larger, centered formulas.
		                - **CRITICAL LATEX ESCAPING IN JSON:** To prevent the JSON from breaking, every single backslash \`\\\` in your LaTeX code MUST be escaped with a second backslash. So, \`\\\` becomes \`\\\\\`.
		                - **CORRECT EXAMPLE:** To write the LaTeX formula \`$$% \\text{ by Mass} = \\frac{\\text{Mass of Solute}}{\\text{Mass of Solution}} \\times 100\\%%$$\`, you MUST write it in the JSON string like this:
		                \\\`- "content": "$$% \\\\text{ by Mass} = \\\\frac{\\\\text{Mass of Solute}}{\\\\text{Mass of Solution}} \\\\times 100\\%%$$"\\\`
		                \\\`- **INCORRECT (This will break):** "content": "$$% \\\\text{ by Mass} ..."\\\`
                
		                **ABSOLUTE RULE FOR CONTENT CONTINUATION (NON-NEGOTIABLE):** When a single topic or section is too long for one page and its discussion must continue onto the next page, a heading for that topic (the 'title' in the JSON) MUST ONLY appear on the very first page. ALL subsequent pages for that topic MUST have an empty string for their title: \\\`"title": ""\\\`.
	                
		                **CRITICAL INSTRUCTION FOR REFERENCES (NON-NEGOTIABLE):** All sources cited in the "${referencesLabel}" section MUST be as up-to-date as possible. Prioritize scholarly articles, textbooks, and official publications from the last 5-10 years, unless citing foundational historical documents.

		                **Textbook Chapter Structure (NON-NEGOTIABLE):** You MUST generate the lesson pages in this exact sequence. The 'title' field for each special section MUST be exactly as specified.
		                1. **${objectivesLabel}:** The lesson MUST begin with the learning objectives (in the "learningObjectives" array).
		                2. **Engaging Introduction:** The first page of the 'pages' array must be a captivating opening.
		                3. **Introductory Activity ("${letsGetStartedLabel}"):** A single page with a short warm-up activity. The 'title' MUST be exactly "${letsGetStartedLabel}".
		                4. **Core Content Sections:** The main narrative content across multiple pages. This should be a continuous, well-structured story that is rich with detail and flows logically from one page to the next. Do not use page numbers in the content or titles.
		                5. **Check for Understanding ("${checkUnderstandingLabel}"):** A page with a thoughtful activity. The 'title' MUST be exactly "${checkUnderstandingLabel}".
		                6. **Summary ("${lessonSummaryLabel}"):** A page with a concise summary.
		                7. **Conclusion ("${wrapUpLabel}"):** A page with a powerful concluding statement.
		                8. **Assessment ("${endOfLessonAssessmentLabel}"):** A multi-page assessment section. The first page's 'title' MUST be "${endOfLessonAssessmentLabel}". It must contain 8-10 questions.
		                9. **Answer Key ("${answerKeyLabel}"):** A page with the answers. The 'title' MUST be exactly "${answerKeyLabel}".
		                10. **References ("${referencesLabel}"):** The absolute last page must ONLY contain references. The 'title' MUST be exactly "${referencesLabel}".

		                **ABSOLUTE RULE FOR SVG DIAGRAMS (NON-NEGOTIABLE):**
		                When a visual aid is necessary to explain a concept, you MUST generate valid, self-contained SVG code.
		                - The page 'type' MUST be **"svg"**.
		                - The 'content' MUST be a string containing the SVG code.
		                - **Styling Rules:**
		                    - Use a clean, minimalist, educational textbook style.
		                    - All styles MUST be inline attributes (e.g., \`stroke="#212121"\`, \`fill="#E3F2FD"\`). DO NOT use \`<style>\` tags.
		                    - Use a consistent color palette: Main lines/text: \`#212121\`, Primary emphasis color: \`#4285F4\`, Fill color: \`#E3F2FD\`.
		                    - Use a standard sans-serif font like 'Arial' or 'Helvetica' via the \`font-family\` attribute. Font size should be legible, around 12-14px.
		                - **Labeling Rules:**
		                    - All key parts of the diagram MUST be clearly labeled using \`<text>\` elements.
		                    - Use \`<line>\` or \`<path>\` elements for leader lines pointing from labels to the correct part of the diagram.
		                - **Code Quality:** The SVG code MUST be valid and well-formatted.

		                **EXAMPLE of a good SVG diagram:**
		                - "content": "<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"300\\" height=\\"250\\" viewBox=\\"0 0 300 250\\"> <path d=\\"M60 50 H240 L220 220 H80 Z\\" stroke=\\"#212121\\" stroke-width=\\"2\\" fill=\\"#E3F2FD\\"/> <path d=\\"M60 50 Q150 20 240 50\\" stroke=\\"#212121\\" stroke-width=\\"2\\" fill=\\"none\\"/> <rect x=\\"80\\" y=\\"100\\" width=\\"140\\" height=\\"120\\" fill=\\"#4285F4\\" fill-opacity=\\"0.5\\"/> <text x=\\"230\\" y=\\"40\\" font-family=\\"Arial\\" font-size=\\"12\\" fill=\\"#212121\\">Pouring Spout</text> <line x1=\\"220\\" y1=\\"45\\" x2=\\"210\\" y2=\\"50\\" stroke=\\"#212121\\" stroke-width=\\"1\\"/> <text x=\\"10\\" y=\\"160\\" font-family=\\"Arial\\" font-size=\\"12\\" fill=\\"#212121\\">100ml Mark</text> <line x1=\\"60\\" y1=\\"160\\" x2=\\"80\\" y2=\\"160\\" stroke=\\"#212121\\" stroke-width=\\"1\\"/> </svg>"

		                **CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in ${formData.language}.**
		            `;
		};
		
	const generateSingleLesson = async (lessonNumber, totalLessons, previousLessonsContext, existingSubjectContext) => {
	    let lastError = null;
	    let lastResponseText = null;
	    const masterInstructions = getMasterInstructions();

	    // The most important instructions are now at the top of the prompt to ensure the AI prioritizes them.
	const scaffoldingInstruction = `
	    **PRIMARY ANALYSIS TASK (NON-NEGOTIABLE):** Before generating anything, you MUST act as a curriculum continuity expert. Your most critical task is to meticulously analyze all the provided context below to prevent any topical repetition.

	    ---
	    ### CONTEXT: PREVIOUSLY COVERED MATERIAL
	    This section contains all topics, objectives, and keywords from lessons that have already been created. You are strictly forbidden from re-teaching these specific concepts.

	    **1. User-Selected Prerequisite Lessons:**
	    ${scaffoldInfo.summary || "No specific prerequisite lessons were selected."}

	    **2. Other Lessons Existing in this Subject:**
	    ${existingSubjectContext || "No other lessons exist yet."}

	    **3. Lessons Just Generated in this Session:**
	    ${previousLessonsContext || "No other lessons have been generated in this session."}
	    ---

	    ### YOUR GENERATION RULES (ABSOLUTE)
	    1.  **DO NOT REPEAT:** You are strictly forbidden from creating a lesson, activity, or assessment question that covers the same learning objectives or keywords mentioned in the context above.
	    2.  **IDENTIFY THE GAP:** Your new lesson must address a logical "next step" or a knowledge gap that is not covered by the existing material.
	    3.  **BUILD A BRIDGE:** If appropriate, your introduction should briefly reference a concept from a prerequisite lesson to create a smooth transition, but it must immediately move into new material.

	    **YOUR TASK:** Based on your analysis of the context above, generate a new, unique lesson about **"${formData.content}"**.
	`;
    
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
	                **CRITICAL INSTRUCTION FOR LESSON TITLES (NON-NEGOTIABLE):** The "lessonTitle" MUST be academic, formal, and descriptive. It must clearly state the core topic of the lesson.
	                    - **GOOD Example:** "Lesson 1: The Principles of Newtonian Mechanics"
	                    - **BAD Example:** "Lesson 1: Fun with Physics!"
	                **Lesson Details:** You are generating **Lesson ${lessonNumber} of ${totalLessons}**. The "lessonTitle" MUST be unique and start with "Lesson ${lessonNumber}: ".
	                ${scaffoldingInstruction}
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
            if (!lesson || !lesson.pages) return "No summary available.";
            const summaryPage = lesson.pages.find(p => p.title === lessonSummaryLabel);
            return summaryPage ? summaryPage.content : "Summary page not found.";
        };

        let existingSubjectContextString = "No existing content found.";
        if (subjectContext && subjectContext.units.length > 0) {
            existingSubjectContextString = subjectContext.units
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map(unit => {
                    const lessonsInUnit = subjectContext.lessons
                        .filter(lesson => lesson.unitId === unit.id)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map(lesson => `  - Lesson: ${lesson.title}`)
                        .join('\n');
                    return `Unit: ${unit.title}\n${lessonsInUnit}`;
                }).join('\n\n');
        }

        try {
            if (!formData.content || !formData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

            for (let i = startLessonNumber; i <= formData.lessonCount; i++) {
                setLessonProgress({ current: i, total: formData.lessonCount });
                showToast(`Generating Lesson ${i} of ${formData.lessonCount}...`, "info", 10000);
            
                const previousLessonsContext = currentLessons
                    .map((lesson, index) => `Lesson ${index + 1}: "${lesson.lessonTitle}"\nSummary: ${findSummaryContent(lesson)}`)
                    .join('\n---\n');

                const singleLessonData = await generateSingleLesson(
                    i, 
                    formData.lessonCount, 
                    previousLessonsContext,
                    existingSubjectContextString
                );
            
                if (singleLessonData && singleLessonData.generated_lessons && singleLessonData.generated_lessons.length > 0) {
                    currentLessons.push(...singleLessonData.generated_lessons);
                    setPreviewData({ generated_lessons: [...currentLessons] });
                } else {
                    throw new Error(`Received invalid or empty data for lesson ${i}.`);
                }
            }
        
            setPreviewData({ generated_lessons: currentLessons });
            setLessonProgress({ current: 0, total: 0 });
            showToast("All lessons generated successfully!", "success");

        } catch (err) {
            const failedLessonNum = currentLessons.length + 1;
            console.error(`Error during generation of Lesson ${failedLessonNum}:`, err);
            setFailedLessonNumber(failedLessonNum);
            setLessonProgress({ current: failedLessonNum, total: formData.lessonCount });
            const userFriendlyError = `Failed to generate Lesson ${failedLessonNum}. You can try to continue the generation.`;
            showToast(userFriendlyError, "error", 15000);
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
            handleClose();
        } catch (err) {
            console.error("Save error:", err);
            showToast("Failed to save lessons.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackToEdit = () => {
        setPreviewData(null);
        setFailedLessonNumber(null);
        setLessonProgress({ current: 0, total: 0 });
    };

    const handleInitialGenerate = () => {
        setPreviewData(null);
        runGenerationLoop(1);
    };

    const handleContinueGenerate = () => {
        if (failedLessonNumber) {
            runGenerationLoop(failedLessonNumber);
        }
    };

    const isValidPreview = previewData && !previewData.error && Array.isArray(previewData.generated_lessons);
    const currentObjectivesLabel = formData.language === 'Filipino' ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives';
    const objectivesIntro = formData.language === 'Filipino' 
        ? 'Sa pagtatapos ng araling ito, magagawa ng mga mag-aaral na:' 
        : 'By the end of this lesson, students will be able to:';

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[110]">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <Dialog.Panel className="relative bg-zinc-50/90 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                    {(isGenerating || isSaving) && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col justify-center items-center z-50 rounded-2xl">
                            <InteractiveLoadingScreen 
                                topic={formData.content || "new ideas"} 
                                isSaving={isSaving} 
                                lessonProgress={lessonProgress}
                            />
                        </div>
                    )}
                    <header className="flex justify-between items-start pb-4 border-b border-zinc-200/80">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-blue-500 p-3 rounded-xl text-white shadow-lg flex-shrink-0">
                                <AcademicCapIcon className="h-7 w-7" />
                            </div>
                            <div>
                                <Dialog.Title className="text-xl sm:text-2xl font-bold text-zinc-900">AI Learning Guide Generator</Dialog.Title>
                                <p className="text-sm text-zinc-500">Create new student-facing lessons from scratch.</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-1.5 rounded-full text-zinc-500 bg-zinc-200/80 hover:bg-zinc-300/80 flex-shrink-0">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </header>
                    <main className="flex-1 overflow-y-auto py-5 -mr-3 pr-3">
                        {!previewData ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pb-2">Core Content</h3>
                                    {availableUnits.length > 0 && !unitId && (
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Destination Unit</label>
                                            <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="form-input-ios">
                                                {availableUnits.map(unit => (<option key={unit.id} value={unit.id}>{unit.title}</option>))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Main Content / Topic</label>
                                        <textarea placeholder="e.g., The Photosynthesis Process" name="content" value={formData.content} onChange={handleChange} className="form-input-ios" rows={3} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Learning Competencies</label>
                                        <textarea placeholder="e.g., Describe the process of photosynthesis..." name="learningCompetencies" value={formData.learningCompetencies} onChange={handleChange} className="form-input-ios" rows={4} />
                                    </div>
                                    {/* --- RESTORED FIELDS --- */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Content Standard <span className="text-zinc-400">(Optional)</span></label>
                                        <textarea name="contentStandard" value={formData.contentStandard} onChange={handleChange} className="form-input-ios" rows={2} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Performance Standard <span className="text-zinc-400">(Optional)</span></label>
                                        <textarea name="performanceStandard" value={formData.performanceStandard} onChange={handleChange} className="form-input-ios" rows={2} />
                                    </div>
                                    <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pt-2 pb-2">Settings</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Language</label>
                                            <select name="language" value={formData.language} onChange={handleChange} className="form-input-ios">
                                                <option>English</option><option>Filipino</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-600 mb-1.5">Grade Level</label>
                                            <select name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} className="form-input-ios">
                                                {[7, 8, 9, 10, 11, 12].map(grade => <option key={grade} value={grade}>Grade {grade}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Number of Lessons</label>
                                        <input type="number" name="lessonCount" min="1" max="10" value={formData.lessonCount} onChange={handleChange} className="form-input-ios" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-zinc-700 border-b border-zinc-200 pb-2">Scaffolding (Optional)</h3>
                                    <div className="bg-white/50 p-4 rounded-xl max-h-[26rem] overflow-y-auto">
                                        <p className="text-xs text-zinc-500 mb-3">Explicitly select lessons for the AI to build upon.</p>
                                        {subjectContext && subjectContext.units.length > 0 ? (
                                            subjectContext.units
                                                .slice()
                                                .sort((a, b) => {
                                                    const getUnitNumber = (title) => {
                                                        if (!title) return Infinity;
                                                        const match = title.match(/\d+/);
                                                        return match ? parseInt(match[0], 10) : Infinity;
                                                    };
                                                    
                                                    const numA = getUnitNumber(a.title);
                                                    const numB = getUnitNumber(b.title);

                                                    if (numA === numB) {
                                                        return a.title.localeCompare(b.title);
                                                    }
                                                    
                                                    return numA - numB;
                                                })
                                                .map(unit => {
                                                const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unit.id);
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
                                            <p className="text-sm text-zinc-400">Scanning subject content...</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-zinc-800">Preview Content</h2>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto border border-zinc-200 rounded-lg p-4 bg-white shadow-inner">
                                    {isValidPreview ? previewData.generated_lessons.map((lesson, index) => (
                                        <div key={index} className="border-b border-zinc-200 pb-4 last:border-b-0">
                                            <h3 className="font-bold text-xl sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10 text-zinc-900">{lesson.lessonTitle}</h3>
                                            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                                                <div className="my-4 p-4 bg-indigo-50 border-l-4 border-indigo-300 text-indigo-900 rounded-r-lg">
                                                    <p className="font-semibold mb-2">{currentObjectivesLabel}</p>
                                                    <p className="text-sm mb-2">{objectivesIntro}</p>
                                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                                        {lesson.learningObjectives.map((objective, objIndex) => <li key={objIndex}>{objective}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {lesson.pages.map((page, pageIndex) => <LessonPage key={`${index}-${pageIndex}`} page={page} />)}
                                        </div>
                                    )) : <p className="text-red-600 font-medium">Could not generate a valid preview. Please try again.</p>}
                                </div>
                            </div>
                        )}
                    </main>
                    <footer className="pt-4 mt-2 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-zinc-200/80">
                        {previewData ? (
                            <>
                                <button onClick={handleBackToEdit} disabled={isSaving || isGenerating} className="btn-secondary-ios">Back to Edit</button>
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    {failedLessonNumber && (
                                        <button onClick={handleContinueGenerate} disabled={isGenerating} className="btn-primary-ios flex items-center justify-center gap-2">
                                            <ArrowPathIcon className="h-5 w-5" />
                                            Continue from Lesson {failedLessonNumber}
                                        </button>
                                    )}
                                    <button onClick={handleSave} className="btn-primary-ios" disabled={!isValidPreview || isSaving || isGenerating || failedLessonNumber}>
                                        {isSaving ? 'Saving...' : `Accept & Save ${previewData?.generated_lessons?.length || 0} Lesson(s)`}
                                    </button>
                                </div>
                            </>
                        ) : (
						<button onClick={handleInitialGenerate} className="btn-primary-ios ml-auto w-full sm:w-auto">
						    {isGenerating ? 'Generating...' : 'Generate Document'}
						</button>
                        )}
                    </footer>
                </Dialog.Panel>
            </div>
        </Dialog>
	);
}