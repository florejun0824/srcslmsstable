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

// Fisher-Yates Shuffle to ensure true randomness of options
const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// --- SUB-COMPONENTS ---

const QuizTypeCard = ({ id, label, icon: Icon, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`
            relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 w-full aspect-square sm:aspect-auto sm:h-24 group
            ${selected 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' 
                : 'bg-white dark:bg-[#2A2A2D] border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-blue-500/30'
            }
        `}
    >
        <Icon className={`w-7 h-7 mb-2 transition-transform duration-300 ${selected ? 'scale-110 text-white' : 'text-gray-400 dark:text-gray-500 group-hover:scale-110 group-hover:text-blue-500'}`} />
        <span className="text-[11px] font-bold text-center leading-tight tracking-wide uppercase">{label}</span>
        {selected && (
            <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-white rounded-full animate-ping absolute opacity-75"></div>
                <div className="w-2 h-2 bg-white rounded-full relative"></div>
            </div>
        )}
    </button>
);

const StepIndicator = ({ step, current }) => {
    const isCompleted = step < current;
    const isCurrent = step === current;
    
    return (
        <div className={`flex items-center gap-3 transition-colors duration-300 ${isCurrent ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2
                ${isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : ''}
                ${isCompleted ? 'bg-green-500 border-green-500 text-white' : ''}
                ${!isCurrent && !isCompleted ? 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-400' : ''}
            `}>
                {isCompleted ? <CheckIcon className="w-4 h-4" /> : step}
            </div>
            <span className={`text-sm font-medium ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                {step === 1 ? 'Configuration' : step === 2 ? 'Generation' : step === 3 ? 'Review' : 'Published'}
            </span>
        </div>
    );
};

// --- MAIN COMPONENT ---

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();
    
    // State
    const [step, setStep] = useState(1); 
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
    const [language, setLanguage] = useState('English');
    // REMOVED: const [revisionPrompt, setRevisionPrompt] = useState('');
    const revisionInputRef = useRef(null); // ADDED: Ref for uncontrolled input

    const [selectedSubject, setSelectedSubject] = useState(subjectId || '');
    const [subjects, setSubjects] = useState([]);
    const [loadingText, setLoadingText] = useState('Initializing...');

    const [distribution, setDistribution] = useState({
        'multiple-choice': 5, 'true-false': 5, 'identification': 0, 'matching-type': 0, 'essay': 0
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [error, setError] = useState('');

    // --- EFFECTS ---

    useEffect(() => {
        if (isOpen) {
            getAllSubjects().then(setSubjects);
            setStep(1); setItemCount(10); setQuizType('multiple-choice'); 
            setLanguage('English'); 
            // revisionPrompt reset removed as we use Ref now
            setIsGenerating(false); 
            setGeneratedQuiz(null); setError('');
            setDistribution({ 'multiple-choice': 5, 'true-false': 5, 'identification': 0, 'matching-type': 0, 'essay': 0 });
        }
    }, [isOpen]);

    // Loading Text Cycle
    useEffect(() => {
        if (!isGenerating) return;
        const messages = ["Reading lesson content...", "Aligning with DepEd standards...", "Drafting distractors...", "Balancing difficulty...", "Finalizing format..."];
        let i = 0;
        const interval = setInterval(() => {
            setLoadingText(messages[i % messages.length]);
            i++;
        }, 1500);
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Auto-balance mixed distribution
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

    // --- LOGIC: PROMPT CONSTRUCTION ---
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

        --- CRITICAL INSTRUCTION: STAND-ALONE QUESTIONS ---
        You are generating a quiz that students will take **without** access to the lesson text.
        
        **FORBIDDEN PHRASES (Do NOT use these):**
        ❌ "According to the lesson..."
        ❌ "In the text..."
        ❌ "As mentioned in the video..."
        ❌ "In the symphony metaphor..." (unless you explain the metaphor in the question itself)
        ❌ "Why does the author say..."

        **CORRECT APPROACH:**
        1. **Convert facts into general knowledge questions.**
           * Bad: "According to the lesson, what is the powerhouse of the cell?"
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
        // Grab value from ref if this is a revision to avoid state lag
        const manualInstruction = isRevision && revisionInputRef.current 
            ? revisionInputRef.current.value 
            : '';

        setIsGenerating(true);
        setError('');
        setStep(2); 
        
        try {
            const prompt = constructPrompt(isRevision, manualInstruction);
            const aiText = await callGeminiWithLimitCheck(prompt);
            const response = tryParseJson(extractJson(aiText));

            if (!response || !response.questions) throw new Error("Invalid JSON from AI.");

            const processedQuestions = response.questions.map(q => {
                const base = {
                    id: uniqueId(),
                    text: q.text || 'Question',
                    type: q.type || quizType,
                    explanation: q.explanation || ''
                };

                // --- LOGIC: RANDOMIZE OPTIONS (Anti-Bias) ---
                if (base.type === 'multiple-choice') {
                    let rawOptions = q.options ? q.options.map(o => ({ 
                        text: String(o.text), isCorrect: !!o.isCorrect 
                    })) : [];
                    
                    // 1. Shuffle the options array completely using Fisher-Yates
                    const shuffledOptions = shuffleArray(rawOptions);

                    // 2. Find the new index of the correct answer
                    const correctIndex = shuffledOptions.findIndex(o => o.isCorrect);
                    
                    // 3. Assign
                    return { 
                        ...base, 
                        options: shuffledOptions, 
                        points: 1, 
                        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
                        correctAnswer: correctIndex > -1 ? ['A', 'B', 'C', 'D'][correctIndex] : 'A'
                    };
                }

                if (base.type === 'matching-type' && q.pairs) {
                    const prompts = []; const options = []; const correctPairs = {};
                    q.pairs.forEach((pair) => {
                        const pId = uniqueId(); const oId = uniqueId();
                        prompts.push({ id: pId, text: pair.prompt });
                        options.push({ id: oId, text: pair.answer });
                        correctPairs[pId] = oId;
                    });
                    options.sort(() => Math.random() - 0.5);
                    return { ...base, prompts, options, correctPairs, points: q.pairs.length };
                }
                
                if (base.type === 'essay') {
                    const rubric = q.rubric || [{ id: uniqueId(), criteria: 'Content', points: 5 }];
                    const totalPoints = rubric.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);
                    return { ...base, rubric, points: totalPoints };
                }

                return { ...base, points: 1, correctAnswer: q.correctAnswer };
            });

            setGeneratedQuiz({ ...response, questions: processedQuestions });
            setStep(3); 
        } catch (err) {
            console.error(err);
            setError("Failed to generate. Please try again.");
            setStep(1); 
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
                createdBy: 'AI',
                status: 'published'
            });
            setStep(4); 
            showToast("Quiz saved successfully!", "success");
        } catch (err) {
            showToast("Database save failed.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

// --- VIEWS ---

    // UPDATED: Tighter padding on mobile inputs
    const ConfigForm = () => (
        <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Subject</label>
                    <div className="relative group">
                        <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full appearance-none bg-gray-50 dark:bg-[#2A2A2D] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 pr-8 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        >
                            <option value="" disabled>Select...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                        <ChevronRightIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none group-hover:text-blue-500 transition-colors"/>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                     <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Language</label>
                        <select 
                            value={language} 
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full appearance-none bg-gray-50 dark:bg-[#2A2A2D] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        >
                            <option>English</option>
                            <option>Filipino</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Items</label>
                        <input 
                            type="number" 
                            value={itemCount} 
                            onChange={(e) => setItemCount(Math.min(50, Math.max(1, parseInt(e.target.value)||1)))}
                            className="w-full bg-gray-50 dark:bg-[#2A2A2D] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3.5 text-sm font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Quiz Type Grid: Tighter gap on mobile */}
            <div className="space-y-2 sm:space-y-3">
                <label className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Strategy</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                    {[
                        { id: 'multiple-choice', label: 'Multi Choice', icon: ListBulletIcon },
                        { id: 'true-false', label: 'True/False', icon: CheckIcon },
                        { id: 'identification', label: 'Identity', icon: DocumentTextIcon },
                        { id: 'matching-type', label: 'Matching', icon: QueueListIcon },
                        { id: 'essay', label: 'Essay', icon: ChatBubbleLeftRightIcon },
                        { id: 'mixed', label: 'Mixed', icon: SquaresPlusIcon },
                    ].map(type => (
                        <QuizTypeCard 
                            key={type.id} 
                            {...type} 
                            selected={quizType === type.id} 
                            onClick={() => setQuizType(type.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Distribution Panel */}
            {quizType === 'mixed' && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-100 dark:border-blue-500/10">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <span className="text-[10px] sm:text-xs font-bold text-blue-800 dark:text-blue-300 uppercase flex items-center gap-2">
                           <LightBulbIcon className="w-4 h-4" /> Distribution
                        </span>
                        <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-md ${Object.values(distribution).reduce((a,b)=>a+b,0) === itemCount ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {Object.values(distribution).reduce((a,b)=>a+b,0)} / {itemCount}
                        </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {Object.keys(distribution).map(type => (
                            <div key={type} className="text-center group">
                                <input 
                                    type="number" 
                                    value={distribution[type]}
                                    onChange={(e) => handleDistributionChange(type, e.target.value)}
                                    className="w-full text-center bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/10 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-xs sm:text-sm font-bold mb-1 focus:border-blue-500 outline-none shadow-sm transition-all"
                                />
                                <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase truncate block">{type.substring(0,4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // UPDATED: Compact padding/badges for mobile
    const PreviewItem = ({ q, i }) => (
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-white/5 rounded-2xl p-3 sm:p-5 mb-3 sm:mb-4 shadow-sm">
            <div className="flex gap-3 sm:gap-4">
                <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5 text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/5">
                    {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md tracking-wide">{q.type.replace('-', ' ')}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">{q.points} PT</span>
                    </div>
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-medium mb-3 sm:mb-4 leading-relaxed">
                        <ContentRenderer text={q.text} />
                    </div>
                    
                    <div className="bg-gray-50/50 dark:bg-black/20 rounded-xl p-3 sm:p-4 text-xs sm:text-sm border border-gray-100 dark:border-white/5">
                        {q.type === 'multiple-choice' && (
                            <ul className="grid grid-cols-1 gap-1.5 sm:gap-2">
                                {q.options.map((o, idx) => (
                                    <li key={idx} className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg transition-colors ${o.isCorrect ? 'bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-500/20' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                                        <span className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-bold border flex-shrink-0 ${o.isCorrect ? 'bg-green-500 text-white border-green-500' : 'bg-white dark:bg-[#2A2A2D] text-gray-500 border-gray-200 dark:border-white/10'}`}>
                                            {String.fromCharCode(65+idx)}
                                        </span>
                                        <span className={`${o.isCorrect ? 'text-green-800 dark:text-green-300 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>{o.text}</span>
                                        {o.isCorrect && <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 ml-auto" />}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {(q.type === 'true-false' || q.type === 'identification') && (
                            <div className="flex items-center gap-2 sm:gap-3 text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/10 p-2 sm:p-3 rounded-lg border border-green-100 dark:border-green-500/20">
                                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5"/> Answer: {String(q.correctAnswer)}
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
            
            <div 
                className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* ================= DESKTOP VIEW ================= */}
            <div className="hidden md:flex w-full max-w-6xl h-[85vh] bg-white dark:bg-[#151515] rounded-3xl shadow-2xl ring-1 ring-white/10 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
                {/* Sidebar */}
                <div className="w-80 bg-gray-50/80 dark:bg-[#1A1A1A] border-r border-gray-200 dark:border-white/5 flex flex-col p-6 backdrop-blur-xl">
                    <div className="flex items-center gap-2 mb-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer w-fit" onClick={onClose}>
                        <div className="p-1 bg-gray-200 dark:bg-white/10 rounded-full"><XMarkIcon className="w-4 h-4"/></div>
                        <span className="text-xs font-bold uppercase tracking-widest">Close</span>
                    </div>
                    <div className="space-y-6">
                        <StepIndicator step={1} current={step} />
                        <StepIndicator step={2} current={step} />
                        <StepIndicator step={3} current={step} />
                        <StepIndicator step={4} current={step} />
                    </div>
                    <div className="mt-auto">
                        <div className="p-5 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-white/5 shadow-lg shadow-black/5">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Source Material</h4>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <DocumentTextIcon className="w-5 h-5 text-blue-500"/>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight mb-0.5">{lesson?.title || 'Unknown Lesson'}</p>
                                    <p className="text-[10px] text-gray-400 truncate">Automated Extraction</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#151515] relative">
                    <div className="shrink-0 h-20 px-8 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {step === 1 && "Quiz Architect"}
                            {step === 2 && "Processing Content"}
                            {step === 3 && "Review & Finalize"}
                            {step === 4 && "Published"}
                        </h1>
                        {step === 1 && (
                            <button onClick={() => handleGenerate(false)} className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-blue-400 dark:text-blue-600"/> Generate Quiz
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {step === 1 && <ConfigForm />}
                        {step === 2 && (
                             <div className="flex flex-col items-center justify-center h-full">
                                <div className="relative w-24 h-24 mb-8">
                                    <div className="absolute inset-0 border-[6px] border-gray-100 dark:border-white/5 rounded-full"></div>
                                    <div className="absolute inset-0 border-[6px] border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                    <BeakerIcon className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-pulse">{loadingText}</h3>
                            </div>
                        )}
                        {step === 4 && (
                            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-95 duration-500">
                                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/30">
                                    <CheckIcon className="w-12 h-12 text-white" />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Quiz Published!</h2>
                                <button onClick={onClose} className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-900 dark:text-white px-10 py-3 rounded-xl font-bold transition-colors">Close Window</button>
                            </div>
                        )}
                        {step === 3 && generatedQuiz && (
                             <div className="max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl mb-6 border border-blue-100 dark:border-blue-500/20 flex gap-3">
                                    <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"/>
                                    <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed"><strong>AI Note:</strong> Options randomized.</p>
                                </div>
                                {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                            </div>
                        )}
                    </div>
                    {step === 3 && (
                        <div className="p-5 border-t border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#151515]/90 backdrop-blur absolute bottom-0 w-full flex items-center gap-4 z-20">
                            <div className="flex-1 flex gap-2 max-w-xl group">
                                <input 
                                    ref={revisionInputRef}
                                    type="text"
                                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate(true)}
                                    placeholder="Type changes (e.g. 'Make it harder')..." 
                                    className="flex-1 bg-gray-50 dark:bg-[#2A2A2D] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white dark:focus:bg-[#333] transition-all" 
                                />
                                <button 
                                    onClick={() => handleGenerate(true)} 
                                    className="px-4 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all text-gray-600 dark:text-gray-300 group-focus-within:bg-blue-600 group-focus-within:text-white"
                                >
                                    <ArrowPathIcon className="w-5 h-5"/>
                                </button>
                            </div>
                            <div className="flex gap-3 ml-auto">
                                <button onClick={() => setStep(1)} className="px-6 py-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold text-sm transition-colors">Back</button>
                                <button onClick={handleSave} className="px-8 py-3 bg-green-600 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-green-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">Save <CheckIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= MOBILE VIEW (Refined) ================= */}
            <div className="md:hidden w-full h-[92vh] bg-white dark:bg-[#121212] rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative z-10 animate-in slide-in-from-bottom-full duration-500">
                
                {/* Drag Handle: Reduced height */}
                <div className="h-5 flex items-center justify-center shrink-0 bg-white dark:bg-[#121212] border-b border-gray-100 dark:border-white/5">
                    <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"/>
                </div>

                {/* Mobile Header: Compact padding */}
                <div className="px-5 py-3 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {step === 1 ? 'New Quiz' : step === 3 ? 'Review' : 'Processing'}
                        </h2>
                        <p className="text-[10px] text-gray-400 font-medium">Step {step} of 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                        <XMarkIcon className="w-4 h-4"/>
                    </button>
                </div>

                {/* Mobile Content: Compact spacing */}
                <div className="flex-1 overflow-y-auto p-4 pb-28 bg-gray-50 dark:bg-[#0A0A0A]">
                     {step === 1 && <ConfigForm />}
                     
                     {step === 2 && (
                         <div className="flex flex-col items-center justify-center py-20">
                             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                             <p className="text-sm font-bold text-gray-900 dark:text-white animate-pulse">{loadingText}</p>
                         </div>
                     )}
                     
                     {step === 4 && (
                         <div className="text-center py-20">
                             <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                             <h3 className="text-xl font-bold text-gray-900 dark:text-white">Saved!</h3>
                         </div>
                     )}
                     
                     {step === 3 && generatedQuiz && (
                         <div className="space-y-3">
                             {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                         </div>
                     )}
                </div>

                {/* Mobile Floating Action Bar: Reduced padding */}
                {step !== 2 && step !== 4 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-[#121212]/90 border-t border-gray-100 dark:border-white/5 backdrop-blur-lg safe-area-bottom">
                        {step === 1 && (
                            <button 
                                onClick={() => handleGenerate(false)}
                                className="w-full py-3 bg-blue-600 text-white text-base font-bold rounded-xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                <SparklesIcon className="w-4 h-4"/> Generate Quiz
                            </button>
                        )}
                        {step === 3 && (
                            <div className="flex gap-2">
                                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl text-sm">
                                    Edit
                                </button>
                                <button onClick={handleSave} className="flex-[2] py-3 bg-green-600 text-white font-bold rounded-xl shadow-xl shadow-green-500/30 text-sm">
                                    Save
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