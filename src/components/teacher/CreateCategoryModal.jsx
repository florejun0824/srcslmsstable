import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PlusIcon } from '@heroicons/react/24/solid';

const CreateCategoryModal = ({ isOpen, onClose, teacherId }) => {
    const [categoryName, setCategoryName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!categoryName.trim()) {
            showToast("Category name cannot be empty.", "error");
            return;
        }
        if (!teacherId) {
            showToast("Cannot create category without a user context.", "error");
            return;
        }
        setIsCreating(true);
        try {
            await addDoc(collection(db, "courses"), {
                title: `(New Subject in ${categoryName.trim()})`,
                category: categoryName.trim(),
                teacherId: teacherId,
                createdAt: serverTimestamp(),
                units: []
            });
            showToast("Category created successfully!", "success");
            handleClose();
        } catch (error) {
            console.error("Error creating category:", error);
            showToast("Failed to create category.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setCategoryName('');
        setIsCreating(false);
        onClose();
    };

    const inputClasses = "w-full p-4 mt-2 bg-gray-500/10 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 placeholder:text-gray-400";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Create New Category"
            description="Group related subjects under a new category."
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="category-name" className="block text-sm font-semibold text-gray-600">Category Name</label>
                    <input
                        id="category-name"
                        type="text"
                        value={categoryName}
                        onChange={(e) => setCategoryName(e.target.value)}
                        placeholder="e.g., Grade 10 Science"
                        className={inputClasses}
                        required
                        disabled={isCreating}
                    />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="px-5 py-3 text-base font-medium text-slate-700 bg-slate-200/70 rounded-xl hover:bg-slate-300 transition-all disabled:opacity-50" disabled={isCreating}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
                        disabled={isCreating || !categoryName.trim()}
                    >
                        {isCreating ? 'Creating...' : 'Create Category'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCategoryModal;