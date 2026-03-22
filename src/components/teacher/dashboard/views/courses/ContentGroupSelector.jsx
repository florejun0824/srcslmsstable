// src/components/teacher/dashboard/views/courses/ContentGroupSelector.jsx
import React, { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UsersIcon as LearnerIcon, AcademicCapIcon as TeacherIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { MATERIAL_STYLES, getSchoolLogo } from './coursesStyles';

const ContentGroupSelector = memo((props) => {
    const { userProfile, setActiveSubject, handleBackToCategoryList } = props;
    
    useEffect(() => { 
        if (setActiveSubject) setActiveSubject(null); 
        if (handleBackToCategoryList) handleBackToCategoryList(); 
    }, [setActiveSubject, handleBackToCategoryList]);

    const schoolLogoUrl = userProfile?.schoolId ? getSchoolLogo(userProfile.schoolId) : '/logo.png';
    const firstName = userProfile?.firstName || 'Back';

    const SelectionCard = ({ to, title, subtitle, themeClass, icon: Icon, borderClass, gradientClass }) => (
        <Link to={to} className={`group relative overflow-hidden rounded-[32px] md:rounded-[40px] p-6 md:p-10 h-[280px] md:h-[340px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shadow-lg border backdrop-blur-md ${themeClass} ${borderClass}`}>
            {/* Background mesh glow */}
            <div className={`absolute -right-16 -bottom-16 w-48 h-48 md:w-64 md:h-64 rounded-full blur-3xl opacity-50 group-hover:scale-150 group-hover:opacity-70 transition-all duration-700 ${gradientClass}`}></div>
            <div className={`absolute -left-16 -top-16 w-32 h-32 md:w-48 md:h-48 rounded-full blur-3xl opacity-30 group-hover:scale-125 transition-transform duration-700 ${gradientClass}`}></div>

            <div className="relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[28px] flex items-center justify-center mb-6 md:mb-8 bg-white/10 dark:bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/20 dark:border-white/10 group-hover:rotate-3 group-hover:scale-110 transition-all duration-500 backdrop-blur-md">
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" />
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 md:mb-3 text-white drop-shadow-sm">{title}</h2>
                <p className="text-sm md:text-lg font-medium text-white/90 max-w-sm leading-relaxed">{subtitle}</p>
            </div>

            <div className="relative z-10 flex items-center">
                <div className="px-5 py-2.5 md:px-6 md:py-3 rounded-[20px] bg-white/10 font-bold text-white text-xs md:text-sm group-hover:bg-white/25 transition-all duration-300 flex items-center gap-2 border border-white/30 backdrop-blur-md shadow-sm group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] group-hover:pr-4 md:group-hover:pr-5">
                    Enter Portal 
                    <div className="w-5 h-5 flex items-center justify-center translate-x-0 group-hover:translate-x-1.5 transition-transform duration-300">
                         <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                         </svg>
                    </div>
                </div>
            </div>
        </Link>
    );

    return (
        <div className={`min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center p-4 md:p-6 ${MATERIAL_STYLES.bgScaffold} relative overflow-hidden bg-gradient-to-br from-slate-50 to-zinc-100/50 dark:from-slate-950 dark:to-slate-900 border-none sm:border-solid`}>
            {/* Ambient background glow */}
            <div className="absolute top-[10%] left-[15%] w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-[10%] right-[15%] w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>

            <div className="mb-8 md:mb-12 text-center animate-spring-up relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 mb-5 md:mb-6 rounded-[28px] md:rounded-[32px] bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center p-2 border border-white/50 dark:border-white/20 hover:scale-105 hover:rotate-3 transition-transform duration-500">
                    <img src={schoolLogoUrl} alt="Logo" className="w-full h-full object-contain rounded-[20px] md:rounded-[24px]" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight mb-3 md:mb-4 px-4 drop-shadow-sm">
                    Welcome {firstName}
                </h1>
                <p className="text-base md:text-xl text-slate-500 dark:text-slate-400 font-medium tracking-wide">Choose your workspace to begin</p>
            </div>
            
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 animate-spring-up relative z-10 px-2 sm:px-0" style={{ animationDelay: '0.1s' }}>
                <SelectionCard
                    to="learner"
                    title="Learner"
                    subtitle="Access your assignments, modules, and student resources."
                    themeClass="bg-gradient-to-br from-[#059669] via-[#047857] to-[#064e3b]"
                    borderClass="border-emerald-400/30"
                    gradientClass="bg-emerald-300/40"
                    icon={LearnerIcon}
                />
                <SelectionCard
                    to="teacher"
                    title="Teacher"
                    subtitle="Manage curriculum, grading tools, and student tracking."
                    themeClass="bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81]"
                    borderClass="border-indigo-400/30"
                    gradientClass="bg-indigo-300/40"
                    icon={TeacherIcon}
                />
            </div>
        </div>
    );
});

export default ContentGroupSelector;
