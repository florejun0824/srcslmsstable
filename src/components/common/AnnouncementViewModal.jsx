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
                    className="relative overflow-hidden bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-[32px] border border-white/40 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header: Visual Element & Close */}
                    <div className="relative shrink-0 h-auto py-6 md:h-32 md:py-0 bg-indigo-50 dark:bg-indigo-900/20 overflow-hidden flex items-center">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                        
                        <div className="relative z-10 w-full flex items-center px-5 md:px-8">
                            <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <MegaphoneIcon className="w-6 h-6 md:w-8 md:h-8" />
                            </div>
                            <div className="ml-4 md:ml-5 pr-10">
                                <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    Notice
                                </h2>
                                <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm font-medium">Important update for your class</p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-zinc-500 dark:text-zinc-400 transition-colors z-20"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 md:p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 md:mb-8">
                            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5">
                                <UserCircleIcon className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 shrink-0" />
                                <span className="text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[150px] sm:max-w-xs">
                                    {announcement.teacherName || 'Instructor'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5">
                                <CalendarDaysIcon className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 shrink-0" />
                                <span className="text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                    {formattedDate}
                                </span>
                            </div>
                        </div>

                        {/* Text Body */}
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 rounded-[20px] md:rounded-[24px] p-5 md:p-6 border border-zinc-100 dark:border-white/5 min-h-[150px] md:min-h-[200px]">
                            <p className="text-zinc-800 dark:text-zinc-200 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                {announcement.content}
                            </p>
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="px-5 md:px-8 pb-5 md:pb-8 pt-2 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-4 shrink-0">
                        {/* Management Buttons (Conditional) */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
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
                            className="px-8 py-3 w-full sm:w-auto bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-bold shadow-lg shadow-zinc-200 dark:shadow-none hover:bg-zinc-800 dark:hover:bg-white active:scale-95 transition-all"
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