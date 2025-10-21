import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import UserInitialsAvatar from './UserInitialsAvatar';

const CreatePost = ({ userProfile, classes, onPostCreated }) => {
    const [content, setContent] = useState('');
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleClassToggle = (classId) => {
        setSelectedClasses(prev => 
            prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() || selectedClasses.length === 0) {
            showToast("Please write something and select at least one class.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "announcements"), {
                teacherId: userProfile.id,
                teacherName: `${userProfile.firstName} ${userProfile.lastName}`,
                content,
                classIds: selectedClasses,
                createdAt: Timestamp.now(),
                likes: [],
                comments: [] // Comments will be a subcollection, but we can store a count here
            });
            setContent('');
            setSelectedClasses([]);
            showToast("Announcement posted successfully!", "success");
            if (onPostCreated) onPostCreated();
        } catch (error) {
            showToast("Failed to create post.", "error");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex items-start space-x-4">
                <UserInitialsAvatar firstName={userProfile.firstName} lastName={userProfile.lastName} />
                <form onSubmit={handleSubmit} className="flex-1">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`What's on your mind, ${userProfile.firstName}?`}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        rows="3"
                    />
                    <div className="mt-2">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Post to classes:</p>
                        <div className="flex flex-wrap gap-2">
                            {classes.map(c => (
                                <button
                                    type="button"
                                    key={c.id}
                                    onClick={() => handleClassToggle(c.id)}
                                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                        selectedClasses.includes(c.id) 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                        >
                            {isSubmitting ? "Posting..." : "Post"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePost;