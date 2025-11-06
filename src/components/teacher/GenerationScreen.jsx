import React, { useEffect, useState, useCallback, useRef } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
// We need the *big* sanitizer for the Planner call
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText'; // Corrected path

/**
 * --- Micro-Worker Sanitizer ---
 * (This function is unchanged)
 */
const sanitizeJsonComponent = (aiResponse) => {
    try {
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
            throw new Error('No valid JSON object ({...}) found in AI response.');
        }
        const jsonString = aiResponse.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("sanitizeJsonComponent error:", error.message, "Preview:", aiResponse.substring(0, 300));
        throw new Error(`The AI component response was not valid JSON. Preview: ${aiResponse.substring(0, 150)}`);
    }
};

/**
 * --- Base Context Builder ---
 * (This function is unchanged)
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
        3.  **CREATE A BRIDGE:** Where appropriate, the introduction of your new lesson should briefly reference a concept from the prerequisite lessons to create a smooth transition, but it must immediately move into new, more advanced material.

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
 * (This function is unchanged)
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
    2.  **Logical Flow:** The lessons MUST be in a logical, scaffolded order. Lesson 2 must build on Lesson 1.
    3.  **Scaffolding:** Your plan MUST obey the "SCAFFOLDING TASK" and not repeat any topics from the "PREVIOUSLY COVERED MATERIAL."
    4.  **Titles:** Lesson titles must be formal, academic, and descriptive.
    5.  **Summaries:** Provide a 1-2 sentence summary for *each* lesson you plan, explaining what that specific part of the topic will cover.

    **CRITICAL QUOTE ESCAPING:** All double quotes (") inside string values MUST be escaped (\\").

    =============================
    JSON OUTPUT FORMAT (PLAN ONLY)
    =============================
    {
      "lessons": [
        {
          "lessonTitle": "Lesson 1: [Proposed Title for Lesson 1]",
          "summary": "A 1-2 sentence summary of what this specific lesson will cover."
        },
        {
          "lessonTitle": "Lesson 2: [Proposed Title for Lesson 2]",
          "summary": "A 1-2 sentence summary for the next lesson, building on the first."
        }
        // ... (exactly ${guideData.lessonCount} total items)
      ]
    }
    `;
};

/**
 * --- Micro-Worker Prompt Generator ---
 * (This function is unchanged)
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

    // styleRules is now passed in directly.

    switch (componentType) {
        case 'objectives':
            taskInstruction = `Generate 3-5 specific, measurable, and student-friendly learning objectives for this lesson. They must be based *only* on the lesson's focus: "${lessonPlan.summary}"`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "objectives": [\n    "Objective 1...",\n    "Objective 2..."\n  ]\n}`;
            break;
        
        case 'competencies':
            taskInstruction = `Analyze the "Learning Competencies (Master List)" from the context and select 1-3 competencies that are *directly* addressed by this specific lesson: "${lessonPlan.lessonTitle} - ${lessonPlan.summary}"`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "competencies": [\n    "Competency 1 from master list...",\n    "Competency 2 from master list..."\n  ]\n}`;
            break;

        case 'Introduction':
            taskInstruction = 'Generate the "Engaging Introduction" page. It MUST have a thematic, captivating subheader title. The content must hook attention for this specific lesson.';
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "A Captivating Thematic Title (NOT 'Introduction')",\n    "content": "Engaging intro markdown..."\n  }\n}`;
            break;
        
        case 'LetsGetStarted':
            taskInstruction = `Generate the "${letsGetStartedLabel}" page. This must be a short, simple, interactive warm-up activity relevant to this lesson.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${letsGetStartedLabel}",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
            break;

        case 'CoreContentPlanner':
            taskInstruction = `Analyze the focus for this lesson: "${lessonPlan.summary}".
            **CRITICAL CONTENT FIDELITY (NON-NEGOTIABLE):** Your task is to identify *all* the main sub-topics required to cover the *entire* content for this single lesson.
            - If the lesson's topic is simple, you might only return 1 or 2 titles.
            - If the lesson's topic is complex (e.g., "The Light-Dependent Reactions"), you MUST return as many titles as needed (e.g., "Capturing Light," "The Electron Transport Chain," "Creating ATP and NADPH") to cover it fully.
            - Do **NOT** include titles for "Introduction," "Warm-Up," "Summary," etc. Just the main, teachable content topics.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "coreContentTitles": [\n    "First Sub-Topic Title",\n    "Second Sub-Topic Title"\n    // ... (as many as necessary)
      ]\n}`;
            break;

        case 'CoreContentPage':
            taskInstruction = `Generate *one* core content page for this lesson.
            - **Page Title:** It MUST be exactly: "${extraData.contentTitle}"
            - **Content:** The content MUST be detail-rich, narrative-driven, and relevant to this page title, adhering to all Master Instructions.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${extraData.contentTitle}",\n    "content": "Detailed markdown content for this specific page, including interactive blockquotes..."\n  }\n}`;
            break;
        
        case 'CheckForUnderstanding':
            taskInstruction = `Generate the "${checkUnderstandingLabel}" page. This must be a short, formative activity with 3-4 concept questions based on the lesson's core content.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${checkUnderstandingLabel}",\n    "content": "1. Question 1...\n2. Question 2..."\n  }\n}`;
            break;

        case 'LessonSummary':
            taskInstruction = `Generate the "${lessonSummaryLabel}" page. This must be a concise recap of the most important points from *this lesson only*.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${lessonSummaryLabel}",\n    "content": "Concise recap in markdown..."\n  }\n}`;
            break;
        
        case 'WrapUp':
            taskInstruction = `Generate the "${wrapUpLabel}" page. This must be a motivational, inspiring closure that ties *this lesson* back to the big picture.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${wrapUpLabel}",\n    "content": "Motivational closure in markdown..."\n  }\n}`;
            break;

        case 'EndofLessonAssessment':
            taskInstruction = `Generate the "${endOfLessonAssessmentLabel}" page. This must be 5-8 questions (mix of multiple-choice, short-answer) that align with *this lesson's* objectives.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${endOfLessonAssessmentLabel}",\n    "content": "### Multiple Choice\n1. Question...\n\n### Short Answer\n4. Question..."\n  }\n}`;
            break;

        case 'AnswerKey':
            taskInstruction = `Generate the "${answerKeyLabel}" page. Provide clear answers to all questions from the "End of Lesson Assessment".`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${answerKeyLabel}",\n    "content": "1. Answer...\n4. Answer..."\n  }\n}`;
            break;

        case 'References':
            taskInstruction = `Generate the "${referencesLabel}" page. This must be an academic-style reference list for *this lesson*.`;
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${referencesLabel}",\n    "content": "- Source 1...\n- Source 2..."\n  }\n}`;
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
 * (This function is unchanged, it includes the "polite" 1.5s delay)
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
    maxRetries = 3
) => {
    
    const prompt = getComponentPrompt(
        guideData, 
        baseContext, 
        lessonPlan, 
        componentType, 
        styleRules, 
        extraData
    );
    
    // Combine master instructions for the component worker
    const finalPrompt = `
    ${prompt}

    =============================
    MASTER INSTRUCTION SET (Apply these to your task)
    =============================
    ${masterInstructions}
    `;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // --- ABORT FIX ---
        if (!isMounted.current) throw new Error("Generation aborted by user.");

        try {
            const aiResponse = await callGeminiWithLimitCheck(finalPrompt);

            // --- ABORT FIX ---
            if (!isMounted.current) throw new Error("Generation aborted by user.");
            
            const jsonData = sanitizeJsonComponent(aiResponse);

            // --- "POLITE" THROTTLING FIX ---
            await new Promise(res => setTimeout(res, 1500));
            // --- END "POLITE" THROTTLING FIX ---
            
            // --- ABORT FIX ---
            if (!isMounted.current) throw new Error("Generation aborted by user.");

            return jsonData;

        } catch (error) {
            // --- ABORT FIX ---
            if (!isMounted.current) throw new Error("Generation aborted by user.");

            console.warn(
                `Attempt ${attempt + 1} of ${maxRetries} failed for component: ${componentType} (Lesson: ${lessonPlan.lessonTitle})`,
                error.message
            );
            if (attempt === maxRetries - 1) {
                console.error(`All ${maxRetries} retries failed for component: ${componentType}. Aborting.`);
                throw new Error(`Failed to generate component ${componentType} after ${maxRetries} attempts: ${error.message}`);
            }

            // --- "RETRY" THROTTLING FIX ---
            await new Promise(res => setTimeout(res, 5000));
            // --- ABORT FIX ---
            if (!isMounted.current) throw new Error("Generation aborted by user.");
            // --- END "RETRY" THROTTLING FIX ---
        }
    }
};

/**
 * --- Master Instructions Function ---
 * (This function is unchanged)
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
            **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**. This is non-negotiable. All explanations, examples, and interpretations must align with Catholic teachings, doctrines, and values. You must integrate principles from the Catechism of the Catholic Church, relevant encyclicals, and Sacred Scripture where appropriate.
            **CRITICAL SOURCE REQUIREMENT (NON-NEGOTIABLE):** For all content and for the "${referencesLabel}" section, you MUST prioritize citing and referencing official Catholic sources. This includes, but is not limited to: the **Catechism of the Catholic Church (CCC)**, the **Youth Catechism (Youcat)**, relevant **Apostolic Letters**, **Encyclical Letters**, and documents from Vatican II. Secular sources may be used sparingly, but the core foundation must be these official Church documents.
        `;
    }

    const masterInstructions = `
        **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer.
        **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${guideData.gradeLevel}**.
        ${perspectiveInstruction}
        **CRITICAL INSTRUCTION FOR CORE CONTENT:** Instead of just listing facts, **weave them into a compelling narrative**. Tell the story *behind* the concept. Explain the "why" and "how". Use vivid analogies.
        
        **CRITICAL INSTRUCTION FOR INTERACTIVITY (NON-NEGOTIABLE):** You MUST embed small, interactive elements directly within the core content pages.
        - Use Markdown blockquotes (\`>\`) to format these.
        - **Examples:**
            - **> Think About It:** If gravity suddenly disappeared, what's the first thing that would happen?
            - **> Quick Poll:** Raise your hand if you think plants breathe.

        **Textbook Chapter Structure (NON-NEGOTIABLE):** You MUST generate the lesson pages in this exact sequence. The 'title' field for each special section MUST be exactly as specified.
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
        
        **CRITICAL JSON STRING RULE (NON-NEGOTIABLE):** When writing text content inside the JSON, do NOT escape standard quotation marks.
        - **Correct:** \\\`"title": "The Art of \\"How Much?\\""\\\`
        - **Incorrect:** \\\`"title": "The Art of \\\\\\"How Much?\\\\\\""\\\`
        
        **CRITICAL TEXT FORMATTING RULE (NON-NEGOTIABLE):**
        - To make text bold, you MUST use Markdown's double asterisks (**).
        - You are STRICTLY FORBIDDEN from using LaTeX commands like \\textbf{} or \\textit{}.
        - **✅ NEW (ABSOLUTE RULE):** You are **STRICTLY FORBIDDEN** from bolding the introductory phrase or "title" of a bullet point.
            - **Correct:** \`* Handle with Care: Carry glassware with two hands if it's large.\`
            - **INCORRECT:** \`* **Handle with Care**: Carry glassware with two hands if it's large.\`

        **CRITICAL INSTRUCTION FOR SCIENTIFIC NOTATION (NON-NEGOTIABLE):**
        You MUST use LaTeX for all mathematical equations, variables, and chemical formulas.
        - **For INLINE formulas**, use single dollar signs: $H_2O$.
        - **For BLOCK formulas**, use double dollar signs: $$...$$
        - **CRITICAL LATEX ESCAPING IN JSON:** Every single backslash \`\\\` in your LaTeX code MUST be escaped with a second backslash (\`\\\\\`).
        - **CORRECT EXAMPLE:** \`"content": "$$% \\\\text{ by Mass} = \\\\frac{\\\\text{Mass of Solute}}{\\\\text{Mass of Solution}} \\\\times 100\\%%$$"\`
        
        **ABSOLUTE RULE FOR CONTENT CONTINUATION (NON-NEGOTIABLE):** When a single topic or section is too long for one page and its discussion must continue onto the next page, a heading for that topic (the 'title' in the JSON) MUST ONLY appear on the very first page. ALL subsequent pages for that topic MUST have an empty string for their title: \\\`"title": ""\\\`.
        
        **CRITICAL INSTRUCTION FOR REFERENCES (NON-NEGOTIABLE):** All sources cited in the "${referencesLabel}" section MUST be as up-to-date as possible.

        **ABSOLUTE RULE FOR SVG DIAGRAMS (NON-NEGOTIABLE):**
        When a visual aid is necessary, you MUST generate valid, self-contained SVG code.
        - The page 'type' MUST be **"svg"**.
        - The 'content' MUST be a string containing the SVG code.
        - All styles MUST be inline attributes (e.g., \`stroke="#212121"\`). DO NOT use \`<style>\` tags.
        - Use a clean, educational textbook style.
    `;

    // Return both, so the component prompt can use the styles
    // and the micro-worker can use the master instructions.
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
    
    // --- ABORT FIX: Add ref to track mounted state ---
    const isMounted = useRef(false);

    const findSummaryContent = (lesson) => {
        if (!lesson || !lesson.pages) return "No summary available.";
        const lessonSummaryLabel = guideData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";
        const summaryPage = lesson.pages.find(p => p.title === lessonSummaryLabel);
        return summaryPage ? summaryPage.content : "Summary page not found.";
    };

    /**
     * --- Orchestrator Loop ---
     * (This function is unchanged, but it now calls the refactored/more efficient micro-worker)
     */
    const runGenerationLoop = useCallback(async () => {
        let plans = currentLessonPlan;
        let lessonsSoFar = [...currentLessons];

        try {
            // --- STEP 1: Planner (Only run if no plan exists) ---
            if (!plans) {
                showToast("Generating lesson plan...", "info");
                setLessonProgress({ current: 0, total: guideData.lessonCount }); // Show "0 of N"
                
                const existingSubjectContext = "No existing content found."; // Simplified
                const baseContext = getBasePromptContext(guideData, existingSubjectContext);
                const plannerPrompt = getPlannerPrompt(guideData, baseContext);

                const plannerResponse = await callGeminiWithLimitCheck(plannerPrompt);
                
                // --- ABORT FIX ---
                if (!isMounted.current) return; 

                const parsedPlan = sanitizeJsonBlock(plannerResponse); 
                
                if (!parsedPlan || parsedPlan.length === 0) {
                    throw new Error("The AI failed to create a lesson plan.");
                }
                
                plans = parsedPlan;
                setCurrentLessonPlan(plans); // Save the plan
            }

            // --- REFACTORED: Get instructions ONCE before the loop ---
            const { masterInstructions, styleRules } = await getMasterInstructions(guideData);
            // --- ABORT FIX ---
            if (!isMounted.current) return;

            // --- STEP 2: Orchestrator (Loop through the plan) ---
            const lessonsToProcess = plans.slice(startLessonNumber - 1);
            setLessonProgress({ current: startLessonNumber - 1, total: plans.length });

            for (const [index, plan] of lessonsToProcess.entries()) {
                // --- ABORT FIX ---
                if (!isMounted.current) return; 

                const currentLessonIndex = (startLessonNumber - 1) + index;
                setLessonProgress({ current: currentLessonIndex + 1, total: plans.length });
                showToast(`Generating Lesson ${currentLessonIndex + 1} of ${plans.length}: "${plan.lessonTitle}"...`, "info", 10000);

                // Build the scaffolding context *for this specific lesson*
                const previousLessonsContext = lessonsSoFar
                    .map((lesson, idx) => `Lesson ${idx + 1}: "${lesson.lessonTitle}"\nSummary: ${findSummaryContent(lesson)}`)
                    .join('\n---\n');
                
                const existingSubjectContext = "No existing content found."; // Simplified
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

                // --- REFACTORED: Pass instructions to each worker call ---
                const objectivesData = await generateLessonComponent(guideData, baseContext, plan, 'objectives', isMounted, masterInstructions, styleRules, {});
                newLesson.learningObjectives = objectivesData.objectives;

                const competenciesData = await generateLessonComponent(guideData, baseContext, plan, 'competencies', isMounted, masterInstructions, styleRules, {});
                newLesson.assignedCompetencies = competenciesData.competencies;
                
                const introData = await generateLessonComponent(guideData, baseContext, plan, 'Introduction', isMounted, masterInstructions, styleRules, {});
                newLesson.pages.push(introData.page);
                
                const activityData = await generateLessonComponent(guideData, baseContext, plan, 'LetsGetStarted', isMounted, masterInstructions, styleRules, {});
                newLesson.pages.push(activityData.page);

                const contentPlannerData = await generateLessonComponent(guideData, baseContext, plan, 'CoreContentPlanner', isMounted, masterInstructions, styleRules, {});
                const contentPlanTitles = contentPlannerData.coreContentTitles || [];
                
                for (const contentTitle of contentPlanTitles) {
                    // --- ABORT FIX ---
                    if (!isMounted.current) return;
                    
                    const contentPageData = await generateLessonComponent(guideData, baseContext, plan, 'CoreContentPage', isMounted, masterInstructions, styleRules, { contentTitle });
                    newLesson.pages.push(contentPageData.page);
                }
                
                const standardPages = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
                for (const pageType of standardPages) {
                    // --- ABORT FIX ---
                    if (!isMounted.current) return;

                    const pageData = await generateLessonComponent(guideData, baseContext, plan, pageType, isMounted, masterInstructions, styleRules, {});
                    if (pageData && pageData.page) {
                        newLesson.pages.push(pageData.page);
                    }
                }
                
                lessonsSoFar.push(newLesson);
                setCurrentLessons([...lessonsSoFar]);
            }
        
            // --- ABORT FIX ---
            if (!isMounted.current) return;

            onGenerationComplete({ previewData: { generated_lessons: lessonsSoFar }, failedLessonNumber: null, lessonPlan: plans });
            showToast("All lessons generated successfully!", "success");

        } catch (err) {
            // --- ABORT FIX: Handle abort error silently ---
            if (!isMounted.current || (err.message && err.message.includes("aborted"))) {
                console.log("Generation loop aborted by user.");
                return; // Silently exit
            }

            // Original catch logic
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
        };
        
    // --- THIS IS THE FIX ---
    // We change [runGenerationLoop] to []
    // This tells React to run this effect *only once* when the component mounts.
    // It will *not* run again when the state updates, which stops the flood.
    // We add the eslint-disable line to tell the linter this is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // <-- THE FIX IS HERE

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