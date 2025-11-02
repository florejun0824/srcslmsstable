import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Modal from '../common/Modal';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';

const generateClassCode = () => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const CreateClassModal = ({ isOpen, onClose, teacherId, courses }) => {
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 7');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
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
                subjectId: selectedSubjectId,
            });
            showToast(`Class created successfully! Code: ${newClassCode}`, 'success');
            onClose();
            setClassName('');
            setSection('');
            setSelectedSubjectId('');
        } catch (error) {
            console.error("Error creating class: ", error);
            showToast("Failed to create class.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses =
        "w-full p-3 mt-2 border-none rounded-lg bg-neumorphic-base text-slate-800 shadow-neumorphic-inset focus:ring-0 placeholder:text-slate-500 dark:bg-neumorphic-base-dark dark:text-slate-100 dark:shadow-neumorphic-inset-dark dark:placeholder:text-slate-400";

    const dropdownBase =
        "relative mt-2 rounded-lg shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark cursor-pointer select-none";

    const dropdownMenu =
        "absolute z-50 mt-1 w-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-lg border border-black/10 dark:border-slate-700 overflow-hidden max-h-48 overflow-y-auto";

    const dropdownItem =
        "px-4 py-2 text-slate-800 dark:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 flex justify-between items-center";

    const primaryButtonStyles =
        "w-full p-3 text-base font-bold text-white bg-blue-600 rounded-xl shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500 transition-all duration-200 disabled:opacity-50 active:scale-95";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create a New Class"
            contentClassName="bg-neumorphic-base dark:bg-neumorphic-base-dark"
        >
            <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div>
                    <label htmlFor="className" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Class Name
                    </label>
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
                    <label htmlFor="section" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Section
                    </label>
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

                {/* Custom Grade Level Dropdown */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Grade Level
                    </label>
                    <div
                        className={dropdownBase}
                        onClick={() => {
                            setGradeDropdownOpen(!gradeDropdownOpen);
                            setSubjectDropdownOpen(false);
                        }}
                    >
                        <div className="flex items-center justify-between p-3 text-slate-800 dark:text-slate-100">
                            {gradeLevel}
                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400 dark:text-slate-300" />
                        </div>
                        {gradeDropdownOpen && (
                            <ul className={dropdownMenu}>
                                {gradeLevels.map((level) => (
                                    <li
                                        key={level}
                                        className={dropdownItem}
                                        onClick={() => {
                                            setGradeLevel(level);
                                            setGradeDropdownOpen(false);
                                        }}
                                    >
                                        {level}
                                        {gradeLevel === level && <CheckIcon className="h-4 w-4 text-blue-500" />}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Custom Subject Dropdown */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Assign Subject
                    </label>
                    <div
                        className={dropdownBase}
                        onClick={() => {
                            setSubjectDropdownOpen(!subjectDropdownOpen);
                            setGradeDropdownOpen(false);
                        }}
                    >
                        <div className="flex items-center justify-between p-3 text-slate-800 dark:text-slate-100">
                            {selectedSubjectId
                                ? courses.find((c) => c.id === selectedSubjectId)?.title
                                : 'No Subject Assigned'}
                            <ChevronUpDownIcon className="h-5 w-5 text-slate-400 dark:text-slate-300" />
                        </div>
                        {subjectDropdownOpen && (
                            <ul className={dropdownMenu}>
                                <li
                                    className={dropdownItem}
                                    onClick={() => {
                                        setSelectedSubjectId('');
                                        setSubjectDropdownOpen(false);
                                    }}
                                >
                                    No Subject Assigned
                                    {!selectedSubjectId && <CheckIcon className="h-4 w-4 text-blue-500" />}
                                </li>
                                {courses
                                    .sort((a, b) => a.title.localeCompare(b.title))
                                    .map((course) => (
                                        <li
                                            key={course.id}
                                            className={dropdownItem}
                                            onClick={() => {
                                                setSelectedSubjectId(course.id);
                                                setSubjectDropdownOpen(false);
                                            }}
                                        >
                                            {course.title}
                                            {selectedSubjectId === course.id && <CheckIcon className="h-4 w-4 text-blue-500" />}
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="pt-4">
                    <button type="submit" disabled={isSubmitting} className={primaryButtonStyles}>
                        {isSubmitting ? 'Creating...' : 'Create Class'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateClassModal;
