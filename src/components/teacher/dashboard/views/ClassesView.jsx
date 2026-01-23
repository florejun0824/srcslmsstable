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

// --- ENHANCED THEME CONFIGURATION ---
const AURORA_THEMES = [
    { 
        id: 'northern',
        icon: AcademicCapIcon,
        gradient: 'from-blue-500/5 via-cyan-400/5 to-transparent',
        shadowColor: 'hover:shadow-blue-500/20',
        iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-500/30',
        btnGradient: 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/25',
        accentText: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-500/20',
        dotColor: 'bg-blue-500'
    },
    { 
        id: 'sunset',
        icon: UserGroupIcon, 
        gradient: 'from-orange-500/5 via-rose-400/5 to-transparent',
        shadowColor: 'hover:shadow-orange-500/20',
        iconBg: 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-orange-500/30',
        btnGradient: 'bg-gradient-to-r from-orange-600 to-rose-600 shadow-orange-500/25',
        accentText: 'text-orange-600 dark:text-orange-400',
        badgeBg: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-100 dark:border-orange-500/20',
        dotColor: 'bg-orange-500'
    },
    { 
        id: 'nebula',
        icon: ClipboardDocumentListIcon, 
        gradient: 'from-violet-500/5 via-fuchsia-400/5 to-transparent',
        shadowColor: 'hover:shadow-violet-500/20',
        iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-violet-500/30',
        btnGradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-500/25',
        accentText: 'text-violet-600 dark:text-violet-400',
        badgeBg: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-100 dark:border-violet-500/20',
        dotColor: 'bg-violet-500'
    },
    { 
        id: 'teal',
        icon: ShieldCheckIcon, 
        gradient: 'from-teal-500/5 via-emerald-400/5 to-transparent',
        shadowColor: 'hover:shadow-teal-500/20',
        iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-teal-500/30',
        btnGradient: 'bg-gradient-to-r from-teal-600 to-emerald-600 shadow-teal-500/25',
        accentText: 'text-teal-600 dark:text-teal-400',
        badgeBg: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-300 border-teal-100 dark:border-teal-500/20',
        dotColor: 'bg-teal-500'
    },
];

// --- 1. SKELETON (Updated sizes) ---
const SkeletonClassCard = memo(() => (
    <div className="relative bg-white dark:bg-[#18181b] rounded-[32px] border border-slate-100 dark:border-white/5 p-4 sm:p-5 h-[190px] sm:h-[220px] flex flex-col justify-between overflow-hidden shadow-sm">
        <div className="flex gap-4 items-start animate-pulse">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-slate-100 dark:bg-white/5" />
            <div className="flex-1 space-y-2.5 pt-1">
                <div className="h-5 sm:h-6 w-3/4 bg-slate-100 dark:bg-white/5 rounded-full" />
                <div className="h-5 sm:h-6 w-1/2 bg-slate-100 dark:bg-white/5 rounded-full" />
            </div>
        </div>
        <div className="flex gap-3 mt-4 h-12 sm:h-14 animate-pulse">
             <div className="w-[40%] bg-slate-100 dark:bg-white/5 rounded-[20px]" />
             <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-[20px]" />
        </div>
    </div>
));

