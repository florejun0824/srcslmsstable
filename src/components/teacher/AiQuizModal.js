import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput, Select, SelectItem, NumberInput } from '@tremor/react';
import { SparklesIcon, ArrowUturnLeftIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { db } from '../../services/firebase';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { callGeminiWithLimitCheck } from '../../services/aiService';
import { useToast } from '../../contexts/ToastContext';
import Spinner from '../common/Spinner';

export default function AiQuizModal({ isOpen, onClose, unitId, subjectId, lesson }) {
    const { showToast } = useToast();

    const [step, setStep] = useState(1);
    const [itemCount, setItemCount] = useState(10);
    const [quizType, setQuizType] = useState('multiple-choice');
    const [distribution, setDistribution] = useState({ 'multiple-choice': 0, 'true-false': 0, 'identification': 0 });
    const [additionalPrompt, setAdditionalPrompt] = useState('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setItemCount(10);
            setQuizType('multiple-choice');
            setDistribution({ 'multiple-choice': 0, 'true-false': 0, 'identification': 0 });
            setAdditionalPrompt('');
            setIsGenerating(false);
            setGeneratedQuiz(null);
            setError('');
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

    const constructPrompt = () => {
        const lessonContentForPrompt = lesson?.pages?.map(page => `Page Title: ${page.title}\nPage Content: ${page.content}`).join('\n\n') || '';

        let prompt = `Generate a quiz based on the following lesson titled "${lesson?.title}".\n`;
        prompt += `LESSON CONTENT:\n---\n${lessonContentForPrompt}\n---\n\n`;
        prompt += `The quiz must have exactly ${itemCount} items.\n`;
        prompt += `Difficulty: 50% of the questions should be easy (simple recall), and 50% should be at a comprehension level (requiring understanding).\n`;

        if (quizType === 'mixed') {
            prompt += `The quiz should be a mix of types with the following distribution: ${distribution['multiple-choice']} multiple-choice, ${distribution['true-false']} true/false, and ${distribution['identification']} identification items.\n`;
        } else {
            prompt += `All questions should be of the type: ${quizType}.\n`;
        }
        
        if (step === 3 && additionalPrompt) {
            prompt += `\nPlease adjust the previous generation with the following instructions: "${additionalPrompt}".\n`;
        }
        
        // ✅ CORRECTION: The instruction for the "explanation" is now more specific and restrictive.
        prompt += `\nReturn the response as a single, valid JSON object. The object must have a "title" (string) and a "questions" (array) property. Each object in the "questions" array must have:
- A "text" property (string).
- A "type" property ('multiple-choice', 'true-false', or 'identification').
- A "difficulty" property ('easy' or 'comprehension').
- An "explanation" property (string). This explanation must be a direct and concrete clarification of why the correct answer is correct. It should not reference the lesson text itself. For example, instead of saying "As stated in the lesson...", it should say "Photosynthesis is the process plants use because...". Avoid phrases like "The lesson defines", "This reflects the lesson", or any similar meta-commentary about the source material.
- For 'multiple-choice', an "options" property (array of 4 strings) and a "correctAnswerIndex" property (number).
- For 'true-false', a "correctAnswer" property (boolean).
- For 'identification', a "correctAnswer" property (string).
Do not include any text or formatting outside of the JSON object.`;

        return prompt;
    };

    const handleGenerate = async () => {
        if (!lesson) {
            showToast("No lesson selected to generate a quiz from.", "error");
            return;
        }
        if (quizType === 'mixed') {
            const totalDistributed = Object.values(distribution).reduce((sum, val) => sum + val, 0);
            if (totalDistributed !== itemCount) {
                setError(`The distribution total (${totalDistributed}) must match the total item count (${itemCount}).`);
                return;
            }
        }
        setError('');
        setIsGenerating(true);
        setGeneratedQuiz(null);
        showToast("Generating quiz... This may take a moment.", "info");
        
        try {
            const prompt = constructPrompt();
            const aiText = await callGeminiWithLimitCheck(prompt); 
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
                        <Title>Step 3: Preview and Approve</Title>
                        <div className="mt-4 p-4 border rounded-lg max-h-60 overflow-y-auto bg-gray-50">
                            <h3 className="font-bold text-lg mb-2">{generatedQuiz?.title}</h3>
                            {generatedQuiz?.questions.map((q, i) => (
                                <div key={i} className="mb-3 text-sm">
                                    <p><strong>{i + 1}. {q.text}</strong> ({q.type})</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700">Request changes (optional)</label>
                            <TextInput placeholder="e.g., Make the questions harder..." value={additionalPrompt} onChange={e => setAdditionalPrompt(e.target.value)} />
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
                <div className="flex justify-between items-center gap-2">
                    <Button icon={ArrowUturnLeftIcon} variant="secondary" onClick={handleGenerate}>Regenerate</Button>
                    <Button icon={CheckCircleIcon} onClick={handleSaveQuiz}>Approve & Save Quiz</Button>
                </div>
            )
        }
        return (
            <div className="flex justify-between">
                <Button variant="light" onClick={() => setStep(step - 1)} disabled={step === 1}>Back</Button>
                {step === 1 && quizType !== 'mixed' ? (
                    <Button icon={SparklesIcon} onClick={handleGenerate}>Generate Quiz</Button>
                ) : step === 2 && quizType === 'mixed' ? (
                     <Button icon={SparklesIcon} onClick={handleGenerate}>Generate Quiz</Button>
                ) : (
                    <Button onClick={() => setStep(step + 1)}>Next</Button>
                )}
            </div>
        )
    };

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-2xl bg-white p-6 rounded-lg shadow-xl">
                {isGenerating && <Spinner />}
                {!isGenerating && renderStepContent()}
                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                <div className="mt-6">
                    {renderButtons()}
                </div>
            </DialogPanel>
        </Dialog>
    );
}
