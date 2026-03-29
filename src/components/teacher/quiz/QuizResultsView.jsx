import React, { useState, useEffect } from 'react';
import { useQuiz } from '../ViewQuizModal';
import { CheckCircleIcon, PencilSquareIcon, StarIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ClockIcon as ClockOutlineIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Confetti from 'react-confetti';

// --- SCORE COUNT-UP HOOK ---
function useCountUp(target, duration = 1200) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
}

// --- SVG PERCENTAGE RING ---
function ScoreRing({ score, total, size = 150 }) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        const timer = setTimeout(() => {
            setOffset(circumference - (pct / 100) * circumference);
        }, 200);
        return () => clearTimeout(timer);
    }, [pct, circumference]);

    const ringColor = pct >= 90 ? '#22C55E' : pct >= 75 ? '#3B82F6' : pct >= 50 ? '#F59E0B' : '#EF4444';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="currentColor" strokeWidth="8"
                className="text-slate-200 dark:text-white/10"
            />
            <circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={ringColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
            />
            <text
                x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
                fill={ringColor} fontSize="22" fontWeight="800" fontFamily="inherit"
            >
                {pct}%
            </text>
        </svg>
    );
}

// --- PERFORMANCE BADGE ---
function PerformanceBadge({ pct }) {
    const config =
        pct >= 90 ? { emoji: '🏆', label: 'Excellent!', bg: 'bg-yellow-50 dark:bg-yellow-400/10', text: 'text-yellow-700 dark:text-yellow-300' } :
        pct >= 75 ? { emoji: '⭐', label: 'Great Job!', bg: 'bg-blue-50 dark:bg-blue-400/10', text: 'text-blue-700 dark:text-blue-300' } :
        pct >= 50 ? { emoji: '👍', label: 'Good Effort!', bg: 'bg-emerald-50 dark:bg-emerald-400/10', text: 'text-emerald-700 dark:text-emerald-300' } :
                    { emoji: '💪', label: 'Keep Practicing!', bg: 'bg-rose-50 dark:bg-rose-400/10', text: 'text-rose-700 dark:text-rose-300' };

    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${config.bg} ${config.text} mb-4`}>
            <span className="text-base">{config.emoji}</span>
            <span>{config.label}</span>
        </div>
    );
}

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
    const pct = totalPossiblePoints > 0 ? Math.round((finalScore / totalPossiblePoints) * 100) : 0;

    const animatedScore = useCountUp(finalScore, 1200);

    const sortedSubmissions = [...allSubmissions].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0));

    useEffect(() => {
        if (latestSubmission?.status === 'graded') {
            setShowConfetti(true);
        }
    }, [latestSubmission]);

    const GlassContainer = ({ children, className = "" }) => (
        <div className={`relative overflow-y-auto p-5 sm:p-10 rounded-[24px] sm:rounded-[32px] 
            bg-white/60 dark:bg-black/40 
            backdrop-blur-2xl 
            border border-white/40 dark:border-white/10 
            shadow-2xl shadow-black/5 dark:shadow-black/50 
            text-center transition-all duration-500 ease-out max-h-[100dvh] sm:max-h-[85vh] ${className}`}>
            {children}
        </div>
    );

    const PrimaryButton = ({ onClick, children, className = "" }) => (
        <button onClick={onClick} className={`group relative w-full px-6 py-4 rounded-full 
            bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
            text-white font-bold text-lg tracking-tight
            shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5
            active:scale-[0.98] active:translate-y-0
            transition-all duration-300 flex items-center justify-center gap-2 ${className}`}>
            {children}
        </button>
    );

    const SecondaryGlassButton = ({ onClick, children }) => (
        <button onClick={onClick} className="group flex items-center justify-between w-full px-5 py-4 rounded-2xl 
            bg-white/80 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20
            border border-gray-200 dark:border-white/5
            text-gray-800 dark:text-gray-100 font-medium text-base
            backdrop-blur-md transition-all duration-200 active:scale-[0.98] shadow-sm">
            {children}
            <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white transition-colors" />
        </button>
    );

    const StatusIcon = ({ status }) => {
        const isPending = status === 'pending_ai_grading' || status === 'pending_review';
        return (
            <div className={`mx-auto h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center rounded-full 
                ${isPending 
                    ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]' 
                    : 'bg-green-50 text-green-500 dark:bg-green-500/10 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]'
                } backdrop-blur-md mb-4 border border-white/40 dark:border-white/20`}>
                {isPending ? <ClockIcon className="h-8 w-8 sm:h-10 sm:w-10" /> : <CheckCircleIcon className="h-8 w-8 sm:h-10 sm:w-10" />}
            </div>
        );
    };

    const isPending = submissionStatus === 'pending_ai_grading' || submissionStatus === 'pending_review';

    return (
        <GlassContainer>
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} colors={['#22C55E', '#3B82F6', '#EAB308']} width={window.innerWidth} height={window.innerHeight} />}

            <StatusIcon status={submissionStatus} />

            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                {isPending ? "Submission Received" : "Quiz Completed"}
            </h3>

            {/* Score Ring + Animated Counter */}
            <div className="mt-6 mb-2 flex flex-col items-center">
                {!isPending ? (
                    <>
                        <ScoreRing score={finalScore} total={totalPossiblePoints} size={150} />
                        <div className="mt-3 flex items-baseline justify-center gap-1 text-gray-900 dark:text-white">
                            <span className="text-6xl sm:text-7xl font-black tracking-tighter tabular-nums">
                                {animatedScore}
                            </span>
                            <span className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500">
                                /{totalPossiblePoints}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 mb-3">
                            Total Score
                        </p>
                        <PerformanceBadge pct={pct} />
                    </>
                ) : (
                    <div className="mt-4 mb-8">
                        <div className="flex items-baseline justify-center gap-1 text-gray-900 dark:text-white">
                            <span className="text-7xl sm:text-8xl font-black tracking-tighter">{finalScore}</span>
                            <span className="text-2xl sm:text-3xl font-bold text-gray-400 dark:text-gray-500">/{totalPossiblePoints}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Total Score</p>
                    </div>
                )}
            </div>

            {xpToShow > 0 && (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full 
                    bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20 
                    shadow-[0_0_20px_-5px_rgba(234,179,8,0.2)] mb-6">
                    <StarIcon className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">+{xpToShow} XP Earned</span>
                </div>
            )}

            {isPending && (
                <div className={`mt-2 mb-8 p-4 rounded-2xl text-left flex items-start gap-4 border shadow-sm
                    ${submissionStatus === 'pending_review' 
                        ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-200' 
                        : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200'
                    }`}>
                    <div className={`p-2 rounded-xl shrink-0 ${submissionStatus === 'pending_review' ? 'bg-orange-100 dark:bg-orange-500/20' : 'bg-blue-100 dark:bg-blue-500/20'}`}>
                        {submissionStatus === 'pending_review' ? <PencilSquareIcon className="h-6 w-6" /> : <ClockOutlineIcon className="h-6 w-6" />}
                    </div>
                    <div>
                        <p className="font-bold text-sm sm:text-base">
                            {submissionStatus === 'pending_review' ? 'Teacher Review Required' : 'Grading in Progress'}
                        </p>
                        <p className="text-xs sm:text-sm opacity-80 mt-1 leading-relaxed">
                            {submissionStatus === 'pending_review' 
                                ? 'Some items need manual checking. Your score may update later.' 
                                : 'Essays are being reviewed. Final score pending.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {attemptsLeft > 0 ? (
                    <>
                        <PrimaryButton onClick={handleStartNewAttempt}>
                            <ArrowPathIcon className="h-5 w-5" />
                            Start New Attempt
                        </PrimaryButton>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                        </p>
                    </>
                ) : (
                    <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-bold text-sm">
                        No attempts remaining for this quiz.
                    </div>
                )}
            </div>

            {sortedSubmissions.length > 0 && (
                <div className="mt-10 pt-8 border-t border-gray-200 dark:border-white/10 pb-6 sm:pb-0">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 text-left px-2">
                        Attempt History
                    </p>
                    <div className="space-y-3">
                        {sortedSubmissions.map((sub) => (
                            <SecondaryGlassButton
                                key={sub.id || sub.attemptNumber}
                                onClick={() => {
                                    setSubmissionToReview(sub);
                                    setShowReview(true);
                                }}
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-gray-900 dark:text-white">Attempt {sub.attemptNumber}</span>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">
                                        {sub.status === 'pending_ai_grading' ? 'Grading...' : sub.status === 'pending_review' ? 'In Review' : 'Graded'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-black text-lg ${
                                        !sub.score ? 'text-gray-400' : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {sub.score ?? '-'} <span className="text-sm font-medium text-gray-400">/ {sub.totalItems ?? '?'}</span>
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