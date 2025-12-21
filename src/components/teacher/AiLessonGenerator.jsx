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
    CalculatorIcon 
} from '@heroicons/react/24/outline'; 
import Spinner from '../common/Spinner';
import LessonPage from './LessonPage';
import mammoth from 'mammoth';

// PDF processing setup
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// --- CONFIGURATION ---
// STRICT SAFETY DELAY: 20 seconds to stay safely under Gemma 3's 15k TPM limit.
// The error requested a retry in ~18s, so 20s is a safe buffer.
const GEMMA_SAFETY_DELAY_MS = 20000; 

/**
 * --- Helper: Smart Delay ---
 * Delays execution but can be aborted instantly if the user closes/cancels.
 */
const smartDelay = async (ms, signal) => {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new Error("Aborted delay"));
        }
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

const sanitizeJsonComponent = (aiResponse) => {
    try {
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error('No valid JSON object ({...}) found in AI response.');
        }

        let jsonString = aiResponse.substring(startIndex, endIndex + 1);
        
        // Safety Net: Revert double-escaped newlines for clean JSON parsing
        jsonString = jsonString.replace(/\\\\n/g, '\\n');

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("sanitizeJsonComponent error:", error.message, "Preview:", aiResponse.substring(0, 300));
        throw new Error(`The AI component response was not valid JSON.`);
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
            // ... (Other themes can remain the same or default to standard) ...
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
            // Abort any running generation on unmount
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

    const getBasePromptContext = () => {
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
        ${sourceText.substring(0, 30000)} 
        `;
    };
    
    const getComponentPrompt = (sourceText, baseContext, lessonPlan, componentType, extraData = {}) => {
        const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
        let taskInstruction, jsonFormat;

        const commonHeader = `
        You are an expert curriculum designer.
        ${languageAndGradeInstruction}
        ${perspectiveInstruction}
        
        **LESSON CONTEXT:**
        - **Lesson Title:** ${lessonPlan.lessonTitle}
        - **Lesson Summary:** ${lessonPlan.summary}

        **NEGATIVE CONSTRAINTS (CRITICAL):**
        1. **NO OBJECTIVES IN CONTENT:** Do NOT list Learning Objectives, Competencies, or Standards inside the page content. These are already displayed in the UI header.
        2. **NO METADATA:** Do not include "Teacher Notes", "Lesson Plan ID", or "Copyright" footers.
        `;

        const styleRules = `
        **STYLE & FORMATTING:**
        - **Markdown:** Use Pure Markdown. No HTML. Use \`###\` for headings and \`**bold**\` for emphasis.
        
        **MATH & SCIENCE RULES (CRITICAL):**
        1. **LaTeX Enforcement:** You MUST use LaTeX formatting for ALL mathematical equations, variables, and formulas. 
           - **Inline Math:** Wrap in single dollar signs, e.g., $E=mc^2$.
           - **Block Math:** Wrap in double dollar signs, e.g., $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$.
        2. **OCR Correction (SMART):**
           - Fix common OCR errors in math contexts:
           - "x 2" or "x2" should become "$x^2$"
           - "1/2" should become "$\\frac{1}{2}$"
           - "*" should become "$\\times$" or "$\\cdot$"

        **JSON FORMATTING RULES (STRICT):**
        1. **Newlines:** Use standard \`\\n\` for line breaks. **DO NOT** double-escape newlines (i.e., do NOT use \`\\\\n\`).
        2. **LaTeX Escaping:** - You MUST double-escape backslashes **ONLY** for LaTeX commands within the JSON string.
           - *Correct JSON:* "Equation: $\\\\frac{x}{y}$"
           - *Incorrect JSON:* "Equation: $\\frac{x}{y}$" (This breaks the JSON parser)
        `;

        switch (componentType) {
            case 'objectives':
                taskInstruction = 'Generate 3-5 specific, measurable, and student-friendly learning objectives.';
                jsonFormat = `{"objectives": ["Objective 1...", "Objective 2..."]}`;
                break;
            
            case 'competencies':
                taskInstruction = `Select 1-3 competencies from the provided Master List that are addressed by this lesson.`;
                jsonFormat = `{"competencies": ["Competency 1...", "Competency 2..."]}`;
                break;

            case 'UnitOverview_Overview':
                taskInstruction = 'Generate the "Overview" page content (1-2 paragraphs).';
                jsonFormat = `{"page": {"title": "Overview", "content": "Markdown content..."}}`;
                break;

            case 'UnitOverview_Targets':
                taskInstruction = 'Generate the "Learning Targets" page content (bullet points).';
                jsonFormat = `{"page": {"title": "Learning Targets", "content": "Markdown content..."}}`;
                break;

            case 'Introduction':
                taskInstruction = 'Generate an "Engaging Introduction" page. Use a thematic subheader title. Do NOT list objectives here.';
                jsonFormat = `{"page": {"title": "Thematic Title", "content": "Markdown content..."}}`;
                break;
            
            case 'LetsGetStarted':
                taskInstruction = 'Generate a "Let\'s Get Started" warm-up activity page.';
                jsonFormat = `{"page": {"title": "Let's Get Started", "content": "Activity instructions..."}}`;
                break;

            case 'CoreContentPlanner':
                taskInstruction = `Identify the main sub-topics required to cover the content for this lesson found in the source text. Return a list of titles.`;
                jsonFormat = `{"coreContentTitles": ["Sub-Topic 1", "Sub-Topic 2"]}`;
                break;

            case 'CoreContentPage':
                const allTitles = extraData.allContentTitles || [extraData.contentTitle];
                const currentIndex = extraData.currentIndex !== undefined ? extraData.currentIndex : 0;
                const currentTitle = extraData.contentTitle;

                const contentContextInstruction = `
                **CRITICAL CONTENT BOUNDARIES (NON-NEGOTIABLE):**
                This lesson's core content is divided into ${allTitles.length} main page(s).
                
                **This is Page ${currentIndex + 1} of ${allTitles.length}.**
                
                - **Your Page Title:** "${currentTitle}"
                - **All Page Titles (in order):** ${allTitles.map((t, i) => `\n  ${i + 1}. ${t} ${i === currentIndex ? "(THIS IS YOUR PAGE)" : ""}`).join('')}

                **YOUR TASK:**
                1.  You are **strictly forbidden** from discussing topics belonging to the *other* page titles.
                2.  Your content MUST focus *exclusively* on the material from the source text that is relevant *only* to your assigned title: "**${currentTitle}**".
                3.  Do NOT repeat content from previous pages. Do NOT summarize the entire document.
                `;

                taskInstruction = `Generate *one* core content page for this lesson.
                - **Page Title:** It MUST be exactly: "${currentTitle}"

                ${contentContextInstruction}

                **CRITICAL CONTENT GENERATION RULES (NON-NEGOTIABLE):**
                1.  **Information Fidelity:** The generated content must be detail-rich and **100% faithful** to all information, facts, and concepts from the source text.
                2.  **Paraphrasing (Copyright):** You are **strictly forbidden** from copying the source text verbatim. You MUST **paraphrase and rewrite** all content.
                3.  **Academic Tone & Audience:** The language MUST be **academic, clear, and informative** for Grade ${gradeLevel}.
                `;

                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${currentTitle}",\n    "content": "Detailed, *paraphrased*, and academic markdown content for **this specific page only**..."\n  }\n}`;
                break;
            
            case 'CheckForUnderstanding':
                taskInstruction = 'Generate a "Check for Understanding" page with 3-4 questions.';
                jsonFormat = `{"page": {"title": "Check for Understanding", "content": "Questions..."}}`;
                break;

            case 'LessonSummary':
                taskInstruction = 'Generate a "Lesson Summary" page (concise recap).';
                jsonFormat = `{"page": {"title": "Lesson Summary", "content": "Recap..."}}`;
                break;
            
            case 'WrapUp':
                taskInstruction = 'Generate a motivational "Wrap Up" page.';
                jsonFormat = `{"page": {"title": "Wrap Up", "content": "Closure..."}}`;
                break;

            case 'EndofLessonAssessment':
                taskInstruction = 'Generate an "End of Lesson Assessment" with 5-8 questions.';
                jsonFormat = `{"page": {"title": "End of Lesson Assessment", "content": "Questions..."}}`;
                break;

            case 'AnswerKey':
                taskInstruction = 'Generate the "Answer Key" for the assessment.';
                jsonFormat = `{"page": {"title": "Answer Key", "content": "Answers..."}}`;
                break;

            case 'References':
                taskInstruction = 'Generate a "References" page.';
                jsonFormat = `{"page": {"title": "References", "content": "Sources..."}}`;
                break;

            default:
                throw new Error(`Unknown component type: ${componentType}`);
        }

        return `${commonHeader}\n\n**TASK:** ${taskInstruction}\n${styleRules}\n\n**JSON FORMAT:**\n${jsonFormat}\n\n**SOURCE TEXT:**\n${sourceText}`;
    };

    const generateLessonComponent = async (sourceText, baseContext, lessonPlan, componentType, isMountedRef, extraData = {}, maxRetries = 3, signal) => {
        const prompt = getComponentPrompt(sourceText, baseContext, lessonPlan, componentType, extraData);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            if (!isMountedRef.current || signal?.aborted) throw new Error("Aborted");

            try {
               // Passing maxOutputTokens and signal to handle cancellation
               const aiResponse = await callGeminiWithLimitCheck(prompt, { maxOutputTokens: 8192, signal });
                
                if (!isMountedRef.current || signal?.aborted) throw new Error("Aborted");

                const jsonData = sanitizeJsonComponent(aiResponse);
                return jsonData; 

            } catch (error) {
                if (error.name === 'AbortError' || signal?.aborted) throw new Error("Aborted");
                
                if (attempt === maxRetries - 1) throw error;
                // Retry delay (not the safety delay, just a glitch retry)
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    };

    const handleGenerateLesson = async () => {
        if (!file) { setError('Please upload a file first.'); return; }
        
        // --- 1. SETUP ABORT CONTROLLER ---
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        setIsProcessing(true);
        setError('');
        setPreviewLessons([]);
        const allGeneratedLessons = [];

        try {
            setProgressMessage('Step 1/3: Extracting text...');
            let extractedText = await extractTextFromFile(file);
            if (!isMounted.current || signal.aborted) return;

            // Pre-process common currency symbol for better AI recognition
            extractedText = extractedText.replace(/₱/g, 'PHP ');
            const sourceText = extractedText;
            
            setProgressMessage('Step 2/3: Planning curriculum...');
            const baseContext = getBasePromptContext();
            const plannerPrompt = getPlannerPrompt(sourceText, baseContext);
            
            // Initial Safety Delay before Planner
            await smartDelay(2000, signal);
            
            const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt, { maxOutputTokens: 8192, signal });
            if (!isMounted.current || signal.aborted) return;
            const lessonPlans = sanitizeJsonBlock(plannerResponse); 

            setProgressMessage(`Step 3/3: Building ${lessonPlans.length} lessons...`);
            let lessonCounter = existingLessonCount;

            for (const [index, plan] of lessonPlans.entries()) {
                if (!isMounted.current || signal.aborted) return;
                
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

                // --- HELPER: WRAPPER FOR GENERATION WITH THROTTLING ---
                const safeGenerate = async (type, extra = {}) => {
                    if (!isMounted.current || signal.aborted) throw new Error("Aborted");
                    
                    // Throttling: Wait before EVERY component generation to reset token buckets
                    // We use the safety delay constant.
                    setProgressMessage(`Building "${numberedPlan.lessonTitle}": ${type}... (Throttling for safety)`);
                    
                    try {
                        await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                        const result = await generateLessonComponent(sourceText, baseContext, numberedPlan, type, isMounted, extra, 3, signal);
                        return result;
                    } catch (e) {
                        if (e.name === 'AbortError' || e.message === 'Aborted') throw e; // Rethrow aborts
                        console.warn(`Skipping ${type} due to error:`, e);
                        return null; // Skip non-critical errors
                    }
                };

                // UPDATED: Added type: 'text' to all page pushes
                if (isUnitOverview) {
                    const overview = await safeGenerate('UnitOverview_Overview');
                    if(overview) newLesson.pages.push({ ...overview.page, type: 'text' });
                    
                    const targets = await safeGenerate('UnitOverview_Targets');
                    if(targets) newLesson.pages.push({ ...targets.page, type: 'text' });
                } else {
                    const objs = await safeGenerate('objectives');
                    if(objs) newLesson.learningObjectives = objs.objectives;

                    const comps = await safeGenerate('competencies');
                    if(comps) newLesson.assignedCompetencies = comps.competencies;
                    
                    const intro = await safeGenerate('Introduction');
                    if(intro) newLesson.pages.push({ ...intro.page, type: 'text' });
                    
                    const activity = await safeGenerate('LetsGetStarted');
                    if(activity) newLesson.pages.push({ ...activity.page, type: 'text' });

                    const planner = await safeGenerate('CoreContentPlanner');
                    const contentTitles = planner ? planner.coreContentTitles : [];
                    
                    for (const [cIdx, title] of contentTitles.entries()) {
                        const pageData = await safeGenerate('CoreContentPage', { contentTitle: title, allContentTitles: contentTitles, currentIndex: cIdx });
                        if (pageData) newLesson.pages.push({ ...pageData.page, type: 'text' });
                    }
                    
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
            setProgressMessage('Done!');

        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'Aborted') {
                console.log("Generation aborted by user.");
                setProgressMessage('Generation cancelled.');
                return;
            }
            if (!isMounted.current) return;
            
            console.error('Generation error:', err);
            // Specifically check for Quota Error in the message to give better feedback
            if (err.message && err.message.includes("429")) {
                 setError('AI quota exceeded. Please try again in a few moments with a smaller file.');
            } else {
                 setError('An error occurred. Parts of the lesson may be missing.');
            }
        } finally {
            if (isMounted.current) setIsProcessing(false);
        }
    };
    
    // ... (rest of the component: handleSaveLesson, UI rendering) ...
    
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

    // --- UI CONSTANTS (Monet Adaptive) ---
    const panelClass = `${themeStyles.panelBg} border ${themeStyles.borderColor} rounded-[24px] shadow-2xl shadow-black/5 transition-colors duration-500`;
    const inputClass = `w-full ${themeStyles.inputBg} border ${themeStyles.borderColor} rounded-[14px] px-4 py-3 text-[15px] ${themeStyles.textColor} placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner appearance-none`;
    const labelClass = `text-[11px] font-bold ${themeStyles.subText} mb-2 block tracking-wide uppercase ml-1`;

    return (
        <div className={`flex flex-col h-[100dvh] font-sans ${themeStyles.bgGradient} ${themeStyles.textColor} overflow-hidden transition-colors duration-500`}>
            {/* Header */}
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

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto lg:overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:h-full p-3 sm:p-4 gap-4 max-w-[1920px] mx-auto">
                    
                    {/* Left Panel: Inputs */}
                    <div className={`w-full lg:w-[380px] flex flex-col flex-shrink-0 ${panelClass} lg:h-full lg:overflow-hidden`}>
                        <div className="flex-grow lg:overflow-y-auto custom-scrollbar p-5 space-y-6">
                            
                            {/* Processing State */}
                            {isProcessing ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in fade-in duration-500">
                                    <div className="relative">
                                        <div className={`absolute inset-0 rounded-full blur-xl animate-pulse ${themeStyles.iconBg}`} />
                                        <Spinner size="lg" />
                                    </div>
                                    <p className={`text-[15px] font-medium text-center max-w-[240px] leading-relaxed ${themeStyles.textColor}`}>
                                        {progressMessage}
                                    </p>
                                    <p className="text-xs text-center opacity-60">Please wait. We are throttling requests to ensure quality and prevent errors.</p>
                                </div>
                            ) : (
                                <>
                                    {/* File Upload */}
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

                                    {/* ... Rest of the inputs (Language, Grade, Standards, Scaffolding) ... */}
                                    {/* (Keeping the UI identical to the previous version, just ensuring the logic above wraps the rendering) */}
                                    
                                    <div className={`h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-10`} />

                                    {/* Filters */}
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

                                    {/* Scaffolding Section */}
                                    <div>
                                        <label className={labelClass}>Prerequisites (Scaffolding)</label>
                                        <div className={`${inputClass} p-2 max-h-[220px] overflow-y-auto custom-scrollbar`}>
                                            {subjectContext && subjectContext.units.length > 0 ? (
                                                subjectContext.units.slice().sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })).map(unit => {
                                                    const lessonsInUnit = subjectContext.lessons.filter(l => l.unitId === unit.id);
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
                                                                        isAll || isPartial 
                                                                        ? `bg-blue-500 border-transparent scale-105` 
                                                                        : `${themeStyles.borderColor} bg-transparent`
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
                                                                                <div className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-all duration-200 border ${
                                                                                    isSelected 
                                                                                    ? 'bg-blue-500 border-transparent' 
                                                                                    : `bg-transparent ${themeStyles.borderColor} opacity-50 group-hover:opacity-100`
                                                                                }`}>
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

                        {/* Action Button */}
                        <div className={`p-4 border-t sticky bottom-0 z-10 rounded-b-[24px] ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                            <button 
                                onClick={handleGenerateLesson} 
                                disabled={!file || isProcessing}
                                className={`w-full h-12 rounded-[16px] font-bold text-[15px] text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2
                                    ${!file || isProcessing 
                                        ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none opacity-70' 
                                        : `${activeOverlay !== 'none' ? `bg-gradient-to-r ${themeStyles.buttonGradient}` : 'bg-[#007AFF] hover:bg-[#0062CC]'} shadow-blue-500/25 hover:shadow-blue-500/40`}`}
                            >
                                {isProcessing ? <Spinner size="sm" color="border-white" /> : <SparklesIcon className="w-5 h-5 stroke-[2]" />}
                                {previewLessons.length > 0 ? 'Regenerate Content' : 'Generate Lessons'}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className={`flex-grow flex flex-col relative overflow-hidden rounded-[24px] min-h-[500px] lg:min-h-0 lg:h-full ${panelClass}`}>
                        {isProcessing || previewLessons.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                                {isProcessing ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                        <div className="relative mb-6">
                                            <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${themeStyles.iconBg}`} />
                                            <Spinner size="xl" />
                                        </div>
                                        <h4 className={`text-xl font-bold mb-2 tracking-tight ${themeStyles.textColor}`}>Generating Content</h4>
                                        <p className={`text-sm max-w-xs leading-relaxed ${themeStyles.subText}`}>{progressMessage}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-24 h-24 rounded-[28px] flex items-center justify-center mb-6 shadow-inner border ${themeStyles.inputBg} ${themeStyles.borderColor}`}>
                                            <SparklesIcon className={`w-10 h-10 opacity-50 ${themeStyles.textColor}`} />
                                        </div>
                                        <h3 className={`text-2xl font-bold mb-2 tracking-tight ${themeStyles.textColor}`}>Ready to Create</h3>
                                        <p className={`max-w-sm leading-relaxed ${themeStyles.subText}`}>
                                            AI will analyze your document and generate a structured lesson plan with objectives, activities, and assessments.
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            // ... (Existing Preview UI Logic) ...
                             <div className="flex flex-col lg:flex-row h-full gap-4">
                                {/* Navigation Sidebar */}
                                <div className={`w-full lg:w-[280px] flex-shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col ${themeStyles.borderColor} ${themeStyles.inputBg}`}>
                                    <div className="p-4">
                                        <h4 className={labelClass}>GENERATED LESSONS</h4>
                                    </div>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {previewLessons.map((lesson, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setSelectedLessonIndex(idx); setSelectedPageIndex(0); }}
                                                className={`w-full text-left px-4 py-3 rounded-[14px] transition-all flex items-start gap-3 group border ${
                                                    selectedLessonIndex === idx 
                                                    ? `${themeStyles.highlight} shadow-md` 
                                                    : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                                                }`}
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

                                {/* Main Content View */}
                                <div className="flex-grow flex flex-col overflow-hidden">
                                    {selectedLesson && (
                                        <>
                                            {/* Content Header */}
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

                                                {/* Page Tabs */}
                                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                                    {selectedLesson.pages?.map((page, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedPageIndex(idx)}
                                                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap border ${
                                                                selectedPageIndex === idx 
                                                                ? `${themeStyles.textColor} ${activeOverlay !== 'none' ? 'bg-white/20' : 'bg-slate-900 text-white dark:bg-white dark:text-black'} border-transparent shadow-md` 
                                                                : `${themeStyles.borderColor} ${themeStyles.subText} hover:bg-white/10`
                                                            }`}
                                                        >
                                                            {page.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Content Body */}
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

            {/* Footer */}
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