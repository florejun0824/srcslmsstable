import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';

const CreateAnnouncement = ({ teacherProfile, classes }) => {
    const { showToast } = useToast();
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('teacher');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClassSelection = (classId) => {
        const newSelectedClasses = selectedClasses.includes(classId)
            ? selectedClasses.filter(id => id !== classId)
            : [...selectedClasses, classId];

        setSelectedClasses(newSelectedClasses);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            showToast("Content cannot be empty.", "error");
            return;
        }

        setIsSubmitting(true);
        const teacherName = `${teacherProfile?.firstName} ${teacherProfile?.lastName}`;
        const teacherId = teacherProfile?.id;

        try {
            if (audience === 'teacher') {
                await addDoc(collection(db, 'teacherAnnouncements'), {
                    content,
                    teacherName,
                    teacherId, // ✅ Added teacherId
                    createdAt: serverTimestamp(),
                });
            } else {
                if (selectedClasses.length === 0) {
                    setIsSubmitting(false);
                    return showToast("Please select at least one class.", "error");
                }

                await addDoc(collection(db, 'classAnnouncements'), {
                    content,
                    teacherName,
                    teacherId, // ✅ Added teacherId
                    classIds: selectedClasses,
                    createdAt: serverTimestamp(),
                });
            }

            showToast("Announcement posted successfully!", "success");
            setContent('');
            setSelectedClasses([]);
        } catch (error) {
            console.error("Error posting announcement:", error);
            showToast("Failed to post announcement.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-bold text-lg mb-4">Create Announcement</h2>
            <form onSubmit={handleSubmit}>
                <textarea
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="What do you want to announce?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center">
                        <span className="font-semibold mr-4">Post to:</span>
                        <label className="mr-4 flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="audience"
                                value="teacher"
                                checked={audience === 'teacher'}
                                onChange={() => setAudience('teacher')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-gray-700">Teachers</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="radio"
                                name="audience"
                                value="student"
                                checked={audience === 'student'}
                                onChange={() => setAudience('student')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="ml-2 text-gray-700">Students</span>
                        </label>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary w-full md:w-auto"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Posting...' : 'Post Announcement'}
                    </button>
                </div>

                {audience === 'student' && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                        <h3 className="font-semibold mb-2 text-gray-800">Select Classes:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {classes.map(cls => (
                                <label
                                    key={cls.id}
                                    onClick={(e) => {
                                        e.preventDefault(); // prevent double-click bug
                                        handleClassSelection(cls.id);
                                    }}
                                    className={`p-2 border rounded-md text-sm cursor-pointer transition-colors ${
                                        selectedClasses.includes(cls.id)
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        readOnly
                                        checked={selectedClasses.includes(cls.id)}
                                    />
                                    {cls.name}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreateAnnouncement;
