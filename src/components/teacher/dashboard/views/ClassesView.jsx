// src/components/teacher/dashboard/views/ClassesView.jsx
import React, { useMemo, memo, useCallback, forwardRef } from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon, EllipsisHorizontalIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';

// --- ULTRA PREMIUM THEME CONFIGURATION ---
const PASTEL_THEMES = [
    {
        id: 'sky',
        icon: AcademicCapIcon,
        bgGradient: 'from-sky-50/95 to-white/95 md:from-sky-50/80 md:to-white/80',
        border: 'border-white/80 dark:border-slate-700/50',
        iconBg: 'bg-sky-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        btnGradient: 'bg-gradient-to-b from-sky-500 to-sky-600 shadow-[0_8px_20px_rgba(14,165,233,0.25)] border-t border-white/20',
        badgeBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20',
        dotColor: 'bg-sky-500',
        glow: 'from-sky-300 to-blue-400 dark:from-sky-600 dark:to-blue-900'
    },
    {
        id: 'rose',
        icon: UserGroupIcon,
        bgGradient: 'from-rose-50/95 to-white/95 md:from-rose-50/80 md:to-white/80',
        border: 'border-white/80 dark:border-slate-700/50',
        iconBg: 'bg-rose-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        btnGradient: 'bg-gradient-to-b from-rose-500 to-rose-600 shadow-[0_8px_20px_rgba(244,63,94,0.25)] border-t border-white/20',
        badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20',
        dotColor: 'bg-rose-500',
        glow: 'from-rose-300 to-pink-400 dark:from-rose-600 dark:to-pink-900'
    },
    {
        id: 'emerald',
        icon: ShieldCheckIcon,
        bgGradient: 'from-emerald-50/95 to-white/95 md:from-emerald-50/80 md:to-white/80',
        border: 'border-white/80 dark:border-slate-700/50',
        iconBg: 'bg-emerald-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        btnGradient: 'bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.25)] border-t border-white/20',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
        dotColor: 'bg-emerald-500',
        glow: 'from-emerald-300 to-teal-400 dark:from-emerald-600 dark:to-teal-900'
    },
    {
        id: 'amber',
        icon: ClipboardDocumentListIcon,
        bgGradient: 'from-amber-50/95 to-white/95 md:from-amber-50/80 md:to-white/80',
        border: 'border-white/80 dark:border-slate-700/50',
        iconBg: 'bg-amber-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
        btnGradient: 'bg-gradient-to-b from-orange-400 to-orange-500 shadow-[0_8px_20px_rgba(249,115,22,0.25)] border-t border-white/20',
        badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20',
        dotColor: 'bg-amber-500',
        glow: 'from-amber-300 to-orange-400 dark:from-amber-600 dark:to-orange-900'
    },
];

// --- 1. SKELETON ---
const SkeletonClassCard = memo(forwardRef((props, ref) => (
    <div ref={ref} className="bg-white/95 md:bg-white/80 dark:bg-slate-900/95 md:dark:bg-slate-900/80 md:backdrop-blur-2xl rounded-[32px] md:rounded-[40px] border border-slate-200/50 dark:border-slate-700/50 p-6 h-[200px] sm:h-[220px] flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="flex gap-5 items-start">
            <div className="w-16 h-16 rounded-[24px] bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-4 pt-1">
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
        </div>
        <div className="flex gap-3 mt-4 h-12">
            <div className="w-[30%] bg-slate-200 dark:bg-slate-800 rounded-[20px]" />
            <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-[20px]" />
        </div>
    </div>
)));

