import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import { LockClosedIcon } from '@heroicons/react/24/solid';

/**
 * Renders the view shown to a student when they have no attempts remaining.
 * Replaces the old renderNoAttemptsLeftView() function.
 */
export default function QuizNoAttemptsView() {
    // Get all necessary state and handlers from context
    const {
        maxAttempts,
        latestSubmission,
        questionNumbering,
        allSubmissions,
        setSubmissionToReview,
        setShowReview,
    } = useQuiz();

    const lastSub = latestSubmission;
    const lastScore = lastSub?.score ?? 0;
    const lastTotal = lastSub?.totalItems ?? questionNumbering.totalItems;
    const lastStatus = lastSub?.status;

    // Sort submissions by attempt number, ascending
    const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

    return (
        // --- MODIFIED: Added dark theme ---
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
            {/* --- MODIFIED: Added dark theme --- */}
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                {/* --- MODIFIED: Added dark theme --- */}
                <LockClosedIcon className="h-20 w-20 text-red-500 dark:text-red-400" />
            </div>
            {/* --- MODIFIED: Added dark theme --- */}
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2 dark:text-slate-100">No Attempts Remaining</h3>
            {/* --- MODIFIED: Added dark theme --- */}
            <p className="text-lg mt-2 text-slate-600 dark:text-slate-300">You have used all {maxAttempts} of your attempts for this quiz.</p>
            
            {/* Display score from the last attempt */}
            {lastSub && (
                // --- MODIFIED: Added dark theme ---
                <p className="text-2xl font-bold mt-4 text-slate-800 dark:text-slate-200">
                    Your final score was <strong className={lastStatus === 'pending_ai_grading' || lastStatus === 'pending_review' ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}>{lastScore}</strong> out of <strong className="text-slate-900 dark:text-slate-100">{lastTotal}</strong>
                    {/* --- MODIFIED: Added dark theme --- */}
                    {lastStatus === 'pending_ai_grading' && <span className="block text-sm text-blue-600 dark:text-blue-400">(Essays Pending Review)</span>}
                    {/* --- MODIFIED: Added dark theme --- */}
                    {lastStatus === 'pending_review' && <span className="block text-sm text-orange-600 dark:text-orange-400">(Manual Review Needed)</span>}
                </p>
            )}
            
            {/* Review Past Attempts */}
            {sortedSubmissions.length > 0 && (
                // --- MODIFIED: Added dark theme ---
                <div className="mt-8 w-full space-y-2 pt-4 border-t border-slate-300/50 dark:border-slate-700">
                    {/* --- MODIFIED: Added dark theme --- */}
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Review Your Attempts:</p>
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