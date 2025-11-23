// src/components/teacher/dashboard/views/ClassesView.jsx
import React from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';
import { motion } from 'framer-motion';

const ClassesView = ({
    activeClasses,
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
    
    // Enhanced visual themes for cards (Aurora Gradients)
    const classVisuals = [
        { 
            icon: AcademicCapIcon, 
            gradient: 'from-blue-500/10 to-cyan-500/10', 
            iconBg: 'bg-blue-100 dark:bg-blue-900/30', 
            iconColor: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-200/50 dark:border-blue-500/20'
        },
        { 
            icon: UserGroupIcon, 
            gradient: 'from-emerald-500/10 to-teal-500/10', 
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', 
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-200/50 dark:border-emerald-500/20'
        },
        { 
            icon: ClipboardDocumentListIcon, 
            gradient: 'from-amber-500/10 to-orange-500/10', 
            iconBg: 'bg-amber-100 dark:bg-amber-900/30', 
            iconColor: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-200/50 dark:border-amber-500/20'
        },
        { 
            icon: ShieldCheckIcon, 
            gradient: 'from-rose-500/10 to-pink-500/10', 
            iconBg: 'bg-rose-100 dark:bg-rose-900/30', 
            iconColor: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-200/50 dark:border-rose-500/20'
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
            className="w-full h-full flex flex-col font-sans pb-24 lg:pb-8 relative z-10"
        >
            {/* Header Section (Glass Layout) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Class Dashboard
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Manage your active classes below.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => setIsArchivedModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs shadow-sm hover:bg-white dark:hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                        <ArchiveBoxIcon className="w-4 h-4" />
                        Archived
                    </button>
                    <button 
                        onClick={() => setCreateClassModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        Create Class
                    </button>
                </div>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {sortedClasses.length > 0 ? sortedClasses.map((c, index) => {
                    const visual = classVisuals[index % classVisuals.length];
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
                            className={`group relative glass-panel rounded-[2.5rem] border ${visual.border} shadow-lg overflow-hidden flex flex-col h-full min-h-[280px] transition-all duration-500`}
                        >
                            {/* Ambient Gradient Background */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} opacity-50 pointer-events-none`} />

                            {/* Floating Icon Decoration */}
                            <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full ${visual.iconBg} blur-2xl opacity-40 pointer-events-none`} />

                            {/* Card Content */}
                            <div
                                onClick={() => !isHoveringActions && setClassOverviewModal({ isOpen: true, data: c })}
                                className="relative z-10 p-7 flex flex-col h-full cursor-pointer"
                            >
                                {/* Top Row: Icon & Code */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-12 h-12 rounded-2xl ${visual.iconBg} flex items-center justify-center shadow-sm ${visual.iconColor}`}>
                                        <visual.icon className="w-6 h-6" />
                                    </div>
                                    
                                    {c.classCode && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(c.classCode);
                                                showToast("Class code copied!", "success");
                                            }}
                                            // [MODIFIED] Added 'mr-10' and increased text size to 'text-xs'
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-black/20 border border-white/40 dark:border-white/5 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-colors mr-10"
                                            title="Copy Code"
                                        >
                                            <span>{c.classCode}</span>
                                            <ClipboardIcon className="w-3.5 h-3.5 opacity-60" />
                                        </button>
                                    )}
                                </div>

                                {/* Class Details */}
                                <div className="mb-auto">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight line-clamp-2 mb-1">
                                        {c.name}
                                    </h2>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                        {c.gradeLevel} • {c.section}
                                    </p>
                                </div>

                                {/* Bottom Actions (Live/Start) */}
                                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-white/5 w-full">
                                    {isLive ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    window.open(meetLink, '_blank');
                                                }}
                                                disabled={!hasValidLink}
                                                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                                            >
                                                <VideoCameraIcon className="w-4 h-4" /> 
                                                Join Live
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    handleEndOnlineClass(c.id); 
                                                }}
                                                className="px-4 py-3 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all active:scale-95"
                                                title="End Session"
                                            >
                                                <IconPower className="w-4 h-4" /> 
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation(); 
                                                if (!hasValidLink) {
                                                    handleOpenEditClassModal(c);
                                                    return;
                                                }
                                                handleStartOnlineClass(c.id, c.classCode, meetLink);
                                            }}
                                            className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                                ${hasValidLink 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30' 
                                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30' 
                                                }`}
                                        >
                                            {hasValidLink ? <VideoCameraIcon className="w-4 h-4" /> : <PencilSquareIcon className="w-4 h-4" />}
                                            <span>{hasValidLink ? "Start Online Class" : "Setup Meet Link"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Edit Actions Overlay (Visible on Hover) */}
                            <div
                                className="absolute top-4 right-4 z-20"
                                onMouseEnter={() => setIsHoveringActions(true)}
                                onMouseLeave={() => setIsHoveringActions(false)}
                            >
                                <div className="flex flex-col gap-2 p-1.5 bg-white/80 dark:bg-black/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 shadow-lg translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }}
                                        className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-blue-600 transition-colors"
                                        title="Edit"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id, c.name); }}
                                        className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-orange-600 transition-colors"
                                        title="Archive"
                                    >
                                        <ArchiveBoxIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id, false); }}
                                        className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 text-slate-500 hover:text-red-600 transition-colors"
                                        title="Delete"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                }) : (
                    // Empty State
                    <div className="col-span-full flex flex-col items-center justify-center py-24 px-6 glass-panel rounded-[3rem] text-center border border-dashed border-slate-300 dark:border-white/10">
                        <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-6 shadow-inner">
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