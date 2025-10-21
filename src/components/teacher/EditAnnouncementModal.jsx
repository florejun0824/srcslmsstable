import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Modal from '../common/Modal';

const EditAnnouncementModal = ({ isOpen, onClose, announcement, onUpdate }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (announcement) {
            setContent(announcement.content);
        }
    }, [announcement]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            showToast("Announcement can't be empty.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await onUpdate(announcement.id, content);
            showToast("Announcement updated successfully!", "success");
            onClose();
        } catch (error) {
            showToast("Failed to update announcement.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Announcement">
            <form onSubmit={handleSubmit}>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditAnnouncementModal;