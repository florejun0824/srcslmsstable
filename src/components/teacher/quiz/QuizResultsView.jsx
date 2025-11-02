import React, { useState, useEffect } from 'react';
import { useQuiz } from '../ViewQuizModal';
// --- MODIFIED: Added StarIcon ---
import { CheckCircleIcon, PencilSquareIcon, StarIcon } from '@heroicons/react/24/solid';
// --- END MODIFIED ---
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline';
import Confetti from 'react-confetti';

/**
 * Renders the results screen after a quiz is submitted.
 * Replaces the old renderResults() function.
 */
export default function QuizResultsView() {
    // --- MODIFIED: Get xpGained from context ---
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
        xpGained, // Get the XP gained from this session
    } = useQuiz();
    // --- END MODIFIED ---

    // --- ADDED: Confetti State ---
    const [showConfetti, setShowConfetti] = useState(false);
    // --- END ADDED ---

    const submissionStatus = latestSubmission?.status;
    const finalScore = latestSubmission?.score ?? score ?? 0;
    const totalPossiblePoints = latestSubmission?.totalItems ?? questionNumbering.totalItems;

    // --- MODIFIED: Check for XP in state or in the submission data ---
    const xpToShow = xpGained > 0 ? xpGained : (latestSubmission?.xpGained || 0);
    // --- END MODIFIED ---

    // Sort submissions by attempt number, ascending
    const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));
    
    // Calculate attempts left based on the attemptsTaken state
    const attemptsLeft = maxAttempts - attemptsTaken;

    // --- ADDED: useEffect to trigger confetti ---
    useEffect(() => {
        // Trigger confetti only if the score is fully graded
        if (latestSubmission?.status === 'graded') {
            setShowConfetti(true);
        }
    }, [latestSubmission]);
    // --- END ADDED ---

    return (
        // --- MODIFIED: Added dark theme ---
        <div className="text-center p-4 sm:p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
            {/* --- ADDED: Confetti Component --- */}
            {showConfetti && (
                <Confetti numberOfPieces={200} recycle={false} />
            )}
            {/* --- END ADDED --- */}

            {/* Icon based on status */}
            {/* --- MODIFIED: Added dark theme --- */}
            <div className="mx-auto inline-block p-3 sm:p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-4 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                {submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review'
                   // --- MODIFIED: Added dark theme ---
                   ? <ClockOutlineIcon className="h-14 w-14 sm:h-20 sm:w-20 text-blue-500 dark:text-blue-400" />
                   // --- MODIFIED: Added dark theme ---
                   : <CheckCircleIcon className="h-14 w-14 sm:h-20 sm:w-20 text-green-500 dark:text-green-400" />
                }
            </div>
            {/* Title */}
            {/* --- MODIFIED: Added dark theme --- */}
            <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-2 dark:text-slate-100">
                {submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review'
                    ? "Submission Received!"
                    : "Quiz Submitted!"
                }
            </h3>
            {/* Score Display */}
            {/* --- MODIFIED: Added dark theme --- */}
             <p className="text-base sm:text-xl mt-2 text-slate-700 dark:text-slate-300">
                Your current score is <strong className="text-green-600 dark:text-green-400 text-xl sm:text-3xl">{finalScore}</strong> out of <strong className="text-slate-900 dark:text-slate-100 text-xl sm:text-3xl">{totalPossiblePoints}</strong>
             </p>
            
            {/* --- ADDED: XP GAINED DISPLAY --- */}
            {xpToShow > 0 && (
                // --- MODIFIED: Added dark theme ---
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full shadow-neumorphic border border-yellow-300/50 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-700 dark:shadow-lg">
                    {/* --- MODIFIED: Added dark theme --- */}
                    <StarIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
                    <span className="text-lg font-bold">You earned +{xpToShow} XP!</span>
                </div>
            )}
            {/* --- END ADDED --- */}

            {/* Status Messages for Pending/Review */}
            {(submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review') && (
                // --- MODIFIED: Added dark theme ---
                <div className={`mt-4 p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl ${submissionStatus === 'pending_review' ? 'text-orange-800 dark:text-orange-300' : 'text-blue-800 dark:text-blue-300'}`}>
                    {submissionStatus === 'pending_review' ? (
                        <PencilSquareIcon className="h-6 w-6 mx-auto mb-2" />
                    ) : (
                        <ClockOutlineIcon className="h-6 w-6 mx-auto mb-2" />
                    )}
                    <p className="font-semibold">
                        {submissionStatus === 'pending_review' ? 'Some items require manual teacher review.' : 'Essays are pending teacher review/grading.'}
                    </p>
                    <p className="text-sm">
                        {submissionStatus === 'pending_review' ? 'Your score may be adjusted later.' : 'Your final score will be updated once graded.'}
                    </p>
                </div>
            )}

            {/* Attempts Left */}
            {attemptsLeft > 0 ? (
                <>
                    {/* --- MODIFIED: Added dark theme --- */}
                    <p className="text-sm sm:text-lg mt-4 text-slate-600 dark:text-slate-400">You have <strong>{attemptsLeft}</strong> attempt(s) left.</p>
                    <button
                        onClick={handleStartNewAttempt}
                        className="mt-6 w-full py-3 rounded-2xl bg-green-600 text-white font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all hover:bg-green-700"
                    >
                        Start New Attempt
                    </button>
                </>
             ) : (
                // --- MODIFIED: Added dark theme ---
                <p className="text-sm sm:text-lg mt-4 text-red-600 dark:text-red-400 font-semibold">You have used all {maxAttempts} attempts.</p>
            )}
            
            {/* Review Past Attempts */}
            {sortedSubmissions.length > 0 && (
                // --- MODIFIED: Added dark theme ---
                <div className="mt-4 w-full space-y-2 pt-4 border-t border-slate-300/50 dark:border-slate-700">
                    {/* --- MODIFIED: Added dark theme --- */}
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Review Past Attempts:</p>
                    {sortedSubmissions.map((sub) => (
                        <button
                            key={sub.id || sub.attemptNumber}
                            onClick={() => {
                                setSubmissionToReview(sub);
                                setShowReview(true);
                            }}
                            // --- MODIFIED: Added dark theme ---
                            className="w-full py-2.5 rounded-xl bg-neumorphic-base text-blue-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all text-sm dark:bg-neumorphic-base-dark dark:text-blue-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
                        >
                            Review Attempt {sub.attemptNumber}
                            {/* --- MODIFIED: Added dark theme --- */}
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                ({sub.score ?? 0} / {sub.totalItems ?? '?'})
                                {sub.status === 'pending_ai_grading' && " (Pending)"}
                                {sub.status === 'pending_review' && " (Review)"}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}