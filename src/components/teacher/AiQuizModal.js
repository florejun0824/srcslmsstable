import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, NumberInput, Textarea, Subtitle } from '@tremor/react';
import { SparklesIcon, ArrowUturnLeftIcon, CheckCircleIcon, LanguageIcon, ListBulletIcon, HashtagIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import QuizLoadingScreen from './QuizLoadingScreen';
import ContentRenderer from './ContentRenderer';

// Helper for dynamic button classes
const getButtonClasses = (isActive) => {
    const baseClasses = "flex-1 rounded-md p-2 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";
    if (isActive) {
        return `${baseClasses} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700`;
    }
    return `${baseClasses} bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50`;
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
4.  **Question Types:**`;

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
- For **true-false**: "correctAnswer": boolean
- For **identification**: "correctAnswer": string
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
                // ✨ FIX: Prioritize the unitId from the lesson object for reliability.
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
    
    const renderStepContent = () => {
        const questionTypes = [
            { id: 'multiple-choice', name: 'Multiple Choice' },
            { id: 'true-false', name: 'True/False' },
            { id: 'identification', name: 'Identification' },
            { id: 'mixed', name: 'Mixed Types' },
        ];

        switch (step) {
            case 1:
                const totalDistributed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                                <ClipboardDocumentListIcon className="h-7 w-7 text-indigo-600" aria-hidden="true" />
                            </div>
                            <Title className="mt-4">AI Quiz Generator</Title>
                            <Subtitle>Customize the quiz for: <span className="font-semibold text-gray-700">{lesson?.title}</span></Subtitle>
                        </div>
                        <div className="space-y-5 rounded-lg bg-slate-50 p-4 border">
                            <div>
                                <label className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                                    <LanguageIcon className="h-5 w-5 mr-2 text-indigo-600" /> Language
                                </label>
                                <div className="flex space-x-2">
                                    <button type="button" onClick={() => setLanguage('English')} className={getButtonClasses(language === 'English')}>English</button>
                                    <button type="button" onClick={() => setLanguage('Filipino')} className={getButtonClasses(language === 'Filipino')}>Filipino</button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="item-count" className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                                    <HashtagIcon className="h-5 w-5 mr-2 text-indigo-600" /> Number of Items
                                </label>
                                <NumberInput id="item-count" value={itemCount} onValueChange={setItemCount} min={1} max={50} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-900 flex items-center mb-2">
                                    <ListBulletIcon className="h-5 w-5 mr-2 text-indigo-600" /> Question Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {questionTypes.map((type) => (
                                        <button key={type.id} type="button" onClick={() => setQuizType(type.id)} className={getButtonClasses(quizType === type.id)}>
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {quizType === 'mixed' && (
                            <div className="space-y-4 pt-5 border-t border-dashed">
                                <h3 className="text-base font-semibold text-gray-800">Item Distribution</h3>
                                <p className="text-sm text-gray-600">Assign the number of items for each type. The total must be {itemCount}.</p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Multiple Choice</label>
                                        <NumberInput value={distribution['multiple-choice']} onValueChange={v => handleDistributionChange('multiple-choice', v)} min={0} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">True/False</label>
                                        <NumberInput value={distribution['true-false']} onValueChange={v => handleDistributionChange('true-false', v)} min={0} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Identification</label>
                                        <NumberInput value={distribution['identification']} onValueChange={v => handleDistributionChange('identification', v)} min={0} />
                                    </div>
                                </div>
                                {(totalDistributed !== itemCount) && (
                                    <p className="text-sm font-medium text-center text-amber-700 bg-amber-100 p-2 rounded-md">Current total: {totalDistributed} of {itemCount}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
                
            case 3:
                return (
                    <div className="flex flex-col h-full">
                        <Title>Step 3: Preview & Revise</Title>
                        <Subtitle>Review the generated quiz and request changes if needed.</Subtitle>
                        <div className="mt-4 p-4 border rounded-lg overflow-y-auto flex-grow bg-gray-50">
                            <h3 className="font-bold text-lg mb-2 text-gray-800">{generatedQuiz?.title}</h3>
                            {generatedQuiz?.questions.map((q, i) => (
                                <div key={i} className="mb-4 text-sm p-3 bg-white rounded-md shadow-sm">
                                    <div className="font-semibold text-gray-800 flex items-start">
                                        <span className="mr-2">{i + 1}.</span>
                                        <ContentRenderer text={q.text} />
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">{q.type}</span>
                                        <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">{q.difficulty}</span>
                                    </div>
                                    
                                    <div className="mt-3 pl-4">
                                        {q.type === 'multiple-choice' && q.options && (
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {q.options.map((option, index) => (
                                                    <li key={index} className={option.isCorrect ? 'font-bold text-green-600' : ''}>
                                                        <ContentRenderer text={option.text} />
                                                        {option.isCorrect && <span className="text-green-500 ml-2">✓</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {(q.type === 'true-false' || q.type === 'identification') && (
                                            <p className="text-gray-700 mt-2">
                                                Correct Answer: <span className="font-bold text-green-600"><ContentRenderer text={String(q.correctAnswer)}/></span>
                                            </p>
                                        )}
                                        {q.explanation && (
                                            <div className="mt-3 p-2 bg-sky-50 border-l-4 border-sky-200 text-sky-900">
                                                <p className="font-bold text-xs">EXPLANATION</p>
                                                <p className="text-sm italic"><ContentRenderer text={q.explanation} /></p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 space-y-2">
                            <label className="text-sm font-medium text-gray-700">Request Changes (Optional)</label>
                            <Textarea placeholder="e.g., Make the questions harder, focus more on X topic..." value={revisionPrompt} onChange={e => setRevisionPrompt(e.target.value)} />
                            <div className="flex justify-end">
                                <Button icon={ArrowUturnLeftIcon} variant="secondary" onClick={() => handleGenerate(true)} disabled={isGenerating}>
                                    Regenerate with Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="text-center p-8">
                        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <Title className="text-xl">Quiz Saved!</Title>
                        <p className="text-gray-600 mt-2">The AI-generated quiz has been successfully saved to your library.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderButtons = () => {
        if (step === 4) {
            return <Button onClick={onClose} className="w-full bg-slate-600 hover:bg-slate-700 border-none">Close</Button>;
        }
        if (step === 3) {
            return (
                <div className="flex justify-between items-center">
                    <Button variant="light" onClick={() => setStep(1)}>Back to Config</Button>
                    <Button icon={CheckCircleIcon} onClick={handleSaveQuiz} disabled={isGenerating}>Looks Good, Save Quiz</Button>
                </div>
            );
        }
        if (step === 1) {
            return (
                <Button 
                    icon={SparklesIcon} 
                    onClick={() => handleGenerate(false)} 
                    loading={isGenerating}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 border-none text-white focus:ring-indigo-500"
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                    <DialogPanel className="max-w-md w-full bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] transition-all">
                        <div className="flex-1 overflow-y-auto p-6">
                            {isGenerating ? (
                                <QuizLoadingScreen />
                            ) : (
                                renderStepContent()
                            )}
                            {error && !isGenerating && (
                                <p className="text-sm text-red-500 mt-4 text-center">{error}</p>
                            )}
                        </div>
                        {!isGenerating && (
                            <div className="flex-shrink-0 px-6 py-4 border-t">
                                {renderButtons()}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