// --- 2. ENHANCED CLASS CARD ---
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

    const handleCopyCode = useCallback((e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(c.classCode);
        showToast("Copied!", "success");
    }, [c.classCode, showToast]);

    const handleAction = useCallback((e) => {
        e.stopPropagation();
        if (isLive) {
            window.open(meetLink, '_blank');
        } else if (hasValidLink) {
            onStartOnline(c.id, c.classCode, meetLink);
        } else {
            onEdit(c);
        }
    }, [isLive, hasValidLink, meetLink, onStartOnline, onEdit, c]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => onOpenOverview(c)}
            className={`
                group relative w-full
                bg-white dark:bg-[#18181b]
                rounded-[32px] 
                border border-slate-100 dark:border-white/5
                shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]
                hover:shadow-2xl ${theme.shadowColor}
                overflow-visible flex flex-col justify-between
                transition-all duration-500 ease-out
                hover:-translate-y-1.5
                cursor-pointer
                bg-clip-padding
                /* MOBILE: Slimmer height, DESKTOP: Standard height */
                h-auto min-h-[190px] sm:min-h-[230px]
            `}
        >
            {/* Subtle Gradient & Noise Texture */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-100 rounded-[32px]`} />
            <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] rounded-[32px] pointer-events-none mix-blend-overlay" />

            {/* --- TOP SECTION: Visuals & Info --- */}
            <div className="relative z-20 p-4 sm:p-5 pb-0 flex justify-between items-start">
                <div className="flex gap-4 sm:gap-5 items-start overflow-hidden w-full">
                    {/* Modern "Squircle" Icon with Glow */}
                    <div className={`
                        relative flex-shrink-0
                        /* MOBILE: Smaller Icon, DESKTOP: Standard Icon */
                        w-12 h-12 sm:w-14 sm:h-14
                        rounded-[20px] 
                        flex items-center justify-center 
                        ${theme.iconBg} 
                        shadow-lg
                        group-hover:scale-110 transition-transform duration-500
                    `}>
                        <div className="absolute inset-0 bg-white/20 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <theme.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white relative z-10" strokeWidth={2} />
                    </div>

                    {/* Text Info (Rows) */}
                    <div className="min-w-0 flex-1 pt-0.5 sm:pt-1 flex flex-col">
                        {/* Title - Mobile text-lg, Desktop text-xl */}
                        <h2 
                            className="text-lg sm:text-xl font-[800] text-slate-800 dark:text-white leading-tight tracking-tight mb-2 sm:mb-2.5 line-clamp-2"
                            title={c.name}
                        >
                            {c.name}
                        </h2>
                        
                        {/* Stacked Metadata */}
                        <div className="flex flex-col items-start gap-1 sm:gap-1.5 mt-auto">
                            {/* Row 1: Grade Level (Badge) */}
                            <span className={`
                                inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border
                                ${theme.badgeBg}
                            `}>
                                {c.gradeLevel}
                            </span>
                            
                            {/* Row 2: Section (Text) */}
                            <div className="flex items-center gap-1.5 pl-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${theme.dotColor} opacity-60`}></div>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                                    {c.section}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Menu Button */}
                <button 
                    onClick={(e) => e.stopPropagation()}
                    className="group/menu relative -mr-2 -mt-2 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5 flex-shrink-0"
                >
                    <EllipsisHorizontalIcon className="w-7 h-7" />
                    {/* Dropdown Menu (Glass) */}
                    <div className="absolute right-0 top-10 hidden group-hover/menu:flex flex-col bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border border-slate-100 dark:border-white/10 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] p-1.5 z-50 min-w-[150px] animate-in fade-in zoom-in-95 origin-top-right">
                        <div onClick={() => onEdit(c)} className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2.5 transition-colors">
                             <PencilSquareIcon className="w-4 h-4" /> Edit Details
                        </div>
                        <div onClick={() => onArchive(c.id, c.name)} className="px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2.5 transition-colors">
                             <ArchiveBoxIcon className="w-4 h-4" /> Archive Class
                        </div>
                        <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />
                        <div onClick={() => onDelete(c.id)} className="px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2.5 transition-colors">
                             <TrashIcon className="w-4 h-4" /> Delete Class
                        </div>
                    </div>
                </button>
            </div>

            {/* --- BOTTOM SECTION: Actions --- */}
            {/* MOBILE: Reduced Padding and Gap */}
            <div className="relative z-10 p-4 sm:p-5 pt-4 sm:pt-6 flex items-center gap-2 sm:gap-3 mt-auto">
                
                {/* 1. Code "Ticket" - Slimmer height on mobile */}
                <button
                    onClick={handleCopyCode}
                    className="
                        group/code flex-shrink-0 w-[40%] sm:flex-1
                        h-12 sm:h-[3.5rem]
                        flex flex-col items-center justify-center
                        bg-slate-50 dark:bg-black/20 
                        border-2 border-dashed border-slate-200 dark:border-white/10
                        rounded-[20px]
                        hover:bg-white hover:border-slate-300 dark:hover:bg-white/5 dark:hover:border-white/20
                        active:scale-95 transition-all duration-300
                    "
                >
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Class Code</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-200 group-hover/code:text-slate-900 dark:group-hover/code:text-white transition-colors">
                            {c.classCode}
                        </span>
                        <ClipboardIcon className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-blue-500 transition-colors" />
                    </div>
                </button>

                {/* 2. Primary Action Button - Slimmer height on mobile */}
                {isLive ? (
                    <div className="flex-1 flex gap-2 h-12 sm:h-[3.5rem]">
                        <button
                            onClick={handleAction}
                            className="flex-1 bg-red-600 text-white rounded-[20px] font-bold text-sm shadow-lg shadow-red-500/30 hover:shadow-red-600/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-full w-full bg-white"></span>
                            </span>
                            <span className="relative">Join Live</span>
                        </button>
                         <button
                            onClick={(e) => { e.stopPropagation(); onEndOnline(c.id); }}
                            className="w-12 sm:w-[3.5rem] bg-white dark:bg-[#202022] border-2 border-red-100 dark:border-red-900/30 text-red-500 rounded-[20px] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-90"
                        >
                            <IconPower className="w-5 h-5" stroke={2.5} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAction}
                        className={`
                            flex-1 h-12 sm:h-[3.5rem]
                            rounded-[20px] 
                            font-bold text-sm text-white shadow-xl
                            flex items-center justify-center gap-2.5
                            active:scale-95 transition-all duration-300
                            hover:scale-[1.02]
                            relative overflow-hidden
                            ${hasValidLink ? theme.btnGradient : 'bg-slate-800 dark:bg-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 shadow-lg'}
                        `}
                    >
                        {/* Inner Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-50" />
                        
                        <div className="relative flex items-center gap-2">
                            {hasValidLink ? (
                                <>
                                    <VideoCameraIcon className="w-5 h-5" strokeWidth={2.5} />
                                    <span>Start Class</span>
                                </>
                            ) : (
                                <>
                                    <PencilSquareIcon className="w-4 h-4" strokeWidth={2.5} />
                                    <span>Setup Link</span>
                                </>
                            )}
                        </div>
                    </button>
                )}
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
            // MAINTAINED: pb-40 to clear mobile dock, lg:pb-12 for desktop
            className="w-full h-full flex flex-col font-sans pb-40 lg:pb-12 relative z-10"
        >
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-8 px-2">
                <div>
                    <h1 className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm md:text-base">
                        {sortedClasses.length} active courses
                    </h1>

                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 px-6 rounded-[18px] bg-white dark:bg-[#18181b] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2 group"
                    >
                        <ArchiveBoxIcon className="w-5 h-5 stroke-[2] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                        <span>Archive</span>
                    </button>
                    <button 
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 px-6 rounded-[18px] bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 transition-all flex items-center gap-2 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                        <PlusCircleIcon className="w-6 h-6 stroke-[2]" />
                        <span>Create</span>
                    </button>
                </div>
            </div>

            {/* --- UPDATED GRID LAYOUT (Max 3 Columns for Wider Cards) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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