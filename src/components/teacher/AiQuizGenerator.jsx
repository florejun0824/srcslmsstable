import React, { useState, useRef } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { Dialog } from '@headlessui/react';
import { 
    ArrowUturnLeftIcon, 
    DocumentArrowUpIcon, 
    DocumentTextIcon, 
    XMarkIcon, 
    SparklesIcon,
    BoltIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
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
    const [progressPercent, setProgressPercent] = useState(0);

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
            return result.value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
        } else if (fileToProcess.type === 'text/plain') {
            return await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }
    };

    // --- ROBUST JSON PARSER ---
    const sanitizeJsonComponent = (aiResponse) => {
        try {
            let jsonString = aiResponse;
            // Attempt to extract JSON if wrapped in markdown code blocks
            const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
            if (markdownMatch && markdownMatch[2]) jsonString = markdownMatch[2];

            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) throw new Error('No JSON found.');

            const validJsonString = jsonString.substring(startIndex, endIndex + 1);
            return JSON.parse(validJsonString);
        } catch (error) {
            console.error("JSON Parse Error:", error);
            console.log("Raw AI Response:", aiResponse);
            throw new Error(`AI response was not valid JSON.`);
        }
    };

    // --- CHUNKED GENERATION LOGIC ---
    const handleGenerateQuiz = async () => {
        if (!file) return setError('Please upload a file first.');
        setIsProcessing(true);
        setError('');
        setProgressPercent(10);

        try {
            // 1. Extract Text
            setProgressMessage('Extracting text content...');
            const fullText = await extractTextFromFile(file);
            if (fullText.length < 50) throw new Error("File content is too short.");
            
            setProgressPercent(30);

            // 2. Strategy: Chunking
            // We split the text into chunks of ~4000 characters to avoid timeouts.
            const chunkSize = 4000;
            const chunks = [];
            for (let i = 0; i < fullText.length; i += chunkSize) {
                chunks.push(fullText.substring(i, i + chunkSize));
            }

            let accumulatedQuestions = [];
            let quizTitle = "AI Generated Quiz";

            // 3. Process Chunks Sequentially
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const isFirstChunk = i === 0;
                const currentProgress = 30 + Math.round(((i + 1) / chunks.length) * 60);
                
                setProgressPercent(currentProgress);
                setProgressMessage(`Analyzing section ${i + 1} of ${chunks.length}...`);

                const prompt = `
                You are an expert Assessment Specialist and Mathematician/Scientist.
                
                **TASK:** Extract questions from the text chunk below.
                ${isFirstChunk ? "Also, extract a suitable 'title' for the quiz from this first section." : "Do NOT generate a title, just return questions."}

                **FORMATTING RULES FOR MATH & SCIENCE (CRITICAL):**
                1.  **LaTeX:** Use LaTeX syntax for ALL math equations, chemical formulas, fractions, scientific notation, and temperature.
                2.  **Wrappers:** Wrap all LaTeX in single dollar signs ($...$).
                3.  **JSON Escaping:** Because you are outputting JSON, you MUST **double-escape** all backslashes.
                    - **Fractions:** Write \`$\\frac{1}{2}$\` as \`"$\\\\frac{1}{2}$"\`
                    - **Exponents:** Write \`$x^2$\` as \`"$x^{2}$"\`
                    - **Subscripts (Chemistry):** Write \`$H_2O$\` as \`"$H_{2}O$"\`
                    - **Temperature:** Write \`$25\degree C$\` as \`"$25\\\\degree C$"\` or \`"$25^\\\\circ C$"\`
                    - **Symbols:** \`$\\\\pi$\`, \`$\\\\rightarrow$\`, \`$\\\\approx$\`

                **TEXT CHUNK TO ANALYZE:**
                ---
                ${chunk}
                ---

                **JSON OUTPUT FORMAT (Strict):**
                {
                  ${isFirstChunk ? '"title": "Extracted Title",' : ''}
                  "questions": [
                    {
                      "text": "Question stem with math like $\\\\frac{x}{y}$...",
                      "type": "multiple-choice | true-false | identification | matching-type | essay",
                      "points": 1,
                      "explanation": "Rationale...",
                      // TYPE SPECIFIC FIELDS:
                      "options": ["Option A", "Option B", "Option C", "Option D"], // For multiple-choice
                      "correctAnswerIndex": 0,
                      "correctAnswer": true, // For True/False
                      "correctAnswer": "String", // For Identification
                      // Matching Type:
                      "prompts": [{"id": "p1", "text": "A"}],
                      "options": [{"id": "o1", "text": "B"}],
                      "correctPairs": {"p1": "o1"}
                    }
                  ]
                }
                
                **RULES:**
                - Only return valid JSON.
                - If a question is cut off at the end of the text, IGNORE IT.
                `;

                try {
                    const aiResponse = await callGeminiWithLimitCheck(prompt);
                    const parsed = sanitizeJsonComponent(aiResponse);
                    
                    if (isFirstChunk && parsed.title) quizTitle = parsed.title;
                    if (parsed.questions && Array.isArray(parsed.questions)) {
                        accumulatedQuestions = [...accumulatedQuestions, ...parsed.questions];
                    }
                } catch (e) {
                    console.warn(`Chunk ${i + 1} failed, skipping...`, e);
                }
            }

            if (accumulatedQuestions.length === 0) throw new Error("No questions could be generated.");

            // 4. Final Cleanup & Sanitize
            setProgressMessage('Finalizing quiz structure...');
            const finalQuizData = {
                title: quizTitle,
                questions: accumulatedQuestions.map(q => {
                    // Ensure IDs for matching type
                    if (q.type === 'matching-type') {
                        if (!q.prompts || !q.options) return null; // Skip invalid matching
                        // We trust the AI IDs if present, else we skip to avoid breaking logic
                    }
                    // Ensure options for MC
                    if (q.type === 'multiple-choice' && (!q.options || q.options.length < 2)) {
                        return null; // Skip invalid MC
                    }
                    return q;
                }).filter(Boolean)
            };

            showToast(`Generated ${finalQuizData.questions.length} questions!`, 'success');
            onAiComplete(finalQuizData);

        } catch (err) {
            console.error('Quiz Gen Error:', err);
            setError('Failed to generate quiz. Please ensure the file contains clear text.');
        } finally {
            setIsProcessing(false);
            setProgressPercent(0);
        }
    };

    // --- UI CONSTANTS (macOS 26) ---
    const panelClass = "bg-white/60 dark:bg-[#1e1e1e]/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[24px] shadow-2xl shadow-black/5";

    return (
        <div className="flex flex-col h-full bg-[#f5f5f7] dark:bg-[#121212] font-sans text-slate-900 dark:text-white overflow-hidden">
            
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between bg-white/70 dark:bg-[#1e1e1e]/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <SparklesIcon className="w-5 h-5 text-white stroke-[2]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight leading-tight">AI Quiz Creator</h3>
                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">Upload content to generate assessments</p>
                    </div>
                </div>
                <button onClick={onBack} className="px-4 py-2 rounded-[20px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[13px] font-semibold transition-all flex items-center gap-2 backdrop-blur-md active:scale-95">
                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-[2.5]" /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 relative z-0">
                
                {/* Animated Background Blobs */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000" />

                <div className={`w-full max-w-2xl ${panelClass} p-8 relative z-10`}>
                    
                    {/* Processing View */}
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500">
                            {/* Custom Circular Progress */}
                            <div className="relative w-24 h-24 mb-6">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-200 dark:text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className="text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500 ease-out" strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <BoltIcon className="w-8 h-8 animate-pulse" />
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analyzing Content</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{progressMessage}</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upload Source Material</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    Supports PDF, DOCX, and TXT files.<br/>
                                    <span className="opacity-75 text-xs">Includes support for Math Equations, Chemistry Formulas, and Scientific Notation.</span>
                                </p>
                            </div>

                            {/* Drop Zone */}
                            {!file ? (
                                <label className="group flex flex-col items-center justify-center w-full h-64 rounded-[24px] border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-white/5 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 hover:border-indigo-400 transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.99]">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                                    
                                    <div className="p-4 rounded-full bg-white dark:bg-white/10 shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-black/5">
                                        <DocumentArrowUpIcon className="w-10 h-10 text-indigo-500 dark:text-indigo-400 stroke-[1.5]" />
                                    </div>
                                    
                                    <span className="text-lg font-bold text-slate-700 dark:text-slate-200">Click or Drag File Here</span>
                                    <span className="text-sm text-slate-400 mt-1 font-medium">PDF, DOCX, TXT</span>
                                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="relative flex items-center p-5 bg-white dark:bg-[#2C2C2E] rounded-[24px] shadow-lg border border-black/5 dark:border-white/10 group animate-in fade-in zoom-in duration-300">
                                    <div className="w-14 h-14 rounded-[18px] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
                                        <DocumentTextIcon className="w-8 h-8 stroke-[1.5]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                {file.name.split('.').pop()}
                                            </span>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{(file.size/1024).toFixed(0)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={removeFile} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-90">
                                        <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                                    </button>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="mt-4 p-3 rounded-[16px] bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 flex items-center gap-3 animate-in slide-in-from-top-2">
                                    <div className="p-1.5 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-400">
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-8 flex justify-end gap-4">
                                {file && (
                                    <button 
                                        onClick={handleGenerateQuiz} 
                                        className="w-full py-3.5 rounded-[18px] font-bold text-[15px] text-white bg-[#007AFF] hover:bg-[#0062CC] shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                                    >
                                        <SparklesIcon className="w-5 h-5 transition-transform group-hover:rotate-12" />
                                        Generate Quiz
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}