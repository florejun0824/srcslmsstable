import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal';

const CreateCourseModal = ({ isOpen, onClose, teacherId, courseCategories = [] }) => {
    const [courseTitle, setCourseTitle] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    // This hook ensures the category defaults to the first item when the modal opens.
    useEffect(() => {
        if (isOpen && courseCategories.length > 0) {
            setCategory(courseCategories[0].name);
        }
        // Reset form when modal is closed
        if (!isOpen) {
            setCourseTitle('');
            setCategory('');
        }
    }, [isOpen, courseCategories]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!courseTitle.trim() || !category) {
            showToast("Please provide a title and select a category.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "courses"), {
                title: courseTitle,
                category,
                teacherId,
                units: []
            });
            showToast(`Subject "${courseTitle}" created successfully!`, 'success');
            onClose();
        } catch (error) {
            showToast("Failed to create subject.", 'error');
            console.error("Error creating course:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a New Subject">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-700">Subject Title</label>
                    <input
                        type="text"
                        id="courseTitle"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        placeholder="e.g., General Mathematics"
                        className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                        id="category"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={courseCategories.length === 0}
                    >
                        <option value="" disabled>
                            {courseCategories.length > 0 ? "Select a category..." : "No categories available"}
                        </option>
                        {courseCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                        {isSubmitting ? 'Creating...' : 'Create Subject'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCourseModal;