// src/components/quizzes/AiQuizModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    SparklesIcon, XMarkIcon, ArrowPathIcon, CheckIcon, 
    ListBulletIcon, QueueListIcon, ChatBubbleLeftRightIcon, 
    DocumentTextIcon, SquaresPlusIcon, CheckCircleIcon, 
    ArrowLeftIcon, BookOpenIcon, AcademicCapIcon,
    AdjustmentsHorizontalIcon, LanguageIcon, 
    ClipboardDocumentListIcon, ChevronRightIcon,
    ExclamationTriangleIcon, PlayCircleIcon
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

// --- SHARED UI COMPONENTS ---

const QuizTypeCard = ({ id, label, icon: Icon, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`
            relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border transition-all duration-200 w-full h-full
            ${selected 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]' 
                : 'bg-white dark:bg-[#252528] border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
            }
        `}
    >
        <Icon className={`w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 ${selected ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
        <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">{label}</span>
        {selected && <div className="absolute top-2 right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />}
    </button>
);

const MacTrafficLights = ({ onClose }) => (
    <div className="flex gap-2 group">
        <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] flex items-center justify-center hover:brightness-90 transition-all">
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-[#4c0b0b]">✕</span>
        </button>
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]"></div>
        <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]"></div>
    </div>
);

// --- MAIN COMPONENT ---

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();
    
    // State
    const [step, setStep] = useState(1); 
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
    const [language, setLanguage] = useState('English');
    const [revisionPrompt, setRevisionPrompt] = useState('');
    const [selectedSubject, setSelectedSubject] = useState(subjectId || '');
    const [subjects, setSubjects] = useState([]);

    const [distribution, setDistribution] = useState({
        'multiple-choice': 5,
        'true-false': 5,
        'identification': 0,
        'matching-type': 0,
        'essay': 0
    });
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [error, setError] = useState('');
    const previewRef = useRef(null);

    // Initial Data Fetch
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
    }, [itemCount]);

    const handleDistributionChange = (type, val) => {
        const newValue = Math.max(0, parseInt(val) || 0);
        setDistribution(prev => ({ ...prev, [type]: newValue }));
    };

    // --- LOGIC: PROMPT CONSTRUCTION (ENHANCED) ---
    const constructPrompt = (isRevision = false) => {
        if (isRevision && generatedQuiz) {
              return `
              Role: Senior DepEd Assessment Editor.
              Task: Revise the JSON below based on the user's feedback: "${revisionPrompt}".
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
           * Better (if possible): Avoid the metaphor and ask about the underlying concept directly.

        --- RULES ---
        1. **DepEd Standards**: Use Filipino context (names like Juan/Maria, local settings) where applicable.
        2. **Structure**: 
           - **Multiple Choice**: Plausible distractors.
           - **True/False**: No double negatives.
           - **Matching**: Homogeneous lists.
        3. **Formatting**:
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
        setIsGenerating(true);
        setError('');
        setStep(2); 
        
        try {
            const prompt = constructPrompt(isRevision);
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

				if (base.type === 'multiple-choice') {
				    const options = q.options ? q.options.map(o => ({ 
				        text: String(o.text), isCorrect: !!o.isCorrect 
				    })) : [];
				    const correctIndex = options.findIndex(o => o.isCorrect);
				    return { 
				        ...base, options, points: 1, 
				        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
				        correctAnswer: correctIndex > -1 ? ['A', 'B', 'C', 'D'][correctIndex] : 'A'
				    };
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
            showToast("Quiz saved to unit!", "success");
        } catch (err) {
            showToast("Database save failed.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- SUB-VIEWS ---

    const PreviewItem = ({ q, i }) => (
        <div className="bg-white dark:bg-[#252528] border border-gray-200 dark:border-white/5 rounded-2xl p-5 mb-4 shadow-sm group hover:shadow-md transition-shadow">
            <div className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-bold text-gray-500 dark:text-gray-300">
                    {i + 1}
                </span>
                <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase text-blue-500 tracking-wider bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{q.type.replace('-', ' ')}</span>
                        <span className="text-[10px] font-bold text-gray-400">{q.points} PTS</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-800 dark:text-gray-200 mb-3">
                        <ContentRenderer text={q.text} />
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 text-xs border border-gray-100 dark:border-white/5">
                        {q.type === 'multiple-choice' && (
                            <ul className="space-y-1.5">
                                {q.options.map((o, idx) => (
                                    <li key={idx} className={`flex items-start gap-2 ${o.isCorrect ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                                        <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] border ${o.isCorrect ? 'bg-green-100 border-green-200' : 'bg-white border-gray-200'}`}>
                                            {String.fromCharCode(65+idx)}
                                        </span>
                                        <span>{o.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {(q.type === 'true-false' || q.type === 'identification') && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                                <CheckCircleIcon className="w-4 h-4"/> Answer: {String(q.correctAnswer)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const LoadingView = () => (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-gray-100 dark:border-white/5 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Generating Questions...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mx-auto">
                Reviewing content and aligning with DepEd standards.
            </p>
        </div>
    );

    const SuccessView = () => (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                <CheckCircleIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quiz Ready!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Successfully saved to your unit.</p>
            <button onClick={onClose} className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-900 dark:text-white px-8 py-3 rounded-xl font-bold transition-colors">
                Close Window
            </button>
        </div>
    );

    const ConfigForm = () => (
        <div className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Subject</label>
                    <div className="relative">
                        <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full appearance-none bg-white dark:bg-[#252528] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 pr-8 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="" disabled>Select Subject...</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                        <ChevronRightIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none"/>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Language</label>
                        <div className="relative">
                            <select 
                                value={language} 
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full appearance-none bg-white dark:bg-[#252528] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option>English</option>
                                <option>Filipino</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Items</label>
                        <input 
                            type="number" 
                            value={itemCount} 
                            onChange={(e) => setItemCount(Math.min(50, Math.max(1, parseInt(e.target.value)||1)))}
                            className="w-full bg-white dark:bg-[#252528] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Assessment Format</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                    {[
                        { id: 'multiple-choice', label: 'Multi', icon: ListBulletIcon },
                        { id: 'true-false', label: 'T/F', icon: CheckIcon },
                        { id: 'identification', label: 'Identify', icon: DocumentTextIcon },
                        { id: 'matching-type', label: 'Match', icon: QueueListIcon },
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

            {quizType === 'mixed' && (
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Item Distribution</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${Object.values(distribution).reduce((a,b)=>a+b,0) === itemCount ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {Object.values(distribution).reduce((a,b)=>a+b,0)} / {itemCount} Items
                        </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {Object.keys(distribution).map(type => (
                            <div key={type} className="text-center">
                                <input 
                                    type="number" 
                                    value={distribution[type]}
                                    onChange={(e) => handleDistributionChange(type, e.target.value)}
                                    className="w-full text-center bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg py-1.5 text-xs font-bold mb-1 focus:border-blue-500 outline-none"
                                />
                                <span className="text-[8px] font-bold text-gray-400 uppercase truncate block">{type.substring(0,4)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            
            {/* BACKDROP (NO BLUR) */}
            <div 
                className="fixed inset-0 bg-black/40 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* ================= DESKTOP VIEW (macOS) ================= */}
            <div className="hidden md:flex w-full max-w-5xl h-[85vh] bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden relative z-10">
                
                {/* SIDEBAR */}
                <div className="w-72 bg-gray-50 dark:bg-[#151515] border-r border-gray-200 dark:border-white/5 flex flex-col p-5">
                    <MacTrafficLights onClose={onClose} />
                    
                    <div className="mt-8 space-y-1">
                        <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${step === 1 ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                            1. Configuration
                        </button>
                        <button disabled={step < 3} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${step === 3 ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'text-gray-500 opacity-50'}`}>
                            2. Review & Edit
                        </button>
                        <button disabled={step < 4} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${step === 4 ? 'bg-green-100 dark:bg-green-600/20 text-green-600 dark:text-green-400' : 'text-gray-500 opacity-50'}`}>
                            3. Published
                        </button>
                    </div>

                    <div className="mt-auto">
                        <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-1">Source Material</h4>
                            <div className="flex items-center gap-2">
                                <DocumentTextIcon className="w-4 h-4 text-blue-500"/>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{lesson?.title || 'Unknown Lesson'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1E1E1E]">
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                        {step === 1 && (
                            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quiz Architect</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Configure the AI parameters to generate a standards-aligned assessment.</p>
                                <ConfigForm />
                            </div>
                        )}
                        {step === 2 && <LoadingView />}
                        {step === 4 && <SuccessView />}
                        {step === 3 && generatedQuiz && (
                             <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500 pb-24">
                                <div className="flex justify-between items-end mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{generatedQuiz.title}</h2>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{generatedQuiz.questions.length} Questions • AI Generated</p>
                                    </div>
                                    <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 hover:underline">Edit Config</button>
                                </div>
                                {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                            </div>
                        )}
                    </div>

                    {/* DESKTOP FOOTER */}
                    {step !== 2 && step !== 4 && (
                        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#151515] flex items-center justify-end gap-3">
                             {step === 1 && (
                                 <button 
                                    onClick={() => handleGenerate(false)}
                                    className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold text-sm rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                                 >
                                    <SparklesIcon className="w-4 h-4"/> Generate Quiz
                                 </button>
                             )}
                             {step === 3 && (
                                <>
                                    <div className="flex-1 flex gap-2 max-w-lg mr-auto">
                                        <input 
                                            value={revisionPrompt}
                                            onChange={(e) => setRevisionPrompt(e.target.value)}
                                            placeholder="AI Feedback (e.g. 'Make it harder')"
                                            className="flex-1 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button onClick={() => handleGenerate(true)} className="p-2 bg-gray-200 dark:bg-white/10 rounded-lg hover:bg-gray-300">
                                            <ArrowPathIcon className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                                        </button>
                                    </div>
                                    <button onClick={handleSave} className="px-6 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center gap-2">
                                        Save Quiz <CheckIcon className="w-4 h-4"/>
                                    </button>
                                </>
                             )}
                        </div>
                    )}
                </div>
            </div>

            {/* ================= MOBILE VIEW (iOS Bottom Sheet) ================= */}
            <div className="md:hidden w-full h-[95vh] bg-white dark:bg-[#121212] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden relative z-10 animate-in slide-in-from-bottom-full duration-500">
                
                {/* HANDLE */}
                <div className="h-6 flex items-center justify-center shrink-0 bg-white dark:bg-[#121212] rounded-t-[32px] border-b border-gray-100 dark:border-white/5">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"/>
                </div>

                {/* HEADER */}
                <div className="px-6 py-4 bg-white dark:bg-[#121212] flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {step === 1 ? 'New Quiz' : step === 3 ? 'Review' : 'Processing'}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* MOBILE CONTENT */}
                <div className="flex-1 overflow-y-auto p-5 pb-24 bg-gray-50 dark:bg-[#121212]">
                     {step === 1 && <ConfigForm />}
                     {step === 2 && <LoadingView />}
                     {step === 4 && <SuccessView />}
                     {step === 3 && generatedQuiz && (
                         <div className="space-y-4">
                             {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                         </div>
                     )}
                </div>

                {/* MOBILE FLOATING ACTION BAR */}
                {step !== 2 && step !== 4 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-white/5 pb-8 safe-area-bottom">
                        {step === 1 && (
                            <button 
                                onClick={() => handleGenerate(false)}
                                className="w-full py-3.5 bg-blue-600 text-white text-lg font-bold rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                <SparklesIcon className="w-5 h-5"/> Generate Quiz
                            </button>
                        )}
                        {step === 3 && (
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 py-3.5 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-2xl">
                                    Back
                                </button>
                                <button onClick={handleSave} className="flex-[2] py-3.5 bg-green-600 text-white font-bold rounded-2xl shadow-xl shadow-green-500/30">
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