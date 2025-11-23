import React from 'react';
import Modal from '../common/Modal';
import { 
    IconArchive, 
    IconTrash, 
    IconRefresh, 
    IconInbox,
    IconSchool,
    IconId
} from '@tabler/icons-react';

// --- VISUAL CONSTANTS ---
const cardSurface = "relative flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-5 bg-slate-50/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 group";

const actionButtonBase = "p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center shadow-sm active:scale-95";
const restoreBtn = `${actionButtonBase} bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200/50 dark:border-blue-500/20`;
const deleteBtn = `${actionButtonBase} bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200/50 dark:border-red-500/20`;

const ArchivedClassesModal = ({ isOpen, onClose, archivedClasses, onUnarchive, onDelete }) => {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Archived Classes" 
            // Matching the CreateClassModal overrides for consistency
            size="3xl"
            roundedClass="rounded-[2.5rem] !bg-white/90 dark:!bg-[#18181b]/95 !backdrop-blur-2xl !border !border-white/20 dark:!border-white/5 !shadow-2xl"
            contentClassName="!p-0"
        >
            <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto">
                {archivedClasses && archivedClasses.length > 0 ? (
                    <div className="space-y-4">
                        {archivedClasses.map(c => (
                            <div key={c.id} className={cardSurface}>
                                {/* Info Section */}
                                <div className="flex items-start gap-4">
                                    <div className="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 items-center justify-center text-slate-400 dark:text-slate-500">
                                        <IconArchive size={20} />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">
                                            {c.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                            <div className="flex items-center gap-1">
                                                <IconSchool size={14} className="text-slate-400" />
                                                {c.gradeLevel}
                                            </div>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                            <div className="flex items-center gap-1">
                                                <IconId size={14} className="text-slate-400" />
                                                Section {c.section}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-200/50 dark:border-white/5 sm:border-0">
                                    <button 
                                        onClick={() => onUnarchive(c.id)} 
                                        className={`${restoreBtn} flex-1 sm:flex-none`}
                                        title="Unarchive Class"
                                    >
                                        <IconRefresh className="w-5 h-5" stroke={2} />
                                        <span className="sm:hidden ml-2 font-bold text-sm">Restore</span>
                                    </button>
                                    
                                    <button 
                                        onClick={() => onDelete(c.id)} 
                                        className={`${deleteBtn} flex-1 sm:flex-none`}
                                        title="Delete Permanently"
                                    >
                                        <IconTrash className="w-5 h-5" stroke={2} />
                                        <span className="sm:hidden ml-2 font-bold text-sm">Delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Enhanced Empty State
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <IconInbox className="h-10 w-10 text-slate-300 dark:text-slate-600" stroke={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">No Archived Classes</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                            Your archive is clean. Classes you archive will appear here for safekeeping.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ArchivedClassesModal;