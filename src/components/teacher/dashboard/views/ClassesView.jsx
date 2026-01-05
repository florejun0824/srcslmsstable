// src/components/teacher/dashboard/views/ClassesView.jsx
import React, { useMemo } from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon, EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../contexts/AuthContext'; 

// --- 1. COMPACT SKELETON ---
const SkeletonClassCard = () => (
    <div className="relative bg-white dark:bg-[#121212] rounded-[2rem] border border-slate-100 dark:border-white/5 p-5 flex flex-col h-[320px] overflow-hidden shadow-sm">
        <div className="flex justify-between items-start mb-6 animate-pulse">
            <div className="flex gap-3 w-full">
                <div className="w-14 h-14 rounded-[1.2rem] bg-slate-100 dark:bg-white/5" />
                <div className="space-y-2 flex-1 pt-1">
                    <div className="h-5 w-3/4 bg-slate-100 dark:bg-white/5 rounded-full" />
                    <div className="h-3 w-1/3 bg-slate-100 dark:bg-white/5 rounded-full" />
                </div>
            </div>
        </div>
        <div className="flex-grow space-y-2">
             <div className="h-12 w-full bg-slate-50 dark:bg-white/[0.02] rounded-[1.2rem] animate-pulse" />
        </div>
        <div className="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-[1.2rem] mt-4 animate-pulse" />
    </div>
);

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
    
    // --- 2. REFINED AURORA THEMES ---
    const auroraThemes = [
        { 
            id: 'northern',
            icon: AcademicCapIcon,
            gradient: 'from-blue-500/10 via-cyan-400/5 to-transparent',
            iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
        },
        { 
            id: 'sunset',
            icon: UserGroupIcon, 
            gradient: 'from-orange-500/10 via-rose-400/5 to-transparent',
            iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
        },
        { 
            id: 'nebula',
            icon: ClipboardDocumentListIcon, 
            gradient: 'from-violet-500/10 via-fuchsia-400/5 to-transparent',
            iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
        },
        { 
            id: 'teal',
            icon: ShieldCheckIcon, 
            gradient: 'from-teal-500/10 via-emerald-400/5 to-transparent',
            iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300',
        },
    ];

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
                    {/* Updated Archive Button: Now fully styled */}
                    <button 
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-11 px-5 rounded-[1rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2"
                    >
                        <ArchiveBoxIcon className="w-4 h-4" />
                        <span>Archive</span>
                    </button>
                    <button 
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex-1 md:flex-none justify-center h-11 px-5 rounded-[1rem] bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        <span>Create</span>
                    </button>
                </div>
            </div>

            {/* --- GRID LAYOUT --- 
                Updated: lg:grid-cols-4 allows 4 cards on desktop screens.
                Reduced gap slightly to fit them better.
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [...Array(4)].map((_, i) => <SkeletonClassCard key={i} />)
                    ) : sortedClasses.length > 0 ? (
                        sortedClasses.map((c, index) => {
                            const theme = auroraThemes[index % auroraThemes.length];
                            const meetLink = c.meetLink || null;
                            const hasValidLink = meetLink && meetLink.startsWith("https://meet.google.com/");
                            const isLive = c.videoConference?.isLive || false;

                            return (
                                <motion.div
                                    key={c.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -6, scale: 1.01 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    // Reduced min-h from 360px to 320px for compacter look
                                    className={`
                                        group relative w-full
                                        bg-white dark:bg-[#121212] 
                                        rounded-[2rem] 
                                        border border-slate-100 dark:border-white/5
                                        shadow-lg shadow-slate-200/50 dark:shadow-black/50
                                        overflow-hidden flex flex-col 
                                        min-h-[320px] 
                                        hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-900/10
                                        transition-all duration-500 ease-out
                                    `}
                                >
                                    {/* Ambient Background Glow */}
                                    <div className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-b ${theme.gradient} opacity-60 dark:opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-80`} />

                                    <div
                                        onClick={() => !isHoveringActions && setClassOverviewModal({ isOpen: true, data: c })}
                                        className="relative z-10 p-5 flex flex-col h-full cursor-pointer"
                                    >
                                        {/* --- CARD HEADER --- */}
                                        <div className="flex justify-between items-start mb-4 relative">
                                            <div className="flex gap-3 items-start w-full min-w-0 pr-8">
                                                {/* Icon Squircle */}
                                                <div className={`
                                                    w-12 h-12 rounded-[1rem] 
                                                    flex items-center justify-center flex-shrink-0
                                                    ${theme.iconBg} 
                                                    backdrop-blur-xl border border-white/20 dark:border-white/5
                                                    shadow-sm
                                                `}>
                                                    <theme.icon className="w-6 h-6" />
                                                </div>

                                                {/* Text Info */}
                                                <div className="pt-0.5 min-w-0 flex-1">
                                                    {/* Updated: line-clamp-2 allows text to wrap to 2 lines instead of cutting off */}
                                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 tracking-tight">
                                                        {c.name}
                                                    </h2>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide truncate">
                                                        {c.gradeLevel} • {c.section}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Menu (Enhanced Visibility) */}
                                            <div 
                                                className="absolute -top-1 -right-1"
                                                onMouseEnter={() => setIsHoveringActions(true)}
                                                onMouseLeave={() => setIsHoveringActions(false)}
                                            >
                                                <div className="relative group/menu">
                                                     {/* Default State: Visible Circular Button */}
                                                    <button className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 transition-colors shadow-sm">
                                                        <EllipsisHorizontalIcon className="w-5 h-5" />
                                                    </button>
                                                    
                                                    {/* Hover State: Expanded Glass Pill */}
                                                    <div className="absolute right-0 top-0 hidden group-hover/menu:flex flex-col bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-xl p-1.5 z-20 min-w-[140px] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold transition-all">
                                                            <PencilSquareIcon className="w-4 h-4" /> Edit
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id, c.name); }} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 text-slate-500 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-bold transition-all">
                                                            <ArchiveBoxIcon className="w-4 h-4" /> Archive
                                                        </button>
                                                        <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-2" />
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id, false); }} className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition-all">
                                                            <TrashIcon className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-grow" />

                                        {/* --- CLASS CODE SURFACE --- */}
                                        {c.classCode && (
                                            <div className="mb-4 relative group/code">
                                                <div 
                                                    className="
                                                        bg-slate-50 dark:bg-white/[0.03] 
                                                        rounded-[1.2rem] 
                                                        border border-slate-100 dark:border-white/5 
                                                        p-1 pl-1 flex items-center justify-between
                                                        transition-colors duration-300
                                                        group-hover/code:bg-blue-50/50 dark:group-hover/code:bg-blue-500/10
                                                        group-hover/code:border-blue-100 dark:group-hover/code:border-blue-500/20
                                                    "
                                                >
                                                    <div className="flex flex-col pl-3 py-1.5">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Code</span>
                                                        <span className="text-base font-mono font-bold text-slate-700 dark:text-slate-200 tracking-wider">
                                                            {c.classCode}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(c.classCode);
                                                            showToast("Copied!", "success");
                                                        }}
                                                        className="h-10 w-10 rounded-[1rem] bg-white dark:bg-[#1E1E1E] shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        <ClipboardIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- ACTION BUTTON --- */}
                                        <div className="w-full relative z-10">
                                            {isLive ? (
                                                <div className="flex gap-2 h-12">
                                                    <motion.button
                                                        whileTap={{ scale: 0.97 }}
                                                        onClick={(e) => { e.stopPropagation(); window.open(meetLink, '_blank'); }}
                                                        disabled={!hasValidLink}
                                                        className="flex-1 rounded-[1rem] bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 relative overflow-hidden"
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                        <VideoCameraIcon className="w-4 h-4 relative z-10" /> 
                                                        <span className="relative z-10">Join Live</span>
                                                    </motion.button>
                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={(e) => { e.stopPropagation(); handleEndOnlineClass(c.id); }}
                                                        className="w-12 rounded-[1rem] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-red-500 border border-slate-100 dark:border-white/5 flex items-center justify-center transition-colors shadow-sm"
                                                    >
                                                        <IconPower className="w-4 h-4" /> 
                                                    </motion.button>
                                                </div>
                                            ) : (
                                                <motion.button
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={async (e) => {
                                                        e.stopPropagation(); 
                                                        if (!hasValidLink) { handleOpenEditClassModal(c); return; }
                                                        handleStartOnlineClass(c.id, c.classCode, meetLink);
                                                    }}
                                                    className={`
                                                        w-full h-12 rounded-[1rem] text-xs font-bold text-white shadow-xl 
                                                        flex items-center justify-center gap-2 transition-all
                                                        ${hasValidLink 
                                                            ? 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-slate-900/10 dark:shadow-white/5' 
                                                            : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                                                        }
                                                    `}
                                                >
                                                    {hasValidLink ? <VideoCameraIcon className="w-4 h-4" /> : <PencilSquareIcon className="w-4 h-4" />}
                                                    <span>{hasValidLink ? "Start Class" : "Setup Meet Link"}</span>
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        /* --- EMPTY STATE --- */
                        <div className="col-span-full py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center mb-6 relative overflow-hidden">
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

export default ClassesView;