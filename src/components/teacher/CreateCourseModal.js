import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal';

// Added preselectedCategory prop
const CreateCourseModal = ({ isOpen, onClose, teacherId, courseCategories = [], preselectedCategory = null }) => {
    const [courseTitle, setCourseTitle] = useState('');
    const [category, setCategory] = useState(''); // This state will hold the selected or preselected category
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    // This hook ensures the category defaults to the first item or preselected category when the modal opens.
    useEffect(() => {
        if (isOpen) {
            if (preselectedCategory) {
                setCategory(preselectedCategory); // Prioritize preselected category
            } else if (courseCategories.length > 0) {
                setCategory(courseCategories[0].name); // Fallback to first available category
            } else {
                setCategory(''); // No categories available or preselected
            }
        }
        // Reset form when modal is closed
        if (!isOpen) {
            setCourseTitle('');
            setCategory(''); // Clear category state too
        }
    }, [isOpen, courseCategories, preselectedCategory]); // Added preselectedCategory to dependency array

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Use the category that's either preselected or chosen from dropdown
        const finalCategory = preselectedCategory || category;

        if (!courseTitle.trim() || !finalCategory) { // Validate title and finalCategory
            showToast("Please provide a title and select a category.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "courses"), {
                title: courseTitle,
                category: finalCategory, // Use finalCategory
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
                    {preselectedCategory ? (
                        // Display preselected category as disabled text
                        <input
                            type="text"
                            id="category"
                            value={preselectedCategory}
                            className="mt-1 w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed"
                            disabled
                        />
                    ) : (
                        // Display dropdown if no preselected category
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
                    )}
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