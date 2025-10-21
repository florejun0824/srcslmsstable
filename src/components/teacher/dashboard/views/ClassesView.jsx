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
    // These gradient classes require the `tailwind.config.js` safelist to be updated.
    const classVisuals = [
        { icon: AcademicCapIcon, gradient: 'from-white to-blue-50', iconColor: 'text-blue-300' },
        { icon: UserGroupIcon, gradient: 'from-white to-green-50', iconColor: 'text-green-300' },
        { icon: ClipboardDocumentListIcon, gradient: 'from-white to-amber-50', iconColor: 'text-amber-300' },
        { icon: ShieldCheckIcon, gradient: 'from-white to-red-50', iconColor: 'text-red-300' },
    ];

    const sortedClasses = [...(activeClasses || [])].sort((a, b) => {
        const gradeA = parseInt(a.gradeLevel.match(/\d+/));
        const gradeB = parseInt(b.gradeLevel.match(/\d+/));
        if (gradeA < gradeB) return -1;
        if (gradeA > gradeB) return 1;
        return 0;
    });

    return (
        <div className="bg-neumorphic-base min-h-screen text-slate-800 font-sans p-6 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">Class Dashboard</h1>
                        <p className="text-slate-600 mt-2 text-lg">Manage your active classes below.</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-3">
                        <button 
                            onClick={() => setIsArchivedModalOpen(true)} 
                            className="flex items-center px-5 py-2.5 bg-neumorphic-base text-slate-700 rounded-xl shadow-neumorphic transition-shadow duration-200 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset text-sm font-semibold"
                        >
                            <ArchiveBoxIcon className="w-5 h-5 mr-2 text-slate-500" />
                            Archived
                        </button>
                        <button 
                            onClick={() => setCreateClassModalOpen(true)} 
                            className="flex items-center px-5 py-2.5 bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 rounded-xl shadow-neumorphic transition-shadow duration-200 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset text-sm font-semibold"
                        >
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Create Class
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedClasses.length > 0 ? sortedClasses.map((c, index) => {
                        const { icon: Icon, gradient, iconColor } = classVisuals[index % classVisuals.length];
                        return (
                            <div
                                key={c.id}
                                className={`group relative bg-gradient-to-br ${gradient} p-7 rounded-3xl shadow-neumorphic overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-neumorphic-inset`}
                            >
                                <div className="absolute -top-10 -right-10 opacity-15 transform rotate-12 transition-all duration-500 ease-in-out group-hover:rotate-0 group-hover:scale-125 group-hover:-translate-x-2 group-hover:-translate-y-2">
                                    <Icon className={`w-32 h-32 ${iconColor}`} />
                                </div>

                                <div
                                    onClick={() => !isHoveringActions && setClassOverviewModal({ isOpen: true, data: c })}
                                    className="cursor-pointer flex flex-col h-full relative z-10"
                                    style={{ minHeight: '220px' }}
                                >
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold tracking-tight leading-tight text-slate-800">{c.name}</h2>
                                        <p className="text-slate-600 text-base font-light mt-1">{c.gradeLevel} &bull; {c.section}</p>
                                    </div>
                                    
                                    {c.classCode && (
                                        <div className="mt-auto">
                                            <div className="flex items-center justify-between gap-2 bg-neumorphic-base shadow-neumorphic-inset px-4 py-2.5 rounded-xl">
                                                <p className="font-mono text-lg tracking-wider text-slate-700">{c.classCode}</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(c.classCode);
                                                        showToast("Class code copied!", "success");
                                                    }}
                                                    className="p-1.5 rounded-md text-slate-500 hover:shadow-neumorphic-inset transition-colors duration-200"
                                                    title="Copy code"
                                                >
                                                    <ClipboardIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div
                                    className="absolute top-4 right-4 z-20"
                                    onMouseEnter={() => setIsHoveringActions(true)}
                                    onMouseLeave={() => setIsHoveringActions(false)}
                                >
                                    <div className="flex gap-1 p-1 bg-white/50 shadow-neumorphic rounded-full transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }}
                                            className="p-2 rounded-full text-slate-700 hover:shadow-neumorphic-inset transition-colors"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id); }}
                                            className="p-2 rounded-full text-slate-700 hover:shadow-neumorphic-inset transition-colors"
                                            title="Archive"
                                        >
                                            <ArchiveBoxIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }}
                                            className="p-2 rounded-full text-red-600 hover:shadow-neumorphic-inset transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-full text-center py-24 px-6 flex flex-col items-center justify-center bg-neumorphic-base rounded-3xl shadow-neumorphic-inset">
                            <SquaresPlusIcon className="w-16 h-16 text-slate-300 mb-5" />
                            <p className="text-xl font-semibold text-slate-700">Your dashboard is empty</p>
                            <p className="mt-2 max-w-sm text-base text-slate-500">Get started by creating your first class. All your active classes will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassesView;