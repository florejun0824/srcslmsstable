import React from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon
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
        { icon: AcademicCapIcon, color: 'bg-gradient-to-br from-purple-500 to-indigo-600', iconColor: 'text-purple-300' },
        { icon: UserGroupIcon, color: 'bg-gradient-to-br from-teal-500 to-emerald-500', iconColor: 'text-teal-300' },
        { icon: ClipboardDocumentListIcon, color: 'bg-gradient-to-br from-yellow-500 to-orange-500', iconColor: 'text-yellow-300' },
        { icon: ShieldCheckIcon, color: 'bg-gradient-to-br from-rose-500 to-pink-500', iconColor: 'text-rose-300' },
    ];

    // Sort activeClasses by gradeLevel
    const sortedClasses = [...activeClasses].sort((a, b) => {
        // Assuming gradeLevel is a string like 'Grade 1', 'Grade 10', etc.
        // This regex extracts the number for numerical comparison.
        const gradeA = parseInt(a.gradeLevel.match(/\d+/));
        const gradeB = parseInt(b.gradeLevel.match(/\d+/));

        if (gradeA < gradeB) {
            return -1;
        }
        if (gradeA > gradeB) {
            return 1;
        }
        return 0;
    });

    return (
        <div className="bg-gray-100 min-h-screen text-gray-900 font-sans p-6 sm:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">Class Dashboard</h1>
                        <p className="text-gray-500 mt-3 text-lg font-light">Explore, manage, and create your classes with ease.</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-3">
                        <button onClick={() => setIsArchivedModalOpen(true)} className="flex items-center px-6 py-3 bg-white text-gray-700 rounded-xl shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200 text-base font-semibold">
                            View Archived
                        </button>
                        <button onClick={() => setCreateClassModalOpen(true)} className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-500 transition-colors duration-200 text-base font-semibold">
                            <PlusCircleIcon className="w-6 h-6 mr-3" />
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
                                className={`group relative ${color} text-white p-8 rounded-3xl shadow-xl overflow-hidden transition-all duration-500 transform hover:scale-105 hover:rotate-1`}
                            >
                                {/* Floating Icon in the background */}
                                <div className={`absolute -top-12 -right-12 opacity-15 transform rotate-12 transition-all duration-700 group-hover:rotate-0 group-hover:scale-125`}>
                                    <Icon className={`w-32 h-32 ${iconColor}`} />
                                </div>

                                <div
                                    onClick={() => {
                                        if (!isHoveringActions) {
                                            setClassOverviewModal({ isOpen: true, data: c });
                                        }
                                    }}
                                    className="cursor-pointer flex flex-col h-full relative z-10"
                                >
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-extrabold tracking-tight mb-2 leading-snug">{c.name}</h2>
                                        <p className="text-gray-200 text-lg font-light">{c.gradeLevel} - {c.section}</p>
                                    </div>
                                    {c.classCode && (
                                        <div className="mt-auto pt-6 border-t border-white/20">
                                            <p className="text-sm font-medium text-white/70 mb-2">Class Code</p>
                                            <div className="flex items-center justify-between gap-2 bg-white/10 px-4 py-3 rounded-xl border border-white/20 backdrop-blur-md">
                                                <p className="font-mono text-xl tracking-widest">{c.classCode}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(c.classCode);
                                                        showToast("Class code copied!", "success");
                                                    }}
                                                    className="p-2 rounded-lg text-white/70 hover:bg-white/30 transition-colors duration-500"
                                                    title="Copy code"
                                                >
                                                    <ClipboardIcon className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Menu with a more forgiving hover area */}
                                <div
                                    className="absolute top-0 right-0 h-24 w-24 p-4 z-20 flex items-start justify-end"
                                    onMouseEnter={() => setIsHoveringActions(true)}
                                    onMouseLeave={() => setIsHoveringActions(false)}
                                >
                                    <div className="p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-white/20 backdrop-blur-md rounded-full shadow-lg">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }}
                                            className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id); }}
                                            className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                            title="Archive"
                                        >
                                            <ArchiveBoxIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }}
                                            className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full text-center text-gray-500 py-20 flex flex-col items-center justify-center bg-white rounded-2xl shadow-xl border border-gray-200">
                            <AcademicCapIcon className="w-20 h-20 text-gray-300 mb-6" />
                            <p className="text-2xl font-bold">No active classes created yet.</p>
                            <p className="mt-3 text-lg text-gray-400">Click "Create Class" to get started with your first class!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassesView;