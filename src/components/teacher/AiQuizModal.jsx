import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    SparklesIcon, 
    XMarkIcon, 
    ArrowPathIcon, 
    CheckIcon, 
    ListBulletIcon, 
    QueueListIcon, 
    ChatBubbleLeftRightIcon, 
    DocumentTextIcon, 
    HashtagIcon,
    CheckCircleIcon,
    ArrowUturnLeftIcon,
    SquaresPlusIcon 
} from '@heroicons/react/24/outline';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { getAllSubjects } from '../../services/firestoreService';
import { useToast } from '../../contexts/ToastContext';
import ContentRenderer from './ContentRenderer';

// --- UTILS ---
const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

const extractJson = (text) => {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    return text;
};

const tryParseJson = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn("Standard JSON.parse failed. Attempting to fix AI JSON output.");
    let sanitizedString = jsonString
      .replace(/```json|```/g, '')
      .replace(/,\s*([}\]])/g, '$1') // Trailing commas
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":') // Unquoted keys
      .replace(/[“”]/g, '"') // Smart quotes
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\') // Backslashes
      .replace(/[\u0000-\u001F]+/g, ' ') // Newlines in strings
      .trim();
    return JSON.parse(sanitizedString);
  }
};

// --- STYLES ---
const inputClass = "w-full bg-slate-50 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/10 rounded-[12px] px-3 py-2.5 text-[14px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] outline-none transition-all shadow-sm";
const labelClass = "text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 block";
const cardClass = "bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 rounded-[20px] shadow-sm overflow-hidden";

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();
    
    // Config State
    const [step, setStep] = useState(1);
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
    const [language, setLanguage] = useState('English');
    const [revisionPrompt, setRevisionPrompt] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(subjectId || '');
    const [subjects, setSubjects] = useState([]);

    // Mixed Distribution State
    const [distribution, setDistribution] = useState({
        'multiple-choice': 5,
        'true-false': 5,
        'identification': 0,
        'matching-type': 0,
        'essay': 0
    });
    
    // Processing State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubjects = async () => {
            const subs = await getAllSubjects();
            setSubjects(subs);
        };
        if (isOpen) fetchSubjects();
    }, [isOpen]);

    // Reset on Open
    useEffect(() => {
        if (isOpen) {
            setStep(1); setItemCount(10); setQuizType('multiple-choice'); 
            setLanguage('English'); setRevisionPrompt(''); setIsGenerating(false); 
            setGeneratedQuiz(null); setError('');
            setDistribution({ 'multiple-choice': 5, 'true-false': 5, 'identification': 0, 'matching-type': 0, 'essay': 0 });
        }
    }, [isOpen]);

    // Auto-update distribution when itemCount changes
    useEffect(() => {
        if (quizType === 'mixed') {
            const currentTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
            if (currentTotal !== itemCount) {
                const otherTypesTotal = currentTotal - distribution['multiple-choice'];
                const newMC = Math.max(0, itemCount - otherTypesTotal);
                setDistribution(prev => ({ ...prev, 'multiple-choice': newMC }));
            }
        }
    }, [itemCount]);

    const handleDistributionChange = (type, val) => {
        const newValue = Math.max(0, parseInt(val) || 0);
        setDistribution(prev => ({ ...prev, [type]: newValue }));
    };

    // --- LOGIC ---

    const constructPrompt = (isRevision = false) => {
        if (isRevision && generatedQuiz) {
              return `You are a senior quiz editor. Revise the JSON below based on: "${revisionPrompt}". 
              Language: ${language}. Return ONLY valid JSON.
              \`\`\`json
              ${JSON.stringify(generatedQuiz)}
              \`\`\``;
        }

        const lessonContent = lesson?.pages?.map(p => `## ${p.title}\n${p.content}`).join('\n\n') || '';
        const subjectTitle = subjects.find(s => s.id === selectedSubject)?.title || '';
        
        // --- GRADE LEVEL DETECTION LOGIC ---
        // Looks for numbers 7-12 in the subject title (e.g., "English 7", "Math 10", "Grade 8 Science")
        const gradeMatch = subjectTitle.match(/\b(7|8|9|10|11|12)\b/);
        const targetAudience = gradeMatch 
            ? `Grade ${gradeMatch[0]} Students` 
            : "High School Students";
        
        let formatInstructions = '';
        
        if (quizType === 'mixed') {
            const distStrings = Object.entries(distribution)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => `${count} ${type}`);
            
            formatInstructions = `
            Format: Generate exactly ${itemCount} items with this distribution: ${distStrings.join(', ')}.
            
            CRITICAL OUTPUT RULES FOR MIXED TYPES:
            1. Return a single "questions" array.
            2. For "matching-type" items: Return 1 object per group. The object MUST have a "pairs" array (prompt/answer).
            3. For "essay" items: MUST have a "rubric" array.
            4. For "multiple-choice": MUST have "options" array.
            5. For "true-false" and "identification": MUST have "correctAnswer".
            `;
        } else if (quizType === 'matching-type') {
            formatInstructions = `Format: Generate ${itemCount} items. Return a "questions" array with 1 object of type "matching-type". This object MUST have a "pairs" array containing objects with "prompt" and "answer" keys.`;
        } else if (quizType === 'essay') {
            formatInstructions = `Format: Generate ${itemCount} essay questions. Each question needs a "rubric" array (criteria, points).`;
        } else {
            formatInstructions = `Format: Generate ${itemCount} items of type "${quizType}".`;
        }

        return `
        Role: DepEd Assessment Specialist.
        Context: Topic "${lesson?.title}", Subject "${subjectTitle}".
        Target Audience: ${targetAudience}. (IMPORTANT: Adjust vocabulary, sentence complexity, and cognitive load to be appropriate for ${targetAudience}).
        Language: ${language} ${language === 'Filipino' ? '(Use Tama/Mali for T/F)' : ''}.
        Source Material:
        ${lessonContent.substring(0, 8000)}

        Instructions:
        1. ${formatInstructions}
        2. Difficulty: Mix of Easy/Average/Hard appropriate for ${targetAudience}.
        3. No AI tropes like "According to the text".
        4. Output strictly valid JSON.

        Required JSON Structure:
        {
          "title": "Quiz Title",
          "questions": [
            {
              "text": "Question...",
              "type": "multiple-choice | true-false | identification | matching-type | essay",
              "points": 1,
              "explanation": "Rationale...",
              // If MC:
              "options": [{ "text": "A", "isCorrect": false }, { "text": "B", "isCorrect": true }],
              // If T/F:
              "correctAnswer": true,
              // If Identification:
              "correctAnswer": "Answer",
              // If Essay:
              "rubric": [{ "criteria": "Content", "points": 5 }],
              // If Matching:
              "pairs": [{ "prompt": "Capital of France", "answer": "Paris" }] 
            }
          ]
        }
        `;
    };

    const handleGenerate = async (isRevision = false) => {
        if (!isRevision && quizType === 'mixed') {
            const total = Object.values(distribution).reduce((a, b) => a + b, 0);
            if (total !== itemCount) {
                setError(`Distribution total (${total}) does not match Item Count (${itemCount}).`);
                return;
            }
        }

        setIsGenerating(true);
        setError('');
        try {
            const prompt = constructPrompt(isRevision);
            const aiText = await callGeminiWithLimitCheck(prompt);
            const response = tryParseJson(extractJson(aiText));

            if (!response || !response.questions) throw new Error("Invalid JSON structure.");

            // Post-Processing
            const processedQuestions = response.questions.map(q => {
                const base = {
                    id: uniqueId(),
                    text: q.text || 'Question',
                    type: q.type || quizType,
                    points: q.points || 1,
                    explanation: q.explanation || ''
                };

                if (base.type === 'matching-type' && q.pairs) {
                    const prompts = [];
                    const options = [];
                    const correctPairs = {};

                    q.pairs.forEach((pair) => {
                        const pId = uniqueId();
                        const oId = uniqueId();
                        prompts.push({ id: pId, text: pair.prompt });
                        options.push({ id: oId, text: pair.answer });
                        correctPairs[pId] = oId;
                    });

                    options.sort(() => Math.random() - 0.5);
                    return { ...base, prompts, options, correctPairs };
                }
                
                if (base.type === 'multiple-choice') {
                    return { ...base, options: q.options ? q.options.map(o => ({ text: String(o.text), isCorrect: !!o.isCorrect })) : [] };
                }

                if (base.type === 'essay') {
                    return { ...base, rubric: q.rubric || [{ id: uniqueId(), criteria: 'Content', points: 5 }] };
                }

                return { ...base, correctAnswer: q.correctAnswer };
            });

            setGeneratedQuiz({ ...response, questions: processedQuestions });
            setStep(3);
        } catch (err) {
            console.error(err);
            setError("Failed to generate quiz. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        setIsGenerating(true);
        try {
            await setDoc(doc(collection(db, 'quizzes')), {
                ...generatedQuiz,
                unitId: lesson.unitId || unitId,
                subjectId,
                lessonId: lesson.id,
                createdAt: serverTimestamp(),
                createdBy: 'AI'
            });
            setStep(4);
            showToast("Quiz saved successfully!", "success");
        } catch (err) {
            showToast("Database error.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- RENDER HELPERS ---

    const QuizTypeCard = ({ id, label, icon: Icon }) => (
        <button 
            onClick={() => setQuizType(id)}
            className={`flex flex-col items-center justify-center p-3 rounded-[16px] border transition-all duration-200 ${quizType === id 
                ? 'bg-[#007AFF]/5 border-[#007AFF] text-[#007AFF] ring-1 ring-[#007AFF]' 
                : 'bg-white dark:bg-[#2c2c2e] border-black/5 dark:border-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-[#3a3a3c]'}`}
        >
            <Icon className="w-6 h-6 mb-2" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-center leading-tight uppercase">{label}</span>
        </button>
    );

    const DistributionInput = ({ type, label }) => (
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#2c2c2e] border border-black/5 dark:border-white/5">
            <span className="text-xs font-bold text-slate-500 uppercase ml-1">{label}</span>
            <input 
                type="number" 
                value={distribution[type]} 
                onChange={(e) => handleDistributionChange(type, e.target.value)}
                className="w-12 text-center text-sm font-bold bg-white dark:bg-black/20 rounded border border-black/10 dark:border-white/10 py-1"
            />
        </div>
    );

    const PreviewItem = ({ q, i }) => (
        <div className="p-4 bg-slate-50 dark:bg-[#2c2c2e] rounded-[16px] border border-black/5 dark:border-white/5 space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Question {i + 1} • {q.type}</span>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200"><ContentRenderer text={q.text} /></div>
                </div>
                <span className="text-xs font-bold bg-white dark:bg-black/20 px-2 py-1 rounded border border-black/5 dark:border-white/5">{q.points}pts</span>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 pl-2 border-l-2 border-[#007AFF]/30">
                {q.type === 'multiple-choice' && (
                    <ul className="space-y-1">
                        {q.options?.map((o, idx) => (
                            <li key={idx} className={`flex items-center gap-2 ${o.isCorrect ? 'text-green-600 dark:text-green-400 font-bold' : ''}`}>
                                {o.isCorrect && <CheckIcon className="w-4 h-4" />}
                                {o.text}
                            </li>
                        ))}
                    </ul>
                )}
                {(q.type === 'true-false' || q.type === 'identification') && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                        <CheckIcon className="w-4 h-4" /> {String(q.correctAnswer)}
                    </div>
                )}
                {q.type === 'matching-type' && (
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div><strong className="block mb-1">Prompts</strong>{q.prompts?.map(p => <div key={p.id} className="mb-1">• {p.text}</div>)}</div>
                        <div><strong className="block mb-1">Options</strong>{q.options?.map(o => <div key={o.id} className="mb-1">• {o.text}</div>)}</div>
                    </div>
                )}
                {q.type === 'essay' && (
                    <div className="text-xs">
                        <strong className="block mb-1">Rubric:</strong>
                        {q.rubric?.map((r, idx) => <div key={idx}>{r.criteria} ({r.points}pts)</div>)}
                    </div>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col h-full bg-[#F2F2F7] dark:bg-[#000000] font-sans text-slate-900 dark:text-white">
            
            {/* --- HEADER --- */}
            <div className="flex-shrink-0 px-8 py-5 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1c1e] z-20 sticky top-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {step > 1 && step < 4 && (
                            <button onClick={() => setStep(step - 1)} className="p-2.5 rounded-full bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 transition-all active:scale-95">
                                <ArrowUturnLeftIcon className="w-5 h-5 text-slate-600 dark:text-white" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">AI Quiz Generator</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                {step === 1 ? 'Configuration' : step === 3 ? 'Review' : 'Completed'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-slate-100 dark:bg-[#2c2c2e] hover:bg-red-50 hover:text-red-500 transition-all">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-5xl mx-auto w-full">
                
                {/* STEP 1: CONFIGURATION */}
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                        <div className="space-y-6">
                            <div className={cardClass + " p-6"}>
                                <label className={labelClass}><SparklesIcon className="w-4 h-4 inline mr-1"/> Context</label>
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-sm font-medium block mb-1">Source Lesson</span>
                                        <div className="p-3 bg-slate-50 dark:bg-[#2c2c2e] rounded-xl text-sm border border-black/5 dark:border-white/5 font-semibold text-[#007AFF]">
                                            {lesson?.title || 'No Lesson Selected'}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium block mb-1">Subject</span>
                                        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={inputClass}>
                                            <option value="" disabled>Select Subject</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className={cardClass + " p-6"}>
                                <label className={labelClass}><HashtagIcon className="w-4 h-4 inline mr-1"/> Parameters</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm font-medium block mb-1">Total Items</span>
                                        <input type="number" value={itemCount} onChange={(e) => setItemCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} className={inputClass} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium block mb-1">Language</span>
                                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                                            <option value="English">English</option>
                                            <option value="Filipino">Filipino</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Mixed Distribution Controls */}
                            {quizType === 'mixed' && (
                                <div className={cardClass + " p-6 border-[#007AFF] ring-1 ring-[#007AFF]/20"}>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className={labelClass + " !mb-0 text-[#007AFF]"}>Item Distribution</label>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${Object.values(distribution).reduce((a,b)=>a+b,0) === itemCount ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {Object.values(distribution).reduce((a,b)=>a+b,0)} / {itemCount}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <DistributionInput type="multiple-choice" label="Multiple Choice" />
                                        <DistributionInput type="true-false" label="True / False" />
                                        <DistributionInput type="identification" label="Identification" />
                                        <DistributionInput type="matching-type" label="Matching Type" />
                                        <DistributionInput type="essay" label="Essay" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={cardClass + " p-6 h-fit"}>
                            <label className={labelClass}><ListBulletIcon className="w-4 h-4 inline mr-1"/> Quiz Structure</label>
                            <div className="grid grid-cols-2 gap-3">
                                <QuizTypeCard id="multiple-choice" label="Multiple Choice" icon={ListBulletIcon} />
                                <QuizTypeCard id="true-false" label="True / False" icon={CheckIcon} />
                                <QuizTypeCard id="identification" label="Identification" icon={DocumentTextIcon} />
                                <QuizTypeCard id="matching-type" label="Matching Type" icon={QueueListIcon} />
                                <QuizTypeCard id="essay" label="Essay" icon={ChatBubbleLeftRightIcon} />
                                <QuizTypeCard id="mixed" label="Mixed" icon={SquaresPlusIcon} />
                            </div>
                        </div>
                    </div>
                )}

                {/* LOADING STATE */}
                {isGenerating && step !== 4 && (
                    <div className="flex flex-col items-center justify-center h-full py-20 animate-in fade-in zoom-in-95">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#007AFF] rounded-full border-t-transparent animate-spin"></div>
                            <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-[#007AFF] animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Generating Quiz...</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Crafting questions based on your lesson.</p>
                    </div>
                )}

                {/* STEP 3: PREVIEW */}
                {step === 3 && generatedQuiz && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-4 fade-in duration-500">
                        <div className="flex flex-col lg:flex-row gap-6 h-full">
                            <div className="flex-1 space-y-4 pb-20">
                                <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[24px] border border-black/5 dark:border-white/5 shadow-sm mb-4">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{generatedQuiz.title}</h2>
                                    <div className="flex gap-2 mt-2">
                                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-xs font-bold text-slate-500">{generatedQuiz.questions.length} Items</span>
                                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-xs font-bold text-slate-500">{quizType === 'mixed' ? 'Mixed' : quizType}</span>
                                    </div>
                                </div>
                                {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                            </div>
                            <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
                                <div className={cardClass + " p-5 sticky top-6"}>
                                    <label className={labelClass}>Refinement</label>
                                    <textarea value={revisionPrompt} onChange={(e) => setRevisionPrompt(e.target.value)} placeholder="Make it harder..." className={`${inputClass} min-h-[100px] mb-4 text-sm`} />
                                    <button onClick={() => handleGenerate(true)} disabled={isGenerating} className="w-full py-2.5 rounded-[12px] font-bold text-sm bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#3a3a3c] flex items-center justify-center gap-2">
                                        <ArrowPathIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} /> Regenerate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: SUCCESS */}
                {step === 4 && (
                    <div className="flex flex-col items-center justify-center h-full py-20 animate-in zoom-in-95">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6 text-green-500">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Quiz Saved!</h2>
                        <button onClick={onClose} className="px-8 py-3 mt-6 rounded-[14px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 transition-transform">Close</button>
                    </div>
                )}
            </div>

            {/* --- FOOTER ACTIONS --- */}
            {step !== 4 && !isGenerating && (
                <div className="flex-shrink-0 px-8 py-5 border-t border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1c1e] z-20">
                    <div className="flex justify-between items-center max-w-5xl mx-auto w-full">
                        {error && <span className="text-xs font-bold text-red-500">{error}</span>}
                        <div className="flex justify-end gap-3 ml-auto">
                            {step === 1 && (
                                <button onClick={() => handleGenerate(false)} className="px-8 py-3 rounded-[14px] bg-gradient-to-r from-[#007AFF] to-[#0051A8] text-white font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5" /> Generate Quiz
                                </button>
                            )}
                            {step === 3 && (
                                <button onClick={handleSave} className="px-8 py-3 rounded-[14px] bg-green-500 text-white font-bold shadow-lg shadow-green-500/30 hover:scale-105 transition-transform flex items-center gap-2">
                                    <CheckIcon className="w-5 h-5 stroke-[3]" /> Save to Unit
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}