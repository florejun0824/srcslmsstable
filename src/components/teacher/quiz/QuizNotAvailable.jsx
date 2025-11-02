import React from 'react';
import { useQuiz } from '../ViewQuizModal';
import { ClockIcon } from '@heroicons/react/24/solid';

/**
 * Renders the view shown to a student when a quiz is not yet available
 * or has expired.
 * Replaces the old renderNotAvailable() function.
 */
export default function QuizNotAvailable() {
    // Get the message from the context
    const { availabilityMessage } = useQuiz();

    return (
        // --- MODIFIED: Added dark theme ---
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
            {/* --- MODIFIED: Added dark theme --- */}
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                {/* --- MODIFIED: Added dark theme --- */}
                <ClockIcon className="h-20 w-20 text-slate-500 dark:text-slate-400" />
            </div>
            {/* --- MODIFIED: Added dark theme --- */}
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2 dark:text-slate-100">Quiz Not Available</h3>
            {/* --- MODIFIED: Added dark theme --- */}
            <p className="text-lg mt-2 text-slate-600 dark:text-slate-300">
                {availabilityMessage || 'This quiz is not currently available.'}
            </p>
        </div>
    );
}