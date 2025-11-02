import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';

/**
 * Renders the view shown to a student when their quiz is locked.
 * Replaces the old renderSystemLockedView() function.
 */
export default function QuizLockedView() {
    return (
        // --- MODIFIED: Added dark theme ---
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
            {/* --- MODIFIED: Added dark theme --- */}
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                {/* --- MODIFIED: Added dark theme --- */}
                <LockClosedIcon className="h-20 w-20 text-slate-700 dark:text-slate-300" />
            </div>
            {/* --- MODIFIED: Added dark theme --- */}
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2 dark:text-slate-100">Quiz Locked</h3>
            {/* --- MODIFIED: Added dark theme --- */}
            <p className="text-lg mt-2 text-slate-600 dark:text-slate-300">This quiz has been locked due to multiple warnings.</p>
            {/* --- MODIFIED: Added dark theme --- */}
            <p className="text-md mt-1 text-slate-600 dark:text-slate-300">Please contact your teacher to have it unlocked.</p>
        </div>
    );
}