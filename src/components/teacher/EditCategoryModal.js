import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext'; // Corrected import path
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const EditCategoryModal = ({ isOpen, onClose, category, onCategoryUpdated }) => {
    const [categoryName, setCategoryName] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (category) {
            setCategoryName(category.name);
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!categoryName.trim()) {
            showToast("Category name cannot be empty.", "error");
            return;
        }
        if (!category || !category.id) {
            showToast("Cannot edit a category without an ID.", "error");
            return;
        }

        try {
            const categoryRef = doc(db, "subjectCategories", category.id);
            await updateDoc(categoryRef, { name: categoryName.trim() });
            showToast("Category updated successfully!", "success");
            if (onCategoryUpdated) onCategoryUpdated();
            onClose();
        } catch (error) {
            showToast("Failed to update category.", "error");
            console.error("Error updating category:", error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Category`}>
            <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md mb-4"
                    required
                />
                <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700">
                    Save Changes
                </button>
            </form>
        </Modal>
    );
};

export default EditCategoryModal;