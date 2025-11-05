import React from 'react';
import {
    PlusCircleIcon, AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    ClipboardIcon, PencilSquareIcon, ArchiveBoxIcon, TrashIcon, SquaresPlusIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';
import { IconPower } from '@tabler/icons-react';

// --- REMOVED CLOUD FUNCTION IMPORTS/REFERENCES ---
// No imports related to firebase/functions or the startOnlineClass callable.

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
    handleStartOnlineClass, // ✅ Now directly used
	handleEndOnlineClass,      
}) => {
    const classVisuals = [
        { icon: AcademicCapIcon, iconColor: 'text-blue-400 dark:text-blue-500' },
        { icon: UserGroupIcon, iconColor: 'text-green-400 dark:text-green-500' },
        { icon: ClipboardDocumentListIcon, iconColor: 'text-amber-400 dark:text-amber-500' },
        { icon: ShieldCheckIcon, iconColor: 'text-red-400 dark:text-red-500' },
    ];

    const sortedClasses = [...(activeClasses || [])].sort((a, b) => {
        const gradeA = parseInt(a.gradeLevel.match(/\d+/));
        const gradeB = parseInt(b.gradeLevel.match(/\d+/));
        if (gradeA < gradeB) return -1;
        if (gradeA > gradeB) return 1;
        return 0;
    });

    // --- REMOVED: state related to Cloud Function starting ---
    // const [startingClassId, setStartingClassId] = React.useState(null);

    // Because we are using the local handler, the state is no longer necessary.
    // We keep a dummy reference here for consistency if other parts of the JSX expect it,
    // but the logic below removes the need for it entirely.
    const isStarting = false;

    return (
        <div className="min-h-screen text-slate-800 dark:text-slate-100 font-sans p-6 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Class Dashboard</h1>
                        <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">Manage your active classes below.</p>
                    </div>
                    <div className="flex flex-shrink-0 gap-3">
                        <button 
                            onClick={() => setIsArchivedModalOpen(true)}
                            className="flex items-center px-5 py-2.5 bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow duration-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark text-sm font-semibold"
                        >
                            <ArchiveBoxIcon className="w-5 h-5 mr-2 text-slate-500 dark:text-slate-400" />
                            Archived
                        </button>
                        <button 
                            onClick={() => setCreateClassModalOpen(true)}
                            className="flex items-center px-5 py-2.5 bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-800 dark:to-blue-900 text-blue-700 dark:text-blue-200 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow duration-200 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark text-sm font-semibold"
                        >
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            Create Class
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {sortedClasses.length > 0 ? sortedClasses.map((c, index) => {
						const { icon: Icon, iconColor } = classVisuals[index % classVisuals.length];
                        
                        // --- Use Persistent Meet Link (from our previous fix) ---
                        const meetLink = c.meetLink || null;
                        const hasValidLink = meetLink && meetLink.startsWith("https://meet.google.com/");
                        const isLive = c.videoConference?.isLive || false;

                        // --- REMOVED: Check if this specific class is starting (startingClassId is removed) ---
                        // const isStarting = startingClassId === c.id;

						return (
						    <div
						        key={c.id}
						        className={`group relative bg-neumorphic-base dark:bg-neumorphic-base-dark p-7 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark overflow-hidden transition-shadow duration-300 ease-in-out hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark`}
						    >
						        <div className="absolute -top-10 -right-10 opacity-15 dark:opacity-20 transform rotate-12 transition-all duration-500 ease-in-out group-hover:rotate-0 group-hover:scale-125 group-hover:-translate-x-2 group-hover:-translate-y-2">
						            <Icon className={`w-32 h-32 ${iconColor}`} />
						        </div>

						        <div
						            onClick={() => !isHoveringActions && setClassOverviewModal({ isOpen: true, data: c })}
						            className="cursor-pointer flex flex-col h-full relative z-10"
						            style={{ minHeight: '220px' }}
						        >
						            <div className="mb-6">
						                <h2 className="text-2xl font-bold tracking-tight leading-tight text-slate-800 dark:text-slate-100">{c.name}</h2>
						                <p className="text-slate-600 dark:text-slate-400 text-base font-light mt-1">{c.gradeLevel} &bull; {c.section}</p>
						            </div>
                                    
						            {/* --- REVERTED: START/JOIN/END ONLINE CLASS BUTTONS --- */}
						            <div className="w-full mb-4">
						                {isLive ? (
						                    <div className="flex gap-2">
						                        {/* Button 1: JOIN CLASS (Primary action when live) */}
						                        <button
						                            onClick={(e) => {
						                                e.stopPropagation(); 
						                                window.open(meetLink, '_blank');
						                            }}
                                                    disabled={!hasValidLink}
						                            className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-xl shadow-md 
						                                       transition-colors duration-150 flex items-center justify-center space-x-2 
						                                       bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600
                                                       disabled:bg-slate-400 disabled:cursor-not-allowed"
						                            title={hasValidLink ? "Join Live Class" : "No Meet Link Configured"}
						                        >
						                            <VideoCameraIcon className="w-5 h-5" /> 
						                            <span>Join Class</span>
						                        </button>

						                        {/* Button 2: END CLASS (Destructive action) */}
						                        <button
						                            onClick={(e) => {
						                                e.stopPropagation(); 
						                                handleEndOnlineClass(c.id); // Calls prop
						                            }}
						                            className="px-3 py-2 text-sm font-semibold text-red-600 rounded-xl shadow-md 
						                                       transition-colors duration-150 flex items-center justify-center space-x-2 
						                                       bg-neumorphic-base dark:bg-neumorphic-base-dark 
						                                       hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
						                            title="End Live Session"
						                        >
						                            <IconPower className="w-5 h-5" /> 
						                        </button>
						                    </div>
						                ) : (
						                    // State: NOT LIVE - Only START button visible
						                    <button
						                        onClick={async (e) => {
						                            e.stopPropagation(); 
                                                    if (!hasValidLink) {
                                                        // If no link, open Edit Modal (from our old fix)
                                                        handleOpenEditClassModal(c);
                                                        return;
                                                    }
                                                    
                                                    // ✅ REVERTED TO CALLING THE PROP (local Firestore update)
                                                    handleStartOnlineClass(c.id, c.classCode, meetLink);

                                                    // --- REMOVED Cloud Function logic: ---
                                                    // setStartingClassId(c.id); 
                                                    // try { 
                                                    //     await startOnlineClass({ ... });
                                                    //     showToast(...);
                                                    // } catch (error) { ... }
                                                    // finally { setStartingClassId(null); }
						                        }}
                                                // ❌ REMOVED: disabled={isStarting} 
						                        className={`w-full px-3 py-2 text-sm font-semibold text-white rounded-xl shadow-md 
						                                   transition-colors duration-150 flex items-center justify-center space-x-2 
						                                   ${hasValidLink 
						                                       ? 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600' // Green for Start
						                                       : 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500' // Yellow/Orange for Setup
						                                   }
                                                           // ❌ REMOVED: disabled:bg-slate-400 disabled:cursor-wait
                                                           `}
						                        title={hasValidLink ? "Start Live Class" : "Set up Google Meet Link to Start"}
						                    >
                                                {/* ❌ REMOVED: isStarting check, use simple text */}
                                                <>
                                                    {hasValidLink ? <VideoCameraIcon className="w-5 h-5" /> : <PencilSquareIcon className="w-5 h-5" />}
						                            <span>{hasValidLink ? "Start Online Class" : "Add Meet Link"}</span>
                                                </>
						                    </button>
						                )}
						            </div>
						            {/* --- END REVERTED BUTTONS --- */}
                                    
						            {c.classCode && (
						                <div className="mt-auto">
						                    <div className="flex items-center justify-between gap-2 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark px-4 py-2.5 rounded-xl">
						                        <p className="font-mono text-lg tracking-wider text-slate-700 dark:text-slate-200">{c.classCode}</p>
						                        <button
						                            onClick={(e) => {
						                                e.stopPropagation();
						                                navigator.clipboard.writeText(c.classCode);
						                                showToast("Class code copied!", "success");
						                            }}
						                            className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors duration-200"
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
                                    <div className="flex gap-1 p-1 bg-white/50 dark:bg-slate-900/50 shadow-neumorphic dark:shadow-neumorphic-dark rounded-full transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditClassModal(c); }}
                                            className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleArchiveClass(c.id, c.name); }}
                                            className="p-2 rounded-full text-slate-700 dark:text-slate-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors"
                                            title="Archive"
                                        >
                                            <ArchiveBoxIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id, false); }}
                                            className="p-2 rounded-full text-red-600 dark:text-red-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
						    </div>
						);
                    }) : (
                        <div className="col-span-full text-center py-24 px-6 flex flex-col items-center justify-center bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                            <SquaresPlusIcon className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-5" />
                            <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">Your dashboard is empty</p>
                            <p className="mt-2 max-w-sm text-base text-slate-500 dark:text-slate-400">Get started by creating your first class. All your active classes will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassesView;