import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
// DatePicker is no longer needed here, so its imports are removed.

const QuizFormModal = ({ isOpen, onClose, onSubmit, initialQuizData, title }) => {
    const [quizTitle, setQuizTitle] = useState('');
    // The 'dueDate' state has been removed.
    const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }]);

    useEffect(() => {
        if (initialQuizData) {
            setQuizTitle(initialQuizData.title || '');
            // The logic for setting 'dueDate' has been removed.
            setQuestions(initialQuizData.questions.map(q => ({...q, explanation: q.explanation || ''})));
        } else {
            setQuizTitle('');
            // The logic for resetting 'dueDate' has been removed.
            setQuestions([{ text: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }]);
        }
    }, [initialQuizData, isOpen]);

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };
    
    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const addQuestion = () => setQuestions([...questions, { text: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }]);
    const removeQuestion = (index) => {
        if (questions.length > 1) setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // The 'dueDate' property has been removed from the submitted data.
        onSubmit({ 
            title: quizTitle,
            questions,
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
                <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Quiz Title" className="w-full p-3 border rounded-md" required />
                
                {/* The DatePicker component has been removed from the form. */}

                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 border rounded-lg bg-gray-50 relative">
                        <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-2 right-2 text-red-500 font-bold text-lg">&times;</button>
                        <textarea value={q.text} onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} placeholder={`Question ${qIndex + 1}`} className="w-full p-3 border rounded-md mb-3" rows="2" required />
                        <div className="space-y-2">
                            {q.options.map((opt, oIndex) => (
                                 <div key={oIndex} className="flex items-center">
                                     <input type="radio" name={`correct-option-${qIndex}`} checked={q.correctOption === oIndex} onChange={() => handleQuestionChange(qIndex, 'correctOption', oIndex)} className="mr-3"/>
                                     <input type="text" value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} className="flex-grow p-2 border rounded-md" required />
                                 </div>
                            ))}
                        </div>
                        <textarea value={q.explanation} onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)} placeholder="Explanation for correct answer (optional)" className="w-full p-3 border rounded-md mt-3" rows="2" />
                    </div>
                ))}
                
                <button type="button" onClick={addQuestion} className="w-full bg-gray-200 p-3 rounded-md hover:bg-gray-300">Add Question</button>
                <button type="submit" className="w-full bg-yellow-500 text-white p-3 rounded-md hover:bg-yellow-600">
                    {initialQuizData ? 'Save Changes' : 'Add Quiz'}
                </button>
            </form>
        </Modal>
    );
};

export default QuizFormModal;