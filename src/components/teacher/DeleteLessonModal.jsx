import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const DeleteLessonModal = ({ isOpen, onClose, lesson, courseId, onLessonDeleted }) => {
    const [authCode, setAuthCode] = useState('');
    const { showToast } = useToast();

    const handleConfirm = async () => {
        if (authCode !== 'admin2025') {
            return showToast("Incorrect authentication code.", 'error');
        }
        if (!lesson) return;

        try {
            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
                const courseData = courseSnap.data();
                const updatedUnits = courseData.units.map(unit => {
                    if (unit.id === lesson.unitId) {
                        const filteredLessons = unit.lessons.filter(l => l.id !== lesson.id);
                        return { ...unit, lessons: filteredLessons };
                    }
                    return unit;
                });
                await updateDoc(courseRef, { units: updatedUnits });
                showToast("Lesson deleted successfully!");
                onLessonDeleted();
                onClose();
            }
        } catch (error) {
            showToast("Failed to delete lesson.", 'error');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleConfirm();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Lesson Deletion">
            <form onSubmit={handleSubmit}>
                <p className="mb-4">Are you sure you want to delete this lesson? This action cannot be undone. Please enter the authentication code to proceed.</p>
                <input type="password" value={authCode} onChange={(e) => setAuthCode(e.target.value)} placeholder="Authentication Code" className="w-full p-3 border rounded-md mb-4" required />
                <button type="submit" className="w-full bg-red-600 text-white p-3 rounded-md">Confirm Delete</button>
            </form>
        </Modal>
    );
};

export default DeleteLessonModal;