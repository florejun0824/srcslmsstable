import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer'; // Adjust path if needed
import { ClockIcon as ClockOutlineIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

/**
 * Renders the detailed review screen for a specific submission.
 * Replaces the old renderReview() function.
 */
export default function QuizReviewView() {
    // Get all necessary state and handlers from context
    const {
        submissionToReview,
        setShowReview,
        setSubmissionToReview,
        quiz,
    } = useQuiz();

    const answersToReview = submissionToReview?.answers || [];

    if (answersToReview.length === 0 || !submissionToReview) {
         // --- MODIFIED: Added dark theme ---
         return <div className="p-4 text-center text-slate-600 dark:text-slate-400">No submission data available to review.</div>;
    }

    // Calculate numbering based on the *reviewed* answers' points
    const reviewNumbering = (() => {
        let currentItemNumber = 1; const starts = []; let totalPoints = 0;
        answersToReview.forEach(answer => {
            starts.push(currentItemNumber);
            const pointsValue = Number(answer.points) || 1;
            currentItemNumber += pointsValue;
            totalPoints += pointsValue;
        });
        return { starts, totalPoints };
    })();

    // Helper to display True/False in correct language
    const displayBoolean = (val) => {
        const strVal = String(val).toLowerCase();
        if (quiz.language === 'Filipino') return strVal === 'true' ? 'Tama' : (strVal === 'false' ? 'Mali' : strVal);
        return strVal === 'true' ? 'True' : (strVal === 'false' ? 'False' : strVal);
    };

    return (
        <div>
            {/* --- MODIFIED: Added dark theme --- */}
            <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-4 dark:text-slate-100">Review Answers (Attempt {submissionToReview.attemptNumber})</h3>
            {/* Overall Score */}
            {/* --- MODIFIED: Added dark theme --- */}
            <p className="text-center font-semibold mb-4 text-slate-800 dark:text-slate-200">
                Overall Score: {submissionToReview.score ?? 0} / {reviewNumbering.totalPoints}
                 {/* --- MODIFIED: Added dark theme --- */}
                 {submissionToReview.status === 'pending_ai_grading' && <span className="text-blue-600 dark:text-blue-400"> (Essays Pending)</span>}
                 {/* --- MODIFIED: Added dark theme --- */}
                 {submissionToReview.status === 'pending_review' && <span className="text-orange-600 dark:text-orange-400"> (Manual Review Needed)</span>}
            </p>

            {/* Scrollable Answer List */}
            {/* --- MODIFIED: Added dark theme --- */}
            <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 bg-neumorphic-base p-2 rounded-2xl shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                {answersToReview.map((answer, index) => {
                    // Calculate numbering label
                    const startNum = reviewNumbering.starts[index];
                    const pointsValue = Number(answer.points) || 1;
                    const endNum = startNum + pointsValue - 1;
                    const numLabel = pointsValue <= 1 ? `Item ${startNum}` : `Items ${startNum}-${endNum}`;

                    // Determine status visuals
                    let borderColor = 'border-gray-400';
                    let statusIcon = <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
                    const itemScore = answer.score ?? 0;

                    if (answer.status === 'pending_ai_grading') {
                        borderColor = 'border-blue-400';
                        statusIcon = <ClockOutlineIcon className="h-5 w-5 text-blue-500" />;
                    } else if (answer.status === 'grading_failed' || answer.status === 'pending_review') {
                        borderColor = 'border-orange-500';
                        statusIcon = <PencilSquareIcon className="h-5 w-5 text-orange-500" />;
                    } else if (answer.status === 'graded') {
                         if (itemScore === answer.points) { borderColor = 'border-green-500'; statusIcon = <CheckCircleIcon className="h-5 w-5 text-green-600" />; }
                         else if (itemScore > 0) { borderColor = 'border-yellow-500'; statusIcon = <CheckCircleIcon className="h-5 w-5 text-yellow-600" />; }
                         else { borderColor = 'border-red-500'; statusIcon = <XCircleIcon className="h-5 w-5 text-red-600" />; }
                    }

                    return (
                        // --- MODIFIED: Added dark theme ---
                        <div key={index} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-neumorphic-base shadow-neumorphic border-l-4 ${borderColor} dark:bg-neumorphic-base-dark dark:shadow-lg`}>
                            {/* Header */}
                            {/* --- MODIFIED: Added dark theme --- */}
                            <p className="text-xs font-bold text-slate-500 mb-2 dark:text-slate-400">
                                {numLabel} ({answer.status === 'graded' || answer.status === 'pending_review' ? `${itemScore} / ` : ''}{answer.points} pts)
                                {/* --- MODIFIED: Added dark theme --- */}
                                {answer.status === 'pending_ai_grading' && <span className="ml-2 text-blue-600 dark:text-blue-400">(Pending Review)</span>}
                                {/* --- MODIFIED: Added dark theme --- */}
                                {(answer.status === 'grading_failed' || answer.status === 'pending_review') && <span className="ml-2 text-orange-600 dark:text-orange-400">(Manual Review Needed)</span>}
                            </p>
                            {/* Question Text */}
                            {/* --- MODIFIED: Added dark theme --- */}
                            <div className="font-bold text-base sm:text-lg text-slate-800 mb-3 flex items-start dark:text-slate-100">
                                <span className="mr-2 pt-1 flex-shrink-0">{statusIcon}</span>
                                <ContentRenderer text={answer.questionText || "Question text missing"} />
                            </div>
                            {/* Answer Details */}
                            <div className="text-sm space-y-1 pl-7">
                                {/* Essay Review */}
                                {answer.questionType === 'essay' ? (
                                    <div className="space-y-3">
                                        {/* --- MODIFIED: Added dark theme --- */}
                                        <div className="p-2 bg-neumorphic-base shadow-neumorphic-inset rounded-lg text-slate-700 italic dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark dark:text-slate-300">
                                            {/* --- MODIFIED: Added dark theme --- */}
                                            <p className='font-semibold not-italic text-slate-800 mb-1 dark:text-slate-100'>Your Answer:</p>
                                            <ContentRenderer text={answer.selectedAnswer || "(No answer provided)"} />
                                        </div>
                                        {answer.status === 'graded' && answer.aiGradingResult ? (
                                            // --- MODIFIED: Added dark theme ---
                                            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30 text-green-900 dark:bg-green-500/10 dark:text-green-200">
                                                <p className="font-bold text-base mb-2">AI Score: {itemScore} / {answer.points} points</p>
                                                {(answer.aiGradingResult.scores || []).map((crit, idx) => (
                                                     <div key={idx} className="mb-1">
                                                        <p className="font-semibold">{crit.criteria}: {crit.pointsAwarded} pts</p>
                                                        <p className="text-xs italic pl-2">Justification: {crit.justification}</p>
                                                    </div>
                                                ))}
                                                <p className="font-semibold mt-3">Overall Feedback:</p>
                                                <p className="text-xs italic">{answer.aiGradingResult.overallFeedback}</p>
                                            </div>
                                        ) : (answer.status === 'grading_failed' || answer.status === 'pending_review') ? (
                                            // --- MODIFIED: Added dark theme ---
                                            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 text-orange-900 dark:bg-orange-500/10 dark:text-orange-200">
                                                <p className="font-semibold">Requires manual teacher review.</p>
                                                {answer.aiGradingResult?.error && <p className="text-xs italic mt-1">AI Error: {answer.aiGradingResult.error}</p>}
                                            </div>
                                         ) : answer.status === 'pending_ai_grading' ? (
                                            // --- MODIFIED: Added dark theme ---
                                             <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
                                                <p className="font-semibold">Pending review...</p>
                                            </div>
                                        ) : null}
                                    </div>
                                /* Matching Type Review */
                                ) : answer.questionType === 'matching-type' ? (
                                    <>
                                        {/* --- MODIFIED: Added dark theme --- */}
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">Your Score: {itemScore} / {answer.points} points ({answer.correctCount} / {answer.prompts?.length || 0} correct matches)</p>
                                        {(answer.prompts || []).map(p => {
                                            const isPairCorrect = p.userAnswerId === p.correctAnswerId;
                                            return (
                                                // --- MODIFIED: Added dark theme ---
                                                <div key={p.id} className="flex items-center text-slate-700 text-xs mt-1 dark:text-slate-300">
                                                    {isPairCorrect ? <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500 flex-shrink-0"/> : <XCircleIcon className="h-4 w-4 mr-1 text-red-500 flex-shrink-0"/>}
                                                    <span className="font-medium">{p.text}:</span>
                                                    <span className="mx-1">Matched "{p.userAnswerText}".</span>
                                                    {!isPairCorrect && <span className="font-semibold">(Correct: "{p.correctAnswerText}")</span>}
                                                </div>
                                            );
                                        })}
                                        {/* --- MODIFIED: Added dark theme --- */}
                                        {answer.explanation && <p className="text-xs italic mt-2 text-slate-600 dark:text-slate-400">Explanation: <ContentRenderer text={answer.explanation}/></p>}
                                    </>
                                /* MC, TF, ID Review */
                                ) : (
                                    <>
                                        {/* --- MODIFIED: Added dark theme --- */}
                                        <p className="text-slate-700 dark:text-slate-300">Your answer: <span className="font-semibold">{displayBoolean(String(answer.selectedAnswer ?? ''))}</span></p>
                                        {(answer.status === 'graded' || answer.status === 'pending_review') && !answer.isCorrect &&
                                            // --- MODIFIED: Added dark theme ---
                                            <p className="text-slate-700 dark:text-slate-300">Correct answer: <span className="font-semibold">{displayBoolean(String(answer.correctAnswer ?? ''))}</span></p>
                                        }
                                         {(answer.status === 'graded' || answer.status === 'pending_review') && answer.explanation &&
                                            // --- MODIFIED: Added dark theme ---
                                             <p className="text-xs italic mt-2 text-slate-600 dark:text-slate-400">Explanation: <ContentRenderer text={answer.explanation}/></p>
                                         }
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Back Button */}
            <button 
                onClick={() => {
                    setShowReview(false);
                    setSubmissionToReview(null); // Reset the review state
                }} 
                // --- MODIFIED: Added dark theme ---
                className="mt-6 w-full py-3 rounded-2xl bg-neumorphic-base text-blue-700 font-bold shadow-neumorphic active:shadow-neumorphic-inset transition-all dark:bg-neumorphic-base-dark dark:text-blue-400 dark:shadow-lg dark:active:shadow-neumorphic-inset-dark"
            >
                Back to Score
            </button>
        </div>
    );
}