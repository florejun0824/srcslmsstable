// src/components/common/AnnouncementViewModal.js
import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import {
    MegaphoneIcon,
    AcademicCapIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline';

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
            {/* Neumorphic main container */}
            <motion.div
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full flex flex-col bg-neumorphic-base text-primary-800 rounded-3xl shadow-neumorphic overflow-hidden" // 
                variants={dropIn}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                {/* Header Section */}
                <div className="flex items-center p-6">
                    {/* Neumorphic extruded icon container */}
                    <div className="p-4 rounded-full bg-neumorphic-base shadow-neumorphic mr-5">
                        <MegaphoneIcon className="h-8 w-8 text-primary-600" />
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-3xl font-extrabold text-primary-900">
                            {announcement.title || "Class Announcement"}
                        </h3>
                    </div>
                </div>

                {/* Metadata and Content */}
                <div className="flex-grow p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {/* Metadata pills with extruded style */}
                    <div className="flex flex-wrap items-center gap-4 mb-8">
                        <div className="flex items-center bg-neumorphic-base text-primary-700 font-medium px-4 py-2 rounded-full shadow-neumorphic">
                            <AcademicCapIcon className="h-5 w-5 mr-2 text-primary-500" />
                            <span>{announcement.teacherName || 'Unknown Teacher'}</span>
                        </div>
                        <div className="flex items-center bg-neumorphic-base text-primary-700 font-medium px-4 py-2 rounded-full shadow-neumorphic">
                            <CalendarDaysIcon className="h-5 w-5 mr-2 text-primary-500" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>

                    {/* Announcement Content Area with inset shadow */}
                    <div className="bg-neumorphic-base p-6 rounded-2xl shadow-neumorphic-inset">
                        <div className="text-primary-800 text-lg leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {announcement.content}
                        </div>
                    </div>
                </div>

                {/* Footer and Close Button */}
                <div className="flex-shrink-0 p-4 flex justify-end">
                    {/* Neumorphic button with pressed effect on click */}
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-neumorphic-base text-primary-800 rounded-xl font-semibold shadow-neumorphic active:shadow-neumorphic-inset transition-all duration-150 ease-in-out hover:text-primary-600 focus:outline-none"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </Modal>
    );
};

export default AnnouncementViewModal;