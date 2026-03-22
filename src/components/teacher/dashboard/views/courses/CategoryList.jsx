// src/components/teacher/dashboard/views/courses/CategoryList.jsx
import React, { memo, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeftIcon,
    PlusCircleIcon,
    PencilSquareIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderSolid } from '@heroicons/react/24/solid';
import { MATERIAL_STYLES } from './coursesStyles';
import ContentScopeSwitcher from './ContentScopeSwitcher';
import SkeletonGrid from './SkeletonGrid';

const CategoryList = memo((props) => {
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject, loading, userProfile } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();
    const isLearner = contentGroup === 'learner';

    useEffect(() => { 
        if (setActiveSubject) setActiveSubject(null); 
        if (handleCategoryClick) handleCategoryClick(null); 
    }, [setActiveSubject, handleCategoryClick]);

    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const userSchoolId = userProfile?.schoolId || "srcs_main";
        const visibleCoursesSet = new Set();
        if (courses) {
            courses.forEach(c => {
                if (c.schoolId === "global" || !c.schoolId || c.schoolId === userSchoolId) visibleCoursesSet.add(c.category);
            });
        }
        return courseCategories.filter(cat => {
            const lowerName = cat.name.toLowerCase();
            return (isLearner ? !lowerName.includes("teacher") : lowerName.includes("teacher")) && visibleCoursesSet.has(cat.name);
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner, courses, userProfile?.schoolId]);

    const handleSwitchGroup = useCallback((newGroup) => navigate(`/dashboard/courses/${newGroup}`), [navigate]);

    return (
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] relative overflow-hidden ${MATERIAL_STYLES.bgScaffold} bg-slate-50/50 dark:bg-slate-950/50`}>
            {/* Elegant glass top bar */}
            <header className="sticky top-0 z-50 flex-none px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/dashboard/courses")} className={`${MATERIAL_STYLES.btnIcon} bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-white/10 hover:-translate-x-0.5`}>
                        <ArrowLeftIcon className="w-5 h-5 md:w-6 md:h-6 stroke-2" />
                    </button>
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight`}>
                            {isLearner ? "Learner Space" : "Teacher Space"}
                        </h1>
                        <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 tracking-wide">Explore your curriculum folders</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="w-full sm:w-auto">
                        <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} />
                    </div>
                    <button onClick={() => setCreateCategoryModalOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-gradient-to-r from-indigo-500 to-purple-600 text-white w-full sm:w-auto shadow-indigo-500/25 border border-indigo-400/30`}>
                        <PlusCircleIcon className="w-5 h-5 md:w-5 md:h-5 stroke-2" />
                        <span className="sm:hidden lg:inline tracking-wide">New Folder</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 md:px-8 pt-6 md:pt-8 pb-24 md:pb-12 relative z-10">
                {loading ? <SkeletonGrid /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 animate-spring-up">
                        {categoriesToShow.map((cat, idx) => {
                            const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0;
                            const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, "");

                            // Sophisticated pastel/glassmorphic themes with solid backgrounds and subtle gradients
                            const cardThemes = [
                                { bg: 'bg-white dark:bg-slate-800', accent: 'from-sky-500 to-blue-500', iconBg: 'bg-sky-50 dark:bg-sky-500/10', iconText: 'text-sky-600 dark:text-sky-400', border: 'border-slate-200/60 dark:border-white/10' },
                                { bg: 'bg-white dark:bg-slate-800', accent: 'from-rose-500 to-pink-500', iconBg: 'bg-rose-50 dark:bg-rose-500/10', iconText: 'text-rose-600 dark:text-rose-400', border: 'border-slate-200/60 dark:border-white/10' },
                                { bg: 'bg-white dark:bg-slate-800', accent: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10', iconText: 'text-emerald-600 dark:text-emerald-400', border: 'border-slate-200/60 dark:border-white/10' },
                                { bg: 'bg-white dark:bg-slate-800', accent: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-50 dark:bg-amber-500/10', iconText: 'text-amber-600 dark:text-amber-400', border: 'border-slate-200/60 dark:border-white/10' },
                                { bg: 'bg-white dark:bg-slate-800', accent: 'from-purple-500 to-fuchsia-500', iconBg: 'bg-purple-50 dark:bg-purple-500/10', iconText: 'text-purple-600 dark:text-purple-400', border: 'border-slate-200/60 dark:border-white/10' },
                            ];
                            const theme = cardThemes[idx % cardThemes.length];

                            return (
                                <Link
                                    key={cat.id}
                                    to={encodeURIComponent(cat.name)}
                                    className={`
                                        group relative flex flex-col p-6 md:p-8 min-h-[200px] md:min-h-[220px]
                                        rounded-[32px] md:rounded-[40px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]
                                        border ${theme.border} ${theme.bg}
                                        transition-all duration-300 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1
                                        overflow-hidden
                                    `}
                                >
                                    {/* Top colored accent stripe */}
                                    <div className={`absolute top-0 left-0 right-0 h-1.5 md:h-2 bg-gradient-to-r ${theme.accent} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                                    
                                    {/* Deco gradient blob */}
                                    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-gradient-to-r ${theme.accent} opacity-[0.05] dark:opacity-[0.1] blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>

                                    {/* Actions Container */}
                                    <div className="absolute top-4 right-4 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 flex items-center gap-1.5 z-20">
                                        <button onClick={(e) => { e.preventDefault(); handleEditCategory(cat) }} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all text-slate-500 dark:text-slate-300">
                                            <PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name) }} className="p-2 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all text-red-500 dark:text-red-400">
                                            <TrashIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                                        </button>
                                    </div>

                                    <div className="flex-1 flex flex-col justify-end z-10">
                                        <div className={`w-14 h-14 md:w-16 md:h-16 mb-4 md:mb-6 rounded-[20px] ${theme.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-sm border border-white/50 dark:border-white/5`}>
                                            <FolderSolid className={`w-7 h-7 md:w-8 md:h-8 ${theme.iconText}`} />
                                        </div>

                                        <h3 className={`text-[19px] md:text-[22px] font-bold text-slate-900 dark:text-white leading-tight mb-2 tracking-tight`}>
                                            {cleanName}
                                        </h3>

                                        <div className="flex items-center gap-2 mt-auto">
                                            <span className={`px-2.5 py-1 rounded-[10px] bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-[11px] md:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider`}>
                                                {courseCount} Items
                                            </span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                            <span className="text-[11px] md:text-xs font-semibold text-[color:var(--monet-primary,theme(colors.indigo.500))] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                                Open
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
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

export default CategoryList;
