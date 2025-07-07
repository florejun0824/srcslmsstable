// src/components/common/AnnouncementViewModal.js
import React from 'react';
import Modal from './Modal'; // Assuming your custom Modal component is located here

const AnnouncementViewModal = ({ isOpen, onClose, announcement }) => {
    if (!announcement) return null; // Don't render if no announcement data

    // Safely get date string, handling Firestore Timestamp objects
    const formattedDate = announcement.createdAt && typeof announcement.createdAt.toDate === 'function'
        ? announcement.createdAt.toDate().toLocaleString()
        : (announcement.createdAt instanceof Date ? announcement.createdAt.toLocaleString() : 'N/A');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Announcement Details">
            <div className="p-6 bg-white rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">{announcement.title || "Class Announcement"}</h3>
                <p className="text-sm text-gray-500 mb-4 border-b pb-3">
                    Posted by {announcement.teacherName || 'Unknown Teacher'} on {formattedDate}
                </p>
                <div className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {announcement.content}
                </div>
            </div>
        </Modal>
    );
};

export default AnnouncementViewModal;