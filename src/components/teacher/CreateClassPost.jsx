import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Users } from 'lucide-react';

const CreateClassPost = ({ teacherId, onClassCreated }) => {
    const [className, setClassName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!className.trim()) return;
        setIsSubmitting(true);
        try {
            const classCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await addDoc(collection(db, "classes"), { 
                name: className, 
                teacherId, 
                students: [], 
                code: classCode, 
                gradeLevel: "Not specified", 
                courseAccess: {} 
            });
            showToast(`Class "${className}" created! Code: ${classCode}`);
            setClassName('');
            if (onClassCreated) onClassCreated();
        } catch (error) {
            showToast("Failed to create class.", "error");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-lg border border-white/30 rounded-2xl shadow-lg p-6">
            <div className="flex items-center mb-3">
                <Users className="text-blue-600 mr-3" size={24} />
                <span className="font-semibold text-gray-800">Create New Class</span>
            </div>
            <form onSubmit={handleSubmit}>
                <textarea 
                    value={className} 
                    onChange={(e) => setClassName(e.target.value)} 
                    placeholder="e.g., Grade 11 - St. Augustine" 
                    className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3" 
                    rows="2" 
                    required 
                />
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-200 shadow disabled:opacity-50"
                >
                    {isSubmitting ? 'Creating...' : 'Create Class'}
                </button>
            </form>
        </div>
    );
};

export default CreateClassPost;