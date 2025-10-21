import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Modal from '../common/Modal';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';

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

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Create a New Subject"
            description="Add a subject to your chosen category."
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="courseTitle" className="block text-sm font-semibold text-slate-600">Subject Title</label>
                    <input
                        type="text"
                        id="courseTitle"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        placeholder="e.g., Introduction to Algebra"
                        className="w-full p-3 mt-2 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 placeholder:text-slate-500"
                        required
                    />
                </div>
                <div className="relative">
                    <label htmlFor="category" className="block text-sm font-semibold text-slate-600">Category</label>
                    <div className="relative mt-2">
                        <select
                            id="category"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full p-3 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 appearance-none pr-10"
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
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="px-5 py-2.5 text-base font-semibold text-slate-700 bg-neumorphic-base rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || !courseTitle.trim() || !category} className="flex items-center justify-center gap-2 px-5 py-2.5 text-base font-bold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50">
                        {isSubmitting ? 'Creating...' : 'Create Subject'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCourseModal;