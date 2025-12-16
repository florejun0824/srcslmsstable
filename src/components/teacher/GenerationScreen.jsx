import React, { useEffect, useState, useCallback, useRef } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';

// --- CONFIGURATION ---
// Gemma-3-27b has a 15k TPM limit. 
// Set to 20 seconds to safely allow for long/complex prompts without hitting the limit.
const GEMMA_SAFETY_DELAY_MS = 20000; 

/**
 * --- Helper: Smart Delay ---
 * Delays execution but can be aborted if the user closes the modal
 */
const smartDelay = async (ms, signal) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(new Error("Aborted delay"));
            });
        }
    });
};

/**
 * --- Micro-Worker Sanitizer (Robust Version) ---
 * This function can find the true, complete JSON object even if
 * the AI response is truncated or includes other text.
 */
const sanitizeJsonComponent = (aiResponse) => {
    try {
        let jsonString = aiResponse;

        // 1. Try to find a JSON block wrapped in markdown backticks
        const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
        if (markdownMatch && markdownMatch[2]) {
            jsonString = markdownMatch[2];
        }

        // 2. Find the first opening brace
        const startIndex = jsonString.indexOf('{');
        if (startIndex === -1) {
            throw new Error('No valid JSON object ({...}) found in AI response.');
        }

        let depth = 0;
        let inString = false;
        let escape = false;
        let endIndex = -1;

        // 3. Iterate from the first brace to find its matching closer
        for (let i = startIndex; i < jsonString.length; i++) {
            const char = jsonString[i];

            if (escape) {
                escape = false;
                continue;
            }

            if (char === '\\') {
                escape = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
            }

            if (inString) {
                continue;
            }

            if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
                if (depth === 0) {
                    endIndex = i;
                    break;
                }
            }
        }

        if (endIndex === -1) {
            throw new Error('JSON object is incomplete or truncated.');
        }

        // 4. Extract and fix newlines
        const validJsonString = jsonString.substring(startIndex, endIndex + 1)
            .replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");

        return JSON.parse(validJsonString);

    } catch (error) {
        console.error("sanitizeJsonComponent error:", error.message, aiResponse.substring(0, 500));
        throw new Error(`The AI component response was not valid JSON. Preview: ${aiResponse.substring(0, 150)}`);
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
        
        ---
        **PREVIOUSLY COVERED MATERIAL:**
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
    3.  **Titles:** Lesson titles must be formal, academic, and descriptive.
    4.  **Summaries:** Provide a 1-2 sentence summary for *each* lesson you plan.

    **CRITICAL QUOTE ESCAPING:** All double quotes (") inside string values MUST be escaped (\\").

    =============================
    JSON OUTPUT FORMAT (PLAN ONLY)
    =============================
    {
      "lessons": [
        {
          "lessonTitle": "Lesson 1: [Proposed Title]",
          "summary": "A 1-2 sentence summary."
        }
      ]
    }
    `;
};

/**
 * --- Micro-Worker Prompt Generator (Optimized for Tokens) ---
 */
const getComponentPrompt = (guideData, baseContext, lessonPlan, componentType, styleRules, extraData = {}) => {
    const { languageAndGradeInstruction, perspectiveInstruction, scaffoldingInstruction, standardsInstruction } = baseContext;
    
    // Labels
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
    You are an expert curriculum designer.
    ${languageAndGradeInstruction}
    ${perspectiveInstruction}
    
    **LESSON CONTEXT:**
    - **Topic:** ${guideData.content}
    - **Focus:** ${lessonPlan.summary}
    `;

    switch (componentType) {
        case 'objectives':
            taskInstruction = `Generate 3-5 specific, measurable learning objectives based on: "${lessonPlan.summary}"`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "objectives": [\n    "Objective 1...",\n    "Objective 2..."\n  ]\n}`;
            break;
        
        case 'competencies':
            taskInstruction = `Select 1-3 competencies from the Master List that are addressed by: "${lessonPlan.summary}"`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "competencies": [\n    "Competency 1...",\n    "Competency 2..."\n  ]\n}`;
            break;

        case 'Introduction':
            taskInstruction = 'Generate the "Engaging Introduction" page. It MUST have a thematic, captivating subheader title.';
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "A Captivating Thematic Title",\n    "content": "Engaging intro markdown..."\n  }\n}`;
            break;
        
        case 'LetsGetStarted':
            const introPreview = extraData.introContent ? "..." + extraData.introContent.slice(-300) : "N/A";
            taskInstruction = `
            **PREVIOUS CONTEXT:** User just read this Intro: "${introPreview}"
            **TASK:** Generate the "${letsGetStartedLabel}" warm-up activity. It must flow from that Intro.
            `;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${letsGetStartedLabel}",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
            break;

        case 'CoreContentPlanner':
            taskInstruction = `Analyze the lesson focus: "${lessonPlan.summary}".
            **TASK:** Break this topic into **page-sized sub-topics**.
            **RULES:**
            1. If the topic is complex, split it (e.g., "Page 1: The Concept", "Page 2: The Application").
            2. Aim for 2-5 pages max.
            3. Do NOT include "Introduction" or "Summary".`;
            
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "coreContentTitles": [\n    "Sub-Topic 1",\n    "Sub-Topic 2"\n  ]\n}`;
            break;

        case 'CoreContentPage':
            const allTitles = extraData.allContentTitles || [extraData.contentTitle];
            const currentIndex = extraData.currentIndex !== undefined ? extraData.currentIndex : 0;
            const currentTitle = extraData.contentTitle;

            // --- OPTIMIZED CONTEXT: STRICT TOKEN SAVING ---
            let previousContentInstruction = '';
            if (currentIndex > 0) {
                 // Truncate previous content to last 400 chars to save tokens
                 const prevPreview = extraData.previousPageContent 
                    ? "..." + extraData.previousPageContent.slice(-400) 
                    : "N/A";
                 
                 previousContentInstruction = `
                 **PREVIOUS PAGE ENDED WITH:** "${prevPreview}"
                 **CONNECT:** Continue the narrative flow from there.`;
            }

            taskInstruction = `Generate content for Page ${currentIndex + 1}: "${currentTitle}".
            ${previousContentInstruction}
            
            **REQUIREMENTS:**
            1. **Length:** Write exactly 3-4 paragraphs (approx 300-400 words). Do NOT write a 2000-word essay.
            2. **Format:** Use standard markdown. Include ONE interactive blockquote.
            3. **Focus:** Teach "${currentTitle}" clearly and concisely.`;
            
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${currentTitle}",\n    "content": "Markdown content..."\n  }\n}`;
            break;
        
        case 'CheckForUnderstanding':
            taskInstruction = `Generate "${checkUnderstandingLabel}". 3-4 concept questions based on the lesson.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${checkUnderstandingLabel}",\n    "content": "1. Question 1...\n2. Question 2..."\n  }\n}`;
            break;

        case 'LessonSummary':
            taskInstruction = `Generate "${lessonSummaryLabel}". Concise recap.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${lessonSummaryLabel}",\n    "content": "Recap..."\n  }\n}`;
            break;
        
        case 'WrapUp':
            taskInstruction = `Generate "${wrapUpLabel}". Motivational closure.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${wrapUpLabel}",\n    "content": "Closure..."\n  }\n}`;
            break;

        case 'EndofLessonAssessment':
            taskInstruction = `Generate "${endOfLessonAssessmentLabel}". 5-8 mixed questions.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${endOfLessonAssessmentLabel}",\n    "content": "Questions..."\n  }\n}`;
            break;

        case 'AnswerKey':
            taskInstruction = `Generate "${answerKeyLabel}". Answers to the assessment.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${answerKeyLabel}",\n    "content": "Answers..."\n  }\n}`;
            break;

        case 'References':
            taskInstruction = `Generate "${referencesLabel}". Academic references.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${referencesLabel}",\n    "content": "- Source 1..."\n  }\n}`;
            break;

        default:
             taskInstruction = `Generate the ${componentType} section.`;
             jsonFormat = `{\n  "page": {\n    "title": "${componentType}",\n    "content": "Content..."\n  }\n}`;
    }

    return `
    ${commonHeader}
    ${taskInstruction}
    ${styleRules}
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
    MASTER INSTRUCTION SET
    =============================
    ${masterInstructions}
    `;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");

        try {
            const aiResponse = await callGeminiWithLimitCheck(finalPrompt, { signal });

            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");
            
            const jsonData = sanitizeJsonComponent(aiResponse);

            // Minimal safety pause between retries if needed
            await new Promise(res => setTimeout(res, 1000));
            
            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");

            return jsonData;

        } catch (error) {
            if (error.name === 'AbortError' || (signal && signal.aborted)) {
                throw new Error("Generation aborted by user.");
            }
            if (!isMounted.current) throw new Error("Generation aborted by user.");

            console.warn(
                `Attempt ${attempt + 1} of ${maxRetries} failed for component: ${componentType}`,
                error.message
            );
            
            if (attempt === maxRetries - 1) {
                throw new Error(`Failed to generate component ${componentType} after ${maxRetries} attempts: ${error.message}`);
            }

            await new Promise(res => setTimeout(res, 5000));
        }
    }
};

/**
 * --- Master Instructions Function ---
 */
const getMasterInstructions = async (guideData) => {
    const referencesLabel = guideData.language === 'Filipino' ? 'Mga Sanggunian' : "References";
    const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
    
    let perspectiveInstruction = '';
    if (catholicSubjects.includes(guideData.subjectName)) {
        perspectiveInstruction = `
            **CRITICAL PERSPECTIVE:** Catholic perspective is mandatory.
            **SOURCES:** Prioritize CCC, Youcat, and Encyclicals.
        `;
    }

    const masterInstructions = `
        **Persona:** University professor and bestselling author.
        **Audience:** Grade ${guideData.gradeLevel}.
        ${perspectiveInstruction}
        **Interactivity:** Embed small blockquotes (\`> Think About It\`) in the text.
    `;

    const styleRules = `
        **FORMATTING:** No code blocks for regular text. Use double asterisks for bold.
        **LATEX:** Use $...$ for inline and $$...$$ for block formulas. Escape backslashes (\\\\).
        **SVG:** If a diagram is needed, provide valid SVG code in the 'content'.
    `;

    return { masterInstructions, styleRules };
};

// --- The Orchestrator ---
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
    
    // Using Ref to hold state during the async loop to avoid stale closures
    const stateRef = useRef({
        plans: initialLessonPlan,
        lessonsSoFar: existingLessons || []
    });
    
    // Force re-render when we update the ref-based lists if needed for UI
    const [, setTick] = useState(0);

    const isMounted = useRef(false);
    const abortControllerRef = useRef(null);

    const findSummaryContent = (lesson) => {
        if (!lesson || !lesson.pages) return "No summary available.";
        const lessonSummaryLabel = guideData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
        const summaryPage = lesson.pages.find(p => p.title === lessonSummaryLabel);
        return summaryPage ? summaryPage.content : "Summary page not found.";
    };

	const runGenerationLoop = useCallback(async () => {
	        const controller = new AbortController();
	        if (abortControllerRef.current) abortControllerRef.current.abort();
	        abortControllerRef.current = controller;
	        const signal = controller.signal;

	        try {
	            // --- STEP 1: Planner ---
	            if (!stateRef.current.plans) {
	                showToast("Generating lesson plan...", "info");
	                setLessonProgress({ current: 0, total: guideData.lessonCount });
                
	                const existingSubjectContext = "No existing content found.";
	                const baseContext = getBasePromptContext(guideData, existingSubjectContext);
	                const plannerPrompt = getPlannerPrompt(guideData, baseContext);

	                const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt, { signal });
	                if (signal.aborted) return; 

	                const parsedPlan = sanitizeJsonBlock(plannerResponse); 
	                stateRef.current.plans = parsedPlan;
	                setTick(t => t + 1);
	            }

	            const { masterInstructions, styleRules } = await getMasterInstructions(guideData);
	            if (signal.aborted) return;

	            const plans = stateRef.current.plans;
	            const lessonsToProcess = plans.slice(startLessonNumber - 1);
	            setLessonProgress({ current: startLessonNumber - 1, total: plans.length });

	            for (const [index, plan] of lessonsToProcess.entries()) {
	                if (signal.aborted) return; 

	                const currentLessonIndex = (startLessonNumber - 1) + index;
	                setLessonProgress({ current: currentLessonIndex + 1, total: plans.length });

	                // --- HEAVY DELAY BEFORE LESSON START ---
	                if (index > 0) { 
	                    showToast("Cooling down AI (Lesson Break)...", "info", 3000);
	                    await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
	                }

	                showToast(`Generating Lesson ${currentLessonIndex + 1}...`, "info", 5000);

	                let newLesson = {
	                    lessonTitle: plan.lessonTitle,
	                    pages: [],
	                    learningObjectives: [],
	                    assignedCompetencies: []
	                };

	                const baseContext = getBasePromptContext(guideData, "...");

	                // 1. Objectives (Wait first)
	                await smartDelay(5000, signal); 
	                const objectivesData = await generateLessonComponent(guideData, baseContext, plan, 'objectives', isMounted, masterInstructions, styleRules, {}, 3, signal);
	                newLesson.learningObjectives = objectivesData.objectives;

	                // 2. Competencies (Wait first - NO BURSTING)
	                await smartDelay(5000, signal);
	                const competenciesData = await generateLessonComponent(guideData, baseContext, plan, 'competencies', isMounted, masterInstructions, styleRules, {}, 3, signal);
	                newLesson.assignedCompetencies = competenciesData.competencies;
                
	                // 3. Intro (Wait first)
	                await smartDelay(5000, signal);
	                const introData = await generateLessonComponent(guideData, baseContext, plan, 'Introduction', isMounted, masterInstructions, styleRules, {}, 3, signal);
	                newLesson.pages.push(introData.page);
                
	                // 4. Activity (Wait first)
	                await smartDelay(5000, signal);
	                const activityData = await generateLessonComponent(
	                    guideData, baseContext, plan, 'LetsGetStarted', isMounted, masterInstructions, styleRules, 
	                    { introContent: introData.page.content }, 3, signal
	                );
	                newLesson.pages.push(activityData.page);
                
	                // 5. Planner (Wait first - Critical, this context is heavy)
	                await smartDelay(8000, signal);
	                const contentPlannerData = await generateLessonComponent(guideData, baseContext, plan, 'CoreContentPlanner', isMounted, masterInstructions, styleRules, {}, 3, signal);
	                const contentPlanTitles = contentPlannerData.coreContentTitles || [];
                
	                // 6. Content Pages (The Heavy Loop)
	                let previousPageContent = ""; 
	                for (const [contentIndex, contentTitle] of contentPlanTitles.entries()) {
	                    if (signal.aborted) return;
                    
	                    // HEAVY DELAY (20s) because these generate long text + use long context
	                    showToast(`Writing page ${contentIndex + 1}/${contentPlanTitles.length}...`, "info", 2000);
	                    await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                    
	                    const contentPageData = await generateLessonComponent(
	                        guideData, baseContext, plan, 'CoreContentPage', isMounted, masterInstructions, styleRules, 
	                        { 
	                            contentTitle,
	                            allContentTitles: contentPlanTitles,
	                            currentIndex: contentIndex,
	                            previousPageContent: previousPageContent
	                        },
	                        3, signal
	                    );
	                    newLesson.pages.push(contentPageData.page);
	                    previousPageContent = contentPageData.page.content;
	                }
                
	                // 7. Standard Pages (Throttle these too!)
	                const standardPages = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
	                for (const pageType of standardPages) {
	                    if (signal.aborted) return;
                    
	                    // 6s Delay between these small components ensures we drain the bucket slowly
	                    await smartDelay(6000, signal); 

	                    const pageData = await generateLessonComponent(guideData, baseContext, plan, pageType, isMounted, masterInstructions, styleRules, {}, 3, signal);
	                    if (pageData && pageData.page) {
	                        newLesson.pages.push(pageData.page);
	                    }
	                }
                
	                stateRef.current.lessonsSoFar.push(newLesson);
	                setTick(t => t + 1);
	            }
        
	            if (signal.aborted) return;
	            onGenerationComplete({ 
	                previewData: { generated_lessons: stateRef.current.lessonsSoFar }, 
	                failedLessonNumber: null, 
	                lessonPlan: stateRef.current.plans 
	            });
	            showToast("Success!", "success");

	        } catch (err) {
	            // ... (Error handling remains same)
	             if (err.name === 'AbortError' || (err.message && err.message.includes("aborted"))) return;
	             console.error(err);
	             showToast("Generation failed due to limits. Try again later.", "error");
	        }
	    }, [guideData, startLessonNumber, onGenerationComplete, showToast]);

    useEffect(() => {
        isMounted.current = true;
        runGenerationLoop();
        
        return () => {
            isMounted.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [runGenerationLoop]);

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