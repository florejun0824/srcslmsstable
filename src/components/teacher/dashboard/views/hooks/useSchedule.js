// src/components/teacher/dashboard/views/hooks/useSchedule.js

import { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../../services/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'; // ✅ Added query, where

// ✅ Accept schoolId as the second argument
export const useSchedule = (showToast, schoolId) => {
    const [scheduleActivities, setScheduleActivities] = useState([]);
    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
    const scheduleCollectionRef = collection(db, 'schedules');

    // Real-time listener for schedule updates from Firestore
    useEffect(() => {
        // ✅ Only listen if we have a schoolId
        if (!schoolId) return;

        // ✅ Filter by School ID
        const q = query(scheduleCollectionRef, where("schoolId", "==", schoolId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedSchedules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setScheduleActivities(fetchedSchedules);
        }, (error) => {
            console.error("Error listening to schedules:", error);
            if (showToast) {
                showToast("Failed to load schedules in real-time.", "error");
            }
        });

        return () => unsubscribe();
    }, [showToast, schoolId]); // ✅ Re-run if schoolId changes

    // CRUD operations
    const handleAddScheduleActivity = async (newActivity) => {
        try {
            // ✅ Tag new activity with schoolId
            await addDoc(scheduleCollectionRef, { ...newActivity, schoolId });
        } catch (error) {
            console.error("Error adding schedule activity:", error);
        }
    };

    const handleUpdateScheduleActivity = async (updatedActivity) => {
        try {
            const activityDocRef = doc(db, 'schedules', updatedActivity.id);
            const { id, ...dataToUpdate } = updatedActivity;
            await updateDoc(activityDocRef, dataToUpdate);
        } catch (error) {
            console.error("Error updating schedule activity:", error);
        }
    };

    const handleDeleteScheduleActivity = async (id) => {
        try {
            const activityDocRef = doc(db, 'schedules', id);
            await deleteDoc(activityDocRef);
        }
        catch (error) {
            console.error("Error deleting schedule activity:", error);
        }
    };

    // --- FIXED: Memoized calculation to filter expired dates correctly ---
    const filteredScheduleActivitiesForDisplay = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return scheduleActivities.filter(activity => {
            if (!activity.endDate) return false;
            const [y, m, d] = activity.endDate.split('-').map(Number);
            const activityEndDate = new Date(y, m - 1, d);
            activityEndDate.setHours(23, 59, 59, 999);
            return activityEndDate >= today;
        });
    }, [scheduleActivities]);

    // Memoized calculation to get today's upcoming activities for the header
    const todayActivities = useMemo(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);
        const todayFormatted = localISOTime.split('T')[0];

        return scheduleActivities.filter(activity => {
            const isActivityActiveTodayByDate = todayFormatted >= activity.startDate && todayFormatted <= activity.endDate;
            if (!isActivityActiveTodayByDate) return false;

            if (activity.time && activity.time !== 'N/A') {
                try {
                    let [timePart, ampm] = activity.time.split(' ');
                    let [hours, minutes] = timePart.split(':').map(Number);

                    if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                    else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

                    const activityDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
                    return activityDateTime >= now;
                } catch (e) {
                    console.error("Error parsing activity time:", activity.time, e);
                    return true;
                }
            }
            return true;
        }).sort((a, b) => {
            if (a.time === 'N/A' || !a.time) return -1;
            if (b.time === 'N/A' || !b.time) return 1;
            return a.time.localeCompare(b.time);
        });
    }, [scheduleActivities]);
    
    // Cycle through today's activities
    useEffect(() => {
        if (todayActivities.length > 1) {
            const interval = setInterval(() => {
                setCurrentActivityIndex((prevIndex) => (prevIndex + 1) % todayActivities.length);
            }, 5000);
            return () => clearInterval(interval);
        } else {
            setCurrentActivityIndex(0);
        }
    }, [todayActivities.length]);

    return {
        scheduleActivities: filteredScheduleActivitiesForDisplay,
        todayActivities,
        currentActivity: todayActivities[currentActivityIndex],
        onAddActivity: handleAddScheduleActivity,
        onUpdateActivity: handleUpdateScheduleActivity,
        onDeleteActivity: handleDeleteScheduleActivity,
    };
};