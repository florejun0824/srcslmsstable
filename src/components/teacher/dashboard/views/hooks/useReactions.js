import { useState, useEffect, useCallback } from 'react';
import { db } from '@/services/firebase'; // Using the '@' alias for a clean import
import { collection, doc, onSnapshot, query, where, getDocs, deleteDoc, setDoc } from 'firebase/firestore';

export const useReactions = (announcements, currentUserId, showToast) => {
    const [postReactions, setPostReactions] = useState({});
    const [usersMap, setUsersMap] = useState({});

    const fetchUsersData = useCallback(async (userIds) => {
        const usersToFetch = [...new Set(userIds.filter(id => id && !usersMap[id]))];
        if (usersToFetch.length === 0) return;

        try {
            const userBatches = [];
            for (let i = 0; i < usersToFetch.length; i += 30) {
                userBatches.push(usersToFetch.slice(i, i + 30));
            }

            const newUsersData = {};
            for (const batch of userBatches) {
                const usersQuery = query(collection(db, 'users'), where('__name__', 'in', batch));
                const querySnapshot = await getDocs(usersQuery);
                querySnapshot.forEach(doc => {
                    newUsersData[doc.id] = { ...doc.data(), id: doc.id };
                });
            }
            
            setUsersMap(prev => ({ ...prev, ...newUsersData }));
        } catch (error) {
            console.error("Error fetching users data:", error);
        }
    }, [usersMap]);

    useEffect(() => {
        if (!Array.isArray(announcements) || announcements.length === 0) {
            setPostReactions({});
            return;
        }

        const announcementIds = announcements.map(a => a.id).filter(Boolean);
        if (announcementIds.length === 0) return;

        const allUserIds = new Set(announcements.map(a => a.teacherId).filter(Boolean));
        const reactionsQuery = query(collection(db, 'reactions'), where('announcementId', 'in', announcementIds));

        const unsubscribe = onSnapshot(reactionsQuery, (snapshot) => {
            const newReactionsByAnnouncement = announcementIds.reduce((acc, id) => ({...acc, [id]: {}}), {});

            snapshot.forEach(doc => {
                const reaction = doc.data();
                if (newReactionsByAnnouncement[reaction.announcementId]) {
                    newReactionsByAnnouncement[reaction.announcementId][reaction.userId] = reaction.reactionType;
                    allUserIds.add(reaction.userId);
                }
            });

            setPostReactions(newReactionsByAnnouncement);
            fetchUsersData(Array.from(allUserIds));
        }, (error) => {
            console.error("Error fetching reactions:", error);
        });

        return () => unsubscribe();
    }, [announcements, fetchUsersData]);

    const handleTogglePostReaction = useCallback(async (announcementId, reactionType) => {
        if (!currentUserId || !announcementId) {
            showToast("User not logged in or announcement ID missing.", "error");
            return;
        }

        const reactionDocId = `${currentUserId}_${announcementId}`;
        const reactionRef = doc(db, 'reactions', reactionDocId);
        const existingReactionType = postReactions[announcementId]?.[currentUserId];

        try {
            if (existingReactionType === reactionType) {
                await deleteDoc(reactionRef);
                showToast(`Your ${reactionType} reaction has been removed.`, "info");
            } else {
                await setDoc(reactionRef, {
                    announcementId,
                    userId: currentUserId,
                    reactionType,
                    timestamp: new Date()
                });
                showToast(`You reacted with ${reactionType}!`, "success");
            }
        } catch (error) { // <-- CORRECTED BLOCK
            console.error("Error toggling post reaction:", error);
            showToast("Failed to update reaction.", "error");
        }
    }, [currentUserId, postReactions, showToast]);

    return { postReactions, usersMap, handleTogglePostReaction };
};