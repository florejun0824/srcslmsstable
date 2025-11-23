import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import ContentRenderer from '../ContentRenderer';
import { ClockIcon as ClockOutlineIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, PencilSquareIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

/**
 * macOS 26 Design Overhaul
 * Features: Ultra-Glassmorphism, Vivid Blurs, System Fonts, Adaptive Dark Mode
 */
export default function QuizReviewView() {
    const {
        submissionToReview,
        setShowReview,
        setSubmissionToReview,
        quiz,
    } = useQuiz();

    const answersToReview = submissionToReview?.answers || [];

    // --- Shared Component Styles ---
    const GlassContainer = ({ children, className = "" }) => (
        <div className={`relative overflow-hidden p-6 sm:p-8 rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-2xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            transition-all duration-500 ease-out flex flex-col max-h-[85vh] ${className}`}>
            {children}
        </div>
    );

    const SecondaryGlassButton = ({ onClick, children }) => (
        <button onClick={onClick} className="group flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-full 
            bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10
            border border-white/50 dark:border-white/5
            text-gray-700 dark:text-gray-200 font-semibold text-lg tracking-tight
            backdrop-blur-sm transition-all duration-200 active:scale-[0.98] shadow-sm">
            <ArrowLeftIcon className="h-5 w-5 opacity-60 group-hover:-translate-x-1 transition-transform" />
            {children}
        </button>
    );

    if (answersToReview.length === 0 || !submissionToReview) {
         return (
            <GlassContainer>
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                    <ExclamationTriangleIcon className="h-12 w-12 mb-3 opacity-50" />
                    <p className="font-medium">No submission data available.</p>
                    <button onClick={() => setShowReview(false)} className="mt-4 text-blue-500 font-bold hover:underline">Go Back</button>
                </div>
            </GlassContainer>
         );
    }

    // Calculate numbering based on points
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

    const displayBoolean = (val) => {
        const strVal = String(val).toLowerCase();
        if (quiz.language === 'Filipino') return strVal === 'true' ? 'Tama' : (strVal === 'false' ? 'Mali' : strVal);
        return strVal === 'true' ? 'True' : (strVal === 'false' ? 'False' : strVal);
    };

    return (
        <GlassContainer>
            {/* --- Header Section (Sticky) --- */}
            <div className="flex-shrink-0 mb-6 text-center border-b border-gray-200/50 dark:border-white/10 pb-4">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                    Attempt Review
                </h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Attempt #{submissionToReview.attemptNumber}
                </p>
                
                {/* Score Pill */}
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/5">
                    <span className="font-bold text-gray-900 dark:text-white">
                        {submissionToReview.score ?? 0} <span className="text-gray-400 font-normal">/ {reviewNumbering.totalPoints}</span>
                    </span>
                    {submissionToReview.status === 'pending_ai_grading' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-blue-500">
                            <ClockOutlineIcon className="h-3 w-3"/> AI Grading...
                        </span>
                    )}
                    {submissionToReview.status === 'pending_review' && (
                        <span className="flex items-center gap-1 text-xs font-bold text-orange-500">
                            <PencilSquareIcon className="h-3 w-3"/> Teacher Review
                        </span>
                    )}
                </div>
            </div>

            {/* --- Scrollable List --- */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-2 space-y-4 custom-scrollbar pb-4">
                {answersToReview.map((answer, index) => {
                    const startNum = reviewNumbering.starts[index];
                    const pointsValue = Number(answer.points) || 1;
                    const endNum = startNum + pointsValue - 1;
                    const numLabel = pointsValue <= 1 ? `Item ${startNum}` : `Items ${startNum}-${endNum}`;
                    const itemScore = answer.score ?? 0;

                    // Determine Card Style based on Status
                    let cardStyle = "bg-white/40 dark:bg-white/5 border-white/50 dark:border-white/5"; // Default Neutral
                    let statusIcon = <InformationCircleIcon className="h-5 w-5 text-gray-400" />;
                    let statusColorText = "text-gray-500";

                    if (answer.status === 'pending_ai_grading') {
                        cardStyle = "bg-blue-500/5 border-blue-500/20 dark:bg-blue-500/10";
                        statusIcon = <ClockOutlineIcon className="h-5 w-5 text-blue-500" />;
                        statusColorText = "text-blue-600 dark:text-blue-400";
                    } else if (answer.status === 'grading_failed' || answer.status === 'pending_review') {
                        cardStyle = "bg-orange-500/5 border-orange-500/20 dark:bg-orange-500/10";
                        statusIcon = <PencilSquareIcon className="h-5 w-5 text-orange-500" />;
                        statusColorText = "text-orange-600 dark:text-orange-400";
                    } else if (answer.status === 'graded') {
                         if (itemScore === answer.points) { 
                             cardStyle = "bg-green-500/5 border-green-500/20 dark:bg-green-500/10"; 
                             statusIcon = <CheckCircleIcon className="h-5 w-5 text-green-500" />; 
                             statusColorText = "text-green-600 dark:text-green-400";
                         }
                         else if (itemScore > 0) { 
                             cardStyle = "bg-yellow-500/5 border-yellow-500/20 dark:bg-yellow-500/10"; 
                             statusIcon = <CheckCircleIcon className="h-5 w-5 text-yellow-500" />; 
                             statusColorText = "text-yellow-600 dark:text-yellow-400";
                         }
                         else { 
                             cardStyle = "bg-red-500/5 border-red-500/20 dark:bg-red-500/10"; 
                             statusIcon = <XCircleIcon className="h-5 w-5 text-red-500" />; 
                             statusColorText = "text-red-600 dark:text-red-400";
                         }
                    }

                    return (
                        <div key={index} className={`p-5 rounded-2xl backdrop-blur-sm border shadow-sm ${cardStyle} transition-all hover:scale-[1.01]`}>
                            
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    {numLabel}
                                </span>
                                <span className={`text-xs font-bold ${statusColorText}`}>
                                    {answer.status === 'graded' || answer.status === 'pending_review' ? `${itemScore} / ` : ''}{answer.points} pts
                                </span>
                            </div>

                            {/* Question */}
                            <div className="flex gap-3 mb-4">
                                <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>
                                <div className="font-semibold text-gray-900 dark:text-white text-base leading-relaxed">
                                    <ContentRenderer text={answer.questionText || "Question text missing"} />
                                </div>
                            </div>

                            {/* Answer Section */}
                            <div className="pl-8 space-y-3">
                                {/* Essay Type */}
                                {answer.questionType === 'essay' ? (
                                    <>
                                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-gray-700 dark:text-gray-300 italic text-sm">
                                            <p className='not-italic font-bold text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase'>Your Answer</p>
                                            <ContentRenderer text={answer.selectedAnswer || "(No answer provided)"} />
                                        </div>
                                        
                                        {/* AI Feedback Box */}
                                        {answer.status === 'graded' && answer.aiGradingResult && (
                                            <div className="mt-2 p-3 rounded-xl bg-green-100/50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/20 text-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-green-800 dark:text-green-300">AI Assessment</span>
                                                    <span className="text-xs font-bold bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-md">
                                                        {itemScore}/{answer.points}
                                                    </span>
                                                </div>
                                                {(answer.aiGradingResult.scores || []).map((crit, idx) => (
                                                     <div key={idx} className="mb-2 last:mb-0">
                                                        <p className="font-semibold text-green-900 dark:text-green-100 text-xs">{crit.criteria} <span className="font-normal opacity-75">({crit.pointsAwarded}pts)</span></p>
                                                        <p className="text-xs text-green-800/80 dark:text-green-200/70">{crit.justification}</p>
                                                    </div>
                                                ))}
                                                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-500/20">
                                                    <p className="text-xs text-green-900 dark:text-green-100 italic">"{answer.aiGradingResult.overallFeedback}"</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                /* Matching Type */
                                ) : answer.questionType === 'matching-type' ? (
                                    <div className="space-y-2">
                                        {(answer.prompts || []).map(p => {
                                            const isPairCorrect = p.userAnswerId === p.correctAnswerId;
                                            return (
                                                <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg border ${isPairCorrect ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {isPairCorrect ? <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0"/> : <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0"/>}
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{p.text}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end text-xs">
                                                        <span className="font-bold text-gray-900 dark:text-white">{p.userAnswerText}</span>
                                                        {!isPairCorrect && <span className="text-green-600 dark:text-green-400">Correct: {p.correctAnswerText}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                /* Standard Types (MC, TF, ID) */
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <div className="flex-1 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Your Answer</p>
                                                <p className="font-semibold text-gray-800 dark:text-gray-100">{displayBoolean(String(answer.selectedAnswer ?? ''))}</p>
                                            </div>
                                            {(answer.status === 'graded' || answer.status === 'pending_review') && !answer.isCorrect && (
                                                <div className="flex-1 p-2 rounded-lg bg-green-100/50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/20">
                                                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-0.5">Correct Answer</p>
                                                    <p className="font-semibold text-green-900 dark:text-green-100">{displayBoolean(String(answer.correctAnswer ?? ''))}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Explanation Dropdown */}
                                {(answer.status === 'graded' || answer.status === 'pending_review') && answer.explanation && (
                                    <div className="mt-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                        <div>
                                            <span className="font-bold text-blue-700 dark:text-blue-300 block mb-1">Explanation</span>
                                            <ContentRenderer text={answer.explanation}/>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- Footer (Sticky) --- */}
            <div className="flex-shrink-0 pt-6 mt-2 border-t border-gray-200/50 dark:border-white/10">
                <SecondaryGlassButton 
                    onClick={() => {
                        setShowReview(false);
                        setSubmissionToReview(null);
                    }} 
                >
                    Back to Results
                </SecondaryGlassButton>
            </div>
        </GlassContainer>
    );
}