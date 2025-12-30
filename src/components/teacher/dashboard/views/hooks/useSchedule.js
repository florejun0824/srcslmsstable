// src/components/teacher/dashboard/views/hooks/useSchedule.js

import { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../../services/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore'; 

export const useSchedule = (showToast, schoolId) => {
    const [scheduleActivities, setScheduleActivities] = useState([]);
    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
    const scheduleCollectionRef = collection(db, 'schedules');

    // Real-time listener for schedule updates from Firestore
    useEffect(() => {
        // ✅ Legacy Support: Default to 'srcs_main' if no schoolId provided
        const targetSchoolId = schoolId || 'srcs_main';

        // ✅ Filter by School ID
        const q = query(scheduleCollectionRef, where("schoolId", "==", targetSchoolId));

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
    }, [showToast, schoolId]); 

    // CRUD operations
    const handleAddScheduleActivity = async (newActivity) => {
        try {
            // ✅ Enforce School ID on Creation
            await addDoc(scheduleCollectionRef, { 
                ...newActivity, 
                schoolId: schoolId || 'srcs_main' 
            });
            if (showToast) showToast("Activity added to schedule.", "success");
        } catch (error) {
            console.error("Error adding schedule activity:", error);
            if (showToast) showToast("Failed to add activity.", "error");
        }
    };

    const handleUpdateScheduleActivity = async (updatedActivity) => {
        try {
            const activityDocRef = doc(db, 'schedules', updatedActivity.id);
            const { id, ...dataToUpdate } = updatedActivity;
            await updateDoc(activityDocRef, dataToUpdate);
            if (showToast) showToast("Activity updated.", "success");
        } catch (error) {
            console.error("Error updating schedule activity:", error);
            if (showToast) showToast("Failed to update activity.", "error");
        }
    };

    const handleDeleteScheduleActivity = async (id) => {
        try {
            const activityDocRef = doc(db, 'schedules', id);
            await deleteDoc(activityDocRef);
            if (showToast) showToast("Activity deleted.", "info");
        }
        catch (error) {
            console.error("Error deleting schedule activity:", error);
            if (showToast) showToast("Failed to delete activity.", "error");
        }
    };

    // Filter for valid dates (Future or Today)
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

    // Get Today's Activities for the Header Widget
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
    
    // Rotate through today's activities
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