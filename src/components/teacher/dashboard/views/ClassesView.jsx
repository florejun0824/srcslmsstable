// src/components/teacher/dashboard/views/ClassesView.jsx
import React from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';
import { motion } from 'framer-motion';

// --- COMPACT SKELETON COMPONENT (Mobile Optimized) ---
const SkeletonClassCard = () => (
    <div className="relative bg-white dark:bg-[#0f1115] rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4 md:p-6 flex flex-col h-auto md:h-[340px] overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex flex-row md:flex-row justify-between items-center md:items-start mb-4 md:mb-6 animate-pulse gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                 <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                 <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
            {/* Desktop Actions Placeholder */}
            <div className="hidden md:flex gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
        </div>
        
        <div className="flex-grow hidden md:block" />

        {/* Mobile Middle Row Skeleton */}
        <div className="flex md:hidden gap-3 mb-3">
            <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="flex-1 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>

        {/* Desktop Code Skeleton */}
        <div className="hidden md:block h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl mb-4 animate-pulse" />
        
        {/* Button Skeleton */}
        <div className="h-10 md:h-12 w-full bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
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
    
    const auroraThemes = [
        { 
            id: 'northern',
            icon: AcademicCapIcon,
            c1: 'rgba(59, 130, 246, 0.15)',
            c2: 'rgba(16, 185, 129, 0.15)',
            c3: 'rgba(99, 102, 241, 0.15)',
            border: 'border-blue-100 dark:border-blue-500/20',
            text: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        { 
            id: 'sunset',
            icon: UserGroupIcon, 
            c1: 'rgba(245, 158, 11, 0.15)',
            c2: 'rgba(236, 72, 153, 0.15)',
            c3: 'rgba(244, 63, 94, 0.15)',
            border: 'border-orange-100 dark:border-orange-500/20',
            text: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-50 dark:bg-orange-900/20'
        },
        { 
            id: 'nebula',
            icon: ClipboardDocumentListIcon, 
            c1: 'rgba(139, 92, 246, 0.15)',
            c2: 'rgba(236, 72, 153, 0.15)',
            c3: 'rgba(59, 130, 246, 0.15)',
            border: 'border-violet-100 dark:border-violet-500/20',
            text: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/20'
        },
        { 
            id: 'teal',
            icon: ShieldCheckIcon, 
            c1: 'rgba(20, 184, 166, 0.15)',
            c2: 'rgba(6, 182, 212, 0.15)',
            c3: 'rgba(59, 130, 246, 0.15)',
            border: 'border-teal-100 dark:border-teal-500/20',
            text: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-50 dark:bg-teal-900/20'
        },
    ];

    const sortedClasses = [...(activeClasses || [])].sort((a, b) => {
        const gradeA = parseInt(a.gradeLevel.match(/\d+/));
        const gradeB = parseInt(b.gradeLevel.match(/\d+/));
        if (gradeA < gradeB) return -1;
        if (gradeA > gradeB) return 1;
        return 0;
    });

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full h-full flex flex-col font-sans pb-32 lg:pb-8 relative z-10"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-8 px-1">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Class Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Manage your active classes below.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <ArchiveBoxIcon className="w-4 h-4" />
                        Archived
                    </button>
                    <button 
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        Create Class
                    </button>
                </div>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
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
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -5 }}
                                whileTap={{ scale: 0.98 }}
                                // Mobile: h-auto (fit content). Desktop: h-full min-h-[340px]
                                className={`group relative bg-white dark:bg-[#0f1115] rounded-[2rem] border ${theme.border} shadow-lg hover:shadow-2xl overflow-hidden flex flex-col h-auto md:h-full md:min-h-[340px] transition-all duration-300`}
                            >
                                <div 
                                    className="absolute inset-0 opacity-60 dark:opacity-40 pointer-events-none transition-opacity duration-500"
                                    style={{
                                        background: `
                                            radial-gradient(at 0% 0%, ${theme.c1} 0px, transparent 50%),
                                            radial-gradient(at 100% 0%, ${theme.c2} 0px, transparent 50%),
                                            radial-gradient(at 100% 100%, ${theme.c3} 0px, transparent 50%)
                                        `
                                    }}
                                />

                                <div
                                    onClick={() => !isHoveringActions && setClassOverviewModal({ isOpen: true, data: c })}
                                    className="relative z-10 p-4 md:p-6 flex flex-col h-full cursor-pointer"
                                >
                                    {/* 1. Header (Responsive Layout) */}
                                    <div className="flex flex-row md:flex-col justify-start md:justify-between items-center md:items-start mb-4 gap-4 md:gap-0">
                                        
                                        {/* Icon Container - FIXED WIDTH LOGIC */}
                                        <div className="flex justify-between w-auto md:w-full items-start">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl ${theme.bg} flex items-center justify-center shadow-sm border border-white/50 dark:border-white/5 ${theme.text} flex-shrink-0`}>
                                                <theme.icon className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>

                                            {/* Desktop Actions (Hidden on Mobile) */}
                                            <div 
                                                className="hidden md:flex items-center gap-1 bg-white/50 dark:bg-black/20 p-1 rounded-xl border border-black/5 dark:border-white/5 backdrop-blur-none"
                                                onMouseEnter={() => setIsHoveringActions(true)}
                                                onMouseLeave={() => setIsHoveringActions(false)}
                                            >
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-all"><PencilSquareIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id, c.name); }} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-orange-500 transition-all"><ArchiveBoxIcon className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id, false); }} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        {/* Title & Details (Responsive Position) */}
                                        <div className="flex-1 min-w-0 md:mt-4 md:mb-4">
                                            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight line-clamp-1 md:line-clamp-2 mb-0.5 md:mb-1 tracking-tight">
                                                {c.name}
                                            </h2>
                                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                                                {c.gradeLevel} • {c.section}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Spacer (Desktop Only) */}
                                    <div className="flex-grow hidden md:block" />

                                    {/* 2. Middle Row (Mobile Compact) */}
                                    <div className="flex md:hidden items-center gap-2 mb-3">
                                         {/* Class Code (Compact) */}
                                         {c.classCode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(c.classCode);
                                                    showToast("Copied!", "success");
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 transition-colors"
                                            >
                                                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{c.classCode}</span>
                                                <ClipboardIcon className="w-3 h-3 text-slate-400" />
                                            </button>
                                         )}
                                         
                                         <div className="flex-grow" />

                                         {/* Compact Action Icons */}
                                         <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-0.5">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }} className="p-2 text-slate-400 hover:text-blue-500"><PencilSquareIcon className="w-4 h-4" /></button>
                                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
                                            <button onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id, c.name); }} className="p-2 text-slate-400 hover:text-orange-500"><ArchiveBoxIcon className="w-4 h-4" /></button>
                                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id, false); }} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                         </div>
                                    </div>

                                    {/* 3. Class Code (Desktop Full Width) */}
                                    {c.classCode && (
                                        <div className="hidden md:block mb-4">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Class Code</div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(c.classCode);
                                                    showToast("Class code copied!", "success");
                                                }}
                                                className="group/code w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 flex items-center justify-between"
                                            >
                                                <span className="text-xl font-mono font-bold text-slate-700 dark:text-slate-200 tracking-widest pl-2">
                                                    {c.classCode}
                                                </span>
                                                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-400 group-hover/code:text-blue-500 shadow-sm">
                                                    <ClipboardIcon className="w-4 h-4" />
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    {/* 4. Start Button */}
                                    <div className="w-full">
                                        {isLive ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); window.open(meetLink, '_blank'); }}
                                                    disabled={!hasValidLink}
                                                    className="flex-1 px-4 py-2.5 md:py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                                                >
                                                    <VideoCameraIcon className="w-4 h-4" /> 
                                                    Join Live
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEndOnlineClass(c.id); }}
                                                    className="px-4 py-2.5 md:py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/30 transition-all active:scale-95 shadow-sm"
                                                >
                                                    <IconPower className="w-4 h-4" /> 
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation(); 
                                                    if (!hasValidLink) { handleOpenEditClassModal(c); return; }
                                                    handleStartOnlineClass(c.id, c.classCode, meetLink);
                                                }}
                                                className={`w-full px-4 py-2.5 md:py-3.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                                    ${hasValidLink 
                                                        ? 'bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-slate-900/10' 
                                                        : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                                                    }`}
                                            >
                                                {hasValidLink ? <VideoCameraIcon className="w-4 h-4" /> : <PencilSquareIcon className="w-4 h-4" />}
                                                <span>{hasValidLink ? "Start Online Class" : "Setup Meet Link"}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 px-6 bg-white dark:bg-[#1A1D24] rounded-[3rem] text-center border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
                            <SquaresPlusIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">No Active Classes</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                            Get started by creating your first class. All your active classes will appear here.
                        </p>
                        <button 
                            onClick={() => setCreateClassModalOpen(true)}
                            className="mt-6 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:scale-105 transition-transform shadow-lg"
                        >
                            Create First Class
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ClassesView;