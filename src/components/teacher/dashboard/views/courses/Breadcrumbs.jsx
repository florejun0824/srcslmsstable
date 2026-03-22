// src/components/teacher/dashboard/views/courses/Breadcrumbs.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const Breadcrumbs = ({ contentGroup, categoryName, subjectTitle, unitTitle, subjectId }) => (
    <nav className="inline-flex items-center gap-1.5 md:gap-2 max-w-full overflow-x-auto hide-scrollbar pb-2 md:pb-0">
        <Link to="/dashboard/courses" className="p-2 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 transition-all shadow-sm hover:shadow active:scale-95 flex-shrink-0">
            <HomeIcon className="w-4 h-4 text-zinc-600 dark:text-slate-300" />
        </Link>
        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500 flex-shrink-0" />

        <Link to={`/dashboard/courses/${contentGroup}`} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm hover:shadow text-xs md:text-sm font-bold text-zinc-700 dark:text-slate-200 capitalize transition-all active:scale-95 whitespace-nowrap flex-shrink-0">
            {contentGroup}
        </Link>
        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500 flex-shrink-0" />

        <Link to={`/dashboard/courses/${contentGroup}/${categoryName}`} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm hover:shadow text-xs md:text-sm font-bold text-zinc-700 dark:text-slate-200 whitespace-nowrap max-w-[120px] md:max-w-[150px] truncate transition-all active:scale-95 flex-shrink-0">
            {decodeURIComponent(categoryName).replace(/\(.*\)/, '')}
        </Link>

        {subjectTitle && (
            <>
                <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500 flex-shrink-0" />
                {unitTitle && subjectId ? (
                    <Link to={`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-indigo-50/80 dark:bg-indigo-500/10 backdrop-blur-sm border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0">
                        {subjectTitle}
                    </Link>
                ) : (
                    <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold ${!unitTitle ? 'bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-100/50 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-slate-200'} backdrop-blur-sm shadow-sm whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0`}>
                        {subjectTitle}
                    </span>
                )}
            </>
        )}

        {unitTitle && (
            <>
                <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-500 flex-shrink-0" />
                <span className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-rose-50/80 dark:bg-rose-500/10 backdrop-blur-sm border border-rose-100/50 dark:border-rose-500/20 shadow-sm text-rose-700 dark:text-rose-300 whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0">
                    {unitTitle}
                </span>
            </>
        )}
    </nav>
);

export default Breadcrumbs;
