import React, { useEffect } from 'react'; // --- MODIFIED: Added useEffect ---
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer'; // Adjust path if needed
import { ArrowRightIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import Confetti from 'react-confetti';
import useSound from 'use-sound'; // --- ADDED: Sound hook ---

/**
 * Renders the feedback screen ("Correct", "Incorrect", "Saved")
 * after a student answers a question.
 * Replaces the old renderQuestionFeedback() function.
 */
export default function QuizQuestionFeedback() {
    // Get all necessary state and handlers from context
    const {
        currentQ,
        shuffledQuestions,
        questionResult,
        matchingResult,
        currentQuestionAttempted,
        userAnswers,
        quiz,
        handleNextQuestion,
        handleSubmit,
        // --- ADDED ---
        answerStreak,
        questionStartTime,
        // --- END ADDED ---
    } = useQuiz();

    // --- ADDED: Sound Hooks ---
    // NOTE: These paths assume your sound files are in the `public/sounds/` folder
    const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.7 });
    const [playIncorrect] = useSound('/sounds/incorrect.mp3', { volume: 0.7 });
    const [playSave] = useSound('/sounds/save.mp3', { volume: 0.5 });
    // --- END ADDED ---

    const question = shuffledQuestions[currentQ];
    const totalQuestions = shuffledQuestions.length;

    // --- ADDED: useEffect to play sounds on feedback ---
    useEffect(() => {
        // This hook runs when the component appears (i.e., when feedback is ready)
        if (!question) return;

        // Case 1: Essay saved
        if (question.type === 'essay' && currentQuestionAttempted) {
            playSave();
            return; // Only play one sound
        }

        // Case 2: Matching type confirmed
        if (question.type === 'matching-type' && matchingResult) {
            if (matchingResult.correct === matchingResult.total) {
                playCorrect(); // Play correct sound if all matches are right
            } else if (matchingResult.correct > 0) {
                playSave(); // Play a neutral 'save' sound for partial
            } else {
                playIncorrect(); // Play incorrect if zero matches
            }
            return;
        }

        // Case 3: MC, TF, ID feedback
        if (questionResult) {
            if (questionResult === 'correct') {
                playCorrect();
            } else if (questionResult === 'incorrect') {
                playIncorrect();
            }
        }
    }, [
        question, 
        questionResult, 
        matchingResult, 
        currentQuestionAttempted, 
        playCorrect, 
        playIncorrect, 
        playSave
    ]);
    // --- END ADDED ---


    if (!question) return null; // Should not happen if logic is correct

    // --- Essay Saved Confirmation ---
    if (question.type === 'essay') {
         if (!currentQuestionAttempted) return null; // Only show if saved
        return (
            <div className="p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic">
                 <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className="p-2 sm:p-3 rounded-full bg-neumorphic-base shadow-neumorphic">
                        <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-blue-800">Answer Saved</h3>
                </div>
                <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                    <p>Your essay answer has been saved. It will be reviewed by your teacher after you submit the quiz.</p>
                </div>
                 <div className="mt-6">
                     {currentQ < totalQuestions - 1 ? (
                         <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                             Next <ArrowRightIcon className="h-5 w-5"/>
                         </button>
                     ) : (
                         <button onClick={handleSubmit} className="w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                             Submit Quiz
                         </button>
                     )}
                 </div>
            </div>
        );
    }

    // --- Matching Type Confirmed Feedback ---
    if (question.type === 'matching-type' && matchingResult) {
        return (
             <div className="mt-4 p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic">
                 {/* --- ADDED: Confetti for matching --- */}
                 {matchingResult.correct === matchingResult.total && (
                    <Confetti numberOfPieces={150} recycle={false} />
                 )}
                 {/* --- END ADDED --- */}
                 <div className="flex items-center gap-3 sm:gap-4 mb-4">
                    <div className={`p-2 sm:p-3 rounded-full bg-neumorphic-base shadow-neumorphic`}>
                         <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
                    </div>
                    <h3 className={`text-xl sm:text-2xl font-extrabold text-blue-800`}>Answer Confirmed</h3>
                </div>
                <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                    <p className="font-semibold text-center">
                        You correctly matched {matchingResult.correct} out of {matchingResult.total} items.
                    </p> {/* <-- THIS IS THE FIX (was </S>) */}
                    {question.explanation && (
                         <div className="mt-3 pt-3 border-t border-slate-300/80 text-xs italic">
                            <span className='font-semibold not-italic'>Explanation:</span> <ContentRenderer text={question.explanation}/>
                         </div>
                    )}
                </div>
                <div className="mt-6">
                     {currentQ < totalQuestions - 1 ? (
                         <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                             Next <ArrowRightIcon className="h-5 w-5"/>
                         </button>
                     ) : (
                         <button onClick={handleSubmit} className="w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                             Submit Quiz
                         </button>
                     )}
                 </div>
             </div>
        );
    }

    // --- Feedback for MC, TF, ID ---
    if (!questionResult) return null; // Don't render if no result yet

    const isCorrect = questionResult === 'correct';
    const booleanToString = (val) => quiz.language === 'Filipino' ? (val ? 'Tama' : 'Mali') : String(val);
    let userAnswerText = 'No Answer';
    let correctAnswerText = 'N/A';

    // --- ADDED: Speed Bonus Logic ---
    let showSpeedBonus = false;
    if (isCorrect && questionStartTime) {
        const timeTaken = (Date.now() - questionStartTime); // in milliseconds
        if (timeTaken < 5000) { // 5-second threshold for a bonus
            showSpeedBonus = true;
        }
    }
    // --- END ADDED ---

    if (question.type === 'multiple-choice') {
        const userOpt = question.options?.[userAnswers[currentQ]];
        userAnswerText = userOpt?.text || userOpt || 'No Answer';
        const correctOpt = question.options?.[question.correctAnswerIndex];
        correctAnswerText = correctOpt?.text || correctOpt || 'N/A';
    } else if (question.type === 'true-false') {
        userAnswerText = booleanToString(userAnswers[currentQ]);
        correctAnswerText = booleanToString(question.correctAnswer);
    } else if (question.type === 'identification' || question.type === 'exactAnswer') {
        userAnswerText = userAnswers[currentQ] || 'No Answer';
        correctAnswerText = question.correctAnswer || 'N/A';
    }

    return (
        <div className={`p-4 sm:p-6 rounded-3xl bg-neumorphic-base shadow-neumorphic`}>
            {/* --- ADDED: Confetti --- */}
            {isCorrect && (
                <Confetti numberOfPieces={150} recycle={false} />
            )}
            {/* --- END ADDED --- */}

            <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className={`p-2 sm:p-3 rounded-full bg-neumorphic-base ${isCorrect ? 'shadow-neumorphic' : 'shadow-neumorphic-inset'}`}>
                    {isCorrect ? <CheckCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" /> : <XCircleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />}
                </div>
                <h3 className={`text-xl sm:text-2xl font-extrabold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>{isCorrect ? "Correct!" : "Incorrect"}</h3>
            </div>

            {/* --- ADDED: Gamification Feedback --- */}
            {isCorrect && answerStreak > 1 && (
                <h4 className="text-lg font-bold text-orange-500 animate-pulse text-center -mt-2 mb-3">
                    🔥 {answerStreak} in a row!
                </h4>
            )}
            {showSpeedBonus && (
                <h4 className="text-lg font-bold text-blue-500 text-center -mt-2 mb-3">
                    ⚡️ Speed Bonus!
                </h4>
            )}
            {/* --- END ADDED --- */}

            <div className="text-sm sm:text-base text-slate-700 space-y-2 bg-neumorphic-base p-3 sm:p-4 rounded-2xl shadow-neumorphic-inset">
                <p><span className="font-semibold text-slate-800">Your Answer:</span> <ContentRenderer text={String(userAnswerText)} /></p>
                {!isCorrect && (<p><span className="font-semibold text-slate-800">Correct Answer:</span> <ContentRenderer text={String(correctAnswerText)} /></p>)}
            </div>
            {question.explanation && (
                <div className="mt-4 pt-4 border-t border-slate-300/80">
                    <div className="flex items-start gap-3">
                        <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-700 mb-1">Explanation</h4>
                            <div className="text-sm sm:text-base text-slate-700"><ContentRenderer text={question.explanation} /></div>
                        </div>
                    </div>
                </div>
            )}
             <div className="mt-6">
                 {currentQ < totalQuestions - 1 ? (
                     <button onClick={handleNextQuestion} className="flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                         Next <ArrowRightIcon className="h-5 w-5"/>
                     </button>
                 ) : (
                     <button onClick={handleSubmit} className="w-full px-5 py-2.5 rounded-2xl bg-neumorphic-base text-green-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all">
                         Submit Quiz
                     </button>
                 )}
             </div>
        </div>
    );
}