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
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <LockClosedIcon className="h-20 w-20 text-red-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">No Attempts Remaining</h3>
            <p className="text-lg mt-2 text-slate-600">You have used all {maxAttempts} of your attempts for this quiz.</p>
            
            {/* Display score from the last attempt */}
            {lastSub && (
                <p className="text-2xl font-bold mt-4">
                    Your final score was <strong className={lastStatus === 'pending_ai_grading' || lastStatus === 'pending_review' ? "text-blue-600" : "text-red-600"}>{lastScore}</strong> out of <strong className="text-slate-900">{lastTotal}</strong>
                    {lastStatus === 'pending_ai_grading' && <span className="block text-sm text-blue-600">(Essays Pending Review)</span>}
                    {lastStatus === 'pending_review' && <span className="block text-sm text-orange-600">(Manual Review Needed)</span>}
                </p>
            )}
            
            {/* Review Past Attempts */}
            {sortedSubmissions.length > 0 && (
                <div className="mt-8 w-full space-y-2 pt-4 border-t border-slate-300/50">
                    <p className="text-sm font-semibold text-slate-700">Review Your Attempts:</p>
                    {sortedSubmissions.map((sub) => (
                        <button
                            key={sub.id || sub.attemptNumber}
                            onClick={() => {
                                setSubmissionToReview(sub);
                                setShowReview(true);
                            }}
                            className="w-full py-2.5 rounded-xl bg-neumorphic-base text-blue-700 font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all text-sm"
                        >
                            Review Attempt {sub.attemptNumber}
                            <span className="ml-2 text-xs text-slate-500">
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