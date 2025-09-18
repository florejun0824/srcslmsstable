import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput, Textarea } from '@tremor/react';
import { Menu } from '@headlessui/react';
import { PlusIcon, TrashIcon, PencilIcon, EyeIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import ContentRenderer from '../teacher/ContentRenderer';

// Helper component for the tabs
const TabButton = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
            isActive
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-transparent text-gray-500 hover:text-gray-800'
        }`}
    >
        <Icon className="h-4 w-4" />
        {label}
    </button>
);

// Helper to format the type names for display
const formatTypeName = (type) => {
    switch (type) {
        case 'multiple-choice': return 'Multiple Choice';
        case 'true-false': return 'True/False';
        case 'identification': return 'Identification';
        default: return 'Select Type';
    }
};

export default function QuizFormModal({ isOpen, onClose, onSubmit, initialQuizData, title: modalTitle }) {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('edit');

    useEffect(() => {
        if (isOpen) {
            if (initialQuizData) {
                setTitle(initialQuizData.title || '');
                const normalizedQuestions = (initialQuizData.questions || []).map((q, qIndex) => {
                    // --- FIX: Ensure every loaded question has an explanation field ---
                    const questionWithExplanation = { ...q, explanation: q.explanation || '' };

                    if (q.type === 'multiple-choice' && q.options) {
                        const correctIdx = q.correctAnswerIndex ?? 0;
                        const normalizedOptions = q.options.map((opt, oIndex) => {
                            if (typeof opt === 'string') {
                                return { text: opt, isCorrect: oIndex === correctIdx };
                            }
                            return { text: opt.text || '', isCorrect: opt.isCorrect || false };
                        });
                        const finalOptions = normalizedOptions.map((opt, oIndex) => ({
                            ...opt,
                            isCorrect: oIndex === correctIdx
                        }));
                        return { ...questionWithExplanation, options: finalOptions, correctAnswerIndex: correctIdx };
                    }
                    return questionWithExplanation;
                });
                setQuestions(normalizedQuestions.length > 0 ? normalizedQuestions : [{ type: 'multiple-choice', text: '', options: [{text: '', isCorrect: true}, {text: '', isCorrect: false}], correctAnswerIndex: 0, explanation: '' }]);
            } else {
                setTitle('');
                // --- FIX: Ensure a new question starts with an explanation field ---
                setQuestions([{ type: 'multiple-choice', text: '', options: [{text: '', isCorrect: true}, {text: '', isCorrect: false}], correctAnswerIndex: 0, explanation: '' }]);
            }
            setActiveTab('edit');
        }
    }, [initialQuizData, isOpen]);

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = questions.map((q, i) => {
            if (i !== index) return q;

            const newQuestion = { ...q, [field]: value };
            if (field === 'type') {
                delete newQuestion.options;
                delete newQuestion.correctAnswerIndex;
                delete newQuestion.correctAnswer;
                if (value === 'multiple-choice') {
                    newQuestion.options = [{text: '', isCorrect: true}, {text: '', isCorrect: false}];
                    newQuestion.correctAnswerIndex = 0;
                } else if (value === 'true-false') {
                    newQuestion.correctAnswer = true;
                } else if (value === 'identification') {
                    newQuestion.correctAnswer = '';
                }
            }
            return newQuestion;
        });
        setQuestions(updatedQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, newText) => {
        const updatedQuestions = questions.map((q, i) => {
            if (i !== qIndex) return q;
            const updatedOptions = q.options.map((opt, j) => {
                if (j !== oIndex) return opt;
                return { ...opt, text: newText };
            });
            return { ...q, options: updatedOptions };
        });
        setQuestions(updatedQuestions);
    };

    const handleCorrectAnswerChange = (qIndex, newCorrectIndex) => {
        const updatedQuestions = questions.map((q, i) => {
            if (i !== qIndex) return q;
            const updatedOptions = q.options.map((opt, j) => ({
                ...opt,
                isCorrect: j === newCorrectIndex
            }));
            return { ...q, options: updatedOptions, correctAnswerIndex: newCorrectIndex };
        });
        setQuestions(updatedQuestions);
    };

    const addQuestion = () => {
        // --- FIX: Ensure a newly added question has an explanation field ---
        setQuestions([...questions, { type: 'multiple-choice', text: '', options: [{text: '', isCorrect: true}, {text: '', isCorrect: false}], correctAnswerIndex: 0, explanation: '' }]);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const addOption = (qIndex) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIndex].options.push({text: '', isCorrect: false});
        setQuestions(updatedQuestions);
    };

    const removeOption = (qIndex, oIndex) => {
        const updatedQuestions = [...questions];
        const questionToUpdate = updatedQuestions[qIndex];
        questionToUpdate.options = questionToUpdate.options.filter((_, i) => i !== oIndex);
        
        if (questionToUpdate.correctAnswerIndex === oIndex) {
            questionToUpdate.correctAnswerIndex = 0;
        } else if (questionToUpdate.correctAnswerIndex > oIndex) {
            questionToUpdate.correctAnswerIndex -= 1;
        }

        questionToUpdate.options = questionToUpdate.options.map((opt, i) => ({
            ...opt,
            isCorrect: i === questionToUpdate.correctAnswerIndex
        }));

        setQuestions(updatedQuestions);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const finalQuestions = questions.map(q => {
            // --- FIX: Ensure explanation is part of the final object being saved ---
            const finalQuestion = { ...q, explanation: q.explanation || '' };
            if (q.type === 'multiple-choice') {
                const updatedOptions = q.options.map((opt, index) => ({
                    text: opt.text, // only include text and isCorrect
                    isCorrect: index === q.correctAnswerIndex
                }));
                return { ...finalQuestion, options: updatedOptions };
            }
            return finalQuestion;
        });
        await onSubmit({ title, questions: finalQuestions });
        setIsSaving(false);
    };

    const renderEditPane = (question, index) => (
        <div className="space-y-4 bg-white p-4 rounded-b-lg border-x border-b">
            <div>
                <label className="text-xs font-semibold text-gray-500">QUESTION</label>
                <Textarea placeholder="Enter question text..." value={question.text || ''} onChange={(e) => handleQuestionChange(index, 'text', e.target.value)} rows={3}/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <Menu as="div" className="relative inline-block text-left w-full">
                    <div>
                        <Menu.Button className="inline-flex w-full justify-between items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            {formatTypeName(question.type)}
                            <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                        </Menu.Button>
                    </div>
                    <Menu.Items className="absolute right-0 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="py-1">
                            <Menu.Item>{({ active }) => ( <a href="#" onClick={() => handleQuestionChange(index, 'type', 'multiple-choice')} className={`${ active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700`}> Multiple Choice </a> )}</Menu.Item>
                            <Menu.Item>{({ active }) => ( <a href="#" onClick={() => handleQuestionChange(index, 'type', 'true-false')} className={`${ active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700`}> True/False </a> )}</Menu.Item>
                            <Menu.Item>{({ active }) => ( <a href="#" onClick={() => handleQuestionChange(index, 'type', 'identification')} className={`${ active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700`}> Identification </a> )}</Menu.Item>
                        </div>
                    </Menu.Items>
                </Menu>
            </div>
            {renderAnswerFields(question, index)}
            {/* --- FIX: Added the Textarea for the explanation field --- */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                <Textarea placeholder="Explain why the answer is correct..." value={question.explanation || ''} onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)} rows={3}/>
            </div>
        </div>
    );
    
    // --- The rest of the file (renderPreviewPane, renderAnswerFields, etc.) remains unchanged ---
    const renderPreviewPane = (question, index) => (
        <div className="prose max-w-none prose-sm bg-white p-4 rounded-b-lg border-x border-b">
            <ContentRenderer text={question.text} />
            {question.type === 'multiple-choice' && (
                <ul className="list-none pl-0 mt-4 space-y-2">
                    {question.options.map((option, oIndex) => (
                        <li key={oIndex} className={`flex items-start gap-3 p-2 rounded-md ${option.isCorrect ? 'bg-green-50 border border-green-200' : ''}`}>
                            <input type="radio" checked={option.isCorrect} readOnly className="mt-1"/>
                            <ContentRenderer text={option.text} />
                        </li>
                    ))}
                </ul>
            )}
            {question.type === 'true-false' && (
                <p>Correct Answer: <strong>{String(question.correctAnswer)}</strong></p>
            )}
            {question.type === 'identification' && (
                <p>Correct Answer: <strong>{question.correctAnswer}</strong></p>
            )}
            <div className="mt-4 p-2 bg-slate-100 rounded">
                <h4 className="text-xs font-bold">Explanation</h4>
                <ContentRenderer text={question.explanation}/>
            </div>
        </div>
    );

    const renderAnswerFields = (question, qIndex) => {
        if (question.type === 'true-false') {
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                    <div className="flex gap-4">
                        <label className="flex items-center"><input type="radio" name={`correctAnswer-${qIndex}`} checked={question.correctAnswer === true} onChange={() => handleQuestionChange(qIndex, 'correctAnswer', true)} className="mr-2"/> True</label>
                        <label className="flex items-center"><input type="radio" name={`correctAnswer-${qIndex}`} checked={question.correctAnswer === false} onChange={() => handleQuestionChange(qIndex, 'correctAnswer', false)} className="mr-2"/> False</label>
                    </div>
                </div>
            );
        }
        if (question.type === 'identification') {
            return (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                    <TextInput value={question.correctAnswer || ''} onChange={(e) => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)} />
                </div>
            );
        }
        if (question.type === 'multiple-choice') {
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Options</label>
                    {question.options?.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                            <input type="radio" name={`correctAnswer-${qIndex}`} checked={option.isCorrect} onChange={() => handleCorrectAnswerChange(qIndex, oIndex)} />
                            <TextInput placeholder={`Option ${oIndex + 1}`} value={option.text || ''} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} />
                            <Button size="xs" variant="light" icon={TrashIcon} color="red" onClick={() => removeOption(qIndex, oIndex)} disabled={question.options.length <= 2} />
                        </div>
                    ))}
                    <Button size="xs" variant="light" icon={PlusIcon} onClick={() => addOption(qIndex)}>Add Option</Button>
                </div>
            );
        }
        return null;
    }
    
    return (
        <Dialog open={isOpen} onClose={onClose} static={true} >
            <DialogPanel className="max-w-4xl bg-slate-50 p-6 rounded-lg shadow-xl">
                <Title className="mb-4">{modalTitle}</Title>
                <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1 modern-scrollbar">
                    <div>
                        <label htmlFor="quizTitle" className="text-sm font-medium text-gray-700">Quiz Title</label>
                        <TextInput id="quizTitle" placeholder="Enter quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="sticky top-0 bg-slate-50 py-2 z-20 flex justify-center gap-2 border-b">
                        <TabButton label="Edit" icon={PencilIcon} isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                        <TabButton label="Preview" icon={EyeIcon} isActive={activeTab === 'preview'} onClick={() => setActiveTab('preview')} />
                    </div>
                    {questions.map((question, index) => (
                        <div key={index} className="bg-slate-100 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center p-2 bg-slate-200 rounded-t-lg border">
                                <p className="font-semibold text-gray-800">Question {index + 1}</p>
                                <Button size="xs" variant="light" icon={TrashIcon} color="red" onClick={() => removeQuestion(index)} />
                            </div>
                            {activeTab === 'edit' ? renderEditPane(question, index) : renderPreviewPane(question, index)}
                        </div>
                    ))}
                    <Button icon={PlusIcon} variant="light" onClick={addQuestion} className="w-full justify-center">Add Question</Button>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} loading={isSaving}>{isSaving ? 'Saving...' : 'Save Quiz'}</Button>
                </div>
            </DialogPanel>
        </Dialog>
    );
}