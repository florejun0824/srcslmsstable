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

    // MODIFICATION: Handlers for separate date and time inputs
    const handleDateChange = (date, field) => {
        const setter = field === 'from' ? setAvailableFrom : setAvailableUntil;
        const currentDate = field === 'from' ? availableFrom : availableUntil;
        
        setter(prevDate => {
            const newDate = new Date(currentDate || new Date());
            newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
            return newDate;
        });
    };

    const handleTimeChange = (e, field) => {
        const setter = field === 'from' ? setAvailableFrom : setAvailableUntil;
        const [hours, minutes] = e.target.value.split(':');
        
        setter(prevDate => {
            const newDate = new Date(prevDate || new Date());
            newDate.setHours(parseInt(hours, 10));
            newDate.setMinutes(parseInt(minutes, 10));
            return newDate;
        });
    };

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
            
            onUpdate({ id: post.id, isDeleted: true });
            onClose();
        } catch (error) {
            console.error("Error deleting post:", error);
            showToast("Failed to delete the post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // MODIFICATION: Helper to format time for the time input
    const formatTime = (date) => {
        if (!date) return '';
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Content Availability">
            <div className="space-y-4">
                {/* MODIFICATION START: Updated "Available From" section */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Available From</label>
                    <div className="flex gap-2">
                        <DatePicker
                            selected={availableFrom}
                            onChange={(date) => handleDateChange(date, 'from')}
                            dateFormat="MMMM d, yyyy"
                            className="w-2/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                        />
                        <input
                            type="time"
                            value={formatTime(availableFrom)}
                            onChange={(e) => handleTimeChange(e, 'from')}
                            className="w-1/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                        />
                    </div>
                </div>
                {/* MODIFICATION END */}

                {/* MODIFICATION START: Updated "Available Until" section */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Available Until</label>
                     <div className="flex gap-2">
                        <DatePicker
                            selected={availableUntil}
                            onChange={(date) => handleDateChange(date, 'until')}
                            dateFormat="MMMM d, yyyy"
                            className="w-2/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                        />
                        <input
                            type="time"
                            value={formatTime(availableUntil)}
                            onChange={(e) => handleTimeChange(e, 'until')}
                            className="w-1/3 p-2.5 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0"
                        />
                    </div>
                </div>
                {/* MODIFICATION END */}

                <div className="flex justify-between items-center pt-4">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm font-semibold text-red-600 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        Delete Post
                    </button>
                    
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button onClick={handleUpdate} className="px-4 py-2 text-sm font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default EditAvailabilityModal;