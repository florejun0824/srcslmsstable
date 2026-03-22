// src/hooks/useSystemChangelogs.js
import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useSystemChangelogs = (showToast) => {
    const [changelogs, setChangelogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'system_changelogs'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChangelogs(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching system changelogs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addChangelog = useCallback(async (version, content, isMajor = false, authorName) => {
        if (!version || !content) {
            if (showToast) showToast("Version and content are required.", "error");
            return false;
        }

        try {
            await addDoc(collection(db, 'system_changelogs'), {
                version: version.trim(),
                content: content.trim(),
                isMajor: isMajor,
                authorName: authorName || 'System Admin',
                createdAt: serverTimestamp()
            });
            if (showToast) showToast(`Changelog v${version} posted successfully!`, "success");
            return true;
        } catch (error) {
            console.error("Error adding changelog:", error);
            if (showToast) showToast("Failed to post changelog.", "error");
            return false;
        }
    }, [showToast]);

    const deleteChangelog = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'system_changelogs', id));
            if (showToast) showToast("Changelog deleted successfully.", "success");
            return true;
        } catch (error) {
            console.error("Error deleting changelog:", error);
            if (showToast) showToast("Failed to delete changelog.", "error");
            return false;
        }
    }, [showToast]);

    return {
        changelogs,
        loading,
        addChangelog,
        deleteChangelog
    };
};
