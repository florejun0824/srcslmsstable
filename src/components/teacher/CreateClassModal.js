import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal'; // Assuming Modal component is in common folder

// This helper function generates a random 6-character alphanumeric code.
const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Omitted O and 0 to avoid confusion
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const CreateClassModal = ({ isOpen, onClose, teacherId }) => {
    // State for the form fields
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 7'); // Default value
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!className.trim() || !section.trim() || !gradeLevel) {
            showToast("Please fill out all fields.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            // Generate the unique class code
            const newClassCode = generateClassCode();

            // Create the new class object in Firestore
            await addDoc(collection(db, "classes"), {
                name: className,
                section: section,
                gradeLevel: gradeLevel,
                teacherId: teacherId,
                students: [],
                classCode: newClassCode, // Add the new code to the document
                isArchived: false,      // Set a default archive status
            });
            
            showToast(`Class created successfully! Code: ${newClassCode}`, 'success');
            onClose(); // Close the modal on success
            setClassName('');
            setSection('');

        } catch (error) {
            console.error("Error creating class: ", error);
            showToast("Failed to create class.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a New Class">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="className" className="block text-sm font-medium text-gray-700">Class Name</label>
                    <input
                        type="text"
                        id="className"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="e.g., English Literature"
                        className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="section" className="block text-sm font-medium text-gray-700">Section</label>
                    <input
                        type="text"
                        id="section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g., Section A"
                        className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">Grade Level</label>
                    <select
                        id="gradeLevel"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    >
                        {gradeLevels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                </div>
                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                        {isSubmitting ? 'Creating...' : 'Create Class'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateClassModal;