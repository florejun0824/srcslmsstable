import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { db } from '../../services/firebase';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
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
            const batch = writeBatch(db);
            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            const classRef = doc(db, "classes", classId);

            batch.update(postRef, {
                availableFrom: Timestamp.fromDate(availableFrom),
                availableUntil: Timestamp.fromDate(availableUntil)
            });

            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            
            await batch.commit();

            showToast("Availability updated successfully!", "success");

            // ✅ FIX: Send the updated information back to the parent component.
            onUpdate({
                id: post.id,
                availableFrom: Timestamp.fromDate(availableFrom),
                availableUntil: Timestamp.fromDate(availableUntil)
            });
            onClose();
        } catch (error) {
            console.error("Error updating availability:", error);
            showToast("Failed to update availability.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
            return;
        }

        if (!post?.id || !classId) {
            showToast("Cannot delete. Missing required information.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, `classes/${classId}/posts`, post.id);
            const classRef = doc(db, "classes", classId);
            
            if (post.quizIds && post.quizIds.length > 0) {
                const locksQuery = query(collection(db, 'quizLocks'), where('quizId', 'in', post.quizIds));
                const locksSnapshot = await getDocs(locksQuery);
                locksSnapshot.forEach(lockDoc => {
                    batch.delete(lockDoc.ref);
                });
            }

            batch.delete(postRef);
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

            await batch.commit();

            showToast("Post deleted successfully!", "success");
            
            // ✅ FIX: Send the deletion information back to the parent component.
            onUpdate({ id: post.id, isDeleted: true });
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
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

                <div className="flex justify-between items-center pt-4">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-500 disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        Delete Post
                    </button>
                    
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button onClick={handleUpdate} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-500 disabled:opacity-50" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;