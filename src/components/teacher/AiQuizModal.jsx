// src/components/quizzes/AiQuizModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    SparklesIcon, XMarkIcon, ArrowPathIcon, CheckIcon, 
    ListBulletIcon, QueueListIcon, ChatBubbleLeftRightIcon, 
    DocumentTextIcon, SquaresPlusIcon, CheckCircleIcon, 
    ChevronRightIcon, BeakerIcon, LightBulbIcon
} from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { getAllSubjects } from '../../services/firestoreService';
import { useToast } from '../../contexts/ToastContext';
import ContentRenderer from './ContentRenderer';

// --- UTILITIES ---
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
    console.warn("AI JSON Parse Error, attempting sanitization...");
    let sanitizedString = jsonString
      .replace(/```json|```/g, '')
      .replace(/,\s*([}\]])/g, '$1') 
      .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":') 
      .replace(/[“”]/g, '"') 
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\') 
      .trim();
    return JSON.parse(sanitizedString);
  }
};

const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// --- SUB-COMPONENTS ---

const QuizTypeCard = ({ label, icon: Icon, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`
            relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border transition-all duration-200 w-full aspect-square sm:aspect-auto sm:h-24 group
            ${selected 
                ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900 shadow-md scale-[1.02]' 
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }
        `}
    >
        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 mb-2 transition-transform duration-200 ${selected ? 'scale-110' : 'group-hover:scale-110 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'}`} />
        <span className="text-[10px] sm:text-[11px] font-semibold text-center leading-tight tracking-wide">{label}</span>
    </button>
);

const StepIndicator = ({ step, current, label }) => {
    const isCompleted = step < current;
    const isCurrent = step === current;
    
    return (
        <div className={`flex items-center gap-3 transition-opacity duration-300 ${isCurrent ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 border
                ${isCurrent ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900' : ''}
                ${isCompleted ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900' : ''}
                ${!isCurrent && !isCompleted ? 'bg-transparent border-zinc-300 dark:border-zinc-700 text-zinc-400' : ''}
            `}>
                {isCompleted ? <CheckIcon className="w-4 h-4" /> : step}
            </div>
            <span className={`text-sm font-medium ${isCurrent ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                {label}
            </span>
        </div>
    );
};

// --- MAIN COMPONENT ---

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();
    
    const [step, setStep] = useState(1); 
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
    const [language, setLanguage] = useState('English');
    const revisionInputRef = useRef(null); 

    const [selectedSubject, setSelectedSubject] = useState(subjectId || '');
    const [subjects, setSubjects] = useState([]);
    const [loadingText, setLoadingText] = useState('Analyzing architecture...');

    const [distribution, setDistribution] = useState({
        'multiple-choice': 5, 'true-false': 5, 'identification': 0, 'matching-type': 0, 'essay': 0
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);

    useEffect(() => {
        if (isOpen) {
            getAllSubjects().then(setSubjects);
            setStep(1); setItemCount(10); setQuizType('multiple-choice'); 
            setLanguage('English'); 
            setIsGenerating(false); 
            setGeneratedQuiz(null);
            setDistribution({ 'multiple-choice': 5, 'true-false': 5, 'identification': 0, 'matching-type': 0, 'essay': 0 });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isGenerating) return;
        const messages = ["Extracting core concepts...", "Formulating independent queries...", "Refining distractors...", "Validating format..."];
        let i = 0;
        const interval = setInterval(() => {
            setLoadingText(messages[i % messages.length]);
            i++;
        }, 1800);
        return () => clearInterval(interval);
    }, [isGenerating]);

    useEffect(() => {
        if (quizType === 'mixed') {
            const currentTotal = Object.values(distribution).reduce((a, b) => a + b, 0);
            if (currentTotal !== itemCount) {
                const otherTypesTotal = currentTotal - distribution['multiple-choice'];
                const newMC = Math.max(0, itemCount - otherTypesTotal);
                setDistribution(prev => ({ ...prev, 'multiple-choice': newMC }));
            }
        }
    }, [itemCount, quizType]);

    const handleDistributionChange = (type, val) => {
        const newValue = Math.max(0, parseInt(val) || 0);
        setDistribution(prev => ({ ...prev, [type]: newValue }));
    };

    // --- LOGIC: RESTORED DETAILED PROMPT + ZERO CITATION RULE ---
    const constructPrompt = (isRevision = false, manualInstruction = '') => {
        if (isRevision && generatedQuiz) {
              return `
              Role: Senior DepEd Assessment Editor.
              Task: Revise the JSON below based on the user's feedback: "${manualInstruction}".
              Language: ${language}.
              Constraint: Return ONLY valid JSON.
              
              \`\`\`json
              ${JSON.stringify(generatedQuiz)}
              \`\`\``;
        }

        const lessonContent = lesson?.pages?.map(p => `## ${p.title}\n${p.content}`).join('\n\n') || '';
        const subjectTitle = subjects.find(s => s.id === selectedSubject)?.title || '';
        
        const gradeMatch = subjectTitle.match(/\b(7|8|9|10|11|12)\b/);
        const gradeLevel = gradeMatch ? `Grade ${gradeMatch[0]}` : "High School";
        
        let formatInstructions = '';
        
        if (quizType === 'mixed') {
            const distStrings = Object.entries(distribution).filter(([_, count]) => count > 0).map(([type, count]) => `${count} ${type}`);
            formatInstructions = `
            Task Requirement: Generate exactly ${itemCount} items with this specific distribution: ${distStrings.join(', ')}.
            `;
        } else {
            formatInstructions = `Task Requirement: Generate ${itemCount} items of type "${quizType}".`;
        }

        return `
        Role: Expert DepEd Curriculum Developer.
        Target Audience: ${gradeLevel} Students in the Philippines.
        Language: ${language} ${language === 'Filipino' ? '(Ensure formal academic Filipino)' : '(English)'}.
        Topic: "${lesson?.title}" (Subject: ${subjectTitle}).
        
        Information Base:
        ${lessonContent.substring(0, 8000)}

        --- 🚨 CRITICAL INSTRUCTION: ZERO-CITATION / STAND-ALONE QUESTIONS 🚨 ---
        You are generating a quiz that students will take **without** access to the lesson text.
        
        **FORBIDDEN PHRASES (Do NOT use these):**
        ❌ "According to the lesson..."
        ❌ "Based on the text/module..."
        ❌ "As mentioned in the video..."
        ❌ "In the given material..."
        ❌ "In the symphony metaphor..." (unless you explain the metaphor in the question itself)
        ❌ "Why does the author say..."

        **CORRECT APPROACH:**
        1. **Convert facts into general knowledge questions.**
           * Bad: "According to the module, what is the powerhouse of the cell?"
           * Good: "What organelle is known as the powerhouse of the cell?"
        
        2. **Contextualize Metaphors/Scenarios:**
           * If the lesson uses a metaphor (e.g., "Life is a symphony"), you MUST include the context in the question text.
           * Bad: "What does the violin represent?" (Student has no context)
           * Good: "*In the metaphor where life is described as a symphony, the violin represents the soul.* \n\n Based on this analogy, what role does the conductor play?"

        --- RULES & STANDARDS ---
        1. **DepEd Standards**: Use Filipino context (names like Juan/Maria, local settings) where applicable.
        2. **Answer Length (ANTI-BIAS)**: For Multiple Choice, ensure ALL options (distractors and correct answer) are of **similar length and complexity**. Do NOT make the correct answer significantly longer or more detailed than the wrong ones.
        3. **Structure**: 
           - **Multiple Choice**: Plausible distractors. Provide 4 options per question.
           - **True/False**: No double negatives.
           - **Matching**: Homogeneous lists.
        4. **Formatting**:
           - ${formatInstructions}
           - **Output**: Return ONLY raw, valid JSON.

        --- REQUIRED JSON STRUCTURE ---
        {
          "title": "Quiz Title",
          "questions": [
            {
              "text": "Question Text...", 
              "type": "multiple-choice | true-false | identification | matching-type | essay",
              "points": 1, 
              "explanation": "Rationale...",
              "options": [
                { "text": "Distractor", "isCorrect": false },
                { "text": "Correct", "isCorrect": true }
              ],
              "correctAnswer": true, // OR String for ID
              "rubric": [ { "criteria": "Content", "points": 5 } ],
              "pairs": [ { "prompt": "A", "answer": "B" } ] 
            }
          ]
        }
        `;
    };

    const handleGenerate = async (isRevision = false) => {
        const manualInstruction = isRevision && revisionInputRef.current ? revisionInputRef.current.value : '';
        setIsGenerating(true);
        setStep(2); 
        
        try {
            const prompt = constructPrompt(isRevision, manualInstruction);
            const aiText = await callGeminiWithLimitCheck(prompt);
            const response = tryParseJson(extractJson(aiText));

            if (!response || !response.questions) throw new Error("Invalid JSON");

            const processedQuestions = response.questions.map(q => {
                const base = { id: uniqueId(), text: q.text, type: q.type || quizType, explanation: q.explanation || '' };

                if (base.type === 'multiple-choice') {
                    let rawOptions = q.options ? q.options.map(o => ({ text: String(o.text), isCorrect: !!o.isCorrect })) : [];
                    const shuffledOptions = shuffleArray(rawOptions);
                    const correctIndex = shuffledOptions.findIndex(o => o.isCorrect);
                    
                    return { 
                        ...base, options: shuffledOptions, points: 1, 
                        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
                        correctAnswer: correctIndex > -1 ? ['A', 'B', 'C', 'D'][correctIndex] : 'A'
                    };
                }
                if (base.type === 'matching-type' && q.pairs) {
                    const prompts = []; const options = []; const correctPairs = {};
                    q.pairs.forEach((pair) => {
                        const pId = uniqueId(); const oId = uniqueId();
                        prompts.push({ id: pId, text: pair.prompt }); options.push({ id: oId, text: pair.answer });
                        correctPairs[pId] = oId;
                    });
                    return { ...base, prompts, options: options.sort(() => Math.random() - 0.5), correctPairs, points: q.pairs.length };
                }
                if (base.type === 'essay') {
                    const rubric = q.rubric || [{ id: uniqueId(), criteria: 'Content', points: 5 }];
                    return { ...base, rubric, points: rubric.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0) };
                }
                return { ...base, points: 1, correctAnswer: q.correctAnswer };
            });

            setGeneratedQuiz({ ...response, questions: processedQuestions });
            setStep(3); 
        } catch (err) {
            showToast("Generation failed. Retrying in simpler format.", "error");
            setStep(1); 
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        setIsGenerating(true);
        try {
            await setDoc(doc(collection(db, 'quizzes')), {
                ...generatedQuiz, unitId: lesson.unitId || unitId, subjectId, lessonId: lesson.id,
                createdAt: serverTimestamp(), createdBy: 'AI', status: 'published'
            });
            setStep(4); 
            showToast("Quiz elegantly published.", "success");
        } catch (err) {
            showToast("Failed to publish.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- VIEWS ---
    const ConfigForm = () => (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Subject</label>
                    <div className="relative">
                        <select 
                            value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 pr-10 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
                        >
                            <option value="" disabled>Select subject framework...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                        <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90 pointer-events-none"/>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Language</label>
                        <div className="relative">
                            <select 
                                value={language} onChange={(e) => setLanguage(e.target.value)}
                                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                            >
                                <option>English</option><option>Filipino</option>
                            </select>
                            <ChevronRightIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90 pointer-events-none"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Items</label>
                        <input 
                            type="number" value={itemCount} onChange={(e) => setItemCount(Math.min(50, Math.max(1, parseInt(e.target.value)||1)))}
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Strategy</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                    {[
                        { id: 'multiple-choice', label: 'Multi Choice', icon: ListBulletIcon },
                        { id: 'true-false', label: 'True/False', icon: CheckIcon },
                        { id: 'identification', label: 'Identity', icon: DocumentTextIcon },
                        { id: 'matching-type', label: 'Matching', icon: QueueListIcon },
                        { id: 'essay', label: 'Essay', icon: ChatBubbleLeftRightIcon },
                        { id: 'mixed', label: 'Mixed', icon: SquaresPlusIcon },
                    ].map(type => (
                        <QuizTypeCard key={type.id} {...type} selected={quizType === type.id} onClick={() => setQuizType(type.id)} />
                    ))}
                </div>
            </div>

            {quizType === 'mixed' && (
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase flex items-center gap-2">
                           <LightBulbIcon className="w-4 h-4" /> Parameters
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${Object.values(distribution).reduce((a,b)=>a+b,0) === itemCount ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {Object.values(distribution).reduce((a,b)=>a+b,0)} / {itemCount}
                        </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-4">
                        {Object.keys(distribution).map(type => (
                            <div key={type} className="text-center group">
                                <input 
                                    type="number" value={distribution[type]} onChange={(e) => handleDistributionChange(type, e.target.value)}
                                    className="w-full text-center bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 text-sm font-semibold mb-1.5 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition-all"
                                />
                                <span className="text-[9px] font-medium text-zinc-400 uppercase truncate block">{type.substring(0,4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const PreviewItem = ({ q, i }) => (
        <div className="bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 mb-4">
            <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                    {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-semibold uppercase text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-1 rounded-md tracking-wider">{q.type.replace('-', ' ')}</span>
                        <span className="text-[10px] font-medium text-zinc-400">{q.points} pt</span>
                    </div>
                    
                    <div className="text-zinc-900 dark:text-zinc-100 text-sm sm:text-base font-medium mb-4 leading-relaxed">
                        <ContentRenderer text={q.text} />
                    </div>
                    
                    <div className="space-y-2">
                        {q.type === 'multiple-choice' && q.options.map((o, idx) => (
                            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${o.isCorrect ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100' : 'bg-transparent border-zinc-200 dark:border-zinc-800'}`}>
                                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border flex-shrink-0 ${o.isCorrect ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-transparent'}`}>
                                    {String.fromCharCode(65+idx)}
                                </span>
                                <span className={`text-sm ${o.isCorrect ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>{o.text}</span>
                            </div>
                        ))}
                        {(q.type === 'true-false' || q.type === 'identification') && (
                            <div className="inline-flex items-center gap-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg">
                                <CheckCircleIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-100"/> {String(q.correctAnswer)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-zinc-900/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* --- DESKTOP VIEW --- */}
            <div className="hidden md:flex w-full max-w-5xl h-[80vh] bg-white dark:bg-[#09090B] rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
                <div className="w-72 bg-zinc-50/50 dark:bg-[#09090B] border-r border-zinc-200 dark:border-zinc-800/50 flex flex-col p-8">
                    <div className="flex items-center gap-2 mb-10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer w-fit transition-colors" onClick={onClose}>
                        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full"><XMarkIcon className="w-4 h-4"/></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Exit</span>
                    </div>
                    <div className="space-y-8">
                        <StepIndicator step={1} current={step} label="Configuration" />
                        <StepIndicator step={2} current={step} label="Synthesis" />
                        <StepIndicator step={3} current={step} label="Refinement" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#09090B] relative">
                    <div className="shrink-0 h-24 px-10 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50">
                        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                            {step === 1 ? "Blueprint" : step === 2 ? "Processing" : step === 3 ? "Review" : "Complete"}
                        </h1>
                        {step === 1 && (
                            <button onClick={() => handleGenerate(false)} className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4"/> Synthesize
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                        {step === 1 && <ConfigForm />}
                        {step === 2 && (
                             <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                                <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mb-6"></div>
                                <h3 className="text-sm font-medium animate-pulse">{loadingText}</h3>
                            </div>
                        )}
                        {step === 4 && (
                            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500">
                                <CheckCircleIcon className="w-16 h-16 text-zinc-900 dark:text-white mb-6" />
                                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-8">Ready for Deployment</h2>
                                <button onClick={onClose} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-8 py-2.5 rounded-full font-medium text-sm hover:bg-zinc-200 transition-colors">Close Workspace</button>
                            </div>
                        )}
                        {step === 3 && generatedQuiz && (
                             <div className="max-w-3xl mx-auto pb-24 animate-in fade-in slide-in-from-right-8 duration-500">
                                {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                            </div>
                        )}
                    </div>
                    
                    {step === 3 && (
                        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-md absolute bottom-0 w-full flex items-center gap-4 z-20">
                            <div className="flex-1 flex gap-2 max-w-xl relative">
                                <input 
                                    ref={revisionInputRef} type="text" placeholder="Instruct AI to modify (e.g. 'Make it harder')" 
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate(true)}
                                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-5 py-2.5 text-sm font-medium outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all" 
                                />
                                <button onClick={() => handleGenerate(true)} className="absolute right-1 top-1 bottom-1 px-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                                    <ArrowPathIcon className="w-4 h-4"/>
                                </button>
                            </div>
                            <div className="flex gap-3 ml-auto">
                                <button onClick={() => setStep(1)} className="px-6 py-2.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-medium text-sm transition-colors">Discard</button>
                                <button onClick={handleSave} className="px-8 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">Publish</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MOBILE VIEW (Native Bottom Sheet Feel) --- */}
            <div className="md:hidden w-full h-[88vh] bg-white dark:bg-[#09090B] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden relative z-10 animate-in slide-in-from-bottom-full duration-300">
                
                <div className="h-6 flex items-center justify-center shrink-0">
                    <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full"/>
                </div>

                <div className="px-6 py-2 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {step === 1 ? 'Configure' : step === 3 ? 'Review' : 'AI Processing'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500">
                        <XMarkIcon className="w-4 h-4"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 pb-32 bg-white dark:bg-[#09090B]">
                     {step === 1 && <ConfigForm />}
                     {step === 2 && (
                         <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                             <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
                             <p className="text-sm font-medium animate-pulse">{loadingText}</p>
                         </div>
                     )}
                     {step === 4 && (
                         <div className="text-center py-32">
                             <CheckCircleIcon className="w-16 h-16 text-zinc-900 dark:text-white mx-auto mb-4"/>
                             <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">Published</h3>
                         </div>
                     )}
                     {step === 3 && generatedQuiz && (
                         <div className="space-y-4">
                             {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                         </div>
                     )}
                </div>

                {/* Sticky Mobile Action Bar */}
                {step !== 2 && step !== 4 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#09090B]/80 border-t border-zinc-100 dark:border-zinc-800/50 backdrop-blur-xl pb-10">
                        {step === 1 && (
                            <button onClick={() => handleGenerate(false)} className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2">
                                <SparklesIcon className="w-4 h-4"/> Synthesize
                            </button>
                        )}
                        {step === 3 && (
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium rounded-full text-sm">
                                    Edit
                                </button>
                                <button onClick={handleSave} className="flex-[2] py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-full text-sm">
                                    Publish
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>,
        document.body
    );
}