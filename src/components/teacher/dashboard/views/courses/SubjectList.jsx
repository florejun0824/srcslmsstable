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
import { MATERIAL_STYLES } from './coursesStyles';
import Breadcrumbs from './Breadcrumbs';
import SkeletonGrid from './SkeletonGrid';

const SubjectList = memo((props) => {
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick, loading, userProfile, handleOpenEditSubject } = props;
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

    const getMaterialTheme = (title) => {
        const t = title.toLowerCase();

        if (t.includes('english') || t.includes('filipino') || t.includes('reading')) return {
            bg: "from-rose-500 to-pink-500",
            iconBg: "bg-rose-50 dark:bg-rose-500/10",
            iconColor: "text-rose-600 dark:text-rose-400",
            icon: PencilIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
        if (t.includes('math') || t.includes('algebra')) return {
            bg: "from-indigo-500 to-blue-500",
            iconBg: "bg-indigo-50 dark:bg-indigo-500/10",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            icon: CalculatorIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
        if (t.includes('science') || t.includes('physics') || t.includes('biology')) return {
            bg: "from-emerald-500 to-teal-500",
            iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            icon: BeakerIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
        if (t.includes('mapeh') || t.includes('music') || t.includes('art') || t.includes('pe')) return {
            bg: "from-sky-500 to-cyan-500",
            iconBg: "bg-sky-50 dark:bg-sky-500/10",
            iconColor: "text-sky-600 dark:text-sky-400",
            icon: MusicalNoteIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
        if (t.includes('csl') || t.includes('religious') || t.includes('values') || t.includes('esp')) return {
            bg: "from-amber-500 to-orange-500",
            iconBg: "bg-amber-50 dark:bg-amber-500/10",
            iconColor: "text-amber-600 dark:text-amber-400",
            icon: HeartIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
        if (t.includes('araling') || t.includes('history') || t.includes('social') || t.includes('ap')) return {
            bg: "from-fuchsia-500 to-purple-500",
            iconBg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
            iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
            icon: GlobeAsiaAustraliaIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
        if (t.includes('tech') || t.includes('computer') || t.includes('tle')) return {
            bg: "from-slate-600 to-slate-800 dark:from-slate-400 dark:to-slate-600",
            iconBg: "bg-slate-100 dark:bg-slate-700/50",
            iconColor: "text-slate-700 dark:text-slate-300",
            icon: ComputerDesktopIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };

        return {
            bg: "from-zinc-400 to-zinc-500 dark:from-zinc-600 dark:to-zinc-700",
            iconBg: "bg-zinc-100 dark:bg-zinc-800",
            iconColor: "text-zinc-600 dark:text-zinc-400",
            icon: BookOpenIcon,
            surface: "bg-white dark:bg-slate-800",
            border: "border-slate-200/60 dark:border-white/10"
        };
    };

    return (
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] relative overflow-hidden ${MATERIAL_STYLES.bgScaffold} bg-slate-50/50 dark:bg-slate-950/50`}>
            {/* Elegant glass top bar */}
            <header className="sticky top-0 z-50 flex-none px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col gap-1.5 w-full md:w-auto min-w-0">
                    <Breadcrumbs contentGroup={contentGroup} categoryName={categoryName} />
                    <h1 className={`text-2xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight ml-1 md:ml-2`}>
                        {decodedCategoryName.replace(/\(.*\)/, '')}
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
                    <div className="relative w-full sm:w-64">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search subjects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={MATERIAL_STYLES.searchBar} />
                    </div>
                    {onAddSubjectClick && (
                        <button onClick={() => onAddSubjectClick(decodedCategoryName)} className={`${MATERIAL_STYLES.btnFilled} bg-gradient-to-r from-indigo-500 to-purple-600 text-white w-full sm:w-auto shadow-indigo-500/25 border border-indigo-400/30`}>
                            <PlusCircleIcon className="w-5 h-5 md:w-5 md:h-5 stroke-2" />
                            <span className="tracking-wide">New Subject</span>
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-8 pt-6 md:pt-8 pb-24 md:pb-12 relative z-10">
                {loading ? <SkeletonGrid /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 animate-spring-up">
                        {filteredCourses.map((course) => {
                            const { bg, iconColor, iconBg, icon: Icon, surface, border } = getMaterialTheme(course.title);
                            return (
                                <Link
                                    key={course.id}
                                    to={course.id}
                                    className={`
                                        group relative flex flex-col p-6 md:p-8 min-h-[200px] md:min-h-[220px]
                                        rounded-[32px] md:rounded-[40px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                                        border ${border} ${surface}
                                        transition-all duration-300 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1
                                        overflow-hidden
                                    `}
                                >
                                    {/* Top colored accent stripe */}
                                    <div className={`absolute top-0 left-0 right-0 h-1.5 md:h-2 bg-gradient-to-r ${bg} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                    
                                    {/* Deco gradient blob */}
                                    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-r ${bg} opacity-[0.05] dark:opacity-[0.1] blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>

                                    {/* Actions Container */}
                                    <div className="absolute top-4 right-4 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 flex items-center gap-1.5 z-20" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEditSubject(course); }}
                                            className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all text-slate-500 dark:text-slate-300"
                                            title="Edit Subject"
                                        >
                                            <PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInitiateDelete('subject', course.id, course.title); }}
                                            className="p-2 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all text-red-500 dark:text-red-400"
                                            title="Delete Subject"
                                        >
                                            <TrashIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                                        </button>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-end z-10">
                                        <div className={`w-14 h-14 md:w-16 md:h-16 mb-4 md:mb-6 rounded-[20px] ${iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm border border-white/50 dark:border-white/5`}>
                                            <Icon className={`w-7 h-7 md:w-8 md:h-8 ${iconColor}`} />
                                        </div>

                                        <h3 className={`text-[19px] md:text-[22px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 tracking-tight`}>
                                            {course.title}
                                        </h3>

                                        <div className="flex items-center justify-end mt-4 pt-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                                            <span className="text-[11px] md:text-sm font-bold text-[color:var(--monet-primary,theme(colors.indigo.500))] group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                                                Continue
                                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

export default SubjectList;
