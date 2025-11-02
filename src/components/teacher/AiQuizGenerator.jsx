import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext'; // Adjust path
import { callGeminiWithLimitCheck } from '../../services/aiService'; // Adjust path

import { Dialog } from '@headlessui/react';
import { ArrowUturnLeftIcon, DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner'; // Adjust path
import mammoth from 'mammoth';

// PDF processing setup
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Simple unique ID generator for matching type
const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

export default function AiQuizGenerator({ onBack, onAiComplete }) {
    const { showToast } = useToast();
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    const extractTextFromFile = async (fileToProcess) => {
        if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                // Preserve line breaks better
                text += content.items.map((item) => item.str).join(item => item.hasEOL ? '\n' : ' ') + '\n';
            }
            return text;
        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // Use a different extractor that preserves paragraphs
            const arrayBuffer = await fileToProcess.arrayBuffer();
            // mammoth.extractRawText strips all structure. 
            // We'll use the default converter which tries to keep paragraphs.
            const result = await mammoth.convertToHtml({ arrayBuffer });
            // Convert simple HTML to text to keep structure
            const simpleText = result.value
                .replace(/<p>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]+>/g, ' ') // strip other tags
                .replace(/&nbsp;/g, ' ')
                .trim();
            return simpleText;
        } else if (fileToProcess.type === 'text/plain') {
            return await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    /**
     * Sanitizes the AI-generated quiz data.
     * (No changes needed here, it just passes strings along)
     */
    const sanitizeAiQuizData = (data) => {
        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error("AI response was missing the 'questions' array.");
        }

        const sanitizedQuestions = data.questions.map(q => {
            let sanitizedQ = { ...q };
            sanitizedQ.points = Number(sanitizedQ.points) || 1;
            sanitizedQ.explanation = sanitizedQ.explanation || '';

            if (sanitizedQ.type === 'matching-type') {
                const newPrompts = (sanitizedQ.prompts || []).map(p => ({ id: uniqueId(), text: p.text || '' }));
                const newOptions = (sanitizedQ.options || []).map(o => ({ id: uniqueId(), text: o.text || '' }));
                const newCorrectPairs = {};
                if (sanitizedQ.correctPairs) {
                    newPrompts.forEach((newPrompt, index) => {
                        const oldPromptId = sanitizedQ.prompts[index]?.id;
                        const oldOptionId = sanitizedQ.correctPairs[oldPromptId];
                        if (oldOptionId) {
                            const oldOptionIndex = sanitizedQ.options.findIndex(o => o.id === oldOptionId);
                            if (oldOptionIndex !== -1) {
                                newCorrectPairs[newPrompt.id] = newOptions[oldOptionIndex]?.id;
                            }
                        }
                    });
                }
                sanitizedQ.prompts = newPrompts;
                sanitizedQ.options = newOptions;
                sanitizedQ.correctPairs = newCorrectPairs;
                sanitizedQ.points = sanitizedQ.prompts.length;
            }
            if (sanitizedQ.type === 'multiple-choice') {
                 sanitizedQ.correctAnswerIndex = Number(sanitizedQ.correctAnswerIndex) || 0;
                 if(!sanitizedQ.options || sanitizedQ.options.length === 0) {
                    sanitizedQ.options = ["Option A", "Option B", "Option C", "Option D"];
                 }
            }
            if(sanitizedQ.type === 'true-false') {
                sanitizedQ.correctAnswer = !!sanitizedQ.correctAnswer;
            }
            if(sanitizedQ.type === 'identification') {
                sanitizedQ.correctAnswer = sanitizedQ.correctAnswer || "Answer";
            }
            if (sanitizedQ.type === 'essay') {
                if (!sanitizedQ.rubric || !Array.isArray(sanitizedQ.rubric) || sanitizedQ.rubric.length === 0) {
                    const existingPoints = Number(sanitizedQ.points) || 0;
                    if (existingPoints > 0) {
                        sanitizedQ.rubric = [
                            { id: uniqueId(), criteria: 'Content and Accuracy', points: existingPoints }
                        ];
                    } else {
                        sanitizedQ.rubric = [
                            { id: uniqueId(), criteria: 'Clarity and Coherence', points: 5 },
                            { id: uniqueId(), criteria: 'Relevance to Prompt', points: 5 }
                        ];
                    }
                }
                let rubricTotalPoints = 0;
                sanitizedQ.rubric = sanitizedQ.rubric.map(item => {
                    const points = Number(item.points) || 0;
                    rubricTotalPoints += points;
                    return {
                        id: item.id || uniqueId(),
                        criteria: item.criteria || 'Unnamed Criteria',
                        points: points
                    };
                });
                sanitizedQ.points = rubricTotalPoints;
            }
            return sanitizedQ;
        });
        return {
            title: data.title || 'AI Generated Quiz',
            questions: sanitizedQuestions
        };
    };

    const handleGenerateQuiz = async () => {
        if (!file) {
            setError('Please upload a file first.');
            return;
        }
        setIsProcessing(true);
        setError('');

        try {
            setProgressMessage('Step 1 of 3: Reading file...');
            let extractedText = await extractTextFromFile(file);

            setProgressMessage('Step 2 of 3: Generating quiz with AI...');

            // --- MODIFIED: Updated the entire prompt ---
            const finalPrompt = `
            You are an expert quiz designer. Your task is to parse the provided text and convert it into a structured quiz in JSON format.
            You MUST adhere to the following JSON structure exactly.

            **CRITICAL JSON STRUCTURE:**
            {
              "title": "A concise title for the quiz based on the text",
              "questions": [
                {
                  "text": "The text of the question...",
                  "type": "multiple-choice | true-false | identification | matching-type | essay",
                  "points": 1,
                  "explanation": "A brief explanation for the correct answer (if present in the source).",
                  
                  // For "multiple-choice"
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswerIndex": 0,
                  
                  // For "true-false"
                  "correctAnswer": true, 
                  
                  // For "identification"
                  "correctAnswer": "The Exact Answer",
                  
                  // For "matching-type"
                  "prompts": [
                    { "id": "p1", "text": "Prompt 1 text..." },
                    { "id": "p2", "text": "Prompt 2 text..." }
                  ],
                  "options": [
                    { "id": "o1", "text": "Option A text..." },
                    { "id": "o2", "text": "Option B text..." },
                    { "id": "o3", "text": "Option C text..." }
                  ],
                  "correctPairs": {
                    "p1": "o2",
                    "p2": "o1"
                  },

                  // For "essay"
                  "text": "The essay prompt...",
                  "type": "essay",
                  "points": 10,
                  "rubric": [
                    { "id": "r1", "criteria": "Clarity", "points": 5 },
                    { "id": "r2", "criteria": "Relevance", "points": 5 }
                  ],
                  "explanation": "Optional explanation of a model answer."
                }
              ]
            }

            **RULES:**
            1.  **Use Headers:** The source text may contain headers like "IDENTIFICATION", "ESSAY", or "MATCHING TYPE". Use these headers as strong clues to determine the 'type' for all questions that follow, until a new header is found.
            2.  **Determine Type:** Correctly identify the question type based on the text and headers.
            3.  **Extract Answers:** Find the correct answer for each question.
            4.  **Extract Explanations:** If the text provides a rationale, add it to the 'explanation' field.
            5.  **Matching Type:**
                -   'prompts' are the items in Column A.
                -   'options' are the items in Column B. You MUST include distractors (more options than prompts).
                -   'correctPairs' maps the 'id' of a prompt to the 'id' of its correct option.
                -   'points' for matching-type MUST equal the number of prompts.
            6.  **Essay & Rubrics (CRITICAL):**
                * **Step A: Detect Rubric Type:** Look for the rubric.
                    * **Analytic Rubric:** If the text lists criteria with *specific* points (e.g., "Clarity: 5 points", "Relevance: 5 points"), parse this directly into the 'rubric' array.
                    * **Holistic Rubric:** If the text describes *point ranges* or *levels* (e.g., "37-40: Excellent...", "33-36: Good..."), this is a HOLISTIC rubric.
                * **Step B: Handle Rubric:**
                    * **If Analytic:** Parse it as-is.
                    * **If Holistic:**
                        1.  Find the *total points* for the essay (e.g., the "40" in "37-40").
                        2.  Read the *description for the highest level*.
                        3.  Based on that description, *invent* a new ANALYTIC rubric.
                        4.  You MUST distribute the total points intelligently among the new criteria you invented.
                    * **If No Rubric is Found:**
                        1.  Look for total points (e.g., "Essay (15 points)"). If found, generate: \`[{ "id": "r1", "criteria": "Content and Accuracy", "points": 15 }]\`.
                        2.  If no rubric AND no points are found, generate a standard 10-point default rubric.
                * **Step C: Final Check:** The 'points' field for the essay question MUST equal the sum of all points in its 'rubric' array.
            
            7.  **--- NEW RULE: MATH & SYMBOLS ---**
                * If you encounter any mathematical equations, chemical formulas, or scientific notation, you **MUST** format them using LaTeX.
                * Use single dollar signs (\`$...\`) for inline math (e.g., \`$E = mc^2$\` or \`$H_2O$\`).
                * Use double dollar signs (\`$$...$$\`) for block-level equations.
                * This applies to all "text" fields: question "text", "options" text, "prompts" text, and "explanation".

            8.  **JSON ONLY:** Your entire response MUST be a single, valid JSON object. Do not include \`\`\`json or any text outside the JSON block.
            9.  **ESCAPE QUOTES:** All double quotes (") inside JSON string values MUST be escaped (\\").

            **SOURCE TEXT:**
            ---
            ${extractedText}
            ---
            `;
            // --- END MODIFIED PROMPT ---

            const aiResponse = await callGeminiWithLimitCheck(finalPrompt);
            
            setProgressMessage('Step 3 of 3: Parsing and validating quiz...');
            
            let cleanedResponse = aiResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.substring(7);
            }
            if (cleanedResponse.endsWith('```')) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
            }

            const parsedData = JSON.parse(cleanedResponse);
            const sanitizedData = sanitizeAiQuizData(parsedData);
            
            showToast('AI processing complete! Review and save.', 'success');
            onAiComplete(sanitizedData); // Send data to parent

        } catch (err) {
            console.error('Quiz generation error:', err);
            setError(err.message.includes('overloaded')
                ? 'The AI service is currently busy. Please try again.'
                : 'The AI returned an invalid response or file was unreadable. Please check the file or try again.'
            );
        } finally {
            setIsProcessing(false);
            setProgressMessage('');
            setFile(null);
        }
    };
    

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* --- MODIFIED: Added dark theme border --- */}
            <div className="flex-shrink-0 pb-4 border-b border-neumorphic-shadow-dark/20 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    {/* --- MODIFIED: Added dark theme text --- */}
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800 dark:text-slate-100">Generate Quiz from File</Dialog.Title>
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset dark:text-slate-400 dark:hover:shadow-neumorphic-inset-dark">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                        Back
                    </button>
                </div>
                 {/* --- MODIFIED: Added dark theme text --- */}
                 <p className="text-slate-500 dark:text-slate-400">
                    Upload a file and AI will parse it into the quiz editor for your review.
                </p>
            </div>

            <div className="flex-grow pt-4 overflow-hidden flex flex-col gap-6">
                {isProcessing ? (
                    // --- MODIFIED: Added dark theme styles ---
                    <div className="w-full flex-grow flex flex-col items-center justify-center p-4 rounded-2xl bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                        <Spinner/>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4">{progressMessage}</p>
                    </div>
                ) : (
                    <>
                        {!file ? (
                            // --- MODIFIED: Added dark theme styles ---
                            <label htmlFor="file-upload" className="relative flex-grow block w-full rounded-2xl p-8 text-center cursor-pointer transition-shadow duration-300 bg-neumorphic-base shadow-neumorphic-inset hover:shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:hover:shadow-lg">
                                <div className="flex flex-col items-center justify-center h-full">
                                    {/* --- MODIFIED: Added dark theme icon --- */}
                                    <DocumentArrowUpIcon className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-600" />
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <span className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Click to upload or drag & drop
                                    </span>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-500">
                                        PDF, DOCX, or TXT
                                    </span>
                                </div>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                            </label>
                        ) : (
                            // --- MODIFIED: Added dark theme styles ---
                            <div className="relative w-full flex-grow rounded-2xl p-4 shadow-neumorphic flex flex-col justify-center dark:bg-neumorphic-base-dark dark:shadow-lg">
                                <div className="flex items-center gap-4">
                                    {/* --- MODIFIED: Added dark theme icon --- */}
                                    <DocumentTextIcon className="h-12 w-12 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        {/* --- MODIFIED: Added dark theme text --- */}
                                        <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{file.name}</p>
                                        {/* --- MODIFIED: Added dark theme text --- */}
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{Math.round(file.size / 1024)} KB</p>
                                    </div>
                                </div>
                                {/* --- MODIFIED: Added dark theme styles --- */}
                                <button onClick={removeFile} className="absolute top-3 right-3 p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors">
                                    {/* --- MODIFIED: Added dark theme icon --- */}
                                    <XMarkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                </button>
                            </div>
                        )}
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                            The uploaded file is processed by AI and is **never** stored on our servers or your device.
                        </p>
                    </>
                )}
            </div>

            {/* --- MODIFIED: Added dark theme border --- */}
            <div className="flex-shrink-0 flex justify-end items-center gap-3 pt-6 mt-4 border-t border-neumorphic-shadow-dark/20 dark:border-slate-700">
                {/* --- MODIFIED: Added dark theme text --- */}
                {error && <p className="text-red-500 dark:text-red-400 text-sm mr-auto">{error}</p>}
                <button 
                    onClick={handleGenerateQuiz} 
                    disabled={!file || isProcessing} 
                    // --- MODIFIED: Added dark theme styles ---
                    className="w-full flex items-center justify-center font-semibold bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl py-3 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60
                               dark:from-sky-700 dark:to-blue-800 dark:text-sky-100 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    {isProcessing ? 'Processing...' : 'Generate & Review Quiz'}
                </button>
            </div>
        </div>
    );
}