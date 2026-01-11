// src/components/teacher/dashboard/views/ClassesView.jsx
import React, { useMemo, memo, useCallback } from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon, EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../contexts/AuthContext'; 

// --- STATIC CONFIGURATION ---
const AURORA_THEMES = [
    { 
        id: 'northern',
        icon: AcademicCapIcon,
        gradient: 'from-blue-500/15 via-cyan-400/5 to-transparent', // Slightly stronger for OneUI vibrancy
        iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
    },
    { 
        id: 'sunset',
        icon: UserGroupIcon, 
        gradient: 'from-orange-500/15 via-rose-400/5 to-transparent',
        iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
    },
    { 
        id: 'nebula',
        icon: ClipboardDocumentListIcon, 
        gradient: 'from-violet-500/15 via-fuchsia-400/5 to-transparent',
        iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
    },
    { 
        id: 'teal',
        icon: ShieldCheckIcon, 
        gradient: 'from-teal-500/15 via-emerald-400/5 to-transparent',
        iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
    },
];

// --- 1. SKELETON (OneUI Style) ---
const SkeletonClassCard = memo(() => (
    <div className="relative bg-white dark:bg-[#121212] rounded-[24px] sm:rounded-[32px] border border-slate-100 dark:border-white/5 p-5 sm:p-6 flex flex-col h-[260px] sm:h-[320px] overflow-hidden shadow-sm">
        <div className="flex justify-between items-start mb-6 animate-pulse">
            <div className="flex gap-4 w-full">
                <div className="w-14 h-14 rounded-[18px] bg-slate-100 dark:bg-white/5" />
                <div className="space-y-2.5 flex-1 pt-1.5">
                    <div className="h-5 sm:h-6 w-3/4 bg-slate-100 dark:bg-white/5 rounded-full" />
                    <div className="h-3 sm:h-4 w-1/3 bg-slate-100 dark:bg-white/5 rounded-full" />
                </div>
            </div>
        </div>
        <div className="flex-grow space-y-3">
             <div className="h-12 w-full bg-slate-50 dark:bg-white/[0.02] rounded-[18px] animate-pulse" />
        </div>
        <div className="h-14 w-full bg-slate-100 dark:bg-white/5 rounded-[20px] mt-4 animate-pulse" />
    </div>
));

// --- 2. CLASS CARD (OneUI 8.5 Design) ---
const ClassCard = memo(({ 
    c, 
    theme, 
    isHoveringActions, 
    setIsHoveringActions, 
    onOpenOverview, 
    onEdit, 
    onArchive, 
    onDelete, 
    onStartOnline, 
    onEndOnline, 
    showToast 
}) => {
    const meetLink = c.meetLink || null;
    const hasValidLink = meetLink && meetLink.startsWith("https://meet.google.com/");
    const isLive = c.videoConference?.isLive || false;

    const handleCardClick = useCallback(() => {
        if (!isHoveringActions) onOpenOverview(c);
    }, [isHoveringActions, onOpenOverview, c]);

    const handleCopyCode = useCallback((e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(c.classCode);
        showToast("Copied!", "success");
    }, [c.classCode, showToast]);

    const handleStartClick = useCallback((e) => {
        e.stopPropagation(); 
        if (!hasValidLink) { onEdit(c); return; }
        onStartOnline(c.id, c.classCode, meetLink);
    }, [hasValidLink, onEdit, onStartOnline, c, meetLink]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`
                group relative w-full
                bg-white dark:bg-[#121212] 
                rounded-[26px] sm:rounded-[32px] 
                border border-slate-100 dark:border-white/5
                shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none
                overflow-hidden flex flex-col 
                min-h-[250px] sm:min-h-[320px] 
                hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/10
                transition-all duration-500 ease-out
            `}
        >
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 inset-x-0 h-48 sm:h-64 bg-gradient-to-b ${theme.gradient} opacity-70 dark:opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-100`} />

            <div
                onClick={handleCardClick}
                className="relative z-10 p-5 sm:p-6 flex flex-col h-full cursor-pointer"
            >
                {/* --- HEADER --- */}
                <div className="flex justify-between items-start mb-5 relative">
                    <div className="flex gap-4 items-start w-full min-w-0 pr-8">
                        {/* OneUI Squircle Icon */}
                        <div className={`
                            w-[3.25rem] h-[3.25rem] sm:w-14 sm:h-14 
                            rounded-[20px] sm:rounded-[22px] 
                            flex items-center justify-center flex-shrink-0
                            ${theme.iconBg} 
                            backdrop-blur-xl border border-white/40 dark:border-white/5
                            shadow-sm
                        `}>
                            <theme.icon className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.8]" />
                        </div>

                        {/* Typography: Larger, bolder titles for legibility */}
                        <div className="pt-0.5 min-w-0 flex-1">
                            <h2 className="text-[1.2rem] sm:text-[1.35rem] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 tracking-tight">
                                {c.name}
                            </h2>
                            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide truncate opacity-80">
                                {c.gradeLevel} • {c.section}
                            </p>
                        </div>
                    </div>

                    {/* Menu Button */}
                    <div 
                        className="absolute -top-1 -right-1"
                        onMouseEnter={() => setIsHoveringActions(true)}
                        onMouseLeave={() => setIsHoveringActions(false)}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <div className="relative group/menu">
                            <button className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors backdrop-blur-md">
                                <EllipsisHorizontalIcon className="w-6 h-6 sm:w-6 sm:h-6" />
                            </button>
                            
                            <div className="absolute right-0 top-0 hidden group-hover/menu:flex flex-col bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-[24px] shadow-xl p-2 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(c); }} className="flex items-center gap-3 w-full p-3 rounded-[18px] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-bold transition-all">
                                    <PencilSquareIcon className="w-5 h-5 opacity-70" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onArchive(c.id, c.name); }} className="flex items-center gap-3 w-full p-3 rounded-[18px] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-bold transition-all">
                                    <ArchiveBoxIcon className="w-5 h-5 opacity-70" /> Archive
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-2" />
                                <button onClick={(e) => { e.stopPropagation(); onDelete(c.id, false); }} className="flex items-center gap-3 w-full p-3 rounded-[18px] hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold transition-all">
                                    <TrashIcon className="w-5 h-5 opacity-70" /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-grow" />

                {/* --- CLASS CODE SURFACE --- */}
                {c.classCode && (
                    <div className="mb-4 sm:mb-5 relative group/code">
                        <div 
                            className="
                                bg-slate-50/80 dark:bg-white/[0.03] 
                                rounded-[18px] sm:rounded-[22px]
                                border border-slate-100 dark:border-white/5 
                                p-1.5 pl-2 flex items-center justify-between
                                transition-all duration-300
                                hover:bg-white dark:hover:bg-white/[0.06]
                                hover:shadow-sm
                            "
                        >
                            <div className="flex flex-col pl-3 py-1.5">
                                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Code</span>
                                <span className="text-[15px] sm:text-base font-mono font-bold text-slate-700 dark:text-slate-200 tracking-wider">
                                    {c.classCode}
                                </span>
                            </div>
                            <button
                                onClick={handleCopyCode}
                                className="h-11 w-11 rounded-[14px] sm:rounded-[16px] bg-white dark:bg-[#1E1E1E] shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors active:scale-95"
                            >
                                <ClipboardIcon className="w-5 h-5 stroke-[2]" />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- ACTION BUTTON --- */}
                <div className="w-full relative z-10">
                    {isLive ? (
                        <div className="flex gap-3 h-12 sm:h-[3.25rem]">
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={(e) => { e.stopPropagation(); window.open(meetLink, '_blank'); }}
                                disabled={!hasValidLink}
                                className="flex-1 rounded-[18px] sm:rounded-[22px] bg-gradient-to-r from-red-500 to-red-600 text-white text-[13px] sm:text-sm font-bold shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                <VideoCameraIcon className="w-5 h-5 relative z-10" /> 
                                <span className="relative z-10">Join Live</span>
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); onEndOnline(c.id); }}
                                className="w-12 sm:w-[3.25rem] rounded-[18px] sm:rounded-[22px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-red-500 border border-slate-100 dark:border-white/5 flex items-center justify-center transition-colors shadow-sm"
                            >
                                <IconPower className="w-5 h-5 stroke-[2.5]" /> 
                            </motion.button>
                        </div>
                    ) : (
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleStartClick}
                            className={`
                                w-full h-12 sm:h-[3.25rem] rounded-[18px] sm:rounded-[22px] text-[13px] sm:text-sm font-bold text-white shadow-xl 
                                flex items-center justify-center gap-2 transition-all border border-white/10
                                ${hasValidLink 
                                    ? 'bg-[#18181b] dark:bg-white dark:text-black hover:bg-black dark:hover:bg-slate-100 shadow-slate-900/10 dark:shadow-white/5' 
                                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                                }
                            `}
                        >
                            {hasValidLink ? <VideoCameraIcon className="w-5 h-5" /> : <PencilSquareIcon className="w-5 h-5" />}
                            <span>{hasValidLink ? "Start Class" : "Setup Meet Link"}</span>
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

// --- MAIN VIEW COMPONENT ---
const ClassesView = ({
    activeClasses,
    loading = false,
    isHoveringActions,
    setIsHoveringActions,
    setClassOverviewModal,
    handleOpenEditClassModal,
    handleArchiveClass,
    handleDeleteClass,
    showToast,
    setIsArchivedModalOpen,
    setCreateClassModalOpen,
    handleStartOnlineClass, 
	handleEndOnlineClass,      
}) => {
    const { userProfile } = useAuth();
    
    // Memoized Filtering
    const filteredActiveClasses = useMemo(() => {
        if (!activeClasses || !userProfile) return [];
        const effectiveUserSchoolId = userProfile.schoolId || 'srcs_main';
        return activeClasses.filter(cls => {
            if (cls.teacherId !== userProfile.id) return false;
            const classSchoolId = cls.schoolId || 'srcs_main';
            return classSchoolId === effectiveUserSchoolId;
        });
    }, [activeClasses, userProfile]);

    const sortedClasses = useMemo(() => {
        return [...filteredActiveClasses].sort((a, b) => {
            const gradeA = parseInt((a.gradeLevel || '').match(/\d+/) || 0);
            const gradeB = parseInt((b.gradeLevel || '').match(/\d+/) || 0);
            return gradeA - gradeB;
        });
    }, [filteredActiveClasses]);

    const handleOpenOverview = useCallback((c) => setClassOverviewModal({ isOpen: true, data: c }), [setClassOverviewModal]);
    
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col font-sans pb-32 lg:pb-12 relative z-10"
        >
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-8 px-2">
                <div>
                    <h1 className="text-3xl md:text-4xl font-[850] text-slate-900 dark:text-white tracking-tight leading-tight">
                        My Classes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
                        {sortedClasses.length} active courses
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 px-6 rounded-[18px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <ArchiveBoxIcon className="w-5 h-5 stroke-[2]" />
                        <span>Archive</span>
                    </button>
                    <button 
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 px-6 rounded-[18px] bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <PlusCircleIcon className="w-6 h-6 stroke-[2]" />
                        <span>Create</span>
                    </button>
                </div>
            </div>

            {/* --- GRID LAYOUT --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [...Array(4)].map((_, i) => <SkeletonClassCard key={i} />)
                    ) : sortedClasses.length > 0 ? (
                        sortedClasses.map((c, index) => {
                            const theme = AURORA_THEMES[index % AURORA_THEMES.length];
                            return (
                                <ClassCard 
                                    key={c.id}
                                    c={c}
                                    theme={theme}
                                    isHoveringActions={isHoveringActions}
                                    setIsHoveringActions={setIsHoveringActions}
                                    onOpenOverview={handleOpenOverview}
                                    onEdit={handleOpenEditClassModal}
                                    onArchive={handleArchiveClass}
                                    onDelete={handleDeleteClass}
                                    onStartOnline={handleStartOnlineClass}
                                    onEndOnline={handleEndOnlineClass}
                                    showToast={showToast}
                                />
                            );
                        })
                    ) : (
                        /* --- EMPTY STATE --- */
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center mb-6 relative overflow-hidden">
                                <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:linear-gradient(0deg,white,transparent)]" />
                                <SquaresPlusIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 relative z-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Classes Found</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                                You haven't created any classes yet. Click the "Create" button above to get started.
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default memo(ClassesView);