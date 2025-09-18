import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../services/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';

const EditContentAvailabilityModal = ({ isOpen, onClose, post, classId, onUpdate }) => {
    const { showToast } = useToast();
    const [availableFrom, setAvailableFrom] = useState(new Date());
    const [availableUntil, setAvailableUntil] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (post) {
            setAvailableFrom(post.availableFrom?.toDate() || new Date());
            setAvailableUntil(post.availableUntil?.toDate() || new Date());
        }
    }, [post]);

    const handleUpdate = async () => {
        if (!post?.id || !classId) {
            showToast("Missing post or class information.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            // This assumes your shared content posts are in a collection named `classAnnouncements`
            // If they are in `classes/{id}/posts`, you'll need to adjust this path.
            const postRef = doc(db, 'classAnnouncements', post.id);

            await updateDoc(postRef, {
                availableFrom: Timestamp.fromDate(availableFrom),
                availableUntil: Timestamp.fromDate(availableUntil)
            });

            showToast("Availability updated successfully!", "success");
            onUpdate(); // This will refresh the data in the ClassOverviewModal
            onClose();
        } catch (error) {
            console.error("Error updating availability:", error);
            showToast("Failed to update availability.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Content Availability">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                    <DatePicker
                        selected={availableFrom}
                        onChange={(date) => setAvailableFrom(date)}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available Until</label>
                    <DatePicker
                        selected={availableUntil}
                        onChange={(date) => setAvailableUntil(date)}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button onClick={handleUpdate} className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EditContentAvailabilityModal;