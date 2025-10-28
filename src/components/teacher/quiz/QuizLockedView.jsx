import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';

/**
 * Renders the view shown to a student when their quiz is locked.
 * Replaces the old renderSystemLockedView() function.
 */
export default function QuizLockedView() {
    return (
        <div className="text-center p-8 bg-neumorphic-base rounded-3xl shadow-neumorphic">
            <div className="mx-auto inline-block p-4 rounded-full bg-neumorphic-base shadow-neumorphic-inset mb-5">
                <LockClosedIcon className="h-20 w-20 text-slate-700" />
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-2">Quiz Locked</h3>
            <p className="text-lg mt-2 text-slate-600">This quiz has been locked due to multiple warnings.</p>
            <p className="text-md mt-1 text-slate-600">Please contact your teacher to have it unlocked.</p>
        </div>
    );
}