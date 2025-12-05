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

// ------------------------------------------------------------------
// 1. ROBUST OFFLINE PARSER (Tokenizer Strategy)
// ------------------------------------------------------------------
const parseWithRegex = (fullText) => {
    
    // --- STEP A: PRE-PROCESSING ---
    let cleanText = fullText
        .replace(/Question \/ Prompt/gi, "") 
        .replace(/The following table:/gi, "")
        .replace(/(\r\n|\n|\r)/gm, " "); 

    // --- STEP B: EXTRACT ANSWER KEY ---
    const answerKeyMap = {};
    const keyMatch = fullText.match(/(?:Answer Key|Key to Correction|Answers)[\s\S]+$/i);
    
    if (keyMatch) {
        const keySection = keyMatch[0];
        const answerPattern = /(\d+)[\.\s\-\)]+\s*(true|false|[a-d](?![a-z]))/gi;
        let m;
        while ((m = answerPattern.exec(keySection)) !== null) {
            const qNum = parseInt(m[1]);
            const val = m[2].toLowerCase();
            
            if (val === 'true') answerKeyMap[qNum] = true;
            else if (val === 'false') answerKeyMap[qNum] = false;
            else {
                const map = {'a':0, 'b':1, 'c':2, 'd':3};
                if (map[val] !== undefined) answerKeyMap[qNum] = map[val];
            }
        }
    }

    // --- STEP C: TOKENIZE THE TEXT STREAM ---
    const markers = [];
    const qRegex = /(?:^|\s)(\d+)[\.\)\s]\s+(?=[A-Z])/g;
    let match;
    while ((match = qRegex.exec(cleanText)) !== null) {
        markers.push({
            type: 'Q',
            num: parseInt(match[1]),
            index: match.index,
            textIndex: match.index + match[0].length 
        });
    }

    const optRegex = /(?:^|\s)([a-d]|[A-D])[\.\)\s]\s+(?=[A-Z0-9])/g;
    while ((match = optRegex.exec(cleanText)) !== null) {
        markers.push({
            type: 'O',
            label: match[1].toLowerCase(),
            index: match.index,
            textIndex: match.index + match[0].length
        });
    }

    markers.sort((a, b) => a.index - b.index);

    // --- STEP D: BUILD OBJECTS FROM TOKENS ---
    const questions = [];
    let currentQ = null;

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const nextMarker = markers[i+1];
        
        let content = cleanText.substring(
            marker.textIndex, 
            nextMarker ? nextMarker.index : undefined
        ).trim();

        content = content
            .replace(/\b([a-z0-9]+)\s*\/\s*([a-z0-9]+)\b/gi, "$\\frac{$1}{$2}$")
            .replace(/(?<!Question\s|Part\s|Item\s|\d\.)\b([a-z]|[0-9]+)\s?(-?\d+)(?![.\)])/gi, (m,b,e) => {
                if (!isNaN(b) && !isNaN(e) && b.length > 1) return m;
                return `$${b}^{${e}}$`;
            })
            .replace(/^[A-D][\.\)]\s*/, ""); 

        if (marker.type === 'Q') {
            if (currentQ) questions.push(currentQ);
            currentQ = {
                number: marker.num,
                text: content,
                type: 'multiple-choice',
                options: [], // Temporarily holds objects
                correctAnswerIndex: 0
            };
        } else if (marker.type === 'O' && currentQ) {
            // We collect them as objects first to keep the structure valid
            currentQ.options.push({ text: content });
        }
    }
    if (currentQ) questions.push(currentQ);

    // --- STEP E: APPLY ANSWER KEY & FINAL CLEANUP ---
    const validQuestions = questions.filter(q => {
        if (answerKeyMap[q.number] === true || answerKeyMap[q.number] === false) {
            q.type = 'true-false';
            q.correctAnswer = answerKeyMap[q.number];
            return true; 
        }
        
        if (q.options.length >= 2) {
            // 1. Get detected answer index
            const keyIdx = answerKeyMap[q.number];

            // 2. FLATTEN OPTIONS TO STRINGS (Fixes [Object Object])
            // This matches the format the AI produces, ensuring UI consistency
            const stringOptions = q.options.map(o => o.text);
            q.options = stringOptions; 

            // 3. Set Correct Answer
            if (keyIdx !== undefined && keyIdx < stringOptions.length) {
                q.correctAnswerIndex = keyIdx;
                // Important: Set the text answer so saveToFirestore logic matches it correctly
                q.correctAnswer = stringOptions[keyIdx]; 
            }
            return true;
        }
        return false;
    });

    return validQuestions;
};
// ------------------------------------------------------------------
// 2. AI HELPERS (The "Smart" Engine)
// ------------------------------------------------------------------
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
        const questionMatches = text.match(/\{[\s\S]*?"text"[\s\S]*?"type"[\s\S]*?\}/g);
        if (questionMatches && questionMatches.length > 0) {
            const salvagedQuestions = [];
            for (const qStr of questionMatches) {
                try {
                    const cleanQ = JSON.parse(qStr);
                    salvagedQuestions.push(cleanQ);
                } catch (err) { continue; }
            }
            if (salvagedQuestions.length > 0) return { questions: salvagedQuestions };
        }
        throw new Error("Could not salvage any JSON data.");
    }
};

const processChunkWithRetry = async (chunk, promptTemplate, isGenerationRunningRef, maxRetries = 3) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
        try {
            const fullPrompt = promptTemplate.replace('{{CHUNK_CONTENT}}', chunk);
            const aiResponse = await callGeminiWithLimitCheck(fullPrompt);
            if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
            return robustJsonParse(aiResponse);
        } catch (error) {
            if (!isGenerationRunningRef.current) throw new Error("Processing aborted by user.");
            if (attempt === maxRetries - 1) throw error; 
            await new Promise(res => setTimeout(res, 2000 * Math.pow(2, attempt)));
        }
    }
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
    const [generationMethod, setGenerationMethod] = useState(''); // 'regex' or 'ai'

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
            const result = await mammoth.convertToHtml({ arrayBuffer });
            rawText = result.value; 
        } else if (fileToProcess.type === 'text/plain') {
            rawText = await fileToProcess.text();
        } else {
            throw new Error('Unsupported file type.');
        }

        return rawText
            .replace(/<[^>]+>/g, '') 
            .replace(/_{3,}/g, '')       
            .replace(/\.{3,}/g, '')      
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ') 
            .replace(/\s+/g, ' ');       
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
                const cleanText = String(q.question || q.text || 'Question text missing').replace(/<(?!\/?(span|strong|u|em)\b)[^>]+>/gi, ""); 

                const baseQuestion = {
                    text: cleanText,
                    difficulty: q.difficulty || 'easy',
                    explanation: q.explanation || q.solution || '', 
                };

