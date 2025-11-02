import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Subtitle } from '@tremor/react';
import { SparklesIcon, ArrowUturnLeftIcon, CheckCircleIcon, LanguageIcon, ListBulletIcon, HashtagIcon, ClipboardDocumentListIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { getAllSubjects } from '../../services/firestoreService';
import { useToast } from '../../contexts/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QuizLoadingScreen from './QuizLoadingScreen';
import ContentRenderer from './ContentRenderer';

// Neumorphic styles helper for segmented controls
// --- MODIFIED: Added dark theme styles ---
const getSegmentedButtonClasses = (isActive) => {
    const baseClasses = "flex-1 rounded-lg py-2.5 px-3 text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-200 dark:ring-offset-neumorphic-base-dark ring-sky-500";
    if (isActive) {
        return `${baseClasses} bg-slate-200 text-sky-600 shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] dark:bg-neumorphic-base-dark dark:text-sky-400 dark:shadow-lg scale-100`;
    }
    return `${baseClasses} bg-transparent text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-neumorphic-base-dark/50`;
};

// Neumorphic input field styles
// --- MODIFIED: Added dark theme styles ---
const inputBaseStyles = "bg-slate-200 dark:bg-neumorphic-base-dark rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] dark:shadow-neumorphic-inset-dark focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 dark:placeholder-slate-500 border-none dark:text-slate-100";

// Neumorphic button styles
// --- MODIFIED: Added dark theme styles ---
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-neumorphic-base-dark";
const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]
                   dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark`;
const btnDisabled = "disabled:text-slate-400 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff] dark:disabled:text-slate-600 dark:disabled:shadow-neumorphic-inset-dark";

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
    const [language, setLanguage] = useState('English');
    const [distribution, setDistribution] = useState({ 'multiple-choice': 10, 'true-false': 0, 'identification': 0 });
    const [revisionPrompt, setRevisionPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [error, setError] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const subs = await getAllSubjects();
                setSubjects(subs);
                if (subjectId) {
                    setSelectedSubject(subjectId);
                }
            } catch (error) {
                showToast('Could not fetch subjects.', 'error');
            }
        };
        if (isOpen) {
            fetchSubjects();
        }
    }, [isOpen, subjectId, showToast]);

    useEffect(() => {
        if (isOpen) {
            setStep(1); setItemCount(10); setQuizType('multiple-choice'); setLanguage('English');
            setDistribution({ 'multiple-choice': 10, 'true-false': 0, 'identification': 0 });
            setRevisionPrompt(''); setIsGenerating(false); setGeneratedQuiz(null); setError('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (quizType !== 'mixed') {
            const newDistribution = { 'multiple-choice': 0, 'true-false': 0, 'identification': 0 };
            newDistribution[quizType] = itemCount;
            setDistribution(newDistribution);
        }
    }, [itemCount, quizType]);

    const handleDistributionChange = (type, value) => {
        const newDistribution = { ...distribution, [type]: value };
        const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
        setError(total > itemCount ? `The total number of items (${total}) cannot exceed ${itemCount}.` : '');
        setDistribution(newDistribution);
    };

    const constructPrompt = (isRevision = false) => {
        if (isRevision && generatedQuiz) {
              const quizJson = JSON.stringify(generatedQuiz, null, 2);
              return `You are a quiz editor. The user has provided a quiz in JSON format and an instruction for revision. Your task is to apply the revision and return the **complete, updated, and valid JSON object** of the quiz. 
              
              **CRITICAL LANGUAGE RULE:** The entire revised quiz (questions, options, explanations) MUST be in **${language}**.
              
              Do not add any commentary outside the JSON block.
              
              **Original Quiz JSON:**
              \`\`\`json
              ${quizJson}
              \`\`\`

              **User's Instruction for Revision:** "${revisionPrompt}"`;
        }

        const lessonContentForPrompt = lesson?.pages?.map(page => `Page Title: ${page.title}\nPage Content: ${page.content}`).join('\n\n') || '';

        const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
        const catholicSubjects = ["Christian Social Living 7-10", "Religious Education 11-12"];
        let perspectiveInstruction = '';
        if (selectedSubjectData && catholicSubjects.includes(selectedSubjectData.title)) {
            perspectiveInstruction = `
                **CRITICAL PERSPECTIVE INSTRUCTION:** The content MUST be written from a **Catholic perspective**. This is non-negotiable. All explanations, examples, and interpretations must align with Catholic teachings, doctrines, and values. You must integrate principles from the Catechism of the Catholic Church, relevant encyclicals, and Sacred Scripture where appropriate.
                **CRITICAL SOURCE REQUIREMENT (NON-NEGOTIABLE):** For all content and for the "References" section, you MUST prioritize citing and referencing official Catholic sources. This includes, but is not limited to: the **Catechism of the Catholic Church (CCC)**, the **Youth Catechism (Youcat)**, relevant **Apostolic Letters**, **Encyclical Letters**, and documents from Vatican II. Secular sources may be used sparingly, but the core foundation must be these official Church documents.
            `;
        }

        let prompt = `You are an expert instructional designer creating curriculum-aligned assessment tools for the Philippine Department of Education (DepEd). Your task is to create a high-quality, academically appropriate quiz on the topic of "${lesson?.title}".

**PEDAGOGICAL FRAMEWORK:**
${perspectiveInstruction}
1.  **DepEd Alignment:** All questions must be academically rigorous, curriculum-relevant, and suitable for a high school academic level. The goal is to assess understanding of key concepts, not to trick the student.
2.  **KNOWLEDGE SOURCE:** Use the provided text below only to understand the core concepts of the topic.
3.  **ABSOLUTE RULE:** You MUST NOT create questions that refer to the provided text itself (e.g., "According to the lesson..."). The quiz must be a standalone assessment.

**KNOWLEDGE SOURCE TEXT:**
---
${lessonContentForPrompt}
---

**QUIZ REQUIREMENTS:**
1.  **CRITICAL LANGUAGE RULE:** You MUST generate the entire quiz (questions, choices, explanations) exclusively in **${language}**.
    - If language is **Filipino**, all concepts must be properly contextualized. For 'true-false' questions, the framework is "Tama o Mali".
2.  **Total Items:** The quiz must have exactly ${itemCount} items.
3.  **Bloom's Taxonomy Levels:** Generate a 50/50 split between these two difficulty levels:
    - **easy:** (Remembering/Understanding) Tests recall of facts and basic concepts.
    - **comprehension:** (Applying/Analyzing) Requires using information in new situations or drawing connections among ideas.
4.  **Question Types:**`;

        if (quizType === 'mixed') {
            prompt += ` A mix with the following distribution: ${distribution['multiple-choice']} multiple-choice, ${distribution['true-false']} true/false, and ${distribution['identification']} identification items.\n`;
        } else {
            prompt += ` All questions must be of the type: ${quizType}.\n`;
        }

        prompt += `
**QUALITY ASSURANCE CHECKS:**
1.  **Clarity:** Questions must be clear, concise, and unambiguous.
2.  **Significance:** Focus on the most important concepts from the lesson. Avoid trivial details.
3.  **Plausible Distractors:** For multiple-choice, incorrect options must be plausible but definitively wrong.
4.  **No Opinion Questions:** All questions must have a single, fact-based correct answer.

**JSON OUTPUT FORMAT:**
Return the response as a single, valid JSON object with a "title" and a "questions" array.
- For **multiple-choice** questions, choices in the "options" array MUST be ordered alphabetically (for words) or by length (shortest to longest for phrases).
- For **true-false** questions, the 'correctAnswer' must be a boolean (true/false). The question type must still be "true-false".
- For **identification** questions, the 'correctAnswer' must be a string.

**FINAL VALIDATION:** Before creating the JSON, review every question. If a question violates the **ABSOLUTE RULE**, **CRITICAL LANGUAGE RULE**, or any **QUALITY ASSURANCE CHECKS**, you MUST rewrite it.

---
**JSON Schema:**
- **root**: { "title": string, "questions": array }
- **question object**: { "text": string, "type": string ("multiple-choice", "true-false", "identification"), "difficulty": string ('easy' or 'comprehension'), "explanation": string, ... }
- **multiple-choice**: "options": array of { "text": string, "isCorrect": boolean }, "correctAnswerIndex": number
- **true-false**: "correctAnswer": boolean
- **identification**: "correctAnswer": string
---
`;
        return prompt;
    };


    const handleGenerate = async (isRevision = false) => {
        if (!lesson) {
            showToast("No lesson selected to generate a quiz from.", "error");
            return;
        }
        if (quizType === 'mixed' && !isRevision) {
            const totalDistributed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            if (totalDistributed !== itemCount) {
                setError(`The distribution total (${totalDistributed}) must match the total item count (${itemCount}). Please adjust the numbers.`);
                return;
            }
        }
        setError('');
        setIsGenerating(true);

        try {
            const quizGenerationPrompt = constructPrompt(isRevision);
            const aiText = await callGeminiWithLimitCheck(quizGenerationPrompt);
            const response = JSON.parse(aiText);

            if (!response || !response.title || !Array.isArray(response.questions)) {
                throw new Error("AI response was not in the expected format.");
            }

            const processedQuiz = {
                ...response,
                questions: response.questions.map(q => ({
                    ...q,
                    explanation: q.explanation || ''
                }))
            };

            setGeneratedQuiz(processedQuiz);
            setStep(3);
        } catch (err) {
            console.error("Error generating quiz:", err);
            showToast("AI generation failed. Please check the console and try again.", "error");
            setError("Failed to generate quiz. The AI might be busy or the response was invalid.");
        } finally {
            setIsGenerating(false);
        }
    };


    const handleSaveQuiz = async () => {
        if (!generatedQuiz || !lesson) return;
        setIsGenerating(true);
        try {
            const cleanedLessonTitle = lesson.title.replace(/Lesson\s*\d+:\s*/i, '').trim();
            const newQuizTitle = `Quiz: ${cleanedLessonTitle}`;

            const quizRef = doc(collection(db, 'quizzes'));

            await setDoc(quizRef, {
                ...generatedQuiz,
                title: newQuizTitle,
                language: language,
                unitId: lesson.unitId || unitId,
                subjectId,
                lessonId: lesson.id,
                createdAt: serverTimestamp(),
                createdBy: 'AI'
            });

            setStep(4);
            showToast("Quiz saved successfully!", "success");
        } catch (err) {
            console.error("Error saving quiz:", err);
            showToast("Failed to save the quiz to the database.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportPdf = () => {
        if (!generatedQuiz) {
            showToast("No quiz data available to export.", "warning");
            return;
        }

        const doc = new jsPDF();
        const quizBody = [];
        const answerKey = [];

        generatedQuiz.questions.forEach((q, i) => {
            let questionContent = q.text;
            let correctAnswerText = '';

            if (q.type === 'multiple-choice' && q.options) {
                const optionsText = q.options.map((opt, idx) => `  ${String.fromCharCode(97 + idx)}. ${opt.text}`).join('\n');
                questionContent += `\n${optionsText}`;
                const correctOption = q.options.find(opt => opt.isCorrect);
                correctAnswerText = correctOption ? correctOption.text : 'N/A';
            } else if (q.type === 'true-false') {
                // Add choices to the PDF body for true-false questions
                questionContent += language === 'Filipino' ? '\n  a. Tama\n  b. Mali' : '\n  a. True\n  b. False';
                correctAnswerText = language === 'Filipino' ? (q.correctAnswer ? 'Tama' : 'Mali') : String(q.correctAnswer);
            } else if (q.type === 'identification') {
                correctAnswerText = q.correctAnswer;
            }

            quizBody.push([i + 1, questionContent]);
            answerKey.push([i + 1, correctAnswerText]);
        });

        doc.setFontSize(18);
        doc.text(generatedQuiz.title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);

        autoTable(doc, {
            head: [['#', 'Question']],
            body: quizBody,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { cellPadding: 2, fontSize: 10 },
        });

        doc.addPage();
        doc.setFontSize(18);
        doc.text('Answer Key', 14, 22);

        autoTable(doc, {
            head: [['#', 'Correct Answer']],
            body: answerKey,
            startY: 30,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133], textColor: 255 },
        });

        doc.save(`${generatedQuiz.title}.pdf`);
        showToast("Quiz exported as PDF.", "success");
    };
    
    const getTranslatedType = (type) => {
        if (language !== 'Filipino') return type;
        switch(type) {
            case 'multiple-choice': return 'Maramihang Pagpipilian';
            case 'true-false': return 'Tama o Mali';
            case 'identification': return 'Pagtukoy';
            default: return type;
        }
    };

    const renderStepContent = () => {
        const questionTypes = [{ id: 'multiple-choice', name: 'Multiple Choice' }, { id: 'true-false', name: 'True/False' }, { id: 'identification', name: 'Identification' }, { id: 'mixed', name: 'Mixed' }];
        const distributionTypes = [
            { label: 'Multiple Choice', key: 'multiple-choice' },
            { label: 'True/False', key: 'true-false' },
            { label: 'Identification', key: 'identification' }
        ];

        switch (step) {
            case 1:
                const totalDistributed = Object.values(distribution).reduce((s, v) => s + v, 0);
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            {/* --- MODIFIED: Added dark theme styles --- */}
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 dark:bg-neumorphic-base-dark shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff] dark:shadow-neumorphic-inset-dark">
                                {/* --- MODIFIED: Added dark theme icon --- */}
                                <ClipboardDocumentListIcon className="h-9 w-9 text-sky-500 dark:text-sky-400" />
                            </div>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <Title className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">AI Quiz Generator</Title>
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">For: <span className="font-semibold text-slate-700 dark:text-slate-300">{lesson?.title}</span></p>
                        </div>
                        <div className="space-y-4">
                            {/* --- MODIFIED: Added dark theme styles --- */}
                            <div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] dark:shadow-neumorphic-inset-dark space-y-5">
                                <div>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center mb-2"><LanguageIcon className="h-5 w-5 mr-2" />Language</label>
                                    <div className={`flex space-x-1 p-1 rounded-xl ${inputBaseStyles}`}><button onClick={() => setLanguage('English')} className={getSegmentedButtonClasses(language === 'English')}>English</button><button onClick={() => setLanguage('Filipino')} className={getSegmentedButtonClasses(language === 'Filipino')}>Filipino</button></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center"><HashtagIcon className="h-5 w-5 mr-2" />Number of Items</label>
                                    <input type="number" value={itemCount} onChange={(e) => setItemCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))} className={`max-w-[100px] text-center ${inputBaseStyles} py-2.5`} />
                                </div>
                                <div>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center mb-2"><ListBulletIcon className="h-5 w-5 mr-2" />Subject</label>
                                    <select value={selectedSubject || ''} onChange={(e) => setSelectedSubject(e.target.value)} className={`w-full ${inputBaseStyles} py-2.5 px-3`}>
                                        <option value="" disabled>Select a subject</option>
                                        {subjects.map(subject => (
                                            <option key={subject.id} value={subject.id}>{subject.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* --- MODIFIED: Added dark theme styles --- */}
                            <div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] dark:shadow-neumorphic-inset-dark">
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center mb-2"><ListBulletIcon className="h-5 w-5 mr-2" />Question Type</label>
                                <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${inputBaseStyles}`}>{questionTypes.map((t) => (<button key={t.id} onClick={() => setQuizType(t.id)} className={getSegmentedButtonClasses(quizType === t.id)}>{t.name}</button>))}</div>
                            </div>
                        </div>
                        {/* --- MODIFIED: Added dark theme styles --- */}
                        {quizType === 'mixed' && (<div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] dark:shadow-neumorphic-inset-dark space-y-4">
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Item Distribution</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {distributionTypes.map(distType => (
                                    <div key={distType.key}>
                                        {/* --- MODIFIED: Added dark theme text --- */}
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{distType.label}</label>
                                        <input 
                                            type="number" 
                                            value={distribution[distType.key]} 
                                            onChange={(e) => handleDistributionChange(distType.key, Math.max(0, parseInt(e.target.value, 10) || 0))} 
                                            className={`w-full mt-1.5 text-center ${inputBaseStyles} py-2.5`} 
                                        />
                                    </div>
                                ))}
                            </div>
                            {/* --- MODIFIED: Added dark theme styles --- */}
                            {(totalDistributed !== itemCount) && (<p className="text-sm font-medium text-center text-amber-800 bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 p-2.5 rounded-lg shadow-[inset_1px_1px_2px_#e6c589,inset_-1px_-1px_2px_#ffffd3] dark:shadow-neumorphic-inset-dark">Current total: {totalDistributed} of {itemCount}</p>)}
                        </div>)}
                    </div>
                );

            case 3:
                return (
                     <div className="flex flex-col h-full">
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <Title className="text-2xl font-bold text-slate-800 dark:text-slate-100">Preview & Revise</Title>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <Subtitle className="mt-1 text-slate-500 dark:text-slate-400">Review the generated quiz below.</Subtitle>
                        <div className="mt-4 -mx-2 px-2 overflow-y-auto flex-grow space-y-4">
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">{generatedQuiz?.title}</h3>
                            {generatedQuiz?.questions.map((q, i) => (
                                // --- MODIFIED: Added dark theme styles ---
                                <div key={i} className="p-4 bg-slate-200 rounded-xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] dark:bg-neumorphic-base-dark dark:shadow-lg">
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <p className="font-semibold text-slate-900 dark:text-slate-100 leading-relaxed"><span className="text-slate-500 dark:text-slate-400 mr-2">{i + 1}.</span><ContentRenderer text={q.text} /></p>
                                    {/* --- MODIFIED: Added dark theme styles --- */}
                                    <div className="mt-3 flex items-center space-x-2">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-200 shadow-[inset_1px_1px_2px_#bdc1c6,inset_-1px_-1px_2px_#ffffff] text-sky-700 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-sky-300">{getTranslatedType(q.type)}</span>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-200 shadow-[inset_1px_1px_2px_#bdc1c6,inset_-1px_-1px_2px_#ffffff] text-purple-700 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-purple-300">{q.difficulty}</span>
                                    </div>
                                    <div className="mt-3 pl-6 text-sm">
                                        {q.type === 'multiple-choice' && q.options && (
                                            // --- MODIFIED: Added dark theme text ---
                                            <ul className="list-disc list-outside space-y-1.5 text-slate-700 dark:text-slate-300">
                                                {q.options.map((option) => (
                                                    // --- MODIFIED: Added dark theme text ---
                                                    <li key={option.text} className={option.isCorrect ? 'font-semibold text-green-700 dark:text-green-400' : ''}>
                                                        <ContentRenderer text={option.text} />
                                                        {option.isCorrect && <span className="text-green-500 dark:text-green-400 ml-1.5">✓</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {/* FIXED: Display Tama/Mali or True/False as options for preview */}
                                        {(q.type === 'true-false') && (
                                            // --- MODIFIED: Added dark theme text ---
                                            <ul className="list-disc list-outside space-y-1.5 text-slate-700 dark:text-slate-300">
                                                {/* --- MODIFIED: Added dark theme text --- */}
                                                <li className={q.correctAnswer === true ? 'font-semibold text-green-700 dark:text-green-400' : ''}>
                                                    {language === 'Filipino' ? 'Tama' : 'True'}
                                                    {q.correctAnswer === true && <span className="text-green-500 dark:text-green-400 ml-1.5">✓</span>}
                                                </li>
                                                {/* --- MODIFIED: Added dark theme text --- */}
                                                <li className={q.correctAnswer === false ? 'font-semibold text-green-700 dark:text-green-400' : ''}>
                                                    {language === 'Filipino' ? 'Mali' : 'False'}
                                                    {q.correctAnswer === false && <span className="text-green-500 dark:text-green-400 ml-1.5">✓</span>}
                                                </li>
                                            </ul>
                                        )}
                                        {(q.type === 'identification') && (
                                            // --- MODIFIED: Added dark theme text ---
                                            <p className="text-slate-700 dark:text-slate-300">
                                                Answer: <span className="font-semibold text-green-700 dark:text-green-400"><ContentRenderer text={String(q.correctAnswer)}/></span>
                                            </p>
                                        )}
                                        {q.explanation && (
                                            // --- MODIFIED: Added dark theme styles ---
                                            <div className="mt-4 p-3 bg-slate-200 border-l-4 border-sky-300 text-sky-900 rounded-r-lg shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff] dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-200 dark:shadow-neumorphic-inset-dark">
                                                <p className="font-bold text-xs tracking-wider uppercase">Explanation</p>
                                                <p className="text-sm italic mt-1"><ContentRenderer text={q.explanation} /></p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex-shrink-0">
                            {/* --- MODIFIED: Added dark theme text --- */}
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Request Changes (Optional)</label>
                            <textarea placeholder="e.g., Make question 3 harder..." value={revisionPrompt} onChange={e => setRevisionPrompt(e.target.value)} className={`w-full mt-1.5 text-sm ${inputBaseStyles} p-3 min-h-[60px]`} />
                            <div className="flex justify-end pt-2">
                                {/* --- MODIFIED: Added dark theme styles --- */}
                                <button onClick={() => handleGenerate(true)} disabled={isGenerating} className={`${btnBase} w-auto bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300 ${btnExtruded} ${btnDisabled}`}><ArrowUturnLeftIcon className="h-4 w-4 mr-2" />Regenerate</button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                        {/* --- MODIFIED: Added dark theme styles --- */}
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-neumorphic-base-dark mb-6 shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff] dark:shadow-neumorphic-inset-dark">
                            {/* --- MODIFIED: Added dark theme icon --- */}
                            <CheckCircleIcon className="h-12 w-12 text-green-500 dark:text-green-400" />
                        </div>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <Title className="text-3xl font-bold text-slate-800 dark:text-slate-100">Quiz Saved!</Title>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-xs">The quiz is now available in your content library.</p>
                    </div>
                );
            default: return null;
        }
    };

    const renderButtons = () => {
        if (step === 4) return (
            // --- MODIFIED: Added dark theme styles ---
            <button onClick={onClose} className={`${btnBase} bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-600 dark:hover:bg-slate-700 ${btnExtruded}`}>
                Close
            </button>
        );
        if (step === 3) return (
            <div className="grid grid-cols-3 gap-3">
                {/* --- MODIFIED: Added dark theme styles --- */}
                <button onClick={() => setStep(1)} className={`${btnBase} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300 ${btnExtruded}`}>Back</button>
                <button onClick={handleExportPdf} className={`${btnBase} bg-slate-200 text-slate-700 dark:bg-neumorphic-base-dark dark:text-slate-300 ${btnExtruded}`}>Export PDF</button>
                <button onClick={handleSaveQuiz} disabled={isGenerating} className={`${btnBase} bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-700 ${btnExtruded} ${btnDisabled}`}>Save Quiz</button>
            </div>
        );
        if (step === 1) {
            const isInvalid = quizType === 'mixed' && Object.values(distribution).reduce((s, v) => s + v, 0) !== itemCount;
            return (
                // --- MODIFIED: Added dark theme styles ---
                <button onClick={() => handleGenerate(false)} disabled={isInvalid || isGenerating} className={`${btnBase} bg-sky-500 hover:bg-sky-600 text-white dark:bg-sky-600 dark:hover:bg-sky-700 ${btnExtruded} disabled:bg-slate-200 dark:disabled:bg-neumorphic-base-dark ${btnDisabled}`}>
                    <SparklesIcon className="h-5 w-5 mr-2" />Generate Quiz
                </button>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* --- MODIFIED: Added dark theme backdrop --- */}
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm dark:bg-black/80" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                {/* --- MODIFIED: Added dark theme styles --- */}
                <DialogPanel className="max-w-lg w-full bg-slate-200 dark:bg-neumorphic-base-dark rounded-3xl shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] dark:shadow-lg flex flex-col max-h-[90vh] transition-all relative">
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    <button onClick={onClose} className={`absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-neumorphic-base-dark dark:text-slate-400 ${btnExtruded}`}><XMarkIcon className="h-6 w-6" /></button>
                    <div className="flex-1 overflow-y-auto p-8 pt-12">
                        {isGenerating ? <QuizLoadingScreen /> : renderStepContent()}
                        {/* --- MODIFIED: Added dark theme styles --- */}
                        {error && !isGenerating && <p className="text-sm text-red-800 dark:text-red-400 mt-4 text-center bg-red-200 dark:bg-red-900/50 p-3 rounded-lg shadow-[inset_1px_1px_2px_#d1d9e8,inset_-1px_-1px_2px_#ffffff] dark:shadow-neumorphic-inset-dark">{error}</p>}
                    </div>
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    {!isGenerating && <div className="flex-shrink-0 px-6 py-5 bg-slate-200/50 dark:bg-transparent border-t border-slate-300/70 dark:border-t dark:border-slate-700/50">{renderButtons()}</div>}
                </DialogPanel>
            </div>
        </Dialog>
    );
}