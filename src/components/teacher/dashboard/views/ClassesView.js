import React from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon, // ✅ CORRECT: UserGroupIcon is already here, just confirming.
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
        { icon: AcademicCapIcon, color: 'from-orange-500 to-red-500' },
        { icon: UserGroupIcon, color: 'from-blue-500 to-sky-500' },
        { icon: ClipboardDocumentListIcon, color: 'from-yellow-500 to-amber-500' },
        { icon: ShieldCheckIcon, color: 'from-green-500 to-lime-500' },
    ];

    return (
        <div>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Classes</h1>
                    <p className="text-gray-500 mt-1">Select a class to view details or manage settings.</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => setIsArchivedModalOpen(true)} className="btn-secondary">View Archived</button>
                    <button onClick={() => setCreateClassModalOpen(true)} className="btn-primary flex items-center">
                        <PlusCircleIcon className="w-5 h-5 mr-2" />Create Class
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeClasses.length > 0 ? activeClasses.map((c, index) => {
                    const { icon: Icon, color } = classVisuals[index % classVisuals.length];
                    return (
                        <div key={c.id} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
                            <div onClick={() => { if (!isHoveringActions) setClassOverviewModal({ isOpen: true, data: c }); }} className="cursor-pointer flex-grow flex flex-col h-full">
                                <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div>
                                <div className="relative z-10">
                                    <div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div>
                                    <h2 className="text-xl font-bold text-gray-800 truncate mb-1">{c.name}</h2>
                                    <p className="text-gray-500">{c.gradeLevel} - {c.section}</p>
                                </div>
                                {c.classCode && (
                                    <div className="mt-auto pt-4 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-1">Class Code</p>
                                        <div className="flex items-center gap-2">
                                            <p className="font-mono text-lg tracking-widest text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{c.classCode}</p>
                                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.classCode); showToast("Class code copied!", "success"); }} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600" title="Copy code">
                                                <ClipboardIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="absolute top-0 right-0 p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" onMouseEnter={() => setIsHoveringActions(true)} onMouseLeave={() => setIsHoveringActions(false)}>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-gray-700 shadow-md" title="Edit"><PencilSquareIcon className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-gray-700 shadow-md" title="Archive"><ArchiveBoxIcon className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }} className="p-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white text-red-600 shadow-md" title="Delete"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    );
                }) : <p className="col-span-full text-center text-gray-500 py-10">No active classes created yet.</p>}
            </div>
        </div>
    );
};

export default ClassesView;