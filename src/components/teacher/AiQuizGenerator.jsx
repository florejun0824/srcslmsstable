import React, { useState, useMemo } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { db } from '../../services/firebase'; 
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
    ArrowUturnLeftIcon, 
    DocumentArrowUpIcon, 
    DocumentTextIcon, 
    XMarkIcon, 
    SparklesIcon,
    BoltIcon,
    ExclamationTriangleIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function AiQuizGenerator({ onBack, onAiComplete, unitId, subjectId }) {
    const { showToast } = useToast();
    const { activeOverlay } = useTheme(); 
    
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progressMessage, setProgressMessage] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);
    const [generatedQuizData, setGeneratedQuizData] = useState(null); 

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
                    buttonGradient: 'bg-[#007AFF] hover:bg-[#0062CC]', 
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
            setGeneratedQuizData(null);
        }
    };

    const removeFile = () => {
        setFile(null);
        setGeneratedQuizData(null);
    };

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
            const result = await mammoth.convertToHtml({ arrayBuffer });
            return result.value; 
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

    // --- SAVING LOGIC (WITH AUTO-GENERATED IDENTIFICATION BOX) ---
    const saveToFirestore = async (quizData) => {
        if (!unitId || !subjectId) {
            showToast("Cannot save: Missing Unit or Subject ID.", "error");
            return;
        }

        try {
            setProgressMessage('Saving to database...');
            const uniqueQuestions = [];
            const seenGroupableTypes = new Set();
        
            // 1. EXTRACT EXISTING BOX FROM AI
            const identQuestions = quizData.questions.filter(q => (q.type||'').toLowerCase().includes('identification'));
            let globalIdentChoices = null;
        
            const firstIdentWithChoices = identQuestions.find(q => q.choicesBox && (Array.isArray(q.choicesBox) || typeof q.choicesBox === 'string'));
            if (firstIdentWithChoices) {
                const rawBox = firstIdentWithChoices.choicesBox;
                if (Array.isArray(rawBox)) {
                     globalIdentChoices = rawBox.map(c => (typeof c === 'object' ? c.text || c.value : c));
                } else {
                     globalIdentChoices = [rawBox];
                }
            }

            // 2. AUTO-GENERATE BOX IF MISSING (Your Request Fix)
            // If the AI didn't find a box in the text, we create one from the answers.
            if (!globalIdentChoices && identQuestions.length > 0) {
                console.log("No identification box found in source. Auto-generating from answers...");
                // Collect all correct answers
                const collectedAnswers = identQuestions
                    .map(q => q.correctAnswer || q.answer)
                    .filter(a => a && typeof a === 'string'); // Filter valid strings
                
                // Remove duplicates and set as the global box
                if (collectedAnswers.length > 0) {
                    globalIdentChoices = [...new Set(collectedAnswers)];
                }
            }

            // --- Deduplication & Formatting ---
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
                
                const questionText = (normalizedType === 'interpretive' && q.passage)
                    ? `${q.passage}\n\n${q.question || ''}`
                    : (q.question || q.text || 'Question text missing');

                const baseQuestion = {
                    text: questionText,
                    difficulty: q.difficulty || 'easy',
                    explanation: q.explanation || q.solution || '', 
                };

                // Multiple Choice
                if (normalizedType === 'multiple_choice' || normalizedType === 'analogy' || normalizedType === 'interpretive') {
                    const options = q.options || [];
                    const rawAnswer = q.correctAnswer || '';
                    const cleanAnswerText = rawAnswer.replace(/^[a-d][\.\)]\s*/i, '').trim();

                    let correctIndex = options.findIndex(opt => opt.trim() === cleanAnswerText);
                    if (correctIndex === -1) {
                        const letterMatch = rawAnswer.match(/^([a-d])[\.\)]/i);
                        if (letterMatch) {
                            const letterMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
                            correctIndex = letterMap[letterMatch[1].toLowerCase()];
                        }
                    }
                    if (correctIndex === -1) {
                        correctIndex = options.findIndex(opt => {
                            const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
                            const cleanKey = cleanAnswerText.toLowerCase().replace(/[^a-z0-9]/g, '');
                            return cleanOpt === cleanKey || cleanOpt.includes(cleanKey) || cleanKey.includes(cleanOpt);
                        });
                    }

                    if (options.length > 0 && correctIndex === -1) correctIndex = 0; 

                    return {
                        ...baseQuestion,
                        type: 'multiple-choice',
                        options: options.map((opt, idx) => ({ 
                            text: opt, 
                            isCorrect: idx === correctIndex 
                        })),
                        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
                    };
                }
                
                // True/False
                if (normalizedType === 'alternative_response' || normalizedType === 'true_false') {
                    let isTrue = false;
                    if (typeof q.correctAnswer === 'string') {
                        isTrue = q.correctAnswer.toLowerCase() === 'true' || q.correctAnswer.toLowerCase() === 'tama';
                    } else if (typeof q.correctAnswer === 'boolean') {
                        isTrue = q.correctAnswer;
                    }
                    return {
                        ...baseQuestion,
                        type: 'true-false',
                        correctAnswer: isTrue,
                    };
                }
                
                // Identification
                if (normalizedType === 'identification' || normalizedType === 'solving') {
                    const answer = q.correctAnswer || q.answer;
                    if (answer) {
                        return {
                            ...baseQuestion,
                            type: 'identification',
                            correctAnswer: answer,
                            choicesBox: globalIdentChoices, // USES THE AUTO-GENERATED BOX HERE
                        };
                    }
                }
                
                // Matching Type
                if (normalizedType === 'matching_type' || normalizedType === 'matching-type') {
                    const prompts = q.prompts || [];
                    const options = q.options || [];
                    const correctPairs = q.correctPairs || {};

                    if (prompts.length > 0 && options.length > 0) {
                        return {
                            ...baseQuestion,
                            text: q.instruction || 'Match the following items.',
                            type: 'matching-type',
                            prompts: prompts,
                            options: options,
                            correctPairs: correctPairs,
                        };
                    }
                }
                
                // Essay
                if (normalizedType === 'essay') {
                    return {
                        ...baseQuestion,
                        type: 'essay',
                        rubric: q.rubric || [],
                    };
                }

                return null;
            }).filter(Boolean);

            if (formattedQuestions.length === 0) {
                throw new Error("No compatible questions could be formatted for saving.");
            }

            const quizRef = doc(collection(db, 'quizzes'));
            const finalPayload = {
                title: `Uploaded: ${quizData.title || 'Extracted Quiz'}`,
                language: 'English',
                unitId: unitId,
                subjectId: subjectId,
                lessonId: null, 
                createdAt: serverTimestamp(),
                createdBy: 'AI-Extractor',
                questions: formattedQuestions,
            };

            await setDoc(quizRef, finalPayload);
            showToast("Quiz saved successfully!", "success");
            onAiComplete(finalPayload); 

        } catch (err) {
            console.error("Save Error", err);
            showToast(`Save failed: ${err.message}`, "error");
        } finally {
            setProgressMessage('');
        }
    };

    const handleGenerateQuiz = async () => {
        if (!file) return setError('Please upload a file first.');
        setIsProcessing(true);
        setError('');
        setProgressPercent(10);
        setGeneratedQuizData(null);

        try {
            setProgressMessage('Extracting content structure...');
            const fullText = await extractTextFromFile(file);
            if (fullText.length < 50) throw new Error("File content is too short.");
            
            setProgressPercent(30);

            const chunkSize = 5000;
            const chunks = [];
            for (let i = 0; i < fullText.length; i += chunkSize) {
                chunks.push(fullText.substring(i, i + chunkSize));
            }

            let accumulatedQuestions = [];
            let quizTitle = "Extracted Quiz";

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const isFirstChunk = i === 0;
                const currentProgress = 30 + Math.round(((i + 1) / chunks.length) * 60);
                
                setProgressPercent(currentProgress);
                setProgressMessage(`Transcribing section ${i + 1} of ${chunks.length}...`);

                const prompt = `
                You are a precise Data Entry Specialist.
                
                **TASK:** Convert the document content into strict JSON.
                
                **RULES FOR EXACTNESS:**
                1. **VERBATIM:** Copy text exactly. Do not paraphrase.
                2. **MATH:** Interpret HTML/Unicode. "x<sup>2</sup>" -> "$x^2$".
                
                **DATA STRUCTURE RULES:**
                1. **MATCHING TYPE:** Return a SINGLE object for the whole section:
                   - "type": "matching-type"
                   - "prompts": [{"id": "1", "text": "Question..."}]
                   - "options": [{"id": "a", "text": "Answer..."}]
                   - "correctPairs": {"1": "a"}
                
                2. **IDENTIFICATION:**
                   - If a 'Word Box' exists in the text, extract it to "choicesBox".
                   - If NO 'Word Box' exists, strictly return "choicesBox": null. (The system will auto-generate it).
                   - "type": "identification"
                   - "correctAnswer": "Answer"
                
                3. **MULTIPLE CHOICE:**
                   - "options": ["Option A", "Option B"] (No "a.", "b." prefixes)
                   - "correctAnswer": "Answer Text"

                **INPUT TEXT:**
                ---
                ${chunk}
                ---

                **JSON OUTPUT FORMAT:**
                {
                  ${isFirstChunk ? '"title": "Extracted Exam Title",' : ''}
                  "questions": [
                    {
                      "text": "Question text...",
                      "type": "multiple_choice | alternative_response | identification | matching-type | essay",
                      "options": [], 
                      "correctAnswer": "Answer",
                      "choicesBox": [] 
                    }
                  ]
                }
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

            if (accumulatedQuestions.length === 0) throw new Error("No questions could be extracted.");

            const sanitizedQuestions = accumulatedQuestions.map(q => {
                let type = (q.type || 'multiple_choice').toLowerCase().replace('-', '_'); 
                if (type === 'true_false') type = 'alternative_response';
                
                if (q.options && Array.isArray(q.options)) {
                    q.options = q.options.map(opt => opt.toString().replace(/^[a-zA-Z0-9]+\.\s*/, '').trim());
                }

                return { ...q, type };
            }).filter(q => q.text || q.prompts);

            const finalQuizData = {
                title: quizTitle || "Generated Quiz",
                questions: sanitizedQuestions
            };

            setGeneratedQuizData(finalQuizData);
            showToast(`Extracted ${sanitizedQuestions.length} items. Ready to save!`, 'success');

        } catch (err) {
            console.error('Quiz Gen Error:', err);
            setError('Failed to process file. Ensure text is readable.');
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
                        <h3 className={`text-lg font-bold tracking-tight leading-tight ${themeStyles.textColor}`}>AI Quiz Extractor</h3>
                        <p className={`text-[12px] font-medium hidden sm:block ${themeStyles.subText}`}>Import from PDF/DOCX</p>
                    </div>
                </div>
                <button onClick={onBack} className={`px-4 py-2 rounded-[20px] text-[13px] font-semibold transition-all flex items-center gap-2 backdrop-blur-md active:scale-95 border border-transparent ${activeOverlay !== 'none' ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200'}`}>
                    <ArrowUturnLeftIcon className="w-4 h-4 stroke-[2.5]" /> Back
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col items-center justify-center p-6 relative z-0">
                
                <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse ${activeOverlay === 'christmas' ? 'bg-red-500/10' : activeOverlay === 'cyberpunk' ? 'bg-fuchsia-500/10' : 'bg-blue-400/10'}`} />
                <div className={`absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl animate-pulse delay-1000 ${activeOverlay === 'christmas' ? 'bg-green-500/10' : activeOverlay === 'cyberpunk' ? 'bg-cyan-500/10' : 'bg-purple-400/10'}`} />

                <div className={`w-full max-w-2xl p-8 relative z-10 backdrop-blur-xl border rounded-[24px] shadow-2xl transition-all duration-500 ${themeStyles.panelBg} ${themeStyles.borderColor} shadow-black/5`}>
                    
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-500">
                            <div className="relative w-24 h-24 mb-6">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className={`opacity-20 ${themeStyles.progressColor}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`drop-shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out ${themeStyles.progressColor}`} strokeDasharray={`${progressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className={`absolute inset-0 flex items-center justify-center ${themeStyles.progressColor}`}>
                                    <BoltIcon className="w-8 h-8 animate-pulse" />
                                </div>
                            </div>
                            <h4 className={`text-xl font-bold mb-2 ${themeStyles.textColor}`}>Scanning Document</h4>
                            <p className={`text-sm font-medium ${themeStyles.subText}`}>{progressMessage}</p>
                        </div>
                    ) : generatedQuizData ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${themeStyles.iconBg} text-green-500`}>
                                <SparklesIcon className="w-9 h-9" />
                            </div>
                            <h2 className={`text-2xl font-bold mb-2 ${themeStyles.textColor}`}>Extraction Complete!</h2>
                            <p className={`text-sm mb-6 ${themeStyles.subText}`}>
                                Successfully extracted <strong>{generatedQuizData.questions.length}</strong> items.
                            </p>
                            
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
                                    className={`w-full py-3 rounded-[18px] font-semibold text-sm transition-all ${themeStyles.textColor} opacity-70 hover:opacity-100 hover:bg-white/10`}
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
                                    Supports PDF and DOCX.<br/>
                                    <span className="opacity-75 text-xs">Best for existing exams with Identification, Matching, and Multiple Choice.</span>
                                </p>
                            </div>

                            {!file ? (
                                <label className={`group flex flex-col items-center justify-center w-full h-64 rounded-[24px] border-2 border-dashed transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.99] ${themeStyles.uploadBorder} ${activeOverlay !== 'none' ? 'bg-black/20' : 'bg-white/50 dark:bg-white/5'}`}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                                    
                                    <div className={`p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 ring-1 ring-black/5 ${activeOverlay !== 'none' ? 'bg-white/10' : 'bg-white dark:bg-white/10'}`}>
                                        <DocumentArrowUpIcon className={`w-10 h-10 stroke-[1.5] ${themeStyles.accentColor}`} />
                                    </div>
                                    
                                    <span className={`text-lg font-bold ${themeStyles.textColor}`}>Click or Drag File Here</span>
                                    <span className={`text-sm mt-1 font-medium ${themeStyles.subText}`}>PDF, DOCX</span>
                                    <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
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
                                        className={`w-full py-3.5 rounded-[18px] font-bold text-[15px] text-white shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 group ${activeOverlay !== 'none' ? `bg-gradient-to-r ${themeStyles.buttonGradient} shadow-black/20` : 'bg-[#007AFF] hover:bg-[#0062CC] shadow-blue-500/30 hover:shadow-blue-500/50'}`}
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