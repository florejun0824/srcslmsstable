import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal'; // Corrected import path

const EditClassModal = ({ isOpen, onClose, classData, onUpdate }) => {
    const [editedName, setEditedName] = useState(classData?.name || '');

    useEffect(() => {
        setEditedName(classData?.name || '');
    }, [classData]);

    if (!classData) {
        return null;
    }

    const handleSave = () => {
        onUpdate(classData.id, editedName);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${classData.name}`}>
            <div className="p-4">
                <label className="block mb-2">
                    <span className="text-gray-700">Class Name</span>
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                </label>
            </div>
            <div className="flex justify-end p-4 border-t">
                <button
                    onClick={onClose}
                    className="mr-2 px-4 py-2 bg-gray-200 rounded-md"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                >
                    Save Changes
                </button>
            </div>
        </Modal>
    );
};

export default EditClassModal;