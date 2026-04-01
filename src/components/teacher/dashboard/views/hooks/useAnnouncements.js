import { useState, useMemo, useCallback, useEffect } from 'react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { getWorker } from '@/workers/workerApi';

export const useAnnouncements = (initialAnnouncements, showToast) => {
    const [editingAnnId, setEditingAnnId] = useState(null);
    const [editingAnnText, setEditingAnnText] = useState('');
    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});

    const [sortedAnnouncements, setSortedAnnouncements] = useState([]);

    useEffect(() => {
        const processAnnouncements = async () => {
            if (!initialAnnouncements || !Array.isArray(initialAnnouncements)) {
                setSortedAnnouncements([]);
                return;
            }
            try {
                const worker = await getWorker();
                const sorted = await worker.sortAnnouncements(initialAnnouncements);
                setSortedAnnouncements(sorted);
            } catch (error) {
                console.error("Error sorting announcements in worker:", error);
                // Fallback to basic copy if worker fails
                setSortedAnnouncements([...initialAnnouncements]);
            }
        };

        processAnnouncements();
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
        // MODIFIED: Changed collection path to 'teacherAnnouncements'
        const annDocRef = doc(db, 'teacherAnnouncements', editingAnnId);
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
                // This path was already correct
                await deleteDoc(doc(db, 'teacherAnnouncements', id));
                showToast("Announcement deleted.", "info");
            } catch (error) {
                console.error("Error deleting announcement:", error);
                showToast("Failed to delete announcement.", "error");
            }
        }
    }, [showToast]);

    const handleTogglePinAnnouncement = useCallback(async (id, isCurrentlyPinned) => {
        // MODIFIED: Changed collection path to 'teacherAnnouncements'
        const annDocRef = doc(db, 'teacherAnnouncements', id);
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