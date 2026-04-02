// src/components/teacher/dashboard/views/courses/Breadcrumbs.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

const Breadcrumbs = ({ contentGroup, categoryName, subjectTitle, unitTitle, subjectId }) => (
    <nav className="inline-flex items-center gap-1.5 md:gap-2 max-w-full overflow-x-auto hide-scrollbar pb-2 md:pb-0">
        
        <Link 
            to="/dashboard/courses" 
            className="p-2 md:p-2.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 md:backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all duration-300 active:scale-95 flex-shrink-0 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
            <HomeIcon className="w-4 h-4 md:w-4 md:h-4 stroke-[2.5]" />
        </Link>
        
        <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 dark:text-slate-600 stroke-[3] flex-shrink-0" />

        <Link 
            to={`/dashboard/courses/${contentGroup}`} 
            className="px-3.5 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-100/80 dark:bg-slate-800/80 md:backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md text-[11px] sm:text-xs md:text-sm font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 capitalize transition-all duration-300 active:scale-95 whitespace-nowrap flex-shrink-0"
        >
            {contentGroup}
        </Link>
        
        <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 dark:text-slate-600 stroke-[3] flex-shrink-0" />

        <Link 
            to={`/dashboard/courses/${contentGroup}/${categoryName}`} 
            className="px-3.5 md:px-4 py-1.5 md:py-2 rounded-full bg-slate-100/80 dark:bg-slate-800/80 md:backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md text-[11px] sm:text-xs md:text-sm font-bold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-all duration-300 active:scale-95 whitespace-nowrap max-w-[120px] md:max-w-[180px] truncate flex-shrink-0"
        >
            {decodeURIComponent(categoryName).replace(/\(.*\)/, '')}
        </Link>

        {subjectTitle && (
            <>
                <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 dark:text-slate-600 stroke-[3] flex-shrink-0" />
                {unitTitle && subjectId ? (
                    <Link 
                        to={`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`} 
                        className="px-3.5 md:px-4 py-1.5 md:py-2 rounded-full text-[11px] sm:text-xs md:text-sm font-bold bg-slate-100/80 dark:bg-slate-800/80 md:backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-all duration-300 active:scale-95 whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0"
                    >
                        {subjectTitle}
                    </Link>
                ) : (
                    <span className={`px-3.5 md:px-4 py-1.5 md:py-2 rounded-full text-[11px] sm:text-xs md:text-sm font-black whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0 shadow-inner border ${!unitTitle 
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/60 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' 
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                        {subjectTitle}
                    </span>
                )}
            </>
        )}

        {unitTitle && (
            <>
                <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 dark:text-slate-600 stroke-[3] flex-shrink-0" />
                <span className="px-3.5 md:px-4 py-1.5 md:py-2 rounded-full text-[11px] sm:text-xs md:text-sm font-black bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/30 shadow-inner text-rose-700 dark:text-rose-300 whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0">
                    {unitTitle}
                </span>
            </>
        )}
    </nav>
);

export default Breadcrumbs;