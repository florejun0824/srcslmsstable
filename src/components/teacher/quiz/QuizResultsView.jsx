import React, { useState, useEffect } from 'react';
import { useQuiz } from '../ViewQuizModal';
import { CheckCircleIcon, PencilSquareIcon, StarIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Confetti from 'react-confetti';

/**
 * macOS 26 Design Overhaul
 * Features: Ultra-Glassmorphism, Vivid Blurs, System Fonts, Adaptive Dark Mode
 */
export default function QuizResultsView() {
    const {
        latestSubmission,
        score,
        questionNumbering,
        allSubmissions,
        maxAttempts,
        attemptsTaken,
        handleStartNewAttempt,
        setSubmissionToReview,
        setShowReview,
        xpGained,
    } = useQuiz();

    const [showConfetti, setShowConfetti] = useState(false);

    const submissionStatus = latestSubmission?.status;
    const finalScore = latestSubmission?.score ?? score ?? 0;
    const totalPossiblePoints = latestSubmission?.totalItems ?? questionNumbering.totalItems;
    const xpToShow = xpGained > 0 ? xpGained : (latestSubmission?.xpGained || 0);
    const attemptsLeft = maxAttempts - attemptsTaken;

    // Sort submissions by attempt number, ascending
    const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

    useEffect(() => {
        if (latestSubmission?.status === 'graded') {
            setShowConfetti(true);
        }
    }, [latestSubmission]);

    // --- Reusable UI Components (Shared Design Language) ---

    const GlassContainer = ({ children, className = "" }) => (
        <div className={`relative overflow-hidden p-6 sm:p-10 rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-2xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            text-center transition-all duration-500 ease-out ${className}`}>
            {children}
        </div>
    );

    const PrimaryButton = ({ onClick, children, className = "" }) => (
        <button onClick={onClick} className={`group relative w-full px-6 py-4 rounded-full 
            bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
            text-white font-semibold text-lg tracking-tight
            shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5
            active:scale-[0.98] active:translate-y-0
            transition-all duration-300 ease-spring flex items-center justify-center gap-2 ${className}`}>
            {children}
        </button>
    );

    const SecondaryGlassButton = ({ onClick, children }) => (
        <button onClick={onClick} className="group flex items-center justify-between w-full px-5 py-3 rounded-2xl 
            bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10
            border border-white/50 dark:border-white/5
            text-gray-700 dark:text-gray-200 font-medium text-sm sm:text-base
            backdrop-blur-sm transition-all duration-200 active:scale-[0.98]">
            {children}
            <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
        </button>
    );

    const StatusIcon = ({ status }) => {
        const isPending = status === 'pending_ai_grading' || status === 'pending_review';
        
        return (
            <div className={`mx-auto h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center rounded-full 
                ${isPending 
                    ? 'bg-blue-500/10 text-blue-500 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]' 
                    : 'bg-green-500/10 text-green-500 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]'
                } backdrop-blur-md mb-6 border border-white/20`}>
                {isPending ? <ClockIcon className="h-10 w-10 sm:h-12 sm:w-12" /> : <CheckCircleIcon className="h-10 w-10 sm:h-12 sm:w-12" />}
            </div>
        );
    };

    return (
        <GlassContainer>
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} colors={['#22C55E', '#3B82F6', '#EAB308']} />}

            {/* 1. Status Icon */}
            <StatusIcon status={submissionStatus} />

            {/* 2. Title */}
            <h3 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                {submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review'
                    ? "Submission Received"
                    : "Quiz Completed"
                }
            </h3>

            {/* 3. Score Display (Hero Section) */}
            <div className="mt-6 mb-8">
                <div className="flex items-baseline justify-center gap-1 text-gray-900 dark:text-white">
                    <span className="text-6xl sm:text-7xl font-light tracking-tighter">
                        {finalScore}
                    </span>
                    <span className="text-2xl sm:text-3xl font-medium text-gray-400 dark:text-gray-500">
                        /{totalPossiblePoints}
                    </span>
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">
                    Total Score
                </p>
            </div>

            {/* 4. XP Badge (Glowing Pill) */}
            {xpToShow > 0 && (
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full 
                    bg-yellow-400/10 border border-yellow-400/20 
                    shadow-[0_0_20px_-5px_rgba(234,179,8,0.2)] animate-pulse-slow mb-8">
                    <StarIcon className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-yellow-700 dark:text-yellow-400">+{xpToShow} XP Earned</span>
                </div>
            )}

            {/* 5. Pending Status Card (if needed) */}
            {(submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review') && (
                <div className={`mt-2 mb-8 p-4 rounded-2xl text-left flex items-start gap-4 border backdrop-blur-sm
                    ${submissionStatus === 'pending_review' 
                        ? 'bg-orange-500/5 border-orange-500/10 text-orange-800 dark:text-orange-200' 
                        : 'bg-blue-500/5 border-blue-500/10 text-blue-800 dark:text-blue-200'
                    }`}>
                    <div className={`p-2 rounded-xl ${submissionStatus === 'pending_review' ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                        {submissionStatus === 'pending_review' ? <PencilSquareIcon className="h-6 w-6" /> : <ClockOutlineIcon className="h-6 w-6" />}
                    </div>
                    <div>
                        <p className="font-bold text-base">
                            {submissionStatus === 'pending_review' ? 'Teacher Review Required' : 'Grading in Progress'}
                        </p>
                        <p className="text-sm opacity-80 mt-0.5 leading-relaxed">
                            {submissionStatus === 'pending_review' 
                                ? 'Some items need manual checking. Your score may update later.' 
                                : 'Essays are being reviewed. Final score pending.'}
                        </p>
                    </div>
                </div>
            )}

            {/* 6. Action Area (Start New / Attempts Left) */}
            <div className="space-y-4">
                {attemptsLeft > 0 ? (
                    <>
                        <PrimaryButton onClick={handleStartNewAttempt}>
                            <ArrowPathIcon className="h-6 w-6" />
                            Start New Attempt
                        </PrimaryButton>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                        </p>
                    </>
                ) : (
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 font-medium text-sm">
                        No attempts remaining for this quiz.
                    </div>
                )}
            </div>

            {/* 7. Past Attempts List (Segmented Glass Stack) */}
            {sortedSubmissions.length > 0 && (
                <div className="mt-10 pt-8 border-t border-gray-200/50 dark:border-white/10">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 text-left px-1">
                        History
                    </p>
                    <div className="space-y-2">
                        {sortedSubmissions.map((sub) => (
                            <SecondaryGlassButton
                                key={sub.id || sub.attemptNumber}
                                onClick={() => {
                                    setSubmissionToReview(sub);
                                    setShowReview(true);
                                }}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-semibold text-gray-900 dark:text-white">Attempt {sub.attemptNumber}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {sub.status === 'pending_ai_grading' ? 'Grading...' : sub.status === 'pending_review' ? 'In Review' : 'Graded'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${
                                        !sub.score ? 'text-gray-400' : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {sub.score ?? '-'} / {sub.totalItems ?? '?'}
                                    </span>
                                </div>
                            </SecondaryGlassButton>
                        ))}
                    </div>
                </div>
            )}
        </GlassContainer>
    );
}