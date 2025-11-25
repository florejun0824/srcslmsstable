import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { 
    XMarkIcon, 
    PlusIcon, 
    TrashIcon, 
    ClipboardDocumentListIcon, 
    ArrowUturnLeftIcon,
    PlayCircleIcon,
    CheckBadgeIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { doc, collection, writeBatch, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import InteractiveLoadingScreen from '../common/InteractiveLoadingScreen'; 
import CourseSelector from './CourseSelector'; 
import LessonSelector from './LessonSelector'; 

// --- UTILS & PARSERS ---

const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;

const calculateItemsForRange = (rangeString) => {
    if (!rangeString) return 0;
    const ranges = rangeString.split(',').map(r => r.trim());
    let totalItems = 0;
    for (const range of ranges) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) totalItems += (end - start + 1);
        else if (!isNaN(start)) totalItems += 1;
    }
    return totalItems;
};

const extractJson = (text) => {
    let match = text.match(/```json\s*([\sS]*?)\s*```/);
    if (!match) match = text.match(/```([\sS]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    return text; 
};

const tryParseJson = (jsonString) => {
    try {
        const sanitizedString = jsonString
            .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\') 
            .replace(/,\s*([}\]])/g, '$1'); 
        return JSON.parse(sanitizedString);
    } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("Invalid JSON format from AI.");
    }
};

// --- PROMPTS (Context Aware) ---

const getTosPlannerPrompt = (guideData) => {
    const { learningCompetencies, language, totalConfiguredItems, selectedCourse, selectedLessons } = guideData;
    const subject = selectedCourse?.title || 'Subject';
    const combinedLessonTitles = selectedLessons.map(lesson => lesson.title).join(', ');

    return `
    Role: Expert Curriculum Planner (DepEd Philippines Standards).
    Task: Generate a Table of Specifications (TOS).
    
    Context:
    - Subject: ${subject}
    - Lessons: ${combinedLessonTitles}
    - Competencies: ${learningCompetencies}
    - Total Items: ${totalConfiguredItems}
    - Language: ${language}

    Requirements:
    1. Map difficulty to Revised Bloom's Taxonomy: Easy (60% Rem/Und), Average (30% App/Ana), Difficult (10% Eva/Cre).
    2. Ensure 'noOfItems' sums exactly to ${totalConfiguredItems}.
    3. Assign specific item numbers (e.g., "1-5, 8").

    Output JSON:
    {
        "examTitle": "Periodical Exam for ${subject}",
        "tos": {
            "header": { "examTitle": "...", "subject": "${subject}", "gradeLevel": "..." },
            "competencyBreakdown": [
                { "competency": "...", "noOfHours": 0, "weightPercentage": "...", "noOfItems": 0, "easyItems": { "itemNumbers": "..." }, "averageItems": { "itemNumbers": "..." }, "difficultItems": { "itemNumbers": "..." } }
            ],
            "totalRow": { "hours": "...", "weightPercentage": "100%", "noOfItems": ${totalConfiguredItems} }
        }
    }
    `;
};

const getExamComponentPrompt = (guideData, generatedTos, testType, previousQuestionsContext) => {
    const { language, combinedContent } = guideData;
    const { type, range } = testType;
    const tosContext = JSON.stringify(generatedTos, null, 2);

    return `
    Role: Academic Examiner.
    Task: Generate exam questions for section: **${type}**.
    Language: ${language}.
    Items Range: ${range}.
    
    Source Material:
    \`\`\`${combinedContent.substring(0, 15000)}\`\`\`

    TOS Context (Align difficulty/topic to item numbers):
    ${tosContext}

    **CRITICAL ANTI-REDUNDANCY INSTRUCTION:**
    The following topics have ALREADY been asked in previous sections. 
    You MUST NOT repeat these specific questions or test the exact same fact in the exact same way. Find different angles or other details to test.
    
    --- PREVIOUSLY ASKED (DO NOT REPEAT) ---
    ${previousQuestionsContext || "None yet."}
    ----------------------------------------

    Output JSON:
    {
        "questions": [
            { 
                "questionNumber": 1, 
                "type": "${type}", 
                "instruction": "...", 
                "question": "...", 
                "options": ["A", "B", "C", "D"], // For MC only. Pure text options.
                "correctAnswer": "...", 
                "explanation": "...",
                // For Matching Type Only:
                "prompts": ["Prompt 1", "Prompt 2"],
                "matchingOptions": ["Option A", "Option B"],
                "pairs": [{"prompt": "Prompt 1", "match": "Option A"}]
            }
        ]
    }
    `;
};

// --- UI COMPONENTS ---

const ModalHeader = ({ title, onClose, onBack, showBack }) => (
    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
            {showBack && (
                <button onClick={onBack} className="p-2 -ml-2 rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-white/10 transition-colors">
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 transition-all">
            <XMarkIcon className="w-5 h-5" />
        </button>
    </div>
);

const IosInput = ({ label, value, onChange, type = "text", placeholder, className = "" }) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
    </div>
);

const IosSelect = ({ label, value, onChange, options, className = "" }) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        <div className="relative">
            <select 
                value={value} 
                onChange={onChange} 
                className="w-full appearance-none px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
);

const IosSection = ({ title, children, action }) => (
    <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-2xl p-5 space-y-4 border border-gray-200 dark:border-white/5">
        <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                {title}
            </h3>
            {action}
        </div>
        {children}
    </div>
);

// --- SCREENS ---

const ExamConfigScreen = ({ guideData, setGuideData, onNext, onClose }) => {
    const [testTypes, setTestTypes] = useState(guideData.testTypes || []);
    
    useEffect(() => {
        setGuideData(prev => ({ ...prev, testTypes }));
    }, [testTypes, setGuideData]);

    const handleTestTypeChange = (index, field, value) => {
        const updated = [...testTypes];
        updated[index][field] = value;
        if (field === 'range') updated[index].numItems = calculateItemsForRange(value);
        setTestTypes(updated);
    };

    const addTestType = () => setTestTypes([...testTypes, { type: 'Multiple Choice', range: '', numItems: 0 }]);
    const removeTestType = (index) => setTestTypes(testTypes.filter((_, i) => i !== index));
    
    const totalItems = testTypes.reduce((sum, t) => sum + (t.numItems || 0), 0);
    const isValid = guideData.selectedCourse && guideData.selectedLessons.length > 0 && guideData.learningCompetencies && totalItems > 0;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
            <ModalHeader title="New Exam" onClose={onClose} />
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Context */}
                    <div className="lg:col-span-7 space-y-6">
                        <IosSection title="Source Material">
                            <div className="space-y-4">
                                <CourseSelector 
                                    onCourseSelect={(c) => setGuideData(prev => ({...prev, selectedCourse: c}))} 
                                    selectedCourseId={guideData.selectedCourse?.id}
                                />
                                {guideData.selectedCourse && (
                                    <LessonSelector 
                                        subjectId={guideData.selectedCourse.id} 
                                        onLessonsSelect={(l) => setGuideData(prev => ({...prev, selectedLessons: l}))}
                                        preselectedIds={guideData.selectedLessons.map(l => l.id)}
                                    />
                                )}
                            </div>
                        </IosSection>

                        <IosSection title="Exam Context">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <IosInput label="Total Hours" type="number" value={guideData.totalHours} onChange={e => setGuideData(prev => ({...prev, totalHours: e.target.value}))} placeholder="e.g. 40" />
                                    <IosSelect label="Language" value={guideData.language} onChange={e => setGuideData(prev => ({...prev, language: e.target.value}))} options={['English', 'Filipino']} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Learning Competencies</label>
                                    <textarea 
                                        rows={4}
                                        value={guideData.learningCompetencies}
                                        onChange={e => setGuideData(prev => ({...prev, learningCompetencies: e.target.value}))}
                                        className="w-full mt-1.5 px-4 py-3 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                        placeholder="Paste competencies here..."
                                    />
                                </div>
                            </div>
                        </IosSection>
                    </div>

                    {/* Right Column: Structure */}
                    <div className="lg:col-span-5">
                        <IosSection 
                            title="Test Structure" 
                            action={<button onClick={addTestType} className="text-blue-500 hover:text-blue-400"><PlusIcon className="w-6 h-6" /></button>}
                        >
                            <div className="space-y-3 min-h-[300px]">
                                {testTypes.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm italic">
                                        Add a test section to begin.
                                    </div>
                                )}
                                {testTypes.map((test, index) => (
                                    <div key={index} className="flex items-start gap-2 bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                                        <div className="flex-1 space-y-2">
                                            <select 
                                                value={test.type} 
                                                onChange={e => handleTestTypeChange(index, 'type', e.target.value)} 
                                                className="w-full text-sm bg-transparent font-semibold text-gray-900 dark:text-white border-none focus:ring-0 p-0"
                                            >
                                                {['Multiple Choice', 'Matching Type', 'Alternative Response', 'Identification', 'Solving', 'Essay', 'Analogy', 'Interpretive'].map(o => <option key={o}>{o}</option>)}
                                            </select>
                                            <input 
                                                type="text" 
                                                value={test.range} 
                                                onChange={e => handleTestTypeChange(index, 'range', e.target.value)} 
                                                placeholder="Range (e.g. 1-10)" 
                                                className="w-full text-xs bg-gray-100 dark:bg-white/5 rounded px-2 py-1 text-gray-600 dark:text-gray-300 border-none" 
                                            />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md whitespace-nowrap">
                                                {test.numItems} items
                                            </span>
                                            <button onClick={() => removeTestType(index)} className="p-1 text-red-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Total Items</span>
                                <span className="text-xl font-black text-gray-900 dark:text-white">{totalItems}</span>
                            </div>
                        </IosSection>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl flex justify-end">
                <button 
                    onClick={onNext} 
                    disabled={!isValid} 
                    className="px-8 py-3.5 bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                    <PlayCircleIcon className="w-5 h-5" /> Generate Exam
                </button>
            </div>
        </div>
    );
};

const ExamGenerationScreen = ({ guideData, onComplete, onBack }) => {
    const { showToast } = useToast();
    const [progress, setProgress] = useState({ current: 0, total: 0, status: 'Initializing...' });
    const isMounted = useRef(true);
    const abortControllerRef = useRef(null);

    const runGeneration = useCallback(async () => {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        try {
            const { testTypes, learningCompetencies, language, selectedCourse, selectedLessons, totalHours } = guideData;
            const totalConfiguredItems = testTypes.reduce((s, t) => s + (t.numItems || 0), 0);
            
            const combinedContent = selectedLessons.flatMap(l => l.pages?.map(p => p.content) || []).join('\n\n');
            const fullGuideData = { ...guideData, totalConfiguredItems, combinedContent };

            // --- STEP 1: TOS PLANNER ---
            setProgress({ current: 1, total: testTypes.length + 1, status: 'Designing Table of Specifications...' });
            
            const tosPrompt = getTosPlannerPrompt(fullGuideData);
            const tosResponse = await callGeminiWithLimitCheck(tosPrompt, { signal });
            if (!isMounted.current) return;

            const parsedTosData = tryParseJson(extractJson(tosResponse));
            if (!parsedTosData?.tos) throw new Error("Invalid TOS generated.");
            
            // --- STEP 2: MICRO-WORKERS WITH CONTEXT CHAINING ---
            let allQuestions = [];
            let contextChain = []; 

            for (const [index, testType] of testTypes.entries()) {
                if (testType.numItems === 0) continue;
                
                setProgress({ 
                    current: index + 2, 
                    total: testTypes.length + 1, 
                    status: `Writing ${testType.type} questions (${testType.range})...` 
                });

                const previousQuestionsString = contextChain.join('\n');
                const prompt = getExamComponentPrompt(fullGuideData, parsedTosData.tos, testType, previousQuestionsString);
                const response = await callGeminiWithLimitCheck(prompt, { signal });
                
                if (!isMounted.current) return;
                
                const componentData = tryParseJson(extractJson(response));
                if (componentData?.questions) {
                    allQuestions = [...allQuestions, ...componentData.questions];
                    const summary = componentData.questions.map(q => `[Q${q.questionNumber}]: ${q.question}`).join('; ');
                    contextChain.push(`Section (${testType.type}): ${summary}`);
                }
            }

            allQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

            onComplete({
                examTitle: parsedTosData.examTitle,
                tos: parsedTosData.tos,
                examQuestions: allQuestions
            });

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Generation Error:", error);
                showToast("Generation failed. Please try again.", "error");
                onBack(); 
            }
        }
    }, [guideData, onComplete, onBack, showToast]);

    useEffect(() => {
        runGeneration();
        return () => abortControllerRef.current?.abort();
    }, []);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#000000]">
            <ModalHeader title="Generating..." onClose={onBack} />
            <div className="flex-1 flex flex-col items-center justify-center p-10">
                <InteractiveLoadingScreen 
                    topic="Exam Content" 
                    isSaving={false} 
                    lessonProgress={{ current: progress.current, total: progress.total }} 
                />
                <p className="mt-8 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">{progress.status}</p>
            </div>
        </div>
    );
};

