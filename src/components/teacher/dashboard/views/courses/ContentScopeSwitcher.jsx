// src/components/teacher/dashboard/views/courses/ContentScopeSwitcher.jsx
import React, { memo } from 'react';
import { UsersIcon as LearnerIcon, AcademicCapIcon as TeacherIcon } from '@heroicons/react/24/outline';

const ContentScopeSwitcher = memo(({ activeGroup, onSwitch }) => {
    const isLearner = activeGroup === 'learner';
    return (
        <div className="flex p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-zinc-200 dark:border-white/10 rounded-full h-10 md:h-12 items-center shadow-sm">
            <button onClick={() => onSwitch('learner')} className={`px-4 md:px-5 h-full rounded-full text-xs md:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 flex-1 md:flex-none ${isLearner ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md scale-100' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-95'}`}>
                <LearnerIcon className="w-4 h-4 md:w-5 md:h-5" /> Learner
            </button>
            <button onClick={() => onSwitch('teacher')} className={`px-4 md:px-5 h-full rounded-full text-xs md:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 flex-1 md:flex-none ${!isLearner ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md scale-100' : 'text-zinc-500 dark:text-slate-400 hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-95'}`}>
                <TeacherIcon className="w-4 h-4 md:w-5 md:h-5" /> Teacher
            </button>
        </div>
    );
});

export default ContentScopeSwitcher;
