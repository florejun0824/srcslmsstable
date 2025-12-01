import React, { useState, useMemo } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext'; // 1. Import Theme Context
import { callGeminiWithLimitCheck } from '../../services/aiService';
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

export default function AiQuizGenerator({ onBack, onAiComplete }) {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); // 2. Get Active Overlay
    
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);

    // --- MONET THEME GENERATOR ---
    const themeStyles = useMemo(() => {
        switch (activeOverlay) {
            case 'christmas':
                return {
                    bgGradient: 'bg-red-950/20',
                    panelBg: 'bg-[#0f291e]/80',
                    borderColor: 'border-green-500/30',
                    textColor: 'text-red-100',
                    subText: 'text-green-200/70',
                    accentColor: 'text-red-400',
                    buttonGradient: 'from-red-700 to-green-800',
                    iconBg: 'bg-green-900/30',
                    progressColor: 'text-red-500',
                    uploadBorder: 'border-green-500/40 hover:border-red-500/60'
                };
            case 'valentines':
                return {
                    bgGradient: 'bg-pink-950/20',
                    panelBg: 'bg-[#2a0a12]/80',
                    borderColor: 'border-pink-500/30',
                    textColor: 'text-pink-100',
                    subText: 'text-pink-200/70',
                    accentColor: 'text-pink-400',
                    buttonGradient: 'from-pink-600 to-rose-600',
                    iconBg: 'bg-pink-900/30',
                    progressColor: 'text-pink-500',
                    uploadBorder: 'border-pink-500/40 hover:border-rose-500/60'
                };
            case 'cyberpunk':
                return {
                    bgGradient: 'bg-purple-950/20',
                    panelBg: 'bg-[#180a2e]/80',
                    borderColor: 'border-cyan-500/40',
                    textColor: 'text-cyan-50',
                    subText: 'text-fuchsia-200/70',
                    accentColor: 'text-cyan-400',
                    buttonGradient: 'from-fuchsia-600 to-cyan-600',
                    iconBg: 'bg-fuchsia-900/30',
                    progressColor: 'text-cyan-400',
                    uploadBorder: 'border-fuchsia-500/40 hover:border-cyan-400'
                };
            case 'graduation':
                return {
                    bgGradient: 'bg-yellow-950/20',
                    panelBg: 'bg-[#1a1600]/80',
                    borderColor: 'border-yellow-500/30',
                    textColor: 'text-yellow-50',
                    subText: 'text-yellow-200/70',
                    accentColor: 'text-yellow-400',
                    buttonGradient: 'from-yellow-600 to-amber-700',
                    iconBg: 'bg-yellow-900/30',
                    progressColor: 'text-yellow-500',
                    uploadBorder: 'border-yellow-500/40 hover:border-amber-500'
                };
            default: // Standard
                return {
                    bgGradient: 'bg-[#f5f5f7] dark:bg-[#121212]',
                    panelBg: 'bg-white/60 dark:bg-[#1e1e1e]/60',
                    borderColor: 'border-white/20 dark:border-white/10',
                    textColor: 'text-slate-900 dark:text-white',
                    subText: 'text-slate-500 dark:text-slate-400',
                    accentColor: 'text-indigo-500',
                    buttonGradient: 'bg-[#007AFF] hover:bg-[#0062CC]', // Standard Blue
                    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
                    progressColor: 'text-indigo-500',
                    uploadBorder: 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                };
        }
    }, [activeOverlay]);

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

    const sanitizeJsonComponent = (aiResponse) => {
        try {
            let jsonString = aiResponse;
            const markdownMatch = aiResponse.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
            if (markdownMatch && markdownMatch[2]) jsonString = markdownMatch[2];

            const startIndex = jsonString.indexOf('{');
            const endIndex = jsonString.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) throw new Error('No JSON found.');

            const validJsonString = jsonString.substring(startIndex, endIndex + 1);
            return JSON.parse(validJsonString);
        } catch (error) {
            console.error("JSON Parse Error:", error);
            throw new Error(`AI response was not valid JSON.`);
        }
    };

    // --- ALIGNED GENERATION LOGIC ---
    const handleGenerateQuiz = async () => {
        if (!file) return setError('Please upload a file first.');
        setIsProcessing(true);
        setError('');
        setProgressPercent(10);

        try {
            setProgressMessage('Extracting text content...');
            const fullText = await extractTextFromFile(file);
            if (fullText.length < 50) throw new Error("File content is too short.");
            
            setProgressPercent(30);

            const chunkSize = 4000;
            const chunks = [];
            for (let i = 0; i < fullText.length; i += chunkSize) {
                chunks.push(fullText.substring(i, i + chunkSize));
            }

            let accumulatedQuestions = [];
            let quizTitle = "AI Generated Quiz";

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const isFirstChunk = i === 0;
                const currentProgress = 30 + Math.round(((i + 1) / chunks.length) * 60);
                
                setProgressPercent(currentProgress);
                setProgressMessage(`Analyzing section ${i + 1} of ${chunks.length}...`);

                // 3. UPDATED PROMPT: Aligns with CreateExamAndTosModal logic
                const prompt = `
                You are an expert Assessment Specialist.
                
                **TASK:** Extract high-quality questions from the text chunk below.
                ${isFirstChunk ? "Also, extract a suitable 'title' for the quiz from this first section." : "Do NOT generate a title, just return questions."}

                **MATH/SCIENCE FORMATTING:**
                1. Use LaTeX syntax wrapped in single dollar signs ($...$) for equations/formulas.
                2. Double-escape backslashes (e.g., "$\\\\frac{1}{2}$").

                **TEXT CHUNK:**
                ---
                ${chunk}
                ---

                **JSON OUTPUT FORMAT (Strict):**
                {
                  ${isFirstChunk ? '"title": "Extracted Title",' : ''}
                  "questions": [
                    {
                      "text": "Question text...",
                      // USE THESE EXACT TYPE KEYS TO MATCH SAVING SYSTEM:
                      "type": "multiple_choice | alternative_response | identification | matching-type | essay",
                      "points": 1,
                      "explanation": "Rationale...",
                      
                      // -- Multiple Choice --
                      // "options": ["Option A", "Option B", ...],
                      // "correctAnswer": "The string text of the correct option", 

                      // -- Alternative Response (True/False) --
                      // "correctAnswer": "True" or "False",

                      // -- Identification --
                      // "correctAnswer": "Answer Key",
                      // "choicesBox": ["Answer", "Distractor1", "Distractor2"], (Optional but recommended)

                      // -- Matching Type --
                      // "prompts": [{"id": "p1", "text": "A"}],
                      // "options": [{"id": "o1", "text": "B"}],
                      // "correctPairs": {"p1": "o1"}
                    }
                  ]
                }
                
                **CRITICAL RULES:**
                1. **Identification:** DO NOT start the question with "Identify". Phrase it as a definition or description (e.g., "It is the process of...").
                2. **Multiple Choice:** Do NOT include prefixes like "A." or "1." in the options array.
                3. **Valid JSON:** Return ONLY valid JSON.
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

            // 4. Final Sanitize to match Save Schema
            setProgressMessage('Finalizing quiz structure...');
            
            const sanitizedQuestions = accumulatedQuestions.map(q => {
                // Fix Type Keys if AI hallucinates
                let type = (q.type || '').toLowerCase().replace('-', '_'); // normalize
                if (type === 'true_false') type = 'alternative_response';
                if (type === 'matching_type') type = 'matching-type'; // Ensure hyphen for this one specifically if needed

                // Ensure options for MC
                if (type === 'multiple_choice') {
                     if (!q.options || q.options.length < 2) return null;
                     // Ensure correctAnswerIndex exists if only string provided
                     if (q.correctAnswer && !q.correctAnswerIndex && q.correctAnswerIndex !== 0) {
                         const idx = q.options.findIndex(o => o === q.correctAnswer);
                         if (idx > -1) q.correctAnswerIndex = idx;
                     }
                }

                return { ...q, type };
            }).filter(Boolean);

            const finalQuizData = {
                title: quizTitle,
                questions: sanitizedQuestions
            };

            showToast(`Generated ${sanitizedQuestions.length} questions!`, 'success');
            onAiComplete(finalQuizData);

        } catch (err) {
            console.error('Quiz Gen Error:', err);
            setError('Failed to generate quiz. Please ensure the file contains clear text.');
        } finally {
            setIsProcessing(false);
            setProgressPercent(0);
        }
    };

    return (
        <div className={`flex flex-col h-full font-sans overflow-hidden transition-colors duration-500 ${themeStyles.bgGradient}`}>
            
            {/* Header */}
            <div className={`flex-shrink-0 px-6 py-4 flex items-center justify-between backdrop-blur-xl border-b z-10 sticky top-0 transition-colors duration-500 ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-lg transition-colors duration-500 ${activeOverlay !== 'none' ? themeStyles.buttonGradient : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                        <SparklesIcon className="w-5 h-5 text-white stroke-[2]" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold tracking-tight leading-tight ${themeStyles.textColor}`}>AI Quiz Creator</h3>
                        <p className={`text-[12px] font-medium hidden sm:block ${themeStyles.subText}`}>Upload content to generate assessments</p>
                    </div>
                </div>
                <button onClick={onBack} className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 backdrop-blur-md active:scale-95 border border-transparent ${activeOverlay !== 'none' ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200'}`}>
                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-[2.5]" /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 relative z-0">
                
                {/* Animated Background Blobs (Dynamic Colors) */}
                <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse ${activeOverlay === 'christmas' ? 'bg-red-500/10' : activeOverlay === 'cyberpunk' ? 'bg-fuchsia-500/10' : 'bg-blue-400/10'}`} />
                <div className={`absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse delay-1000 ${activeOverlay === 'christmas' ? 'bg-green-500/10' : activeOverlay === 'cyberpunk' ? 'bg-cyan-500/10' : 'bg-purple-400/10'}`} />

                <div className={`w-full max-w-2xl p-8 relative z-10 backdrop-blur-xl border rounded-[24px] shadow-2xl transition-all duration-500 ${themeStyles.panelBg} ${themeStyles.borderColor} shadow-black/5`}>
                    
                    {/* Processing View */}
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500">
                            {/* Custom Circular Progress */}
                            <div className="relative w-24 h-24 mb-6">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className={`opacity-20 ${themeStyles.progressColor}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out ${themeStyles.progressColor}`} strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className={`absolute inset-0 flex items-center justify-center ${themeStyles.progressColor}`}>
                                    <BoltIcon className="w-8 h-8 animate-pulse" />
                                </div>
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${themeStyles.textColor}`}>Analyzing Content</h4>
                            <p className={`text-sm font-medium ${themeStyles.subText}`}>{progressMessage}</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className={`text-2xl font-bold mb-2 ${themeStyles.textColor}`}>Upload Source Material</h2>
                                <p className={`text-sm leading-relaxed ${themeStyles.subText}`}>
                                    Supports PDF, DOCX, and TXT files.<br/>
                                    <span className="opacity-75 text-xs">Includes support for Math Equations, Chemistry Formulas, and Scientific Notation.</span>
                                </p>
                            </div>

                            {/* Drop Zone */}
                            {!file ? (
                                <label className={`group flex flex-col items-center justify-center w-full h-64 rounded-[24px] border-2 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.99] ${themeStyles.uploadBorder} ${activeOverlay !== 'none' ? 'bg-black/20' : 'bg-white/50 dark:bg-white/5'}`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                                    
                                    <div className={`p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-black/5 ${activeOverlay !== 'none' ? 'bg-white/10' : 'bg-white dark:bg-white/10'}`}>
                                        <DocumentArrowUpIcon className={`w-10 h-10 stroke-[1.5] ${themeStyles.accentColor}`} />
                                    </div>
                                    
                                    <span className={`text-lg font-bold ${themeStyles.textColor}`}>Click or Drag File Here</span>
                                    <span className={`text-sm mt-1 font-medium ${themeStyles.subText}`}>PDF, DOCX, TXT</span>
                                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className={`relative flex items-center p-5 rounded-[24px] shadow-lg border group animate-in fade-in zoom-in duration-300 ${activeOverlay !== 'none' ? 'bg-black/20 border-white/10' : 'bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/10'}`}>
                                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center mr-4 shadow-inner ${themeStyles.iconBg} ${themeStyles.accentColor}`}>
                                        <DocumentTextIcon className="w-8 h-8 stroke-[1.5]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-lg font-bold truncate ${themeStyles.textColor}`}>{file.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide opacity-80 ${activeOverlay !== 'none' ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                                                {file.name.split('.').pop()}
                                            </span>
                                            <p className={`text-xs font-medium ${themeStyles.subText}`}>{(file.size/1024).toFixed(0)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={removeFile} className={`p-2 rounded-full transition-colors active:scale-90 ${activeOverlay !== 'none' ? 'bg-white/10 hover:bg-red-500/40 text-white/70 hover:text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
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
                                        className={`w-full py-3.5 rounded-[18px] font-bold text-[15px] text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group ${activeOverlay !== 'none' ? `bg-gradient-to-r ${themeStyles.buttonGradient} shadow-black/20` : 'bg-[#007AFF] hover:bg-[#0062CC] shadow-blue-500/30 hover:shadow-blue-500/50'}`}
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