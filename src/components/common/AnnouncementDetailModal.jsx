import React from 'react';
import { MegaphoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from './Modal';

const AnnouncementDetailModal = ({ isOpen, onClose, announcement }) => {
    if (!isOpen || !announcement) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Announcement Detail">
            <div className="p-1">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                        <MegaphoneIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-grow">
                        <p className="text-gray-800 whitespace-pre-wrap">{announcement.content}</p>
                        <p className="text-xs text-gray-400 mt-3 pt-3 border-t">
                            Posted on: {new Date(announcement.createdAt.toDate()).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AnnouncementDetailModal;