import React, { useEffect, useState, useCallback, useRef } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
// We need the *big* sanitizer for the Planner call
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText'; // Corrected path

// --- CONFIGURATION ---
// Set to 20 seconds to safely allow for long/complex prompts without hitting the limit.
const GEMMA_SAFETY_DELAY_MS = 31000; 

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

        // 1. Try to find a JSON block wrapped in markdown backticks (common AI error)
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
                // This character is escaped, skip it
                escape = false;
                continue;
            }

            if (char === '\\') {
                // Next character is escaped
                escape = true;
                continue;
            }

            if (char === '"') {
                // Toggle in/out of string, but only if not escaped
                inString = !inString;
            }

            if (inString) {
                // We are inside a string, ignore braces
                continue;
            }

            // We are not in a string, so process braces
            if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;

                if (depth === 0) {
                    // We found the matching closing brace
                    endIndex = i;
                    break;
                }
            }
        }

        if (endIndex === -1) {
            // We never found the matching brace, the JSON is incomplete
            throw new Error('JSON object is incomplete or truncated.');
        }

        // 4. Extract the valid JSON block and parse it
        // --- ADDED: Newline escaping fix ---
        const validJsonString = jsonString.substring(startIndex, endIndex + 1)
            // This regex fixes common newline issues in JSON strings by escaping them
            .replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");

        return JSON.parse(validJsonString);

    } catch (error) {
        // Log more info for better debugging
        console.error(
            "sanitizeJsonComponent error:", 
            error.message, 
            "Preview of raw AI response (first 500 chars):", 
            aiResponse.substring(0, 500)
        );
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
      ]
    }
    `;
};

/**
 * --- Micro-Worker Prompt Generator ---
 * (This function is MODIFIED)
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
            const introContext = extraData.introContent
                ? `
                **PREVIOUS PAGE CONTEXT (NON-NEGOTIABLE):**
                The user was just shown this "Engaging Introduction":
                ---
                ${extraData.introContent}
                ---
                
                **YOUR TASK:**
                Generate the "${letsGetStartedLabel}" page. This page MUST act as a *direct follow-up* to the introduction. It must be a short, simple, interactive warm-up activity that logically flows from what the user just read.
                `
                : `Generate the "${letsGetStartedLabel}" page. This must be a short, simple, interactive warm-up activity relevant to this lesson.`;
            
            taskInstruction = introContext;
            
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${letsGetStartedLabel}",\n    "content": "Warm-up activity instructions..."\n  }\n}`;
            break;

        case 'CoreContentPlanner':
            // --- MODIFICATION FOR TOKEN LIMITS ---
            taskInstruction = `Analyze the focus for this lesson: "${lessonPlan.summary}".
            **CRITICAL TASK (NON-NEGOTIABLE):** Your task is to break down this lesson's topic into a series of **page-sized sub-topics**. Each sub-topic you list will become *one single page*.
            - If the lesson's topic is simple, you might only return 1 or 2 titles.
            - If the lesson's topic is complex (e.g., "The Light-Dependent Reactions"), you MUST return as many titles as needed (e.g., "Page 1: Capturing Light," "Page 2: The Electron Transport Chain," "Page 3: Creating ATP and NADPH") to cover it fully.
            - Do **NOT** include titles for "Introduction," "Warm-Up," "Summary," etc. Just the main, teachable content topics.`;
            // --- END MODIFICATION ---
            
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "coreContentTitles": [\n    "First Sub-Topic Title",\n    "Second Sub-Topic Title"\n    // ... (as many as necessary)
      ]\n}`;
            break;

        case 'CoreContentPage':
            // --- MODIFICATION START ---
            const allTitles = extraData.allContentTitles || [extraData.contentTitle];
            const currentIndex = extraData.currentIndex !== undefined ? extraData.currentIndex : 0;
            const currentTitle = extraData.contentTitle;

            // --- NEW DYNAMIC CONTEXT BLOCK ---
            let previousContentInstruction = '';
            if (currentIndex === 0) {
                // This is the FIRST core content page
                previousContentInstruction = `
                **PREVIOUSLY COVERED (DO NOT REPEAT):**
                You are strictly forbidden from repeating the content from the "Introduction" or the "${letsGetStartedLabel}" (Warm-up) activity. The user has *already completed* these.
                - **Introduction Content (DO NOT REPEAT):** ${extraData.introContent || 'N/A'}
                - **Warm-Up Content (DO NOT REPEAT):** ${extraData.activityContent || 'N/A'}
    
                **YOUR TASK (Page 1 of ${allTitles.length}):**
                1.  You MUST start teaching the new material for "**${currentTitle}**" immediately.
                2.  Do NOT add a new introduction, greeting, or "welcome back." Dive directly into the topic.
                `;
            } else {
                // This is a SUBSEQUENT (2nd, 3rd, etc.) core content page
                previousContentInstruction = `
                **PREVIOUS PAGE CONTEXT (DO NOT REPEAT):**
                The user just finished reading the *previous* core content page, which covered:
                ---
                ${extraData.previousPageContent || 'N/A'}
                ---
    
                **YOUR TASK (Page ${currentIndex + 1} of ${allTitles.length}):**
                1.  You MUST create a seamless continuation from the previous page.
                2.  Do NOT add a new introduction, greeting, or "welcome back."
                3.  Your content MUST focus *exclusively* on the material for *your* assigned title: "**${currentTitle}**".
                4.  You are **strictly forbidden** from discussing topics belonging to other page titles (especially the one you just saw).
                `;
            }
            // --- END DYNAMIC CONTEXT BLOCK ---

            const contentContextInstruction = `
            **CRITICAL CONTENT BOUNDARIES (NON-NEGOTIABLE):**
            This lesson's core content is divided into ${allTitles.length} main page(s).
            
            - **Your Page Title:** "${currentTitle}"
            - **All Page Titles (in order):** ${allTitles.map((t, i) => `\n  ${i + 1}. ${t} ${i === currentIndex ? "(THIS IS YOUR PAGE)" : ""}`).join('')}

            ${previousContentInstruction}
            `;
            // --- MODIFICATION END ---

            taskInstruction = `Generate *one* core content page for this lesson.
            - **Page Title:** It MUST be exactly: "${currentTitle}"

            ${contentContextInstruction}

            - **Content:** The content MUST be detail-rich, narrative-driven, and relevant *only* to this page title, adhering to all Master Instructions.
            - **CRITICAL LENGTH CONSTRAINT:** Be thorough but concise. Your *entire* JSON response must be under 8000 characters. Do not write excessively long paragraphs.`;
            
            jsonFormat = `Your response MUST be *only* this JSON object:\n{\n  "page": {\n    "title": "${currentTitle}",\n    "content": "Detailed markdown content for **this specific page only**, including interactive blockquotes..."\n  }\n}`;
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
 * (This function is MODIFIED to support AbortSignal)
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
    signal // Added signal argument
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
        if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");

        try {
            // Pass signal to the AI service call
            const aiResponse = await callGeminiWithLimitCheck(finalPrompt, { signal });

            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");
            
            const jsonData = sanitizeJsonComponent(aiResponse);

            await new Promise(res => setTimeout(res, 1500));
            
            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Generation aborted by user.");

            return jsonData;

        } catch (error) {
            // Check for abort error specifically
            if (error.name === 'AbortError' || (signal && signal.aborted)) {
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
     * (This function is MODIFIED with AbortController logic)
     */
    const runGenerationLoop = useCallback(async () => {
        // Initialize AbortController
        const controller = new AbortController();
        // Abort any previous controller if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = controller;
        const signal = controller.signal;

        let plans = currentLessonPlan;
        let lessonsSoFar = [...currentLessons];

        try {
            // --- STEP 1: Planner (Only run if no plan exists) ---
            if (!plans) {
                showToast("Generating lesson plan...", "info");
                setLessonProgress({ current: 0, total: guideData.lessonCount });
                
                const existingSubjectContext = "No existing content found.";
                const baseContext = getBasePromptContext(guideData, existingSubjectContext);
                const plannerPrompt = getPlannerPrompt(guideData, baseContext);

                // --- ADDED SAFETY DELAY BEFORE PLANNER ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);

                // Pass signal to the planner call
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

            // --- STEP 2: Orchestrator (Loop through the plan) ---
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

                // --- ADDED SAFETY DELAY BEFORE OBJECTIVES ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const objectivesData = await generateLessonComponent(guideData, baseContext, plan, 'objectives', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.learningObjectives = objectivesData.objectives;

                // --- ADDED SAFETY DELAY BEFORE COMPETENCIES ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const competenciesData = await generateLessonComponent(guideData, baseContext, plan, 'competencies', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.assignedCompetencies = competenciesData.competencies;
                
                // --- ADDED SAFETY DELAY BEFORE INTRO ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const introData = await generateLessonComponent(guideData, baseContext, plan, 'Introduction', isMounted, masterInstructions, styleRules, {}, 3, signal);
                newLesson.pages.push(introData.page);
                
                const introContent = introData.page.content;

                // --- ADDED SAFETY DELAY BEFORE ACTIVITY ---
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

                // --- ADDED SAFETY DELAY BEFORE CONTENT PLANNER ---
                await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                const contentPlannerData = await generateLessonComponent(guideData, baseContext, plan, 'CoreContentPlanner', isMounted, masterInstructions, styleRules, {}, 3, signal);
                const contentPlanTitles = contentPlannerData.coreContentTitles || [];
                
                // --- MODIFICATION START (Context Chaining) ---
                // This variable will hold the content of the *previous* core content page
                // to chain them together.
                let previousPageContent = null; 

                for (const [contentIndex, contentTitle] of contentPlanTitles.entries()) {
                    if (!isMounted.current || signal.aborted) return;
                    
                    // Build the context for this specific page
                    let extraContext = { 
                        contentTitle: contentTitle,
                        allContentTitles: contentPlanTitles,
                        currentIndex: contentIndex
                    };

                    if (contentIndex === 0) {
                        // The FIRST page needs context from the Intro and Warm-up
                        extraContext.introContent = introContent;
                        extraContext.activityContent = activityContent;
                    } else {
                        // SUBSEQUENT pages need context from the PREVIOUS content page
                        extraContext.previousPageContent = previousPageContent;
                    }

                    // --- ADDED SAFETY DELAY BEFORE CORE CONTENT PAGE (The big one!) ---
                    await smartDelay(GEMMA_SAFETY_DELAY_MS, signal);
                    const contentPageData = await generateLessonComponent(
                        guideData, 
                        baseContext, 
                        plan, 
                        'CoreContentPage', 
                        isMounted, 
                        masterInstructions, 
                        styleRules, 
                        extraContext, // Pass the dynamically built context
                        3,
                        signal
                    );
                    newLesson.pages.push(contentPageData.page);
                    
                    // Store this page's content to be used as context for the NEXT page in the loop
                    previousPageContent = contentPageData.page.content;
                }
                // --- MODIFICATION END ---
                
                const standardPages = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
                for (const pageType of standardPages) {
                    if (!isMounted.current || signal.aborted) return;
                    
                    // --- ADDED SAFETY DELAY BEFORE EACH STANDARD PAGE ---
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
            // Check for abort error
            if (!isMounted.current || err.name === 'AbortError' || (err.message && err.message.includes("aborted"))) {
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