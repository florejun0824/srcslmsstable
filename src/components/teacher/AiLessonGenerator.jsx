// src/components/lessons/AiLessonGenerator.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { getAllSubjects } from '../../services/firestoreService';
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

import {
    ArrowUturnLeftIcon,
    DocumentArrowUpIcon,
    DocumentTextIcon,
    XMarkIcon,
    SparklesIcon,
    CheckIcon,
    ListBulletIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';
import LessonPage from './LessonPage';

// --- CONFIGURATION ---
// SAFETY DELAY: Adjusted for larger context (50k chars ~= 12k tokens).
const GEMMA_SAFETY_DELAY_MS = 5000;

// --- HELPER: Pollinations URL Generator ---
const generatePollinationsUrl = (prompt) => {
    // 1. Safety checks
    if (!prompt || typeof prompt !== 'string' || prompt.length < 5 || prompt.toLowerCase() === 'none') return null;

    // 2. Truncate prompt
    const cleanPrompt = prompt.slice(0, 500);

    // 3. Generate Seed
    const seed = Array.from(cleanPrompt).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // 4. Encode
    const safePrompt = encodeURIComponent(cleanPrompt + ", ultrarealistic, 8k, scientific photography, educational diagram");

    return `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&width=1024&height=576&seed=${seed}`;
};

/**
 * --- Helper: Cloudinary Uploader ---
 * Handles the "Generate Once, Cache Forever" strategy.
 */
const uploadToCloudinary = async (imageUrl) => {
    if (!imageUrl) return null;
    try {
        // 1. Fetch the image from Pollinations
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // 2. Prepare FormData for Cloudinary
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', 'lessons'); // User Preset

        // 3. Upload to Cloudinary
        const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/de2uhc6gl/image/upload`, // User Cloud Name
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!uploadResponse.ok) throw new Error('Cloudinary upload failed');

        const data = await uploadResponse.json();
        return data.secure_url; // Return the permanent Cloudinary URL
    } catch (error) {
        console.error("Image upload failed, falling back to original URL:", error);
        return imageUrl; // Fallback: Keep the Pollinations URL if upload fails
    }
};

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
 */
const sanitizeJsonComponent = (aiResponse) => {
    let jsonString = aiResponse;

    try {
        // Attempt 1: Standard JSON Parsing
        const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
        if (markdownMatch && markdownMatch[2]) {
            jsonString = markdownMatch[2];
        } else {
            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                jsonString = jsonString.substring(startIndex, endIndex + 1);
            }
        }

        let cleanString = jsonString.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
        cleanString = cleanString.replace(/\\(?![/u"\\bfnrt])/g, "\\\\");

        return JSON.parse(cleanString);

    } catch (parseError) {
        console.warn("JSON.parse failed, attempting Manual Regex Extraction:", parseError.message);

        try {
            // Attempt 2: Manual Regex Extraction (Enhanced)

            // Extract Title
            const titleMatch = aiResponse.match(/"title"\s*:\s*"([^"]*?)"/);
            const title = titleMatch ? titleMatch[1] : "Generated Page";

            // Extract Image Prompt
            const imagePromptMatch = aiResponse.match(/"imagePrompt"\s*:\s*"([^"]*?)"/);
            const imagePrompt = imagePromptMatch ? imagePromptMatch[1] : "";

            // Extract Figure Label
            const figureLabelMatch = aiResponse.match(/"figureLabel"\s*:\s*"([^"]*?)"/);
            const figureLabel = figureLabelMatch ? figureLabelMatch[1] : "";

            // Extract Content
            const contentMatch = aiResponse.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*\}|\s*,)/);
            let content = "";

            if (contentMatch) {
                content = contentMatch[1];
            } else {
                // Fallback for content if regex fails
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

            // Cleanup content string
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
                    content: content,
                    imagePrompt: imagePrompt,
                    figureLabel: figureLabel
                }
            };

        } catch (extractError) {
            console.error("Critical: Failed to sanitize JSON.", aiResponse.substring(0, 200));
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

    const [progressMessage, setProgressMessage] = useState('');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [currentAction, setCurrentAction] = useState('');

    const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);

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
            default:
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
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (unitId) {
            const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
            const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
                setExistingLessonCount(snapshot.size);
            });
            return () => unsubscribe();
        }
    }, [unitId]);

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
        // --- DYNAMIC IMPORTS FOR PERFORMANCE ---

        // 1. Handle PDF
        if (fileToProcess.type === 'application/pdf') {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();

                // Variable to track the vertical position of the last item
                let lastY = -1;
                let pageText = '';

                for (const item of content.items) {
                    if (!item.str || item.str.trim().length === 0) continue;
                    const currentY = item.transform ? item.transform[5] : -1; // Y-coordinate

                    // DETECT NEW LINE:
                    if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                        pageText += '\n' + item.str;
                    } else {
                        pageText += (pageText.endsWith(' ') || item.str.startsWith(' ') ? '' : ' ') + item.str;
                    }
                    lastY = currentY;
                }
                fullText += pageText + '\n\n';
            }
            return fullText;

        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // 2. DOCX handling
            const mammoth = await import('mammoth');
            const arrayBuffer = await fileToProcess.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;

        } else if (fileToProcess.type === 'text/plain') {
            // 3. TXT handling
            return await fileToProcess.text();

        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    // --- PROMPTS AND INSTRUCTIONS ---

    const getBasePromptContext = () => {
        // UPDATED: Removed Philippines/DepEd context context to focus on fidelity and neutrality
        const languageAndGradeInstruction = `
            **TARGET AUDIENCE & TONE:**
            - **Grade Level:** Grade ${gradeLevel}. 
            - **Language:** The entire output MUST be written in **${language}**.
            - **Tone:** Academic, clear, objective, and faithful to the source material.
            - **Fidelity:** Do not add external cultural context unless it exists in the source text.
        `;

        // --- CATHOLIC PERSPECTIVE LOGIC (RESTORED) ---
        const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
        const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
        let perspectiveInstruction = '';
        if (selectedSubjectData && catholicSubjects.includes(selectedSubjectData.title)) {
            perspectiveInstruction = `
                **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**. All explanations must align with Catholic teachings.
            `;
        }

        const standardsInstruction = `
        **UNIT STANDARDS:**
        - **Content Standard:** ${contentStandard || "Not provided."}
        - **Performance Standard:** ${performanceStandard || "Not provided."}
        - **Learning Competencies:** ${learningCompetencies || "Not provided."}
        `;

        return {
            languageAndGradeInstruction,
            perspectiveInstruction,
            standardsInstruction,
        };
    };

    const getPlannerPrompt = (sourceText, baseContext) => {
        const { languageAndGradeInstruction, perspectiveInstruction, standardsInstruction } = baseContext;

        return `
        You are an expert content synthesizer. Your *only* task is to read the provided source text and generate a *plan* (a JSON array of lessons) that mirrors the source content.
        
        ${languageAndGradeInstruction}
        ${perspectiveInstruction}
        ${standardsInstruction}

        **MATH & SCIENCE HANDLING:**
        If the source text contains mathematical formulas, ensure your lesson titles and summaries reflect the mathematical content accurately.

        **CRITICAL TASK: ANALYZE FULL DOCUMENT SCOPE**
        The source text provided is large. You must ensure your lesson plan covers **ALL** key topics found in the text, from beginning to end. 
        - **DO NOT** stop after the first few paragraphs. 
        - **DO NOT** summarize the whole document into one single generic lesson if there are clearly distinct chapters or major topics.

        **CRITICAL INSTRUCTION: THE "SINGLE LESSON" BIAS**
        - **DEFAULT BEHAVIOR:** You should assume the entire file is **ONE SINGLE LESSON** unless proven otherwise.
        - **MERGE, DON'T SPLIT:** If the file contains "Topic A" and "Topic B", merge them into one lesson titled "Topic A & B" rather than creating two separate lessons.
        - **IGNORE SUB-HEADERS:** Do NOT treat headers like "1.1", "Part 2", or "Activity 3" as new lessons. These are just sections within the same lesson.

        **WHEN TO CREATE MULTIPLE LESSONS (STRICT CRITERIA):**
        - Only create a second lesson object if the source text explicitly says "LESSON 2" or "CHAPTER 2" with a completely different subject matter.

        **JSON OUTPUT FORMAT:**
        {
          "lessons": [
            {
              "lessonTitle": "Lesson ${existingLessonCount + 1}: [Comprehensive Title]",
              "summary": "Detailed summary covering ALL key points from the start to the end of the file."
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
        **SYSTEM INSTRUCTION:** DO NOT output your thinking process. Output ONLY raw, valid JSON.
        
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
        
        **CRITICAL TABLE HANDLING RULE:**
        - If you encounter text in the source that looks like a table (rows of data, unstructured lists), you MUST reconstruct it into a valid Markdown table.
        `;

        const masterInstructions = `
        **Persona and Tone:** Adopt the persona of a **Precise Content Synthesizer**.
        - **Goal:** Your goal is to provide a **high-fidelity paraphrase** of the source material.
        - **Tone:** Objective, clear, and comprehensive. 
        ${baseContext.perspectiveInstruction}

        **CRITICAL "INVISIBLE SOURCE" RULE (NON-NEGOTIABLE):**
        - **NO META-COMMENTARY:** You are strictly forbidden from using phrases like "The source text says," "According to the document," "The file mentions," or "As shown in the PDF."
        - **Direct Authority:** Present the information as direct facts.
        
        **CRITICAL "UNPACKING" RULE:**
        - **NEVER SUMMARIZE TO CUT CONTENT:** Your job is not to make the text shorter. Your job is to make it **readable and organized**.
        - **Explain the "Why":** Don't just list facts. Explain the mechanisms, reasons, and implications behind the facts *as found in the Source Text*.

        **CRITICAL FIDELITY & SUPPORT:**
        - **Source Anchor:** All core definitions and key points must come from the Source Text.
        - **Fact Check:** Do not invent data. Do not add examples that are not in the source text unless strictly necessary for basic comprehension.
    `;
        return { styleRules, masterInstructions };
    };

    const getComponentPrompt = (sourceText, baseContext, lessonPlan, componentType, styleRules, extraData = {}) => {
        const { languageAndGradeInstruction, perspectiveInstruction, standardsInstruction } = baseContext;

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
                taskInstruction = `Generate the "Engaging Introduction" page. 
                **SMART IMAGE INJECTION:** If the topic is complex (e.g., Biology, Physics), include an "imagePrompt" and "figureLabel".
                - **figureLabel:** Use "Figure 1: [Descriptive Title]".
                - **imagePrompt:** High-quality, ultrarealistic scientific photography description.`;

                jsonFormat = `{
                  "page": {
                    "title": "Introduction",
                    "content": "Intro markdown...",
                    "imagePrompt": "Detailed prompt for image generation...",
                    "figureLabel": "Figure 1: Overview of [Topic]"
                  }
                }`;
                break;

            case 'LetsGetStarted':
                taskInstruction = 'Generate a "Let\'s Get Started" warm-up activity page. It should act as a bridge from the Introduction.';
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "Let's Get Started",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
                break;

            case 'CoreContentPlanner':
                taskInstruction = `Analyze the focus for this lesson: "${lessonPlan.summary}" and the SOURCE TEXT provided.
                **CRITICAL TASK (NON-NEGOTIABLE):** Your task is to break down the material in the source text into a series of **page-sized sub-topics**. 
                - **BE COMPREHENSIVE:** Do not summarize quickly. If the text has 5 distinct sections, create 5 page titles.
                - **NO SKIPPING:** Ensure the end of the source text is represented in the final pages.
                - Each sub-topic you list will become *one single page*.
                - Do **NOT** include titles for "Introduction," "Warm-Up," "Summary," etc.`;
                jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "coreContentTitles": [\n    "First Sub-Topic Title",\n    "Second Sub-Topic Title"\n  ]\n}`;
                break;

            case 'CoreContentPage':
                const allTitles = extraData.allContentTitles || [extraData.contentTitle];
                const currentIndex = extraData.currentIndex !== undefined ? extraData.currentIndex : 0;
                const currentTitle = extraData.contentTitle;

                // NEW: Get list of previous and next titles to set strict boundaries
                const previousTitles = allTitles.slice(0, currentIndex).join(', ');
                const nextTitles = allTitles.slice(currentIndex + 1).join(', ');

                const contentContextInstruction = `
			                **PAGING CONTEXT:** Page ${currentIndex + 1} of ${allTitles.length}.
			                - **CURRENT FOCUS:** "${currentTitle}"
			                - **PREVIOUSLY COVERED (DO NOT REPEAT):** ${previousTitles || "None - This is the first page."}
			                - **COMING NEXT (DO NOT SPOIL):** ${nextTitles || "None - This is the last page."}
			                `;

                taskInstruction = `Generate *one* core content page for this lesson.
			                - **Page Title:** It MUST be exactly: "${currentTitle}"
			                ${contentContextInstruction}
                
			                **SMART IMAGE INJECTION RULES:**
			                1. **Analogy/Scenario detection:** If you use an analogy (e.g., comparing a cell to a city), you MUST generate an "imagePrompt" visualizing that analogy.
			                2. **Visual Support:** If describing a specific tool (e.g., Beaker, Microscope), generate an "imagePrompt" for it.
			                3. **Placement:** Provide a "figureLabel" (e.g., "Figure ${currentIndex + 2}: [Description]").
			                If no visual is needed, leave imagePrompt and figureLabel as empty strings.

			                **CRITICAL "ANTI-REDUNDANCY" RULE:**
			                - **EXCLUSIVE SCOPE:** Scan the Source Text *only* for information specifically related to "${currentTitle}".
			                - **BOUNDARIES:** Do NOT re-define concepts from [${previousTitles}]. Do NOT jump ahead to [${nextTitles}].

			                **CRITICAL RULE: THE "TWIN MIRROR" PROTOCOL (NON-NEGOTIABLE):**
			                You are NOT a creative writer. You are a **FIDELITY ENGINE**. 

			                **ABSOLUTE REQUIREMENT (100% of Content)**
			                - **Goal:** Create a **detail-rich, high-fidelity paraphrase** of the Source Text.
			                - **NO CONDENSATION:** If the source text devotes 5 sentences to explaining a specific mechanism, you must also devote at least 5 sentences to it. Do NOT compress a paragraph into a bullet point.
			                - **PRESERVE SPECIFICS:** You must capture every **date**, **name**, **number**, **step**, and **original example** found in the source text.
			                    - *Example:* If the source mentions "The Battle of Hastings", discuss the Battle of Hastings. Do not swap it for a different battle.
			                - **ENHANCEMENT:** Your only liberty is to improve the *flow* and *clarity* of the writing. Fix the grammar, make the tone engaging, but keep the **information density** exactly the same as the source.
                            - **NO EXTERNAL CONTEXT:** Do not force connections to countries or cultures not mentioned in the source.

			                **CONTENT STRUCTURE:**
			                - **Deep Dive:** Start immediately with the specific details of "${currentTitle}".
			                - **Academic Storytelling:** Write in full, rich paragraphs. Use bullet points *only* if the source text explicitly uses a list.
			                - **Bold Key Terms:** When you hit a major term from the source, **bold it**, then ensure the surrounding text fully explains it as the source does.
                
			                **TONE:**
			                - **Expert & Objective:** Speak with the confidence of a professor and the neutrality of a textbook.`;

                jsonFormat = `{
			                      "page": {
			                        "title": "${currentTitle}",
			                        "content": "Detailed markdown content...",
			                        "imagePrompt": "Ultrarealistic scientific 8k prompt...",
			                        "figureLabel": "Figure ${currentIndex + 2}: [Topic] Illustration"
			                      }
			                    }`;
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
                taskInstruction = `Generate the "Wrap-Up" page. Academic closure.`;
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
                taskInstruction = `Generate the "References" page. Academic-style reference list based on the source text.`;
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
                const aiResponse = await callGeminiWithLimitCheck(finalPrompt, { maxOutputTokens: 8912, signal });

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
            setCurrentAction('Initializing Neural Core & Reading file...');
            setGenerationProgress(5);

            let extractedText = await extractTextFromFile(file);
            if (!isMounted.current || signal.aborted) return;
            // Clean up text
            extractedText = extractedText.replace(/₱/g, 'PHP ');

            // --- INCREASED TRUNCATION LIMIT FOR FULL CONTEXT ---
            // Bumped to 50k to ensure we read the ENTIRE file for fidelity.
            const sourceText = extractedText.substring(0, 50000);

            // --- PHASE 2: PLANNING (5% -> 15%) ---
            setCurrentAction('Creating curriculum outline and lesson map...');
            setGenerationProgress(10);

            const baseContext = getBasePromptContext();
            const plannerPrompt = getPlannerPrompt(sourceText, baseContext);

            // Initial safety delay - longer for larger input
            await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
            const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt, { maxOutputTokens: 6144, signal });
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
                        // Guarantees we don't exceed TPM with the larger 50k char payload
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
                            if (fullContext.length > 8000) {
                                fullContext = "..." + fullContext.slice(-8000);
                            }
                            accumulatedLessonContext = fullContext;
                        }

                        return result;
                    } catch (e) {
                        if (e.name === 'AbortError' || e.message === 'Aborted') throw e;
                        console.warn(`Skipping ${type}:`, e);
                        return null;
                    }
                };

                if (isUnitOverview) {
                    const overview = await safeGenerate('UnitOverview_Overview');
                    if (overview) newLesson.pages.push({ ...overview.page, type: 'text' });

                    // Update progress mid-lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.5)));

                    const targets = await safeGenerate('UnitOverview_Targets');
                    if (targets) newLesson.pages.push({ ...targets.page, type: 'text' });
                } else {
                    const objs = await safeGenerate('objectives');
                    if (objs) newLesson.learningObjectives = objs.objectives;

                    const comps = await safeGenerate('competencies');
                    if (comps) newLesson.assignedCompetencies = comps.competencies;

                    const intro = await safeGenerate('Introduction');
                    if (intro) {
                        // --- SMART IMAGE URL INJECTION ---
                        if (intro.page.imagePrompt) {
                            intro.page.imageUrl = generatePollinationsUrl(intro.page.imagePrompt);
                        }
                        newLesson.pages.push({ ...intro.page, type: 'text' });
                    }

                    // 25% through lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.25)));

                    const activity = await safeGenerate('LetsGetStarted');
                    if (activity) newLesson.pages.push({ ...activity.page, type: 'text' });

                    const planner = await safeGenerate('CoreContentPlanner');
                    const contentTitles = planner ? planner.coreContentTitles : [];

                    // 50% through lesson
                    setGenerationProgress(Math.floor(currentBaseProgress + (progressPerLesson * 0.5)));

                    for (const [cIdx, title] of contentTitles.entries()) {
                        const pageData = await safeGenerate('CoreContentPage', { contentTitle: title, currentIndex: cIdx, allContentTitles: contentTitles });
                        if (pageData) {
                            // --- SMART IMAGE URL INJECTION ---
                            if (pageData.page.imagePrompt) {
                                pageData.page.imageUrl = generatePollinationsUrl(pageData.page.imagePrompt);
                            }
                            newLesson.pages.push({ ...pageData.page, type: 'text' });
                        }
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

    // --- CLOUDINARY & FIREBASE SAVE LOGIC ---
    const handleSaveLesson = async () => {
        if (previewLessons.length === 0) return;
        setSaving(true);
        setCurrentAction("Persisting images to cloud storage..."); // User feedback for image upload phase

        try {
            // 1. Process Lessons: Upload Pollinations images to Cloudinary BEFORE saving to DB
            const processedLessons = await Promise.all(previewLessons.map(async (lesson) => {

                // Loop through pages to find and upload Pollinations images
                const processedPages = await Promise.all(lesson.pages.map(async (page) => {
                    // Detect Pollinations URL and upload
                    if (page.imageUrl && page.imageUrl.includes('pollinations.ai')) {
                        const permanentUrl = await uploadToCloudinary(page.imageUrl);
                        return { ...page, imageUrl: permanentUrl };
                    }
                    return page;
                }));

                return { ...lesson, pages: processedPages };
            }));

            // 2. Save the PROCESSED lessons (now with Cloudinary URLs) to Firebase
            const savePromises = processedLessons.map((lesson, index) =>
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

            showToast(`${previewLessons.length} lesson(s) saved successfully with permanent images!`, 'success');
            resetGeneratorState();
            onClose();
        } catch (err) {
            console.error("Save error:", err);
            setError('Failed to save lessons or upload images.');
        } finally {
            setSaving(false);
        }
    };

    const selectedLesson = previewLessons[selectedLessonIndex];
    const selectedPage = selectedLesson?.pages?.[selectedPageIndex];

    const gradeLevels = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

    // Neo-Glass v10 System Constants
    const panelClass = `bg-white/70 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[32px] shadow-2xl transition-all duration-500`;
    const inputClass = `w-full bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-[18px] px-3 py-2 text-[14px] ${themeStyles.textColor} placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-sm appearance-none`;
    const labelClass = `text-[9px] font-black ${themeStyles.subText} mb-1 block tracking-[0.1em] uppercase ml-1 opacity-70`;

    return (
        <div className={`flex flex-col h-[100dvh] font-sans ${themeStyles.bgGradient} ${themeStyles.textColor} overflow-hidden transition-colors duration-500`}>

            {/* --- TOP NAVIGATION BAR --- */}
            <div className={`flex-shrink-0 px-6 py-3 flex items-center justify-between bg-white/40 dark:bg-black/20 backdrop-blur-md border-b border-white/10 z-20 sticky top-0 transition-colors duration-500`}>
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 ring-2 ring-blue-500/20`}>
                        <SparklesIcon className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tighter leading-none">Curriculum AI</h3>
                        <p className={`text-[10px] font-bold mt-1 uppercase tracking-[0.2em] opacity-50`}>Synthesis Engine v10.2</p>
                    </div>
                </div>
                <button onClick={onBack} className={`px-5 py-2 rounded-full text-[12px] font-black transition-all flex items-center gap-2 active:scale-95 bg-white/10 hover:bg-white/20 border border-white/10 shadow-lg backdrop-blur-xl uppercase tracking-widest`}>
                    <ArrowUturnLeftIcon className="w-3.5 h-3.5 stroke-[3]" /> Back
                </button>
            </div>

            <div className="flex-grow overflow-hidden">
                <div className="flex flex-col lg:flex-row h-full p-4 gap-4 max-w-[1920px] mx-auto min-h-0">

                    {/* --- LEFT PANEL: CONFIGURATION --- */}
                    <div className={`w-full lg:w-[420px] flex flex-col flex-shrink-0 ${panelClass} h-full overflow-hidden`}>
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-5 space-y-6">
                            {isProcessing ? (
                                /* --- ANIMATED AI CORE (LEFT) --- */
                                <div className="flex flex-col items-center justify-center h-full space-y-10 animate-in fade-in zoom-in-95 duration-1000">
                                    <div className="relative w-32 h-32">
                                        {/* Orbital Rings - Soft Blue */}
                                        <div className="absolute inset-0 border-2 border-blue-200/50 rounded-full animate-[spin_8s_linear_infinite]" />
                                        <div className="absolute inset-2 border border-indigo-200/50 rounded-full animate-[spin_4s_linear_infinite_reverse]" />
                                        <div className="absolute inset-4 border border-blue-100/50 rounded-full animate-[spin_6s_linear_infinite]" />

                                        {/* Glowing AI Pulse Core - Soft */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-white rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.15)] border border-blue-100 animate-pulse">
                                                <SparklesIcon className="w-8 h-8 text-blue-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center space-y-3">
                                        <p className="text-lg font-bold tracking-tight text-slate-700">Synthesizing Course</p>
                                        <p className="text-xs font-medium text-slate-400 max-w-[280px] leading-relaxed">
                                            The AI is currently analyzing your inputs and generating structured lesson material.
                                        </p>
                                        <div className="flex justify-center gap-1.5 pt-2">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="animate-in slide-in-from-left-6 duration-500">
                                        <label className={labelClass}>Material Source</label>
                                        {!file ? (
                                            <label className={`group flex flex-col items-center justify-center w-full h-32 rounded-[24px] border-2 border-dashed transition-all cursor-pointer relative overflow-hidden bg-white/30 dark:bg-black/20 border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5`}>
                                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                <DocumentArrowUpIcon className={`w-8 h-8 mb-2 opacity-30 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 text-blue-500`} />
                                                <span className={`text-[10px] font-black uppercase tracking-widest opacity-40`}>Initialize PDF/DOCX</span>
                                                <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                                            </label>
                                        ) : (
                                            <div className={`relative flex items-center p-3 rounded-[20px] border bg-blue-500/10 border-blue-500/20 shadow-xl group overflow-hidden`}>
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
                                                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center mr-3 bg-white dark:bg-black/40 text-blue-500 shadow-md`}>
                                                    <DocumentTextIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-black truncate ${themeStyles.textColor}`}>{file.name}</p>
                                                    <p className={`text-[9px] font-black opacity-40 uppercase tracking-widest mt-0.5`}>{(file.size / 1024).toFixed(0)} KB • Ready</p>
                                                </div>
                                                <button onClick={removeFile} className={`p-1.5 rounded-full transition-all active:scale-90 bg-white/50 dark:bg-black/20 text-red-500 hover:bg-red-500 hover:text-white shadow-sm`}>
                                                    <XMarkIcon className="w-4 h-4 stroke-[3]" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-left-8 duration-500">
                                        <div>
                                            <label className={labelClass}>Language</label>
                                            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                                                <option className="bg-slate-900">English</option>
                                                <option className="bg-slate-900">Filipino</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Level</label>
                                            <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className={inputClass}>
                                                {gradeLevels.map(l => <option key={l} value={l} className="bg-slate-900">{l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="animate-in slide-in-from-left-10 duration-500">
                                        <label className={labelClass}>Domain</label>
                                        <select value={selectedSubject || ''} onChange={(e) => setSelectedSubject(e.target.value)} className={inputClass}>
                                            <option value="" disabled className="bg-slate-900">Select Subject...</option>
                                            {sortedSubjects.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.title}</option>)}
                                        </select>
                                    </div>

                                    <div className="animate-in slide-in-from-left-12 duration-700">
                                        <label className={labelClass}>Target Competencies</label>
                                        <textarea value={learningCompetencies} onChange={(e) => setLearningCompetencies(e.target.value)} className={`${inputClass} min-h-[120px] resize-none leading-relaxed text-xs`} placeholder="Paste target learning competencies..." />
                                    </div>
                                </ >
                            )}
                        </div>

                        <div className={`p-6 border-t bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-b-[32px] border-white/10`}>
                            <button
                                onClick={handleGenerateLesson}
                                disabled={!file || isProcessing}
                                className={`w-full h-12 rounded-[18px] font-black text-[13px] text-white shadow-2xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 uppercase tracking-widest
                                    ${!file || isProcessing ? 'bg-slate-400/20 grayscale cursor-not-allowed opacity-40' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/40'}`}
                            >
                                {isProcessing ? 'Syncing...' : <><SparklesIcon className="w-4 h-4" /> Generate</>}
                            </button>
                        </div>
                    </div>

                    {/* --- RIGHT PANEL: BLUEPRINT & SYNTHESIS --- */}
                    <div className={`flex-grow flex flex-col relative overflow-hidden ${panelClass} min-h-0`}>

                        {/* 1. PROCESSING STATE: LIVE FABRICATION CONSOLE */}
                        {isProcessing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-50 animate-in fade-in duration-1000 overflow-hidden">

                                {/* Background Atmosphere - Lighter */}
                                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 to-indigo-50/40 rounded-full blur-[120px] animate-pulse" />
                                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-sky-50/40 to-blue-100/30 rounded-full blur-[120px] animate-pulse [animation-delay:2s]" />

                                <div className="w-full h-full max-w-4xl flex flex-col items-center justify-center relative z-10 gap-12">

                                    {/* A. Progress Percentage Area */}
                                    <div className="flex flex-col items-center text-center relative group cursor-default">
                                        <div className="absolute -inset-20 bg-gradient-to-r from-blue-100/0 via-blue-50 to-blue-100/0 blur-[60px] opacity-60 transition-opacity duration-1000" />

                                        <div className="relative mb-4 flex items-center justify-center w-32 h-32 rounded-full border-[6px] border-blue-50 bg-white/50 backdrop-blur-sm shadow-xl shadow-blue-500/5">
                                            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                                                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${generationProgress * 2.89} 289`} strokeLinecap="round" className="text-blue-500 transition-all duration-1000 ease-out" />
                                            </svg>
                                            <span className="text-4xl font-black tracking-tighter text-blue-600 relative z-10">
                                                {generationProgress}<span className="text-xl text-blue-300 ml-0.5">%</span>
                                            </span>
                                        </div>

                                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400 mt-2 animate-pulse drop-shadow-sm">Synthesis Processing</p>
                                    </div>

                                    {/* B. The "Active Task" Card (Split View) - Completely Lighter UI */}
                                    <div className="w-full max-w-2xl bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/50 relative transform hover:scale-[1.01] transition-transform duration-500">

                                        {/* Parsing Logic */}
                                        {(() => {
                                            const parts = currentAction ? currentAction.split('\n') : [];
                                            const contextLine = parts[0] || "System Core";
                                            const taskLine = parts[1] || "Building the foundation...";

                                            const displayContext = contextLine.replace('Generating ', '');
                                            const displayTask = taskLine.replace('...', '');

                                            return (
                                                <div className="flex flex-col sm:flex-row h-full">
                                                    {/* Left/Top Section: Context Title */}
                                                    <div className="w-full sm:w-2/5 p-8 bg-gradient-to-br from-slate-50 to-white border-b sm:border-b-0 sm:border-r border-slate-100 flex flex-col items-start justify-center relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-[40px] -mr-16 -mt-16" />

                                                        <div className="px-3 py-1 mb-4 bg-emerald-50 rounded-full border border-emerald-100 inline-flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active Task</span>
                                                        </div>

                                                        <h4 className="text-lg font-bold text-slate-800 leading-snug break-words">
                                                            {displayContext}
                                                        </h4>
                                                    </div>

                                                    {/* Right/Bottom Section: Generating Status */}
                                                    <div className="w-full sm:w-3/5 p-8 md:p-10 flex flex-col items-center sm:items-start text-center sm:text-left justify-center bg-white relative">
                                                        {/* Scanning Line Animation overlaying the task area */}
                                                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-40 animate-[shimmer_2s_infinite]" />

                                                        <div className="w-14 h-14 rounded-2xl bg-blue-50/80 text-blue-500 flex items-center justify-center mb-5 border border-blue-100 shadow-sm relative group">
                                                            {displayTask.toLowerCase().includes('image') ? <PhotoIcon className="w-7 h-7 text-blue-500 animate-pulse" /> :
                                                                displayTask.toLowerCase().includes('assessment') || displayTask.toLowerCase().includes('quiz') ? <CheckIcon className="w-7 h-7 text-emerald-500 animate-pulse" /> :
                                                                    displayTask.toLowerCase().includes('summary') ? <ListBulletIcon className="w-7 h-7 text-indigo-500 animate-pulse" /> :
                                                                        <ArrowPathIcon className="w-7 h-7 text-blue-500 animate-spin" />}
                                                        </div>

                                                        <div className="w-full">
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">Creating Element</p>
                                                            <h3 className="text-2xl font-black tracking-tight text-slate-800 leading-tight mb-6">
                                                                {displayTask}
                                                            </h3>
                                                        </div>

                                                        {/* Skeleton loaders indicating writing process */}
                                                        <div className="w-full space-y-3">
                                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-blue-300 to-indigo-400 w-3/4 animate-[loading_1.5s_ease-in-out_infinite]" />
                                                            </div>
                                                            <div className="h-2 w-5/6 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-indigo-300 to-blue-400 w-full animate-[loading_1.8s_ease-in-out_infinite_reverse]" />
                                                            </div>
                                                            <div className="h-2 w-2/3 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-blue-200 to-blue-400 w-1/2 animate-[loading_2s_ease-in-out_infinite]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* C. Footer Note */}
                                    <p className="text-xs font-semibold text-slate-400/80 max-w-md text-center leading-relaxed">
                                        Structuring content based on standard curriculum targets. Complex cognitive sections like assessments may momentarily take longer to verify.
                                    </p>
                                </div>
                            </div>
                        ) : previewLessons.length === 0 ? (
                            /* READY STATE (EMPTY) */
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 animate-in fade-in duration-1000">
                                <div className="w-32 h-32 rounded-[36px] bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-white/10 flex items-center justify-center mb-8 shadow-inner group">
                                    <SparklesIcon className="w-12 h-12 text-blue-500/20 group-hover:text-blue-500/40 transition-colors duration-500" />
                                </div>
                                <h3 className="text-3xl font-black mb-3 tracking-tighter opacity-80">Synthesis Ready</h3>
                                <p className="max-w-sm text-sm leading-relaxed opacity-40 font-medium">Upload resource materials to initiate AI-driven curriculum generation.</p>
                            </div>
                        ) : (
                            /* PREVIEW STATE (RESULTS) */
                            <div className="flex flex-col h-full animate-in fade-in duration-1000">
                                <div className="flex-grow flex overflow-hidden">
                                    {/* RAIL: LESSON LIST */}
                                    <div className="w-[420px] border-r border-white/10 bg-black/5 flex flex-col flex-shrink-0">
                                        <div className="p-6">
                                            <h4 className={labelClass}>Generated Modules</h4>
                                        </div>
                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2">
                                            {previewLessons.map((lesson, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => { setSelectedLessonIndex(idx); setSelectedPageIndex(0); }}
                                                    className={`w-full text-left px-5 py-4 rounded-[20px] transition-all border ${selectedLessonIndex === idx ? 'bg-blue-600 text-white border-transparent shadow-2xl scale-[1.02] z-10' : 'bg-transparent border-transparent opacity-50 hover:opacity-100 hover:bg-white/5'}`}
                                                >
                                                    <p className={`text-[13px] font-black leading-tight mb-1`}>{lesson.lessonTitle}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md ${selectedLessonIndex === idx ? 'bg-white/20' : 'bg-blue-500/10 text-blue-500'}`}>{lesson.pages.length} Pages</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CONTENT VIEWER */}
                                    <div className="flex-grow flex flex-col bg-white/10 dark:bg-black/10 overflow-hidden min-w-0">
                                        <div className="p-8 border-b border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md">
                                            <h2 className="text-xl font-black tracking-tighter mb-6 leading-tight italic">{selectedLesson?.lessonTitle}</h2>

                                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {selectedLesson.pages?.map((page, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedPageIndex(idx)}
                                                        className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border whitespace-nowrap ${selectedPageIndex === idx ? 'bg-blue-600 text-white shadow-xl border-transparent' : 'bg-white/10 border-white/10 opacity-40 hover:opacity-100'}`}
                                                    >
                                                        {page.title}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
                                            <div className="max-w-4xl mx-auto min-h-[500px]">
                                                {selectedPage ? (
                                                    <div className="prose prose-slate prose-xl dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                                        <LessonPage page={selectedPage} isEditable={false} />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full opacity-10">
                                                        <ArrowPathIcon className="w-16 h-16 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* GLOBAL PREVIEW FOOTER */}
                                <div className="p-6 border-t border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-3xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {error && (
                                            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
                                                <ExclamationTriangleIcon className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={onClose} className="px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-all hover:bg-white/5">Abort</button>
                                        <button
                                            onClick={handleSaveLesson}
                                            disabled={saving || previewLessons.length === 0 || isProcessing}
                                            className="px-10 py-3 rounded-[20px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black text-xs shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 transition-all uppercase tracking-widest"
                                        >
                                            {saving ? 'Encrypting...' : `Finalize ${previewLessons.length} Modules`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}