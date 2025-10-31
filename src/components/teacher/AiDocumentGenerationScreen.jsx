import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { sanitizeLessonsJson } from './sanitizeLessonText';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import mammoth from 'mammoth';
import { Dialog } from '@headlessui/react';

// PDF processing setup
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Helper function to extract text
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

// --- START OF NEW "PLANNER/GENERATOR" LOGIC ---
export default function AiDocumentGenerationScreen({ formData, onGenerationComplete, onBack }) {
    const { showToast } = useToast();
    const [progressMessage, setProgressMessage] = useState('Initializing generation...');

    // Helper: Gets all standard instructions
    const getMasterInstructions = useCallback((language, gradeLevel, subjectName) => {
        const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
        let perspectiveInstruction = '';
        if (subjectName && catholicSubjects.includes(subjectName)) {
            perspectiveInstruction = `
                **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**.
                **CRITICAL SOURCE REQUIREMENT (NON-NEGOTIBLE):** Prioritize citing and referencing official Catholic sources (CCC, Youcat, Encyclicals, etc.).
            `;
        }

        return `
            **TARGET AUDIENCE (NON-NEGOTIABLE):**
            - **Grade Level:** The entire output MUST be tailored for **${gradeLevel}** students.
            - **Language:** The entire output MUST be written in **${language}**.
            ${language === 'Filipino' ? `
            - **CRITICAL FILIPINO LANGUAGE RULE:** You are strictly forbidden from using English or any form of code-switching (Taglish). The output must be pure, academic Filipino.
            ` : ''}
            ${perspectiveInstruction}

            **CRITICAL STYLE/FORMATTING RULES (NON-NEGOTIABLE):**
            - **JSON FORMAT:** Your entire response MUST be a single, valid JSON object.
            - **MARKDOWN:** Use only pure Markdown for content. Use \`**bold**\`, \`>\` for blockquotes.
            - **LATEX:** Use \`$LaTeX_inline$\` or \`$$LaTeX_block$$\` for all math/science notation.
            - **LATEX ESCAPING:** All backslashes \`\\\` in LaTeX MUST be escaped: \`\\\\\`.
            - **QUOTE ESCAPING:** All double quotes \`"\` inside JSON strings MUST be escaped: \`\\"\`.
        `;
    }, []);

    // STAGE 1: The "Planner" call
    const generateLessonPlan = useCallback(async (sourceText, language, gradeLevel, subjectName) => {
        setProgressMessage('Step 1 of 3: Analyzing document structure...');
        const masterInstructions = getMasterInstructions(language, gradeLevel, subjectName);

        const planningPrompt = `
            You are a master curriculum planner. Your task is to read the entire source document below and break it down into a logical sequence of lessons.
            ${masterInstructions}

            **YOUR TASK:**
            Analyze the document and generate a JSON object representing the lesson plan.
            - If the document is short or about a single topic, create one lesson.
            - If the document is long or has multiple chapters/sections, create multiple lessons.
            - You MUST also create a "Unit Overview" lesson.
            
            **JSON OUTPUT STRUCTURE (NON-NEGOTIABLE):**
            {
              "plan": [
                { "title": "Unit Overview", "concepts": "A brief overview of the entire unit." },
                { "title": "Lesson 1: [Proposed Title]", "concepts": "Key topics, concepts, and sections from the source text for this lesson." },
                { "title": "Lesson 2: [Proposed Title]", "concepts": "Key topics, concepts, and sections for the next lesson." }
              ]
            }

            =============================
            SOURCE TEXT TO ANALYZE
            =============================
            ${sourceText}
        `;

        try {
            const aiResponse = await callGeminiWithLimitCheck(planningPrompt);
            const parsed = JSON.parse(aiResponse.match(/\{[\s\S]*\}/)[0]); // Simple JSON extraction
            if (!parsed.plan || parsed.plan.length === 0) {
                throw new Error("AI failed to generate a lesson plan.");
            }
            return parsed.plan;
        } catch (error) {
            console.error("Error in Stage 1 (Planner):", error);
            throw new Error("AI failed to create a lesson plan from the document.");
        }
    }, [getMasterInstructions]);

    // STAGE 2: The "Generator" call (for a single lesson)
    const generateSingleLesson = useCallback(async (
        sourceText,
        lessonPlan,
        lessonIndex,
        previousLessonContext,
        formData
    ) => {
        const {
            gradeLevel,
            language,
            subjectName,
            scaffoldInfo,
            existingLessonCount,
            learningCompetencies,
            contentStandard,
            performanceStandard
        } = formData;
        
        const masterInstructions = getMasterInstructions(language, gradeLevel, subjectName);
        const currentLessonInfo = lessonPlan[lessonIndex];
        const isOverview = currentLessonInfo.title.toLowerCase().includes('unit overview');
        const lessonNumber = existingLessonCount + (lessonIndex); // Index 0 is Overview, Index 1 is Lesson 1

        setProgressMessage(`Step 2 of 3: Generating Lesson ${lessonIndex} of ${lessonPlan.length - 1}: "${currentLessonInfo.title}"...`);

        // Build scaffolding context
        const scaffoldingInstruction = `
            **PRIMARY ANALYSIS TASK (NON-NEGOTIABLE):** Analyze all provided context below to prevent any topical repetition.
            ---
            ### CONTEXT: PREVIOUSLY COVERED MATERIAL
            **1. User-Selected Prerequisite Lessons:**
            ${scaffoldInfo.summary || "No specific prerequisite lessons were selected."}

            **2. Lessons Just Generated in this Session:**
            ${previousLessonContext || "This is the first lesson in the session."}
            ---
            ### YOUR GENERATION RULES (ABSOLUTE)
            1.  **DO NOT REPEAT:** You are strictly forbidden from re-teaching concepts from the context above.
            2.  **IDENTIFY THE GAP:** Your new lesson must address a logical "next step".
        `;

        // Create the prompt
        const generationPrompt = `
            You are an expert curriculum designer. Your task is to generate *only one* lesson based on the full source text and the provided lesson plan.
            ${masterInstructions}

            **UNIT-WIDE STANDARDS (NON-NEGOTIABLE CONTEXT):**
            - **Content Standard:** ${contentStandard || "Not provided."}
            - **Performance Standard:** ${performanceStandard || "Not provided."}
            - **Learning Competencies (Master List):** ${learningCompetencies || "Not provided."}

            ${scaffoldingInstruction}

            =============================
            FULL SOURCE TEXT (FOR CONTEXT)
            =============================
            ${sourceText}
            =============================

            **YOUR CURRENT TASK (NON-NEGOTIABLE):**
            Generate **ONLY** the lesson described below.
            - **Lesson Title:** "${currentLessonInfo.title}"
            - **Key Concepts to Cover:** "${currentLessonInfo.concepts}"
            - **Lesson Number:** ${isOverview ? '"Unit Overview"' : `Lesson ${lessonNumber}`}

            **CRITICAL INSTRUCTIONS FOR THIS LESSON:**
            1.  **CONTENT FIDELITY:** Base all content *directly* on the full source text provided above.
            2.  **ASSIGNED COMPETENCIES:** If this is *not* the Unit Overview, you MUST analyze the "Master List" and select 1-3 competencies *directly addressed* by this single lesson. Add them to the \`"assignedCompetencies"\` key.
            3.  **LEARNING OBJECTIVES:** Generate 3-5 specific objectives for this lesson (unless it's the Overview).
            4.  **LESSON STRUCTURE:** Follow the strict structure specified in the JSON.
            
            **STRICT JSON OUTPUT STRUCTURE (FOR THIS *ONE* LESSON):**
            ${isOverview ? `{
              "lessonTitle": "Unit Overview",
              "pages": [
                { "title": "Overview", "content": "..." },
                { "title": "Learning Targets", "content": "..." }
              ]
            }` : `{
              "lessonTitle": "Lesson ${lessonNumber}: ${currentLessonInfo.title}",
              "learningObjectives": ["Objective 1", "Objective 2"],
              "assignedCompetencies": ["Competency 1 from master list"],
              "pages": [
                { "title": "[Captivating Subheader]", "content": "Engaging intro for this lesson..." },
                { "title": "Let's Get Started", "content": "Warm-up activity..." },
                { "title": "[Core Content Subheader 1]", "content": "Main content for concept 1..." },
                { "title": "[Core Content Subheader 2]", "content": "Main content for concept 2..." },
                { "title": "Check for Understanding", "content": "Formative activity..." },
                { "title": "Lesson Summary", "content": "Concise recap..." },
                { "title": "Wrap Up", "content": "Motivational conclusion..." },
                { "title": "End of Lesson Assessment", "content": "8-10 questions..." },
                { "title": "Answer Key", "content": "Answers..." },
                { "title": "References", "content": "Sources..." }
              ]
            }`}
        `;

        try {
            const aiResponse = await callGeminiWithLimitCheck(generationPrompt);
            // We use sanitizeLessonsJson but expect it to find *one* lesson
            const lessonsArray = sanitizeLessonsJson(`{ "lessons": [ ${aiResponse} ] }`);
            if (!lessonsArray || lessonsArray.length === 0) {
                throw new Error("AI returned invalid data for this lesson.");
            }
            return lessonsArray[0]; // Return the single generated lesson object
        } catch (error) {
            console.error(`Error in Stage 2 (Generator) for lesson "${currentLessonInfo.title}":`, error);
            throw new Error(`AI failed to generate lesson: "${currentLessonInfo.title}".`);
        }
    }, [getMasterInstructions, sanitizeLessonsJson]);

    // This is the main function that runs the whole process
    useEffect(() => {
        const runGenerationProcess = async () => {
            if (!formData || !formData.file) {
                showToast("No file provided for generation.", "error");
                onBack(); // Go back if there's no data
                return;
            }

            let sourceText = '';
            let lessonPlan = [];
            const generatedLessons = [];
            
            try {
                // --- PRE-FLIGHT: Extract Text ---
                setProgressMessage('Step 1 of 3: Reading and extracting text from document...');
                sourceText = (await extractTextFromFile(formData.file)).replace(/₱/g, 'PHP ');

                // --- STAGE 1: Get Lesson Plan ---
                lessonPlan = await generateLessonPlan(
                    sourceText,
                    formData.language,
                    formData.gradeLevel,
                    formData.subjectName
                );
                
                // --- STAGE 2: Loop and Generate Lessons ---
                let previousLessonContext = "";
                for (let i = 0; i < lessonPlan.length; i++) {
                    const lesson = await generateSingleLesson(
                        sourceText,
                        lessonPlan,
                        i,
                        previousLessonContext,
                        formData
                    );
                    
                    generatedLessons.push(lesson);
                    
                    // Update context for the *next* lesson
                    const summary = lesson.pages.find(p => p.title.toLowerCase().includes('summary'))?.content || 'No summary.';
                    previousLessonContext += `\n- ${lesson.lessonTitle}: ${summary.substring(0, 100)}...`;
                }
                
                // --- FINAL: Success ---
                setProgressMessage('Generation complete!');
                showToast(`Successfully generated ${generatedLessons.length} lessons!`, "success");
                onGenerationComplete({ lessons: generatedLessons, failed: false });

            } catch (err) {
                console.error('Full generation process failed:', err);
                const errorMsg = err.message.includes('overloaded')
                    ? 'The AI service is currently busy. Please try again.'
                    : err.message || 'An unknown error occurred during generation.';
                showToast(errorMsg, "error", 10000);
                // Pass back any lessons that *did* complete, plus the error
                onGenerationComplete({ lessons: generatedLessons, failed: true, error: errorMsg });
            }
        };

        runGenerationProcess();
    }, [formData, onGenerationComplete, onBack, showToast, generateLessonPlan, generateSingleLesson]);

    return (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0 pb-4 border-b border-neumorphic-shadow-dark/20">
                <div className="flex justify-between items-center mb-2">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800">Generating Lessons</Dialog.Title>
                    <button type="button" onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                </div>
                 <p className="text-slate-500">
                    The AI is structuring your document. This may take a moment.
                </p>
            </header>
            <main className="flex-grow flex flex-col items-center justify-center p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset">
                <Spinner/>
                <p className="text-sm font-semibold text-slate-700 mt-4 text-center">{progressMessage}</p>
            </main>
        </div>
    );
}