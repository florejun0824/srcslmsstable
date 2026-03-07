import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

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
            // We now save to a field named "classIds" and put the single classId into an array.
            // This matches the data structure of your main announcement form.
            await addDoc(collection(db, 'classAnnouncements'), {
                classIds: [classId], 
                teacherName,
                content: content.trim(),
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
        <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit} 
            className="flex flex-col gap-4 w-full"
        >
            <div className="relative">
                <textarea
                    className="w-full min-h-[140px] p-5 bg-zinc-200/60 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 rounded-[24px] outline-none focus:ring-2 focus:ring-indigo-400/50 dark:focus:ring-indigo-500/50 transition-shadow resize-none text-base"
                    placeholder="What would you like to share with the class?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isSubmitting}
                    autoFocus
                />
            </div>
            
            <div className="flex justify-end items-center">
                <motion.button 
                    type="submit" 
                    disabled={isSubmitting || !content.trim()}
                    whileHover={!isSubmitting && content.trim() ? { scale: 1.02 } : {}}
                    whileTap={!isSubmitting && content.trim() ? { scale: 0.96 } : {}}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                        isSubmitting || !content.trim()
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                            : 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md hover:shadow-lg'
                    }`}
                >
                    {isSubmitting ? (
                        <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Posting...</span>
                        </>
                    ) : (
                        <>
                            <span>Post</span>
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </>
                    )}
                </motion.button>
            </div>
        </motion.form>
    );
};

export default CreateClassAnnouncementForm;