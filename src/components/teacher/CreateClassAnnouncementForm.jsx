import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';

const CreateClassAnnouncementForm = ({ classId, teacherName, onAnnouncementPosted }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            showToast("Announcement cannot be empty.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            // --- THIS IS THE FIX ---
            // We now save to a field named "classIds" and put the single classId into an array.
            // This matches the data structure of your main announcement form.
            await addDoc(collection(db, 'classAnnouncements'), {
                classIds: [classId], // Changed from classId: classId
                teacherName,
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
                className="w-full p-2 border rounded-md"
                rows="3"
                placeholder="Write an announcement for this class..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
            />
            <div className="text-right mt-2">
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Posting...' : 'Post'}
                </button>
            </div>
        </form>
    );
};

export default CreateClassAnnouncementForm;