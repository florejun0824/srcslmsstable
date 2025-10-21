import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { BookOpenIcon } from '@heroicons/react/24/outline'; // Changed icon for clarity

const CreateCoursePost = ({ teacherId, onCourseCreated, courseCategories = [] }) => {
    const [courseTitle, setCourseTitle] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!category && courseCategories.length > 0) {
            setCategory(courseCategories[0].name);
        }
    }, [courseCategories, category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!courseTitle.trim() || !category) {
            showToast("Please provide a title and select a category.", "error");
            return;
        };
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "courses"), { 
                title: courseTitle, 
                category, 
                teacherId, 
                units: [] 
            });
            showToast(`Subject "${courseTitle}" created successfully!`, 'success');
            setCourseTitle('');
            if (onCourseCreated) onCourseCreated();
        } catch (error) {
            showToast("Failed to create subject.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        // MODIFIED: Padding is now responsive (p-4 on small screens, p-6 on larger)
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-4 sm:p-6 h-full">
            <div className="flex items-center mb-4">
                <BookOpenIcon className="text-purple-600 mr-3 h-6 w-6" />
                <span className="font-semibold text-lg text-gray-800">Create New Subject</span>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                    type="text" 
                    value={courseTitle} 
                    onChange={(e) => setCourseTitle(e.target.value)} 
                    placeholder="Subject Title (e.g., General Mathematics)" 
                    className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" 
                    required 
                />
                <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" 
                    required
                    disabled={courseCategories.length === 0}
                >
                    <option value="" disabled>
                        {courseCategories.length > 0 ? "Select a category..." : "No categories available"}
                    </option>
                    {courseCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                {/* MODIFIED: Ensured button uses consistent styling */}
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full btn-primary font-semibold py-3"
                >
                    {isSubmitting ? 'Creating...' : 'Create Subject'}
                </button>
            </form>
        </div>
    );
};

export default CreateCoursePost;