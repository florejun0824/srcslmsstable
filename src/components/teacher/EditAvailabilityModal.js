import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../services/firebase';
// NEW: Import additional firestore functions for batch deletion
import { doc, updateDoc, Timestamp, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';

const EditAvailabilityModal = ({ isOpen, onClose, post, classId, onUpdate }) => {
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
            showToast("Missing information to update dates.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const postRef = doc(db, `classes/${classId}/posts`, post.id);

            await updateDoc(postRef, {
                availableFrom: Timestamp.fromDate(availableFrom),
                availableUntil: Timestamp.fromDate(availableUntil)
            });

            showToast("Availability updated successfully!", "success");
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Error updating availability:", error);
            showToast("Failed to update availability.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- NEW: Function to delete the post and its associated locks ---
    const handleDelete = async () => {
        // 1. Confirm with the user before deleting
        if (!window.confirm("Are you sure you want to delete this? This will also remove any student quiz locks. This action cannot be undone.")) {
            return;
        }

        if (!post?.id || !classId) {
            showToast("Cannot delete. Missing required information.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            // 2. Define references to the post and its locks
            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            const locksQuery = query(collection(db, 'quizLocks'), where('quizId', '==', post.id));

            // 3. Find all associated lock documents
            const locksSnapshot = await getDocs(locksQuery);

            // 4. Use a batch write to delete everything atomically
            const batch = writeBatch(db);

            // Add the main post/quiz to the deletion batch
            batch.delete(postRef);

            // Add each found lock record to the deletion batch
            locksSnapshot.forEach(lockDoc => {
                batch.delete(lockDoc.ref);
            });

            // 5. Commit the batch to execute all deletions
            await batch.commit();

            showToast("Post and student locks deleted successfully!", "success");
            onUpdate(); // Refresh the data in the parent component
            onClose();  // Close the modal
        } catch (error) {
            console.error("Error deleting post and locks:", error);
            showToast("Failed to delete the post.", "error");
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
                        dateFormat="MMMM d, yy h:mm aa"
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

                {/* --- NEW: Updated button layout to include Delete --- */}
                <div className="flex justify-between items-center pt-4">
                    {/* The new Delete button */}
                    <button
                        onClick={handleDelete}
                        className="btn-danger" // Assuming you have a CSS class for a red delete button
                        disabled={isSubmitting}
                    >
                        Delete
                    </button>
                    
                    {/* Existing buttons grouped together */}
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button onClick={handleUpdate} className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;