// src/components/common/AnnouncementViewModal.jsx
import React from 'react';
import Modal from './Modal';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MegaphoneIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    XMarkIcon,
    PencilIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const AnnouncementViewModal = ({ isOpen, onClose, announcement, onEdit, onDelete }) => {
    const { userProfile } = useAuth();
    
    if (!announcement) return null;

    // Safely get date string, handling Firestore Timestamp objects
    const formattedDate = announcement.createdAt && typeof announcement.createdAt.toDate === 'function'
        ? announcement.createdAt.toDate().toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : (announcement.createdAt instanceof Date ? announcement.createdAt.toLocaleDateString() : 'Just now');

    const isTeacher = userProfile?.role === 'teacher' || userProfile?.role === 'admin';
    const isAuthor = userProfile?.id === announcement.teacherId;
    // Allow edit/delete if user is the author OR if they are a teacher/admin and it's a class announcement
    const canManage = isAuthor || (isTeacher && announcement.classIds);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <div className="relative w-full max-w-2xl mx-auto my-auto p-4 focus:outline-none" onClick={(e) => e.stopPropagation()}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative overflow-hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[32px] border border-white/40 dark:border-white/10 shadow-2xl"
                >
                    {/* Header: Visual Element & Close */}
                    <div className="relative h-32 bg-indigo-50 dark:bg-indigo-900/20 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                        
                        <div className="absolute inset-0 flex items-center px-8">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <MegaphoneIcon className="w-8 h-8" />
                            </div>
                            <div className="ml-5">
                                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    Notice
                                </h2>
                                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Important update for your class</p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-8">
                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5">
                                <UserCircleIcon className="w-5 h-5 text-zinc-400" />
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    {announcement.teacherName || 'Instructor'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5">
                                <CalendarDaysIcon className="w-5 h-5 text-zinc-400" />
                                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    {formattedDate}
                                </span>
                            </div>
                        </div>

                        {/* Text Body */}
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 rounded-[24px] p-6 border border-zinc-100 dark:border-white/5 min-h-[200px]">
                            <p className="text-zinc-800 dark:text-zinc-200 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                {announcement.content}
                            </p>
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="px-8 pb-8 flex items-center justify-between">
                        {/* Management Buttons (Conditional) */}
                        <div className="flex items-center gap-2">
                            {canManage && (
                                <>
                                    <button 
                                        onClick={() => { onEdit?.(announcement); onClose(); }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 font-bold text-sm transition-colors"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => { onDelete?.(announcement.id); onClose(); }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-sm transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-bold shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-zinc-800 dark:hover:bg-white active:scale-95 transition-all"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </Modal>
    );
};

export default AnnouncementViewModal;