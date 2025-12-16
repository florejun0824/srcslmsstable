import React, { useEffect, useState, useCallback, useRef } from 'react';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { sanitizeLessonsJson as sanitizeJsonBlock } from './sanitizeLessonText';

// --- 1. THE "PACING" DELAY ---
// We wait 10 seconds between steps. This allows the 15,000 TPM bucket to refill.
// This small wait allows us to use HUGE, high-quality prompts without crashing.
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * --- 2. ROBUST JSON SANITIZER ---
 * Gemma 3 (27b) is smart but sometimes bad at formatting JSON.
 * This function manually fixes common errors (like unescaped newlines) so the app doesn't crash.
 */
const sanitizeJsonComponent = (aiResponse) => {
    try {
        let jsonString = aiResponse;

        // 1. Extract JSON from Markdown backticks (common AI behavior)
        const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
        if (markdownMatch && markdownMatch[2]) {
            jsonString = markdownMatch[2];
        }

        // 2. Find the true JSON object bounds
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1) {
            throw new Error('No valid JSON brackets found.');
        }

        let validJsonString = jsonString.substring(startIndex, endIndex + 1);

        // --- GEMMA 3 SPECIFIC FIXES ---
        validJsonString = validJsonString
            // Fix 1: Escaped newlines that break JSON (e.g. "content": "Line 1\nLine 2")
            // This regex finds newlines inside quotes and escapes them properly to \\n
            .replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n")
            // Fix 2: Unescaped backslashes in LaTeX (e.g. \frac -> \\frac)
            .replace(/\\(?![/u"bfnrt\\])/g, "\\\\")
            // Fix 3: Remove Control characters that shouldn't be there
            .replace(/[\u0000-\u001F]+/g, (match) => match === '\n' ? '\\n' : '');

        return JSON.parse(validJsonString);

    } catch (error) {
        console.warn("JSON Parse Warning, attempting fallback:", error.message);
        
        // FALLBACK: If strict parsing fails, use Regex to extract the "content" field manually.
        // This ensures you get the text even if the JSON syntax is slightly wrong.
        const contentMatch = aiResponse.match(/"content":\s*"([\s\S]*?)"(?=\s*\}|\s*,)/);
        const titleMatch = aiResponse.match(/"title":\s*"([\s\S]*?)"/);

        if (contentMatch) {
            return { 
                page: { 
                    title: titleMatch ? titleMatch[1] : "Generated Section", 
                    content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') 
                } 
            };
        }
        // If we really can't save it, throw error to trigger the retry logic
        throw new Error(`Critical JSON Failure: ${error.message}`);
    }
};

/**
 * --- 3. FULL "UNIVERSITY PROFESSOR" PROMPTS ---
 * We keep these detailed to ensure the output is academic and professional.
 */
const getMasterInstructions = (guideData) => {
    const isFilipino = guideData.language === 'Filipino';
    const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
    
    // RESTORED: The full, rich persona instruction
    let perspectiveInstruction = '';
    if (catholicSubjects.includes(guideData.subjectName)) {
        perspectiveInstruction = `
            **CRITICAL PERSPECTIVE:** Catholic. All explanations must align with Catholic teachings.
            **SOURCE REQUIREMENT:** Cite official sources (CCC, Youcat, Encyclicals) where applicable.
        `;
    }

    const masterInstructions = `
        **Persona:** Brilliant University Professor & Bestselling Author.
        **Tone:** Authoritative, accurate, depth of an expert, but with narrative flair.
        **Audience:** Grade ${guideData.gradeLevel}.
        **Language:** ${guideData.language}. ${isFilipino ? 'STRICTLY ACADEMIC FILIPINO. NO TAGLISH.' : ''}
        ${perspectiveInstruction}
        
        **CONTENT RULES:**
        - **Narrative:** Don't just list facts. Weave them into a compelling story. Explain "why" and "how". Use analogies.
        - **Interactivity:** Embed small elements using blockquotes (\`> Think about it...\`).
        
        **FORMATTING RULES:**
        - **Bold:** Use double asterisks (**). Do NOT bold bullet point headers.
        - **Math/Science:** Use LaTeX. Inline: $H_2O$. Block: $$E=mc^2$$. 
        - **IMPORTANT:** Escape all backslashes in LaTeX (e.g. \\\\frac).
    `;

    return masterInstructions;
};

const getComponentPrompt = (guideData, lessonPlan, componentType, extraData = {}) => {
    const isFilipino = guideData.language === 'Filipino';
    const L = {
        obj: isFilipino ? 'Mga Layunin' : 'Learning Objectives',
        act: isFilipino ? 'Simulan Natin!' : "Let's Get Started!",
        check: isFilipino ? 'Suriin' : "Check for Understanding",
        sum: isFilipino ? 'Buod' : "Lesson Summary",
        wrap: isFilipino ? 'Pagbubuod' : "Wrap-Up",
        quiz: isFilipino ? 'Pagtatasa' : "End-of-Lesson Assessment",
        key: isFilipino ? 'Susi' : 'Answer Key',
        ref: isFilipino ? 'Sanggunian' : "References"
    };

    const context = `
    **CURRENT LESSON:** "${lessonPlan.lessonTitle}"
    **FOCUS:** ${lessonPlan.summary}
    `;

    // RESTORED: Detailed task descriptions for high quality
    switch (componentType) {
        case 'objectives':
            return `
            ${context}
            **TASK:** Generate 3-5 specific, measurable, student-friendly learning objectives based *only* on the lesson focus.
            **JSON:** {"objectives": ["Objective 1", "Objective 2"]}
            `;
        
        case 'competencies':
            return `
            **TASK:** Select 1-3 competencies from the Master List that are *directly* addressed by this lesson.
            **JSON:** {"competencies": ["Competency 1", "Competency 2"]}
            `;

        case 'Introduction':
            return `
            ${context}
            **TASK:** Generate the "Engaging Introduction". 
            - **Title:** Must be a thematic, captivating subheader (NOT 'Introduction').
            - **Content:** Hook attention immediately. Use a paradox, a real-world problem, or a story.
            **JSON:** {"page": {"title": "Thematic Title", "content": "Detailed markdown..."}}
            `;
        
        case 'LetsGetStarted':
            return `
            **PREVIOUS CONTEXT:** The user just read this Intro: "${(extraData.introContent || '').substring(0, 200)}..."
            **TASK:** Generate the "${L.act}" page. It must be a short, interactive warm-up activity that flows logically from the Intro.
            **JSON:** {"page": {"title": "${L.act}", "content": "Activity instructions..."}}
            `;

        case 'CoreContentPlanner':
            return `
            **TASK:** Break the lesson topic ("${lessonPlan.summary}") into a series of **page-sized sub-topics**.
            - If simple, return 1-2 titles.
            - If complex, return 3-4 titles.
            **JSON:** {"coreContentTitles": ["Subtopic 1", "Subtopic 2"]}
            `;

        case 'CoreContentPage':
            return `
            **TASK:** Write the content for page **${extraData.currentIndex + 1}**: "${extraData.contentTitle}".
            **CONTEXT:** This follows the previous page: ...${(extraData.previousPageContent || '').slice(-200)}
            **RULES:**
            - Detail-rich, narrative-driven.
            - **Length:** Thorough but concise (min 300 words).
            - Focus *exclusively* on "${extraData.contentTitle}".
            **JSON:** {"page": {"title": "${extraData.contentTitle}", "content": "Detailed content..."}}
            `;
        
        case 'CheckForUnderstanding':
            return `
            **TASK:** Generate "${L.check}". Provide 3-4 short concept questions to test retention.
            **JSON:** {"page": {"title": "${L.check}", "content": "1. Question..."}}
            `;

        case 'LessonSummary':
            return `
            **TASK:** Generate "${L.sum}". A concise recap of the most important points.
            **JSON:** {"page": {"title": "${L.sum}", "content": "Recap..."}}
            `;
        
        case 'WrapUp':
            return `
            **TASK:** Generate "${L.wrap}". A motivational closure that ties the lesson to the big picture.
            **JSON:** {"page": {"title": "${L.wrap}", "content": "Closure..."}}
            `;

        case 'EndofLessonAssessment':
            return `
            **TASK:** Generate "${L.quiz}". 5-8 questions (Multiple Choice & Short Answer) aligned with objectives.
            **JSON:** {"page": {"title": "${L.quiz}", "content": "### Multiple Choice\\n1. Q..."}}
            `;

        case 'AnswerKey':
            return `
            **TASK:** Generate "${L.key}" for the assessment.
            **JSON:** {"page": {"title": "${L.key}", "content": "1. Answer..."}}
            `;

        case 'References':
            return `
            **TASK:** Generate "${L.ref}". An academic reference list.
            **JSON:** {"page": {"title": "${L.ref}", "content": "- Source..."}}
            `;

        default: return '';
    }
};

/**
 * --- 4. MICRO-WORKER ---
 */
const generateLessonComponent = async (
    guideData, lessonPlan, componentType, isMounted, extraData = {}, signal
) => {
    
    // 1. Get Full Instructions
    const masterInstructions = getMasterInstructions(guideData);
    const specificTask = getComponentPrompt(guideData, lessonPlan, componentType, extraData);
    
    const finalPrompt = `
    ${specificTask}

    =============================
    MASTER INSTRUCTIONS (Apply strict persona):
    ${masterInstructions}
    `;
    
    // 2. LONG DELAY (10s)
    // This is the secret. By waiting 10s, we ensure the 15k TPM bucket is refilled.
    // This allows us to send the HUGE prompt above without error.
    await delay(10000); 

    for (let attempt = 0; attempt < 3; attempt++) {
        if (!isMounted.current || (signal && signal.aborted)) throw new Error("Aborted");

        try {
            const aiResponse = await callGeminiWithLimitCheck(finalPrompt, { signal });
            
            if (!isMounted.current || (signal && signal.aborted)) throw new Error("Aborted");
            
            return sanitizeJsonComponent(aiResponse);

        } catch (error) {
            if (error.name === 'AbortError') throw new Error("Aborted");
            
            console.warn(`Retry ${attempt + 1}/3 for ${componentType}:`, error.message);
            
            if (attempt === 2) throw error;
            await delay(5000); 
        }
    }
};

// --- 5. ORCHESTRATOR ---
export default function GenerationScreen({ 
    subject, unit, guideData, initialLessonPlan, existingLessons, startLessonNumber, onGenerationComplete, onBack 
}) {
    const { showToast } = useToast();
    const [lessonProgress, setLessonProgress] = useState({ current: 0, total: 0 });
    const [currentLessonPlan, setCurrentLessonPlan] = useState(initialLessonPlan);
    const [currentLessons, setCurrentLessons] = useState(existingLessons || []);
    
    const isMounted = useRef(false);
    const abortControllerRef = useRef(null);

    const findSummaryContent = (lesson) => {
        if (!lesson || !lesson.pages) return "No summary.";
        const page = lesson.pages.find(p => p.title.toLowerCase().includes("summary") || p.title.toLowerCase().includes("buod"));
        return page ? page.content : "No summary available.";
    };

    const runGenerationLoop = useCallback(async () => {
        const controller = new AbortController();
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        let plans = currentLessonPlan;
        let lessonsSoFar = [...currentLessons];

        try {
            // STEP 1: Planner
            if (!plans) {
                showToast("Designing comprehensive curriculum...", "info");
                setLessonProgress({ current: 0, total: guideData.lessonCount });
                
                const instructions = getMasterInstructions(guideData);
                const prompt = `
                ${instructions}
                **TASK:** Create a detailed ${guideData.lessonCount}-lesson plan for "${guideData.content}".
                **JSON:** {"lessons": [{ "lessonTitle": "...", "summary": "..." }]}`;

                const response = await callGeminiWithLimitCheck(prompt, { signal });
                if (!isMounted.current || signal.aborted) return; 

                const parsed = sanitizeJsonBlock(response);
                if (!parsed || !parsed.lessons) throw new Error("Invalid Plan JSON");
                
                plans = parsed.lessons;
                setCurrentLessonPlan(plans);
            }

            // STEP 2: Loop
            const lessonsToProcess = plans.slice(startLessonNumber - 1);
            setLessonProgress({ current: startLessonNumber - 1, total: plans.length });

            for (const [index, plan] of lessonsToProcess.entries()) {
                if (!isMounted.current || signal.aborted) return; 

                const currentLessonIndex = (startLessonNumber - 1) + index;
                setLessonProgress({ current: currentLessonIndex + 1, total: plans.length });
                showToast(`Writing Lesson ${currentLessonIndex + 1}: ${plan.lessonTitle}...`, "info", 12000); // Longer toast for slower speed

                // Only strictly necessary context to save tokens, but full instruction block
                const prevLesson = lessonsSoFar[lessonsSoFar.length - 1];
                const prevContext = prevLesson 
                    ? `PREV LESSON: ${prevLesson.lessonTitle} (${findSummaryContent(prevLesson).slice(0, 300)}...)`
                    : "START: This is the first lesson.";

                let newLesson = {
                    lessonTitle: plan.lessonTitle,
                    pages: [],
                    learningObjectives: [],
                    assignedCompetencies: []
                };

                // Pipeline
                const objs = await generateLessonComponent(guideData, plan, 'objectives', isMounted, {}, signal);
                newLesson.learningObjectives = objs.objectives;

                const comps = await generateLessonComponent(guideData, plan, 'competencies', isMounted, {}, signal);
                newLesson.assignedCompetencies = comps.competencies;

                const intro = await generateLessonComponent(guideData, plan, 'Introduction', isMounted, { prevContext }, signal);
                newLesson.pages.push(intro.page);

                const act = await generateLessonComponent(guideData, plan, 'LetsGetStarted', isMounted, { introContent: intro.page.content }, signal);
                newLesson.pages.push(act.page);

                const planner = await generateLessonComponent(guideData, plan, 'CoreContentPlanner', isMounted, {}, signal);
                const titles = planner.coreContentTitles || ["Main Concept"];
                
                let prevPageContent = intro.page.content; 

                for (let i = 0; i < titles.length; i++) {
                    if (!isMounted.current || signal.aborted) return;
                    
                    const pageData = await generateLessonComponent(
                        guideData, plan, 'CoreContentPage', isMounted, 
                        { contentTitle: titles[i], allContentTitles: titles, currentIndex: i, previousPageContent: prevPageContent },
                        signal
                    );
                    newLesson.pages.push(pageData.page);
                    prevPageContent = pageData.page.content; 
                }

                const closers = ['CheckForUnderstanding', 'LessonSummary', 'WrapUp', 'EndofLessonAssessment', 'AnswerKey', 'References'];
                for (const type of closers) {
                    if (!isMounted.current || signal.aborted) return;
                    const res = await generateLessonComponent(guideData, plan, type, isMounted, {}, signal);
                    if(res?.page) newLesson.pages.push(res.page);
                }

                lessonsSoFar.push(newLesson);
                setCurrentLessons([...lessonsSoFar]);
            }
        
            if (!isMounted.current || signal.aborted) return;
            onGenerationComplete({ previewData: { generated_lessons: lessonsSoFar }, failedLessonNumber: null, lessonPlan: plans });
            showToast("Curriculum generated successfully.", "success");

        } catch (err) {
            if (!isMounted.current || err.name === 'AbortError') return;
            console.error(err);
            const failedNum = lessonsSoFar.length + 1;
            showToast(`Generation stopped at Lesson ${failedNum}. Resume available.`, "error", 10000);
            onGenerationComplete({ previewData: { generated_lessons: lessonsSoFar }, failedLessonNumber: failedNum, lessonPlan: plans });
        }
    }, [guideData, startLessonNumber, currentLessonPlan, currentLessons, onGenerationComplete, showToast]);

    useEffect(() => {
        isMounted.current = true;
        runGenerationLoop();
        return () => { isMounted.current = false; if (abortControllerRef.current) abortControllerRef.current.abort(); };
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-2xl">
            <header className="flex-shrink-0 p-6">
                 <button onClick={onBack} className="px-4 py-2 bg-slate-200 rounded-xl text-sm font-medium hover:bg-white transition-colors">
                    <ArrowUturnLeftIcon className="h-5 w-5 mr-2 inline" /> Back to Setup
                </button>
            </header>
            <main className="flex-grow">
                <InteractiveLoadingScreen topic={guideData.content} isSaving={false} lessonProgress={lessonProgress} />
            </main>
        </div>
    );
}