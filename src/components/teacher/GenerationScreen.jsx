import React, { useEffect, useState, useCallback, useRef } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';

// --- CONFIGURATION ---
// Set to 31 seconds to stay safely under Gemma 3's 15k TPM limit.
const GEMMA_SAFETY_DELAY_MS = 31000; 

/**
 * --- Helper: Smart Delay ---
 * Delays execution but can be aborted if the user closes the modal.
 */
const smartDelay = async (ms, signal) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                // We use a specific error name to identify this logic later
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

        // --- ATTEMPT 1: Clean and Parse ---
        // Fix common AI JSON errors:
        // 1. Fix unescaped newlines inside strings
        let cleanString = jsonString.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
        
        // 2. Fix invalid backslashes (e.g. \textbf -> \\textbf)
        // This Regex finds backslashes that are NOT followed by valid JSON escape chars
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

/**
 * --- Base Context Builder ---
 */
const getBasePromptContext = (guideData, existingSubjectContext) => {
    const languageAndGradeInstruction = `
        **TARGET AUDIENCE (NON-NEGOTIABLE):**
        - **Grade Level:** The entire output MUST be tailored for **Grade ${guideData.gradeLevel}** students.
        - **Language:** The entire output MUST be written in **${guideData.language}**.
        ${guideData.language === 'Filipino' ? `
        - **CRITICAL FILIPINO LANGUAGE RULE:** You are strictly forbidden from using English or any form of code-switching (Taglish). The output must be pure, academic Filipino.
        ` : ''}
    `;

    const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
    let perspectiveInstruction = '';
    if (catholicSubjects.includes(guideData.subjectName)) {
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
        3.  **CREATE A BRIDGE:** Where appropriate, the introduction of your new lesson should briefly reference a concept from the prerequisite lessons to create a smooth transition.

        ---
        **PREVIOUSLY COVERED MATERIAL (DO NOT RE-TEACH):**
        - **User-Selected Prerequisites:** ${guideData.scaffoldedLessons.length > 0 ? guideData.scaffoldedLessons.map(l => `- ${l.title}`).join('\n') : "N/A"}
        - **Other Existing Lessons:** ${existingSubjectContext || "N/A"}
        ---
    `;

    const standardsInstruction = `
        **UNIT STANDARDS (NON-NEGOTIABLE CONTEXT):**
        - **Content Standard:** ${guideData.contentStandard || "Not provided."}
        - **Performance Standard:** ${guideData.performanceStandard || "Not provided."}
        - **Learning Competencies (Master List):** ${guideData.learningCompetencies || "Not provided."}
    `;

    return {
        languageAndGradeInstruction,
        perspectiveInstruction,
        scaffoldingInstruction,
        standardsInstruction,
    };
};

/**
 * --- Planner Prompt Generator ---
 */
const getPlannerPrompt = (guideData, baseContext) => {
    const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
    
    return `
    You are an expert curriculum planner. Your *only* task is to take a main topic and break it down into a logical, scaffolded lesson plan.
    
    ${languageAndGradeInstruction}
    ${perspectiveInstruction}
    ${standardsInstruction}
    ${scaffoldingInstruction}

    **CRITICAL TASK: GENERATE A LESSON PLAN**
    You must analyze the user's main topic and break it down into a series of lessons.
    - **User's Main Topic:** "${guideData.content}"
    - **User's Requested Number of Lessons:** ${guideData.lessonCount}

    **YOUR RULES:**
    1.  **Respect the Count:** You MUST generate **exactly ${guideData.lessonCount}** lesson(s).
    2.  **Logical Flow:** The lessons MUST be in a logical, scaffolded order.
    3.  **Scaffolding:** Your plan MUST obey the "SCAFFOLDING TASK" and not repeat any topics from the "PREVIOUSLY COVERED MATERIAL."
    4.  **Titles:** Lesson titles must be formal, academic, and descriptive.
    5.  **Summaries:** Provide a 1-2 sentence summary for *each* lesson you plan.

    **CRITICAL QUOTE ESCAPING:** All double quotes (") inside string values MUST be escaped (\\").

    =============================
    JSON OUTPUT FORMAT (PLAN ONLY)
    =============================
    {
      "lessons": [
        {
          "lessonTitle": "Lesson 1: [Proposed Title for Lesson 1]",
          "summary": "A 1-2 sentence summary of what this specific lesson will cover."
        }
      ]
    }
    `;
};

/**
 * --- Micro-Worker Prompt Generator ---
 */
const getComponentPrompt = (guideData, baseContext, lessonPlan, componentType, styleRules, extraData = {}) => {
    const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
    
    const objectivesLabel = guideData.language === 'Filipino' ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives';
    const letsGetStartedLabel = guideData.language === 'Filipino' ? 'Simulan Natin!' : "Let's Get Started!";
    const checkUnderstandingLabel = guideData.language === 'Filipino' ? 'Suriin ang Pag-unawa' : "Check for Understanding";
    const lessonSummaryLabel = guideData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
    const wrapUpLabel = guideData.language === 'Filipino' ? 'Pagbubuod' : "Wrap-Up";
    const endOfLessonAssessmentLabel = guideData.language === 'Filipino' ? 'Pagtatasa sa Katapusan ng Aralin' : "End-of-Lesson Assessment";
    const referencesLabel = guideData.language === 'Filipino' ? 'Mga Sanggunian' : "References";
    const answerKeyLabel = guideData.language === 'Filipino' ? 'Susi sa Pagwawasto' : 'Answer Key';
    
    let taskInstruction, jsonFormat;

    const commonHeader = `
    You are an expert curriculum designer. Your task is to generate *only* the specific component requested.
    
    ${languageAndGradeInstruction}
    ${perspectiveInstruction}
    ${scaffoldingInstruction}
    ${standardsInstruction}

    **LESSON CONTEXT:**
    - **Main Topic:** ${guideData.content}
    - **Current Lesson Title:** ${lessonPlan.lessonTitle}
    - **Current Lesson Focus:** ${lessonPlan.summary}
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
            const introContext = extraData.introContent
                ? `**PREVIOUS PAGE CONTEXT:** The user was just shown this Introduction:\n"${extraData.introContent}"\n\n**TASK:** Generate the "${letsGetStartedLabel}" page. It must act as a *direct follow-up* to the introduction.`
                : `Generate the "${letsGetStartedLabel}" page.`;
            
            taskInstruction = introContext;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${letsGetStartedLabel}",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
            break;

        case 'CoreContentPlanner':
            taskInstruction = `Analyze the focus for this lesson: "${lessonPlan.summary}".
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

            let previousContentInstruction = '';
            if (currentIndex === 0) {
                previousContentInstruction = `**START:** Start teaching the new material for "**${currentTitle}**" immediately. Do NOT add a new introduction.`;
            } else {
                previousContentInstruction = `**CONTINUE:** Create a seamless continuation from the previous page content: "${extraData.previousPageContent || 'N/A'}". Focus ONLY on "**${currentTitle}**".`;
            }

            const contentContextInstruction = `
            **PAGING CONTEXT:** Page ${currentIndex + 1} of ${allTitles.length}.
            - **Current Title:** "${currentTitle}"
            ${previousContentInstruction}
            `;

            taskInstruction = `Generate *one* core content page for this lesson.
            - **Page Title:** It MUST be exactly: "${currentTitle}"
            ${contentContextInstruction}
            - **Content:** Detail-rich, narrative-driven, relevant *only* to this page title.
            - **CRITICAL LENGTH CONSTRAINT:** Be thorough but concise. Max 8000 chars JSON.`;
            
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${currentTitle}",\n    "content": "Detailed markdown content..."\n  }\n}`;
            break;
        
        case 'CheckForUnderstanding':
            taskInstruction = `Generate the "${checkUnderstandingLabel}" page. 3-4 concept questions based on the lesson.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${checkUnderstandingLabel}",\n    "content": "1. Question 1...\n2. Question 2..."\n  }\n}`;
            break;

        case 'LessonSummary':
            taskInstruction = `Generate the "${lessonSummaryLabel}" page. Concise recap of this lesson only.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${lessonSummaryLabel}",\n    "content": "Concise recap..."\n  }\n}`;
            break;
        
        case 'WrapUp':
            taskInstruction = `Generate the "${wrapUpLabel}" page. Motivational closure.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${wrapUpLabel}",\n    "content": "Closure..."\n  }\n}`;
            break;

        case 'EndofLessonAssessment':
            taskInstruction = `Generate the "${endOfLessonAssessmentLabel}" page. 5-8 questions (mix of multiple-choice, short-answer).`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${endOfLessonAssessmentLabel}",\n    "content": "### Multiple Choice\n1. Question..."\n  }\n}`;
            break;

        case 'AnswerKey':
            taskInstruction = `Generate the "${answerKeyLabel}" page. Answers to the assessment.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${answerKeyLabel}",\n    "content": "1. Answer..."\n  }\n}`;
            break;

        case 'References':
            taskInstruction = `Generate the "${referencesLabel}" page. Academic-style reference list.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${referencesLabel}",\n    "content": "- Source 1..."\n  }\n}`;
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
    `;
};

/**
 * --- Micro-Worker Function with Retries ---
 */
const generateLessonComponent = async (
    guideData, 
    baseContext, 
    lessonPlan, 
    componentType, 
    isMounted, 
    masterInstructions,
    styleRules,
    extraData = {}, 
    maxRetries = 3,
    signal
) => {
    const prompt = getComponentPrompt(
        guideData, 
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
        if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");

        try {
            const aiResponse = await callGeminiWithLimitCheck(finalPrompt, { signal });

            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");
            
            const jsonData = sanitizeJsonComponent(aiResponse);

            await new Promise(res => setTimeout(res, 1500));
            
            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");

            return jsonData;

        } catch (error) {
            // FIX: Robust check for abort errors (case insensitive)
            if (error.name === 'AbortError' || (signal && signal.aborted) || error.message.toLowerCase().includes("aborted")) {
                throw new Error("Generation aborted by user.");
            }
            
            if (!isMounted.current) throw new Error("Generation aborted by user.");

            console.warn(
                `Attempt ${attempt + 1} of ${maxRetries} failed for component: ${componentType} (Lesson: ${lessonPlan.lessonTitle})`,
                error.message
            );
            if (attempt === maxRetries - 1) {
                console.error(`All ${maxRetries} retries failed for component: ${componentType}. Aborting.`);
                throw new Error(`Failed to generate component ${componentType} after ${maxRetries} attempts: ${error.message}`);
            }

            await new Promise(res => setTimeout(res, 5000));
            if (!isMounted.current) throw new Error("Generation aborted by user.");
        }
    }
};

/**
 * --- Master Instructions Function ---
 */
const getMasterInstructions = async (guideData) => {
    const objectivesLabel = guideData.language === 'Filipino' ? 'Mga Layunin sa Pagkatuto' : 'Learning Objectives';
    const letsGetStartedLabel = guideData.language === 'Filipino' ? 'Simulan Natin!' : "Let's Get Started!";
    const checkUnderstandingLabel = guideData.language === 'Filipino' ? 'Suriin ang Pag-unawa' : "Check for Understanding";
    const lessonSummaryLabel = guideData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
    const wrapUpLabel = guideData.language === 'Filipino' ? 'Pagbubuod' : "Wrap-Up";
    const endOfLessonAssessmentLabel = guideData.language === 'Filipino' ? 'Pagtatasa sa Katapusan ng Aralin' : "End-of-Lesson Assessment";
    const referencesLabel = guideData.language === 'Filipino' ? 'Mga Sanggunian' : "References";
    const answerKeyLabel = guideData.language === 'Filipino' ? 'Susi sa Pagwawasto' : 'Answer Key';
    const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
    let perspectiveInstruction = '';
    if (catholicSubjects.includes(guideData.subjectName)) {
        perspectiveInstruction = `
            **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**. This is non-negotiable. All explanations, examples, and interpretations must align with Catholic teachings, doctrines, and values.
            **CRITICAL SOURCE REQUIREMENT (NON-NEGOTIABLE):** Prioritize citing and referencing official Catholic sources (CCC, Youcat, Encyclicals, etc.).
        `;
    }

    const masterInstructions = `
        **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer.
		**SYSTEM INSTRUCTION:** DO NOT output your thinking process. Output ONLY raw, valid JSON.
        **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${guideData.gradeLevel}**.
        ${perspectiveInstruction}
        **CRITICAL INSTRUCTION FOR CORE CONTENT:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the concept. Explain the "why" and "how". Use vivid analogies.
        
        **CRITICAL INSTRUCTION FOR INTERACTIVITY (NON-NEGOTIABLE):** You MUST embed small, interactive elements directly within the core content pages.
        - Use Markdown blockquotes (\`>\`) to format these.
        - **Examples:**
            - **> Think About It:** If gravity suddenly disappeared, what's the first thing that would happen?
            - **> Quick Poll:** Raise your hand if you think plants breathe.

        **Textbook Chapter Structure (NON-NEGOTIABLE):** You MUST generate the lesson pages in this exact sequence.
        1. **${objectivesLabel}:** (Handled by 'objectives' call)
        2. **Engaging Introduction:** (Handled by 'Introduction' call)
        3. **Introductory Activity ("${letsGetStartedLabel}"):** (Handled by 'LetsGetStarted' call)
        4. **Core Content Sections:** (Handled by 'CoreContentPage' calls)
        5. **Check for Understanding ("${checkUnderstandingLabel}"):** (Handled by 'CheckForUnderstanding' call)
        6. **Summary ("${lessonSummaryLabel}"):** (Handled by 'LessonSummary' call)
        7. **Conclusion ("${wrapUpLabel}"):** (Handled by 'WrapUp' call)
        8. **Assessment ("${endOfLessonAssessmentLabel}"):** (Handled by 'EndofLessonAssessment' call)
        9. **Answer Key ("${answerKeyLabel}"):** (Handled by 'AnswerKey' call)
        10. **References ("${referencesLabel}"):** (Handled by 'References' call)
    `;

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
        
        **ABSOLUTE RULE FOR SVG DIAGRAMS (NON-NEGOTIABLE):**
        - The page 'type' MUST be **"svg"**.
        - The 'content' MUST be a string containing the SVG code.
        - All styles MUST be inline attributes.
    `;

    return { masterInstructions, styleRules };
};

// --- This is the "Orchestrator" ---
export default function GenerationScreen({ 
    subject, 
    unit, 
    guideData, 
    initialLessonPlan, 
    existingLessons, 
    startLessonNumber, 
    onGenerationComplete, 
    onBack 
}) {
    const { showToast } = useToast();
    const [lessonProgress, setLessonProgress] = useState({ current: 0, total: 0 });
    const [currentLessonPlan, setCurrentLessonPlan] = useState(initialLessonPlan);
    const [currentLessons, setCurrentLessons] = useState(existingLessons || []);
    
    const isMounted = useRef(false);
    const abortControllerRef = useRef(null);

    const findSummaryContent = (lesson) => {
        if (!lesson || !lesson.pages) return "No summary available.";
        const lessonSummaryLabel = guideData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
        const summaryPage = lesson.pages.find(p => p.title === lessonSummaryLabel);
        return summaryPage ? summaryPage.content : "Summary page not found.";
    };

    /**
     * --- Orchestrator Loop ---
     */
    const runGenerationLoop = useCallback(async () => {
        const controller = new AbortController();
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = controller;
        const signal = controller.signal;

        let plans = currentLessonPlan;
        let lessonsSoFar = [...currentLessons];

        try {
            // --- STEP 1: Planner ---
            if (!plans) {
                showToast("Generating lesson plan...", "info");
                setLessonProgress({ current: 0, total: guideData.lessonCount });
                
                const existingSubjectContext = "No existing content found.";
                const baseContext = getBasePromptContext(guideData, existingSubjectContext);
                const plannerPrompt = getPlannerPrompt(guideData, baseContext);

                // Initial safety delay
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);

                const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt, { signal });
                if (!isMounted.current || signal.aborted) return; 

                const parsedPlan = sanitizeJsonBlock(plannerResponse); 
                
                if (!parsedPlan || parsedPlan.length === 0) {
                    throw new Error("The AI failed to create a lesson plan.");
                }
                
                plans = parsedPlan;
                setCurrentLessonPlan(plans);
            }

            const { masterInstructions, styleRules } = await getMasterInstructions(guideData);
            if (!isMounted.current || signal.aborted) return;

            // --- STEP 2: Orchestrator ---
            const lessonsToProcess = plans.slice(startLessonNumber - 1);
            setLessonProgress({ current: startLessonNumber - 1, total: plans.length });

            for (const [index, plan] of lessonsToProcess.entries()) {
                if (!isMounted.current || signal.aborted) return; 

                const currentLessonIndex = (startLessonNumber - 1) + index;
                setLessonProgress({ current: currentLessonIndex + 1, total: plans.length });
                showToast(`Generating Lesson ${currentLessonIndex + 1} of ${plans.length}: "${plan.lessonTitle}"...`, "info", 10000);

                const previousLessonsContext = lessonsSoFar
                    .map((lesson, idx) => `Lesson ${idx + 1}: "${lesson.lessonTitle}"\nSummary: ${findSummaryContent(lesson)}`)
                    .join('\n---\n');
                
                const existingSubjectContext = "No existing content found.";
                const baseContext = getBasePromptContext(guideData, existingSubjectContext);
                
                baseContext.scaffoldingInstruction = `
                    ${baseContext.scaffoldingInstruction}

                    **3. Lessons Just Generated in this Session:**
                    ${previousLessonsContext || "No other lessons have been generated in this session."}
                `;
                
                let newLesson = {
                    lessonTitle: `Lesson ${currentLessonIndex + 1}: ${plan.lessonTitle.replace(/^Lesson\s*\d*:\s*/i, '')}`,
                    pages: [],
                    learningObjectives: [],
                    assignedCompetencies: []
                };

                // --- 1. Objectives ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const objectivesData = await generateLessonComponent(guideData, baseContext, plan, 'objectives', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.learningObjectives = objectivesData.objectives;

                // --- 2. Competencies ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const competenciesData = await generateLessonComponent(guideData, baseContext, plan, 'competencies', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.assignedCompetencies = competenciesData.competencies;
                
                // --- 3. Intro ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const introData = await generateLessonComponent(guideData, baseContext, plan, 'Introduction', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.pages.push(introData.page);
                const introContent = introData.page.content;

                // --- 4. Activity ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const activityData = await generateLessonComponent(
                    guideData, 
                    baseContext, 
                    plan, 
                    'LetsGetStarted', 
                    isMounted, 
                    masterInstructions, 
                    styleRules, 
                    { introContent: introContent },
                    3,
                    signal
                );
                newLesson.pages.push(activityData.page);
                const activityContent = activityData.page.content;

                // --- 5. Content Planner ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const contentPlannerData = await generateLessonComponent(guideData, baseContext, plan, 'CoreContentPlanner', isMounted, masterInstructions, styleRules, {}, 3, signal);
                const contentPlanTitles = contentPlannerData.coreContentTitles || [];
                
                // --- 6. Core Content Pages ---
                let previousPageContent = null; 

                for (const [contentIndex, contentTitle] of contentPlanTitles.entries()) {
                    if (!isMounted.current || signal.aborted) return;
                    
                    let extraContext = { 
                        contentTitle: contentTitle,
                        allContentTitles: contentPlanTitles,
                        currentIndex: contentIndex
                    };

                    if (contentIndex === 0) {
                        extraContext.introContent = introContent;
                        extraContext.activityContent = activityContent;
                    } else {
                        extraContext.previousPageContent = previousPageContent;
                    }

                    await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                    const contentPageData = await generateLessonComponent(
                        guideData, 
                        baseContext, 
                        plan, 
                        'CoreContentPage', 
                        isMounted, 
                        masterInstructions, 
                        styleRules, 
                        extraContext,
                        3,
                        signal
                    );
                    newLesson.pages.push(contentPageData.page);
                    previousPageContent = contentPageData.page.content;
                }
                
                // --- 7. Standard Pages ---
                const standardPages = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
                for (const pageType of standardPages) {
                    if (!isMounted.current || signal.aborted) return;
                    await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                    const pageData = await generateLessonComponent(guideData, baseContext, plan, pageType, isMounted, masterInstructions, styleRules, {}, 3, signal);
                    if (pageData && pageData.page) {
                        newLesson.pages.push(pageData.page);
                    }
                }
                
                lessonsSoFar.push(newLesson);
                setCurrentLessons([...lessonsSoFar]);
            }
        
            if (!isMounted.current || signal.aborted) return;

            onGenerationComplete({ previewData: { generated_lessons: lessonsSoFar }, failedLessonNumber: null, lessonPlan: plans });
            showToast("All lessons generated successfully!", "success");

        } catch (err) {
            // FIX: Robust check for abort errors (case insensitive)
            if (!isMounted.current || err.name === 'AbortError' || (err.message && err.message.toLowerCase().includes("aborted"))) {
                console.log("Generation loop aborted by user.");
                return;
            }

            const failedLessonNum = lessonsSoFar.length + 1;
            console.error(`Error during generation of Lesson ${failedLessonNum}:`, err);
            const userFriendlyError = `Failed to generate Lesson ${failedLessonNum}. You can try to continue the generation.`;
            showToast(userFriendlyError, "error", 15000);
            onGenerationComplete({ previewData: { generated_lessons: lessonsSoFar }, failedLessonNumber: failedLessonNum, lessonPlan: plans });
        }
    }, [guideData, startLessonNumber, currentLessonPlan, currentLessons, onGenerationComplete, showToast]);


    useEffect(() => {
        isMounted.current = true;
        runGenerationLoop();
        
        return () => {
            isMounted.current = false;
            // Abort any active requests when the component unmounts
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl">
            <header className="flex-shrink-0 p-6">
                 <button 
                    onClick={onBack} 
                    className="inline-flex items-center justify-center px-4 py-2 bg-slate-200 text-sm font-medium text-slate-700 rounded-xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-sky-500
                               dark:bg-neumorphic-base-dark dark:text-slate-300 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark dark:focus:ring-offset-neumorphic-base-dark"
                 >
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
                    Back to Topic
                </button>
            </header>
            <main className="flex-grow">
                <InteractiveLoadingScreen 
                    topic={guideData.content || "new ideas"}
                    isSaving={false}
                    lessonProgress={lessonProgress}
                />
            </main>
        </div>
    );
}