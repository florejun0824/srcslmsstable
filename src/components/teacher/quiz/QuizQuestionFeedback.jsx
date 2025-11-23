import React, { useEffect } from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer'; 
import { ArrowRightIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, BoltIcon, FireIcon } from '@heroicons/react/24/solid'; // Added Bolt/Fire icons
import Confetti from 'react-confetti';
import useSound from 'use-sound';

/**
 * macOS 26 Design Overhaul
 * Features: Ultra-Glassmorphism, Vivid Blurs, System Fonts, Adaptive Dark Mode
 */
export default function QuizQuestionFeedback() {
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
        answerStreak,
        questionStartTime,
    } = useQuiz();

    // --- Sound Hooks ---
    const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.7 });
    const [playIncorrect] = useSound('/sounds/incorrect.mp3', { volume: 0.7 });
    const [playSave] = useSound('/sounds/save.mp3', { volume: 0.5 });

    const question = shuffledQuestions[currentQ];
    const totalQuestions = shuffledQuestions.length;

    // --- useEffect to play sounds ---
    useEffect(() => {
        if (!question) return;

        // Case 1: Essay saved
        if (question.type === 'essay' && currentQuestionAttempted) {
            playSave();
            return;
        }

        // Case 2: Matching type confirmed
        if (question.type === 'matching-type' && matchingResult) {
            if (matchingResult.correct === matchingResult.total) {
                playCorrect();
            } else if (matchingResult.correct > 0) {
                playSave();
            } else {
                playIncorrect();
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
    }, [question, questionResult, matchingResult, currentQuestionAttempted, playCorrect, playIncorrect, playSave]);


    if (!question) return null;

    // --- Reusable Components for macOS Look ---

    // 1. The Main Glass Container
    const GlassContainer = ({ children, className = "" }) => (
        <div className={`relative overflow-hidden p-6 sm:p-8 rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-2xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            transition-all duration-500 ease-out ${className}`}>
            {children}
        </div>
    );

    // 2. The Primary Action Button (Gradient)
    const PrimaryButton = ({ onClick, children }) => (
        <button onClick={onClick} className="group relative w-full px-6 py-3.5 rounded-full 
            bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
            text-white font-semibold text-lg tracking-tight
            shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5
            active:scale-[0.98] active:translate-y-0
            transition-all duration-300 ease-spring">
            {children}
        </button>
    );

    // 3. The Secondary Action Button (Glassy)
    const SecondaryButton = ({ onClick, children }) => (
        <button onClick={onClick} className="group flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full 
            bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20
            text-gray-900 dark:text-white font-semibold text-lg tracking-tight
            border border-transparent hover:border-black/5 dark:hover:border-white/10
            active:scale-[0.98] transition-all duration-200">
            {children}
            <ArrowRightIcon className="h-5 w-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
    );

    // 4. Status Badge (The Icon Circle)
    const StatusIcon = ({ type }) => {
        const styles = {
            success: "bg-green-500/10 text-green-600 dark:text-green-400 dark:bg-green-400/20",
            error: "bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-400/20",
            info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-400/20",
        };
        const Icon = type === 'success' ? CheckCircleIcon : type === 'error' ? XCircleIcon : CheckCircleIcon;
        
        return (
            <div className={`h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-full ${styles[type]} backdrop-blur-md shadow-inner`}>
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
        );
    };

    // --- Essay Saved Confirmation ---
    if (question.type === 'essay') {
         if (!currentQuestionAttempted) return null;
        return (
            <GlassContainer>
                 <div className="flex flex-col items-center text-center mb-6 animate-fade-in-up">
                    <StatusIcon type="info" />
                    <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Answer Saved
                    </h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-300 font-medium leading-relaxed max-w-md">
                        Your essay has been securely recorded. Your teacher will review it after submission.
                    </p>
                </div>
                 <div className="mt-8">
                     {currentQ < totalQuestions - 1 ? (
                         <SecondaryButton onClick={handleNextQuestion}>Continue</SecondaryButton>
                     ) : (
                         <PrimaryButton onClick={handleSubmit}>Submit Quiz</PrimaryButton>
                     )}
                 </div>
            </GlassContainer>
        );
    }

    // --- Matching Type Confirmed Feedback ---
    if (question.type === 'matching-type' && matchingResult) {
        const isPerfect = matchingResult.correct === matchingResult.total;
        
        return (
             <GlassContainer className="mt-4">
                 {isPerfect && <Confetti numberOfPieces={150} recycle={false} />}
                 
                 <div className="flex flex-col items-center text-center mb-6 animate-fade-in-up">
                    <StatusIcon type={matchingResult.correct > 0 ? 'success' : 'error'} />
                    <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {isPerfect ? "Perfect Match!" : "Matching Complete"}
                    </h3>
                    
                    {/* Result Pill */}
                    <div className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/5">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                            {matchingResult.correct} / {matchingResult.total} Correct
                        </span>
                    </div>
                </div>

                {/* Explanation Box */}
                <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/50 dark:border-white/5 shadow-sm">
                    {question.explanation ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-wider">
                                <InformationCircleIcon className="h-4 w-4"/> Explanation
                            </div>
                            <ContentRenderer text={question.explanation}/>
                        </div>
                    ) : (
                        <p className="text-sm text-center text-gray-500 italic">Answers recorded.</p>
                    )}
                </div>

                <div className="mt-6">
                     {currentQ < totalQuestions - 1 ? (
                         <SecondaryButton onClick={handleNextQuestion}>Next Question</SecondaryButton>
                     ) : (
                         <PrimaryButton onClick={handleSubmit}>Submit Quiz</PrimaryButton>
                     )}
                 </div>
             </GlassContainer>
        );
    }

    // --- Feedback for MC, TF, ID ---
    if (!questionResult) return null;

    const isCorrect = questionResult === 'correct';
    const booleanToString = (val) => quiz.language === 'Filipino' ? (val ? 'Tama' : 'Mali') : String(val);
    let userAnswerText = 'No Answer';
    let correctAnswerText = 'N/A';

    // Speed Bonus Logic
    let showSpeedBonus = false;
    if (isCorrect && questionStartTime) {
        const timeTaken = (Date.now() - questionStartTime);
        if (timeTaken < 5000) showSpeedBonus = true;
    }

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
        <GlassContainer>
            {isCorrect && <Confetti numberOfPieces={150} recycle={false} colors={['#3B82F6', '#10B981', '#F59E0B']} />}

            {/* Header Section */}
            <div className="flex flex-col items-center text-center mb-6 animate-fade-in-up">
                <StatusIcon type={isCorrect ? 'success' : 'error'} />
                
                <h3 className={`mt-4 text-3xl font-bold tracking-tight ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                </h3>

                {/* Gamification Badges (Dynamic Island Style) */}
                <div className="flex flex-wrap justify-center gap-3 mt-3">
                    {isCorrect && answerStreak > 1 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm font-bold animate-pulse">
                            <FireIcon className="h-4 w-4" /> {answerStreak} Streak
                        </div>
                    )}
                    {showSpeedBonus && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold">
                            <BoltIcon className="h-4 w-4" /> Speed Bonus
                        </div>
                    )}
                </div>
            </div>

            {/* Answer Comparison Card */}
            <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/60 dark:border-white/5 shadow-sm space-y-3">
                
                {/* User Answer */}
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                        Your Answer
                    </p>
                    <div className={`text-base sm:text-lg font-medium ${isCorrect ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400 line-through decoration-2 decoration-red-500/50'}`}>
                        <ContentRenderer text={String(userAnswerText)} />
                    </div>
                </div>

                {/* Correct Answer (If incorrect) */}
                {!isCorrect && (
                    <div className="pt-3 border-t border-gray-200/50 dark:border-white/10 animate-in fade-in slide-in-from-left-2">
                         <p className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">
                            Correct Answer
                        </p>
                        <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                            <ContentRenderer text={String(correctAnswerText)} />
                        </div>
                    </div>
                )}
            </div>

            {/* Explanation Dropdown (If available) */}
            {question.explanation && (
                <div className="mt-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/10">
                    <div className="flex items-start gap-3">
                        <InformationCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                            <span className="block font-bold text-blue-700 dark:text-blue-300 mb-1">Why is this correct?</span>
                            <ContentRenderer text={question.explanation} />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Navigation */}
            <div className="mt-8">
                 {currentQ < totalQuestions - 1 ? (
                     <SecondaryButton onClick={handleNextQuestion}>Next Question</SecondaryButton>
                 ) : (
                     <PrimaryButton onClick={handleSubmit}>Submit Quiz</PrimaryButton>
                 )}
             </div>
        </GlassContainer>
    );
}