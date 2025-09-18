import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../contexts/ToastContext';

const EditCategoryModal = ({ isOpen, onClose, categoryName: initialName, onSave }) => {
    const [categoryName, setCategoryName] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (initialName) {
            setCategoryName(initialName);
        }
    }, [initialName]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!categoryName.trim()) {
            showToast("Category name cannot be empty.", "error");
            return;
        }
        // The onSave function is passed from the parent component (TeacherDashboardLayout).
        // It contains the real database update logic.
        onSave(categoryName.trim());
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
                    placeholder="Enter new category name"
                    required
                />
                <div className='flex justify-end gap-2'>
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                        Save Changes
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditCategoryModal;