import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Subtitle } from '@tremor/react';
import { SparklesIcon, ArrowUturnLeftIcon, CheckCircleIcon, LanguageIcon, ListBulletIcon, HashtagIcon, ClipboardDocumentListIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QuizLoadingScreen from './QuizLoadingScreen';
import ContentRenderer from './ContentRenderer';

// Neumorphic styles helper for segmented controls
const getSegmentedButtonClasses = (isActive) => {
    const baseClasses = "flex-1 rounded-lg py-2.5 px-3 text-sm font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 ring-offset-2 ring-offset-slate-200 ring-sky-500";
    if (isActive) {
        return `${baseClasses} bg-slate-200 text-sky-600 shadow-[3px_3px_6px_#bdc1c6,-3px_-3px_6px_#ffffff] scale-100`;
    }
    return `${baseClasses} bg-transparent text-slate-600 hover:bg-slate-200/50`;
};

// Neumorphic input field styles
const inputBaseStyles = "bg-slate-200 rounded-xl shadow-[inset_2px_2px_5px_#bdc1c6,inset_-2px_-2px_5px_#ffffff] focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 border-none";

// Neumorphic button styles
const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200";
const btnExtruded = `shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff] hover:shadow-[inset_2px_2px_4px_#bdc1c6,inset_-2px_-2px_4px_#ffffff] active:shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]`;
const btnDisabled = "disabled:text-slate-400 disabled:shadow-[inset_2px_2px_5px_#d1d9e6,-2px_-2px_5px_#ffffff]";

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
    const [keyPoints, setKeyPoints] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep(1); setItemCount(10); setQuizType('multiple-choice'); setLanguage('English');
            setDistribution({ 'multiple-choice': 10, 'true-false': 0, 'identification': 0 });
            setRevisionPrompt(''); setIsGenerating(false); setGeneratedQuiz(null); setError(''); setKeyPoints('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (quizType !== 'mixed') {
            const newDistribution = { 'multiple-choice': 0, 'true-false': 0, 'identification': 0 };
            newDistribution[quizType] = itemCount; setDistribution(newDistribution);
        } else {
            setDistribution({ 'multiple-choice': itemCount, 'true-false': 0, 'identification': 0 });
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

        let prompt = `You are an expert instructional designer and quiz creator specializing in Bloom's Taxonomy. Your task is to create a quiz about the topic of "${lesson?.title}".

**PRIMARY DIRECTIVE:** Use the provided "KNOWLEDGE SOURCE TEXT" below only to understand the key concepts of the topic.
        
**ABSOLUTE RULE:** You MUST NOT create questions that refer to the provided text itself (e.g., "According to the lesson..."). The quiz must be a standalone assessment of the topic.

**KNOWLEDGE SOURCE TEXT:**
---
${lessonContentForPrompt}
---

**QUIZ REQUIREMENTS:**
1.  **CRITICAL LANGUAGE RULE:** You MUST generate the entire quiz, including all questions, choices, and explanations, exclusively in the following language: **${language}**. Do not mix languages under any circumstances.
2.  **Total Items:** The quiz must have exactly ${itemCount} items.
3.  **Difficulty Levels (Bloom's Taxonomy):** You must generate questions based on these two difficulty levels, with a 50/50 split between them:
    - **easy:** Corresponds to the 'Remembering' and 'Understanding' levels. These questions test for recall of facts and basic concepts.
    - **comprehension:** Corresponds to the 'Applying' and 'Analyzing' levels. These questions require using information in new situations or drawing connections among ideas.
4.	**Lesson Citing:** Do not explicitly cite the lesson in the quiz.
5.  **Question Types:**`;

        if (quizType === 'mixed') {
            prompt += ` The quiz should be a mix of types with the following distribution: ${distribution['multiple-choice']} multiple-choice, ${distribution['true-false']} true/false, and ${distribution['identification']} identification items.\n`;
        } else {
            prompt += ` All questions should be of the type: ${quizType}.\n`;
        }

        prompt += `
**JSON OUTPUT FORMAT:**
Return the response as a a single, valid JSON object. The object must have a "title" and a "questions" array.

**For 'multiple-choice' questions, follow this CRITICAL OPTION ORDERING RULE:**
You MUST order the choices in the "options" array according to the following logic:
1.  **Alphabetical:** If the choices are single words.
2.  **Pyramid Style (Shortest to Longest):** If the choices are sentences or long phrases.
3.  **Numerical Sequence:** If the choices are numbers.
4.  **Chronological Order:** If the choices are dates.

**FINAL VALIDATION STEP:** Before creating the final JSON, review every question. If a question violates the **ABSOLUTE RULE** or the **CRITICAL LANGUAGE RULE**, you MUST rewrite it.

---
**JSON Schema:**
- **root**: { "title": string, "questions": array }
- **question object**: { "text": string, "type": string, "difficulty": string ('easy' or 'comprehension'), "explanation": string, ...other properties based on type }
- For **multiple-choice**: "options": array of { "text": string, "isCorrect": boolean }, and "correctAnswerIndex": number
- for **true-false**: "correctAnswer": boolean
- for **identification**: "correctAnswer": string
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
            if (!isRevision) {
                const lessonContentForPrompt = lesson.pages.map(page => `Page Title: ${page.title}\nPage Content: ${page.content}`).join('\n\n');
                const summarizationPrompt = `Read the following text and extract all key facts, definitions, concepts, and important information. Output this information as a neutral, structured list of key points, written exclusively in **${language}**. Do not add any conversational text or mention the source.\n\nSOURCE TEXT:\n---\n${lessonContentForPrompt}\n---\nKEY POINTS:`;
                setKeyPoints(await callGeminiWithLimitCheck(summarizationPrompt));
            }

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
                correctAnswerText = String(q.correctAnswer);
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

    const renderStepContent = () => {
        const questionTypes = [{ id: 'multiple-choice', name: 'Multiple Choice' }, { id: 'true-false', name: 'True/False' }, { id: 'identification', name: 'Identification' }, { id: 'mixed', name: 'Mixed' }];
        switch (step) {
            case 1:
                const totalDistributed = Object.values(distribution).reduce((s, v) => s + v, 0);
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 shadow-[inset_4px_4px_8px_#bdc1c6,inset_-4px_-4px_8px_#ffffff]">
                                <ClipboardDocumentListIcon className="h-9 w-9 text-sky-500" />
                            </div>
                            <Title className="mt-4 text-2xl font-bold text-slate-800">AI Quiz Generator</Title>
                            <p className="mt-1 text-sm text-slate-500">For: <span className="font-semibold text-slate-700">{lesson?.title}</span></p>
                        </div>
                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] space-y-5">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 flex items-center mb-2"><LanguageIcon className="h-5 w-5 mr-2" />Language</label>
                                    <div className={`flex space-x-1 p-1 rounded-xl ${inputBaseStyles}`}><button onClick={() => setLanguage('English')} className={getSegmentedButtonClasses(language === 'English')}>English</button><button onClick={() => setLanguage('Filipino')} className={getSegmentedButtonClasses(language === 'Filipino')}>Filipino</button></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-700 flex items-center"><HashtagIcon className="h-5 w-5 mr-2" />Number of Items</label>
                                    <input type="number" value={itemCount} onChange={(e) => setItemCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))} className={`max-w-[100px] text-center ${inputBaseStyles} py-2.5`} />
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff]">
                                <label className="text-sm font-medium text-slate-700 flex items-center mb-2"><ListBulletIcon className="h-5 w-5 mr-2" />Question Type</label>
                                <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl ${inputBaseStyles}`}>{questionTypes.map((t) => (<button key={t.id} onClick={() => setQuizType(t.id)} className={getSegmentedButtonClasses(quizType === t.id)}>{t.name}</button>))}</div>
                            </div>
                        </div>
                        {quizType === 'mixed' && (<div className="p-5 rounded-2xl shadow-[inset_3px_3px_7px_#bdc1c6,inset_-3px_-3px_7px_#ffffff] space-y-4">
                            <h3 className="text-base font-semibold text-slate-800">Item Distribution</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {['Multiple Choice', 'True/False', 'Identification'].map(type => {
                                    const key = type.toLowerCase().replace(' ', '-');
                                    return (<div key={key}><label className="text-xs font-medium text-slate-500">{type}</label><input type="number" value={distribution[key]} onChange={(e) => handleDistributionChange(key, Math.max(0, parseInt(e.target.value, 10) || 0))} className={`w-full mt-1.5 text-center ${inputBaseStyles} py-2.5`} /></div>);
                                })}
                            </div>
                            {(totalDistributed !== itemCount) && (<p className="text-sm font-medium text-center text-amber-800 bg-amber-200 p-2.5 rounded-lg shadow-[inset_1px_1px_2px_#e6c589,inset_-1px_-1px_2px_#ffffd3]">Current total: {totalDistributed} of {itemCount}</p>)}
                        </div>)}
                    </div>
                );

            case 3:
                return (
                     <div className="flex flex-col h-full">
                        <Title className="text-2xl font-bold text-slate-800">Preview & Revise</Title>
                        <Subtitle className="mt-1 text-slate-500">Review the generated quiz below.</Subtitle>
                        <div className="mt-4 -mx-2 px-2 overflow-y-auto flex-grow space-y-4">
                            <h3 className="font-bold text-xl text-slate-800">{generatedQuiz?.title}</h3>
                            {generatedQuiz?.questions.map((q, i) => (
                                <div key={i} className="p-4 bg-slate-200 rounded-xl shadow-[4px_4px_8px_#bdc1c6,-4px_-4px_8px_#ffffff]">
                                    <p className="font-semibold text-slate-900 leading-relaxed"><span className="text-slate-500 mr-2">{i + 1}.</span><ContentRenderer text={q.text} /></p>
                                    <div className="mt-3 flex items-center space-x-2"><span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-200 shadow-[inset_1px_1px_2px_#bdc1c6,inset_-1px_-1px_2px_#ffffff] text-sky-700">{q.type}</span><span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-200 shadow-[inset_1px_1px_2px_#bdc1c6,inset_-1px_-1px_2px_#ffffff] text-purple-700">{q.difficulty}</span></div>
                                    <div className="mt-3 pl-6 text-sm">
                                        {q.type === 'multiple-choice' && q.options && (
                                            <ul className="list-disc list-outside space-y-1.5 text-slate-700">
                                                {q.options.map((option) => (
                                                    <li key={option.text} className={option.isCorrect ? 'font-semibold text-green-700' : ''}>
                                                        <ContentRenderer text={option.text} />
                                                        {option.isCorrect && <span className="text-green-500 ml-1.5">✓</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {(q.type === 'true-false' || q.type === 'identification') && (
                                            <p className="text-slate-700">
                                                Answer: <span className="font-semibold text-green-700"><ContentRenderer text={String(q.correctAnswer)}/></span>
                                            </p>
                                        )}
                                        {q.explanation && (
                                            <div className="mt-4 p-3 bg-slate-200 border-l-4 border-sky-300 text-sky-900 rounded-r-lg shadow-[inset_2px_2px_4px_#d1d9e6,inset_-2px_-2px_4px_#ffffff]">
                                                <p className="font-bold text-xs tracking-wider uppercase">Explanation</p>
                                                <p className="text-sm italic mt-1"><ContentRenderer text={q.explanation} /></p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex-shrink-0">
                            <label className="text-sm font-medium text-slate-700">Request Changes (Optional)</label>
                            <textarea placeholder="e.g., Make question 3 harder..." value={revisionPrompt} onChange={e => setRevisionPrompt(e.target.value)} className={`w-full mt-1.5 text-sm ${inputBaseStyles} p-3 min-h-[60px]`} />
                            <div className="flex justify-end pt-2">
                                <button onClick={() => handleGenerate(true)} disabled={isGenerating} className={`${btnBase} w-auto bg-slate-200 text-slate-700 ${btnExtruded} ${btnDisabled}`}><ArrowUturnLeftIcon className="h-4 w-4 mr-2" />Regenerate</button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 mb-6 shadow-[inset_5px_5px_10px_#bdc1c6,inset_-5px_-5px_10px_#ffffff]"><CheckCircleIcon className="h-12 w-12 text-green-500" /></div>
                        <Title className="text-3xl font-bold text-slate-800">Quiz Saved!</Title>
                        <p className="text-slate-600 mt-2 max-w-xs">The quiz is now available in your content library.</p>
                    </div>
                );
            default: return null;
        }
    };

    const renderButtons = () => {
        if (step === 4) return <button onClick={onClose} className={`${btnBase} bg-slate-700 hover:bg-slate-800 text-white ${btnExtruded}`}>Close</button>;
        if (step === 3) return (
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setStep(1)} className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded}`}>Back</button>
                <button onClick={handleExportPdf} className={`${btnBase} bg-slate-200 text-slate-700 ${btnExtruded}`}>Export PDF</button>
                <button onClick={handleSaveQuiz} disabled={isGenerating} className={`${btnBase} bg-sky-500 hover:bg-sky-600 text-white ${btnExtruded} ${btnDisabled}`}>Save Quiz</button>
            </div>
        );
        if (step === 1) {
            const isInvalid = quizType === 'mixed' && Object.values(distribution).reduce((s, v) => s + v, 0) !== itemCount;
            return <button onClick={() => handleGenerate(false)} disabled={isInvalid || isGenerating} className={`${btnBase} bg-sky-500 hover:bg-sky-600 text-white ${btnExtruded} disabled:bg-slate-200 ${btnDisabled}`}><SparklesIcon className="h-5 w-5 mr-2" />Generate Quiz</button>;
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="max-w-lg w-full bg-slate-200 rounded-3xl shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] flex flex-col max-h-[90vh] transition-all relative">
                    <button onClick={onClose} className={`absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 ${btnExtruded}`}><XMarkIcon className="h-6 w-6" /></button>
                    <div className="flex-1 overflow-y-auto p-8 pt-12">
                        {isGenerating ? <QuizLoadingScreen /> : renderStepContent()}
                        {error && !isGenerating && <p className="text-sm text-red-800 mt-4 text-center bg-red-200 p-3 rounded-lg shadow-[inset_1px_1px_2px_#d9b8b8,inset_-1px_-1px_2px_#ffffff]">{error}</p>}
                    </div>
                    {!isGenerating && <div className="flex-shrink-0 px-6 py-5 bg-slate-200/50 border-t border-slate-300/70">{renderButtons()}</div>}
                </DialogPanel>
            </div>
        </Dialog>
    );
}