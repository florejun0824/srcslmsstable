import React from 'react';
import Modal from '../common/Modal'; // Using the updated Modal component
import { ArchiveBoxXMarkIcon, ArrowUturnLeftIcon, InboxIcon } from '@heroicons/react/24/outline';

const ArchivedClassesModal = ({ isOpen, onClose, archivedClasses, onUnarchive, onDelete }) => {
    return (
        // Replaced the old container with our new, animated Modal component
        <Modal isOpen={isOpen} onClose={onClose} title="Archived Classes" size="2xl">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
                {archivedClasses && archivedClasses.length > 0 ? (
                    archivedClasses.map(c => (
                        // NEW: iOS-style "pill" for each list item
                        <div 
                            key={c.id} 
                            className="flex justify-between items-center p-4 bg-white/70 rounded-2xl shadow-md ring-1 ring-black/5"
                        >
                            <div>
                                <p className="font-semibold text-slate-800">{c.name}</p>
                                <p className="text-sm text-slate-500">{c.gradeLevel} - {c.section}</p>
                            </div>
                            <div className="flex gap-2">
                                {/* NEW: Restyled "Unarchive" button */}
                                <button 
                                    onClick={() => onUnarchive(c.id)} 
                                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors" 
                                    title="Unarchive"
                                >
                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                </button>
                                {/* NEW: Restyled "Delete" button */}
                                <button 
                                    onClick={() => onDelete(c.id)} 
                                    className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors" 
                                    title="Delete Permanently"
                                >
                                    <ArchiveBoxXMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    // NEW: Enhanced empty state for a cleaner look
                    <div className="text-center py-16">
                        <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-semibold text-gray-800">No Archived Classes</h3>
                        <p className="mt-1 text-sm text-gray-500">Your archive is currently empty.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ArchivedClassesModal;