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
    }, [showToast]); // showToast is a stable function, so this effect runs once

    // CRUD operations for the schedule
    const handleAddScheduleActivity = async (newActivity) => {
        try {
            await addDoc(scheduleCollectionRef, newActivity);
            // The onSnapshot listener will automatically update the state
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

    // Memoized calculation to get activities for the modal (current and future months)
    const filteredScheduleActivitiesForDisplay = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        return scheduleActivities.filter(activity => {
            const activityEndDate = new Date(activity.endDate);
            const activityEndMonth = activityEndDate.getMonth();
            const activityEndYear = activityEndDate.getFullYear();

            if (activityEndYear > currentYear) return true;
            if (activityEndYear === currentYear && activityEndMonth >= currentMonth) return true;
            
            return false;
        });
    }, [scheduleActivities]);

    // Memoized calculation to get today's upcoming activities for the header
    const todayActivities = useMemo(() => {
        const now = new Date();
        const todayFormatted = now.toISOString().split('T')[0];

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
                    console.error("Error parsing activity time, defaulting to show:", activity.time, e);
                    return true;
                }
            }
            return true;
        }).sort((a, b) => { // Sort by time
            if (a.time === 'N/A' || !a.time) return -1;
            if (b.time === 'N/A' || !b.time) return 1;
            const timeA = new Date(`1970-01-01T${a.time.replace(' ', '')}`).getTime();
            const timeB = new Date(`1970-01-01T${b.time.replace(' ', '')}`).getTime();
            return timeA - timeB;
        });
    }, [scheduleActivities]);
    
    // Effect to cycle through today's activities every 5 seconds
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