import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal'; // Ensure this points to the new Modal component
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';

// This helper function generates a random 6-character alphanumeric code.
const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Omitted O and 0
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const CreateClassModal = ({ isOpen, onClose, teacherId }) => {
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 7');
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
            const newClassCode = generateClassCode();
            await addDoc(collection(db, "classes"), {
                name: className,
                section: section,
                gradeLevel: gradeLevel,
                teacherId: teacherId,
                students: [],
                classCode: newClassCode,
                isArchived: false,
            });
            showToast(`Class created successfully! Code: ${newClassCode}`, 'success');
            onClose();
            setClassName('');
            setSection('');
        } catch (error) {
            console.error("Error creating class: ", error);
            showToast("Failed to create class.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Common classes for a consistent iOS-style input field
    const inputClasses = "w-full p-4 mt-2 bg-gray-500/10 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 placeholder:text-gray-400";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a New Class">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="className" className="block text-sm font-semibold text-gray-600">Class Name</label>
                    <input
                        type="text"
                        id="className"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="e.g., English Literature"
                        className={inputClasses}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="section" className="block text-sm font-semibold text-gray-600">Section</label>
                    <input
                        type="text"
                        id="section"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                        placeholder="e.g., Section A"
                        className={inputClasses}
                        required
                    />
                </div>
                <div className="relative">
                    <label htmlFor="gradeLevel" className="block text-sm font-semibold text-gray-600">Grade Level</label>
                    <select
                        id="gradeLevel"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className={`${inputClasses} appearance-none pr-10`} // Remove default arrow
                        required
                    >
                        {gradeLevels.map(level => <option key={level} value={level}>{level}</option>)}
                    </select>
                    {/* Custom chevron icon for the select dropdown */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-4">
                        <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:transform-none"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Class'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateClassModal;