// src/components/teacher/dashboard/views/courses/SubjectList.jsx
import React, { memo, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    PlusCircleIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    CalculatorIcon,
    BeakerIcon,
    MusicalNoteIcon,
    ComputerDesktopIcon,
    PencilIcon,
    HeartIcon,
    GlobeAsiaAustraliaIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import Breadcrumbs from './Breadcrumbs';
import SkeletonGrid from './SkeletonGrid';

const SubjectList = memo((props) => {
    const { 
        courses, handleInitiateDelete, onAddSubjectClick, 
        setActiveSubject, handleCategoryClick, loading, 
        userProfile, handleOpenEditSubject 
    } = props;
    
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const decodedCategoryName = useMemo(() => decodeURIComponent(categoryName), [categoryName]);

    useEffect(() => { 
        if (setActiveSubject) setActiveSubject(null); 
        if (handleCategoryClick) handleCategoryClick(decodedCategoryName); 
    }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        const userSchoolId = userProfile?.schoolId || 'srcs_main';
        const lowerSearch = searchTerm.toLowerCase();

        return courses.filter(c =>
            c.category === decodedCategoryName &&
            (c.schoolId === 'global' || !c.schoolId || c.schoolId === userSchoolId) &&
            c.title.toLowerCase().includes(lowerSearch)
        ).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    }, [courses, decodedCategoryName, searchTerm, userProfile?.schoolId]);

    // Ultra Premium Theme Mappings (Upgraded with glowing gradients)
    const getMaterialTheme = (title) => {
        const t = title.toLowerCase();

        if (t.includes('english') || t.includes('filipino') || t.includes('reading')) return {
            iconText: "text-rose-500", iconBg: "bg-rose-50 dark:bg-rose-500/20 shadow-inner", glow: "from-rose-300 to-pink-400", hoverBorder: "hover:border-rose-400/50", icon: PencilIcon
        };
        if (t.includes('math') || t.includes('algebra')) return {
            iconText: "text-blue-500", iconBg: "bg-blue-50 dark:bg-blue-500/20 shadow-inner", glow: "from-blue-300 to-indigo-400", hoverBorder: "hover:border-blue-400/50", icon: CalculatorIcon
        };
        if (t.includes('science') || t.includes('physics') || t.includes('biology')) return {
            iconText: "text-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-500/20 shadow-inner", glow: "from-emerald-300 to-teal-400", hoverBorder: "hover:border-emerald-400/50", icon: BeakerIcon
        };
        if (t.includes('mapeh') || t.includes('music') || t.includes('art') || t.includes('pe')) return {
            iconText: "text-cyan-500", iconBg: "bg-cyan-50 dark:bg-cyan-500/20 shadow-inner", glow: "from-cyan-300 to-blue-400", hoverBorder: "hover:border-cyan-400/50", icon: MusicalNoteIcon
        };
        if (t.includes('csl') || t.includes('religious') || t.includes('values') || t.includes('esp')) return {
            iconText: "text-amber-500", iconBg: "bg-amber-50 dark:bg-amber-500/20 shadow-inner", glow: "from-amber-300 to-orange-400", hoverBorder: "hover:border-amber-400/50", icon: HeartIcon
        };
        if (t.includes('araling') || t.includes('history') || t.includes('social') || t.includes('ap')) return {
            iconText: "text-fuchsia-500", iconBg: "bg-fuchsia-50 dark:bg-fuchsia-500/20 shadow-inner", glow: "from-fuchsia-300 to-purple-400", hoverBorder: "hover:border-fuchsia-400/50", icon: GlobeAsiaAustraliaIcon
        };
        if (t.includes('tech') || t.includes('computer') || t.includes('tle')) return {
            iconText: "text-slate-500", iconBg: "bg-slate-100 dark:bg-slate-500/20 shadow-inner", glow: "from-slate-300 to-slate-500", hoverBorder: "hover:border-slate-400/50", icon: ComputerDesktopIcon
        };

        return {
            iconText: "text-sky-500", iconBg: "bg-sky-50 dark:bg-sky-500/20 shadow-inner", glow: "from-sky-300 to-blue-400", hoverBorder: "hover:border-sky-400/50", icon: BookOpenIcon
        };
    };

    return (
        /* Outer padding wrapper to reveal the scaffold behind it */
        <div className="p-2 sm:p-4 md:p-6 min-h-[calc(100vh-6rem)] flex flex-col selection:bg-indigo-500/30">
            
            {/* === PREMIUM ROUNDED APP WINDOW === */}
            <div className="relative flex-1 w-full bg-slate-50 dark:bg-slate-950 font-sans rounded-[32px] sm:rounded-[40px] lg:rounded-[48px] border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] pb-24 md:pb-12">
                
                {/* Dedicated Background Layer (Clips aurora lights to rounded corners) */}
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/10 dark:bg-indigo-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-400/10 dark:bg-teal-900/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto pt-2 md:pt-4">
                    
                    {/* === ULTRA PREMIUM COMMAND BAR (Sticky) === */}
                    <header className="sticky top-2 md:top-4 z-50 px-2 md:px-6 mb-6 md:mb-10 transition-all duration-300">
                        <div className="bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-2xl border border-white/80 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[32px] md:rounded-[40px] p-2 md:p-3 transition-all duration-300">
                            <div className="flex flex-col xl:flex-row gap-3 md:gap-4 items-center justify-between">
                                
                                {/* LEFT SIDE: Breadcrumbs & Title */}
                                <div className="flex flex-col gap-1 w-full xl:w-auto min-w-0 px-2 md:px-4 py-1">
                                    <Breadcrumbs contentGroup={contentGroup} categoryName={categoryName} />
                                    <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mt-1">
                                        {decodedCategoryName.replace(/\(.*\)/, '')}
                                    </h1>
                                </div>

                                {/* RIGHT SIDE: Search & Actions */}
                                <div className="w-full xl:w-auto flex flex-col sm:flex-row items-center gap-2 md:gap-3">
                                    <div className="relative w-full sm:w-64">
                                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 stroke-[2.5]" />
                                        <input 
                                            type="text" 
                                            placeholder="Search subjects..." 
                                            value={searchTerm} 
                                            onChange={e => setSearchTerm(e.target.value)} 
                                            className="w-full pl-10 pr-4 py-3 md:py-3.5 text-sm font-semibold bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-[24px] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-inner backdrop-blur-sm"
                                        />
                                    </div>
                                    {onAddSubjectClick && (
                                        <button 
                                            onClick={() => onAddSubjectClick(decodedCategoryName)} 
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 md:py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-bold text-sm shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                                        >
                                            <PlusCircleIcon className="w-5 h-5 stroke-[2.5]" />
                                            <span>New Subject</span>
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </header>

                    {/* === CONTENT AREA === */}
                    <div className="px-3 md:px-6">
                        {loading ? <SkeletonGrid /> : (
                            // Mobile: gap-3 list view | Tablet+: gap-5 grid view
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {filteredCourses.map((course) => {
                                    const theme = getMaterialTheme(course.title);
                                    const Icon = theme.icon;

                                    return (
                                        <Link
                                            key={course.id}
                                            to={course.id}
                                            style={{ willChange: "transform, opacity" }}
                                            className={`
                                                group relative flex flex-row md:flex-col items-center md:items-start 
                                                p-4 md:p-7 min-h-[90px] md:min-h-[220px] gap-4 md:gap-0
                                                rounded-[24px] md:rounded-[32px] 
                                                bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-xl
                                                border border-white/80 dark:border-slate-700/50
                                                shadow-[0_4px_20px_rgb(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]
                                                transition-all duration-400 ease-out
                                                hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_rgb(0,0,0,0.4)] 
                                                ${theme.hoverBorder} dark:hover:border-slate-600
                                                md:hover:-translate-y-1.5 active:scale-[0.97]
                                                overflow-hidden
                                            `}
                                        >
                                            {/* --- AMBIENT GLOWS --- */}
                                            {/* Desktop Hover Blob */}
                                            <div className={`hidden md:block absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${theme.glow} opacity-0 group-hover:opacity-20 dark:group-hover:opacity-30 transition-all duration-700 blur-[40px] group-hover:scale-125 z-0 pointer-events-none`}></div>
                                            {/* Mobile Ambient Edge Glow (Static, no blur pulse) */}
                                            <div className={`md:hidden absolute -left-6 top-0 w-20 h-full bg-gradient-to-br ${theme.glow} opacity-10 dark:opacity-20 pointer-events-none z-0`}></div>

                                            {/* --- 1. ICON CONTAINER --- */}
                                            <div className={`
                                                relative z-10 shrink-0 flex items-center justify-center 
                                                w-14 h-14 md:w-16 md:h-16 md:mb-6 
                                                rounded-[16px] md:rounded-[20px] 
                                                ${theme.iconBg} border border-white dark:border-white/5
                                                transition-transform duration-500 md:group-hover:scale-110
                                            `}>
                                                <Icon className={`w-7 h-7 md:w-8 md:h-8 ${theme.iconText} stroke-[2]`} />
                                            </div>

                                            {/* --- 2. TEXT CONTENT --- */}
                                            <div className="relative z-10 flex-1 flex flex-col justify-center w-full min-w-0 pr-2 md:pr-0">
                                                <h3 className="text-[17px] md:text-[22px] font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate md:whitespace-normal md:line-clamp-2 md:mb-4">
                                                    {course.title}
                                                </h3>

                                                {/* Mobile 'Enter' Indicator */}
                                                <span className={`md:hidden text-[11px] font-bold uppercase tracking-widest ${theme.iconText} mt-0.5 flex items-center gap-1`}>
                                                    Enter Subject <ChevronRightIcon className="w-3 h-3 stroke-[3]" />
                                                </span>

                                                {/* Desktop 'Continue' Footer */}
                                                <div className="hidden md:flex items-center mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                                                    <span className={`text-[11px] font-black text-slate-400 group-hover:${theme.iconText} transition-colors flex items-center gap-0.5 uppercase tracking-widest`}>
                                                        Continue <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform stroke-[3]" />
                                                    </span>
                                                </div>
                                            </div>

                                            {/* --- 3. ACTIONS (Responsive Positioning) --- */}
                                            <div 
                                                className="
                                                    relative md:absolute md:top-5 md:right-5 z-20 
                                                    flex items-center gap-1.5 md:gap-2
                                                    md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300
                                                "
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                            >
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEditSubject(course); }}
                                                    className="p-2 md:p-2.5 rounded-[12px] md:rounded-[14px] bg-slate-100 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-95"
                                                    title="Edit Subject"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInitiateDelete('subject', course.id, course.title); }}
                                                    className="p-2 md:p-2.5 rounded-[12px] md:rounded-[14px] bg-red-50 hover:bg-red-500 dark:bg-red-500/10 dark:hover:bg-red-500 text-red-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-red-600 dark:hover:border-red-400"
                                                    title="Delete Subject"
                                                >
                                                    <TrashIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                                </button>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default SubjectList;