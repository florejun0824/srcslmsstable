import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Modal from '../common/Modal';
import { PlusIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid';

const CreateCourseModal = ({ isOpen, onClose, teacherId, courseCategories = [], preselectedCategory = null }) => {
    const [courseTitle, setCourseTitle] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            if (preselectedCategory) {
                setCategory(preselectedCategory);
            } else if (courseCategories.length > 0) {
                setCategory(courseCategories[0]?.name || '');
            } else {
                setCategory('');
            }
        }
    }, [isOpen, courseCategories, preselectedCategory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalCategory = preselectedCategory || category;

        if (!courseTitle.trim() || !finalCategory) {
            showToast("Please provide a title and select a category.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "courses"), {
                title: courseTitle,
                category: finalCategory,
                teacherId,
                createdAt: serverTimestamp(),
                units: []
            });
            showToast(`Subject "${courseTitle}" created successfully!`, 'success');
            handleClose();
        } catch (error) {
            showToast("Failed to create subject.", 'error');
            console.error("Error creating course:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setCourseTitle('');
        setCategory('');
        setIsSubmitting(false);
        onClose();
    };

    const inputClasses = "w-full p-4 mt-2 bg-gray-500/10 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 placeholder:text-gray-400";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Create a New Subject"
            description="Add a subject to your chosen category."
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="courseTitle" className="block text-sm font-semibold text-gray-600">Subject Title</label>
                    <input
                        type="text"
                        id="courseTitle"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        placeholder="e.g., Introduction to Algebra"
                        className={inputClasses}
                        required
                    />
                </div>
                <div className="relative">
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-600">Category</label>
                    <select
                        id="category"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className={`${inputClasses} appearance-none pr-10`}
                        required
                        disabled={preselectedCategory || courseCategories.length === 0}
                    >
                        <option value="" disabled>
                            {courseCategories.length > 0 ? "Select a category..." : "No categories available"}
                        </option>
                        {courseCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-4">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="px-5 py-3 text-base font-medium text-slate-700 bg-slate-200/70 rounded-xl hover:bg-slate-300 transition-all disabled:opacity-50" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || !courseTitle.trim() || !category} className="flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none">
                        {isSubmitting ? 'Creating...' : 'Create Subject'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCourseModal;