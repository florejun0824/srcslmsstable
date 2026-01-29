import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    SparklesIcon, XMarkIcon, ArrowPathIcon, CheckIcon, 
    ListBulletIcon, QueueListIcon, ChatBubbleLeftRightIcon, 
    DocumentTextIcon, SquaresPlusIcon, CheckCircleIcon, 
    ArrowLeftIcon, BookOpenIcon, AcademicCapIcon,
    AdjustmentsHorizontalIcon, LanguageIcon, 
    ClipboardDocumentListIcon
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

// --- MODERN STYLES ---
const modalOverlay = "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300 p-0 sm:p-6";
const modalContainer = "w-full sm:max-w-5xl bg-white dark:bg-[#0F0F11] sm:rounded-[32px] rounded-t-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-[95dvh] sm:h-[90vh] ring-1 ring-white/10 relative";

// Gradients & Accents
const gradientText = "bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400";
const glassHeader = "px-6 py-5 bg-white/80 dark:bg-[#0F0F11]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between flex-shrink-0 z-20 absolute top-0 left-0 right-0";
const footerClass = "px-6 py-5 bg-white dark:bg-[#0F0F11] border-t border-slate-100 dark:border-white/5 flex justify-between items-center flex-shrink-0 z-20 pb-8 sm:pb-5";

const contentClass = "flex-1 overflow-y-auto pt-24 pb-8 px-4 sm:px-8 custom-scrollbar bg-slate-50/50 dark:bg-[#0F0F11]";

// Modern Inputs
const inputGroupClass = "relative group transition-all duration-300";
const inputClass = "w-full bg-slate-100 dark:bg-[#1A1A1D] border-none rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all";
const selectClass = "w-full appearance-none bg-slate-100 dark:bg-[#1A1A1D] border-none rounded-2xl px-4 py-3.5 text-[15px] font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer";
const labelClass = "text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block ml-1";

// Buttons
const btnPrimary = "flex-1 sm:flex-none relative overflow-hidden group justify-center px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-[15px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/10 flex items-center gap-2.5";
const btnSecondary = "flex-1 sm:flex-none justify-center px-6 py-3.5 rounded-2xl bg-white dark:bg-[#1A1A1D] text-slate-700 dark:text-white font-bold text-[15px] hover:bg-slate-50 dark:hover:bg-[#252528] active:scale-95 transition-all border border-slate-200 dark:border-white/5";
const btnIcon = "p-2.5 rounded-full bg-slate-100 dark:bg-[#1A1A1D] hover:bg-slate-200 dark:hover:bg-[#252528] transition-all text-slate-600 dark:text-slate-300 border border-transparent hover:border-slate-300 dark:hover:border-white/10";

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

    // --- PROMPT CONSTRUCTION ---
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
        Role: Expert DepEd Curriculum Developer and Assessment Specialist.
        Target Audience: ${gradeLevel} Students in the Philippines.
        Language: ${language} ${language === 'Filipino' ? '(Ensure formal academic Filipino)' : '(English)'}.
        Topic: "${lesson?.title}" (Subject: ${subjectTitle}).
        
        Information Base (Treat these facts as universal truths):
        ${lessonContent.substring(0, 8000)}

        --- CRITICAL INSTRUCTION: SCENARIO HANDLING ---
        **The students do NOT have access to the text while taking this quiz.** Therefore, if a question refers to a specific story, case study, or scenario:
        1. You MUST include the full scenario text at the **beginning of the "text" field**.
        2. **FORMATTING RULE:** The scenario must be in italics (surrounded by asterisks *).
        3. Do NOT use a separate "scenario" field. Combine it into the question text.
        
        **STRICT VIOLATION CHECK:**
        ❌ BAD: "According to the lesson, what is the first step?"
        ❌ BAD: "In the story provided in class, why did Maria cry?"
        
        ✅ GOOD JSON (Scenario embedded):
        {
           "text": "*Maria walked into the room and saw the broken vase...* \n\n Why did Maria cry upon entering the room?"
        }
        
        ✅ GOOD JSON (No scenario needed):
        {
           "text": "What is the capital of the Philippines?"
        }

        --- ADDITIONAL RULES ---
        1. **DepEd Standards Alignment**:
           - **Contextualization**: Use Filipino names (Juan, Maria), local settings (Barangay, School), and real-life scenarios.
           - **Cognitive Rigor**: Mix Remembering/Understanding with Applying/Analyzing.

        2. **Item Construction Rules**:
           - **Multiple Choice**: Create plausible distractors. No "All of the above".
           - **True/False**: Avoid double negatives.
           - **Essay**: Prompt must require critical thinking. MUST include a rubric.
           - **Matching Type**: Ensure premises are homogeneous.

        3. **Formatting**:
           - ${formatInstructions}
           - **Output**: Return ONLY raw, valid JSON.

        --- REQUIRED JSON STRUCTURE ---
        {
          "title": "Quiz Title (Creative & Relevant)",
          "questions": [
            {
              "text": "*Optional Scenario Text...* \n\n Question Text...", 
              "type": "multiple-choice | true-false | identification | matching-type | essay",
              "points": 1, 
              "explanation": "Brief rationale...",
              
              // IF Multiple Choice:
              "options": [
                { "text": "Distractor A", "isCorrect": false },
                { "text": "Correct Answer", "isCorrect": true }
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

                // 1. MATCHING TYPE
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
                    return { ...base, prompts, options, correctPairs, points: q.pairs.length };
                }
                
                // 2. ESSAY
                if (base.type === 'essay') {
                    const rubric = q.rubric || [{ id: uniqueId(), criteria: 'Content', points: 5 }];
                    const totalPoints = rubric.reduce((acc, curr) => acc + (parseInt(curr.points) || 0), 0);
                    return { ...base, rubric, points: totalPoints };
                }

				// 3. MULTIPLE CHOICE
				if (base.type === 'multiple-choice') {
				    const options = q.options ? q.options.map(o => ({ 
				        text: String(o.text), 
				        isCorrect: !!o.isCorrect 
				    })) : [];
				    const correctIndex = options.findIndex(o => o.isCorrect);
				    return { 
				        ...base, options, points: 1, 
				        correctAnswerIndex: correctIndex > -1 ? correctIndex : 0,
				        correctAnswer: correctIndex > -1 ? ['A', 'B', 'C', 'D'][correctIndex] : 'A'
				    };
				}

                // 4. T/F & ID
                return { ...base, points: 1, correctAnswer: q.correctAnswer };
            });

            setGeneratedQuiz({ ...response, questions: processedQuestions });
            setStep(3);
        } catch (err) {
            console.error(err);
            setError("Failed to generate. Please try again.");
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

    // --- UI COMPONENTS ---

    const QuizTypeCard = ({ id, label, icon: Icon, color }) => {
        const isSelected = quizType === id;
        return (
            <button 
                onClick={() => setQuizType(id)}
                className={`group relative flex flex-col items-start justify-between p-4 h-32 rounded-3xl transition-all duration-300 border ${
                    isSelected 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xl scale-[1.02] border-transparent' 
                    : 'bg-white dark:bg-[#1A1A1D] text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#202023] border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none'
                }`}
            >
                <div className={`p-2.5 rounded-full transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/5 group-hover:bg-slate-200/50 dark:group-hover:bg-white/10'}`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white dark:text-black' : 'text-slate-700 dark:text-slate-200'}`} />
                </div>
                <div className="text-left w-full">
                    <span className="text-[13px] font-bold block">{label}</span>
                    <span className="text-[10px] opacity-70 font-medium">Auto-generated</span>
                </div>
                {isSelected && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
            </button>
        );
    };

    const PreviewItem = ({ q, i }) => (
        <div className="group relative bg-white dark:bg-[#1A1A1D] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5 transition-all hover:shadow-md">
            
            {/* Question Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {i + 1}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{q.type.replace('-', ' ')}</span>
                        {/* ContentRenderer handles markdown, so italics from AI will render correctly here */}
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            <ContentRenderer text={q.text} />
                        </div>
                    </div>
                </div>
                <span className="flex-shrink-0 text-[11px] font-bold bg-slate-50 dark:bg-black/20 text-slate-500 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-white/5">
                    {q.points} pt{q.points > 1 && 's'}
                </span>
            </div>

            {/* Answer Section */}
            <div className="pl-11">
                {q.type === 'multiple-choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options?.map((o, idx) => (
                            <div key={idx} className={`flex items-center p-3 rounded-xl border transition-all ${
                                o.isCorrect 
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300" 
                                : "bg-slate-50 dark:bg-black/20 border-transparent text-slate-600 dark:text-slate-400"
                            }`}>
                                <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold mr-3 ${o.isCorrect ? "bg-emerald-200 dark:bg-emerald-500/20" : "bg-slate-200 dark:bg-white/10"}`}>
                                    {String.fromCharCode(65+idx)}
                                </span>
                                <span className="text-sm font-medium">{o.text}</span>
                                {o.isCorrect && <CheckIcon className="w-4 h-4 ml-auto text-emerald-500" />}
                            </div>
                        ))}
                    </div>
                )}
                
                {(q.type === 'identification' || q.type === 'true-false') && (
                    <div className="inline-flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 pl-3 pr-5 py-2 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">{String(q.correctAnswer)}</span>
                    </div>
                )}

                {q.type === 'matching-type' && (
                     <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="grid gap-2">
                            {q.prompts?.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-[#252528] p-3 rounded-xl shadow-sm">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{p.text}</span>
                                    <ArrowPathIcon className="w-3 h-3 text-slate-300 mx-2"/>
                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[40%]">{q.options[idx]?.text}</span>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {q.type === 'essay' && (
                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                             <ClipboardDocumentListIcon className="w-4 h-4 text-slate-400"/>
                             <span className="text-xs font-bold text-slate-500 uppercase">Grading Criteria</span>
                        </div>
                        <div className="space-y-2">
                            {q.rubric?.map((r, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs bg-white dark:bg-[#252528] px-3 py-2 rounded-lg">
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{r.criteria}</span>
                                    <span className="font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 px-2 py-1 rounded">{r.points} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (!isOpen) return null;

    return createPortal(
        <div className={modalOverlay}>
            <div className={modalContainer}>
                
                {/* --- HEADER --- */}
                <div className={glassHeader}>
                    <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/10 flex items-center justify-center border border-slate-100 dark:border-white/10">
                            <SparklesIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                         </div>
                         <div className="flex flex-col">
                             <h1 className={`text-xl font-bold leading-none ${gradientText}`}>AI Quiz Architect</h1>
                             <div className="flex items-center gap-2 mt-1.5">
                                 <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                     {isGenerating ? 'AI WORKING...' : step === 1 ? 'CONFIGURATION' : step === 3 ? 'REVIEW' : 'FINALIZING'}
                                 </span>
                                 <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"/>
                                 <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <AcademicCapIcon className="w-3 h-3"/> DepEd K-12
                                 </span>
                             </div>
                         </div>
                    </div>
                    <button onClick={onClose} className={btnIcon}><XMarkIcon className="w-5 h-5" /></button>
                </div>

                {/* --- MAIN CONTENT --- */}
                <div className={contentClass}>
                    
                    {/* STEP 1: CONFIGURATION (Only show if NOT generating) */}
                    {step === 1 && !isGenerating && (
                        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
                            
                            {/* Hero / Context */}
                            <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 p-6 sm:p-8 rounded-[32px] border border-indigo-100 dark:border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div className={inputGroupClass}>
                                        <label className={labelClass}><BookOpenIcon className="w-3 h-3 inline mr-1"/>Subject</label>
                                        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className={selectClass}>
                                            <option value="" disabled>Select a Subject...</option>
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                    </div>
                                    <div className={inputGroupClass}>
                                        <label className={labelClass}><DocumentTextIcon className="w-3 h-3 inline mr-1"/>Topic Source</label>
                                        <div className="w-full bg-white dark:bg-[#1A1A1D] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <DocumentTextIcon className="w-5 h-5"/>
                                            </div>
                                            <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 truncate">{lesson?.title || 'No Lesson Selected'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Settings Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
                                <div className="sm:col-span-8 space-y-4">
                                    <label className={labelClass + " ml-2"}>Assessment Format</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <QuizTypeCard id="multiple-choice" label="Multiple Choice" icon={ListBulletIcon} />
                                        <QuizTypeCard id="true-false" label="True / False" icon={CheckIcon} />
                                        <QuizTypeCard id="identification" label="Identification" icon={DocumentTextIcon} />
                                        <QuizTypeCard id="matching-type" label="Matching" icon={QueueListIcon} />
                                        <QuizTypeCard id="essay" label="Essay" icon={ChatBubbleLeftRightIcon} />
                                        <QuizTypeCard id="mixed" label="Mixed" icon={SquaresPlusIcon} />
                                    </div>
                                </div>
                                <div className="sm:col-span-4 flex flex-col gap-6">
                                    <div className={inputGroupClass}>
                                        <label className={labelClass}><AdjustmentsHorizontalIcon className="w-3 h-3 inline mr-1"/>Item Count</label>
                                        <div className="relative">
                                            <input type="number" value={itemCount} onChange={(e) => setItemCount(Math.min(50, Math.max(1, parseInt(e.target.value)||1)))} className={inputClass + " pl-5 text-lg font-bold"} />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">Items</span>
                                        </div>
                                    </div>
                                    <div className={inputGroupClass}>
                                        <label className={labelClass}><LanguageIcon className="w-3 h-3 inline mr-1"/>Language</label>
                                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
                                            <option>English</option><option>Filipino</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Mixed Distribution */}
                            {quizType === 'mixed' && (
                                <div className="bg-slate-100 dark:bg-[#1A1A1D] p-6 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-xs font-bold uppercase text-slate-500">Distribution Balance</span>
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${Object.values(distribution).reduce((a,b)=>a+b,0) === itemCount ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {Object.values(distribution).reduce((a,b)=>a+b,0)} / {itemCount}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {['multiple-choice', 'true-false', 'identification', 'matching-type', 'essay'].map((type) => (
                                            <div key={type} className="bg-white dark:bg-[#202023] p-3 rounded-2xl shadow-sm">
                                                <span className="text-[10px] font-bold text-slate-400 block mb-1 truncate">{type.replace('-', ' ')}</span>
                                                <input 
                                                    type="number" 
                                                    value={distribution[type]} 
                                                    onChange={(e) => handleDistributionChange(type, e.target.value)}
                                                    className="w-full text-center font-bold bg-transparent outline-none border-b border-transparent focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LOADING STATE (Replaces Step 1) */}
                    {isGenerating && step !== 4 && (
                        <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in duration-500">
                            <div className="relative w-32 h-32 mb-8">
                                <div className="absolute inset-0 border-4 border-slate-100 dark:border-white/5 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                <SparklesIcon className="absolute inset-0 m-auto w-10 h-10 text-indigo-500 animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Crafting Quiz...</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                                Our AI is analyzing the lesson content, aligning with DepEd standards, and generating scenarios.
                            </p>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 3 && generatedQuiz && (
                        <div className="max-w-3xl mx-auto animate-in slide-in-from-right-8 duration-500 pb-20">
                            
                            {/* Quiz Header Card */}
                            <div className="mb-10 text-center space-y-2">
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{generatedQuiz.title}</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">{generatedQuiz.questions.length} Questions Generated</p>
                            </div>
                            
                            <div className="space-y-6">
                                {generatedQuiz.questions.map((q, i) => <PreviewItem key={i} q={q} i={i} />)}
                            </div>
                            
                            {/* Refinement Bar */}
                            <div className="sticky bottom-4 mt-12 bg-white/80 dark:bg-[#1A1A1D]/90 backdrop-blur-xl p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/5 flex gap-3">
                                <input 
                                    value={revisionPrompt} 
                                    onChange={(e) => setRevisionPrompt(e.target.value)} 
                                    placeholder="Need changes? e.g. 'Make it harder', 'Focus on dates'" 
                                    className="flex-1 bg-transparent border-none px-4 text-sm font-medium outline-none text-slate-700 dark:text-white placeholder-slate-400" 
                                />
                                <button 
                                    onClick={() => handleGenerate(true)} 
                                    disabled={isGenerating} 
                                    className="p-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black hover:scale-105 transition-all shadow-lg"
                                >
                                    <ArrowPathIcon className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center h-full pb-20 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-32 h-32 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30 rotate-3">
                                <CheckCircleIcon className="w-16 h-16" />
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Quiz Published!</h2>
                            <p className="text-lg text-slate-500 max-w-md">Your assessment has been successfully saved to the unit and is ready for students.</p>
                        </div>
                    )}
                </div>

                {/* --- FOOTER --- */}
                {!isGenerating && step !== 4 && (
                    <div className={footerClass}>
                        {step > 1 ? (
                            <button onClick={() => setStep(step - 1)} className={btnSecondary}>
                                <ArrowLeftIcon className="w-4 h-4 inline mr-2"/>Back
                            </button>
                        ) : <div className="w-24"></div>}
                        
                        {error && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-20 px-4 py-2 bg-rose-50 text-rose-600 text-xs font-bold rounded-full shadow-sm border border-rose-100 animate-in fade-in slide-in-from-bottom-2">
                                {error}
                            </div>
                        )}

                        {step === 1 && (
                            <button onClick={() => handleGenerate(false)} className={btnPrimary}>
                                Generate Magic Quiz <SparklesIcon className="w-5 h-5"/>
                            </button>
                        )}
                        {step === 3 && (
                            <button onClick={handleSave} className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2">
                                Save to Unit <CheckIcon className="w-5 h-5"/>
                            </button>
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