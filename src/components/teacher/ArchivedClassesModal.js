// src/components/teacher/ArchivedClassesModal.js

import React from 'react';
import { ArchiveBoxXMarkIcon, ArrowUturnLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ArchivedClassesModal = ({ isOpen, onClose, archivedClasses, onUnarchive, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl m-4">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-xl font-semibold text-gray-800">Archived Classes</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {archivedClasses.length > 0 ? (
                        archivedClasses.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-700">{c.name}</p>
                                    <p className="text-sm text-gray-500">{c.gradeLevel} - {c.section}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onUnarchive(c.id)} className="btn-secondary p-2" title="Unarchive">
                                        <ArrowUturnLeftIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => onDelete(c.id)} className="btn-danger p-2" title="Delete Permanently">
                                        <ArchiveBoxXMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">You have no archived classes.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ArchivedClassesModal;