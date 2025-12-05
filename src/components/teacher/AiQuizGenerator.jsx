// src/components/quiz/AiQuizGenerator.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
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

// A. Robust JSON Parser (FIXED FOR MATH)
const robustJsonParse = (text) => {
    // Helper: Pre-process text to fix common LaTeX/JSON escape issues
    const sanitizeText = (input) => {
        let cleaned = input;
        // 1. Remove Markdown code blocks
        cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
        
        // 2. Fix single backslashes in LaTeX that break JSON
        // Logic: Find a backslash that is NOT followed by another backslash, " or n/r/t/u
        // This is a heuristic to save "broken" math JSON
        cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        
        return cleaned;
    };

    try {
        let jsonString = text;
        const markdownMatch = text.match(/```(json)?\s*(\{[\s\S]*\})\s*```/);
        if (markdownMatch && markdownMatch[2]) jsonString = markdownMatch[2];
        
        // Attempt clean parse
        try {
             return JSON.parse(jsonString);
        } catch (e1) {
            // If failed, try sanitizing the string (fixing backslashes)
            const sanitized = sanitizeText(jsonString);
            return JSON.parse(sanitized);
        }

    } catch (e) {
        // Fallback: Try to salvage individual objects using Regex
        // We use a "lazy" match for the closing brace to capture individual objects
        const questionMatches = text.match(/\{[\s\S]*?"text"[\s\S]*?"type"[\s\S]*?\}/g);
        
        if (questionMatches && questionMatches.length > 0) {
            const salvagedQuestions = [];
            for (const qStr of questionMatches) {
                try {
                    // Try parsing raw
                    salvagedQuestions.push(JSON.parse(qStr));
                } catch (err) { 
                    try {
                        // Try parsing sanitized
                        salvagedQuestions.push(JSON.parse(sanitizeText(qStr)));
                    } catch (err2) {
                        console.warn("Failed to salvage question:", qStr);
                    }
                }
            }
            if (salvagedQuestions.length > 0) return { questions: salvagedQuestions };
        }
        throw new Error("Could not salvage any JSON data.");
    }
};

// B. Streaming Fetcher
const streamGeminiResponse = async (prompt) => {
    try {
        const response = await fetch('/api/gemini-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        if (!response.body) throw new Error("ReadableStream not supported in this browser.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
        }

        return result; 
    } catch (error) {
        console.error("Streaming Error:", error);
        throw error;
    }
};

// C. Processing Wrapper
const processChunkWithStream = async (chunk, promptTemplate, isGenerationRunningRef) => {
    if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
    
    const fullPrompt = promptTemplate.replace('{{CHUNK_CONTENT}}', chunk);
    const aiResponseText = await streamGeminiResponse(fullPrompt);
    
    if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
    return robustJsonParse(aiResponseText);
};

