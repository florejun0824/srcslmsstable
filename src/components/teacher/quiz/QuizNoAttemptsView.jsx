import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import { LockClosedIcon, DocumentCheckIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

/**
 * macOS 26 Design Overhaul
 * Features: Ultra-Glassmorphism, Vivid Blurs, System Fonts, Adaptive Dark Mode
 */
export default function QuizNoAttemptsView() {
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

    // Sort submissions by attempt number
    const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

    return (
        <div className="relative overflow-hidden p-6 sm:p-10 rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-2xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            text-center transition-all duration-500 ease-out">

            {/* Header Status */}
            <div className="flex flex-col items-center mb-8">
                <div className="h-20 w-20 flex items-center justify-center rounded-full 
                    bg-red-500/10 text-red-500 dark:text-red-400 mb-4 backdrop-blur-md border border-red-500/20">
                    <LockClosedIcon className="h-10 w-10" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    No Attempts Left
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                    You have used all {maxAttempts} attempts.
                </p>
            </div>
            
            {/* Final Score Display */}
            {lastSub && (
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-white/50 to-white/10 dark:from-white/5 dark:to-transparent border border-white/40 dark:border-white/5 shadow-sm backdrop-blur-md">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                        Final Score
                    </p>
                    <div className="flex items-baseline justify-center gap-1 text-gray-900 dark:text-white">
                        <span className={`text-5xl font-light tracking-tighter ${
                             lastStatus === 'pending_ai_grading' || lastStatus === 'pending_review' ? "text-blue-600 dark:text-blue-400" : ""
                        }`}>
                            {lastScore}
                        </span>
                        <span className="text-2xl text-gray-400 dark:text-gray-600">
                            /{lastTotal}
                        </span>
                    </div>
                    
                    {(lastStatus === 'pending_ai_grading' || lastStatus === 'pending_review') && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                            <DocumentCheckIcon className="h-3.5 w-3.5" />
                            {lastStatus === 'pending_review' ? "Needs Manual Review" : "Pending AI Grading"}
                        </div>
                    )}
                </div>
            )}
            
            {/* Review Past Attempts List */}
            {sortedSubmissions.length > 0 && (
                <div className="text-left animate-in fade-in slide-in-from-bottom-4">
                    <p className="px-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                        History
                    </p>
                    <div className="space-y-2">
                        {sortedSubmissions.map((sub) => (
                            <button
                                key={sub.id || sub.attemptNumber}
                                onClick={() => {
                                    setSubmissionToReview(sub);
                                    setShowReview(true);
                                }}
                                className="group w-full p-4 rounded-2xl flex items-center justify-between
                                    bg-white/40 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10
                                    border border-white/50 dark:border-white/5
                                    backdrop-blur-sm transition-all duration-200 active:scale-[0.98]"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        Attempt {sub.attemptNumber}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {sub.status === 'pending_ai_grading' ? 'Grading...' : sub.status === 'pending_review' ? 'In Review' : 'Graded'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-700 dark:text-gray-300 bg-black/5 dark:bg-white/10 px-2 py-1 rounded-lg text-sm">
                                        {sub.score ?? '-'} / {sub.totalItems ?? '?'}
                                    </span>
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}