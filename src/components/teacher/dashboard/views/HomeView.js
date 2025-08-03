import React, { useState, useEffect } from 'react';
import { AcademicCapIcon, PencilSquareIcon, TrashIcon, MegaphoneIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';
import CreateAnnouncement from '../widgets/CreateAnnouncement';
import GradientStatCard from '../widgets/GradientStatCard';
import InspirationCard from '../widgets/InspirationCard';
import ClockWidget from '../widgets/ClockWidget';
import ScheduleModal from '../widgets/ScheduleModal';

// CORRECTED: Import Firestore functions and db instance from the specified path
import { db } from '../../../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const HomeView = ({
    userProfile,
    activeClasses,
    teacherAnnouncements,
    handleCreateAnnouncement,
    editingAnnId,
    editingAnnText,
    setEditingAnnText,
    handleStartEditAnn,
    handleUpdateTeacherAnn,
    setEditingAnnId,
    handleDeleteTeacherAnn,
}) => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleActivities, setScheduleActivities] = useState([]); // This will store ALL schedules from Firestore
    const scheduleCollectionRef = collection(db, 'schedules'); // Reference to your 'schedules' collection in Firestore

    // State for cycling through today's activities
    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

    // Fetch schedules from Firestore on component mount
    useEffect(() => {
        const getSchedules = async () => {
            try {
                const data = await getDocs(scheduleCollectionRef);
                // Map the Firestore documents to your component's state format
                setScheduleActivities(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
            } catch (error) {
                console.error("Error fetching schedules:", error);
                // Handle error (e.g., show an error message to the user)
            }
        };
        getSchedules();
    }, []); // Empty dependency array means this effect runs once on mount

    const handleAddScheduleActivity = async (newActivity) => {
        try {
            // Add a new document to the 'schedules' collection
            const docRef = await addDoc(scheduleCollectionRef, newActivity);
            // Update local state with the new activity including its Firestore generated ID
            setScheduleActivities(prev => [...prev, { ...newActivity, id: docRef.id }]);
        } catch (error) {
            console.error("Error adding schedule activity:", error);
            // Handle error
        }
    };

    const handleUpdateScheduleActivity = async (updatedActivity) => {
        try {
            // Create a document reference for the specific activity
            const activityDocRef = doc(db, 'schedules', updatedActivity.id);
            // Exclude 'id' from the data sent to Firestore as it's part of the document reference
            const { id, ...dataToUpdate } = updatedActivity;
            await updateDoc(activityDocRef, dataToUpdate);
            // Update local state
            setScheduleActivities(prev =>
                prev.map(activity => (activity.id === updatedActivity.id ? updatedActivity : activity))
            );
        } catch (error) {
            console.error("Error updating schedule activity:", error);
            // Handle error
        }
    };

    const handleDeleteScheduleActivity = async (id) => {
        try {
            // Create a document reference for the specific activity
            const activityDocRef = doc(db, 'schedules', id);
            await deleteDoc(activityDocRef);
            // Update local state by filtering out the deleted activity
            setScheduleActivities(prev => prev.filter(activity => activity.id !== id));
        } catch (error) {
            console.error("Error deleting schedule activity:", error);
            // Handle error
        }
    };

    // --- Filtering Logic for Displaying Schedules in Modal ---
    const currentMonth = new Date().getMonth(); // 0-11 for Jan-Dec
    const currentYear = new Date().getFullYear();

    const filteredScheduleActivitiesForDisplay = scheduleActivities.filter(activity => {
        const activityEndDate = new Date(activity.endDate); // Assuming endDate is "YYYY-MM-DD"
        const activityEndMonth = activityEndDate.getMonth();
        const activityEndYear = activityEndDate.getFullYear();

        // Display activities that end in the current year AND current/future month,
        // OR activities that end in any future year.
        if (activityEndYear > currentYear) {
            return true; // Activity ends in a future year, always display
        }
        if (activityEndYear === currentYear && activityEndMonth >= currentMonth) {
            return true; // Activity ends in the current year and current or future month, display
        }
        return false; // Activity ends in a past month/year, do not display
    });
    // --- End Filtering Logic ---

    // --- Logic for Today's Activities Notice ---
    const now = new Date();
    const todayFormatted = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const todayActivities = scheduleActivities.filter(activity => {
        // First, check if the activity is scheduled for today
        if (activity.startDate !== todayFormatted) {
            return false;
        }

        // If it's today, now check the time if available
        if (activity.time && activity.time !== 'N/A') {
            try {
                // Construct a Date object for the activity's scheduled time today
                let [timePart, ampm] = activity.time.split(' ');
                let [hours, minutes] = timePart.split(':').map(Number);

                if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) {
                    hours = 0; // 12 AM (midnight) is 00 hours
                }

                const activityDateTime = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    hours,
                    minutes
                );

                // Filter out if the activity's scheduled time is in the past
                if (activityDateTime < now) {
                    return false;
                }
            } catch (e) {
                console.error("Error parsing activity time, displaying by default:", activity.time, e);
                // If time parsing fails, assume it should be displayed (or handle error as preferred)
            }
        }
        return true; // Keep the activity if it's today and its time hasn't passed (or no time specified/parsed)
    });

    // Effect to cycle through today's activities
    useEffect(() => {
        if (todayActivities.length > 1) {
            const interval = setInterval(() => {
                setCurrentActivityIndex((prevIndex) =>
                    (prevIndex + 1) % todayActivities.length
                );
            }, 5000); // Change activity every 5 seconds
            return () => clearInterval(interval); // Cleanup on unmount
        } else {
            setCurrentActivityIndex(0); // Reset to first activity (or 0 if none)
        }
    }, [todayActivities.length]); // Re-run effect if number of today's activities changes
    // --- END Logic for Today's Activities Notice ---


    return (
        <div className="relative min-h-screen p-4 md:p-8 bg-gray-100 text-gray-800 font-sans overflow-hidden rounded-3xl">
            {/* Dynamic Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow"></div>
                <div className="absolute bottom-20 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow-reverse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-spin-slow animation-delay-4000"></div>
            </div>

            {/* Main Content Container with a modern, clean feel */}
            <div className="relative z-10 space-y-12">
                {/* Header with a subtle animated gradient */}
                <div className="relative p-6 md:p-8 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-down">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-transparent to-indigo-600/10 opacity-50 animate-pulse-light"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">
                                Hey there, {userProfile?.firstName}!
                            </h1>
                            <p className="text-lg text-gray-500 mt-2">SRCS LMS dashboard at a glance.</p>
                        </div>

                        {/* Display Today's Activities Notice */}
                        {todayActivities.length > 0 && (
                            <div className="mt-6 md:mt-0 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md shadow-inner max-w-md ml-auto">
                                <p className="font-semibold text-lg flex items-center">
                                    <CalendarDaysIcon className="w-6 h-6 mr-2" />
                                    Upcoming Today:
                                </p>
                                <div className="mt-2" style={{ minHeight: '2rem' }}> {/* minHeight to prevent layout shifts */}
                                    {todayActivities[currentActivityIndex] && (
                                        // Key forces re-render, transition-opacity provides the fade
                                        <p key={todayActivities[currentActivityIndex].id} className="text-base transition-opacity duration-1000 ease-in-out opacity-100">
                                            <span className="font-medium">{todayActivities[currentActivityIndex].title}</span>
                                            {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && ` at ${todayActivities[currentActivityIndex].time}`}
                                            {todayActivities[currentActivityIndex].inCharge && ` (In-charge: ${todayActivities[currentActivityIndex].inCharge})`}
                                        </p>
                                    )}
                                </div>
                                <p className="text-sm mt-3 text-yellow-700">Don't miss out on these important activities!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Stat & Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                    <GradientStatCard
                        title="Active Classes"
                        value={activeClasses.length}
                        icon={<AcademicCapIcon />}
                        gradient="from-green-500 to-emerald-600"
                        className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in"
                    />
                    <InspirationCard className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-300" />
                    <ClockWidget className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-600" />
                    {/* Upcoming Deadlines Card - Now Clickable */}
                    <div
                        className="bg-white p-6 rounded-3xl shadow-xl flex items-center justify-center flex-col text-center cursor-pointer transition transform hover:scale-105 duration-300 ease-in-out animate-fade-in animation-delay-900"
                        onClick={() => setIsScheduleModalOpen(true)} // Open the modal on click
                    >
                        <CalendarDaysIcon className="h-10 w-10 text-rose-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-lg">Schedule of Activities</h3>
                        <p className="text-sm text-gray-500 mt-1">Check out what's due soon.</p>
                    </div>
                </div>

                {/* Announcements Section - Redesigned with a split layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Announcement Column */}
                    <div className="lg:col-span-1 p-6 bg-white rounded-3xl shadow-2xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">New Announcement</h2>
                        <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                    </div>

                    {/* Recent Announcements Column */}
                    <div className="lg:col-span-2 p-6 bg-white rounded-3xl shadow-2xl animate-fade-in-up animation-delay-300">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">Recent Announcements</h2>
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                                const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                                return (
                                    <div key={post.id} className="relative p-6 rounded-3xl border border-gray-200 bg-white shadow-lg group transition-all duration-300 hover:shadow-2xl hover:border-blue-500 hover:bg-blue-50">
                                        {editingAnnId === post.id ? (
                                            <>
                                                <textarea
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800"
                                                    rows="3"
                                                    value={editingAnnText}
                                                    onChange={(e) => setEditingAnnText(e.target.value)}
                                                />
                                                <div className="flex justify-end gap-2 mt-3">
                                                    <button className="btn-secondary-light" onClick={() => setEditingAnnId(null)}>Cancel</button>
                                                    <button className="btn-primary-glow-light" onClick={handleUpdateTeacherAnn}>Save</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {canModify && (
                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleStartEditAnn(post)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Edit">
                                                            <PencilSquareIcon className="w-4 h-4 text-gray-500" />
                                                        </button>
                                                        <button onClick={() => handleDeleteTeacherAnn(post.id)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Delete">
                                                            <TrashIcon className="w-4 h-4 text-rose-500" />
                                                        </button>
                                                    </div>
                                                )}
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-shrink-0 mt-1">
                                                        <MegaphoneIcon className="w-8 h-8 text-blue-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-gray-700 whitespace-pre-wrap pr-10 leading-relaxed">{post.content}</p>
                                                        <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                                            <span>From: <span className="font-semibold text-gray-500">{post.teacherName}</span></span>
                                                            <span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                                    <MegaphoneIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-lg font-semibold">No new announcements for teachers.</p>
                                    <p className="text-sm">Be the first to post an update!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Modal - now receives filtered activities */}
            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                userRole={userProfile?.role}
                scheduleActivities={filteredScheduleActivitiesForDisplay}
                onAddActivity={handleAddScheduleActivity}
                onUpdateActivity={handleUpdateScheduleActivity}
                onDeleteActivity={handleDeleteScheduleActivity}
            />

            {/* Custom CSS for the light theme and animations */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #e5e7eb; /* Lighter gray for the track */
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #d1d5db; /* Slightly darker gray for the thumb */
                    border-radius: 10px;
                    border: 2px solid #e5e7eb;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #9ca3af;
                }

                .animate-fade-in {
                    animation: fadeIn 1s ease-out;
                }
                .animate-fade-in-down {
                    animation: fadeInDown 0.8s ease-out;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out;
                }
                .animation-delay-300 {
                    animation-delay: 0.3s;
                }
                .animation-delay-600 {
                    animation-delay: 0.6s;
                }
                .animation-delay-900 {
                    animation-delay: 0.9s;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-spin-slow {
                    animation: spin 30s linear infinite;
                }
                .animate-spin-slow-reverse {
                    animation: spin-reverse 30s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }

                .animate-pulse-light {
                    animation: pulseLight 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulseLight {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.5; }
                }

                /* Removed .animate-pulse-fade-in keyframes as requested */


                .btn-primary-glow-light {
                    background-color: #f43f5e;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 0px 10px rgba(244, 63, 94, 0.3);
                }
                .btn-primary-glow-light:hover {
                    background-color: #e11d48;
                    box-shadow: 0 0px 15px rgba(244, 63, 94, 0.6);
                }

                .btn-secondary-light {
                    background-color: #e5e7eb;
                    color: #4b5563;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .btn-secondary-light:hover {
                    background-color: #d1d5db;
                }
            `}</style>
        </div>
    );
};

export default HomeView;