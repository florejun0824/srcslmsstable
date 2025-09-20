import { useState, useMemo, useCallback } from 'react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase'; // Using the '@' alias is best practice!

export const useAnnouncements = (initialAnnouncements, showToast) => {
    const [editingAnnId, setEditingAnnId] = useState(null);
    const [editingAnnText, setEditingAnnText] = useState('');
    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});

    const sortedAnnouncements = useMemo(() => {
        if (!Array.isArray(initialAnnouncements)) return [];
        // Create a new array to avoid mutating the original prop
        return [...initialAnnouncements].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA;
        });
    }, [initialAnnouncements]);

    const handleStartEditAnn = useCallback((post) => {
        setEditingAnnId(post.id);
        setEditingAnnText(post.content);
    }, []);
    
    const handleCancelEdit = useCallback(() => {
        setEditingAnnId(null);
        setEditingAnnText('');
    }, []);

    const handleUpdateTeacherAnn = useCallback(async () => {
        if (!editingAnnId) return;
        const annDocRef = doc(db, 'teacher_announcements', editingAnnId);
        try {
            await updateDoc(annDocRef, { content: editingAnnText });
            showToast("Announcement updated successfully!", "success");
            setEditingAnnId(null);
            setEditingAnnText('');
        } catch (error) {
            console.error("Error updating announcement:", error);
            showToast("Failed to update announcement.", "error");
        }
    }, [editingAnnId, editingAnnText, showToast]);

    const handleDeleteTeacherAnn = useCallback(async (id) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
            try {
                await deleteDoc(doc(db, 'teacherAnnouncements', id));
                showToast("Announcement deleted.", "info");
            } catch (error) {
                console.error("Error deleting announcement:", error);
                showToast("Failed to delete announcement.", "error");
            }
        }
    }, [showToast]);

    const handleTogglePinAnnouncement = useCallback(async (id, isCurrentlyPinned) => {
        const annDocRef = doc(db, 'teacher_announcements', id);
        try {
            await updateDoc(annDocRef, { isPinned: !isCurrentlyPinned });
            showToast(isCurrentlyPinned ? "Announcement unpinned." : "Announcement pinned!", "success");
        } catch (error) {
            console.error("Error pinning announcement:", error);
            showToast("Failed to update pin status.", "error");
        }
    }, [showToast]);

    const toggleAnnouncementExpansion = useCallback((announcementId) => {
        setExpandedAnnouncements(prev => ({ ...prev, [announcementId]: !prev[announcementId] }));
    }, []);

    return {
        sortedAnnouncements,
        editingAnnId,
        editingAnnText,
        setEditingAnnText,
        expandedAnnouncements,
        handleStartEditAnn,
        handleCancelEdit,
        handleUpdateTeacherAnn,
        handleDeleteTeacherAnn,
        handleTogglePinAnnouncement,
        toggleAnnouncementExpansion,
    };
};