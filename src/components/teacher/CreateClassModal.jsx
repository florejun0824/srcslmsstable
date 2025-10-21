import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';

const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Accept 'courses' as a new prop
const CreateClassModal = ({ isOpen, onClose, teacherId, courses }) => {
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 7');
    const [selectedSubjectId, setSelectedSubjectId] = useState(''); // New state variable
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
                subjectId: selectedSubjectId, // Save the selected subject ID
            });
            showToast(`Class created successfully! Code: ${newClassCode}`, 'success');
            onClose();
            setClassName('');
            setSection('');
            setSelectedSubjectId(''); // Reset the state
        } catch (error) {
            console.error("Error creating class: ", error);
            showToast("Failed to create class.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses = "w-full p-3 mt-2 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 placeholder:text-slate-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create a New Class">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="className" className="block text-sm font-semibold text-slate-600">Class Name</label>
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
                    <label htmlFor="section" className="block text-sm font-semibold text-slate-600">Section</label>
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
                    <label htmlFor="gradeLevel" className="block text-sm font-semibold text-slate-600">Grade Level</label>
                    <div className="relative mt-2">
                        <select
                            id="gradeLevel"
                            value={gradeLevel}
                            onChange={(e) => setGradeLevel(e.target.value)}
                            className={`${inputClasses} appearance-none pr-10`}
                            required
                        >
                            {gradeLevels.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* New Subject Selector Dropdown */}
                <div className="relative">
                    <label htmlFor="subject" className="block text-sm font-semibold text-slate-600">Assign Subject</label>
                    <div className="relative mt-2">
                        <select
                            id="subject"
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className={`${inputClasses} appearance-none pr-10`}
                        >
                            <option value="">No Subject Assigned</option>
							{courses.sort((a, b) => a.title.localeCompare(b.title)).map((course) => (
							    <option key={course.id} value={course.id}>
							        {course.title}
							    </option>
							))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4">
                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full p-3 bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 font-bold rounded-xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-50"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Class'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateClassModal;