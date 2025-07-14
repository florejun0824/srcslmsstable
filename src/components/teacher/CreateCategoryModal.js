import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
// ✅ MODIFIED: Added serverTimestamp for consistency
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ✅ MODIFIED: The modal now accepts a teacherId and doesn't need onCategoryCreated
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
            // ✅ MODIFIED: Instead of adding to a separate collection, we now create a
            // placeholder subject in the 'courses' collection with the new category name.
            await addDoc(collection(db, "courses"), {
                title: `(New Subject in ${categoryName.trim()})`, // A placeholder title
                category: categoryName.trim(),
                teacherId: teacherId, // Associate with the current user
                createdAt: serverTimestamp(),
                units: [] // Start with no units
            });

            showToast("Category created successfully!", "success");
            onClose(); // Close the modal
        } catch (error) {
            console.error("Error creating category via placeholder subject:", error);
            showToast("Failed to create category.", "error");
        } finally {
            setIsCreating(false);
            setCategoryName(''); // Reset field after submission
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Subject Category">
            <form onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Category Name</label>
                <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., General Mathematics"
                    className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isCreating}
                />
                <button 
                    type="submit" 
                    className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    disabled={isCreating}
                >
                    {isCreating ? 'Creating...' : 'Create Category'}
                </button>
            </form>
        </Modal>
    );
};

export default CreateCategoryModal;