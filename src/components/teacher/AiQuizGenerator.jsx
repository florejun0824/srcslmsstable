import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { db } from '../../services/firebase'; 
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
    ArrowUturnLeftIcon, 
    SparklesIcon,
    BoltIcon,
    ExclamationTriangleIcon,
    ArrowDownTrayIcon,
    DocumentTextIcon,
    XMarkIcon,
    DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// --- IMPORTS FOR SELECTION FALLBACK ---
import CourseSelector from './CourseSelector';
import LessonSelector from './LessonSelector';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// --- ROBUST JSON PARSER ---
const robustJsonParse = (text) => {
    try {
        let jsonString = text;
        const markdownMatch = text.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
        if (markdownMatch && markdownMatch[2]) jsonString = markdownMatch[2];
        
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
            return JSON.parse(jsonString.substring(startIndex, endIndex + 1));
        }
        throw new Error("No JSON structure found");
    } catch (e) {
        console.warn("Strict JSON parse failed, attempting regex salvage...", e);
        // Fallback: Regex extraction of individual question objects
        const questionMatches = text.match(/\{[\s\S]*?"text"[\s\S]*?"type"[\s\S]*?\}/g);
        
        if (questionMatches && questionMatches.length > 0) {
            const salvagedQuestions = [];
            for (const qStr of questionMatches) {
                try {
                    const cleanQ = JSON.parse(qStr);
                    salvagedQuestions.push(cleanQ);
                } catch (err) { continue; }
            }
            if (salvagedQuestions.length > 0) {
                return { questions: salvagedQuestions };
            }
        }
        throw new Error("Could not salvage any JSON data.");
    }
};

// --- MICROWORKER HELPER ---
const processChunkWithRetry = async (chunk, promptTemplate, isGenerationRunningRef, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");

        try {
            const fullPrompt = promptTemplate.replace('{{CHUNK_CONTENT}}', chunk);
            const aiResponse = await callGeminiWithLimitCheck(fullPrompt);

            if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
            
            const parsed = robustJsonParse(aiResponse);
            return parsed; 

        } catch (error) {
            if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
            console.warn(`Attempt ${attempt + 1} failed:`, error.message);
            
            if (attempt === maxRetries - 1) throw error; 
            // Exponential backoff
            await new Promise(res => setTimeout(res, 2000 * Math.pow(2, attempt)));
        }
    }
};

export default function AiQuizGenerator({ onBack, onAiComplete, unitId: propUnitId, subjectId: propSubjectId }) {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); 
    
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [generatedQuizData, setGeneratedQuizData] = useState(null); 

    // --- FALLBACK SELECTION STATE ---
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLessons, setSelectedLessons] = useState([]);

    const isGenerationRunning = useRef(false);

    useEffect(() => {
        return () => { isGenerationRunning.current = false; };
    }, []);

    const handleBack = useCallback(() => {
        isGenerationRunning.current = false;
        onBack();
    }, [onBack]);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
            setGeneratedQuizData(null);
        }
    };

    const removeFile = () => {
        setFile(null);
        setGeneratedQuizData(null);
    };

    // --- EXTRACTOR ---
    const extractTextFromFile = async (fileToProcess) => {
        let rawText = '';

        if (fileToProcess.type === 'application/pdf') {
            const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                // FIX: Join with space to prevent 'x' and '2' merging into 'x2'
                rawText += content.items.map((item) => item.str).join(' ') + '\n';
            }
        } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await fileToProcess.arrayBuffer();
            // Use convertToHtml to preserve subscripts/superscripts (vital for math)
            const result = await mammoth.convertToHtml({ arrayBuffer });
            
            // For processing, we convert HTML back to a cleaner text format if needed, 
            // but for now, we will treat the HTML content as the text source 
            // so subscripts like <sub> are preserved for the prompt.
            rawText = result.value; 
        } else if (fileToProcess.type === 'text/plain') {
            rawText = await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type. Please use PDF, DOCX, or TXT.');
        }

        // --- CLEANUP STEP ---
        // This removes "visual noise" specific to your files to prevent the AI from wasting tokens
        return rawText
            .replace(/<[^>]+>/g, '') // FIX: Specifically removes HTML tags (vital for Mammoth/DOCX)
            .replace(/_{3,}/g, '')       // Remove long underlines (e.g., fill in the blank lines)
            .replace(/\.{3,}/g, '')      // Remove long dot leaders
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable binary garbage
            .replace(/\s+/g, ' ');       // Collapse multiple spaces into one
    };

