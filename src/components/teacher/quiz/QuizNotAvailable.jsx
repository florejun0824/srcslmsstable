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
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <ClockIcon className="h-20 w-20 text-slate-500" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Not Available</h3>
            <p className="text-lg mt-2 text-slate-600">
                {availabilityMessage || 'This quiz is not currently available.'}
            </p>
        </div>
    );
}