import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

const CreateCategoryModal = ({ isOpen, onClose, onCategoryCreated }) => {
    const [categoryName, setCategoryName] = useState('');
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!categoryName.trim()) {
            showToast("Category name cannot be empty.", "error");
            return;
        }
        try {
            await addDoc(collection(db, "subjectCategories"), {
                name: categoryName.trim()
            });
            showToast("New category created successfully!", "success");
            onCategoryCreated(); // This will refresh the list in the dashboard
            onClose();
        } catch (error) {
            showToast("Failed to create category.", "error");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Subject Category">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Advanced Placement"
                    className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-md hover:bg-green-700 transition-colors">
                    Create Category
                </button>
            </form>
        </Modal>
    );
};

export default CreateCategoryModal;