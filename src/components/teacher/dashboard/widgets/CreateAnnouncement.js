import React, { useState } from 'react';
import { MegaphoneIcon, UsersIcon } from '@heroicons/react/24/outline';

const CreateAnnouncement = ({ classes, onPost }) => {
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('teachers');
    const [selectedClass, setSelectedClass] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const selectedClassData = classes.find(c => c.id === selectedClass);
        onPost({
            content,
            audience,
            classId: selectedClass,
            className: selectedClassData ? selectedClassData.name : null
        });
        setContent('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Announcement Audience</h3>
                <div className="flex items-center gap-4 bg-gray-100 rounded-full p-1 shadow-inner">
                    <button
                        type="button"
                        onClick={() => setAudience('teachers')}
                        className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-full transition-all duration-300
                            ${audience === 'teachers' ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-200'}
                        `}
                    >
                        <MegaphoneIcon className="w-5 h-5" /> For Teachers
                    </button>
                    <button
                        type="button"
                        onClick={() => setAudience('students')}
                        className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-full transition-all duration-300
                            ${audience === 'students' ? 'bg-white text-blue-600 shadow-md transform scale-105' : 'text-gray-500 hover:bg-gray-200'}
                        `}
                    >
                        <UsersIcon className="w-5 h-5" /> For Students
                    </button>
                </div>
            </div>
            {audience === 'students' && (
                <div>
                    <label htmlFor="classSelect" className="block text-sm font-bold text-gray-700 mb-2">Select a Class</label>
                    <div className="relative">
                        <select
                            id="classSelect"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full p-4 pl-6 pr-12 border-2 border-gray-300 rounded-xl bg-white shadow-lg text-gray-700 font-medium appearance-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 cursor-pointer"
                            required
                        >
                            <option value="" disabled>-- Choose a class --</option>
                            {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}
            <div>
                <label htmlFor="announcementContent" className="block text-sm font-bold text-gray-700 mb-2">Your Announcement</label>
                <textarea
                    id="announcementContent"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                    rows="6"
                    placeholder="What's on your mind? Share an update, a reminder, or an important message with your students or fellow teachers."
                    required
                />
            </div>
            <div className="flex justify-end pt-2">
                <button
                    type="submit"
                    className="py-3 px-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 active:scale-95"
                >
                    Post Announcement
                </button>
            </div>
        </form>
    );
};

export default CreateAnnouncement;