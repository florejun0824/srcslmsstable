import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, NumberInput, Textarea, Subtitle } from '@tremor/react';
import { SparklesIcon, ArrowUturnLeftIcon, CheckCircleIcon, LanguageIcon, ListBulletIcon, HashtagIcon, ClipboardDocumentListIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <-- FIX: Changed import
import QuizLoadingScreen from './QuizLoadingScreen';
import ContentRenderer from './ContentRenderer';

// Helper for futuristic segmented control buttons
const getSegmentedButtonClasses = (isActive) => {
    const baseClasses = "flex-1 rounded-xl py-2.5 px-3 text-sm font-semibold transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black/10";
    if (isActive) {
        return `${baseClasses} bg-white/90 text-blue-600 shadow-lg scale-105`;
    }
    return `${baseClasses} bg-transparent text-gray-700 hover:bg-white/50`;
};


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
            setStep(1);
            setItemCount(10);
            setQuizType('multiple-choice');
            setLanguage('English');
            setDistribution({ 'multiple-choice': 10, 'true-false': 0, 'identification': 0 });
            setRevisionPrompt('');
            setIsGenerating(false);
            setGeneratedQuiz(null);
            setError('');
            setKeyPoints('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (quizType !== 'mixed') {
            const newDistribution = { 'multiple-choice': 0, 'true-false': 0, 'identification': 0 };
            newDistribution[quizType] = itemCount;
            setDistribution(newDistribution);
        } else {
            setDistribution({ 'multiple-choice': itemCount, 'true-false': 0, 'identification': 0 });
        }
    }, [itemCount, quizType]);


    const handleDistributionChange = (type, value) => {
        const newDistribution = { ...distribution, [type]: value };
        const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
        if (total > itemCount) {
            setError(`The total number of items (${total}) cannot exceed ${itemCount}.`);
        } else {
            setError('');
        }
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

        // FIX: Changed function call
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
        
        // FIX: Changed function call
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
        const questionTypes = [
            { id: 'multiple-choice', name: 'Multiple Choice' },
            { id: 'true-false', name: 'True/False' },
            { id: 'identification', name: 'Identification' },
            { id: 'mixed', name: 'Mixed' },
        ];

        switch (step) {
            case 1:
                const totalDistributed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
                return (
                    <div className="space-y-8">
                        <div className="text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-lg">
                                <ClipboardDocumentListIcon className="h-9 w-9 text-blue-500" aria-hidden="true" />
                            </div>
                            <Title className="mt-5 text-3xl font-bold text-gray-900">AI Quiz Generator</Title>
                            <p className="mt-2 text-base text-gray-600">
                                For: <span className="font-semibold text-gray-800">{lesson?.title}</span>
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            {/* --- Settings Groups --- */}
                            <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg p-5 space-y-5">
                               <div>
                                    <label className="text-sm font-medium text-gray-600 flex items-center mb-3">
                                        <LanguageIcon className="h-5 w-5 mr-2" /> Language
                                    </label>
                                    <div className="flex space-x-2 bg-black/5 p-1 rounded-xl">
                                        <button type="button" onClick={() => setLanguage('English')} className={getSegmentedButtonClasses(language === 'English')}>English</button>
                                        <button type="button" onClick={() => setLanguage('Filipino')} className={getSegmentedButtonClasses(language === 'Filipino')}>Filipino</button>
                                    </div>
                               </div>
                               <div className="flex items-center justify-between">
                                    <label htmlFor="item-count" className="text-sm font-medium text-gray-600 flex items-center">
                                        <HashtagIcon className="h-5 w-5 mr-2" /> Number of Items
                                    </label>
                                    <NumberInput id="item-count" value={itemCount} onValueChange={setItemCount} min={1} max={50} className="max-w-[100px]" />
                               </div>
                            </div>
                            <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg p-5">
                                <label className="text-sm font-medium text-gray-600 flex items-center mb-3">
                                    <ListBulletIcon className="h-5 w-5 mr-2" /> Question Type
                                </label>
                                <div className="grid grid-cols-2 gap-2 bg-black/5 p-1 rounded-xl">
                                    {questionTypes.map((type) => (
                                        <button key={type.id} type="button" onClick={() => setQuizType(type.id)} className={getSegmentedButtonClasses(quizType === type.id)}>
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {quizType === 'mixed' && (
                             <div className="bg-white/50 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg p-5 space-y-4">
                                <h3 className="text-base font-semibold text-gray-800">Item Distribution</h3>
                                <p className="text-sm text-gray-600">Total must equal {itemCount}.</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Multiple Choice', 'True/False', 'Identification'].map(type => {
                                        const typeKey = type.toLowerCase().replace(' ', '-');
                                        return (
                                            <div key={typeKey}>
                                                <label className="text-xs font-medium text-gray-500">{type}</label>
                                                <NumberInput value={distribution[typeKey]} onValueChange={v => handleDistributionChange(typeKey, v)} min={0} className="mt-1.5"/>
                                            </div>
                                        );
                                    })}
                                </div>
                                {(totalDistributed !== itemCount) && (
                                    <p className="text-sm font-medium text-center text-amber-800 bg-amber-300/50 p-2.5 rounded-lg">Current total: {totalDistributed} of {itemCount}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
                
            case 3:
                return (
                    <div className="flex flex-col h-full">
                        <Title className="text-3xl font-bold">Preview & Revise</Title>
                        <Subtitle className="mt-1">Review the generated quiz below.</Subtitle>
                        <div className="mt-4 p-2 -mx-4 overflow-y-auto flex-grow">
                             <h3 className="font-bold text-xl mb-3 text-gray-800 px-2">{generatedQuiz?.title}</h3>
                             <div className="space-y-3">
                                {generatedQuiz?.questions.map((q, i) => (
                                    <div key={i} className="text-sm p-4 bg-white/60 backdrop-blur-lg rounded-xl border border-white/30 shadow-md">
                                        <div className="font-semibold text-gray-900 flex items-start">
                                            <span className="mr-2.5 text-gray-500">{i + 1}.</span>
                                            <ContentRenderer text={q.text} />
                                        </div>
                                        <div className="mt-3 flex items-center space-x-2">
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-800">{q.type}</span>
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-800">{q.difficulty}</span>
                                        </div>
                                        
                                        <div className="mt-4 pl-6">
                                            {q.type === 'multiple-choice' && q.options && (
                                                <ul className="list-disc list-outside space-y-1.5 text-gray-700">
                                                    {q.options.map((option) => (
                                                        <li key={option.text} className={option.isCorrect ? 'font-semibold text-green-700' : ''}>
                                                            <ContentRenderer text={option.text} />
                                                            {option.isCorrect && <span className="text-green-500 ml-1.5">✓</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {(q.type === 'true-false' || q.type === 'identification') && (
                                                <p className="text-gray-700">
                                                    Answer: <span className="font-semibold text-green-700"><ContentRenderer text={String(q.correctAnswer)}/></span>
                                                </p>
                                            )}
                                            {q.explanation && (
                                                <div className="mt-4 p-3 bg-sky-500/10 border-l-4 border-sky-300 text-sky-900 rounded-r-lg">
                                                    <p className="font-bold text-xs tracking-wider uppercase">Explanation</p>
                                                    <p className="text-sm italic mt-1"><ContentRenderer text={q.explanation} /></p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                        <div className="mt-6 space-y-2 flex-shrink-0">
                            <label className="text-sm font-medium text-gray-700">Request Changes (Optional)</label>
                            <Textarea placeholder="e.g., Make question 3 harder..." value={revisionPrompt} onChange={e => setRevisionPrompt(e.target.value)} />
                            <div className="flex justify-end pt-1">
                                <Button icon={ArrowUturnLeftIcon} variant="light" onClick={() => handleGenerate(true)} disabled={isGenerating}>
                                    Regenerate
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                        <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto mb-6" />
                        <Title className="text-3xl font-bold">Quiz Saved!</Title>
                        <p className="text-gray-600 mt-2 max-w-xs">The quiz is now available in your content library.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderButtons = () => {
        const baseButtonClasses = "w-full h-14 text-base font-semibold border-none rounded-2xl transition-transform duration-200 ease-in-out hover:scale-[1.03] active:scale-[0.98]";
        
        if (step === 4) {
            return <Button onClick={onClose} className={`${baseButtonClasses} bg-gray-800 hover:bg-gray-900 text-white`}>Close</Button>;
        }
        if (step === 3) {
            return (
                <div className="grid grid-cols-3 gap-3">
                    <Button variant="secondary" onClick={() => setStep(1)} className="h-14 text-base rounded-2xl">Back</Button>
                    <Button icon={DocumentArrowDownIcon} variant="light" onClick={handleExportPdf} className="h-14 text-base rounded-2xl">Export PDF</Button>
                    <Button icon={CheckCircleIcon} onClick={handleSaveQuiz} disabled={isGenerating} className="h-14 text-base rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white">Save Quiz</Button>
                </div>
            );
        }
        if (step === 1) {
            const totalDistributed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            const isConfigInvalid = quizType === 'mixed' && totalDistributed !== itemCount;
            return (
                <Button 
                    icon={SparklesIcon} 
                    onClick={() => handleGenerate(false)} 
                    loading={isGenerating}
                    disabled={isConfigInvalid}
                    className={`${baseButtonClasses} bg-gradient-to-r from-blue-500 to-indigo-600 text-white focus-visible:ring-indigo-400 disabled:bg-gray-300 disabled:bg-none`}
                >
                    Generate Quiz
                </Button>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <>
            <style>
                {`.tremor-dropdown-menu { z-index: 9999 !important; }`}
            </style>
            <Dialog open={isOpen} onClose={onClose} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                    <DialogPanel className="max-w-lg w-full bg-gray-200/50 backdrop-blur-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] transition-all border border-white/20 relative"> {/* Added relative positioning */}
                        
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/60 backdrop-blur-md text-gray-700 hover:bg-white/90 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100"
                        >
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                            <span className="sr-only">Close</span>
                        </button>

                        <div className="flex-1 overflow-y-auto p-6">
                            {isGenerating ? (
                                <QuizLoadingScreen />
                            ) : (
                                renderStepContent()
                            )}
                            {error && !isGenerating && (
                                <p className="text-sm text-red-800 mt-4 text-center bg-red-300/50 p-3 rounded-lg">{error}</p>
                            )}
                        </div>
                        {!isGenerating && (
                            <div className="flex-shrink-0 px-6 py-5 bg-black/5">
                                {renderButtons()}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}