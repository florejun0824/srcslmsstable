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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="flex border-b border-gray-200">
                    <button type="button" onClick={() => setAudience('teachers')} className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 ${audience === 'teachers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <MegaphoneIcon className="w-5 h-5" /> For Teachers
                    </button>
                    <button type="button" onClick={() => setAudience('students')} className={`flex-1 p-3 text-sm font-semibold flex items-center justify-center gap-2 ${audience === 'students' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <UsersIcon className="w-5 h-5" /> For Students
                    </button>
                </div>
            </div>
            {audience === 'students' && (
                <div>
                    <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700 mb-1">Select a Class</label>
                    <select id="classSelect" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" required>
                        <option value="" disabled>-- Choose a class --</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>))}
                    </select>
                </div>
            )}
            <div>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" rows="6" placeholder="What's on your mind?" required />
            </div>
            <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary">Post Announcement</button>
            </div>
        </form>
    );
};

export default CreateAnnouncement;