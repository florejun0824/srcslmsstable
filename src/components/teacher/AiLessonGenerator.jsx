// src/components/lessons/AiLessonGenerator.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext'; 
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { getAllSubjects } from '../../services/firestoreService';
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';

import { 
    ArrowUturnLeftIcon, 
    DocumentArrowUpIcon, 
    DocumentTextIcon, 
    XMarkIcon, 
    SparklesIcon, 
    ChevronRightIcon, 
    CheckIcon,
    ListBulletIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    FunnelIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline'; 
import LessonPage from './LessonPage';
import mammoth from 'mammoth';

// PDF processing setup
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// --- CONFIGURATION ---
// INCREASED SAFETY DELAY: 40 seconds to strictly align with 15k TPM limit and prevent 429s.
const GEMMA_SAFETY_DELAY_MS = 40000; 

/**
 * --- Helper: Smart Delay ---
 * Delays execution but can be aborted instantly if the user closes/cancels.
 */
const smartDelay = async (ms, signal) => {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new Error("Aborted delay"));
        
        const timer = setTimeout(resolve, ms);
        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                const abortError = new Error("Aborted delay");
                abortError.name = "AbortError";
                reject(abortError);
            });
        }
    });
};

/**
 * --- Micro-Worker Sanitizer (Bulletproof Version) ---
 * Aggressively fixes common AI JSON errors (bad escapes, LaTeX)
 * and falls back to regex extraction if parsing fails.
 */
const sanitizeJsonComponent = (aiResponse) => {
    let jsonString = aiResponse;

    try {
        // 1. Try to find a JSON block wrapped in markdown backticks
        const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
        if (markdownMatch && markdownMatch[2]) {
            jsonString = markdownMatch[2];
        } else {
            // 2. If no markdown, find the first opening and last closing brace
            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                jsonString = jsonString.substring(startIndex, endIndex + 1);
            }
        }

        // Fix unescaped newlines inside strings
        let cleanString = jsonString.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
        // Fix invalid backslashes (e.g. \textbf -> \\textbf) - simple heuristic
        cleanString = cleanString.replace(/\\(?![/u"\\bfnrt])/g, "\\\\");

        return JSON.parse(cleanString);

    } catch (parseError) {
        console.warn("JSON.parse failed, attempting Manual Regex Extraction:", parseError.message);

        // --- ATTEMPT 2: Manual Regex Extraction (The Safety Net) ---
        try {
            // Extract Title
            const titleMatch = aiResponse.match(/"title"\s*:\s*"([^"]*?)"/);
            const title = titleMatch ? titleMatch[1] : "Generated Page";

            // Extract Content
            // We look for "content": " ... " 
            const contentMatch = aiResponse.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*\}|\s*,)/);
            
            let content = "";
            if (contentMatch) {
                content = contentMatch[1];
            } else {
                // Last ditch: just grab everything after "content":
                const parts = aiResponse.split(/"content"\s*:\s*"/);
                if (parts.length > 1) {
                    const roughContent = parts[1];
                    const lastQuote = roughContent.lastIndexOf('"');
                    if (lastQuote !== -1) {
                        content = roughContent.substring(0, lastQuote);
                    } else {
                        content = roughContent;
                    }
                }
            }

            // Manually unescape standard JSON escapes since we didn't run JSON.parse
            content = content
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

            if (!content || content.length < 5) {
                throw new Error("Could not extract meaningful content via regex.");
            }

            return {
                page: {
                    title: title,
                    content: content
                }
            };

        } catch (extractError) {
            console.error("Critical: Failed to sanitize JSON.", aiResponse.substring(0, 200));
            // Return a dummy object so the app doesn't crash
            return {
                page: {
                    title: "Generation Error",
                    content: `The AI generated content that could not be processed. \n\nRaw Output Preview:\n${aiResponse.substring(0, 500)}...`
                }
            };
        }
    }
};

export default function AiLessonGenerator({ onClose, onBack, unitId, subjectId }) {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); 

    const [file, setFile] = useState(null);
    const [previewLessons, setPreviewLessons] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Progress States
    const [progressMessage, setProgressMessage] = useState('');
    const [generationProgress, setGenerationProgress] = useState(0); 
    const [currentAction, setCurrentAction] = useState('');

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

    const isMounted = useRef(false);
    const abortControllerRef = useRef(null);

    // --- MONET THEME GENERATOR ---
    const themeStyles = useMemo(() => {
        switch (activeOverlay) {
            case 'christmas':
                return {
                    bgGradient: 'bg-red-950/20',
                    panelBg: 'bg-[#0f291e]',
                    borderColor: 'border-green-500/30',
                    textColor: 'text-red-100',
                    subText: 'text-green-200/70',
                    accentColor: 'text-red-400',
                    buttonGradient: 'from-red-700 to-green-800',
                    iconBg: 'bg-green-900/30',
                    highlight: 'bg-red-900/40 border-red-500/30',
                    inputBg: 'bg-black/30'
                };
            case 'valentines':
                return {
                    bgGradient: 'bg-pink-950/20',
                    panelBg: 'bg-[#2a0a12]',
                    borderColor: 'border-pink-500/30',
                    textColor: 'text-pink-100',
                    subText: 'text-pink-200/70',
                    accentColor: 'text-pink-400',
                    buttonGradient: 'from-pink-600 to-rose-600',
                    iconBg: 'bg-pink-900/30',
                    highlight: 'bg-pink-900/40 border-pink-500/30',
                    inputBg: 'bg-black/30'
                };
            default: // Standard
                return {
                    bgGradient: 'bg-[#f5f5f7] dark:bg-[#121212]',
                    panelBg: 'bg-white dark:bg-[#1e1e1e]',
                    borderColor: 'border-slate-200 dark:border-white/10',
                    textColor: 'text-slate-900 dark:text-white',
                    subText: 'text-slate-500 dark:text-slate-400',
                    accentColor: 'text-blue-600 dark:text-blue-400',
                    buttonGradient: 'bg-[#007AFF] hover:bg-[#0062CC]',
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                    highlight: 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10',
                    inputBg: 'bg-slate-50 dark:bg-white/5'
                };
        }
    }, [activeOverlay]);

    const sortedSubjects = useMemo(() => {
        return [...subjects].sort((a, b) => 
            (a.title || '').localeCompare((b.title || ''), undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [subjects]);

    // --- PERFORMANCE OPTIMIZATIONS ---
    const sortedUnits = useMemo(() => {
        if (!subjectContext?.units) return [];
        return [...subjectContext.units].sort((a, b) => 
            a.title.localeCompare(b.title, undefined, { numeric: true })
        );
    }, [subjectContext]);

    const lessonsByUnit = useMemo(() => {
        if (!subjectContext?.lessons) return {};
        
        const grouped = {};
        subjectContext.lessons.forEach(lesson => {
            if (!grouped[lesson.unitId]) {
                grouped[lesson.unitId] = [];
            }
            grouped[lesson.unitId].push(lesson);
        });
        
        Object.keys(grouped).forEach(unitId => {
            grouped[unitId].sort((a, b) => (a.order || 0) - (b.order || 0));
        });

        return grouped;
    }, [subjectContext]);

    useEffect(() => {
        isMounted.current = true;
        const fetchSubjects = async () => {
            try {
                const subs = await getAllSubjects();
                setSubjects(subs);
            } catch (error) {
                showToast('Could not fetch subjects.', 'error');
            }
        };
        fetchSubjects();
        return () => {
            isMounted.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
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
        setGenerationProgress(0);
        setCurrentAction('');
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

    // --- PROMPTS AND INSTRUCTIONS (FULL VERSION) ---

    const getBasePromptContext = () => {
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
            `;
        }

        const scaffoldingInstruction = `
        **CONTEXT: PREVIOUSLY COVERED MATERIAL**
        This section lists topics from lessons that already exist.
        1.  **DO NOT RE-TEACH:** You are strictly forbidden from re-teaching the specific concepts, keywords, or learning objectives listed below.
        2.  **BUILD UPON:** Your new lesson MUST act as a logical "next step."
        
        ---
        **PREVIOUSLY COVERED MATERIAL:**
        - **User-Selected Prerequisites:** ${scaffoldInfo.summary || "N/A"}
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

    const getPlannerPrompt = (sourceText, baseContext) => {
        const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
        
        return `
        You are an expert curriculum planner. Your *only* task is to read the provided source text and curriculum context, and then generate a *plan* (a JSON array of lessons).
        
        ${languageAndGradeInstruction}
        ${perspectiveInstruction}
        ${standardsInstruction}
        ${scaffoldingInstruction}

        **MATH & SCIENCE HANDLING:**
        If the source text contains mathematical formulas, ensure your lesson titles and summaries reflect the mathematical content accurately.

        **CRITICAL TASK: ANALYZE DOCUMENT SCOPE**
        
        **Step 1: Identify Structure**
        Scan the text for lesson headers (e.g., "Lesson 1", "1.1", "Lesson A").
        
        **Step 2: Apply Strict Rules**
        
        **RULE A: SINGLE LESSON (Most Likely)**
        - If the document focuses on **ONE** specific lesson title (e.g., "Lesson 1: Comparison Texts") or one main topic, create **EXACTLY ONE** lesson object.
        - **DO NOT** split sub-topics (like "Introduction", "Activity", "Analysis", "Writing") into separate lessons. These are merely *pages* within the single lesson.
        - **Example:** If the text is "Unit 15, Lesson 1", generate ONLY "Lesson 1".

        **RULE B: MULTIPLE LESSONS (Only if explicit)**
        - ONLY generate multiple lessons if the source text explicitly contains distinct headers for multiple lessons (e.g., It contains text for "Lesson 1" AND text for "Lesson 2").
        
        **RULE C: UNIT OVERVIEW**
        - Only create a "Unit Overview" lesson if the uploaded file is a Table of Contents or a Syllabus covering an entire Quarter/Unit.

        **JSON OUTPUT FORMAT:**
        {
          "lessons": [
            {
              "lessonTitle": "Lesson ${existingLessonCount + 1}: [Title]",
              "summary": "1-2 sentence summary."
            }
          ]
        }

        **SOURCE TEXT:**
        ${sourceText} 
        `;
    };

    // --- MASTERS AND STYLE RULES (Unified) ---
    const getMasterInstructions = (baseContext) => {
        const styleRules = `
        **CRITICAL FORMATTING RULE (NON-NEGOTIABLE):** You MUST NOT use Markdown code block formatting (like indenting with four spaces or using triple backticks \\\`\\\`\\\`) for regular content like bulleted lists or standard paragraphs.
        
        **CRITICAL JSON & LATEX SAFETY (ABSOLUTE PRIORITY):**
        - You are writing a JSON string. ALL backslashes must be escaped.
        - **CORRECT:** "content": "Use \\\\textbf{bold}." (Result: Use \\textbf{bold})
        - **INCORRECT:** "content": "Use \\textbf{bold}." (Result: Invalid JSON)
        
        **CRITICAL JSON STRING RULE (NON-NEGOTIABLE):** When writing text content inside the JSON, do NOT escape standard quotation marks.
        - **Correct:** \\\`"title": "The Art of \\"How Much?\\""\\\`
        - **Incorrect:** \\\`"title": "The Art of \\\\\\"How Much?\\\\\\""\\\`
        
        **CRITICAL TEXT FORMATTING RULE (NON-NEGOTIABLE):**
        - To make text bold, you MUST use Markdown's double asterisks (**).
        - You are STRICTLY FORBIDDEN from using LaTeX commands like \\textbf{} or \\textit{}.
        - **ABSOLUTE RULE:** You are **STRICTLY FORBIDDEN** from bolding the introductory phrase or "title" of a bullet point.

        **CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
        You MUST use LaTeX for all mathematical equations, variables, and chemical formulas.
        - **For INLINE formulas**, use single dollar signs: $H_2O$.
        - **For BLOCK formulas**, use double dollar signs: $$...$$
        - **CRITICAL LATEX ESCAPING IN JSON:** Every single backslash \`\\\` in your LaTeX code MUST be escaped with a second backslash (\`\\\\\`).
        
        **ABSOLUTE RULE FOR CONTENT CONTINUATION (NON-NEGOTIABLE):** When a single topic or section is too long for one page and its discussion must continue onto the next page, a heading for that topic (the 'title' in the JSON) MUST ONLY appear on the very first page. ALL subsequent pages for that topic MUST have an empty string for their title: \\\`"title": ""\\\`.
        `;

        const masterInstructions = `
        **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer.
        ${baseContext.perspectiveInstruction}
        **CRITICAL INSTRUCTION FOR CORE CONTENT:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the concept. Explain the "why" and "how". Use vivid analogies.
        
        **CRITICAL INSTRUCTION FOR INTERACTIVITY (NON-NEGOTIABLE):** You MUST embed small, interactive elements directly within the core content pages.
        - Use Markdown blockquotes (\`>\`) to format these.
        - **Examples:**
            - **> Think About It:** If gravity suddenly disappeared, what's the first thing that would happen?
            - **> Quick Poll:** Raise your hand if you think plants breathe.
        `;
        return { styleRules, masterInstructions };
    };

    const getComponentPrompt = (sourceText, baseContext, lessonPlan, componentType, styleRules, extraData = {}) => {
        const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
        
        // --- CONTEXT ACCUMULATION ---
        const redundancyCheck = extraData.accumulatedLessonContext ? `
        **CONTEXT - CONTENT GENERATED SO FAR:**
        Below is the content you have already written for this lesson. 
        **CRITICAL RULE:** Do NOT repeat introductions, definitions, or activities that are already present in the content below. Build UPON this content.
        
        --- START OF EXISTING CONTENT ---
        ${extraData.accumulatedLessonContext}
        --- END OF EXISTING CONTENT ---
        ` : '';

        let taskInstruction, jsonFormat;

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

        switch (componentType) {
            case 'objectives':
                taskInstruction = `Generate 3-5 specific, measurable, and student-friendly learning objectives based on: "${lessonPlan.summary}"`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "objectives": [\n    "Objective 1...",\n    "Objective 2..."\n  ]\n}`;
                break;
            
            case 'competencies':
                taskInstruction = `Select 1-3 competencies from the Master List that are addressed by: "${lessonPlan.lessonTitle} - ${lessonPlan.summary}"`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "competencies": [\n    "Competency 1...",\n    "Competency 2..."\n  ]\n}`;
                break;

            case 'Introduction':
                taskInstruction = 'Generate the "Engaging Introduction" page. It MUST have a thematic, captivating subheader title.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "A Captivating Thematic Title",\n    "content": "Engaging intro markdown..."\n  }\n}`;
                break;
            
            case 'LetsGetStarted':
                taskInstruction = 'Generate a "Let\'s Get Started" warm-up activity page. It should act as a bridge from the Introduction.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Let's Get Started",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
                break;

            case 'CoreContentPlanner':
                taskInstruction = `Analyze the focus for this lesson: "${lessonPlan.summary}" and the source text.
                **CRITICAL TASK (NON-NEGOTIABLE):** Your task is to break down this lesson's topic into a series of **page-sized sub-topics**. Each sub-topic you list will become *one single page*.
                - If simple, return 1-2 titles.
                - If complex, return 3-5 titles as needed.
                - Do **NOT** include titles for "Introduction," "Warm-Up," "Summary," etc.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "coreContentTitles": [\n    "First Sub-Topic Title",\n    "Second Sub-Topic Title"\n  ]\n}`;
                break;

            case 'CoreContentPage':
                const allTitles = extraData.allContentTitles || [extraData.contentTitle];
                const currentIndex = extraData.currentIndex !== undefined ? extraData.currentIndex : 0;
                const currentTitle = extraData.contentTitle;
                
                const contentContextInstruction = `
                **PAGING CONTEXT:** Page ${currentIndex + 1} of ${allTitles.length}.
                - **Current Title:** "${currentTitle}"
                `;

                taskInstruction = `Generate *one* core content page for this lesson.
                - **Page Title:** It MUST be exactly: "${currentTitle}"
                ${contentContextInstruction}
                - **Content:** Detail-rich, narrative-driven, relevant *only* to this page title.
                - **CRITICAL LENGTH CONSTRAINT:** Be thorough but concise. Max 8000 chars JSON.`;
                
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${currentTitle}",\n    "content": "Detailed markdown content..."\n  }\n}`;
                break;
            
            case 'CheckForUnderstanding':
                taskInstruction = `Generate the "Check for Understanding" page. 3-4 concept questions based on the lesson.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Check for Understanding",\n    "content": "1. Question 1...\n2. Question 2..."\n  }\n}`;
                break;

            case 'LessonSummary':
                taskInstruction = `Generate the "Lesson Summary" page. Concise recap of this lesson only.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Lesson Summary",\n    "content": "Concise recap..."\n  }\n}`;
                break;
            
            case 'WrapUp':
                taskInstruction = `Generate the "Wrap-Up" page. Motivational closure.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Wrap-Up",\n    "content": "Closure..."\n  }\n}`;
                break;

            case 'EndofLessonAssessment':
                taskInstruction = `Generate the "End-of-Lesson Assessment" page. 5-8 questions (mix of multiple-choice, short-answer).`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "End-of-Lesson Assessment",\n    "content": "### Multiple Choice\n1. Question..."\n  }\n}`;
                break;

            case 'AnswerKey':
                taskInstruction = `Generate the "Answer Key" page. Answers to the assessment.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Answer Key",\n    "content": "1. Answer..."\n  }\n}`;
                break;

            case 'References':
                taskInstruction = `Generate the "References" page. Academic-style reference list.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "References",\n    "content": "- Source 1..."\n  }\n}`;
                break;
            
            case 'UnitOverview_Overview':
                taskInstruction = 'Generate the "Overview" page content (1-2 paragraphs) for this Unit.';
                jsonFormat = `{"page": {"title": "Overview", "content": "Markdown content..."}}`;
                break;

            case 'UnitOverview_Targets':
                taskInstruction = 'Generate the "Learning Targets" page content (bullet points) for this Unit.';
                jsonFormat = `{"page": {"title": "Learning Targets", "content": "Markdown content..."}}`;
                break;

            default:
                throw new Error(`Unknown component type: ${componentType}`);
        }

        return `
        ${commonHeader}
        ${redundancyCheck}
        =============================
        YOUR SPECIFIC TASK
        =============================
        ${taskInstruction}
        ${styleRules}
        
        **SOURCE TEXT:**
        ${sourceText}

        =============================
        JSON OUTPUT FORMAT
        =============================
        ${jsonFormat}
        `;
    };

    const generateLessonComponent = async (sourceText, baseContext, lessonPlan, componentType, isMountedRef, extraData = {}, maxRetries = 3, signal) => {
        const { styleRules, masterInstructions } = getMasterInstructions(baseContext);

        const prompt = getComponentPrompt(
            sourceText,
            baseContext, 
            lessonPlan, 
            componentType, 
            styleRules, 
            extraData
        );
        
        const finalPrompt = `
        ${prompt}
        =============================
        MASTER INSTRUCTION SET (Apply these to your task)
        =============================
        ${masterInstructions}
        `;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            if (!isMountedRef.current || signal?.aborted) throw new Error("Aborted");

            try {
                // Lower max output tokens to save TPM
                const aiResponse = await callGeminiWithLimitCheck(finalPrompt, { maxOutputTokens: 2048, signal });
                
                if (!isMountedRef.current || signal?.aborted) throw new Error("Aborted");
                return sanitizeJsonComponent(aiResponse); 

            } catch (error) {
                if (error.name === 'AbortError' || signal?.aborted) throw new Error("Aborted");

                const isRateLimit = error.message?.includes('429') || error.message?.includes('Quota') || error.status === 429;
                
                if (isRateLimit) {
                    if (attempt < maxRetries - 1) {
                        setCurrentAction(`Rate limit hit. Cooling down for 65s...`); // Live feedback
                        await smartDelay(65000, signal);
                        continue; 
                    }
                }
                
                if (attempt === maxRetries - 1) throw error;
                await smartDelay(2000, signal);
            }
        }
    };

    const handleGenerateLesson = async () => {
        if (!file) { setError('Please upload a file first.'); return; }
        
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        setIsProcessing(true);
        setError('');
        setPreviewLessons([]);
        setGenerationProgress(0); // Start at 0%
        const allGeneratedLessons = [];

        try {
            // --- PHASE 1: ANALYSIS (0% -> 5%) ---
            setCurrentAction('Reading and analyzing file structure...');
            setGenerationProgress(5);

            let extractedText = await extractTextFromFile(file);
            if (!isMounted.current || signal.aborted) return;
            extractedText = extractedText.replace(/₱/g, 'PHP ');
            
            // --- STRICT TRUNCATION FOR TPM SAFETY ---
            // Reduced to 12,000 characters (approx 3,500 tokens).
            // This leaves room for the prompt overhead + context history.
            // Prevents 15k limit crash on first request.
            const sourceText = extractedText.substring(0, 12000); 
            
            // --- PHASE 2: PLANNING (5% -> 15%) ---
            setCurrentAction('Creating curriculum outline and lesson map...');
            setGenerationProgress(10);

            const baseContext = getBasePromptContext();
            const plannerPrompt = getPlannerPrompt(sourceText, baseContext);
            
            // Initial safety delay
            await smartDelay(32000, signal);
            const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt, { maxOutputTokens: 2048, signal });
            if (!isMounted.current || signal.aborted) return;
            
            const lessonPlans = sanitizeJsonBlock(plannerResponse); 

            // Calculate progress chunks
            const totalLessons = lessonPlans.length;
            const progressPerLesson = 85 / totalLessons; 
            setGenerationProgress(15);

            // --- PHASE 3: GENERATION LOOP ---
            let lessonCounter = existingLessonCount;

            for (const [index, plan] of lessonPlans.entries()) {
                if (!isMounted.current || signal.aborted) return;
                
                // Calculate base progress for this lesson
                const currentBaseProgress = 15 + (index * progressPerLesson);
                setGenerationProgress(Math.floor(currentBaseProgress));

                // --- NEW: Accumulate context with SLIDING WINDOW ---
                let accumulatedLessonContext = "";

                const isUnitOverview = plan.lessonTitle.toLowerCase().includes('unit overview');
                if (!isUnitOverview) lessonCounter++;
                
                const numberedPlan = { ...plan };
                if (!isUnitOverview) {
                    const baseTitle = plan.lessonTitle.replace(/^Lesson\s*\d*:\s*/i, '');
                    numberedPlan.lessonTitle = `Lesson ${lessonCounter}: ${baseTitle}`;
                } else {
                    numberedPlan.lessonTitle = 'Unit Overview';
                }

                let newLesson = {
                    lessonTitle: numberedPlan.lessonTitle,
                    pages: [],
                    learningObjectives: [],
                    assignedCompetencies: []
                };

                const safeGenerate = async (type, extra = {}) => {
                    if (!isMounted.current || signal.aborted) throw new Error("Aborted");
                    
                    // UPDATE UI TEXT REAL-TIME
                    const readableType = type.replace(/([A-Z])/g, ' $1').trim(); 
                    setCurrentAction(`Generating ${numberedPlan.lessonTitle}:\n${readableType}...`);
                    
                    try {
                        // --- SAFETY DELAY ---
                        // 40s wait guarantees 15k quota bucket refills significantly.
                        await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                        
                        const result = await generateLessonComponent(
                            sourceText, 
                            baseContext, 
                            numberedPlan, 
                            type, 
                            isMounted, 
                            { ...extra, accumulatedLessonContext }, 
                            3, 
                            signal
                        );

                        // --- FIX: SLIDING WINDOW CONTEXT ---
                        // Prevent "Snowball Effect" by capping context at 4000 chars.
                        if (result?.page?.content) {
                            const newEntry = `\n\n--- [${type.toUpperCase()}]: ${result.page.title} ---\n${result.page.content}`;
                            let fullContext = accumulatedLessonContext + newEntry;
                            if (fullContext.length > 4000) {
                                fullContext = "..." + fullContext.slice(-4000); 
                            }
                            accumulatedLessonContext = fullContext;
                        }
                        
                        // Objectives don't need sliding window, just append for reference if needed, 
                        // but usually better to leave out of context to save tokens unless critical.
                        // We will omit adding objectives to context to save tokens.

                        return result;
                    } catch (e) {
                        if (e.name === 'AbortError' || e.message === 'Aborted') throw e; 
                        console.warn(`Skipping ${type}:`, e);
                        return null; 
                    }
                };

                if (isUnitOverview) {
                    const overview = await safeGenerate('UnitOverview_Overview');
                    if(overview) newLesson.pages.push({ ...overview.page, type: 'text' });
                    
                    // Update progress mid-lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.5))); 

                    const targets = await safeGenerate('UnitOverview_Targets');
                    if(targets) newLesson.pages.push({ ...targets.page, type: 'text' });
                } else {
                    const objs = await safeGenerate('objectives');
                    if(objs) newLesson.learningObjectives = objs.objectives;

                    const comps = await safeGenerate('competencies');
                    if(comps) newLesson.assignedCompetencies = comps.competencies;
                    
                    const intro = await safeGenerate('Introduction');
                    if(intro) newLesson.pages.push({ ...intro.page, type: 'text' });
                    
                    // 25% through lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.25))); 

                    const activity = await safeGenerate('LetsGetStarted');
                    if(activity) newLesson.pages.push({ ...activity.page, type: 'text' });

                    const planner = await safeGenerate('CoreContentPlanner');
                    const contentTitles = planner ? planner.coreContentTitles : [];
                    
                    // 50% through lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.5)));

                    for (const [cIdx, title] of contentTitles.entries()) {
                        const pageData = await safeGenerate('CoreContentPage', { contentTitle: title, currentIndex: cIdx, allContentTitles: contentTitles });
                        if (pageData) newLesson.pages.push({ ...pageData.page, type: 'text' });
                    }
                    
                    // 75% through lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.75)));

                    const standardPages = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
                    for (const pageType of standardPages) {
                        const pData = await safeGenerate(pageType);
                        if (pData) newLesson.pages.push({ ...pData.page, type: 'text' });
                    }
                }
                
                allGeneratedLessons.push(newLesson);
                setPreviewLessons([...allGeneratedLessons]);
                setSelectedLessonIndex(allGeneratedLessons.length - 1);
                setSelectedPageIndex(0);
            }
            
            setGenerationProgress(100);
            setCurrentAction('Finalizing...');
            setProgressMessage('Done!');

        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'Aborted') {
                setProgressMessage('Generation cancelled.');
                return;
            }
            console.error('Generation error:', err);
            if (err.message.includes('Quota') || err.message.includes('429')) {
                 setError('AI quota exceeded. Please wait 1 minute and try again with a smaller file.');
            } else {
                 setError('An error occurred. Partial results may be saved.');
            }
        } finally {
            if (isMounted.current) setIsProcessing(false);
        }
    };
    
    const handleSaveLesson = async () => {
        if (previewLessons.length === 0) return;
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
            setError('Failed to save lessons.');
        } finally {
            setSaving(false);
        }
    };

    const selectedLesson = previewLessons[selectedLessonIndex];
    const selectedPage = selectedLesson?.pages?.[selectedPageIndex];
    const objectivesAsMarkdown = useMemo(() => selectedLesson?.learningObjectives?.map(obj => `* ${obj}`).join('\n'), [selectedLesson]);

    const gradeLevels = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
    const panelClass = `${themeStyles.panelBg} border ${themeStyles.borderColor} rounded-[24px] shadow-2xl shadow-black/5 transition-colors duration-500`;
    const inputClass = `w-full ${themeStyles.inputBg} border ${themeStyles.borderColor} rounded-[14px] px-4 py-3 text-[15px] ${themeStyles.textColor} placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner appearance-none`;
    const labelClass = `text-[11px] font-bold ${themeStyles.subText} mb-2 block tracking-wide uppercase ml-1`;

    return (
        <div className={`flex flex-col h-[100dvh] font-sans ${themeStyles.bgGradient} ${themeStyles.textColor} overflow-hidden transition-colors duration-500`}>
             <div className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between ${themeStyles.panelBg} border-b ${themeStyles.borderColor} z-20 sticky top-0 transition-colors duration-500`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-lg ${activeOverlay !== 'none' ? themeStyles.buttonGradient : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        <SparklesIcon className="w-5 h-5 text-white stroke-[2]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight leading-tight">AI Lesson Generator</h3>
                        <p className={`text-[12px] font-medium hidden sm:block ${themeStyles.subText}`}>Upload material to create structured lessons</p>
                    </div>
                </div>
                <button onClick={onBack} className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 active:scale-95 ${activeOverlay !== 'none' ? 'bg-black/20 hover:bg-black/30' : 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20'}`}>
                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-[2.5]" /> Back
                </button>
            </div>

            <div className="flex-grow overflow-y-auto lg:overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:h-full p-3 sm:p-4 gap-4 max-w-[1920px] mx-auto">
                    <div className={`w-full lg:w-[380px] flex flex-col flex-shrink-0 ${panelClass} lg:h-full lg:overflow-hidden`}>
                        <div className="flex-grow lg:overflow-y-auto custom-scrollbar p-5 space-y-6">
                            {isProcessing ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-500">
                                    <div className="relative">
                                        {/* INLINE SPINNER REPLACEMENT 1 */}
                                        <div className={`absolute inset-0 rounded-full blur-xl animate-pulse ${themeStyles.iconBg}`} />
                                        <svg className={`animate-spin h-10 w-10 ${themeStyles.accentColor}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    <p className={`text-[15px] font-medium text-center max-w-[240px] leading-relaxed ${themeStyles.textColor}`}>
                                        Thinking...
                                    </p>
                                    <p className="text-xs text-center opacity-60">
                                        Please keep this open.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className={labelClass}>Source Material</label>
                                        {!file ? (
                                            <label className={`group flex flex-col items-center justify-center w-full h-40 rounded-[20px] border-[1.5px] border-dashed transition-all cursor-pointer relative overflow-hidden active:scale-[0.99] ${themeStyles.inputBg} ${themeStyles.borderColor} hover:bg-blue-50/10 hover:border-blue-500`}>
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                                <DocumentArrowUpIcon className={`w-8 h-8 mb-2 group-hover:scale-110 transition-transform duration-300 stroke-[1.5] ${themeStyles.subText}`} />
                                                <span className={`text-sm font-semibold ${themeStyles.subText}`}>Upload PDF, DOCX, or TXT</span>
                                                <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                                            </label>
                                        ) : (
                                            <div className={`relative flex items-center p-3.5 rounded-[18px] border shadow-sm group ${themeStyles.inputBg} ${themeStyles.borderColor}`}>
                                                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center mr-3 ${themeStyles.iconBg} ${themeStyles.accentColor}`}>
                                                    <DocumentTextIcon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold truncate ${themeStyles.textColor}`}>{file.name}</p>
                                                    <p className={`text-xs font-medium ${themeStyles.subText}`}>{(file.size/1024).toFixed(0)} KB</p>
                                                </div>
                                                <button onClick={removeFile} className={`p-2 rounded-full transition-colors active:scale-90 ${activeOverlay !== 'none' ? 'bg-white/10 hover:bg-red-500/40 text-white/70 hover:text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
                                                    <XMarkIcon className="w-4 h-4 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-10`} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="language" className={labelClass}>Language</label>
                                            <div className="relative">
                                                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                                                    <option className="bg-slate-800">English</option>
                                                    <option className="bg-slate-800">Filipino</option>
                                                </select>
                                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="grade" className={labelClass}>Grade Level</label>
                                            <div className="relative">
                                                <select id="grade" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className={inputClass}>
                                                    {gradeLevels.map(l => <option key={l} value={l} className="bg-slate-800">{l}</option>)}
                                                </select>
                                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="subject" className={labelClass}>Subject</label>
                                        <div className="relative w-full min-w-0">
                                            <select id="subject" value={selectedSubject || ''} onChange={(e) => setSelectedSubject(e.target.value)} className={`${inputClass} truncate pr-10`}>
                                                <option value="" disabled className="bg-slate-800">Select Subject</option>
                                                {sortedSubjects.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.title}</option>)}
                                            </select>
                                            <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClass}>Learning Competencies</label>
                                            <textarea value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={`${inputClass} min-h-[80px] resize-none`} placeholder="Paste competencies here..." />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className={labelClass}>Content Standard (Optional)</label>
                                                <textarea value={contentStandard} onChange={(e) => setContentStandard(e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} placeholder="Demonstrate understanding..." />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Performance Standard (Optional)</label>
                                                <textarea value={performanceStandard} onChange={(e) => setPerformanceStandard(e.target.value)} className={`${inputClass} min-h-[60px] resize-none`} placeholder="Learners shall be able to..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Prerequisites (Scaffolding)</label>
                                        <div className={`${inputClass} p-2 max-h-[220px] overflow-y-auto custom-scrollbar`}>
                                            {sortedUnits.length > 0 ? (
                                                sortedUnits.map(unit => {
                                                    const lessonsInUnit = lessonsByUnit[unit.id] || [];
                                                    if (lessonsInUnit.length === 0) return null;
                                                    const isExpanded = expandedScaffoldUnits.has(unit.id);
                                                    const selectedCount = lessonsInUnit.filter(l => scaffoldLessonIds.has(l.id)).length;
                                                    const isAll = selectedCount > 0 && selectedCount === lessonsInUnit.length;
                                                    const isPartial = selectedCount > 0 && !isAll;

                                                    return (
                                                        <div key={unit.id} className="mb-1">
                                                            <div 
                                                                className="flex items-center p-2 rounded-[12px] hover:bg-white/10 transition-colors cursor-pointer select-none"
                                                                onClick={() => handleToggleUnitExpansion(unit.id)}
                                                            >
                                                                <div className="p-1 opacity-50">
                                                                    <ChevronRightIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} strokeWidth={3} />
                                                                </div>
                                                                <div 
                                                                    onClick={(e) => { e.stopPropagation(); handleUnitCheckboxChange(lessonsInUnit); }}
                                                                    className={`w-5 h-5 mx-2 rounded-[6px] flex items-center justify-center transition-all duration-300 shadow-sm border ${
                                                                        isAll || isPartial ? `bg-blue-500 border-transparent scale-105` : `${themeStyles.borderColor} bg-transparent`
                                                                    }`}
                                                                >
                                                                    {isAll && <CheckIcon className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
                                                                    {isPartial && <div className="w-2.5 h-0.5 bg-white rounded-full" />}
                                                                </div>
                                                                <span className={`text-[13px] font-bold truncate ${themeStyles.textColor}`}>{unit.title}</span>
                                                            </div>
                                                            {isExpanded && (
                                                                <div className={`ml-9 pl-2 border-l-2 space-y-1 mt-1 ${themeStyles.borderColor}`}>
                                                                    {lessonsInUnit.map(lesson => {
                                                                        const isSelected = scaffoldLessonIds.has(lesson.id);
                                                                        return (
                                                                            <div 
                                                                                key={lesson.id} 
                                                                                className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/10 rounded-[10px] group transition-all" 
                                                                                onClick={() => {
                                                                                    const newSet = new Set(scaffoldLessonIds);
                                                                                    if (newSet.has(lesson.id)) newSet.delete(lesson.id);
                                                                                    else newSet.add(lesson.id);
                                                                                    setScaffoldLessonIds(newSet);
                                                                                }}
                                                                            >
                                                                                <div className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-200 border ${isSelected ? 'bg-blue-500 border-transparent' : `bg-transparent ${themeStyles.borderColor} opacity-50 group-hover:opacity-100`}`}>
                                                                                    {isSelected && <CheckIcon className="w-3 h-3 text-white stroke-[3]" />}
                                                                                </div>
                                                                                <span className={`text-[12px] font-medium truncate transition-colors ${isSelected ? themeStyles.accentColor : themeStyles.subText}`}>{lesson.title}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <p className="text-xs opacity-50 p-4 text-center italic">No existing lessons to scaffold from.</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={`p-4 border-t sticky bottom-0 z-10 rounded-b-[24px] ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                            <button 
                                onClick={handleGenerateLesson} 
                                disabled={!file || isProcessing}
                                className={`w-full h-12 rounded-[16px] font-bold text-[15px] text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2
                                    ${!file || isProcessing ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-70' : `${activeOverlay !== 'none' ? `bg-gradient-to-r ${themeStyles.buttonGradient}` : 'bg-[#007AFF] hover:bg-[#0062CC]'} shadow-blue-500/25 hover:shadow-blue-500/40`}`}
                            >
                                {isProcessing ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <SparklesIcon className="w-5 h-5 stroke-[2]" />
                                )}
                                {previewLessons.length > 0 ? 'Regenerate Content' : 'Generate Lessons'}
                            </button>
                        </div>
                    </div>

                    {/* --- RIGHT PANEL: LIVE CONSOLE & PREVIEW --- */}
                    <div className={`flex-grow flex flex-col relative overflow-hidden rounded-[24px] min-h-[500px] lg:min-h-0 lg:h-full ${panelClass}`}>
                        
                        {/* 1. PROCESSING STATE (The Live Console) */}
                        {isProcessing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-md z-50 animate-in fade-in duration-500">
                                <div className="flex flex-col items-center w-full max-w-lg">
                                    
                                    {/* Visual Pulse */}
                                    <div className="relative mb-8">
                                        {/* INLINE SPINNER REPLACEMENT 2 */}
                                        <div className={`absolute inset-0 rounded-full blur-2xl animate-pulse opacity-40 ${themeStyles.iconBg}`} />
                                        <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl border bg-white dark:bg-black ${themeStyles.borderColor}`}>
                                            <svg className={`animate-spin h-10 w-10 ${themeStyles.accentColor}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Percentage & Status */}
                                    <h4 className={`text-6xl font-black mb-1 tracking-tighter ${themeStyles.textColor}`}>
                                        {generationProgress}%
                                    </h4>
                                    <p className={`text-xs font-bold uppercase tracking-widest opacity-50 mb-8 ${themeStyles.textColor}`}>
                                        Building Curriculum
                                    </p>

                                    {/* TERMINAL: Shows Real-Time Actions */}
                                    <div className="w-full bg-[#1e1e1e] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 mb-8">
                                        {/* Terminal Header */}
                                        <div className="bg-[#2d2d2d] px-4 py-2 flex items-center gap-2 border-b border-white/5">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                            </div>
                                            <span className="text-[10px] font-mono text-white/40 ml-2">ai_agent_logs</span>
                                        </div>
                                        
                                        {/* Terminal Body */}
                                        <div className="p-5 font-mono text-sm min-h-[140px] flex flex-col justify-end">
                                            <div className="text-blue-400/60 text-xs mb-2">
                                                {new Date().toLocaleTimeString()} [info] Connected to model...
                                            </div>
                                            <p className="text-green-400 font-bold whitespace-pre-wrap leading-relaxed">
                                                <span className="opacity-50 mr-2">$</span>
                                                {currentAction || "Initializing..."}
                                                <span className="inline-block w-2 h-4 ml-1 bg-green-400/50 animate-pulse align-middle" />
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ease-out ${activeOverlay !== 'none' ? `bg-gradient-to-r ${themeStyles.buttonGradient}` : 'bg-blue-600'}`}
                                            style={{ width: `${generationProgress}%` }}
                                        />
                                    </div>
                                    
                                    <p className="mt-4 text-[11px] text-center opacity-40 max-w-xs leading-relaxed font-medium">
                                        Generating detailed lesson plans, quizzes, and objectives. Complex files may take 1-2 minutes.
                                    </p>
                                </div>
                            </div>
                        ) : previewLessons.length === 0 ? (
                            
                            /* 2. READY STATE (Empty) */
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                <div className={`w-24 h-24 rounded-[28px] flex items-center justify-center mb-6 shadow-inner border ${themeStyles.inputBg} ${themeStyles.borderColor}`}>
                                    <SparklesIcon className={`w-10 h-10 opacity-50 ${themeStyles.textColor}`} />
                                </div>
                                <h3 className={`text-2xl font-bold mb-2 tracking-tight ${themeStyles.textColor}`}>Ready to Create</h3>
                                <p className={`max-w-sm leading-relaxed ${themeStyles.subText}`}>
                                    AI will analyze your document and generate a structured lesson plan with objectives, activities, and assessments.
                                </p>
                            </div>

                        ) : (
                            
                            /* 3. PREVIEW STATE (Results) */
                            <div className="flex flex-col lg:flex-row h-full gap-4">
                                <div className={`w-full lg:w-[280px] flex-shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col ${themeStyles.borderColor} ${themeStyles.inputBg}`}>
                                    <div className="p-4">
                                        <h4 className={labelClass}>GENERATED LESSONS</h4>
                                    </div>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {previewLessons.map((lesson, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setSelectedLessonIndex(idx); setSelectedPageIndex(0); }}
                                                className={`w-full text-left px-4 py-3 rounded-[14px] transition-all flex items-start gap-3 group border ${selectedLessonIndex === idx ? `${themeStyles.highlight} shadow-md` : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                                            >
                                                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 transition-colors ${selectedLessonIndex === idx ? 'bg-blue-500 shadow-[0_0_8px_rgba(0,122,255,0.5)]' : 'bg-slate-400'}`} />
                                                <div>
                                                    <p className={`text-[13px] font-bold leading-snug ${themeStyles.textColor}`}>{lesson.lessonTitle}</p>
                                                    <p className="text-[11px] opacity-70 mt-0.5 font-medium">{lesson.pages.length} pages</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-grow flex flex-col overflow-hidden">
                                    {selectedLesson && (
                                        <>
                                            <div className={`flex-shrink-0 p-6 border-b z-10 ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                                                <h2 className={`text-2xl font-bold mb-4 tracking-tight leading-tight ${themeStyles.textColor}`}>{selectedLesson.lessonTitle}</h2>
                                                
                                                {objectivesAsMarkdown && (
                                                    <div className={`p-4 rounded-[18px] border mb-6 max-h-[150px] overflow-y-auto custom-scrollbar ${themeStyles.highlight}`}>
                                                        <h5 className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${themeStyles.accentColor}`}>
                                                            <ListBulletIcon className="w-4 h-4" /> Objectives
                                                        </h5>
                                                        <div className="prose prose-sm prose-blue max-w-none dark:prose-invert leading-relaxed opacity-90">
                                                            <LessonPage page={{ content: objectivesAsMarkdown }} isEditable={false} />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                                    {selectedLesson.pages?.map((page, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedPageIndex(idx)}
                                                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap border ${selectedPageIndex === idx ? `${themeStyles.textColor} ${activeOverlay !== 'none' ? 'bg-white/20' : 'bg-slate-900 text-white dark:bg-white dark:text-black'} border-transparent shadow-md` : `${themeStyles.borderColor} ${themeStyles.subText} hover:bg-white/10`}`}
                                                        >
                                                            {page.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={`flex-grow min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-8 ${activeOverlay !== 'none' ? 'bg-black/20' : 'bg-slate-50 dark:bg-[#1c1c1e]/40'}`}>
                                                <div className="max-w-3xl mx-auto min-h-[300px]">
                                                    {selectedPage ? (
                                                        <div className="prose prose-slate prose-lg dark:prose-invert max-w-none leading-7">
                                                            <LessonPage page={selectedPage} isEditable={false} />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-64 opacity-50">
                                                            <ArrowPathIcon className="w-8 h-8 animate-spin mb-2" />
                                                            <p className="text-sm font-medium">Loading content...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`flex-shrink-0 px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 z-20 ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                <div className="flex items-center gap-3 order-2 sm:order-1 w-full sm:w-auto justify-center sm:justify-start">
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-100 dark:border-red-900/30">
                            <ExclamationTriangleIcon className="w-4 h-4 stroke-[2]" />
                            <span className="text-xs font-bold">{error}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto">
                    <button onClick={onClose} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-[14px] font-bold text-sm transition-colors active:scale-95 ${activeOverlay !== 'none' ? 'bg-white/10 text-white hover:bg-white/20' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20'}`}>
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveLesson} 
                        disabled={saving || previewLessons.length === 0 || isProcessing}
                        className={`flex-1 sm:flex-none px-8 py-2.5 rounded-[14px] font-bold text-sm text-white shadow-lg disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 ${activeOverlay !== 'none' ? `bg-gradient-to-r ${themeStyles.buttonGradient}` : 'bg-[#007AFF] hover:bg-[#0062CC] shadow-blue-500/30'}`}
                    >
                        {saving ? 'Saving...' : `Save ${previewLessons.length} Lesson(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
}