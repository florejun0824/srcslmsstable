import React, { useState, useEffect } from 'react';
import Modal from './Modal';
// The import for the old COURSE_CATEGORIES constant is now removed.

// The component now accepts the dynamic list of categories as a prop.
const EditCourseModal = ({ isOpen, onClose, onEditCourse, course, courseCategories = [] }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');

    useEffect(() => {
        if(course) {
            setTitle(course.title);
            setCategory(course.category || (courseCategories[0] || ''));
        }
    }, [course, courseCategories]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onEditCourse(title, category);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Subject">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    {/* The dropdown now uses the dynamic list from props */}
                    <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        className="w-full p-3 border border-gray-300 rounded-md bg-white"
                    >
                        <option value="" disabled>Select a category...</option>
                        {courseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600">
                    Save Changes
                </button>
            </form>
        </Modal>
    );
};

export default EditCourseModal;