// --- SAVING LOGIC (Modified to fix [object Object] bug) ---
    const saveToFirestore = async (quizData) => {
        const finalSubjectId = propSubjectId || selectedCourse?.id;
        const finalUnitId = propUnitId || (selectedLessons.length > 0 ? selectedLessons[0].id : null);

        if (!finalSubjectId) {
            showToast("Cannot save: Please select a Subject.", "error");
            return;
        }

        try {
            setProgressMessage('Saving to database...');
            const uniqueQuestions = [];
            const seenGroupableTypes = new Set();
        
            // 1. EXTRACT EXISTING BOX FROM AI (Identification)
            const identQuestions = quizData.questions.filter(q => (q.type||'').toLowerCase().includes('identification'));
            let globalIdentChoices = null;
        
            const firstIdentWithChoices = identQuestions.find(q => q.choicesBox && (Array.isArray(q.choicesBox) || typeof q.choicesBox === 'string'));
            if (firstIdentWithChoices) {
                const rawBox = firstIdentWithChoices.choicesBox;
                if (Array.isArray(rawBox)) {
                     globalIdentChoices = rawBox.map(c => (typeof c === 'object' && c !== null ? c.text || c.value : String(c)));
                } else {
                     globalIdentChoices = [String(rawBox)];
                }
            }

            // 2. AUTO-GENERATE BOX IF MISSING
            if (!globalIdentChoices && identQuestions.length > 0) {
                const collectedAnswers = identQuestions
                    .map(q => q.correctAnswer || q.answer)
                    .filter(a => a && typeof a === 'string');
                if (collectedAnswers.length > 0) {
                    globalIdentChoices = [...new Set(collectedAnswers)];
                }
            }

            // --- PROCESSING QUESTIONS ---
            for (const q of quizData.questions) {
                const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
                const isGroupable = normalizedType === 'matching_type' || normalizedType === 'matching-type'; 

                if (isGroupable) {
                    if (!seenGroupableTypes.has(normalizedType)) {
                        uniqueQuestions.push(q);
                        seenGroupableTypes.add(normalizedType);
                    }
                } else {
                    uniqueQuestions.push(q);
                }
            }

            const formattedQuestions = uniqueQuestions.map(q => {
                const normalizedType = (q.type || '').toLowerCase().replace(/\s+/g, '_');
                
                // Clean HTML tags but PRESERVE LaTeX ($...$)
                const questionText = (normalizedType === 'interpretive' && q.passage)
                    ? `${q.passage}\n\n${q.question || ''}`
                    : (q.question || q.text || 'Question text missing');
                
                // Remove generic HTML tags but preserve LaTeX logic
                const cleanText = String(questionText).replace(/<(?!\/?(span|strong|u|em)\b)[^>]+>/gi, ""); 

                const baseQuestion = {
                    text: cleanText,
                    difficulty: q.difficulty || 'easy',
                    explanation: q.explanation || q.solution || '', 
                };

                // --- 1. Multiple Choice ---
                if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
                    const options = q.options || [];
                    const rawAnswer = q.correctAnswer || '';
                    const cleanAnswerText = String(rawAnswer).replace(/^[a-d][\.\)]\s*/i, '').trim();

                    // 🔥 CRITICAL FIX: FORCE STRING CONVERSION 🔥
                    // This prevents [object Object] by digging into nested AI responses
                    const stringOptions = options.map(opt => {
                         let val = opt;
                         
                         // 1. Unwrap common object wrappers if AI sent { text: "..." } or { latex: "..." }
                         if (typeof val === 'object' && val !== null) {
                             val = val.text || val.value || val.math || val.latex || val.content || val;
                         }

                         // 2. If it's STILL an object (deeply nested or unknown key), stringify it
                         if (typeof val === 'object' && val !== null) {
                             return JSON.stringify(val);
                         }
                         
                         // 3. Final safety net: Convert numbers/booleans to string
                         return String(val);
                    });

                    // Recalculate correct index based on clean strings
                    let correctIndex = stringOptions.findIndex(opt => opt.trim() === cleanAnswerText);
                    
                    // Fallback: Check if answer was "A", "B", "C"...
                    if (correctIndex === -1) {
                        const letterMatch = rawAnswer.match(/^([a-d])[\.\)]/i);
                        if (letterMatch) {
                            const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                            correctIndex = letterMap[letterMatch[1].toLowerCase()];
                        }
                    }
                    // Fallback: Fuzzy matching
                    if (correctIndex === -1) {
                        correctIndex = stringOptions.findIndex(opt => {
                            const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const cleanKey = cleanAnswerText.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return cleanOpt === cleanKey || cleanOpt.includes(cleanKey) || cleanKey.includes(cleanOpt);
                        });
                    }

                    // Default to A if detection fails
                    if (stringOptions.length > 0 && correctIndex === -1) correctIndex = 0; 

                    return {
                        ...baseQuestion,
                        type: 'multiple-choice',
                        options: stringOptions.map((opt, idx) => ({ 
                            text: opt, 
                            isCorrect: idx === correctIndex 
                        })),
                        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
                    };
                }
                
                // --- 2. True/False ---
                if (normalizedType === 'alternative_response' || normalizedType === 'true_false') {
                    let isTrue = false;
                    if (typeof q.correctAnswer === 'string') {
                        isTrue = q.correctAnswer.toLowerCase() === 'true' || q.correctAnswer.toLowerCase() === 'tama';
                    } else if (typeof q.correctAnswer === 'boolean') isTrue = q.correctAnswer;
                    
                    return { ...baseQuestion, type: 'true-false', correctAnswer: isTrue };
                }
                
                // --- 3. Identification ---
                if (normalizedType === 'identification' || normalizedType === 'solving') {
                    return {
                        ...baseQuestion,
                        type: 'identification',
                        correctAnswer: String(q.correctAnswer || q.answer),
                        choicesBox: globalIdentChoices, 
                    };
                }
                
                // --- 4. Matching Type ---
                if (normalizedType === 'matching_type' || normalizedType === 'matching-type') {
                    return {
                        ...baseQuestion,
                        text: q.instruction || 'Match the following items.',
                        type: 'matching-type',
                        prompts: (q.prompts || []).map(p => ({...p, text: String(p.text)})),
                        options: (q.options || []).map(o => ({...o, text: String(o.text)})),
                        correctPairs: q.correctPairs || {},
                    };
                }
                
                // --- 5. Essay ---
                if (normalizedType === 'essay') {
                    return { ...baseQuestion, type: 'essay', rubric: q.rubric || [] };
                }

                return null;
            }).filter(Boolean);

            if (formattedQuestions.length === 0) throw new Error("No compatible questions found.");

            const quizRef = doc(collection(db, 'quizzes'));
            const finalPayload = {
                title: `Uploaded: ${quizData.title || 'Extracted Quiz'}`,
                language: 'English',
                unitId: finalUnitId, 
                subjectId: finalSubjectId, 
                lessonId: null, 
                createdAt: serverTimestamp(),
                createdBy: 'AI-Extractor',
                questions: formattedQuestions,
            };

            await setDoc(quizRef, finalPayload);
            showToast("Quiz saved successfully!", "success");
            if(onAiComplete) onAiComplete(finalPayload); 

        } catch (err) {
            console.error("Save Error", err);
            showToast(`Save failed: ${err.message}`, "error");
        } finally {
            setProgressMessage('');
        }
    };

    // --- GENERATION LOGIC ---
    const handleGenerateQuiz = async () => {
        if (!file) return setError('Please upload a file first.');
        setIsProcessing(true);
        setError('');
        setProgressPercent(10);
        setGeneratedQuizData(null);
        
        isGenerationRunning.current = true;

        try {
            setProgressMessage('Extracting content structure...');
            const fullText = await extractTextFromFile(file);
            if (fullText.length < 50) throw new Error("File content is too short.");
            
            setProgressPercent(20);

            // 1. MICROWORKER SPLIT 
            // FIX: Reduced chunk size to 300 characters. 
            // This is CRITICAL for "Smart" models like Gemini Pro to finish "thinking" before Netlify times out.
            const lines = fullText.split('\n');
            const chunks = [];
            let currentChunk = "";
            const MAX_CHUNK_SIZE = 300; 

            for (let line of lines) {
                if ((currentChunk.length + line.length) > MAX_CHUNK_SIZE) {
                    chunks.push(currentChunk);
                    currentChunk = "";
                }
                currentChunk += line + "\n";
            }
            if (currentChunk.trim().length > 0) chunks.push(currentChunk);

            let accumulatedQuestions = [];
            let quizTitle = "Extracted Quiz";

            // 2. PROCESSING LOOP
            for (let i = 0; i < chunks.length; i++) {
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");

                const chunk = chunks[i];
                const isFirstChunk = i === 0;
                
                const currentProgress = 20 + Math.round(((i + 1) / chunks.length) * 70);
                setProgressPercent(currentProgress);
                
                setProgressMessage(`Analysing batch ${i + 1} of ${chunks.length}...`);

			

				// --- REFINED PROMPT TEMPLATE ---
				const promptTemplate = `
				You are an Expert Math Teacher & Data Entry Specialist.
				**TASK:** Convert quiz text to strict JSON.

				**1. IDENTIFICATION & FILL-IN-THE-BLANKS:**
				- **Word Banks:** If you see a list of terms at the start of a section (e.g., "Select from the box:", "Choices:"), you MUST extract them into a "choicesBox" array for every question in that section.
				- **Type:** Label these questions as "identification".
				- **Answers:** Extract the correct answer if provided in the text/key.

				**2. MATH REPAIR RULES (CRITICAL):**
				- **Fractions:** Convert "x-1y-2 / z" to LaTeX: "$\\\\frac{x^{-1}y^{-2}}{z}$".
				- **Exponents:** Convert "x2" -> "$x^2$".
				- **Roots:** "sqrt(x)" -> "$\\\\sqrt{x}$".
				- **Wrapper:** All math formulas must be enclosed in single dollar signs "$...$".

				**3. FORMATTING:**
				- **Clean Text:** Remove question numbering (1., 2.) and prefixes (a., b.).
				- **Strict JSON:** Do NOT return objects for options, only Strings.
				- **Language:** Copy text VERBATIM. Do not translate.

				**INPUT TEXT:**
				---
				{{CHUNK_CONTENT}}
				---

				**REQUIRED JSON OUTPUT:**
				{
				  ${isFirstChunk ? '"title": "Extracted Quiz Title",' : ''}
				  "questions": [
				    {
				      "text": "The powerhouse of the cell.",
				      "type": "identification", 
				      "correctAnswer": "Mitochondria",
				      "choicesBox": ["Mitochondria", "Nucleus", "Ribosome"] 
				    },
				    {
				      "text": "Simplify $\\\\frac{1}{x^{-1}}$",
				      "type": "multiple_choice",
				      "options": ["$x$", "$x^2$", "$1$"],
				      "correctAnswer": "$x$"
				    }
				  ]
				}
				`;

                try {
                    const parsed = await processChunkWithRetry(
                        chunk, 
                        promptTemplate, 
                        isGenerationRunning, 
                        3 
                    );
                    
                    if (isFirstChunk && parsed.title) quizTitle = parsed.title;
                    if (parsed.questions && Array.isArray(parsed.questions)) {
                        accumulatedQuestions = [...accumulatedQuestions, ...parsed.questions];
                    }

                    // FIX: 2.5s Delay to prevent Rate Limiting and give the server a breather
                    await new Promise(res => setTimeout(res, 2500)); 

                } catch (e) {
                    console.warn(`Chunk ${i + 1} skipped.`, e);
                }
            }

            if (accumulatedQuestions.length === 0) throw new Error("No questions could be extracted.");

            const finalQuizData = {
                title: quizTitle || "Generated Quiz",
                questions: accumulatedQuestions 
            };

            setGeneratedQuizData(finalQuizData);
            showToast(`Extracted ${accumulatedQuestions.length} items. Ready to save!`, 'success');

        } catch (err) {
            if (err.message && err.message.includes('aborted')) {
                console.log("Process aborted.");
            } else {
                console.error('Quiz Gen Error:', err);
                setError('Failed to process file. ' + err.message);
            }
        } finally {
            setIsProcessing(false);
            setProgressPercent(0);
            isGenerationRunning.current = false;
        }
    };

    // --- THEME ---
    const themeStyles = useMemo(() => {
         return {
            bgGradient: 'bg-[#f5f5f7] dark:bg-[#121212]',
            panelBg: 'bg-white/60 dark:bg-[#1e1e1e]/60',
            borderColor: 'border-white/20 dark:border-white/10',
            textColor: 'text-slate-900 dark:text-white',
            subText: 'text-slate-500 dark:text-slate-400',
            buttonGradient: 'bg-[#007AFF] hover:bg-[#0062CC]', 
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
            progressColor: 'text-indigo-500',
            accentColor: 'text-indigo-500',
            uploadBorder: 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
        };
    }, []);

    return (
        <div className={`flex flex-col h-full font-sans overflow-hidden transition-colors duration-500`}>
            
            {/* Header */}
            <div className={`flex-shrink-0 px-6 py-4 flex items-center justify-between backdrop-blur-xl border-b z-10 sticky top-0 transition-colors duration-500 bg-white/60 dark:bg-[#1e1e1e]/60 border-white/20`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-lg transition-colors duration-500 bg-[#007AFF]`}>
                        <SparklesIcon className="w-5 h-5 text-white stroke-[2]" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold tracking-tight leading-tight text-slate-900 dark:text-white`}>AI Quiz Extractor</h3>
                        <p className={`text-[12px] font-medium hidden sm:block text-slate-500`}>Import from PDF/DOCX/TXT</p>
                    </div>
                </div>
                <button onClick={handleBack} className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 backdrop-blur-md active:scale-95 border border-transparent bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200`}>
                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-[2.5]" /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 relative z-0">
                
                <div className={`w-full max-w-2xl p-8 relative z-10 backdrop-blur-xl border rounded-[24px] shadow-2xl transition-all duration-500 bg-white/60 dark:bg-[#1e1e1e]/60 border-white/20 shadow-black/5`}>
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500">
                            <div className="relative w-24 h-24 mb-6">
                                <BoltIcon className="w-8 h-8 animate-pulse text-[#007AFF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className={`opacity-20 text-[#007AFF]`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out text-[#007AFF]`} strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                            </div>
                            <h4 className={`text-xl font-bold mb-2 text-slate-900 dark:text-white`}>Scanning Document</h4>
                            <p className={`text-sm font-medium text-slate-500`}>{progressMessage}</p>
                            
                            <button 
                                onClick={handleBack}
                                className="mt-8 text-sm text-red-400 hover:text-red-300 underline"
                            >
                                Cancel Processing
                            </button>
                        </div>
                    ) : generatedQuizData ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg bg-green-100 text-green-500`}>
                                <SparklesIcon className="w-9 h-9" />
                            </div>
                            <h2 className={`text-2xl font-bold mb-2 text-slate-900 dark:text-white`}>Extraction Complete!</h2>
                            <p className={`text-sm mb-6 text-slate-500`}>
                                Successfully extracted <strong>{generatedQuizData.questions.length}</strong> items.
                            </p>
                            
                            {!propSubjectId && (
                                <div className="mt-6 mb-6 space-y-4 text-left p-4 rounded-2xl border bg-black/5 dark:bg-white/5 border-slate-300 dark:border-white/10">
                                    <div className="flex items-center gap-2 mb-2 text-yellow-500">
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                        <span className="text-sm font-bold">Destination Required</span>
                                    </div>
                                    <div>
                                        <CourseSelector onCourseSelect={setSelectedCourse} />
                                    </div>
                                    {selectedCourse && (
                                        <div>
                                            <LessonSelector 
                                                subjectId={selectedCourse.id} 
                                                onLessonsSelect={setSelectedLessons} 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <button 
                                    onClick={() => saveToFirestore(generatedQuizData)} 
                                    className={`w-full py-3.5 rounded-[18px] font-bold text-[15px] text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group bg-green-600 hover:bg-green-700`}
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    Save to Database
                                </button>
                                <button 
                                    onClick={() => setGeneratedQuizData(null)} 
                                    className={`w-full py-3 rounded-[18px] font-semibold text-sm transition-all text-slate-500 hover:bg-black/5 dark:hover:bg-white/10`}
                                >
                                    Process Another File
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className={`text-2xl font-bold mb-2 text-slate-900 dark:text-white`}>Upload Quiz Document</h2>
                                <p className={`text-sm leading-relaxed text-slate-500`}>
                                    Supports PDF, DOCX, and Text.<br/>
                                    <span className="opacity-75 text-xs">Best for existing exams with Identification, Matching, and Multiple Choice.</span>
                                </p>
                            </div>

                            {!file ? (
                                <label className={`group flex flex-col items-center justify-center w-full h-64 rounded-[24px] border-2 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.99] border-slate-300 dark:border-slate-600 hover:border-[#007AFF] bg-white/50 dark:bg-white/5`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                                    
                                    <div className={`p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-black/5 bg-white dark:bg-white/10`}>
                                        <DocumentArrowUpIcon className={`w-10 h-10 stroke-[1.5] text-[#007AFF]`} />
                                    </div>
                                    
                                    <span className={`text-lg font-bold text-slate-900 dark:text-white`}>Click or Drag File Here</span>
                                    <span className={`text-sm mt-1 font-medium text-slate-500`}>PDF, DOCX, TXT</span>
                                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className={`relative flex items-center p-5 rounded-[24px] shadow-lg border group animate-in fade-in zoom-in duration-300 bg-white dark:bg-[#2C2C2E] border-black/5 dark:border-white/10`}>
                                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center mr-4 shadow-inner bg-indigo-100 dark:bg-indigo-900/30 text-[#007AFF]`}>
                                        <DocumentTextIcon className="w-8 h-8 stroke-[1.5]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-lg font-bold truncate text-slate-900 dark:text-white`}>{file.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide opacity-80 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400`}>
                                                {file.name.split('.').pop()}
                                            </span>
                                            <p className={`text-xs font-medium text-slate-500`}>{(file.size/1024).toFixed(0)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={removeFile} className={`p-2 rounded-full transition-colors active:scale-90 bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}>
                                        <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-3 rounded-[16px] bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 flex items-center gap-3 animate-in slide-in-from-top-2">
                                    <div className="p-1.5 bg-red-100 dark:bg-red-500/20 rounded-full text-red-600 dark:text-red-400">
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            <div className="mt-8 flex justify-end gap-4">
                                {file && (
                                    <button 
                                        onClick={handleGenerateQuiz} 
                                        className={`w-full py-3.5 rounded-[18px] font-bold text-[15px] text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group bg-[#007AFF] hover:bg-[#0062CC] shadow-blue-500/30 hover:shadow-blue-500/50`}
                                    >
                                        <SparklesIcon className="w-5 h-5 transition-transform group-hover:rotate-12" />
                                        Generate & Extract
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