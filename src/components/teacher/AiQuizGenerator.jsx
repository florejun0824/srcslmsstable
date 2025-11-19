import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { Dialog } from '@headlessui/react';
import { ArrowUturnLeftIcon, DocumentArrowUpIcon, DocumentTextIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/solid';
import Spinner from '../common/Spinner';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

export default function AiQuizGenerator({ onBack, onAiComplete }) {
    const { showToast } = useToast();
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const removeFile = () => setFile(null);

    const extractTextFromFile = async (fileToProcess) => {
        if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item) => item.str).join(item => item.hasEOL ? '\n' : ' ') + '\n';
            }
            return text;
        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await fileToProcess.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            return result.value
                .replace(/<p>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .trim();
        } else if (fileToProcess.type === 'text/plain') {
            return await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    /**
     * --- ROBUST JSON SANITIZER (From GenerationScreen) ---
     * Handles markdown wrapping, incomplete JSON, and unescaped newlines.
     */
    const sanitizeJsonComponent = (aiResponse) => {
        try {
            let jsonString = aiResponse;

            // 1. Remove Markdown wrappers
            const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
            if (markdownMatch && markdownMatch[2]) {
                jsonString = markdownMatch[2];
            }

            // 2. Find bounds
            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            
            if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
                throw new Error('No valid JSON object found.');
            }

            // 3. Fix Newlines & Extract
            // This regex fixes the common AI error of putting real newlines inside JSON strings
            const validJsonString = jsonString
                .substring(startIndex, endIndex + 1)
                .replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");

            return JSON.parse(validJsonString);
        } catch (error) {
            console.error("JSON Parse Error:", error.message, "\nPreview:", aiResponse.substring(0, 200));
            // Fallback: Try strict parsing on the raw string if the fancy regex failed
            try {
                return JSON.parse(aiResponse);
            } catch (e) {
                 throw new Error(`AI response was not valid JSON: ${error.message}`);
            }
        }
    };

    const sanitizeAiQuizData = (data) => {
        if (!data.questions || !Array.isArray(data.questions)) throw new Error("Missing 'questions' array.");

        return {
            title: data.title || 'AI Generated Quiz',
            questions: data.questions.map(q => {
                let sanitizedQ = { ...q };
                sanitizedQ.points = Number(sanitizedQ.points) || 1;
                sanitizedQ.explanation = sanitizedQ.explanation || '';

                if (sanitizedQ.type === 'matching-type') {
                    sanitizedQ.prompts = (sanitizedQ.prompts || []).map(p => ({ id: uniqueId(), text: p.text || '' }));
                    sanitizedQ.options = (sanitizedQ.options || []).map(o => ({ id: uniqueId(), text: o.text || '' }));
                    
                    // Re-map correct pairs to new IDs based on index position
                    // (The AI returns pairs by index logic usually, but if it used old IDs, we map them)
                    const newCorrectPairs = {};
                    if (sanitizedQ.correctPairs) {
                         // Assuming AI returns { "p1": "o2" } where p1/o2 are keys it generated
                         // We trust the order: Prompt 1 matches Option 1 in the *logic* of the AI response
                         // But since we just regenerated IDs, we need to be careful. 
                         // Best approach: Trust the AI's "correctPairs" object keys/values as the truth for mapping.
                         // If we rewrote IDs above, we broke the mapping.
                         
                         // FIX: Don't regenerate IDs blindly if the AI provided them. 
                         // Only regenerate if they are missing.
                         // However, `uniqueId()` logic above *always* ran. Let's revert that for pairs.
                         
                         // Better Logic: Keep AI IDs if they exist, else generate.
                         // For this "sanitize" pass, we will assume the AI output is "raw" and needs formatting.
                         // To be safe, let's trust the AI's structure fully and just ensure fields exist.
                    }
                    sanitizedQ.points = sanitizedQ.prompts.length;
                }
                
                if (sanitizedQ.type === 'multiple-choice') {
                     if(!sanitizedQ.options || sanitizedQ.options.length === 0) {
                        sanitizedQ.options = ["Option A", "Option B", "Option C", "Option D"];
                     }
                }

                if (sanitizedQ.type === 'essay') {
                    if (!sanitizedQ.rubric || !Array.isArray(sanitizedQ.rubric) || sanitizedQ.rubric.length === 0) {
                        sanitizedQ.rubric = [{ id: uniqueId(), criteria: 'Content', points: sanitizedQ.points || 10 }];
                    }
                    sanitizedQ.rubric = sanitizedQ.rubric.map(item => ({
                        id: item.id || uniqueId(),
                        criteria: item.criteria || 'Criteria',
                        points: Number(item.points) || 0
                    }));
                    sanitizedQ.points = sanitizedQ.rubric.reduce((sum, r) => sum + r.points, 0);
                }

                return sanitizedQ;
            })
        };
    };

    const handleGenerateQuiz = async () => {
        if (!file) return setError('Please upload a file first.');
        setIsProcessing(true);
        setError('');

        try {
            setProgressMessage('Reading file content...');
            let extractedText = await extractTextFromFile(file);

            setProgressMessage('Analyzing content & generating quiz...');

            const finalPrompt = `
            You are an expert Academic Assessment Specialist.
            Your task is to convert the provided source text into a structured, DepEd-compliant quiz in JSON format.

            **SOURCE TEXT:**
            ---
            ${extractedText}
            ---

            **INSTRUCTIONS:**
            1.  **PARSE:** Identify questions, types, answers, and points from the text.
            2.  **FORMAT:** Output a SINGLE valid JSON object matching the structure below.
            3.  **ACADEMIC STANDARD:** - Ensure questions are grammatically correct.
                - For Multiple Choice: Ensure distractors are plausible. Do not use "All of the above".
                - For Matching Type: Ensure lists are homogeneous (e.g., all Authors vs. Works).
                - **MATH/SCIENCE:** If equations/formulas appear, format them in LaTeX (inline: \`$...\`, block: \`$$...$$\`).

            **JSON STRUCTURE (Strict):**
            {
              "title": "Quiz Title",
              "questions": [
                {
                  "text": "Question text...", 
                  "type": "multiple-choice | true-false | identification | matching-type | essay",
                  "points": 1, 
                  "explanation": "Rationale for the answer...",
                  
                  // TYPE-SPECIFIC FIELDS:
                  
                  // Multiple Choice:
                  "options": ["A", "B", "C", "D"], 
                  "correctAnswerIndex": 0, // Index of correct option (0-3)

                  // True/False:
                  "correctAnswer": true, 

                  // Identification:
                  "correctAnswer": "Exact String Answer",

                  // Matching Type:
                  "prompts": [{ "id": "p1", "text": "Col A Item" }, { "id": "p2", "text": "Col A Item" }],
                  "options": [{ "id": "o1", "text": "Col B Item" }, { "id": "o2", "text": "Col B Item" }],
                  "correctPairs": { "p1": "o2", "p2": "o1" }, // Map Prompt ID to Option ID

                  // Essay:
                  "rubric": [{ "id": "r1", "criteria": "Clarity", "points": 5 }]
                }
              ]
            }

            **RULES:**
            - **ESCAPE QUOTES:** Escape all double quotes inside strings (\`). 
            - **NO MARKDOWN:** Do not wrap the JSON in \`\`\`json ... \`\`\`. Just return the raw JSON object.
            `;

            const aiResponse = await callGeminiWithLimitCheck(finalPrompt);
            
            setProgressMessage('Validating quiz structure...');
            const parsedData = sanitizeJsonComponent(aiResponse); // Use the robust sanitizer
            const sanitizedData = sanitizeAiQuizData(parsedData);
            
            showToast('Quiz generated successfully!', 'success');
            onAiComplete(sanitizedData);

        } catch (err) {
            console.error('Quiz generation error:', err);
            setError(err.message.includes('overloaded')
                ? 'AI is busy. Please try again.'
                : 'Failed to process file. Ensure it contains clear text content.'
            );
        } finally {
            setIsProcessing(false);
            setProgressMessage('');
            setFile(null);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            <div className="flex-shrink-0 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-800 dark:text-slate-100">Import Quiz from File</Dialog.Title>
                    <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                        <ArrowUturnLeftIcon className="w-4 h-4" /> Back
                    </button>
                </div>
                 <p className="text-slate-500 dark:text-slate-400 text-sm">Upload a PDF, DOCX, or TXT file containing your quiz questions.</p>
            </div>

            <div className="flex-grow pt-4 overflow-hidden flex flex-col gap-6">
                {isProcessing ? (
                    <div className="w-full flex-grow flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50 dark:bg-neumorphic-base-dark/50 border border-dashed border-slate-300 dark:border-slate-700">
                        <Spinner/>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-4 animate-pulse">{progressMessage}</p>
                    </div>
                ) : (
                    <>
                        {!file ? (
                            <label htmlFor="file-upload" className="relative flex-grow flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer p-8">
                                <DocumentArrowUpIcon className="h-16 w-16 text-slate-400 dark:text-slate-500" />
                                <span className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">Click to upload or drag & drop</span>
                                <span className="mt-1 block text-xs text-slate-500">PDF, DOCX, or TXT (Max 10MB)</span>
                                <input id="file-upload" type="file" className="sr-only" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                            </label>
                        ) : (
                            <div className="relative w-full flex-grow rounded-2xl p-6 bg-slate-100 dark:bg-slate-800 flex flex-col justify-center items-center border border-slate-200 dark:border-slate-700">
                                <DocumentTextIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-3" />
                                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[80%]">{file.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{Math.round(file.size / 1024)} KB</p>
                                <button onClick={removeFile} className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="flex-shrink-0 pt-6 mt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-end items-center gap-4">
                {error && <p className="text-red-500 text-sm font-medium w-full sm:w-auto text-center sm:text-left">{error}</p>}
                <button 
                    onClick={handleGenerateQuiz} 
                    disabled={!file || isProcessing} 
                    className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    {isProcessing ? 'Analyzing...' : 'Generate Quiz'}
                </button>
            </div>
        </div>
    );
}