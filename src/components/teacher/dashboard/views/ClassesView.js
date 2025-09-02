import React from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon
} from '@heroicons/react/24/outline';

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
}) => {
    const classVisuals = [
        // Refined gradients for a slightly softer, more modern look
        { icon: AcademicCapIcon, color: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-300' },
        { icon: UserGroupIcon, color: 'from-green-500 to-teal-600', iconColor: 'text-green-300' },
        { icon: ClipboardDocumentListIcon, color: 'from-amber-500 to-orange-600', iconColor: 'text-amber-300' },
        { icon: ShieldCheckIcon, color: 'from-red-500 to-rose-600', iconColor: 'text-red-300' },
    ];

    // Core logic remains unchanged
    const sortedClasses = [...activeClasses].sort((a, b) => {
        const gradeA = parseInt(a.gradeLevel.match(/\d+/));
        const gradeB = parseInt(b.gradeLevel.match(/\d+/));
        if (gradeA < gradeB) return -1;
        if (gradeA > gradeB) return 1;
        return 0;
    });

    return (
        // iOS-style background: lighter gray for a cleaner, airier feel
        <div className="bg-gray-50 min-h-screen text-gray-900 font-sans p-6 sm:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header: Refined typography and button styling */}
                <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        {/* Typography: slightly less aggressive font weight, more in line with Apple's HIG */}
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">Class Dashboard</h1>
                        <p className="text-gray-600 mt-2 text-lg">Manage your active classes below.</p>
                    </div>
                    {/* Buttons: Styled to look like modern, floating iOS controls */}
                    <div className="flex flex-shrink-0 gap-3">
                        <button 
                            onClick={() => setIsArchivedModalOpen(true)} 
                            className="flex items-center px-5 py-2.5 bg-white/60 backdrop-blur-md text-gray-700 rounded-xl shadow-sm border border-gray-200 hover:bg-gray-200/50 transition-all duration-300 active:scale-95 text-sm font-semibold"
                        >
                            <ArchiveBoxIcon className="w-5 h-5 mr-2 text-gray-500" />
                            Archived
                        </button>
                        <button 
                            onClick={() => setCreateClassModalOpen(true)} 
                            className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all duration-300 active:scale-95 text-sm font-semibold"
                        >
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Create Class
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedClasses.length > 0 ? sortedClasses.map((c, index) => {
                        const { icon: Icon, color, iconColor } = classVisuals[index % classVisuals.length];
                        return (
                            <div
                                key={c.id}
                                // Card Style: Softer shadow, subtle border, and a less dramatic hover effect for a more premium feel.
                                className={`group relative bg-gradient-to-br ${color} text-white p-7 rounded-3xl shadow-lg shadow-gray-900/10 overflow-hidden transition-all duration-300 ease-in-out hover:scale-[1.03] border border-white/10`}
                            >
                                {/* Background Icon: Made animation smoother and more pronounced */}
                                <div className={`absolute -top-10 -right-10 opacity-15 transform rotate-12 transition-all duration-500 ease-in-out group-hover:rotate-0 group-hover:scale-125 group-hover:-translate-x-2 group-hover:-translate-y-2`}>
                                    <Icon className={`w-32 h-32 ${iconColor}`} />
                                </div>

                                <div
                                    onClick={() => !isHoveringActions && setClassOverviewModal({ isOpen: true, data: c })}
                                    className="cursor-pointer flex flex-col h-full relative z-10"
                                    style={{ minHeight: '220px' }} // Set a min-height for consistency
                                >
                                    <div className="mb-6">
                                        {/* Card Text: Refined for clarity */}
                                        <h2 className="text-2xl font-bold tracking-tight leading-tight">{c.name}</h2>
                                        <p className="text-white/70 text-base font-light mt-1">{c.gradeLevel} &bull; {c.section}</p>
                                    </div>
                                    
                                    {c.classCode && (
                                        <div className="mt-auto">
                                            {/* Class Code pill: Enhanced glassmorphism effect */}
                                            <div className="flex items-center justify-between gap-2 bg-black/10 backdrop-blur-lg px-4 py-2.5 rounded-xl border border-white/20">
                                                <p className="font-mono text-lg tracking-wider">{c.classCode}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(c.classCode);
                                                        showToast("Class code copied!", "success");
                                                    }}
                                                    className="p-1.5 rounded-md text-white/70 hover:bg-white/20 transition-colors duration-200"
                                                    title="Copy code"
                                                >
                                                    <ClipboardIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Menu: Re-styled as a floating "pill" like in iOS Control Center */}
                                <div
                                    className="absolute top-4 right-4 z-20"
                                    onMouseEnter={() => setIsHoveringActions(true)}
                                    onMouseLeave={() => setIsHoveringActions(false)}
                                >
                                    {/* Animation: Pill now subtly scales and fades in instead of just appearing */}
                                    <div className="flex gap-1 p-1 bg-black/20 backdrop-blur-lg border border-white/20 rounded-full shadow-xl transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }}
                                            className="p-2 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id); }}
                                            className="p-2 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                                            title="Archive"
                                        >
                                            <ArchiveBoxIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }}
                                            className="p-2 rounded-full text-red-300/80 hover:bg-red-500/40 hover:text-white transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        // Empty State: Redesigned to be softer and more encouraging
                        <div className="col-span-full text-center py-24 px-6 flex flex-col items-center justify-center bg-gray-100/50 rounded-3xl border border-gray-200/80">
                            <SquaresPlusIcon className="w-16 h-16 text-gray-300 mb-5" />
                            <p className="text-xl font-semibold text-gray-700">Your dashboard is empty</p>
                            <p className="mt-2 max-w-sm text-base text-gray-500">Get started by creating your first class. All your active classes will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassesView;