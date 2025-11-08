import React, { useState, useEffect, useMemo, useRef } from 'react'; // <-- 1. Import useRef
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { getAllSubjects } from '../../services/firestoreService';
// We still need the original sanitizer for the *Planner* call
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';

import { Dialog } from '@headlessui/react';
import { ArrowUturnLeftIcon, DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, SparklesIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import LessonPage from './LessonPage';
import mammoth from 'mammoth';
import { marked } from 'marked'; 

// PDF processing setup
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * --- Micro-Worker Sanitizer ---
 * (This function is unchanged)
 */
const sanitizeJsonComponent = (aiResponse) => {
    try {
        // Find the first { and last }
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error('No valid JSON object ({...}) found in AI response.');
        }

        const jsonString = aiResponse.substring(startIndex, endIndex + 1);
        
        // Now, parse this string
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("sanitizeJsonComponent error:", error.message, "Preview:", aiResponse.substring(0, 300));
        throw new Error(`The AI component response was not valid JSON. Preview: ${aiResponse.substring(0, 150)}`);
    }
};


export default function AiLessonGenerator({ onClose, onBack, unitId, subjectId }) {
    const { showToast } = useToast();
    const [file, setFile] = useState(null);
    const [previewLessons, setPreviewLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    
    const [subjectContext, setSubjectContext] = useState(null);
    const [scaffoldLessonIds, setScaffoldLessonIds] = useState(new Set());
    const [expandedScaffoldUnits, setExpandedScaffoldUnits] = useState(new Set());
    const [existingLessonCount, setExistingLessonCount] = useState(0);

    const [language, setLanguage] = useState('English');
    const [gradeLevel, setGradeLevel] = useState('Grade 9');
    
    const [learningCompetencies, setLearningCompetencies] = useState('');
    const [contentStandard, setContentStandard] = useState('');
    const [performanceStandard, setPerformanceStandard] = useState('');

    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);

    // --- 2. Add isMounted ref ---
    const isMounted = useRef(false);

    // --- 3. Add useEffect to track mount state ---
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false; // Set to false when component unmounts
        };
    }, []); // Empty array means this runs only on mount and unmount

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const subs = await getAllSubjects();
                setSubjects(subs);
            } catch (error) {
                showToast('Could not fetch subjects.', 'error');
            }
        };
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (subjectId) {
            const fetchFullSubjectContext = async () => {
                try {
                    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId));
                    const unitsSnapshot = await getDocs(unitsQuery);
                    const unitsData = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    setSubjectContext({ units: unitsData, lessons: lessonsData });
                } catch (error) {
                    console.error("Error fetching subject context:", error);
                    setError("Could not scan existing subject content.");
                }
            };
            fetchFullSubjectContext();
        }
    }, [subjectId]);

    useEffect(() => {
        if (unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [unitId]);

    const scaffoldInfo = useMemo(() => {
        if (scaffoldLessonIds.size === 0 || !subjectContext) return { summary: '' };
        const relevantScaffoldLessons = subjectContext.lessons.filter(lesson => scaffoldLessonIds.has(lesson.id));
        
        const summary = relevantScaffoldLessons.map(lesson => {
            const objectivesSummary = (lesson.objectives && lesson.objectives.length > 0)
                ? `\n  - Objectives: ${lesson.objectives.join('; ')}`
                : '';
            return `- Lesson Title: "${lesson.title}"${objectivesSummary}`;
        }).join('\n');
        
        return { summary };
    }, [scaffoldLessonIds, subjectContext]);

    const resetGeneratorState = () => {
        setFile(null);
        setPreviewLessons([]);
        setError('');
        setSaving(false);
        setIsProcessing(false);
        setProgressMessage('');
        setSelectedLessonIndex(0);
        setSelectedPageIndex(0);
        setLearningCompetencies('');
        setContentStandard('');
        setPerformanceStandard('');
    };

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
    
    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
            setPreviewLessons([]);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreviewLessons([]);
    };

    const extractTextFromFile = async (fileToProcess) => {
        if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item) => item.str).join(' ') + '\n';
            }
            return text;
        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await fileToProcess.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } else if (fileToProcess.type === 'text/plain') {
            return await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    // --- START OF COMPONENT-BASED REFACTOR ---

    const getBasePromptContext = () => {
        // (This function is unchanged)
        let existingSubjectContextString = "No other lessons exist yet.";
        if (subjectContext && subjectContext.lessons.length > 0) {
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
        
        const languageAndGradeInstruction = `
        **TARGET AUDIENCE (NON-NEGOTIABLE):**
        - **Grade Level:** The entire output MUST be tailored for **${gradeLevel}** students.
        - **Language:** The entire output MUST be written in **${language}**.
        ${language === 'Filipino' ? `
        - **CRITICAL FILIPINO LANGUAGE RULE:** You are strictly forbidden from using English or any form of code-switching (Taglish). The output must be pure, academic Filipino.
        ` : ''}
        `;

        const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
        const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
        let perspectiveInstruction = '';
        if (selectedSubjectData && catholicSubjects.includes(selectedSubjectData.title)) {
            perspectiveInstruction = `
                **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**. All explanations must align with Catholic teachings.
                **CRITICAL SOURCE REQUIREMENT (NON-NEGOTIABLE):** Prioritize citing and referencing official Catholic sources (CCC, Youcat, Encyclicals, etc.).
            `;
        }

        const scaffoldingInstruction = `
        **CONTEXT: PREVIOUSLY COVERED MATERIAL**
        This section lists topics from lessons that already exist.

        **YOUR SCAFFOLDING TASK (NON-NEGOTIABLE):**
        1.  **DO NOT RE-TEACH:** You are strictly forbidden from re-teaching the specific concepts, keywords, or learning objectives listed below.
        2.  **BUILD UPON:** Your new lesson MUST act as a logical "next step." It must **actively build upon this previous knowledge**.
        3.  **CREATE A BRIDGE:** Where appropriate, the introduction of your new lesson should briefly reference a concept from the prerequisite lessons to create a smooth transition, but it must immediately move into new, more advanced material.

        ---
        **PREVIOUSLY COVERED MATERIAL (DO NOT RE-TEACH):**
        - **User-Selected Prerequisites:** ${scaffoldInfo.summary || "N/A"}
        - **Other Existing Lessons:** ${existingSubjectContextString}
        ---
        `;


        const standardsInstruction = `
        **UNIT STANDARDS (NON-NEGOTIABLE CONTEXT):**
        - **Content Standard:** ${contentStandard || "Not provided."}
        - **Performance Standard:** ${performanceStandard || "Not provided."}
        - **Learning Competencies (Master List):** ${learningCompetencies || "Not provided."}
        `;

        return {
            languageAndGradeInstruction,
            perspectiveInstruction,
            scaffoldingInstruction,
            standardsInstruction,
        };
    };

    /**
     * --- This is the smart planner prompt that handles single vs. multi-lesson logic ---
     * (This function is unchanged)
     */
    const getPlannerPrompt = (sourceText, baseContext) => {
        const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
        
        return `
        You are an expert curriculum planner. Your *only* task is to read the provided source text and curriculum context, and then generate a *plan* (a JSON array of lessons).
        
        ${languageAndGradeInstruction}
        ${perspectiveInstruction}
        ${standardsInstruction}
        ${scaffoldingInstruction}

        **CRITICAL TASK: ANALYZE THE SOURCE TEXT'S STRUCTURE**
        You must first analyze the provided source text to determine its structure.

        **SCENARIO 1: The Source Text is ALREADY a Single Lesson**
        - Look for a "Table of Contents" (like the one in the user's example PDF) or a title (like "Lesson 3") that indicates the *entire document* is just *one* lesson.
        - **If this is the case**, your plan MUST contain **exactly ONE item**: The *single* lesson object.
        - **You MUST NOT include a "Unit Overview" in this case.** The user does not want it.

        **SCENARIO 2: The Source Text is a Large Document (NOT a single lesson)**
        - If the text does *not* appear to be a single lesson (e.g., it's a long chapter, a full book, or raw text without a single-lesson structure), THEN you must apply the following constraints:
        - Your plan MUST contain **a "Unit Overview" as the first item**, followed by a logical sequence of 2-7 lessons.
        - You MUST group related topics together into fewer, more comprehensive lessons.
        - **Do NOT** create a new lesson for every single paragraph.

        **CRITICAL QUOTE ESCAPING:** All double quotes (") inside string values MUST be escaped (\\").

        =============================
        JSON OUTPUT FORMAT
        =============================
        **If SCENARIO 1 (Single Lesson) applies, use this exact format:**
        {
          "lessons": [
            {
              "lessonTitle": "Lesson ${existingLessonCount + 1}: [Proposed Engaging Title Based on Source]",
              "summary": "A 1-2 sentence summary of what this specific lesson will cover from the source text."
            }
          ]
        }

        **If SCENARIO 2 (Multiple Lessons) applies, use this exact format:**
        {
          "lessons": [
            {
              "lessonTitle": "Unit Overview",
              "summary": "An overview of the entire unit and its main learning targets."
            },
            {
              "lessonTitle": "Lesson ${existingLessonCount + 1}: [First Lesson Title]",
              "summary": "Summary of the first lesson."
            },
            {
              "lessonTitle": "Lesson ${existingLessonCount + 2}: [Second Lesson Title]",
              "summary": "Summary of the second lesson."
            }
            // ... etc, up to 7 lessons total
          ]
        }

        =============================
        SOURCE TEXT TO ANALYZE
        =============================
        ${sourceText}
        `;
    };


    /**
     * --- Micro-Worker Prompt Generator ---
     * (This function is unchanged)
     */
    const getComponentPrompt = (sourceText, baseContext, lessonPlan, componentType, extraData = {}) => {
        const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
        let taskInstruction, jsonFormat;

        // Common header for all component prompts
        const commonHeader = `
        You are an expert curriculum designer. Your task is to generate *only* the specific component requested.
        
        ${languageAndGradeInstruction}
        ${perspectiveInstruction}
        ${scaffoldingInstruction}
        ${standardsInstruction}

        **LESSON CONTEXT:**
        - **Lesson Title:** ${lessonPlan.lessonTitle}
        - **Lesson Summary:** ${lessonPlan.summary}
        `;

        // Common style rules
        const styleRules = `
        **CRITICAL STYLE RULE:** You MUST use **pure Markdown only**. No HTML tags.
        - **Headings:** \`### Heading\`
        - **Key Terms:** \`**bold**\`
        - **Blockquotes:** \`> Note:\`
        - **Inline Terms:** \`backticks\`
        - **LaTeX:** Use $inline$ and $$display$$ (with \\\\ for escapes, e.g., $90\\\\degree$).
        - **Quote Escaping:** All double quotes (") inside JSON string values MUST be escaped (\\").
        `;

        switch (componentType) {
            case 'objectives':
                taskInstruction = 'Generate 3-5 specific, measurable, and student-friendly learning objectives for this lesson. They must be based on the lesson summary and the source text.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "objectives": [\n    "Objective 1...",\n    "Objective 2..."\n  ]\n}`;
                break;
            
            case 'competencies':
                taskInstruction = `Analyze the "Learning Competencies (Master List)" from the context and select 1-3 competencies that are *directly* addressed by this specific lesson.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "competencies": [\n    "Competency 1 from master list...",\n    "Competency 2 from master list..."\n  ]\n}`;
                break;

            case 'UnitOverview_Overview':
                taskInstruction = 'Generate the "Overview" page for the "Unit Overview" lesson. This should be a 1-2 paragraph summary of the entire unit, based on the *full* source text.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Overview",\n    "content": "One or two paragraphs of markdown text..."\n  }\n}`;
                break;

            case 'UnitOverview_Targets':
                taskInstruction = 'Generate the "Learning Targets" page for the "Unit Overview" lesson. This should be a bulleted list of the main skills or knowledge students will gain in the *entire unit*, based on the *full* source text.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Learning Targets",\n    "content": "- Target 1...\n- Target 2..."\n  }\n}`;
                break;

            case 'Introduction':
                taskInstruction = 'Generate the "Engaging Introduction" page. It MUST have a thematic, captivating subheader title (e.g., "Why Water Shapes Our World"). The content must hook attention with a story, real-world example, or surprising fact from the text.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "A Captivating Thematic Title (NOT 'Introduction')",\n    "content": "Engaging intro markdown..."\n  }\n}`;
                break;
            
            case 'LetsGetStarted':
                taskInstruction = 'Generate the "Let\'s Get Started" page. This must be a short, simple, interactive warm-up activity (e.g., quick brainstorm, matching, or short scenario).';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Let's Get Started",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
                break;

            // --- START OF CRITICAL FIX ---
            case 'CoreContentPlanner':
                taskInstruction = `Analyze the source text *only* as it pertains to this lesson.
            
                **CRITICAL CONTENT FIDELITY (NON-NEGOTIABLE):** Your task is to identify *all* the main sub-topics required to cover the *entire* core content for this lesson.
                - Do **NOT** summarize or omit key sections.
                - If the lesson's content in the source text is broken into 3 sections (e.g., "Understanding Historical Context," "Impact on Themes," "Appreciating Truths"), you MUST return 3 titles.
                - If the content is long and requires 6 or 10 sub-topics to cover it fully, you MUST return 6 or 10 titles.
                - Do **NOT** artificially limit this to 2-4 topics. Create as many as are necessary to cover all the material.
                
                Do *not* include titles for "Introduction," "Warm-Up," "Summary," etc. Just the main, teachable content topics found in the source text.`;
                
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "coreContentTitles": [\n    "First Sub-Topic Title",\n    "Second Sub-Topic Title",\n    "Third Sub-Topic Title"\n    // ... (as many as necessary)
      ]\n}`;
                break;
            // --- END OF CRITICAL FIX ---


			case 'CoreContentPage':
			                taskInstruction = `Generate *one* core content page for this lesson.
			                - **Page Title:** It MUST be exactly: "${extraData.contentTitle}"

			                **CRITICAL CONTENT GENERATION RULES (NON-NEGOTIABLE):**
                
			                1.  **Information Fidelity:** The generated content must be detail-rich and **100% faithful** to all information, facts, and concepts from the source text relevant to this page title. Do **not** omit key information or concepts.
                
			                2.  **Paraphrasing (Copyright):** You are **strictly forbidden** from copying the source text verbatim. You MUST **paraphrase and rewrite** all content in your own words to avoid copyright infringement. The core *ideas* must be preserved, but the *wording* must be original.
                
			                3.  **Academic Tone & Audience:** The language MUST be **academic, clear, and informative**. The choice of words must be **strictly appropriate for the target Grade Level** (e.g., ${gradeLevel}) in a Philippine (DepEd) educational context. Do not oversimplify, but ensure clarity.
			                `;
                
			                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${extraData.contentTitle}",\n    "content": "Detailed, *paraphrased*, and academic markdown content for this specific page..."\n  }\n}`;
			                break;
            
            case 'CheckForUnderstanding':
                taskInstruction = 'Generate the "Check for Understanding" page. This must be a short, formative activity with 3-4 concept questions or problems based on the core content.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Check for Understanding",\n    "content": "1. Question 1...\n2. Question 2..."\n  }\n}`;
                break;

            case 'LessonSummary':
                taskInstruction = 'Generate the "Lesson Summary" page. This must be a concise recap of the most important points from the lesson, as bullet points or a short narrative.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Lesson Summary",\n    "content": "Concise recap in markdown..."\n  }\n}`;
                break;
            
            case 'WrapUp':
                taskInstruction = 'Generate the "Wrap Up" page. This must be a motivational, inspiring closure that ties the lesson back to the big picture.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Wrap Up",\n    "content": "Motivational closure in markdown..."\n  }\n}`;
                break;

            case 'EndofLessonAssessment':
                taskInstruction = 'Generate the "End of Lesson Assessment" page. This must be 5-8 questions (mix of multiple-choice, short-answer, and application) that align with the lesson\'s objectives.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "End of Lesson Assessment",\n    "content": "### Multiple Choice\n1. Question...\n\n### Short Answer\n4. Question..."\n  }\n}`;
                break;

            case 'AnswerKey':
                taskInstruction = 'Generate the "Answer Key" page. Provide clear answers to all questions from the "End of Lesson Assessment". Use the same numbering.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Answer Key",\n    "content": "1. Answer...\n4. Answer..."\n  }\n}`;
                break;

            case 'References':
                taskInstruction = 'Generate the "References" page. This must be an academic-style reference list, including the uploaded file and any other credible sources derived from the text.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "References",\n    "content": "- Source 1...\n- Source 2..."\n  }\n}`;
                break;

            default:
                throw new Error(`Unknown component type: ${componentType}`);
        }

        return `
        ${commonHeader}

        =============================
        YOUR SPECIFIC TASK
        =============================
        ${taskInstruction}

        ${styleRules}

        =============================
        JSON OUTPUT FORMAT
        =============================
        ${jsonFormat}

        =============================
        SOURCE TEXT (FOR REFERENCE)
        =============================
        ${sourceText}
        `;
    };

    /**
     * --- Micro-Worker Function with Retries ---
     * --- 4. MODIFIED: Accept isMountedRef ---
     */
    const generateLessonComponent = async (sourceText, baseContext, lessonPlan, componentType, isMountedRef, extraData = {}, maxRetries = 3) => {
        const prompt = getComponentPrompt(sourceText, baseContext, lessonPlan, componentType, extraData);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            
            // --- 5. ADD ABORT CHECK ---
            if (!isMountedRef.current) throw new Error("Generation aborted by user.");

            try {
                // 1. Attempt the AI call
                const aiResponse = await callGeminiWithLimitCheck(prompt);
                
                // --- 5. ADD ABORT CHECK ---
                if (!isMountedRef.current) throw new Error("Generation aborted by user.");

                // 2. Attempt to parse the response
                const jsonData = sanitizeJsonComponent(aiResponse);
                
                // 3. If both succeed, return the data immediately
                return jsonData; 

            } catch (error) {
                // --- 5. ADD ABORT CHECK ---
                if (!isMountedRef.current) throw new Error("Generation aborted by user.");

                console.warn(
                    `Attempt ${attempt + 1} of ${maxRetries} failed for component: ${componentType} (Lesson: ${lessonPlan.lessonTitle})`,
                    error.message
                );

                // If this was the last attempt, re-throw the error to stop the process
                if (attempt === maxRetries - 1) {
                    console.error(`All ${maxRetries} retries failed for component: ${componentType}. Aborting.`);
                    throw new Error(`Failed to generate component ${componentType} after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait for a short duration before retrying (e.g., 500ms)
                await new Promise(res => setTimeout(res, 500));

                // --- 5. ADD ABORT CHECK ---
                if (!isMountedRef.current) throw new Error("Generation aborted by user.");
            }
        }
        
        // This line should be unreachable if maxRetries > 0, but as a fallback:
        throw new Error(`Failed to generate component ${componentType} after ${maxRetries} attempts.`);
    };


    /**
     * --- The "Orchestrator" ---
     * --- 6. MODIFIED: Add abort checks and pass isMounted ref ---
     */
    const handleGenerateLesson = async () => {
        if (!file) {
            setError('Please upload a file first.');
            return;
        }
        setIsProcessing(true);
        setError('');
        setPreviewLessons([]);
        const allGeneratedLessons = []; // Store lessons as they are created

        try {
            // --- STEP 1: Extract Text ---
            setProgressMessage('Step 1 of 3: Reading and extracting text...');
            let extractedText = await extractTextFromFile(file);
            
            // --- ABORT CHECK ---
            if (!isMounted.current) return;

            extractedText = extractedText.replace(/₱/g, 'PHP ');
            const sourceText = extractedText;
            
            // --- STEP 2: Planner Call (Now with new conditional prompt) ---
            setProgressMessage('Step 2 of 3: Planning unit structure with AI...');
            const baseContext = getBasePromptContext();
            const plannerPrompt = getPlannerPrompt(sourceText, baseContext);

            const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt);
            
            // --- ABORT CHECK ---
            if (!isMounted.current) return;

            // Use the *original* sanitizer here, as it's built for the `{"lessons": [...]}` structure
            const lessonPlans = sanitizeJsonBlock(plannerResponse); 

            if (!lessonPlans || lessonPlans.length === 0) {
                throw new Error("The AI failed to create a lesson plan.");
            }

            // --- STEP 3: Orchestrator Loop ---
            setProgressMessage(`Step 3: Building ${lessonPlans.length} lessons...`);
            let lessonCounter = existingLessonCount;

            for (const [index, plan] of lessonPlans.entries()) {
                
                // --- ABORT CHECK ---
                if (!isMounted.current) return;
                
                const isUnitOverview = plan.lessonTitle.toLowerCase().includes('unit overview');
                
                if (!isUnitOverview) {
                    lessonCounter++;
                }
                
                const numberedPlan = { ...plan };
                if (!isUnitOverview) {
                    const baseTitle = plan.lessonTitle.replace(/^Lesson\s*\d*:\s*/i, '');
                    numberedPlan.lessonTitle = `Lesson ${lessonCounter}: ${baseTitle}`;
                } else {
                    numberedPlan.lessonTitle = 'Unit Overview';
                }

                // This object will be built piece-by-piece
                let newLesson = {
                    lessonTitle: numberedPlan.lessonTitle,
                    pages: [],
                    learningObjectives: [],
                    assignedCompetencies: []
                };

                setProgressMessage(`Building Lesson ${index + 1}/${lessonPlans.length}: "${numberedPlan.lessonTitle}"`);

                if (isUnitOverview) {
                    // --- Special Flow for Unit Overview ---
                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Overview Page...`);
                    const overviewData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'UnitOverview_Overview', isMounted); // Pass isMounted
                    newLesson.pages.push(overviewData.page);

                    // --- ABORT CHECK ---
                    if (!isMounted.current) return;

                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Learning Targets Page...`);
                    const targetsData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'UnitOverview_Targets', isMounted); // Pass isMounted
                    newLesson.pages.push(targetsData.page);
                
                } else {
                    // --- Standard Lesson Flow ---
                    
                    // --- Objectives ---
                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Objectives...`);
                    const objectivesData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'objectives', isMounted, {}); // Pass isMounted
                    newLesson.learningObjectives = objectivesData.objectives;

                    // --- ABORT CHECK ---
                    if (!isMounted.current) return;

                    // --- Competencies ---
                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Competencies...`);
                    const competenciesData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'competencies', isMounted, {}); // Pass isMounted
                    newLesson.assignedCompetencies = competenciesData.competencies;
                    
                    // --- ABORT CHECK ---
                    if (!isMounted.current) return;

                    // --- Intro Page ---
                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Intro...`);
                    const introData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'Introduction', isMounted, {}); // Pass isMounted
                    newLesson.pages.push(introData.page);
                    
                    // --- ABORT CHECK ---
                    if (!isMounted.current) return;

                    // --- 'Let's Get Started' Page ---
                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Activity...`);
                    const activityData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'LetsGetStarted', isMounted, {}); // Pass isMounted
                    newLesson.pages.push(activityData.page);

                    // --- ABORT CHECK ---
                    if (!isMounted.current) return;

                    // --- Core Content Planner (This now returns a variable-length array) ---
                    setProgressMessage(`Building ${numberedPlan.lessonTitle}: Planning Content...`);
                    const contentPlannerData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'CoreContentPlanner', isMounted, {}); // Pass isMounted
                    const contentPlanTitles = contentPlannerData.coreContentTitles || [];
                    
                    // --- ABORT CHECK ---
                    if (!isMounted.current) return;

                    // --- Core Content Worker Loop (This will now loop as many times as needed) ---
                    for (const [contentIndex, contentTitle] of contentPlanTitles.entries()) {
                        
                        // --- ABORT CHECK ---
                        if (!isMounted.current) return;

                        setProgressMessage(`Building ${numberedPlan.lessonTitle}: Content ${contentIndex + 1}/${contentPlanTitles.length}...`);
                        const contentPageData = await generateLessonComponent(sourceText, baseContext, numberedPlan, 'CoreContentPage', isMounted, { contentTitle }); // Pass isMounted
                        newLesson.pages.push(contentPageData.page);
                    }
                    
                    // --- Standard Footer Pages ---
                    const standardPages = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
                    for (const pageType of standardPages) {
                        
                        // --- ABORT CHECK ---
                        if (!isMounted.current) return;

                        setProgressMessage(`Building ${numberedPlan.lessonTitle}: ${pageType}...`);
                        const pageData = await generateLessonComponent(sourceText, baseContext, numberedPlan, pageType, isMounted, {}); // Pass isMounted
                        if (pageData && pageData.page) {
                            newLesson.pages.push(pageData.page);
                        } else {
                            console.warn(`Missing page data for ${pageType}`);
                        }
                    }
                }
                
                // --- ABORT CHECK ---
                if (!isMounted.current) return;

                allGeneratedLessons.push(newLesson);
                setPreviewLessons([...allGeneratedLessons]);
                setSelectedLessonIndex(allGeneratedLessons.length - 1);
                setSelectedPageIndex(0);
            }
            
            // --- ABORT CHECK ---
            if (!isMounted.current) return;
            
            setProgressMessage('All lessons generated successfully!');

        } catch (err) {
            // --- 7. MODIFY CATCH BLOCK ---
            if (!isMounted.current || (err.message && err.message.includes("aborted"))) {
                console.log("Generation loop aborted by user (AiLessonGenerator).");
                // Silently stop, don't show an error
            } else {
                console.error('Lesson generation error:', err);
                setError(err.message.includes('overloaded')
                    ? 'The AI service is currently busy. Please try again in a moment.'
                    : `Error during generation: ${err.message}`
                );
            }
            // --- END MODIFY ---
        } finally {
            setIsProcessing(false);
            // Don't clear message, so user sees "All lessons generated successfully!"
        }
    };
    
    // --- END OF REFACTOR ---
    
    const handleSaveLesson = async () => {
        if (previewLessons.length === 0 || !unitId || !subjectId) {
            setError('Cannot save without generated lessons and unit context.');
            return;
        }
        setSaving(true);
        try {
            const savePromises = previewLessons.map((lesson, index) =>
                addDoc(collection(db, 'lessons'), {
                    title: lesson.lessonTitle,
                    unitId,
                    subjectId,
                    pages: lesson.pages,
                    objectives: lesson.learningObjectives || [],
                    contentType: "studentLesson",
                    createdAt: serverTimestamp(),
                    order: existingLessonCount + index,
                    
                    learningCompetencies: lesson.assignedCompetencies || [],
                    contentStandard: contentStandard || '',
                    performanceStandard: performanceStandard || ''
                })
            );
            await Promise.all(savePromises);
            showToast(`${previewLessons.length} lesson(s) saved successfully!`, 'success');
            resetGeneratorState();
            onClose(); 
        } catch (err) {
            console.error('Error saving lessons: ', err);
            setError('Failed to save one or more lessons.');
        } finally {
            setSaving(false);
        }
    };

    const selectedLesson = previewLessons[selectedLessonIndex];
    const selectedPage = selectedLesson?.pages?.[selectedPageIndex];

    const objectivesAsMarkdown = useMemo(() => {
        if (!selectedLesson?.learningObjectives?.length) return null;
        return selectedLesson.learningObjectives.map(obj => `* ${obj}`).join('\n');
    }, [selectedLesson]);

    const gradeLevels = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

    const formInputStyle = "block w-full rounded-lg border-transparent bg-neumorphic-base shadow-neumorphic-inset text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-sky-500 text-sm dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-100 dark:placeholder-slate-500";

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 pb-4 border-b border-neumorphic-shadow-dark/20 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800 dark:text-slate-100">Generate with AI</Dialog.Title>
                    <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 rounded-lg hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                </div>
                 <p className="text-slate-500 dark:text-slate-400">
                    Upload a document and AI will structure it into a full unit.
                </p>
            </div>

            <div className="flex-grow pt-4 overflow-hidden flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                    {isProcessing ? (
                        <div className="w-full flex-grow flex flex-col items-center justify-center p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                            <Spinner/>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 text-center">{progressMessage}</p>
                        </div>
                    ) : (
                        !file ? (
                            <label htmlFor="file-upload" className="relative flex-grow block w-full rounded-2xl p-8 text-center cursor-pointer transition-shadow duration-300 bg-neumorphic-base shadow-neumorphic-inset hover:shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:hover:shadow-lg">
                                <div className="flex flex-col items-center justify-center h-full">
                                    <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-600" />
                                    <span className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Click to upload or drag & drop
                                    </span>
                                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-500">
                                        PDF, DOCX, or TXT
                                    </span>
                                </div>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="relative w-full flex-grow rounded-2xl p-4 shadow-neumorphic dark:shadow-lg dark:bg-neumorphic-base-dark flex flex-col justify-center">
                                <div className="flex items-center gap-4">
                                    <DocumentTextIcon className="h-12 w-12 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{Math.round(file.size / 1024)} KB</p>
                                    </div>
                                </div>
                                <button onClick={removeFile} className="absolute top-3 right-3 p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors">
                                    <XMarkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                </button>
                            </div>
                        )
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="language" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Language</label>
                            <select id="language" name="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={formInputStyle}>
                                <option>English</option>
                                <option>Filipino</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="gradeLevel" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Grade Level</label>
                            <select id="gradeLevel" name="gradeLevel" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className={formInputStyle}>
                                {gradeLevels.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                        <select id="subject" name="subject" value={selectedSubject || ''} onChange={(e) => setSelectedSubject(e.target.value)} className={formInputStyle}>
                            <option value="" disabled>Select a subject</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>{subject.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="learningCompetencies" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Learning Competencies (Master List)</label>
                        <textarea
                            id="learningCompetencies"
                            name="learningCompetencies"
                            value={learningCompetencies}
                            onChange={(e) => setLearningCompetencies(e.target.value)}
                            className={formInputStyle}
                            rows={4}
                            placeholder="e.g., Describe the process of photosynthesis..."
                        />
                    </div>

                    <div>
                        <label htmlFor="contentStandard" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Content Standard (Optional)</label>
                        <textarea
                            id="contentStandard"
                            name="contentStandard"
                            value={contentStandard}
                            onChange={(e) => setContentStandard(e.target.value)}
                            className={formInputStyle}
                            rows={2}
                            placeholder="e.g., The learners demonstrate an understanding of..."
                        />
                    </div>

                    <div>
                        <label htmlFor="performanceStandard" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Performance Standard (Optional)</label>
                        <textarea
                            id="performanceStandard"
                            name="performanceStandard"
                            value={performanceStandard}
                            onChange={(e) => setPerformanceStandard(e.target.value)}
                            className={formInputStyle}
                            rows={2}
                            placeholder="e.g., The learners shall be able to..."
                        />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Scaffolding (Optional)</h3>
                        <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-3 rounded-xl max-h-[18rem] overflow-y-auto shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Explicitly select lessons for the AI to build upon.</p>
                            {subjectContext && subjectContext.units.length > 0 ? (
                                subjectContext.units
                                    .slice()
                                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }))
                                    .map(unit => {
                                    const lessonsInUnit = subjectContext.lessons.filter(lesson => lesson.unitId === unit.id);
                                    if (lessonsInUnit.length === 0) return null;
                                    const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                    const isAllSelected = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                    const isPartiallySelected = selectedCount > 0 && selectedCount < lessonsInUnit.length;
                                    const isExpanded = expandedScaffoldUnits.has(unit.id);
                                    return (
                                        <div key={unit.id} className="pt-2 first:pt-0">
                                            <div className="flex items-center p-2 rounded-md">
                                                <button onClick={() => handleToggleUnitExpansion(unit.id)} className="p-1"><ChevronRightIcon className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
                                                <input type="checkbox" id={`scaffold-unit-${unit.id}`} checked={isAllSelected} ref={el => { if(el) el.indeterminate = isPartiallySelected; }} onChange={() => handleUnitCheckboxChange(lessonsInUnit)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 dark:focus:ring-sky-600 ml-2" />
                                                <label htmlFor={`scaffold-unit-${unit.id}`} className="ml-2 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">{unit.title}</label>
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
                                                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-600"
                                                            />
                                                            <label htmlFor={`scaffold-lesson-${lesson.id}`} className="ml-2 block text-sm text-slate-800 dark:text-slate-200">
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
                                <p className="text-sm text-slate-400 dark:text-slate-500">Scanning subject content...</p>
                            )}
                        </div>
                    </div>

                    <button onClick={handleGenerateLesson} disabled={!file || isProcessing} 
                        className="w-full flex items-center justify-center font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl py-3 mt-auto shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60
                                   dark:from-sky-700 dark:to-blue-800 dark:text-sky-100 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        {previewLessons.length > 0 ? 'Regenerate Lessons' : 'Generate Lessons'}
                    </button>
                </div>
                
                <div className="w-full md:w-2/3 flex flex-col bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl p-3 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark overflow-hidden">
                    {previewLessons.length > 0 ? (
                        <div className="flex-grow flex flex-col md:flex-row gap-3 overflow-hidden">
                            <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col">
                                <h4 className="p-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Generated Lessons</h4>
                                <div className="flex-grow overflow-y-auto pr-1 space-y-1.5">
                                    {previewLessons.map((lesson, index) => (
                                        <button 
                                            key={index} 
                                            onClick={() => { setSelectedLessonIndex(index); setSelectedPageIndex(0); }} 
                                            className={`w-full text-left p-3 rounded-xl transition-all duration-300 
                                                        ${selectedLessonIndex === index 
                                                            ? 'bg-white shadow-neumorphic ring-2 ring-sky-300 dark:bg-slate-100 dark:text-slate-900 dark:shadow-neumorphic-light dark:ring-sky-400' 
                                                            : 'bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark'
                                                        }`}
                                        >
                                            <span className={`font-semibold ${selectedLessonIndex === index ? 'text-slate-800' : 'text-slate-800 dark:text-slate-100'}`}>{lesson.lessonTitle}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div className="w-full md:w-2/3 flex-grow bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl flex flex-col overflow-hidden shadow-neumorphic dark:shadow-lg min-h-0">
                                {selectedLesson && (
                                  <>
                                    <div className="flex-shrink-0 p-4 border-b border-neumorphic-shadow-dark/20 dark:border-slate-700">
                                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">{selectedLesson.lessonTitle}</h3>
                                      {objectivesAsMarkdown && ( <div className="my-2 p-3 bg-sky-50 dark:bg-sky-900/50 border-l-4 border-sky-300 dark:border-sky-700 rounded-r-lg">
                                          <p className="font-semibold mb-1 text-sky-900 dark:text-sky-200">Learning Objectives</p>
                                          <div className="prose prose-sm max-w-none prose-sky text-sky-800 dark:text-sky-300">
                                            <LessonPage page={{ content: objectivesAsMarkdown }} isEditable={false} />
                                          </div>
                                        </div>)}
                                      
                                      <div className="flex space-x-2 mt-2 -mb-2 pb-2 overflow-x-auto">
                                        {selectedLesson.pages && Array.isArray(selectedLesson.pages) && selectedLesson.pages.map((page, index) => (
                                          <button
                                            key={index}
                                            onClick={() => setSelectedPageIndex(index)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedPageIndex === index 
                                                ? "bg-sky-600 text-white shadow-neumorphic dark:bg-sky-600 dark:text-white dark:shadow-lg" 
                                                : "bg-neumorphic-base text-slate-600 shadow-neumorphic hover:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                                            }`}
                                          >{page ? page.title : 'Loading...'}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex-grow min-h-0 overflow-y-auto p-6">
                                      <div className="prose max-w-none prose-slate dark:prose-invert">
                                        {selectedPage ? <LessonPage page={selectedPage} isEditable={false} /> : <p>Select a page to view its content.</p>}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                        </div>
                    ) : (
                        <div className="m-auto text-center">
                            <DocumentTextIcon className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-700" />
                            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">AI-Generated Preview</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Your unit lessons will appear here.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-neumorphic-shadow-dark/20 dark:border-slate-700">
                {error && <p className="text-red-500 dark:text-red-400 text-sm mr-auto">{error}</p>}
                <button className="px-4 py-2 bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset
                                 dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark" onClick={onClose}>Cancel</button>
                <button onClick={handleSaveLesson} disabled={saving || previewLessons.length === 0 || isProcessing} 
                    className="px-4 py-2 font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset disabled:opacity-60
                               dark:from-sky-700 dark:to-blue-800 dark:text-sky-100 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark">
                    {saving ? 'Saving...' : `Save ${previewLessons.length} Lesson(s)`}
                </button>
            </div>
        </div>
    );
}