const ExamPreviewScreen = ({ previewData, language, onSave, onBack, onClose }) => {
    const [activeTab, setActiveTab] = useState('exam'); 

    const tabs = [
        { id: 'tos', label: 'TOS' },
        { id: 'exam', label: 'Exam Questions' },
        { id: 'key', label: 'Answer Key' }
    ];

    const renderQuestions = () => {
        const grouped = previewData.examQuestions.reduce((acc, q) => {
            const type = q.type || 'Unknown';
            if(!acc[type]) acc[type] = [];
            acc[type].push(q);
            return acc;
        }, {});

        return Object.entries(grouped).map(([type, qs], idx) => (
            <div key={type} className="mb-8 last:mb-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 border-b border-gray-200 dark:border-white/10 pb-1">
                    {['I', 'II', 'III', 'IV', 'V'][idx] || idx+1}. {type.toUpperCase()}
                </h3>
                <p className="text-sm text-gray-500 italic mb-4">{qs[0].instruction}</p>
                <div className="space-y-4">
                    {qs.map((q, qIdx) => (
                        <div key={qIdx} className="pl-2">
                            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                <span className="font-bold mr-2">{q.questionNumber}.</span>
                                {q.question}
                            </p>
                            {q.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 ml-6">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-bold mr-1">{String.fromCharCode(97+oIdx)}.</span> {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        ));
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#000000]">
            <ModalHeader title="Review Exam" onClose={onClose} onBack={onBack} showBack={true} />
            
            <div className="px-6 pt-4 pb-2">
                <div className="flex p-1 bg-gray-100 dark:bg-[#1C1C1E] rounded-xl border border-gray-200 dark:border-white/5">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-4xl mx-auto bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/5 p-8 rounded-2xl shadow-sm min-h-full">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wide">{previewData.examTitle}</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{previewData.tos.header.subject} • {previewData.tos.header.gradeLevel}</p>
                    </div>

                    {activeTab === 'exam' && renderQuestions()}
                    
                    {activeTab === 'tos' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-[#2C2C2E] border-b border-gray-200 dark:border-white/10">
                                        <th className="p-3 font-bold text-gray-700 dark:text-gray-200">Competency</th>
                                        <th className="p-3 text-center font-bold text-gray-700 dark:text-gray-200">Items</th>
                                        <th className="p-3 text-center font-bold text-green-600">Easy</th>
                                        <th className="p-3 text-center font-bold text-yellow-600">Avg</th>
                                        <th className="p-3 text-center font-bold text-red-600">Diff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {previewData.tos.competencyBreakdown.map((row, i) => (
                                        <tr key={i}>
                                            <td className="p-3 text-gray-600 dark:text-gray-300">{row.competency}</td>
                                            <td className="p-3 text-center text-gray-900 dark:text-white font-bold">{row.noOfItems}</td>
                                            <td className="p-3 text-center text-gray-500">{row.easyItems.itemNumbers}</td>
                                            <td className="p-3 text-center text-gray-500">{row.averageItems.itemNumbers}</td>
                                            <td className="p-3 text-center text-gray-500">{row.difficultItems.itemNumbers}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'key' && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {previewData.examQuestions.map((q, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-[#2C2C2E] rounded border border-gray-200 dark:border-white/5">
                                    <span className="font-bold text-gray-500 text-sm">{q.questionNumber}</span>
                                    <span className="font-mono font-bold text-green-600 dark:text-green-400 text-sm truncate ml-2" title={q.correctAnswer}>
                                        {q.type === 'Multiple Choice' 
                                            ? String.fromCharCode(97 + (q.options?.findIndex(o => o.trim() === q.correctAnswer.trim()) || 0)) 
                                            : q.correctAnswer}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#2C2C2E]/80 backdrop-blur-xl flex justify-end gap-3">
                <button onClick={() => onSave('lesson')} className="px-6 py-3 rounded-xl font-bold text-sm bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 transition-all flex items-center gap-2">
                    <DocumentArrowDownIcon className="w-5 h-5" /> Save as Lesson
                </button>
                <button onClick={() => onSave('quiz')} className="px-6 py-3 rounded-xl font-bold text-sm bg-[#007AFF] hover:bg-[#0062cc] text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    <CheckBadgeIcon className="w-5 h-5" /> Save as Quiz
                </button>
            </div>
        </div>
    );
};

// --- MAIN MODAL CONTROLLER ---

export default function CreateExamAndTosModal({ isOpen, onClose, unitId, subjectId }) {
    const { showToast } = useToast();
    const [step, setStep] = useState('config'); 
    const [guideData, setGuideData] = useState({
        totalHours: 40,
        language: 'English',
        learningCompetencies: '',
        testTypes: [],
        selectedCourse: null,
        selectedLessons: []
    });
    const [generatedData, setGeneratedData] = useState(null);

    useEffect(() => {
        if(isOpen) {
            setStep('config');
            setGeneratedData(null);
        }
    }, [isOpen]);

    const handleSave = async (type) => {
        try {
            const batch = writeBatch(db);
            
            // Save as Lesson (Viewable/Printable)
            if (type === 'lesson' || type === 'both') {
                const lessonRef = doc(collection(db, 'lessons'));
                // In a real app, you would use a markdown generator function here
                const content = `# ${generatedData.examTitle}\n\n(Full content saved in interactive format)`; 
                
                batch.set(lessonRef, {
                    title: generatedData.examTitle,
                    contentType: 'studentLesson',
                    subjectId, unitId, createdAt: serverTimestamp(),
                    pages: [{ title: 'Exam', type: 'text/markdown', content }]
                });
            }

            // Save as Interactive Quiz (Editable in ManualQuizCreator)
            if (type === 'quiz' || type === 'both') {
                // TRANSFORM DATA TO MATCH MANUAL CREATOR SCHEMA
                const formattedQuestions = generatedData.examQuestions.map(q => {
                    const base = {
                        id: uniqueId(),
                        text: q.question,
                        points: 1, // Default
                        explanation: q.explanation || '',
                        type: q.type.toLowerCase().replace(/\s+/g, '-').replace('multiple-choice', 'multiple-choice') 
                    };

                    // 1. Multiple Choice
                    if (base.type.includes('multiple')) {
                        return {
                            ...base,
                            type: 'multiple-choice',
                            options: q.options || [],
                            correctAnswerIndex: q.options ? q.options.findIndex(o => o.trim() === q.correctAnswer.trim()) : 0
                        };
                    }

                    // 2. True/False
                    if (base.type.includes('alternative') || base.type.includes('true')) {
                        return {
                            ...base,
                            type: 'true-false',
                            correctAnswer: String(q.correctAnswer).toLowerCase().includes('true')
                        };
                    }

                    // 3. Matching Type
                    if (base.type.includes('matching')) {
                        // Transform AI output (lists) into ID-mapped objects
                        const prompts = (q.prompts || []).map(p => ({ id: uniqueId(), text: p }));
                        const options = (q.matchingOptions || []).map(o => ({ id: uniqueId(), text: o }));
                        
                        // Build correctPairs map based on AI "pairs" array
                        const correctPairs = {};
                        if (q.pairs) {
                            q.pairs.forEach(pair => {
                                const pObj = prompts.find(p => p.text === pair.prompt);
                                const oObj = options.find(o => o.text === pair.match);
                                if (pObj && oObj) correctPairs[pObj.id] = oObj.id;
                            });
                        }

                        return {
                            ...base,
                            type: 'matching-type',
                            prompts,
                            options,
                            correctPairs
                        };
                    }

                    // 4. Essay
                    if (base.type.includes('essay')) {
                        return {
                            ...base,
                            type: 'essay',
                            rubric: [{ id: uniqueId(), criteria: 'Content', points: 5 }] // Default rubric if AI didn't provide one
                        };
                    }

                    // 5. Identification (Default fallback)
                    return {
                        ...base,
                        type: 'identification',
                        correctAnswer: q.correctAnswer
                    };
                });

                const quizRef = doc(collection(db, 'quizzes'));
                batch.set(quizRef, {
                    title: `Quiz: ${generatedData.examTitle}`,
                    unitId, subjectId, createdAt: serverTimestamp(),
                    questions: formattedQuestions
                });
            }

            await batch.commit();
            showToast("Saved successfully!", "success");
            onClose();
        } catch (e) {
            console.error(e);
            showToast("Save failed.", "error");
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
                <Dialog.Panel className="w-full max-w-6xl h-[85vh] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all transform">
                    {step === 'config' && (
                        <ExamConfigScreen 
                            guideData={guideData} 
                            setGuideData={setGuideData} 
                            onNext={() => setStep('generating')} 
                            onClose={onClose} 
                        />
                    )}
                    {step === 'generating' && (
                        <ExamGenerationScreen 
                            guideData={guideData} 
                            onComplete={(data) => { setGeneratedData(data); setStep('preview'); }} 
                            onBack={() => setStep('config')} 
                        />
                    )}
                    {step === 'preview' && generatedData && (
                        <ExamPreviewScreen 
                            previewData={generatedData} 
                            language={guideData.language}
                            onSave={handleSave}
                            onBack={() => setStep('config')}
                            onClose={onClose}
                        />
                    )}
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}