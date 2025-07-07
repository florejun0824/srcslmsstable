import React, { useState, useEffect } from 'react';
import { Dialog, DialogPanel, Title, Button, TextInput, Textarea } from '@tremor/react';
// --- NEW: Import Menu from Headless UI and a new icon ---
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

    // ... (useEffect and all handler functions remain the same) ...
     useEffect(() => {
        if (isOpen) {
            if (initialQuizData) {
                setTitle(initialQuizData.title || '');
                setQuestions(initialQuizData.questions || [{ type: 'multiple-choice', text: '', options: ['', ''], correctAnswerIndex: 0, explanation: '' }]);
            } else {
                setTitle('');
                setQuestions([{ type: 'multiple-choice', text: '', options: ['', ''], correctAnswerIndex: 0, explanation: '' }]);
            }
            setActiveTab('edit');
        }
    }, [initialQuizData, isOpen]);
     const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...questions];
        const currentQuestion = { ...updatedQuestions[index] };
        currentQuestion[field] = value;
        if (field === 'type') {
            delete currentQuestion.options;
            delete currentQuestion.correctAnswerIndex;
            delete currentQuestion.correctAnswer;
            if (value === 'multiple-choice') {
                currentQuestion.options = ['', ''];
                currentQuestion.correctAnswerIndex = 0;
            } else if (value === 'true-false') {
                currentQuestion.correctAnswer = true;
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
        setQuestions(questions.filter((_, i) => i !== index));
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
        await onSubmit({ title, questions });
        setIsSaving(false);
    };

    const renderEditPane = (question, index) => (
      <div className="space-y-4 bg-white p-4 rounded-b-lg border-x border-b">
            <div>
                <label className="text-xs font-semibold text-gray-500">QUESTION SOURCE</label>
                <Textarea placeholder="Enter question text..." value={question.text || ''} onChange={(e) => handleQuestionChange(index, 'text', e.target.value)} rows={6} className="font-mono text-sm"/>
            </div>
            {/* --- UPDATED: Replaced Tremor Select with Headless UI Menu --- */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <Menu as="div" className="relative inline-block text-left w-full">
                    <div>
                        <Menu.Button className="inline-flex w-full justify-between items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                            {formatTypeName(question.type)}
                            <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                        </Menu.Button>
                    </div>
                    <Menu.Items className="absolute right-0 mt-2 w-full origin-top-right rounded-md bg-gradient-to-br from-blue-50 to-indigo-100 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="py-1">
                            <Menu.Item>
                                {({ active }) => ( <a href="#" onClick={() => handleQuestionChange(index, 'type', 'multiple-choice')} className={`${ active ? 'bg-indigo-200 text-indigo-900' : 'text-gray-700'} block px-4 py-2 text-sm`}> Multiple Choice </a> )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => ( <a href="#" onClick={() => handleQuestionChange(index, 'type', 'true-false')} className={`${ active ? 'bg-indigo-200 text-indigo-900' : 'text-gray-700'} block px-4 py-2 text-sm`}> True/False </a> )}
                            </Menu.Item>
                             <Menu.Item>
                                {({ active }) => ( <a href="#" onClick={() => handleQuestionChange(index, 'type', 'identification')} className={`${ active ? 'bg-indigo-200 text-indigo-900' : 'text-gray-700'} block px-4 py-2 text-sm`}> Identification </a> )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Menu>
            </div>
            {renderAnswerFields(question, index)}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation</label>
                <Textarea placeholder="Explain why the answer is correct..." value={question.explanation || ''} onChange={(e) => handleQuestionChange(index, 'explanation', e.target.value)} rows={3}/>
            </div>
        </div>
    );
    
    // ... (renderPreviewPane and renderAnswerFields functions remain the same) ...
     const renderPreviewPane = (question, index) => (
      <div className="prose max-w-none prose-sm bg-white p-4 rounded-b-lg border-x border-b">
            <ContentRenderer text={question.text} />
             {question.type === 'multiple-choice' && (
                <ul className="list-none pl-0 mt-4 space-y-2">
                    {question.options.map((option, oIndex) => (
                        <li key={oIndex} className={`flex items-start gap-3 p-2 rounded-md ${question.correctAnswerIndex === oIndex ? 'bg-green-50 border border-green-200' : ''}`}>
                            <input type="radio" checked={question.correctAnswerIndex === oIndex} readOnly className="mt-1"/>
                            <ContentRenderer text={option} />
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
        if (question.type !== 'multiple-choice') return null;
        return (
             <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Options</label>
                {question.options?.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                        <input type="radio" name={`correctAnswer-${qIndex}`} checked={question.correctAnswerIndex === oIndex} onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', oIndex)} />
                        <TextInput placeholder={`Option ${oIndex + 1}`} value={option} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} className="font-mono text-xs" />
                        <Button size="xs" variant="light" icon={TrashIcon} color="red" onClick={() => removeOption(qIndex, oIndex)} disabled={question.options.length <= 2} />
                    </div>
                ))}
                <Button size="xs" variant="light" icon={PlusIcon} onClick={() => addOption(qIndex)}>Add Option</Button>
            </div>
        );
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
                         <TabButton label="Edit All" icon={PencilIcon} isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                         <TabButton label="Preview All" icon={EyeIcon} isActive={activeTab === 'preview'} onClick={() => setActiveTab('preview')} />
                    </div>
                    {questions.map((question, index) => (
                        <div key={index} className="bg-slate-50 rounded-lg">
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