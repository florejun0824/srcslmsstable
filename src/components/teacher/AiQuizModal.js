import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput, Select, SelectItem, NumberInput, Textarea } from '@tremor/react';
import { SparklesIcon, ArrowUturnLeftIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';
import ContentRenderer from './ContentRenderer';

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();

    const [step, setStep] = useState(1);
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
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
            setDistribution({ 'multiple-choice': 10, 'true-false': 0, 'identification': 0 });
            setRevisionPrompt('');
            setIsGenerating(false);
            setGeneratedQuiz(null);
            setError('');
            setKeyPoints('');
        }
    }, [isOpen]);

    const handleDistributionChange = (type, value) => {
        const newDistribution = { ...distribution, [type]: value };
        const total = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
        if (total > itemCount) {
            setError(`The total number of items cannot exceed ${itemCount}.`);
        } else {
            setError('');
        }
        setDistribution(newDistribution);
    };

    const constructPrompt = (isRevision = false) => {
        if (isRevision && generatedQuiz) {
            const quizJson = JSON.stringify(generatedQuiz, null, 2);
            return `You are a quiz editor. The user has provided a quiz in JSON format and an instruction for revision. Your task is to apply the revision and return the **complete, updated, and valid JSON object** of the quiz. Do not add any commentary outside the JSON block.
            
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
1.  **Total Items:** The quiz must have exactly ${itemCount} items.
2.  **Difficulty Levels (Bloom's Taxonomy):** You must generate questions based on these two difficulty levels, with a 50/50 split between them:
    - **easy:** Corresponds to the 'Remembering' and 'Understanding' levels. These questions test for recall of facts and basic concepts.
    - **comprehension:** Corresponds to the 'Applying' and 'Analyzing' levels. These questions require using information in new situations or drawing connections among ideas.
3.  **Question Types:**`;

        if (quizType === 'mixed') {
            prompt += ` The quiz should be a mix of types with the following distribution: ${distribution['multiple-choice']} multiple-choice, ${distribution['true-false']} true/false, and ${distribution['identification']} identification items.\n`;
        } else {
            prompt += ` All questions should be of the type: ${quizType}.\n`;
        }
        
        prompt += `
**JSON OUTPUT FORMAT:**
Return the response as a single, valid JSON object. The object must have a "title" and a "questions" array.

**For 'multiple-choice' questions, follow this CRITICAL OPTION ORDERING RULE:**
You MUST order the choices in the "options" array according to the following logic:
1.  **Alphabetical:** If the choices are single words (e.g., ["Apple", "Banana", "Cherry", "Date"]).
2.  **Pyramid Style (Shortest to Longest):** If the choices are sentences or long phrases.
3.  **Numerical Sequence:** If the choices are numbers (e.g., [10, 25, 50, 100]).
4.  **Chronological Order:** If the choices are dates (e.g., ["1990", "2001", "2015", "2023"]).

**FINAL VALIDATION STEP:** Before creating the final JSON, review every question. If a question violates the **ABSOLUTE RULE**, you MUST rewrite it.

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
                setError(`The distribution total (${totalDistributed}) must match the total item count (${itemCount}).`);
                return;
            }
        }
        setError('');
        setIsGenerating(true);
        showToast("AI is processing the lesson...", "info");

        try {
            let currentKeyPoints = keyPoints;
            if (!currentKeyPoints && !isRevision) {
                const lessonContentForPrompt = lesson.pages.map(page => `Page Title: ${page.title}\nPage Content: ${page.content}`).join('\n\n');
                const summarizationPrompt = `Read the following text and extract all key facts, definitions, concepts, and important information. Output this information as a neutral, structured list or summary of key points. Do not add any conversational text or mention the source.

                SOURCE TEXT:
                ---
                ${lessonContentForPrompt}
                ---
                KEY POINTS:`;
                
                currentKeyPoints = await callGeminiWithLimitCheck(summarizationPrompt);
                setKeyPoints(currentKeyPoints); 
            }

            showToast(isRevision ? "Regenerating quiz..." : "Key points extracted. Generating quiz...", "info");
            
            const quizGenerationPrompt = constructPrompt(isRevision);
            const aiText = await callGeminiWithLimitCheck(quizGenerationPrompt);
            const response = JSON.parse(aiText);

            if (!response || !response.title || !Array.isArray(response.questions)) {
                throw new Error("AI response was not in the expected format.");
            }

            setGeneratedQuiz(response);
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
        if (!generatedQuiz) return;
        setIsGenerating(true);
        try {
            const quizRef = doc(collection(db, 'quizzes'));
            await setDoc(quizRef, {
                ...generatedQuiz,
                unitId,
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
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <Title>Step 1: Configure Quiz</Title>
                        <p className="text-sm text-gray-600">Generating quiz for lesson: <span className="font-semibold">{lesson?.title}</span></p>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Number of Items</label>
                            <NumberInput value={itemCount} onValueChange={setItemCount} min={1} max={50} />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">Question Type</label>
                            <Select value={quizType} onValueChange={setQuizType}>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="true-false">True/False</SelectItem>
                                <SelectItem value="identification">Identification</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                            </Select>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <Title>Step 2: Distribute Items</Title>
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
                    </div>
                );
            case 3:
                return (
                    <div>
                        <Title>Step 3: Preview & Revise</Title>
                        <div className="mt-4 p-4 border rounded-lg max-h-80 overflow-y-auto bg-gray-50">
                            <h3 className="font-bold text-lg mb-2">{generatedQuiz?.title}</h3>
                            {generatedQuiz?.questions.map((q, i) => (
                                <div key={i} className="mb-4 text-sm p-3 bg-white rounded-md shadow-sm">
                                    <div className="font-semibold text-gray-800 flex items-start">
                                        <span>{i + 1}.&nbsp;</span>
                                        <ContentRenderer text={q.text} />
                                    </div>
                                    <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 ">{q.type}</span>
                                    <span className="text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">{q.difficulty}</span>

                                    <div className="mt-2 pl-4">
                                        {q.type === 'multiple-choice' && q.options && (
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {q.options.map((option, index) => (
                                                    <li key={index} className={option.isCorrect ? 'font-bold text-green-600' : ''}>
                                                        <ContentRenderer text={option.text} />
                                                        {option.isCorrect && <span className="text-green-600 ml-2">✓ Correct</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {(q.type === 'true-false' || q.type === 'identification') && (
                                            <p className="text-gray-700">
                                                Correct Answer: <span className="font-bold text-green-600"><ContentRenderer text={String(q.correctAnswer)}/></span>
                                            </p>
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
                    <div className="text-center p-4">
                        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <Title>Quiz Generated!</Title>
                        <p className="text-gray-600">The AI-generated quiz has been successfully saved.</p>
                    </div>
                )
            default:
                return null;
        }
    };

    const renderButtons = () => {
        if (step === 4) {
            return <Button onClick={onClose} className="w-full">Close</Button>;
        }
        if (isGenerating) {
            return <Button loading={true} disabled={true} className="w-full justify-center">Generating...</Button>
        }
        if (step === 3) {
            return (
                <div className="flex justify-between items-center">
                    <Button variant="light" onClick={() => setStep(1)}>Back to Config</Button>
                    <Button icon={CheckCircleIcon} onClick={handleSaveQuiz}>Looks Good, Save Quiz</Button>
                </div>
            )
        }
        return (
            <div className="flex justify-between">
                <Button variant="light" onClick={() => setStep(step - 1)} disabled={step === 1}>Back</Button>
                {step === 1 && quizType !== 'mixed' ? (
                    <Button icon={SparklesIcon} onClick={() => handleGenerate(false)}>Generate Quiz</Button>
                ) : step === 2 && quizType === 'mixed' ? (
                    <Button icon={SparklesIcon} onClick={() => handleGenerate(false)}>Generate Quiz</Button>
                ) : (
                    <Button onClick={() => setStep(step + 1)}>Next</Button>
                )}
            </div>
        )
    };

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-2xl bg-white p-6 rounded-lg shadow-xl">
                {isGenerating && step < 3 && <Spinner />}
                {!isGenerating || step >= 3 ? renderStepContent() : null}
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                <div className="mt-6">
                    {renderButtons()}
                </div>
            </DialogPanel>
        </Dialog>
    );
}