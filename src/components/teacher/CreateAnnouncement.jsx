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
                    teacherId,
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
                    teacherId,
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
        // MODIFIED: The main container is now transparent, as the parent card provides the background and shadow.
        <div>
            <form onSubmit={handleSubmit}>
                <textarea
                    className="w-full p-3 border-none ring-0 focus:ring-0 rounded-lg bg-neumorphic-base text-slate-800 resize-none shadow-neumorphic-inset placeholder:text-slate-500"
                    rows="4"
                    placeholder="What do you want to announce?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <div className="mt-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 p-1 rounded-full bg-neumorphic-base shadow-neumorphic-inset">
                        <label className="flex-1">
                            <input
                                type="radio"
                                name="audience"
                                value="teacher"
                                checked={audience === 'teacher'}
                                onChange={() => setAudience('teacher')}
                                className="sr-only" // Hide the default radio button
                            />
                            <span className={`block text-center px-4 py-1.5 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                audience === 'teacher' ? 'shadow-neumorphic-inset text-sky-600' : 'text-slate-500'
                            }`}>
                                Teachers
                            </span>
                        </label>
                        <label className="flex-1">
                            <input
                                type="radio"
                                name="audience"
                                value="student"
                                checked={audience === 'student'}
                                onChange={() => setAudience('student')}
                                className="sr-only" // Hide the default radio button
                            />
                            <span className={`block text-center px-4 py-1.5 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 ${
                                audience === 'student' ? 'shadow-neumorphic-inset text-sky-600' : 'text-slate-500'
                            }`}>
                                Students
                            </span>
                        </label>
                    </div>
                    <button
                        type="submit"
                        className="w-full md:w-auto px-6 py-2.5 rounded-full font-semibold text-sky-600 bg-neumorphic-base shadow-neumorphic transition-shadow duration-200 hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:shadow-neumorphic-inset disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Posting...' : 'Post Announcement'}
                    </button>
                </div>

                {audience === 'student' && (
                    <div className="mt-4 border-t border-neumorphic-shadow-dark/30 pt-4">
                        <h3 className="font-semibold mb-2 text-slate-700">Select Classes:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {classes.map(cls => (
                                <label key={cls.id} className="cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only" // Hide the default checkbox
                                        checked={selectedClasses.includes(cls.id)}
                                        onChange={() => handleClassSelection(cls.id)}
                                    />
                                    <span className={`block w-full p-2 rounded-lg text-center text-sm transition-all duration-200 ${
                                        selectedClasses.includes(cls.id)
                                            ? 'bg-neumorphic-base shadow-neumorphic-inset font-semibold text-sky-600'
                                            : 'bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset text-slate-700'
                                    }`}>
                                        {cls.name}
                                    </span>
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