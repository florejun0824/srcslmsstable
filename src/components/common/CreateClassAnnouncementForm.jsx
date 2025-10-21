// src/components/teacher/CreateClassAnnouncementForm.js
import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const CreateClassAnnouncementForm = ({ classId, onAnnouncementPosted }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();
    const { userProfile } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            showToast("Announcement cannot be empty.", "error");
            return;
        }
        if (!userProfile?.id || !userProfile?.displayName) {
            showToast("Teacher information missing. Cannot post announcement.", "error");
            console.error("User profile incomplete:", userProfile);
            return;
        }

        setIsSubmitting(true);
        try {
            // CRITICAL CHANGE: Saving 'classId' as a string directly, not an array
            await addDoc(collection(db, 'studentAnnouncements'), {
                classId: classId, // Store classId as a string field
                teacherId: userProfile.id,
                teacherName: userProfile.displayName,
                teacherPhotoURL: userProfile.photoURL || null, // FIX: Save the user's profile picture URL
                content,
                createdAt: serverTimestamp(),
            });
            showToast("Announcement posted successfully!", "success");
            setContent('');
            onAnnouncementPosted();
        } catch (error) {
            showToast("Failed to post announcement.", "error");
            console.error("Error posting announcement:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border bg-gray-50 rounded-lg mt-4">
            <textarea
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                rows="3"
                placeholder="Write an announcement for this class..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
            />
            <div className="text-right mt-2">
                <button
                    type="submit"
                    className={`px-4 py-2 rounded-md font-semibold text-white transition duration-200
                                ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Posting...' : 'Post Announcement'}
                </button>
            </div>
        </form>
    );
};

export default CreateClassAnnouncementForm;