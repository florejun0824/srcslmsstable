import React, { useEffect, useState, useCallback, useRef } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';

// --- CONFIGURATION ---
// 4000ms (4 seconds): The sweet spot for OpenRouter free tiers. 
// Fast enough for good UX, but prevents bursting limits across multiple users.
const AI_RATE_LIMIT_DELAY_MS = 4000; 

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
                const abortError = new Error("Aborted delay");
                abortError.name = "AbortError";
                reject(abortError);
            });
        }
    });
};

/**
 * --- Micro-Worker Sanitizer (Bulletproof Version v2) ---
 * Aggressively fixes common AI JSON errors, strips control characters,
 * and handles fallbacks dynamically based on the expected component type.
 */
const sanitizeJsonComponent = (aiResponse) => {
    let jsonString = aiResponse;

    try {
        // 1. Extract JSON block if wrapped in markdown
        // We use Hex codes for backticks (\x60) so it doesn't break the chat window
        const mdRegex = new RegExp("\\x60\\x60\\x60(?:json)?\\s*([\\s\\S]*?)\\s*\\x60\\x60\\x60");
        const markdownMatch = aiResponse.match(mdRegex);
        
        if (markdownMatch && markdownMatch[1]) {
            jsonString = markdownMatch[1];
        } else {
            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                jsonString = jsonString.substring(startIndex, endIndex + 1);
            }
        }

        // 2. CRITICAL: Strip literal control characters (newlines, tabs) that break JSON.parse
        let cleanString = jsonString.replace(/[\u0000-\u001F]+/g, " ");
        
        // 3. Fix invalid backslashes (excluding legitimate escapes)
        cleanString = cleanString.replace(/\\(?![/u"\\bfnrt])/g, "\\\\");

        return JSON.parse(cleanString);

    } catch (parseError) {
        console.warn("JSON.parse failed, attempting Smart Regex Fallbacks...", parseError.message);

        try {
            // Fallback for Objectives
            if (aiResponse.includes('"objectives"')) {
                const matches = [...aiResponse.matchAll(/"([^"]+)"/g)]
                    .map(m => m[1])
                    .filter(m => m !== "objectives" && m.length > 5);
                return { objectives: matches.length > 0 ? matches : ["Understand the core concepts of the lesson."] };
            }
            
            // Fallback for Competencies
            if (aiResponse.includes('"competencies"')) {
                 const matches = [...aiResponse.matchAll(/"([^"]+)"/g)]
                    .map(m => m[1])
                    .filter(m => m !== "competencies" && m.length > 5);
                 return { competencies: matches.length > 0 ? matches : ["Aligned with standard competencies."] };
            }

            // Fallback for Core Content Planner
            if (aiResponse.includes('"coreContentTitles"')) {
                const matches = [...aiResponse.matchAll(/"([^"]+)"/g)]
                   .map(m => m[1])
                   .filter(m => m !== "coreContentTitles");
                return { coreContentTitles: matches.length > 0 ? matches : ["Core Concept 1", "Core Concept 2"] };
           }

            // Fallback for Standard Pages
            const titleMatch = aiResponse.match(/"title"\s*:\s*"([^"]*?)"/);
            const title = titleMatch ? titleMatch[1] : "Generated Page";

            const contentMatch = aiResponse.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*\}|\s*,)/);
            let content = contentMatch ? contentMatch[1] : "Content could not be parsed properly.";

            content = content
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');

            return { page: { title, content } };

        } catch (extractError) {
            console.error("Critical: Total failure to sanitize JSON.", aiResponse.substring(0, 200));
            return {
                page: {
                    title: "Generation Error",
                    content: `The AI generated content that could not be processed.\n\nPreview:\n${aiResponse.substring(0, 300)}`
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
    - **Context:** Philippines K-12 Curriculum (DepEd MATATAG Standards).
    - **Grade Level:** Grade ${guideData.gradeLevel}. Ensure content aligns with the specific learning competencies for this grade level in the Philippines.
    - **Localization:** Use Filipino names (e.g., Juan, Maria), local currency (PHP/Pesos), and local examples (e.g., jeepneys, barangays) in all examples and word problems.
    - **Language:** The entire output MUST be written in **${guideData.language}**.
    ${guideData.language === 'Filipino' ? `
    - **CRITICAL FILIPINO LANGUAGE RULE:** Use formal, academic Filipino (Wikang Pambansa). Avoid colloquial "Taglish" unless explicitly framing it as informal dialogue.` : ''}
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

            **CRITICAL PEDAGOGY (PHILIPPINES 4A's):**
            - **Analysis & Abstraction:** After presenting facts, explicitly explain *why* this concept matters to a Filipino student.
            - **Application:** Connect the concept to a local real-life scenario (e.g., "In your barangay...", "When you buy from the sari-sari store...").

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
            if (error.name === 'AbortError' || (signal && signal.aborted) || (error.message && error.message.toLowerCase().includes("aborted"))) {
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
const getMasterInstructions = async (guideData, apiKey) => {
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
        
**CRITICAL INSTRUCTION FOR IMAGES (NON-NEGOTIABLE):**
        - You MUST embed one highly relevant image at the top of "Introduction" and "Core Content" pages.
        - You MUST use the following URL format exactly:
        - Format: ![Description](https://gen.pollinations.ai/image/[prompt]?width=800&height=400&nologo=true&model=flux&key=${apiKey})
        - **IMPORTANT:** Notice the **&model=flux** parameter. This is required for your API key.
        - **IMPORTANT:** You MUST replace all spaces in your image prompt with %20.
        - Example: ![A busy marketplace](https://gen.pollinations.ai/image/a%20busy%20filipino%20marketplace%20realistic%20photo?width=800&height=400&nologo=true&model=flux&key=${apiKey})

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


/**
 * --- MAIN COMPONENT (Ultra Premium Lite) ---
 */
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
    // Safely retrieve the API key depending on the build tool (Vite vs CRA)
    const POLLINATIONS_API_KEY = (import.meta && import.meta.env && import.meta.env.VITE_POLLINATIONS_API_KEY) 
        || process.env.REACT_APP_POLLINATIONS_API_KEY 
        || 'YOUR_API_KEY_MISSING';

    const { showToast } = useToast();
    
    // FIX: Initialize total to guideData.lessonCount or 1 immediately to prevent framer-motion NaN% errors
    const [lessonProgress, setLessonProgress] = useState({ 
        current: startLessonNumber - 1, 
        total: guideData.lessonCount || 1 
    });

    const [currentLessonPlan, setCurrentLessonPlan] = useState(initialLessonPlan);
    const [currentLessons, setCurrentLessons] = useState(existingLessons || []);
    
    const isMounted = useRef(false);
    const abortControllerRef = useRef(null);
    const hasStartedRef = useRef(false); // Prevents strict-mode double firing

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
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

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
                setLessonProgress({ current: 0, total: guideData.lessonCount || 1 });
                
                const existingSubjectContext = "No existing content found.";
                const baseContext = getBasePromptContext(guideData, existingSubjectContext);
                const plannerPrompt = getPlannerPrompt(guideData, baseContext);

                await smartDelay(1000, signal);

                const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt, { signal });
                if (!isMounted.current || signal.aborted) return; 

                const parsedPlan = sanitizeJsonBlock(plannerResponse); 
                
                if (!parsedPlan || parsedPlan.length === 0) {
                    throw new Error("The AI failed to create a lesson plan.");
                }
                
                plans = parsedPlan;
                setCurrentLessonPlan(plans);
                setLessonProgress(prev => ({ ...prev, total: plans.length }));
            }

            // Passing the API Key to the Master Instructions
            const { masterInstructions, styleRules } = await getMasterInstructions(guideData, POLLINATIONS_API_KEY);
            if (!isMounted.current || signal.aborted) return;

            // --- STEP 2: Orchestrator ---
            const lessonsToProcess = plans.slice(startLessonNumber - 1);

            for (const [index, plan] of lessonsToProcess.entries()) {
                if (!isMounted.current || signal.aborted) return; 

                const currentLessonIndex = (startLessonNumber - 1) + index;
                setLessonProgress({ current: currentLessonIndex, total: plans.length });
                showToast(`Generating Lesson ${currentLessonIndex + 1} of ${plans.length}: "${plan.lessonTitle}"...`, "info", 5000);

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

                // --- CHUNKED PARALLEL ARCHITECTURE ---

                // Stage 1: Objectives (Foundation)
                await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                const objectivesData = await generateLessonComponent(guideData, baseContext, plan, 'objectives', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.learningObjectives = objectivesData.objectives || [];

                // Inject Objectives into Context
                const enrichedContext = {
                    ...baseContext,
                    scaffoldingInstruction: baseContext.scaffoldingInstruction + `\n**TARGET OBJECTIVES:** ${newLesson.learningObjectives.join(', ')}`
                };

                // Stage 2: Sibling Nodes (Max 2 Concurrent)
                await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                const [compData, introData] = await Promise.all([
                    generateLessonComponent(guideData, enrichedContext, plan, 'competencies', isMounted, masterInstructions, styleRules, {}, 3, signal),
                    generateLessonComponent(guideData, enrichedContext, plan, 'Introduction', isMounted, masterInstructions, styleRules, {}, 3, signal)
                ]);
                newLesson.assignedCompetencies = compData.competencies || [];
                newLesson.pages.push(introData.page);
                const introContent = introData.page.content;

                // Stage 3: Activity (Sequential)
                await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                const activityData = await generateLessonComponent(
                    guideData, enrichedContext, plan, 'LetsGetStarted', isMounted, masterInstructions, styleRules, { introContent: introContent }, 3, signal
                );
                newLesson.pages.push(activityData.page);
                const activityContent = activityData.page.content;

                // Stage 4: Content Planner
                await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                const contentPlannerData = await generateLessonComponent(guideData, enrichedContext, plan, 'CoreContentPlanner', isMounted, masterInstructions, styleRules, {}, 3, signal);
                const contentPlanTitles = contentPlannerData.coreContentTitles || [];
                
                // Stage 5: Core Content Pages (Sequential)
                let previousPageContent = null; 
                for (const [contentIndex, contentTitle] of contentPlanTitles.entries()) {
                    if (!isMounted.current || signal.aborted) return;
                    
                    let extraContext = { contentTitle, allContentTitles: contentPlanTitles, currentIndex: contentIndex };
                    if (contentIndex === 0) {
                        extraContext.introContent = introContent;
                        extraContext.activityContent = activityContent;
                    } else {
                        extraContext.previousPageContent = previousPageContent;
                    }

                    await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                    const contentPageData = await generateLessonComponent(guideData, enrichedContext, plan, 'CoreContentPage', isMounted, masterInstructions, styleRules, extraContext, 3, signal);
                    newLesson.pages.push(contentPageData.page);
                    previousPageContent = contentPageData.page.content;
                }
                
                // Stage 6: Standard Pages (Batched Parallel, Max 3 Concurrent)
                const stdBatch1 = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp'];
                const stdBatch2 = ['EndofLessonAssessment', 'AnswerKey', 'References'];
                
                await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                const b1Data = await Promise.all(stdBatch1.map(t => generateLessonComponent(guideData, enrichedContext, plan, t, isMounted, masterInstructions, styleRules, {}, 3, signal)));
                b1Data.forEach(d => { if(d && d.page) newLesson.pages.push(d.page); });

                await smartDelay(AI_RATE_LIMIT_DELAY_MS, signal);
                const b2Data = await Promise.all(stdBatch2.map(t => generateLessonComponent(guideData, enrichedContext, plan, t, isMounted, masterInstructions, styleRules, {}, 3, signal)));
                b2Data.forEach(d => { if(d && d.page) newLesson.pages.push(d.page); });
                
                lessonsSoFar.push(newLesson);
                setCurrentLessons([...lessonsSoFar]);
            }
        
            if (!isMounted.current || signal.aborted) return;

            onGenerationComplete({ previewData: { generated_lessons: lessonsSoFar }, failedLessonNumber: null, lessonPlan: plans });
            showToast("Curriculum constructed successfully!", "success");

		} catch (err) {
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
		    // eslint-disable-next-line react-hooks/exhaustive-deps
		    }, []); // <--- CHANGE THIS LINE TO BE COMPLETELY EMPTY

	useEffect(() => {
	        isMounted.current = true;
	        runGenerationLoop();
        
	        return () => {
	            isMounted.current = false;
	            hasStartedRef.current = false; // <-- ADD THIS LINE
	            if (abortControllerRef.current) {
	                abortControllerRef.current.abort();
	            }
	        };
        
	    }, [runGenerationLoop]);

    return (
        <div className="relative flex flex-col h-full bg-slate-50 dark:bg-slate-950 rounded-[32px] overflow-hidden border border-slate-200/50 dark:border-white/10 selection:bg-indigo-500/30">
            {/* Ambient Background Decoration */}
            <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[100px]" />
            </div>

            {/* Premium Sticky Header */}
            <header className="relative z-20 flex-shrink-0 px-6 py-4 md:py-6 border-b border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <button 
                            onClick={onBack}
                            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-[14px] md:rounded-[18px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90 shadow-inner"
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                                AI Architect
                            </h2>
                            <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] truncate">
                                Constructing Module {lessonProgress.current + 1}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/10 dark:bg-indigo-500/10 border border-indigo-600/20 dark:border-indigo-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 animate-pulse" />
                        <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                            {lessonProgress.current + 1} / {lessonProgress.total}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Interactive Space */}
            <main className="relative z-10 flex-grow flex flex-col min-h-0 overflow-hidden will-change-transform">
                <InteractiveLoadingScreen 
                    topic={guideData.content || "new ideas"}
                    isSaving={false}
                    lessonProgress={lessonProgress}
                />
            </main>
        </div>
    );
}