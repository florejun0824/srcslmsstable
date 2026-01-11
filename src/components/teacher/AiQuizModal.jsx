import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    SparklesIcon, XMarkIcon, ArrowPathIcon, CheckIcon, 
    ListBulletIcon, QueueListIcon, ChatBubbleLeftRightIcon, 
    DocumentTextIcon, SquaresPlusIcon, CheckCircleIcon, 
    ArrowLeftIcon, BookOpenIcon, AcademicCapIcon
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

// --- ONEUI 8.5 STYLES ---
const modalOverlay = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xl p-0 sm:p-4 transition-all duration-300";
const modalContainer = "w-full max-w-2xl bg-[#F2F2F7]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-2xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] border border-white/20 ring-1 ring-black/5 animate-in slide-in-from-bottom-10 duration-300";
const headerClass = "px-6 py-5 bg-white/50 dark:bg-black/20 backdrop-blur-md border-b border-black/5 dark:border-white/5 flex items-center justify-between flex-shrink-0";
const contentClass = "flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6";
const footerClass = "px-6 py-4 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur-md border-t border-black/5 dark:border-white/5 flex justify-between items-center flex-shrink-0";

// Inputs
const inputClass = "w-full bg-white dark:bg-[#2C2C2E] border-none rounded-[18px] px-4 py-3.5 text-[15px] font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-[#007AFF] outline-none transition-all shadow-sm";
const labelClass = "text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 block ml-2";

// Buttons
const btnPrimary = "px-6 py-3.5 rounded-[20px] bg-[#007AFF] text-white font-bold text-[15px] hover:bg-[#0062cc] active:scale-95 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2";
const btnSecondary = "px-6 py-3.5 rounded-[20px] bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white font-bold text-[15px] hover:bg-slate-50 dark:hover:bg-[#48484A] active:scale-95 transition-all border border-black/5 dark:border-white/5";
const btnIcon = "p-2.5 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 transition-all text-slate-600 dark:text-slate-300";

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

    useEffect(() => {
        if (isOpen) {
            setStep(1); setItemCount(10); setQuizType('multiple-choice'); 
            setLanguage('English'); setRevisionPrompt(''); setIsGenerating(false); 
            setGeneratedQuiz(null); setError('');
            setDistribution({ 'multiple-choice': 5, 'true-false': 5, 'identification': 0, 'matching-type': 0, 'essay': 0 });
        }
    }, [isOpen]);

    // Auto-balance mixed
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

