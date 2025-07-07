import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../common/Modal';
import { ChevronLeft } from 'lucide-react';
// --- 1. IMPORT THE CONTENT RENDERER ---
import ContentRenderer from '../common/ContentRenderer'; // Assuming path based on Modal import

const QuizInterface = ({ quiz, onSubmit, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [selectedOption, setSelectedOption] = useState(null);
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackData, setFeedbackData] = useState({ isCorrect: false, correctAnswer: '', explanation: '' });
    const { showToast } = useToast();

    const currentQuestion = quiz.questions[currentQuestionIndex];

    const proceedToNext = (currentAnswers) => {
        setFeedbackModalOpen(false);
        setSelectedOption(null);
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        } else {
            const finalAnswers = quiz.questions.map((_, index) => currentAnswers[index]);
            onSubmit(finalAnswers, quiz.isLate);
        }
    };

    const handleAnswerSubmit = () => {
        if (selectedOption === null) return;
        
        const isCorrect = currentQuestion.correctOption === selectedOption;
        const newAnswers = { ...answers, [currentQuestionIndex]: selectedOption };
        setAnswers(newAnswers);

        if (!isCorrect && currentQuestion.explanation) {
            setFeedbackData({
                isCorrect: false,
                correctAnswer: currentQuestion.options[currentQuestion.correctOption],
                explanation: currentQuestion.explanation || "No explanation provided."
            });
            setFeedbackModalOpen(true);
        } else {
            if (isCorrect) showToast("Correct!", "success");
            proceedToNext(newAnswers);
        }
    };

    const handleContinueFromFeedback = () => {
        proceedToNext(answers);
    };

    return (
        <>
            <div className="p-4 md:p-6 border rounded-lg bg-white mt-4 shadow-md">
                <button onClick={onBack} className="text-blue-500 hover:underline mb-4 flex items-center">
                    <ChevronLeft size={20} className="mr-1" /> Back to Assignments
                </button>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-800">{quiz.title}</h2>
                <p className="text-gray-600 mb-6 text-md md:text-lg">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>

                <div className="p-4 md:p-5 border border-gray-200 rounded-lg bg-gray-50">
                    {/* --- 2. USE CONTENT RENDERER FOR THE QUESTION --- */}
                    <div className="font-semibold text-lg md:text-xl mb-4 text-gray-800 flex items-start">
                        <span className="mr-2">{currentQuestionIndex + 1}.</span>
                        <ContentRenderer text={currentQuestion.text} />
                    </div>
                    <div className="space-y-3">
                        {currentQuestion.options.map((opt, oIndex) => (
                            <label key={oIndex} className={`flex items-start p-3 rounded-md cursor-pointer transition-colors ${selectedOption === oIndex ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'}`}>
                                <input type="radio" name={`question-${currentQuestionIndex}`} checked={selectedOption === oIndex} onChange={() => setSelectedOption(oIndex)} className="mr-4 mt-1 text-blue-600 focus:ring-blue-500 scale-125" />
                                {/* --- 3. AND FOR THE OPTIONS --- */}
                                <span className="text-md md:text-lg text-gray-700">
                                    <ContentRenderer text={opt} />
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                <button onClick={handleAnswerSubmit} className="w-full mt-6 bg-blue-500 text-white p-3 rounded-md text-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300" disabled={selectedOption === null}>
                    {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
                </button>
            </div>

            <Modal isOpen={isFeedbackModalOpen} onClose={handleContinueFromFeedback} title="Incorrect Answer">
                <div className="text-gray-800">
                    <p className="font-semibold text-red-600 text-lg mb-2">The correct answer was:</p>
                    {/* --- 4. AND FOR THE FEEDBACK --- */}
                    <div className="p-3 bg-green-100 text-green-800 rounded-md mb-4">
                        <ContentRenderer text={feedbackData.correctAnswer} />
                    </div>
                    <p className="font-semibold mt-4 text-lg mb-2">Explanation:</p>
                    <div className="text-gray-700">
                        <ContentRenderer text={feedbackData.explanation} />
                    </div>
                    <button onClick={handleContinueFromFeedback} className="w-full mt-6 bg-blue-500 text-white p-3 rounded-md text-lg hover:bg-blue-600 transition-colors">
                        Continue
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default QuizInterface;