// --- 2. ENHANCED CLASS CARD ---
const ClassCard = memo(forwardRef(({
    c, theme, onOpenOverview, onEdit, onArchive, onDelete,
    onStartOnline, onEndOnline, showToast
}, ref) => {
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
            ref={ref}
            style={{ willChange: "transform, opacity" }}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            onClick={() => onOpenOverview(c)}
            className={`
                group relative w-full
                bg-gradient-to-br ${theme.bgGradient}
                dark:bg-slate-900/95 md:dark:bg-slate-900/80
                md:backdrop-blur-2xl
                rounded-[32px] md:rounded-[40px]
                border ${theme.border}
                shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] 
                dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]
                hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)]
                overflow-hidden flex flex-col justify-between
                transition-all duration-500
                hover:-translate-y-2
                cursor-pointer h-auto min-h-[200px] sm:min-h-[230px]
            `}
        >
            {/* Ambient Glow Orb Inside Card (Mobile Optimized: Static on mobile, grows on desktop hover) */}
            <div className={`absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br ${theme.glow} blur-[50px] opacity-20 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen transition-all duration-700 md:group-hover:scale-125 md:group-hover:opacity-40 pointer-events-none z-0`} />

            {/* Inner Glow Highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />

            {/* --- TOP SECTION: Visuals & Info --- */}
            <div className="relative z-20 p-5 sm:p-7 flex justify-between items-start gap-4">
                <div className="flex gap-4 sm:gap-5 items-start overflow-hidden w-full">
                    {/* Modern Squircle Icon */}
                    <div className={`
                        flex-shrink-0
                        w-14 h-14 sm:w-16 sm:h-16
                        rounded-[20px] sm:rounded-[24px]
                        flex items-center justify-center 
                        ${theme.iconBg}
                        group-hover:scale-110 md:group-hover:rotate-3 transition-transform duration-500 ease-out
                    `}>
                        <theme.icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
                    </div>

                    {/* Text Info */}
                    <div className="min-w-0 flex-1 flex flex-col pt-1">
                        <h2
                            className="text-[19px] sm:text-[22px] font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                            title={c.name}
                        >
                            {c.name}
                        </h2>

                        <div className="flex items-center flex-wrap gap-2.5 mt-auto">
                            <span className={`
                                inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest
                                ${theme.badgeBg} dark:bg-white/10 dark:text-slate-300 dark:border-white/10
                            `}>
                                {c.gradeLevel}
                            </span>

                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <div className={`w-1.5 h-1.5 rounded-full ${theme.dotColor} shadow-[0_0_8px_rgba(0,0,0,0.2)]`} />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-[150px]">
                                    {c.section}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Action Menu */}
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="group/menu relative -mr-2 -mt-2 p-2.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0 z-50"
                >
                    <EllipsisHorizontalIcon className="w-6 h-6 stroke-[2.5]" />
                    {/* Glass Dropdown Menu - Solid on mobile, blur on md */}
                    <div className="absolute right-0 top-12 hidden group-hover/menu:flex flex-col bg-white/95 dark:bg-slate-900/95 md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-[20px] shadow-xl p-1.5 z-50 min-w-[180px] animate-in fade-in zoom-in-95 origin-top-right">
                        <div onClick={() => onEdit(c)} className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[14px] text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3 transition-colors">
                            <PencilSquareIcon className="w-4 h-4" /> Edit Details
                        </div>
                        <div onClick={() => onArchive(c.id, c.name)} className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[14px] text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3 transition-colors">
                            <ArchiveBoxIcon className="w-4 h-4" /> Archive Class
                        </div>
                        <div className="h-px bg-slate-200/60 dark:bg-slate-700/60 my-1 mx-2" />
                        <div onClick={() => onDelete(c.id)} className="px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-[14px] text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-3 transition-colors">
                            <TrashIcon className="w-4 h-4" /> Delete Class
                        </div>
                    </div>
                </button>
            </div>

            {/* --- BOTTOM SECTION: Actions --- */}
            <div className="relative z-20 p-5 sm:p-7 pt-0 mt-auto flex items-center gap-3">
                {/* 1. Code Ticket */}
                <button
                    onClick={handleCopyCode}
                    className="
                        group/code flex-shrink-0 w-24 sm:w-28 h-12 md:h-14
                        flex flex-col items-center justify-center
                        bg-white/60 dark:bg-slate-800/60 md:backdrop-blur-md hover:bg-white dark:hover:bg-slate-800
                        border border-white/80 dark:border-slate-700/50
                        rounded-[20px] md:rounded-[24px]
                        active:scale-95 transition-all duration-300 shadow-sm
                    "
                >
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Code</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-300 group-hover/code:text-slate-900 dark:group-hover/code:text-white transition-colors">
                            {c.classCode}
                        </span>
                        <ClipboardIcon className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-indigo-500 transition-colors stroke-[2]" />
                    </div>
                </button>

                {/* 2. Primary Action Button */}
                {isLive ? (
                    <div className="flex-1 flex gap-2 h-12 md:h-14">
                        <button
                            onClick={handleAction}
                            className="flex-1 bg-gradient-to-b from-red-500 to-red-600 text-white rounded-[20px] md:rounded-[24px] font-bold text-sm shadow-[0_8px_20px_rgba(239,68,68,0.3)] border-t border-white/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-full w-full bg-white"></span>
                            </span>
                            <span>Join Live</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEndOnline(c.id); }}
                            className="w-12 md:w-14 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 text-red-500 rounded-[20px] md:rounded-[24px] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors active:scale-90 shadow-sm"
                        >
                            <IconPower className="w-5 h-5" stroke={2.5} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAction}
                        className={`
                            flex-1 h-12 md:h-14
                            rounded-[20px] md:rounded-[24px]
                            font-bold text-sm text-white
                            flex items-center justify-center gap-2.5
                            active:scale-95 transition-all duration-300
                            group/btn relative overflow-hidden
                            ${hasValidLink ? theme.btnGradient : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 shadow-sm'}
                        `}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                        {hasValidLink ? (
                            <>
                                <VideoCameraIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                <span>Start Class</span>
                            </>
                        ) : (
                            <>
                                <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                                <span>Setup Link</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </motion.div>
    );
}));

// --- MAIN VIEW COMPONENT ---
const ClassesView = ({
    activeClasses, loading = false, setClassOverviewModal,
    handleOpenEditClassModal, handleArchiveClass, handleDeleteClass, showToast,
    setIsArchivedModalOpen, setCreateClassModalOpen,
    handleStartOnlineClass, handleEndOnlineClass,
}) => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

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

    const handleOpenOverview = useCallback((c) => {
        setClassOverviewModal({ isOpen: true, data: c });
        navigate(`/dashboard/classes/${c.id}`);
    }, [setClassOverviewModal, navigate]);

    return (
        <motion.div
            style={{ willChange: "opacity" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col pb-40 lg:pb-12 relative z-10 selection:bg-indigo-500/30"
        >
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6 md:mb-10 px-2">
                <div className="w-full md:w-auto text-left">
                    <h1 className="text-slate-500 dark:text-slate-400 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] md:animate-pulse" />
                        {sortedClasses.length} Active Courses
                    </h1>
                </div>
                {/* Premium Glass Buttons */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 md:h-14 px-6 md:px-8 rounded-[20px] md:rounded-[24px] bg-white/95 dark:bg-slate-800/95 md:bg-white/70 md:dark:bg-slate-800/70 md:backdrop-blur-xl border border-white/80 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-[0_8px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all duration-300 active:scale-95 flex items-center gap-2 group hover:border-indigo-200 dark:hover:border-indigo-900"
                    >
                        <ArchiveBoxIcon className="w-5 h-5 stroke-[2] text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span>Archive</span>
                    </button>
                    <button
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 md:h-14 px-6 md:px-8 rounded-[20px] md:rounded-[24px] bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_20px_rgba(255,255,255,0.12)] active:scale-95 transition-all duration-300 flex items-center gap-2 group"
                    >
                        <PlusCircleIcon className="w-5 h-5 stroke-[2.5]" />
                        <span>Create Class</span>
                    </button>
                </div>
            </div>

            {/* --- GRID LAYOUT --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                <AnimatePresence>
                    {loading ? (
                        [...Array(6)].map((_, i) => <SkeletonClassCard key={i} />)
                    ) : sortedClasses.length > 0 ? (
                        sortedClasses.map((c, index) => {
                            const theme = PASTEL_THEMES[index % PASTEL_THEMES.length];
                            return (
                                <ClassCard
                                    key={c.id} c={c} theme={theme}
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
                        /* --- PREMIUM EMPTY STATE --- */
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="col-span-full py-20 md:py-32 flex flex-col items-center justify-center text-center bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-3xl rounded-[32px] md:rounded-[48px] border border-white/80 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 rounded-full bg-indigo-500/10 blur-[80px]" />
                            </div>
                            
                            <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-[28px] md:rounded-[40px] bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white dark:border-slate-700 flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <SquaresPlusIcon className="w-12 h-12 md:w-16 md:h-16 text-indigo-500 dark:text-indigo-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">No Classes Found</h3>
                            <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                                You haven't created any classes yet. Click the "Create Class" button above to get started.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default memo(ClassesView);