// ------------------------------------------------------------------
// 3. MAIN COMPONENT
// ------------------------------------------------------------------
export default function AiQuizGenerator({ onBack, onAiComplete, unitId: propUnitId, subjectId: propSubjectId }) {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); 
    
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [generatedQuizData, setGeneratedQuizData] = useState(null); 
    const [generationMethod, setGenerationMethod] = useState(''); 

    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedLessons, setSelectedLessons] = useState([]);

    const isGenerationRunning = useRef(false);

    // --- MONET THEME GENERATOR ---
    const themeStyles = useMemo(() => {
        switch (activeOverlay) {
            case 'christmas':
                return {
                    bgGradient: 'bg-red-950/20',
                    panelBg: 'bg-[#0f291e]',
                    borderColor: 'border-green-500/30',
                    textColor: 'text-red-100',
                    subText: 'text-green-200/70',
                    accentColor: 'text-red-400',
                    buttonGradient: 'bg-gradient-to-r from-red-700 to-green-800',
                    iconBg: 'bg-green-900/30',
                    highlight: 'bg-red-900/40 border-red-500/30',
                    inputBg: 'bg-black/30'
                };
            case 'valentines':
                return {
                    bgGradient: 'bg-pink-950/20',
                    panelBg: 'bg-[#2a0a12]',
                    borderColor: 'border-pink-500/30',
                    textColor: 'text-pink-100',
                    subText: 'text-pink-200/70',
                    accentColor: 'text-pink-400',
                    buttonGradient: 'bg-gradient-to-r from-pink-600 to-rose-600',
                    iconBg: 'bg-pink-900/30',
                    highlight: 'bg-pink-900/40 border-pink-500/30',
                    inputBg: 'bg-black/30'
                };
            case 'cyberpunk':
                return {
                    bgGradient: 'bg-purple-950/20',
                    panelBg: 'bg-[#180a2e]',
                    borderColor: 'border-cyan-500/40',
                    textColor: 'text-cyan-50',
                    subText: 'text-fuchsia-200/70',
                    accentColor: 'text-cyan-400',
                    buttonGradient: 'bg-gradient-to-r from-fuchsia-600 to-cyan-600',
                    iconBg: 'bg-fuchsia-900/30',
                    highlight: 'bg-fuchsia-900/40 border-cyan-500/30',
                    inputBg: 'bg-black/40'
                };
            case 'graduation':
                return {
                    bgGradient: 'bg-yellow-950/20',
                    panelBg: 'bg-[#1a1600]',
                    borderColor: 'border-yellow-500/30',
                    textColor: 'text-yellow-50',
                    subText: 'text-yellow-200/70',
                    accentColor: 'text-yellow-400',
                    buttonGradient: 'bg-gradient-to-r from-yellow-600 to-amber-700',
                    iconBg: 'bg-yellow-900/30',
                    highlight: 'bg-yellow-900/40 border-yellow-500/30',
                    inputBg: 'bg-black/30'
                };
            case 'rainy':
                return {
                    bgGradient: 'bg-slate-900/40',
                    panelBg: 'bg-slate-900/80',
                    borderColor: 'border-blue-400/20',
                    textColor: 'text-blue-50',
                    subText: 'text-blue-200/50',
                    accentColor: 'text-blue-300',
                    buttonGradient: 'bg-gradient-to-r from-blue-800 to-slate-700',
                    iconBg: 'bg-blue-900/30',
                    highlight: 'bg-blue-900/20 border-blue-400/20',
                    inputBg: 'bg-black/40'
                };
            case 'spring':
                return {
                    bgGradient: 'bg-pink-900/10',
                    panelBg: 'bg-[#2a0a10]/80', 
                    borderColor: 'border-pink-300/30',
                    textColor: 'text-pink-50',
                    subText: 'text-pink-200/60',
                    accentColor: 'text-green-300', 
                    buttonGradient: 'bg-gradient-to-r from-pink-600 to-green-600',
                    iconBg: 'bg-pink-900/30',
                    highlight: 'bg-pink-900/20 border-pink-400/30',
                    inputBg: 'bg-black/30'
                };
            case 'space':
                return {
                    bgGradient: 'bg-black/60',
                    panelBg: 'bg-[#050510]',
                    borderColor: 'border-indigo-500/40',
                    textColor: 'text-indigo-50',
                    subText: 'text-indigo-200/50',
                    accentColor: 'text-indigo-400',
                    buttonGradient: 'bg-gradient-to-r from-indigo-700 to-purple-800',
                    iconBg: 'bg-indigo-900/20',
                    highlight: 'bg-indigo-900/20 border-indigo-500/20',
                    inputBg: 'bg-black/60'
                };
            default: // Standard
                return {
                    bgGradient: 'bg-[#f5f5f7] dark:bg-[#121212]',
                    panelBg: 'bg-white dark:bg-[#1e1e1e]',
                    borderColor: 'border-slate-200 dark:border-white/10',
                    textColor: 'text-slate-900 dark:text-white',
                    subText: 'text-slate-500 dark:text-slate-400',
                    accentColor: 'text-blue-600 dark:text-blue-400',
                    buttonGradient: 'bg-[#007AFF] hover:bg-[#0062CC]',
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                    highlight: 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10',
                    inputBg: 'bg-slate-50 dark:bg-white/5'
                };
        }
    }, [activeOverlay]);

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
            setGenerationMethod('');
        }
    };

    const removeFile = () => {
        setFile(null);
        setGeneratedQuizData(null);
    };

    const extractTextFromFile = async (fileToProcess) => {
            let rawText = '';
            if (fileToProcess.type === 'application/pdf') {
                const pdf = await pdfjsLib.getDocument(URL.createObjectURL(fileToProcess)).promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    rawText += content.items.map((item) => item.str).join(' ') + '\n';
                }
            } else if (fileToProcess.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const arrayBuffer = await fileToProcess.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer }); 
                rawText = result.value; 
            } else if (fileToProcess.type === 'text/plain') {
                rawText = await fileToProcess.text();
            } else {
                throw new Error('Unsupported file type.');
            }

            return rawText
                .replace(/<[^>]+>/g, '') 
                .replace(/[^\x20-\x7E\n\r\t]/g, ' ') 
                .replace(/(\r\n|\r)/g, '\n') 
                .replace(/\n\s+\n/g, '\n\n'); 
        };

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
        
                const identQuestions = quizData.questions.filter(q => (q.type||'').toLowerCase().includes('identification'));
                let globalIdentChoices = null;
        
                const firstIdentWithChoices = identQuestions.find(q => q.choicesBox && (Array.isArray(q.choicesBox) || typeof q.choicesBox === 'string'));
                if (firstIdentWithChoices) {
                    const rawBox = firstIdentWithChoices.choicesBox;
                    globalIdentChoices = Array.isArray(rawBox) 
                        ? rawBox.map(c => (typeof c === 'object' && c !== null ? c.text || c.value : String(c)))
                        : [String(rawBox)];
                }

                if (!globalIdentChoices && identQuestions.length > 0) {
                    const collectedAnswers = identQuestions
                        .map(q => q.correctAnswer || q.answer)
                        .filter(a => a && typeof a === 'string');
                    if (collectedAnswers.length > 0) globalIdentChoices = [...new Set(collectedAnswers)];
                }

                for (const q of quizData.questions) {
                    const normalizedType = (q.type || '').toLowerCase().replace(/[\s-]/g, '_');
                
                    const isGroupable = normalizedType === 'matching_type'; 
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
                    const normalizedType = (q.type || '').toLowerCase().replace(/[\s-]/g, '_');
                    const cleanText = String(q.question || q.text || 'Question text missing').replace(/<(?!\/?(span|strong|u|em)\b)[^>]+>/gi, ""); 

                    const baseQuestion = {
                        text: cleanText,
                        difficulty: q.difficulty || 'easy',
                        explanation: q.explanation || q.solution || '', 
                    };

                    if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
                        const rawOptions = q.options || [];
                    
                        const stringOptions = rawOptions.map(opt => {
                            if (typeof opt === 'object' && opt !== null) {
                                const val = opt.text || opt.value || opt.content || opt.answer || opt.option;
                                return val ? String(val) : (Object.values(opt)[0] ? String(Object.values(opt)[0]) : JSON.stringify(opt));
                            }
                            return String(opt);
                        });

                        const rawAnswer = q.correctAnswer || '';
                        const cleanAnswerText = rawAnswer.replace(/^[a-d][\.\)]\s*/i, '').trim();
                    
                        let correctIndex = stringOptions.findIndex(opt => opt.trim() === cleanAnswerText);

                        if (correctIndex === -1) {
                            const letterMatch = rawAnswer.match(/^([a-d])[\.\)]/i);
                            if (letterMatch) {
                                const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                                correctIndex = letterMap[letterMatch[1].toLowerCase()];
                            }
                        }

                        if (correctIndex === -1) {
                            correctIndex = stringOptions.findIndex(opt => {
                                const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
                                const cleanKey = cleanAnswerText.toLowerCase().replace(/[^a-z0-9]/g, '');
                                return cleanOpt === cleanKey || cleanOpt.includes(cleanKey) || cleanKey.includes(cleanOpt);
                            });
                        }

                        const finalCorrectIndex = (correctIndex > -1 && correctIndex < stringOptions.length) ? correctIndex : 0;

                        if (stringOptions.length > 0) {
                            return {
                                ...baseQuestion,
                                type: 'multiple-choice',
                                options: stringOptions.map((opt, idx) => ({ 
                                    text: opt, 
                                    isCorrect: idx === finalCorrectIndex 
                                })),
                                correctAnswerIndex: finalCorrectIndex,
                            };
                        } else {
                             return null; 
                        }
                    }
                
                    if (normalizedType === 'alternative_response' || normalizedType === 'true_false') {
                        let isTrue = false;
                        if (typeof q.correctAnswer === 'string') {
                            isTrue = q.correctAnswer.toLowerCase() === 'true' || q.correctAnswer.toLowerCase() === 'tama';
                        } else if (typeof q.correctAnswer === 'boolean') isTrue = q.correctAnswer;
                        return { ...baseQuestion, type: 'true-false', correctAnswer: isTrue };
                    }
                
                    if (normalizedType === 'identification' || normalizedType === 'solving') {
                        return {
                            ...baseQuestion,
                            type: 'identification',
                            correctAnswer: String(q.correctAnswer || q.answer),
                            choicesBox: globalIdentChoices, 
                        };
                    }
                
                    if (normalizedType === 'matching_type') {
                        return {
                            ...baseQuestion,
                            text: q.instruction || 'Match the following items.',
                            type: 'matching-type',
                            prompts: (q.prompts || []).map(p => ({...p, text: String(p.text)})),
                            options: (q.options || []).map(o => ({...o, text: String(o.text)})),
                            correctPairs: q.correctPairs || {},
                        };
                    }
                    return null;
                }).filter(Boolean);

                if (formattedQuestions.length === 0) throw new Error("No compatible questions found.");

                const quizRef = doc(collection(db, 'quizzes'));
            
                const finalPayload = {
                    title: `Uploaded: ${quizData.title || 'Extracted Quiz'}`,
                    language: 'English',
                    unitId: finalUnitId, // This will now be the propUnitId if present
                    subjectId: finalSubjectId, // This will now be the propSubjectId if present
                    lessonId: null, 
                    createdAt: serverTimestamp(),
                    createdBy: 'AI-Extractor',
                    questions: formattedQuestions,
                };

                await setDoc(quizRef, finalPayload);
                showToast("Quiz saved successfully!", "success");

                if(onAiComplete) {
                    const uiPayload = {
                        ...finalPayload,
                        questions: finalPayload.questions.map(q => {
                            if (q.type === 'multiple-choice' && Array.isArray(q.options)) {
                                return {
                                    ...q,
                                    options: q.options.map(o => o.text) 
                                };
                            }
                            return q;
                        })
                    };
                    onAiComplete(uiPayload); 
                }

            } catch (err) {
                console.error("Save Error", err);
                showToast(`Save failed: ${err.message}`, "error");
            } finally {
                setProgressMessage('');
            }
        };

    // ------------------------------------------------------------------
    // 4. MICRO-BATCH AI GENERATION (Prevents 504 Timeouts)
    // ------------------------------------------------------------------
    const handleGenerateQuiz = async () => {
        if (!file) return setError('Please upload a file first.');
        setIsProcessing(true);
        setError('');
        setProgressPercent(5);
        setGeneratedQuizData(null);
        setGenerationMethod('');
    
        isGenerationRunning.current = true;

        try {
            setProgressMessage('Reading document...');
            const fullText = await extractTextFromFile(file);
            if (fullText.length < 50) throw new Error("File content is too short.");
        
            setProgressMessage('Analyzing structure...');
            setGenerationMethod('Micro-Batch Analysis');

            // --- STEP 1: SMART MICRO-SPLITTING ---
            const questionRefRegex = /\n\s*(\d+)[\.\)]/g;
            const indices = [];
            let match;
        
            while ((match = questionRefRegex.exec(fullText)) !== null) {
                indices.push(match.index);
            }

            let chunks = [];
        
            if (indices.length > 3) {
                // STRATEGY A: Question Numbers Found
                let currentStart = 0;
                for (let i = 0; i < indices.length; i++) {
                    const currentIdx = indices[i];
                    
                    // FIXED: Reduced chunk size from 500 to 400
                    // Math questions are dense with tokens. Smaller chunks = safer "solving" by AI.
                    if ((currentIdx - currentStart) > 400) {
                        chunks.push(fullText.substring(currentStart, currentIdx));
                        currentStart = currentIdx;
                    }
                }
                chunks.push(fullText.substring(currentStart));
            } else {
                // STRATEGY B: No Numbers (Essays/Paragraphs)
                const OVERLAP = 100;
                const CHUNK_SIZE = 800; 
                for (let i = 0; i < fullText.length; i += (CHUNK_SIZE - OVERLAP)) {
                    chunks.push(fullText.substring(i, i + CHUNK_SIZE));
                }
            }

            // --- STEP 2: PROCESS BATCHES ---
            let accumulatedQuestions = [];
            let quizTitle = "Extracted Quiz";

            for (let i = 0; i < chunks.length; i++) {
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");

                const chunk = chunks[i];
                const isFirstChunk = i === 0;
            
                const currentProgress = 10 + Math.round(((i + 1) / chunks.length) * 85);
                setProgressPercent(currentProgress);
                setProgressMessage(`Processing Batch ${i + 1} of ${chunks.length}...`);

                // --- UNIVERSAL PROMPT (Math Enhanced) ---
                const promptTemplate = `
                You are an expert Quiz Parser and Subject Matter Expert.
                **TASK:** Extract questions into strict JSON.
                **CRITICAL INSTRUCTION:** If the document contains an answer key, use it. **IF NO ANSWER KEY IS FOUND**, you must SOLVE the question yourself and provide the correct answer.

                **CONTEXT:** Batch ${i + 1} of a document. Ignore incomplete start/end sentences.

                **SUBJECT RULES (MATH & SCIENCE):**
                1. **OCR Repair:** You MUST fix broken OCR text. 
                   - "x 2" or "x2" -> "$x^2$"
                   - "1/2" -> "$\\frac{1}{2}$"
                   - "*" -> "$\\times$"
                2. **LaTeX Enforcement (CRITICAL):** - Wrap ALL formulas and variables in single dollar signs ($...$).
                   - **DOUBLE ESCAPE BACKSLASHES:** In JSON, you must write "\\\\" to produce a single backslash.
                   - CORRECT: "$\\frac{x}{y}$" becomes string: "$\\frac{x}{y}" (wait, in JSON source it is "$\\\\frac{x}{y}")
                   - INCORRECT: "$\frac{x}{y}" (This will break the JSON parser)

                **INPUT:**
                ---
                {{CHUNK_CONTENT}}
                ---

                **OUTPUT JSON:**
                {
                  ${isFirstChunk ? '"title": "Topic",' : ''}
                  "questions": [
                    { 
                      "text": "Question text here (with $\\LaTeX$ math)", 
                      "type": "multiple_choice", 
                      "options": ["Option A", "Option B", "Option C", "Option D"], 
                      "correctAnswer": "Option A", 
                      "explanation": "Brief reason why this is the correct answer"
                    }
                  ]
                }
                `;

                try {
                    const parsed = await processChunkWithStream(
                        chunk, 
                        promptTemplate, 
                        isGenerationRunning
                    );
                
                    if (isFirstChunk && parsed.title) quizTitle = parsed.title;
                    if (parsed.questions && Array.isArray(parsed.questions)) {
                        accumulatedQuestions = [...accumulatedQuestions, ...parsed.questions];
                    }

                    // Small delay to prevent rate limiting
                    await new Promise(res => setTimeout(res, 500)); 

                } catch (e) {
                    console.warn(`Batch ${i + 1} failed (likely empty or too complex). Skipping.`, e);
                }
            }

            // --- STEP 3: DEDUPLICATE (FIXED) ---
            const uniqueQuestions = [];
            const seenTexts = new Set();
        
            accumulatedQuestions.forEach(q => {
                // FIXED: Increased deduplication signature length
                // Math questions often start identical "Simplify..."
                // We now check 100 chars and keep digits to differentiate "Simplify x^2" vs "Simplify x^3"
                const sig = (q.text || '').substring(0, 100).toLowerCase().replace(/[^a-z0-9]/g, '');
                
                if (sig.length > 5 && !seenTexts.has(sig)) {
                    seenTexts.add(sig);
                    uniqueQuestions.push(q);
                }
            });

            if (uniqueQuestions.length === 0) throw new Error("No valid questions found. The file might be illegible or encrypted.");

            setGeneratedQuizData({
                title: quizTitle || file.name.replace(/\.[^/.]+$/, ""),
                questions: uniqueQuestions 
            });
        
            showToast(`Success! Extracted ${uniqueQuestions.length} questions.`, 'success');

        } catch (err) {
            if (err.message && err.message.includes('aborted')) {
                console.log("Process aborted.");
            } else {
                console.error('Quiz Gen Error:', err);
                setError('Processing Failed: ' + err.message);
            }
        } finally {
            setIsProcessing(false);
            setProgressPercent(0);
            isGenerationRunning.current = false;
        }
    };

    return (
        <div className={`flex flex-col h-full font-sans overflow-hidden transition-colors duration-500 ${themeStyles.bgGradient} ${themeStyles.textColor}`}>
            {/* Header */}
            <div className={`flex-shrink-0 px-6 py-4 flex items-center justify-between backdrop-blur-xl border-b z-10 sticky top-0 transition-colors duration-500 ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shadow-lg transition-colors duration-500 ${activeOverlay !== 'none' ? themeStyles.buttonGradient : 'bg-[#007AFF]'}`}>
                        <SparklesIcon className="w-5 h-5 text-white stroke-[2]" />
                    </div>
                    <div>
                        <h3 className={`text-lg font-bold tracking-tight leading-tight ${themeStyles.textColor}`}>AI Quiz Extractor</h3>
                        <p className={`text-[12px] font-medium hidden sm:block ${themeStyles.subText}`}>Import from PDF/DOCX/TXT</p>
                    </div>
                </div>
                <button onClick={handleBack} className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 backdrop-blur-md active:scale-95 border border-transparent ${activeOverlay !== 'none' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200'}`}>
                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-[2.5]" /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 relative z-0">
                <div className={`w-full max-w-2xl p-8 relative z-10 backdrop-blur-xl border rounded-[24px] shadow-2xl transition-all duration-500 ${themeStyles.panelBg} ${themeStyles.borderColor} shadow-black/5`}>
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500">
                            <div className="relative w-24 h-24 mb-6">
                                <BoltIcon className={`w-8 h-8 animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${themeStyles.accentColor}`} />
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className={`opacity-20 ${themeStyles.accentColor}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out ${themeStyles.accentColor}`} strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${themeStyles.textColor}`}>Scanning Document</h4>
                            <p className={`text-sm font-medium ${themeStyles.subText}`}>{progressMessage}</p>
                            
                            <button onClick={handleBack} className="mt-8 text-sm text-red-400 hover:text-red-300 underline">
                                Cancel Processing
                            </button>
                        </div>
                    ) : generatedQuizData ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg bg-green-100 text-green-500`}>
                                <SparklesIcon className="w-9 h-9" />
                            </div>
                            <h2 className={`text-2xl font-bold mb-2 ${themeStyles.textColor}`}>Extraction Complete!</h2>
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <span className={`text-sm font-medium ${themeStyles.subText}`}>
                                    Found <strong>{generatedQuizData.questions.length}</strong> items via
                                </span>
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${themeStyles.iconBg} ${themeStyles.accentColor}`}>
                                    {generationMethod || 'Hybrid'}
                                </span>
                            </div>
                            
                            {/* --- CONDITIONAL UI: ONLY SHOW SELECTORS IF UNIT IS MISSING --- */}
                            {!propUnitId && (
                                <div className={`mt-6 mb-6 space-y-4 text-left p-4 rounded-2xl border ${themeStyles.inputBg} ${themeStyles.borderColor}`}>
                                    <div className="flex items-center gap-2 mb-2 text-yellow-500">
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                        <span className="text-sm font-bold">Destination Required</span>
                                    </div>
                                    {!propSubjectId && <div><CourseSelector onCourseSelect={setSelectedCourse} /></div>}
                                    {(propSubjectId || selectedCourse) && (
                                        <div><LessonSelector subjectId={propSubjectId || selectedCourse?.id} onLessonsSelect={setSelectedLessons} /></div>
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
                                    className={`w-full py-3 rounded-[18px] font-semibold text-sm transition-all ${themeStyles.subText} hover:bg-black/5 dark:hover:bg-white/10`}
                                >
                                    Process Another File
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className={`text-2xl font-bold mb-2 ${themeStyles.textColor}`}>Upload Quiz Document</h2>
                                <p className={`text-sm leading-relaxed ${themeStyles.subText}`}>
                                    Smart Hybrid Mode: <span className="text-green-600 dark:text-green-400 font-medium">Instant</span> for clean files, <span className="text-blue-600 dark:text-blue-400 font-medium">AI</span> for complex ones.
                                </p>
                            </div>

                            {!file ? (
                                <label className={`group flex flex-col items-center justify-center w-full h-64 rounded-[24px] border-2 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.99] ${themeStyles.borderColor} hover:border-[#007AFF] ${themeStyles.inputBg}`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                                    <div className={`p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-black/5 ${themeStyles.panelBg}`}>
                                        <DocumentArrowUpIcon className={`w-10 h-10 stroke-[1.5] text-[#007AFF]`} />
                                    </div>
                                    <span className={`text-lg font-bold ${themeStyles.textColor}`}>Click or Drag File Here</span>
                                    <span className={`text-sm mt-1 font-medium ${themeStyles.subText}`}>PDF, DOCX, TXT</span>
                                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className={`relative flex items-center p-5 rounded-[24px] shadow-lg border group animate-in fade-in zoom-in duration-300 ${themeStyles.panelBg} ${themeStyles.borderColor}`}>
                                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center mr-4 shadow-inner ${themeStyles.iconBg} ${themeStyles.accentColor}`}>
                                        <DocumentTextIcon className="w-8 h-8 stroke-[1.5]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-lg font-bold truncate ${themeStyles.textColor}`}>{file.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide opacity-80 ${themeStyles.inputBg} ${themeStyles.subText}`}>
                                                {file.name.split('.').pop()}
                                            </span>
                                            <p className={`text-xs font-medium ${themeStyles.subText}`}>{(file.size/1024).toFixed(0)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={removeFile} className={`p-2 rounded-full transition-colors active:scale-90 ${activeOverlay !== 'none' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}>
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
                                        className={`w-full py-3.5 rounded-[18px] font-bold text-[15px] text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group ${activeOverlay !== 'none' ? themeStyles.buttonGradient : 'bg-[#007AFF] hover:bg-[#0062CC]'} shadow-blue-500/30 hover:shadow-blue-500/50`}
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