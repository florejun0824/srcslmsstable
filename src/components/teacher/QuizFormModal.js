import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput, Select, SelectItem, Textarea } from '@tremor/react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';

// This component is a reusable form for both creating and editing quizzes.
export default function QuizFormModal({ isOpen, onClose, onSubmit, initialQuizData, title: modalTitle }) {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Populate form if we are editing an existing quiz
        if (initialQuizData) {
            setTitle(initialQuizData.title || '');
            // Ensure questions array exists and has a default structure if empty
            setQuestions(initialQuizData.questions || [{ type: 'multiple-choice', text: '', options: ['', ''], correctAnswerIndex: 0, explanation: '' }]);
        } else {
            // Reset form for a new quiz
            setTitle('');
            setQuestions([{ type: 'multiple-choice', text: '', options: ['', ''], correctAnswerIndex: 0, explanation: '' }]);
        }
    }, [initialQuizData, isOpen]);

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...questions];
        const currentQuestion = { ...updatedQuestions[index] };
        currentQuestion[field] = value;

        // When changing question type, reset the answer fields to prevent data mismatch
        if (field === 'type') {
            delete currentQuestion.options;
            delete currentQuestion.correctAnswerIndex;
            delete currentQuestion.correctAnswer;
            
            if (value === 'multiple-choice') {
                currentQuestion.options = ['', ''];
                currentQuestion.correctAnswerIndex = 0;
            } else if (value === 'true-false') {
                currentQuestion.correctAnswer = true; // Default to true
            } else if (value === 'identification') {
                currentQuestion.correctAnswer = '';
            }
        }
        updatedQuestions[index] = currentQuestion;
        setQuestions(updatedQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].options[oIndex] = value;
        setQuestions(updatedQuestions);
    };
    
    const addQuestion = () => {
        setQuestions([...questions, { type: 'multiple-choice', text: '', options: ['', ''], correctAnswerIndex: 0, explanation: '' }]);
    };

    const removeQuestion = (index) => {
        const updatedQuestions = questions.filter((_, i) => i !== index);
        setQuestions(updatedQuestions);
    };

    const addOption = (qIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].options.push('');
        setQuestions(updatedQuestions);
    };

    const removeOption = (qIndex, oIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].options = updatedQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        setQuestions(updatedQuestions);
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        // Basic validation can be added here if needed
        const quizData = { title, questions };
        await onSubmit(quizData); // Use the onSubmit prop passed from the parent
        setIsSaving(false);
    };

    // Renders the correct input for the answer based on question type
    const renderAnswerFields = (question, qIndex) => {
        switch (question.type) {
            case 'multiple-choice':
                return (
                    <div className="pl-4 mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                        {question.options?.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2 mb-2">
                                <input
                                    type="radio"
                                    name={`correctAnswer-${qIndex}`}
                                    checked={question.correctAnswerIndex === oIndex}
                                    onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                <TextInput
                                    placeholder={`Option ${oIndex + 1}`}
                                    value={option}
                                    onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                    className="flex-grow"
                                />
                                <Button
                                    size="xs"
                                    variant="light"
                                    icon={TrashIcon}
                                    color="red"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    disabled={question.options.length <= 2}
                                />
                            </div>
                        ))}
                        <Button size="xs" variant="light" icon={PlusIcon} onClick={() => addOption(qIndex)}>
                            Add Option
                        </Button>
                    </div>
                );
            case 'true-false':
                return (
                    <div className="mt-2">
                         <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                        <Select
                            value={String(question.correctAnswer)}
                            onValueChange={(value) => handleQuestionChange(qIndex, 'correctAnswer', value === 'true')}
                        >
                            <SelectItem value="true">True</SelectItem>
                            <SelectItem value="false">False</SelectItem>
                        </Select>
                    </div>
                );
            case 'identification':
                 return (
                    <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer (Exact Match)</label>
                        <TextInput
                            placeholder="Enter the exact answer"
                            value={question.correctAnswer || ''}
                            onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} static={true}>
            <DialogPanel className="max-w-3xl bg-white p-6 rounded-lg shadow-xl">
                <Title className="mb-4">{modalTitle}</Title>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                    <div>
                        <label htmlFor="quizTitle" className="text-sm font-medium text-gray-700">Quiz Title</label>
                        <TextInput id="quizTitle" placeholder="Enter quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>

                    {questions.map((question, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-gray-800">Question {index + 1}</p>
                                <Button size="xs" variant="light" icon={TrashIcon} color="red" onClick={() => removeQuestion(index)} />
                            </div>
                            <Textarea
                                placeholder="Enter question text"
                                value={question.text || ''}
                                onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                            />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                                <Select value={question.type} onValueChange={(value) => handleQuestionChange(index, 'type', value)}>
                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true-false">True/False</SelectItem>
                                    <SelectItem value="identification">Identification</SelectItem>
                                </Select>
                            </div>
                            {renderAnswerFields(question, index)}
                             <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                                <Textarea
                                    placeholder="Explain why the answer is correct"
                                    value={question.explanation || ''}
                                    onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                     <Button icon={PlusIcon} variant="light" onClick={addQuestion} className="w-full justify-center">
                        Add Question
                    </Button>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} loading={isSaving}>{isSaving ? 'Saving...' : 'Save Quiz'}</Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}
