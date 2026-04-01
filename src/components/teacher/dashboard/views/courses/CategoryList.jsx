// src/components/teacher/dashboard/views/courses/CategoryList.jsx
import React, { memo, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeftIcon,
    PlusCircleIcon,
    PencilSquareIcon,
    TrashIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderSolid } from '@heroicons/react/24/solid';
import { MATERIAL_STYLES } from './coursesStyles';
import ContentScopeSwitcher from './ContentScopeSwitcher';
import SkeletonGrid from './SkeletonGrid';

const CategoryList = memo((props) => {
    const { 
        courseCategories, courses, setCreateCategoryModalOpen, 
        handleEditCategory, handleInitiateDelete, handleCategoryClick, 
        setActiveSubject, loading, userProfile 
    } = props;
    
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
        /* Outer padding wrapper to reveal the scaffold behind it */
        <div className="p-2 sm:p-4 md:p-6 min-h-[calc(100vh-6rem)] flex flex-col selection:bg-indigo-500/30">
            
            {/* === PREMIUM ROUNDED APP WINDOW === */}
            <div className="relative flex-1 w-full bg-slate-50 dark:bg-slate-950 font-sans rounded-[32px] sm:rounded-[40px] lg:rounded-[48px] border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] pb-24 md:pb-12">
                
                {/* Dedicated Background Layer (Clips aurora lights to rounded corners, animations frozen on mobile) */}
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/10 dark:bg-indigo-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-400/10 dark:bg-teal-900/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto pt-2 md:pt-4">
                    
                    {/* === ULTRA PREMIUM COMMAND BAR (Sticky) === */}
                    <header className="sticky top-2 md:top-4 z-50 px-2 md:px-6 mb-6 md:mb-10 transition-all duration-300">
                        <div className="bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-2xl border border-white/80 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[32px] md:rounded-[40px] p-2 md:p-3 transition-all duration-300">
                            <div className="flex flex-col xl:flex-row gap-3 md:gap-4 items-center justify-between">
                                
                                {/* LEFT SIDE: Title & Back */}
                                <div className="flex items-center justify-between w-full xl:w-auto px-2 md:px-4">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <button 
                                            onClick={() => navigate("/dashboard/courses")} 
                                            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-[16px] md:rounded-[20px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 shadow-inner border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-300 active:scale-95 flex-shrink-0"
                                        >
                                            <ArrowLeftIcon className="w-5 h-5 stroke-[2.5]" />
                                        </button>
                                        <div className="flex flex-col justify-center">
                                            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                                {isLearner ? "Learner Space" : "Teacher Space"}
                                            </h1>
                                            <span className="mt-1 md:mt-1.5 text-[10px] md:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Curriculum Folders
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT SIDE: Switcher & Actions */}
                                <div className="w-full xl:w-auto flex flex-col sm:flex-row items-center gap-2 md:gap-3">
                                    {/* Scope Switcher Wrapper */}
                                    <div className="w-full sm:w-auto flex-1 bg-slate-100 dark:bg-slate-800/80 p-1 md:p-1.5 rounded-[24px] md:rounded-[28px] shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                                        <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} />
                                    </div>
                                    
                                    {/* New Folder Button */}
                                    <button 
                                        onClick={() => setCreateCategoryModalOpen(true)} 
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 md:py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-bold text-sm shadow-[0_8px_20px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                                    >
                                        <PlusCircleIcon className="w-5 h-5 stroke-[2.5]" />
                                        <span>New Folder</span>
                                    </button>
                                </div>

                            </div>
                        </div>
                    </header>

                    {/* === CONTENT AREA === */}
                    <div className="px-3 md:px-6">
                        {loading ? <SkeletonGrid /> : (
                            // On mobile: gap-3 list view. On tablet+: gap-6 grid view.
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                
                                {categoriesToShow.map((cat, idx) => {
                                    const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0;
                                    const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, "");

                                    // Ultra Premium Accent Mapping
                                    const accents = [
                                        { iconText: 'text-sky-500', iconBg: 'bg-sky-50 dark:bg-sky-500/20', hoverBorder: 'hover:border-sky-400/50', glow: 'from-sky-300 to-blue-400' },
                                        { iconText: 'text-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-500/20', hoverBorder: 'hover:border-emerald-400/50', glow: 'from-emerald-300 to-teal-400' },
                                        { iconText: 'text-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-500/20', hoverBorder: 'hover:border-violet-400/50', glow: 'from-violet-300 to-purple-400' },
                                        { iconText: 'text-rose-500', iconBg: 'bg-rose-50 dark:bg-rose-500/20', hoverBorder: 'hover:border-rose-400/50', glow: 'from-rose-300 to-pink-400' },
                                        { iconText: 'text-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-500/20', hoverBorder: 'hover:border-amber-400/50', glow: 'from-amber-300 to-orange-400' },
                                    ];
                                    const accent = accents[idx % accents.length];

                                    return (
                                        <Link
                                            key={cat.id}
                                            to={encodeURIComponent(cat.name)}
                                            style={{ willChange: "transform, opacity" }}
                                            // Responsive Card-to-List Morphing Classes
                                            className={`
                                                group relative flex flex-row md:flex-col items-center md:items-start 
                                                p-4 md:p-7 min-h-[85px] md:min-h-[220px] gap-4 md:gap-0
                                                rounded-[24px] md:rounded-[32px] 
                                                bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-xl
                                                border border-white/80 dark:border-slate-700/50
                                                transition-all duration-400 ease-out
                                                shadow-[0_4px_20px_rgb(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]
                                                hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_rgb(0,0,0,0.4)] 
                                                ${accent.hoverBorder} dark:hover:border-slate-600
                                                md:hover:-translate-y-1.5 active:scale-[0.98]
                                                overflow-hidden
                                            `}
                                        >
                                            {/* Desktop Hover Ambient Glow Orb (Hidden on Mobile List) */}
                                            <div className={`hidden md:block absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${accent.glow} blur-[40px] opacity-0 group-hover:opacity-20 dark:group-hover:opacity-30 transition-all duration-700 group-hover:scale-125 z-0 pointer-events-none`} />

                                            {/* --- 1. ICON CONTAINER --- */}
                                            {/* Mobile: small square. Desktop: larger square, margin bottom. */}
                                            <div className={`
                                                relative z-10 shrink-0 flex items-center justify-center 
                                                w-14 h-14 md:w-16 md:h-16 md:mb-6 
                                                rounded-[16px] md:rounded-[20px] 
                                                ${accent.iconBg} shadow-inner border border-white dark:border-white/5
                                                transition-transform duration-500 md:group-hover:scale-110
                                            `}>
                                                <FolderSolid className={`w-7 h-7 md:w-8 md:h-8 ${accent.iconText}`} />
                                            </div>

                                            {/* --- 2. TEXT CONTENT --- */}
                                            <div className="relative z-10 flex-1 flex flex-col justify-center md:justify-end w-full">
                                                <h3 className="text-[17px] md:text-[22px] font-black text-slate-900 dark:text-white leading-tight md:mb-2 tracking-tight line-clamp-1 md:line-clamp-2">
                                                    {cleanName}
                                                </h3>
                                                
                                                {/* Desktop Stats & Fake Link */}
                                                <div className="hidden md:flex items-center gap-2 mt-auto pt-2">
                                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-inner">
                                                        {courseCount} Items
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                                                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-0.5">
                                                        Open <ChevronRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform stroke-[3]" />
                                                    </span>
                                                </div>
                                                
                                                {/* Mobile Stats */}
                                                <span className="md:hidden text-[11px] font-bold text-slate-500 mt-0.5 tracking-wide">
                                                    {courseCount} Items
                                                </span>
                                            </div>

                                            {/* --- 3. ACTIONS (Responsive Positioning) --- */}
                                            {/* Desktop: Absolute top right, appears on hover. Mobile: Row on the right, always visible/faded. */}
                                            <div className="
                                                relative md:absolute md:top-5 md:right-5 z-20 
                                                flex items-center gap-1.5 md:gap-2
                                                md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-300
                                            ">
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); handleEditCategory(cat); }} 
                                                    className="p-2 md:p-2.5 rounded-[12px] md:rounded-[14px] bg-slate-100 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-95"
                                                    title="Edit Category"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name); }} 
                                                    className="p-2 md:p-2.5 rounded-[12px] md:rounded-[14px] bg-red-50 hover:bg-red-500 dark:bg-red-500/10 dark:hover:bg-red-500 text-red-500 hover:text-white transition-all active:scale-95 border border-transparent hover:border-red-600 dark:hover:border-red-400"
                                                    title="Delete Category"
                                                >
                                                    <TrashIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                                </button>
                                                
                                                {/* Mobile Chevron Indicator */}
                                                <ChevronRightIcon className="w-5 h-5 stroke-[2.5] text-slate-300 dark:text-slate-600 md:hidden ml-1" />
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

export default CategoryList;