// --- PROMPT CONSTRUCTION (STRICT DE-REFERENCING) ---

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
        
        // --- GRADE LEVEL & CONTEXT DETECTION ---
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
        Role: Expert DepEd Curriculum Developer and Assessment Specialist.
        Target Audience: ${gradeLevel} Students in the Philippines.
        Language: ${language} ${language === 'Filipino' ? '(Ensure formal academic Filipino)' : '(English)'}.
        Topic: "${lesson?.title}" (Subject: ${subjectTitle}).
        
        Information Base (Treat these facts as universal truths):
        ${lessonContent.substring(0, 8000)}

        --- CRITICAL INSTRUCTION: "CLOSED BOOK" STYLE ---
        **The students do NOT have access to the text while taking this quiz.** Therefore, you must NEVER refer to "the text", "the lesson", "the story", "the author", or "the passage".
        
        **STRICT VIOLATION CHECK:**
        ❌ BAD: "According to the lesson, what is the first step?"
        ❌ BAD: "As described in the text, why is the sky blue?"
        ❌ BAD: "What does the story suggest about bravery?"
        ❌ BAD: "In the selection provided, who is the main character?"
        
        ✅ GOOD: "What is the first step?"
        ✅ GOOD: "Why is the sky blue?"
        ✅ GOOD: "What is the primary characteristic of bravery?"
        ✅ GOOD: "Who is the main character in 'Noli Me Tangere'?"

        --- ADDITIONAL RULES ---
        1. **DepEd Standards Alignment**:
           - **Contextualization**: Use Filipino names (Juan, Maria), local settings (Barangay, School), and real-life scenarios.
           - **Cognitive Rigor**:
             - Lower Grades (7-8): 60% Remembering/Understanding, 40% Applying.
             - Higher Grades (9-12): Include Analyzing/Evaluating.
           - **Vocabulary**: Appropriate for ${gradeLevel}.

        2. **Item Construction Rules**:
           - **Multiple Choice**: Create plausible distractors. No "All of the above".
           - **True/False**: Avoid double negatives. Use "Tama" / "Mali" if Filipino.
           - **Essay**: Prompt must require critical thinking. MUST include a rubric.
           - **Matching Type**: Ensure premises are homogeneous (e.g., all dates, all people).

        3. **Formatting (System Requirement)**:
           - ${formatInstructions}
           - **NO Grouping**: Do NOT output "Questions 1-5". Each item is a standalone object.
           - **Points**: Standard = 1 point. Essay/Matching = Dynamic.
           - **Output**: Return ONLY raw, valid JSON.

        --- REQUIRED JSON STRUCTURE ---
        {
          "title": "Quiz Title (Creative & Relevant)",
          "questions": [
            {
              "text": "Question Text...", // MUST NOT contain 'according to the text'
              "type": "multiple-choice | true-false | identification | matching-type | essay",
              "points": 1, 
              "explanation": "Brief rationale...",
              
              // IF Multiple Choice:
              "options": [
                { "text": "Distractor A", "isCorrect": false },
                { "text": "Correct Answer", "isCorrect": true },
                { "text": "Distractor C", "isCorrect": false },
                { "text": "Distractor D", "isCorrect": false }
              ],
              
              // IF True/False:
              "correctAnswer": true, 
              
              // IF Identification:
              "correctAnswer": "Exact Answer String",

              // IF Essay:
              "rubric": [
                { "criteria": "Content Accuracy", "points": 5 },
                { "criteria": "Grammar & Flow", "points": 5 }
              ],

              // IF Matching Type:
              "pairs": [
                 { "prompt": "Item A", "answer": "Match A" },
                 { "prompt": "Item B", "answer": "Match B" }
              ] 
            }
          ]
        }
        `;
    };

    const handleGenerate = async (isRevision = false) => {
        setIsGenerating(true);
        setError('');
        try {
            const prompt = constructPrompt(isRevision);
            const aiText = await callGeminiWithLimitCheck(prompt);
            const response = tryParseJson(extractJson(aiText));

            if (!response || !response.questions) throw new Error("Invalid JSON from AI.");

            // --- POST PROCESSING ---
            const processedQuestions = response.questions.map(q => {
                const base = {
                    id: uniqueId(),
                    text: q.text || 'Question',
                    type: q.type || quizType,
                    explanation: q.explanation || ''
                };

                // 1. MATCHING TYPE LOGIC
                // One question object = Many points (one per pair)
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
                    
                    // Shuffle options for display
                    options.sort(() => Math.random() - 0.5);
                    
                    return { 
                        ...base, 
                        prompts, 
                        options, 
                        correctPairs, 
                        points: q.pairs.length // Points = Number of pairs
                    };
                }
                
                // 2. ESSAY LOGIC
                // One question object = Points based on Rubric Sum
                if (base.type === 'essay') {
                    const rubric = q.rubric || [{ id: uniqueId(), criteria: 'Content', points: 5 }];
                    const totalPoints = rubric.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);
                    return { ...base, rubric, points: totalPoints };
                }

				// 3. MULTIPLE CHOICE LOGIC (FIXED FOR PDF EXPORT)
				if (base.type === 'multiple-choice') {
				    const options = q.options ? q.options.map(o => ({ 
				        text: String(o.text), 
				        isCorrect: !!o.isCorrect 
				    })) : [];
    
				    // Find the actual index (0, 1, 2, or 3)
				    const correctIndex = options.findIndex(o => o.isCorrect);

				    return { 
				        ...base, 
				        options, 
				        points: 1, 
				        // Save BOTH to ensure compatibility with all components
				        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
				        correctAnswer: correctIndex > -1 ? ['A', 'B', 'C', 'D'][correctIndex] : 'A'
				    };
				}

                // 4. T/F & ID
                return { 
                    ...base, 
                    points: 1, 
                    correctAnswer: q.correctAnswer 
                };
            });

            setGeneratedQuiz({ ...response, questions: processedQuestions });
            setStep(3);
        } catch (err) {
            console.error(err);
            setError("Failed to generate. AI response might have been malformed.");
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

    // --- RENDER HELPERS ---

    const QuizTypeCard = ({ id, label, icon: Icon }) => (
        <button 
            onClick={() => setQuizType(id)}
            className={`flex flex-col items-center justify-center p-4 rounded-[20px] transition-all duration-300 border ${quizType === id 
                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30 scale-[1.02] border-transparent' 
                : 'bg-white dark:bg-[#2C2C2E] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#3A3A3C] border-transparent'}`}
        >
            <Icon className="w-7 h-7 mb-2" strokeWidth={1.5} />
            <span className="text-[11px] font-bold text-center leading-tight">{label}</span>
        </button>
    );

    const DistributionInput = ({ type, label }) => (
        <div className="flex items-center justify-between px-4 py-3 rounded-[18px] bg-white dark:bg-[#2C2C2E]">
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{label}</span>
            <input 
                type="number" 
                value={distribution[type]} 
                onChange={(e) => handleDistributionChange(type, e.target.value)}
                className="w-14 text-center text-[15px] font-bold bg-slate-100 dark:bg-black/20 rounded-[10px] py-1.5 outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
        </div>
    );

    // --- VISUAL NUMBERING HELPER (FIXED) ---
    // This ensures Essays count for their point total in the numbering sequence (e.g. Qs 11-15)
    const getQuestionLabel = (index) => {
        if (!generatedQuiz) return `Q${index + 1}`;
        let count = 0;
        for (let i = 0; i < index; i++) {
            const q = generatedQuiz.questions[i];
            // If Matching or Essay, consume N numbers based on Points. Else 1.
            if (q.type === 'matching-type' || q.type === 'essay') {
                count += (q.points || 1);
            } else {
                count += 1;
            }
        }
        
        const currentQ = generatedQuiz.questions[index];
        const currentCount = (currentQ.type === 'matching-type' || currentQ.type === 'essay') ? (currentQ.points || 1) : 1;
        
        const start = count + 1;
        const end = count + currentCount;
        
        return currentCount > 1 ? `Qs ${start}-${end}` : `Q${start}`;
    };

    const PreviewItem = ({ q, i }) => (
        <div className="p-5 bg-white dark:bg-[#2C2C2E] rounded-[22px] space-y-3 shadow-sm border border-black/5 dark:border-white/5 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                         <span className="text-[11px] font-bold bg-[#007AFF]/10 text-[#007AFF] px-2 py-1 rounded-md">{getQuestionLabel(i)}</span>
                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{q.type}</span>
                    </div>
                    <div className="text-[15px] font-medium text-slate-800 dark:text-slate-100 leading-relaxed"><ContentRenderer text={q.text} /></div>
                </div>
                <span className="text-[12px] font-bold bg-slate-100 dark:bg-black/30 px-2.5 py-1.5 rounded-lg ml-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{q.points} pts</span>
            </div>
            
            <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                {q.type === 'matching-type' && (
                    <div className="mt-2 bg-slate-50 dark:bg-black/20 p-3 rounded-lg">
                        <strong className="block text-xs uppercase mb-2 opacity-50">Pairs Generated</strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.prompts?.map((p, idx) => (
                                <div key={idx} className="flex text-xs">
                                    <span className="font-bold mr-1">{idx+1}.</span> 
                                    <span className="truncate">{p.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {q.type === 'essay' && (
                    <div className="mt-2 bg-slate-50 dark:bg-black/20 p-3 rounded-lg">
                        <strong className="block text-xs uppercase mb-2 opacity-50">Rubric</strong>
                        {q.rubric?.map((r, idx) => (
                            <div key={idx} className="flex justify-between text-xs py-1 border-b last:border-0 border-black/5 dark:border-white/5">
                                <span>{r.criteria}</span>
                                <span className="font-bold">{r.points}pts</span>
                            </div>
                        ))}
                    </div>
                )}
                {q.type === 'multiple-choice' && q.options?.map((o, idx) => (
                    <div key={idx} className={`flex items-center gap-2 ${o.isCorrect ? "text-green-600 dark:text-green-400 font-bold" : ""}`}>
                        {o.isCorrect ? <CheckIcon className="w-4 h-4" /> : <div className="w-4 h-4"/>}
                        <span className="bg-slate-100 dark:bg-white/10 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold text-slate-500">{String.fromCharCode(65+idx)}</span>
                        {o.text}
                    </div>
                ))}
                {(q.type === 'identification' || q.type === 'true-false') && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold mt-1">
                        <CheckIcon className="w-4 h-4" /> Answer: {String(q.correctAnswer)}
                    </div>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className={modalOverlay}>
            <div className={modalContainer}>
                
                {/* HEADER */}
                <div className={headerClass}>
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <SparklesIcon className="w-5 h-5" />
                         </div>
                         <div>
                             <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-none">AI Quiz Creator</h1>
                             <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                                <AcademicCapIcon className="w-3 h-3"/> DepEd Aligned
                             </p>
                         </div>
                    </div>
                    <button onClick={onClose} className={btnIcon}><XMarkIcon className="w-5 h-5" /></button>
                </div>

                {/* CONTENT AREA */}
                <div className={contentClass}>
                    
                    {/* STEP 1: CONFIGURATION */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* Context Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-3">
                                    <label className={labelClass}><BookOpenIcon className="w-3 h-3 inline mr-1"/>Subject Context</label>
                                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={inputClass}>
                                        <option value="" disabled>Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                    </select>
                                    <div className="px-4 py-3 bg-[#007AFF]/5 rounded-[18px] border border-[#007AFF]/10 flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4 text-[#007AFF]"/>
                                        <p className="text-[13px] font-bold text-[#007AFF] truncate">{lesson?.title || 'No Lesson Selected'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className={labelClass}>Total Items</label>
                                        <input type="number" value={itemCount} onChange={(e) => setItemCount(Math.min(50, Math.max(1, parseInt(e.target.value)||1)))} className={inputClass + " text-center font-bold text-lg"} />
                                    </div>
                                    <div className="space-y-3">
                                        <label className={labelClass}>Language</label>
                                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                                            <option>English</option><option>Filipino</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Type Section */}
                            <div>
                                <label className={labelClass}>Assessment Type</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    <QuizTypeCard id="multiple-choice" label="Multiple Choice" icon={ListBulletIcon} />
                                    <QuizTypeCard id="true-false" label="True/False" icon={CheckIcon} />
                                    <QuizTypeCard id="identification" label="Ident" icon={DocumentTextIcon} />
                                    <QuizTypeCard id="matching-type" label="Matching" icon={QueueListIcon} />
                                    <QuizTypeCard id="essay" label="Essay" icon={ChatBubbleLeftRightIcon} />
                                    <QuizTypeCard id="mixed" label="Mixed" icon={SquaresPlusIcon} />
                                </div>
                            </div>

                            {/* Mixed Distribution */}
                            {quizType === 'mixed' && (
                                <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-[22px] border border-black/5 dark:border-white/5">
                                    <div className="flex justify-between mb-4 px-2">
                                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Item Distribution</span>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${Object.values(distribution).reduce((a,b)=>a+b,0) === itemCount ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {Object.values(distribution).reduce((a,b)=>a+b,0)} / {itemCount} Items
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <DistributionInput type="multiple-choice" label="Multiple Choice" />
                                        <DistributionInput type="true-false" label="True / False" />
                                        <DistributionInput type="identification" label="Identification" />
                                        <DistributionInput type="matching-type" label="Matching Type" />
                                        <DistributionInput type="essay" label="Essay" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LOADING STATE */}
                    {isGenerating && step !== 4 && (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-center animate-pulse">
                            <div className="w-16 h-16 bg-[#007AFF]/10 rounded-full flex items-center justify-center mb-6 relative">
                                <SparklesIcon className="w-8 h-8 text-[#007AFF] animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Developing Assessment...</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto">Aligning with K-12 standards and generating questions based on your lesson.</p>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 3 && generatedQuiz && (
                        <div className="animate-in slide-in-from-right-8 duration-500 pb-20">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{generatedQuiz.title}</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Review Mode</p>
                                </div>
                                <span className="text-xs font-bold bg-[#007AFF] text-white px-4 py-2 rounded-full shadow-lg shadow-blue-500/30">{generatedQuiz.questions.length} Questions</span>
                            </div>
                            
                            <div className="space-y-4">
                                {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                            </div>
                            
                            {/* Refinement */}
                            <div className="mt-8 bg-slate-100 dark:bg-white/5 p-5 rounded-[24px]">
                                <label className={labelClass}>Refine Results</label>
                                <div className="flex gap-3">
                                    <input value={revisionPrompt} onChange={(e) => setRevisionPrompt(e.target.value)} placeholder="e.g. 'Make it harder', 'Focus more on definitions'" className={inputClass + " !py-3 text-sm"} />
                                    <button onClick={() => handleGenerate(true)} disabled={isGenerating} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[16px] hover:scale-105 transition-transform shadow-lg">
                                        <ArrowPathIcon className={`w-6 h-6 ${isGenerating ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center h-full py-10 text-center animate-in zoom-in-95 duration-300">
                            <div className="w-28 h-28 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mb-8 shadow-xl shadow-green-500/10">
                                <CheckCircleIcon className="w-14 h-14 stroke-[1.5]" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Quiz Ready!</h2>
                            <p className="text-slate-500">Successfully saved to your unit.</p>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                {!isGenerating && step !== 4 && (
                    <div className={footerClass}>
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className={btnSecondary}><ArrowLeftIcon className="w-4 h-4"/> Back</button>
                        ) : <div className="w-10"></div>}
                        
                        {error && <p className="text-xs font-bold text-red-500 absolute left-1/2 -translate-x-1/2 bg-red-50 px-3 py-1 rounded-full">{error}</p>}

                        {step === 1 && (
                            <button onClick={() => handleGenerate(false)} className={btnPrimary}>Generate Quiz <SparklesIcon className="w-5 h-5"/></button>
                        )}
                        {step === 3 && (
                            <button onClick={handleSave} className={btnPrimary.replace('bg-[#007AFF]', 'bg-green-600 hover:bg-green-700 shadow-green-500/20')}>Save to Unit <CheckIcon className="w-5 h-5"/></button>
                        )}
                    </div>
                )}
                {step === 4 && (
                    <div className={footerClass + " justify-center"}>
                        <button onClick={onClose} className={btnSecondary + " w-full max-w-sm"}>Close Window</button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}