// --- 1. Multiple Choice / Analogy ---
                if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
                    const rawOptions = q.options || [];
                    
					// Aggressive option sanitization
					const stringOptions = rawOptions.map(opt => {
					    if (typeof opt === 'object' && opt !== null) {
					        const val = opt.text || opt.value || opt.content || opt.answer || opt.option;
					        return val ? String(val) : (Object.values(opt)[0] ? String(Object.values(opt)[0]) : JSON.stringify(opt));
					    }
					    return String(opt);
					});

                    // CLEANUP: Remove "a. ", "b. " prefixes from the answer text for matching
                    const rawAnswer = q.correctAnswer || '';
                    const cleanAnswerText = rawAnswer.replace(/^[a-d][\.\)]\s*/i, '').trim();
                    
                    // STRATEGY 1: Exact Match using the sanitized strings
                    let correctIndex = stringOptions.findIndex(opt => opt.trim() === cleanAnswerText);

                    // STRATEGY 2: If no match, check if Answer starts with a Letter (e.g. "a. Answer")
                    if (correctIndex === -1) {
                        const letterMatch = rawAnswer.match(/^([a-d])[\.\)]/i);
                        if (letterMatch) {
                            const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                            correctIndex = letterMap[letterMatch[1].toLowerCase()];
                        }
                    }

                    // STRATEGY 3: Fuzzy Match (Ignore punctuation/case)
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
                            // DATABASE FORMAT: Array of Objects
                            options: stringOptions.map((opt, idx) => ({ 
                                text: opt, 
                                isCorrect: idx === finalCorrectIndex 
                            })),
                            correctAnswerIndex: finalCorrectIndex,
                        };
                    } else {
                         return null; // Skip if no options exist
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
                return null;
            }).filter(Boolean);

            if (formattedQuestions.length === 0) throw new Error("No compatible questions found.");

            const quizRef = doc(collection(db, 'quizzes'));
            
            // --- 1. PREPARE DATABASE PAYLOAD (Objects) ---
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

            // --- 2. PREPARE UI PAYLOAD (Strings for Edit Modal) ---
            // Fixes [Object Object] in the Edit Modal by flattening options back to strings
            if(onAiComplete) {
                const uiPayload = {
                    ...finalPayload,
                    questions: finalPayload.questions.map(q => {
                        if (q.type === 'multiple-choice' && Array.isArray(q.options)) {
                            return {
                                ...q,
                                // Map back to simple strings for the editor UI
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
    // 4. HYBRID GENERATION LOGIC
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
            
            // --- STRATEGY A: FAST OFFLINE REGEX ---
            setProgressMessage('Analyzing structure (Method A)...');
            const regexQuestions = parseWithRegex(fullText);

            // --- SMART MATH DETECTOR ---
            // If the text contains $, \, ^, or { }, it's likely LaTeX/Math.
            // In that case, we SKIP the fast offline parser and force AI.
            const hasMathSymbols = /[\$\\\^\{\}]/.test(fullText) || /frac|sqrt|times/i.test(fullText);

            // If we found questions AND it doesn't look like complex math, trust the offline parser
            if (regexQuestions.length >= 5 && !hasMathSymbols) {
                // Artificial delay just so the UI doesn't flash too fast
                setProgressPercent(100);
                await new Promise(r => setTimeout(r, 600));
                
                setGeneratedQuizData({
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    questions: regexQuestions
                });
                setGenerationMethod('Fast Extract (Offline)');
                showToast(`⚡ Fast extraction successful! (${regexQuestions.length} items)`, 'success');
                setIsProcessing(false);
                return; // STOP HERE
            }

            // --- STRATEGY B: FALLBACK TO AI (Forced if Math is detected) ---
            setProgressMessage(hasMathSymbols 
                ? 'Math symbols detected. Switching to Deep AI Analysis...' 
                : 'Complex format detected. Switching to AI analysis...');
            
            setGenerationMethod('AI Analysis (Gemini)');
            
            const lines = fullText.split('\n');
            const chunks = [];
            let currentChunk = "";
            const TARGET_CHUNK_SIZE = 800; // Smaller chunks for safety

            for (let line of lines) {
                if ((currentChunk.length + line.length) > TARGET_CHUNK_SIZE) {
                    chunks.push(currentChunk);
                    currentChunk = "";
                }
                currentChunk += line + "\n";
            }
            if (currentChunk.trim().length > 0) chunks.push(currentChunk);

            let accumulatedQuestions = [];
            let quizTitle = "Extracted Quiz";

            for (let i = 0; i < chunks.length; i++) {
                if (!isGenerationRunning.current) throw new Error("Generation aborted by user.");

                const chunk = chunks[i];
                const isFirstChunk = i === 0;
                
                const currentProgress = 20 + Math.round(((i + 1) / chunks.length) * 70);
                setProgressPercent(currentProgress);
                setProgressMessage(`AI Processing: Batch ${i + 1} of ${chunks.length}...`);

                const promptTemplate = `
                You are an expert Document Parser and Data Extractor.
**TASK:** Extract questions from the text below into strict JSON format.
**STRICT RULES:**
1. **EXTRACT ONLY:** Do NOT create, invent, or add questions that are not in the text.
2. **NO HALLUCINATIONS:** If the text ends, stop. Do not add math formulas or filler questions.
3. **OPTIONS MUST BE STRINGS:** Return options as a simple array of strings. Example: ["Pride", "Greed", "Envy"]. Do NOT use objects like {"option": "A"}.

                **1. IDENTIFICATION & FILL-IN-THE-BLANKS:**
                - **Word Banks:** If you see "Select from the box", extract terms into "choicesBox" array.
                - **Type:** "identification".
                - **Answers:** Extract correct answer if keys are provided.

                **2. MATH & LATEX HANDLING:**
                - This document may contain math using '$' delimiters or standard text.
                - Preserve LaTeX: "$x^2$" or "$\\frac{1}{2}$".
                - Fix common OCR errors: "x2" -> "$x^2$", "a0" -> "$a^0$".
                - Ensure math formatting is valid LaTeX wrapped in '$'.

                **3. FORMATTING:**
                - Clean Text (remove 1., a., b.).
                - JSON options must be strings.

                **INPUT:**
                ---
                {{CHUNK_CONTENT}}
                ---

                **OUTPUT JSON:**
                {
                  ${isFirstChunk ? '"title": "Title",' : ''}
                  "questions": [
                    { "text": "Question?", "type": "multiple_choice", "options": ["A", "B"], "correctAnswer": "A" }
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
            showToast(`Deep extraction complete! (${accumulatedQuestions.length} items)`, 'success');

        } catch (err) {
            if (err.message && err.message.includes('aborted')) {
                console.log("Process aborted.");
            } else {
                console.error('Quiz Gen Error:', err);
                setError('Failed to process. ' + err.message);
            }
        } finally {
            setIsProcessing(false);
            setProgressPercent(0);
            isGenerationRunning.current = false;
        }
    };

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
                            
                            <button onClick={handleBack} className="mt-8 text-sm text-red-400 hover:text-red-300 underline">
                                Cancel Processing
                            </button>
                        </div>
                    ) : generatedQuizData ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg bg-green-100 text-green-500`}>
                                <SparklesIcon className="w-9 h-9" />
                            </div>
                            <h2 className={`text-2xl font-bold mb-2 text-slate-900 dark:text-white`}>Extraction Complete!</h2>
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <span className={`text-sm font-medium text-slate-500`}>
                                    Found <strong>{generatedQuizData.questions.length}</strong> items via
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {generationMethod || 'Hybrid'}
                                </span>
                            </div>
                            
                            {!propSubjectId && (
                                <div className="mt-6 mb-6 space-y-4 text-left p-4 rounded-2xl border bg-black/5 dark:bg-white/5 border-slate-300 dark:border-white/10">
                                    <div className="flex items-center gap-2 mb-2 text-yellow-500">
                                        <ExclamationTriangleIcon className="w-5 h-5" />
                                        <span className="text-sm font-bold">Destination Required</span>
                                    </div>
                                    <div><CourseSelector onCourseSelect={setSelectedCourse} /></div>
                                    {selectedCourse && (
                                        <div><LessonSelector subjectId={selectedCourse.id} onLessonsSelect={setSelectedLessons} /></div>
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
                                    Smart Hybrid Mode: <span className="text-green-600 dark:text-green-400 font-medium">Instant</span> for clean files, <span className="text-blue-600 dark:text-blue-400 font-medium">AI</span> for complex ones.
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