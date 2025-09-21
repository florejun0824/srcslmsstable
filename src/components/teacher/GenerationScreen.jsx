import React, { useEffect, useState } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

// Helper functions from your original CreateLearningGuideModal.jsx file
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

export default function GenerationScreen({ subject, unit, guideData, onGenerationComplete, onBack }) {
    const { showToast } = useToast();
    const [lessonProgress, setLessonProgress] = useState({ current: 0, total: 0 });

    const getMasterInstructions = () => {
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

        return `
            **Persona and Tone:** Adopt the persona of a **brilliant university professor who is also a bestselling popular book author**. Your writing should have the authority, accuracy, and depth of a subject matter expert, but the narrative flair and engaging storytelling of a great writer. Think of yourself as writing a chapter for a "page-turner" textbook that makes readers feel smarter. Do not explicitly state your role or persona.
            **CRITICAL AUDIENCE INSTRUCTION:** The target audience is **Grade ${guideData.gradeLevel}**. Your writing must be clear, accessible, and tailored to the cognitive and developmental level of this grade. The complexity of vocabulary, sentence structure, and conceptual depth should be appropriate for a ${guideData.gradeLevel}th grader.
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

            **CRITICAL LANGUAGE RULE: You MUST generate the entire response exclusively in ${guideData.language}.**
        `;
    };

    const generateSingleLesson = async (lessonNumber, totalLessons, previousLessonsContext, existingSubjectContext) => {
        let lastError = null;
        let lastResponseText = null;
        const masterInstructions = getMasterInstructions(guideData, subject.title);
        
        const scaffoldInfo = {
            summary: guideData.scaffoldedLessons.length > 0
                ? guideData.scaffoldedLessons.map(l => `- ${l.title}`).join('\n')
                : 'No specific prerequisite lessons were selected.'
        };

        const scaffoldingInstruction = `
        **PRIMARY ANALYSIS TASK (NON-NEGOTIABLE):** Before generating anything, you MUST act as a curriculum continuity expert. Your most critical task is to meticulously analyze all the provided context below to prevent any topical repetition.

        ---
        ### CONTEXT: PREVIOUSLY COVERED MATERIAL
        This section contains all topics, objectives, and keywords from lessons that have already been created. You are strictly forbidden from re-teaching these specific concepts.

        **1. User-Selected Prerequisite Lessons:**
        ${scaffoldInfo.summary}

        **2. Other Lessons Existing in this Subject:**
        ${existingSubjectContext || "No other lessons exist yet."}

        **3. Lessons Just Generated in this Session:**
        ${previousLessonsContext || "No other lessons have been generated in this session."}
        ---

        ### YOUR GENERATION RULES (ABSOLUTE)
        1.  **DO NOT REPEAT:** You are strictly forbidden from creating a lesson, activity, or assessment question that covers the same learning objectives or keywords mentioned in the context above.
        2.  **IDENTIFY THE GAP:** Your new lesson must address a logical "next step" or a knowledge gap that is not covered by the existing material.
        3.  **BUILD A BRIDGE:** If appropriate, your introduction should briefly reference a concept from a prerequisite lesson to create a smooth transition, but it must immediately move into new material.

        **YOUR TASK:** Based on your analysis of the context above, generate a new, unique lesson about **"${guideData.content}"**.
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
                      **Core Content:** Subject: "${guideData.subjectName}", Grade: ${guideData.gradeLevel}, Topic: "${guideData.content}"
                      **Learning Competencies:** "${guideData.learningCompetencies}"
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


    const runGenerationLoop = async (startLessonNumber = 1) => {
        let currentLessons = []; // Start fresh
        const lessonSummaryLabel = guideData.language === 'Filipino' ? 'Buod ng Aralin' : "Lesson Summary";

        const findSummaryContent = (lesson) => {
            if (!lesson || !lesson.pages) return "No summary available.";
            const summaryPage = lesson.pages.find(p => p.title === lessonSummaryLabel);
            return summaryPage ? summaryPage.content : "Summary page not found.";
        };
        
        const existingSubjectContext = "No existing content found."; // Simplified for this component

        try {
            if (!guideData.content || !guideData.learningCompetencies) {
                throw new Error("Please provide the Main Content/Topic and Learning Competencies.");
            }

            for (let i = startLessonNumber; i <= guideData.lessonCount; i++) {
                setLessonProgress({ current: i, total: guideData.lessonCount });
                showToast(`Generating Lesson ${i} of ${guideData.lessonCount}...`, "info", 10000);
                
                const previousLessonsContext = currentLessons
                    .map((lesson, index) => `Lesson ${index + 1}: "${lesson.lessonTitle}"\nSummary: ${findSummaryContent(lesson)}`)
                    .join('\n---\n');

                const singleLessonData = await generateSingleLesson(
                    i, 
                    guideData.lessonCount, 
                    previousLessonsContext,
                    existingSubjectContext
                );
                
                if (singleLessonData && singleLessonData.generated_lessons && singleLessonData.generated_lessons.length > 0) {
                    currentLessons.push(...singleLessonData.generated_lessons);
                    // Temporarily update preview for user feedback
                    onGenerationComplete({ previewData: { generated_lessons: [...currentLessons] }, failedLessonNumber: null });
                } else {
                    throw new Error(`Received invalid or empty data for lesson ${i}.`);
                }
            }
        
            setLessonProgress({ current: 0, total: 0 });
            showToast("All lessons generated successfully!", "success");

        } catch (err) {
            const failedLessonNum = currentLessons.length + 1;
            console.error(`Error during generation of Lesson ${failedLessonNum}:`, err);
            const userFriendlyError = `Failed to generate Lesson ${failedLessonNum}. You can try to continue the generation.`;
            showToast(userFriendlyError, "error", 15000);
            onGenerationComplete({ previewData: { generated_lessons: currentLessons }, failedLessonNumber: failedLessonNum });
        }
    };


    useEffect(() => {
        runGenerationLoop();
    }, [guideData]); // Run generation whenever guideData changes (i.e., when submitted from step 1)

    return (
        <div className="flex flex-col h-full bg-slate-200 rounded-2xl">
            <header className="flex-shrink-0 p-6">
                 <button 
                    onClick={onBack} 
                    className="inline-flex items-center justify-center px-4 py-2 bg-slate-200 text-sm font-medium text-slate-700 rounded-xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 focus:ring-sky-500"
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