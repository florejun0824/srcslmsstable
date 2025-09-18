// src/components/common/AnnouncementViewModal.js
import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import {
    MegaphoneIcon,
    AcademicCapIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline'; // Changed to outline icons for a cleaner look

// --- Animation variants for a smooth modal appearance ---
const dropIn = {
    hidden: {
        y: "-100vh",
        opacity: 0,
        scale: 0.9,
    },
    visible: {
        y: "0",
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.2,
            type: "spring",
            damping: 25,
            stiffness: 500,
        },
    },
    exit: {
        y: "100vh",
        opacity: 0,
        scale: 0.9,
        transition: {
            duration: 0.2,
        },
    },
};

const AnnouncementViewModal = ({ isOpen, onClose, announcement }) => {
    if (!announcement) return null;

    // Safely get date string, handling Firestore Timestamp objects
    const formattedDate = announcement.createdAt && typeof announcement.createdAt.toDate === 'function'
        ? announcement.createdAt.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : (announcement.createdAt instanceof Date ? announcement.createdAt.toLocaleDateString() : 'N/A');

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <motion.div
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden transition-all transform backdrop-filter backdrop-blur-md bg-opacity-90 ring-1 ring-gray-200"
                variants={dropIn}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Header Section with Gradient */}
                <div className="flex items-center p-6 bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-md">
                    <div className="p-3 rounded-full bg-white bg-opacity-20 mr-4">
                        <MegaphoneIcon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-3xl font-extrabold text-white leading-tight">
                            {announcement.title || "Class Announcement"}
                        </h3>
                    </div>
                </div>

                {/* Metadata and Content */}
                <div className="flex-grow p-8 overflow-y-auto custom-scrollbar">
                    {/* Metadata pill-style display */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex items-center bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full shadow-sm">
                            <AcademicCapIcon className="h-5 w-5 mr-2 text-gray-500" />
                            <span>{announcement.teacherName || 'Unknown Teacher'}</span>
                        </div>
                        <div className="flex items-center bg-gray-100 text-gray-700 font-medium px-4 py-2 rounded-full shadow-sm">
                            <CalendarDaysIcon className="h-5 w-5 mr-2 text-gray-500" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>

                    {/* Announcement Content Area */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-inner">
                        <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {announcement.content}
                        </div>
                    </div>
                </div>

                {/* Footer and Close Button */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white bg-opacity-70 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 shadow-md"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </Modal>
    );
};

export default AnnouncementViewModal;
