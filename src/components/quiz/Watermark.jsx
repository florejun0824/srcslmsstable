import React from 'react';

/**
 * Renders an anti-screen-capture watermark over the quiz content.
 * @param {object} props
 * @param {object} props.userProfile - The current user's profile.
 * @param {object} props.quizSettings - The quiz.settings object.
 * @param {boolean} props.isTeacherView - Hides watermark for teachers.
 */
export default function Watermark({ userProfile, quizSettings, isTeacherView }) {
    if (isTeacherView || !userProfile || !(quizSettings?.preventScreenCapture ?? false)) {
        return null;
    }

    const fullName = `${userProfile.firstName} ${userProfile.lastName}`;
    const watermarkText = Array(30).fill(fullName).join(' \u00A0 \u00A0 ');

    return (
        <div aria-hidden="true" className="absolute inset-0 z-10 overflow-hidden pointer-events-none select-none">
            <div className="absolute -top-1/4 -left-1/4 w-[200%] h-[200%] text-black/5 dark:text-white/5 text-xl font-bold whitespace-nowrap transform -rotate-[30deg] opacity-50">
                {watermarkText} {watermarkText}
            </div>
            <div className="absolute -top-1/4 -left-1/4 w-[200%] h-[200%] text-black/5 dark:text-white/5 text-xl font-bold whitespace-nowrap transform rotate-[45deg] opacity-50">
                {watermarkText} {watermarkText}
            </div>
        </div>
    );
}