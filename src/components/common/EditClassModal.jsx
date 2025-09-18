import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const EditClassModal = ({ isOpen, onClose, classData }) => {
    const [name, setName] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (classData) {
            setName(classData.name);
        }
    }, [classData]);

    const handleSave = async (newName) => {
        if (!classData) return;
        try {
            const classRef = doc(db, "classes", classData.id);
            await updateDoc(classRef, { name: newName });
            showToast("Class name updated successfully!");
            onClose();
        } catch (error) {
            showToast("Failed to update class name.", 'error');
        }
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            handleSave(name.trim());
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Class Name">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 transition-colors">
                    Save Changes
                </button>
            </form>
        </Modal>
    );
};

export default EditClassModal;