import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal'; 

const EditClassModal = ({ isOpen, onClose, classData, onUpdate, courses = [] }) => {
    const [editedName, setEditedName] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');

    // When the modal opens, set the state with the current class data
    useEffect(() => {
        if (classData) {
            setEditedName(classData.name || '');
            setSelectedSubjectId(classData.subjectId || ''); // Set the currently assigned subject
        }
    }, [classData]);

    if (!classData) {
        return null;
    }

    const handleSave = () => {
        // Pass the updated name AND the selected subjectId back
        onUpdate(classData.id, {
            name: editedName,
            subjectId: selectedSubjectId
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${classData.name}`}>
            <div className="p-4 space-y-4">
                {/* --- Class Name Input --- */}
                <label className="block">
                    <span className="text-gray-700">Class Name</span>
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                </label>

                {/* --- Subject Selector Dropdown --- */}
                <label className="block">
                    <span className="text-gray-700">Assign Subject</span>
                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    >
                        <option value="">No Subject Assigned</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
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