// src/components/teacher/dashboard/views/ClassesView.jsx
import React, { useMemo, memo, useCallback, forwardRef } from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon, EllipsisHorizontalIcon,
    ClipboardDocumentListIcon // Keeping this as it's used in amber theme
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';

// --- ENHANCED PASTEL THEME CONFIGURATION ---
const PASTEL_THEMES = [
    {
        id: 'sky',
        icon: AcademicCapIcon,
        bgGradient: 'from-sky-50 to-white',
        border: 'border-sky-100/50',
        iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/30',
        btnGradient: 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sky-500/25',
        badgeBg: 'bg-sky-100/50 text-sky-700',
        dotColor: 'bg-sky-500',
        accentShadow: 'hover:shadow-sky-500/10'
    },
    {
        id: 'rose',
        icon: UserGroupIcon,
        bgGradient: 'from-rose-50 to-white',
        border: 'border-rose-100/50',
        iconBg: 'bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-500/30',
        btnGradient: 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/25',
        badgeBg: 'bg-rose-100/50 text-rose-700',
        dotColor: 'bg-rose-500',
        accentShadow: 'hover:shadow-rose-500/10'
    },
    {
        id: 'emerald',
        icon: ShieldCheckIcon,
        bgGradient: 'from-emerald-50 to-white',
        border: 'border-emerald-100/50',
        iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30',
        btnGradient: 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25',
        badgeBg: 'bg-emerald-100/50 text-emerald-700',
        dotColor: 'bg-emerald-500',
        accentShadow: 'hover:shadow-emerald-500/10'
    },
    {
        id: 'amber',
        icon: ClipboardDocumentListIcon,
        bgGradient: 'from-amber-50 to-white',
        border: 'border-amber-100/50',
        iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30',
        btnGradient: 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/25',
        badgeBg: 'bg-amber-100/50 text-amber-700',
        dotColor: 'bg-amber-500',
        accentShadow: 'hover:shadow-amber-500/10'
    },
];

// --- 1. SKELETON ---
const SkeletonClassCard = memo(forwardRef((props, ref) => (
    <div ref={ref} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[32px] border border-slate-200/50 dark:border-slate-700/50 p-6 h-[200px] sm:h-[220px] flex flex-col justify-between shadow-xl shadow-slate-200/20 dark:shadow-black/40 animate-pulse relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        <div className="flex gap-5 items-start">
            <div className="w-16 h-16 rounded-[24px] bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-4 pt-1">
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
        </div>
        <div className="flex gap-3 mt-4 h-12">
            <div className="w-[30%] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
    </div>
)));

// --- 2. ENHANCED CLASS CARD ---
const ClassCard = memo(forwardRef(({
    c,
    theme,
    onOpenOverview,
    onEdit,
    onArchive,
    onDelete,
    onStartOnline,
    onEndOnline,
    showToast
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => onOpenOverview(c)}
            className={`
                group relative w-full
                bg-gradient-to-br ${theme.bgGradient}
                dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800
                rounded-[32px] 
                border ${theme.border} dark:border-slate-700/50
                shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)]
                hover:shadow-2xl hover:shadow-${theme.id}-500/20 dark:hover:shadow-${theme.id}-500/10
                overflow-visible flex flex-col justify-between
                transition-all duration-400 ease-[cubic-bezier(0.33,1,0.68,1)]
                hover:-translate-y-2 hover:scale-[1.02]
                cursor-pointer
                h-auto min-h-[190px] sm:min-h-[210px]
            `}
        >
            {/* Glassmorphic Top Overlay */}
            <div className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-sm rounded-[32px] pointer-events-none transition-opacity group-hover:opacity-0" />

            {/* Inner Glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* --- TOP SECTION: Visuals & Info --- */}
            <div className="relative z-20 p-5 sm:p-6 flex justify-between items-start gap-4">
                <div className="flex gap-5 items-start overflow-hidden w-full">
                    {/* Modern Squircle Icon */}
                    <div className={`
                        flex-shrink-0
                        w-14 h-14 sm:w-16 sm:h-16
                        rounded-[22px] sm:rounded-[24px]
                        flex items-center justify-center 
                        text-white
                        ${theme.iconBg} 
                        shadow-lg
                        group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-out
                    `}>
                        <theme.icon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2]" />
                    </div>

                    {/* Text Info */}
                    <div className="min-w-0 flex-1 pt-0.5 flex flex-col">
                        <h2
                            className="text-[18px] sm:text-[20px] font-black text-slate-800 dark:text-white leading-tight tracking-tight mb-2 line-clamp-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                            title={c.name}
                        >
                            {c.name}
                        </h2>

                        <div className="flex items-center flex-wrap gap-2.5 mt-auto">
                            <span className={`
                                inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest
                                ${theme.badgeBg} dark:bg-white/10 dark:text-slate-300 ring-1 ring-black/5 dark:ring-white/10
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
                    className="group/menu relative -mr-2 -mt-2 p-2.5 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors rounded-full hover:bg-white/50 dark:hover:bg-white/10 flex-shrink-0"
                >
                    <EllipsisHorizontalIcon className="w-6 h-6 stroke-[2.5]" />
                    {/* Glass Dropdown Menu */}
                    <div className="absolute right-0 top-12 hidden group-hover/menu:flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-1.5 z-50 min-w-[180px] animate-in fade-in zoom-in-95 origin-top-right">
                        <div onClick={() => onEdit(c)} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3 transition-colors">
                            <PencilSquareIcon className="w-4 h-4" /> Edit Details
                        </div>
                        <div onClick={() => onArchive(c.id, c.name)} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3 transition-colors">
                            <ArchiveBoxIcon className="w-4 h-4" /> Archive Class
                        </div>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                        <div onClick={() => onDelete(c.id)} className="px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-3 transition-colors">
                            <TrashIcon className="w-4 h-4" /> Delete Class
                        </div>
                    </div>
                </button>
            </div>

            {/* --- BOTTOM SECTION: Actions --- */}
            <div className="relative z-10 p-5 sm:p-6 pt-0 mt-auto flex items-center gap-3">
                {/* 1. Code Ticket */}
                <button
                    onClick={handleCopyCode}
                    className="
                        group/code flex-shrink-0 w-24 sm:w-28
                        h-11 sm:h-12
                        flex flex-col items-center justify-center
                        bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800
                        border border-slate-200/50 dark:border-slate-700/50
                        rounded-[16px]
                        active:scale-95 transition-all duration-300 shadow-sm
                    "
                >
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Code</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-300 group-hover/code:text-slate-900 dark:group-hover/code:text-white transition-colors">
                            {c.classCode}
                        </span>
                        <ClipboardIcon className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-[var(--monet-primary)] transition-colors" />
                    </div>
                </button>

                {/* 2. Primary Action Button */}
                {isLive ? (
                    <div className="flex-1 flex gap-2 h-11 sm:h-12">
                        <button
                            onClick={handleAction}
                            className="flex-1 bg-red-500 text-white rounded-[16px] font-bold text-sm shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-full w-full bg-white"></span>
                            </span>
                            <span>Join Live</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onEndOnline(c.id); }}
                            className="w-11 sm:w-12 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 text-red-500 rounded-[16px] flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors active:scale-90 shadow-sm"
                        >
                            <IconPower className="w-5 h-5" stroke={2.5} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAction}
                        className={`
                            flex-1 h-11 sm:h-12
                            rounded-[16px] 
                            font-bold text-sm text-white shadow-xl
                            flex items-center justify-center gap-2.5
                            active:scale-95 transition-all duration-300
                            group/btn relative overflow-hidden
                            ${hasValidLink ? theme.btnGradient : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 shadow-slate-800/20'}
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
                                <PencilSquareIcon className="w-4 h-4" strokeWidth={2.5} />
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
    activeClasses,
    loading = false,
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full flex flex-col pb-40 lg:pb-12 relative z-10"
        >
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-8 px-2">
                <div className="w-full md:w-auto text-left">
                    <h1 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        {sortedClasses.length} Active Courses
                    </h1>
                </div>
                {/* Modern Glass Buttons */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 px-6 rounded-[20px] bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-lg shadow-slate-200/20 dark:shadow-black/20 transition-all duration-300 active:scale-95 flex items-center gap-2 group hover:border-[var(--monet-primary)] dark:hover:border-[var(--monet-primary)]"
                    >
                        <ArchiveBoxIcon className="w-5 h-5 stroke-[2] text-slate-500 dark:text-slate-400 group-hover:text-[var(--monet-primary)] transition-colors" />
                        <span>Archive</span>
                    </button>
                    <button
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-12 px-7 rounded-[20px] bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm shadow-xl shadow-slate-900/20 dark:shadow-white/20 active:scale-95 transition-all duration-300 flex items-center gap-2 group"
                    >
                        <PlusCircleIcon className="w-5 h-5 stroke-[2.5]" />
                        <span>Create Class</span>
                    </button>
                </div>
            </div>

            {/* --- GRID LAYOUT --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <AnimatePresence>
                    {loading ? (
                        [...Array(6)].map((_, i) => <SkeletonClassCard key={i} />)
                    ) : sortedClasses.length > 0 ? (
                        sortedClasses.map((c, index) => {
                            const theme = PASTEL_THEMES[index % PASTEL_THEMES.length];
                            return (
                                <ClassCard
                                    key={c.id}
                                    c={c}
                                    theme={theme}
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
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white/40 backdrop-blur-xl rounded-[32px] border border-slate-200/50">
                            <div className="w-20 h-20 rounded-[24px] bg-white border border-slate-100 flex items-center justify-center mb-5 shadow-sm">
                                <SquaresPlusIcon className="w-8 h-8 text-sky-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No Classes Found</h3>
                            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
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