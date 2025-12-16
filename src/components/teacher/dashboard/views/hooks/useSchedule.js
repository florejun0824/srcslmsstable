import { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../../services/firebase'; // Adjust path if needed
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export const useSchedule = (showToast) => {
    const [scheduleActivities, setScheduleActivities] = useState([]);
    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
    const scheduleCollectionRef = collection(db, 'schedules');

    // Real-time listener for schedule updates from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(scheduleCollectionRef, (snapshot) => {
            const fetchedSchedules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setScheduleActivities(fetchedSchedules);
        }, (error) => {
            console.error("Error listening to schedules:", error);
            if (showToast) {
                showToast("Failed to load schedules in real-time.", "error");
            }
        });

        return () => unsubscribe();
    }, [showToast]);

    // CRUD operations
    const handleAddScheduleActivity = async (newActivity) => {
        try {
            await addDoc(scheduleCollectionRef, newActivity);
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
        // 1. Get "Today" at the very beginning of the day (00:00:00) based on system time (PH Time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return scheduleActivities.filter(activity => {
            if (!activity.endDate) return false;

            // 2. Parse the HTML date string (YYYY-MM-DD) explicitly to Local Time
            // Direct new Date("2025-12-15") often defaults to UTC, which causes timezone issues.
            const [y, m, d] = activity.endDate.split('-').map(Number);
            
            // Create a date object for the End Date (Month is 0-indexed in JS)
            const activityEndDate = new Date(y, m - 1, d);
            
            // 3. Set the End Date to the very end of that day (23:59:59)
            // This ensures if today is Dec 15, and end date is Dec 15, it is still shown.
            activityEndDate.setHours(23, 59, 59, 999);

            // 4. Compare: Check if the end date is in the future or is today
            return activityEndDate >= today;
        });
    }, [scheduleActivities]);

    // Memoized calculation to get today's upcoming activities for the header
    const todayActivities = useMemo(() => {
        const now = new Date();
        // Format to YYYY-MM-DD using local time explicitly
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);
        const todayFormatted = localISOTime.split('T')[0];

        return scheduleActivities.filter(activity => {
            // Check Date Range
            const isActivityActiveTodayByDate = todayFormatted >= activity.startDate && todayFormatted <= activity.endDate;
            if (!isActivityActiveTodayByDate) return false;

            // Check Time (if applicable)
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
            // Simple string sort for time is risky, but works if format is consistent HH:MM AM/PM
            // Ideally convert to minutes for sorting, but keeping existing logic structure
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