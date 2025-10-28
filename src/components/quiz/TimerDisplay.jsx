import React from 'react';
import { ClockIcon } from '@heroicons/react/24/solid';

/**
 * Renders a countdown timer for exams.
 * @param {object} props
 * @param {number|null} props.timeRemaining - Time remaining in seconds.
 * @param {object} props.quizSettings - The quiz.settings object.
 * @param {boolean} props.isTeacherView - Hides timer for teachers.
 * @param {boolean} props.loading - Hides timer while loading.
 * @param {boolean} props.isLocked - Hides timer if locked.
 * @param {boolean} props.isAvailable - Hides timer if not available.
 * @param {number|null} props.score - Hides timer if quiz is scored.
 * @param {boolean} props.hasSubmitted - Hides timer if submitted.
 */
export default function TimerDisplay({
    timeRemaining,
    quizSettings,
    isTeacherView,
    loading,
    isLocked,
    isAvailable,
    score,
    hasSubmitted
}) {
    const isExam = quizSettings?.maxAttempts === 1;
    const hasEndDate = quizSettings?.availableUntil;

    if (
        timeRemaining === null ||
        !isExam ||
        !hasEndDate ||
        isTeacherView ||
        score !== null ||
        loading ||
        isLocked ||
        !isAvailable ||
        hasSubmitted
    ) {
        return null;
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const isLowTime = timeRemaining <= 60;

    return (
        <div
            className={`flex items-center gap-2 ${
                isLowTime
                    ? 'bg-red-100 text-red-800'
                    : 'bg-neumorphic-base text-slate-800'
            } px-3 py-1.5 rounded-full ${
                isLowTime ? 'shadow-inner' : 'shadow-neumorphic-inset'
            } flex-shrink-0 self-start sm:self-center`}
            role="timer"
            aria-live="polite"
        >
            <ClockIcon
                className={`w-5 h-5 ${
                    isLowTime ? 'text-red-600' : 'text-slate-600'
                }`}
            />
            <span className="text-sm sm:text-base font-semibold tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
        </div>
    );
}