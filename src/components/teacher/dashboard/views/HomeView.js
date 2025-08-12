import React, { useState, useEffect, useRef } from 'react';
// Import icons from react-icons library
import {
    FaGraduationCap,
    FaPencilAlt,
    FaTrash,
    FaBullhorn,
    FaCalendarAlt,
    FaClock,
    FaComment,
    FaThumbsUp,
    FaHeart,
    FaLaugh,
    FaGrinStars,
    FaFrown,
    FaAngry, // Added FaAngry
    FaHandHoldingHeart, // Added FaHandHoldingHeart for 'care'
} from 'react-icons/fa';
import {
    MdThumbsUp,
    MdFavorite,
    MdSentimentSatisfiedAlt,
    MdEmojiEmotions,
    MdSentimentDissatisfied,
} from 'react-icons/md';

import CreateAnnouncement from '../widgets/CreateAnnouncement';
import GradientStatCard from '../widgets/GradientStatCard';
import InspirationCard from '../widgets/InspirationCard';
import ClockWidget from '../widgets/ClockWidget';
import ScheduleModal from '../widgets/ScheduleModal';
import AnnouncementModal from '../widgets/AnnouncementModal';
import ReactionsBreakdownModal from '../widgets/ReactionsBreakdownModal'; // Import the new modal

import { db } from '../../../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

// Define available reaction icons with more vibrant colors
const reactionIconsHomeView = {
    like: { outline: FaThumbsUp, solid: FaThumbsUp, color: 'text-blue-500' },
    heart: { outline: FaHeart, solid: FaHeart, color: 'text-red-600' },
    laugh: { outline: FaLaugh, solid: FaLaugh, color: 'text-yellow-500' },
    wow: { outline: FaGrinStars, solid: FaGrinStars, color: 'text-purple-500' },
    sad: { outline: FaFrown, solid: FaFrown, color: 'text-orange-500' },
    angry: { outline: FaAngry, solid: FaAngry, color: 'text-red-700' }, // Added Angry reaction
    care: { outline: FaHandHoldingHeart, solid: FaHandHoldingHeart, color: 'text-pink-500' }, // Added Care reaction
};

// Define a set of appealing gradient colors for profile pictures (consistent with AnnouncementModal)
const gradientColors = [
    'from-blue-400 to-indigo-500',
    'from-green-400 to-teal-500',
    'from-purple-400 to-pink-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-rose-500',
    'from-indigo-400 to-purple-500',
    'from-teal-400 to-cyan-500',
    'from-pink-400 to-red-500',
];

// Function to get a consistent gradient based on user ID (consistent with AnnouncementModal)
const getUserGradient = (userId) => {
    if (!userId) return gradientColors[0]; // Default if no userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % gradientColors.length);
    return gradientColors[index];
};

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300; // Max characters before truncation for announcements

const HomeView = ({
    userProfile,
    activeClasses,
    teacherAnnouncements, // This prop now needs to be observed for changes to update reactions
    handleCreateAnnouncement,
    editingAnnId,
    editingAnnText,
    setEditingAnnText,
    handleStartEditAnn,
    handleUpdateTeacherAnn,
    setEditingAnnId,
    handleDeleteTeacherAnn, // Ensure this prop is correctly passed from parent if used
}) => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleActivities, setScheduleActivities] = useState([]);
    const scheduleCollectionRef = collection(db, 'schedules');

    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // New states for HomeView reactions
    const [homeViewPostReactions, setHomeViewPostReactions] = useState({}); // {announcementId: {userId: reactionType}}
    const [homeViewUserNamesMap, setHomeViewUserNamesMap] = useState({}); // {userId: 'FirstName LastName'}
    const [hoveredHomeViewReactionData, setHoveredHomeViewReactionData] = useState(null); // { type: 'post' | 'options', id: announcementId, users?: string[] }
    const homeViewTimeoutRef = useRef(null);
    const hoverReactionOptionsRef = useRef(null); // Ref for the reaction options popup

    // States for ReactionsBreakdownModal
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

    // State for managing expanded announcements (See More/Show Less)
    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});

    // Function to toggle announcement expansion
    const toggleAnnouncementExpansion = (announcementId) => {
        setExpandedAnnouncements(prev => ({
            ...prev,
            [announcementId]: !prev[announcementId]
        }));
    };


    const currentUserId = userProfile?.id;
    const currentUserName = `${userProfile?.firstName} ${userProfile?.lastName}`;


    // Helper to fetch user names (re-used from AnnouncementModal logic)
    const fetchUserNames = async (userIds, db, userProfile, currentUserName, setUserNamesMap) => {
        const names = {};
        if (userIds.length === 0) return;

        const uniqueUserIds = [...new Set(userIds)];

        // Include current user's name directly if available
        if (userProfile?.id && currentUserName) {
            names[userProfile.id] = currentUserName;
        }

        const promises = uniqueUserIds.map(async (uid) => {
            // Skip fetching if already have the name (e.g., current user)
            if (names[uid]) return;

            try {
                const userDocRef = doc(db, 'users', uid); // Assuming a 'users' collection with user data
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    names[uid] = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || `User ID: ${uid}`;
                } else {
                    names[uid] = `Unknown User (${uid.substring(0, 5)}...)`;
                }
            } catch (error) {
                console.warn(`Could not fetch user data for ID ${uid}:`, error);
                names[uid] = `Error User (${uid.substring(0, 5)}...)`;
            }
        });

        await Promise.all(promises);
        setUserNamesMap(prev => ({ ...prev, ...names }));
    };

    // Effect to fetch initial schedules
    useEffect(() => {
        const getSchedules = async () => {
            try {
                const data = await getDocs(scheduleCollectionRef);
                setScheduleActivities(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
            } catch (error) {
                console.error("Error fetching schedules:", error);
            }
        };
        getSchedules();
    }, []);

    // Effect to listen for reactions on announcements in HomeView
    useEffect(() => {
        const unsubscribeFunctions = [];
        const allUserIds = new Set();

        teacherAnnouncements.forEach(announcement => {
            if (announcement.id) {
                // Add the teacher's ID from the announcement itself
                if (announcement.teacherId) {
                    allUserIds.add(announcement.teacherId);
                }

                const postReactionsCollectionRef = collection(db, `teacherAnnouncements/${announcement.id}/reactions`);
                const unsubscribe = onSnapshot(postReactionsCollectionRef, (snapshot) => {
                    const fetchedPostReactions = {};
                    snapshot.docs.forEach(doc => {
                        fetchedPostReactions[doc.id] = doc.data().reactionType;
                        allUserIds.add(doc.id); // Add reactor's ID
                    });
                    setHomeViewPostReactions(prev => ({
                        ...prev,
                        [announcement.id]: fetchedPostReactions
                    }));

                    // Update user names map when reactions change
                    fetchUserNames([...allUserIds], db, userProfile, currentUserName, setHomeViewUserNamesMap); // Corrected this line

                }, (error) => {
                    console.error(`Error fetching reactions for announcement ${announcement.id}:`, error);
                });
                unsubscribeFunctions.push(unsubscribe);
            }
        });

        return () => {
            unsubscribeFunctions.forEach(unsub => unsub());
        };
    }, [teacherAnnouncements.length, db, userProfile, currentUserName]);


    const handleAddScheduleActivity = async (newActivity) => {
        try {
            const docRef = await addDoc(scheduleCollectionRef, newActivity);
            setScheduleActivities(prev => [...prev, { ...newActivity, id: docRef.id }]);
        } catch (error) {
            console.error("Error adding schedule activity:", error);
        }
    };

    const handleUpdateScheduleActivity = async (updatedActivity) => {
        try {
            const activityDocRef = doc(db, 'schedules', updatedActivity.id);
            const { id, ...dataToUpdate } = updatedActivity;
            await updateDoc(activityDocRef, dataToUpdate);
            setScheduleActivities(prev =>
                prev.map(activity => (activity.id === updatedActivity.id ? updatedActivity : activity))
            );
        } catch (error) {
            console.error("Error updating schedule activity:", error);
        }
    };

    const handleDeleteScheduleActivity = async (id) => {
        try {
            const activityDocRef = doc(db, 'schedules', id);
            await deleteDoc(activityDocRef);
            setScheduleActivities(prev => prev.filter(activity => activity.id !== id));
        }
        catch (error) {
            console.error("Error deleting schedule activity:", error);
        }
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const filteredScheduleActivitiesForDisplay = scheduleActivities.filter(activity => {
        const activityEndDate = new Date(activity.endDate);
        const activityEndMonth = activityEndDate.getMonth();
        const activityEndYear = activityEndDate.getFullYear();

        if (activityEndYear > currentYear) {
            return true;
        }
        if (activityEndYear === currentYear && activityEndMonth >= currentMonth) {
            return true;
        }
        return false;
    });

    const now = new Date();
    const todayFormatted = now.toISOString().split('T')[0];

    const todayActivities = scheduleActivities.filter(activity => {
        if (activity.startDate !== todayFormatted) {
            return false;
        }
        if (activity.time && activity.time !== 'N/A') {
            try {
                let [timePart, ampm] = activity.time.split(' ');
                let [hours, minutes] = timePart.split(':').map(Number);

                if (ampm && ampm.toUpperCase() === 'PM' && hours !== 12) {
                    hours += 12;
                } else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) {
                    hours = 0;
                }

                const activityDateTime = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    hours,
                    minutes
                );

                if (activityDateTime < now) {
                    return false;
                }
            } catch (e) {
                console.error("Error parsing activity time, displaying by default:", activity.time, e);
            }
        }
        return true;
    });

    useEffect(() => {
        if (todayActivities.length > 1) {
            const interval = setInterval(() => {
                setCurrentActivityIndex((prevIndex) =>
                    (prevIndex + 1) % todayActivities.length
                );
            }, 5000);
            return () => clearInterval(interval);
        } else {
            setCurrentActivityIndex(0);
        }
    }, [todayActivities.length]);

    const openAnnouncementModal = (announcement) => {
        setSelectedAnnouncement(announcement);
        setIsAnnouncementModalOpen(true);
    };

    const closeAnnouncementModal = () => {
        setIsAnnouncementModalOpen(false);
        setSelectedAnnouncement(null);
    };

    // Handler to open ReactionsBreakdownModal
    const openReactionsBreakdownModal = (reactions, userNames) => {
        setReactionsForBreakdownModal(reactions);
        setIsReactionsBreakdownModalOpen(true);
    };

    const closeReactionsBreakdownModal = () => {
        setIsReactionsBreakdownModalOpen(false);
        setReactionsForBreakdownModal(null);
    };


    // HomeView specific reaction handling
    const handleTogglePostReactionHomeView = async (announcementId, reactionType) => {
        if (!currentUserId || !announcementId) return;

        const postReactionsCollectionRef = collection(db, `teacherAnnouncements/${announcementId}/reactions`);
        const userReactionRef = doc(postReactionsCollectionRef, currentUserId);
        const existingReactionType = homeViewPostReactions[announcementId]?.[currentUserId];

        try {
            if (existingReactionType === reactionType) {
                await deleteDoc(userReactionRef);
            } else {
                await setDoc(userReactionRef, { userId: currentUserId, reactionType: reactionType });
            }
        } catch (error) {
            console.error("Error toggling post reaction in HomeView:", error);
        }
    };

    // Formats reactions count for HomeView, including hover effect
    const formatReactionCountHomeView = (reactions, announcementId) => {
        // Ensure reactions is an object, even if undefined or null
        const safeReactions = reactions || {};
        const counts = {};
        Object.values(safeReactions).forEach(type => {
            counts[type] = (counts[type] || 0) + 1;
        });
        const sortedReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);

        if (Object.keys(safeReactions).length === 0) return null; // Use safeReactions length here

        const allReactingUsers = Object.keys(safeReactions).map(userId => homeViewUserNamesMap[userId] || `User ID: ${userId.substring(0, 5)}...`);

        const handleMouseEnter = (e) => {
            clearTimeout(homeViewTimeoutRef.current);
            // We now store only necessary data for the popup's state
            setHoveredHomeViewReactionData({
                type: 'post',
                id: announcementId,
                users: allReactingUsers, // Pass users list directly here as well for popup rendering
            });
        };

        const handleMouseLeave = () => {
            homeViewTimeoutRef.current = setTimeout(() => {
                setHoveredHomeViewReactionData(null);
            }, 300);
        };

        const handlePopupMouseEnter = () => {
            clearTimeout(homeViewTimeoutRef.current);
        };

        const handlePopupMouseLeave = () => {
            setHoveredHomeViewReactionData(null);
        };

        // Determine visibility based on state and type
        const isVisible = hoveredHomeViewReactionData && hoveredHomeViewReactionData.id === announcementId && hoveredHomeViewReactionData.type === 'post';

        return (
            <div
                className="flex items-center space-x-1 cursor-pointer relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the announcement modal immediately
                    openReactionsBreakdownModal(reactions, homeViewUserNamesMap);
                }}
            >
                {sortedReactions.map(([type]) => {
                    const Icon = reactionIconsHomeView[type]?.solid;
                    return Icon ? <Icon key={type} className={`h-4 w-4 ${reactionIconsHomeView[type]?.color}`} /> : null;
                })}
                <span className="text-xs text-gray-500 font-medium">{Object.keys(safeReactions).length}</span> {/* Use safeReactions here */}

                {/* Reaction Hover Popup for HomeView */}
                <div
                    className="reaction-hover-popup-homeview bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg absolute z-50 transform -translate-x-1/2"
                    style={{
                        bottom: 'calc(100% + 8px)', // Position 8px above the parent div
                        left: '50%', // Center horizontally
                        opacity: isVisible ? 1 : 0,
                        pointerEvents: isVisible ? 'auto' : 'none'
                    }}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                >
                    {(hoveredHomeViewReactionData?.users || []).length > 0 ? (
                        hoveredHomeViewReactionData.users.map((name, index) => (
                            <div key={index}>{name}</div>
                        ))
                    ) : (
                        <div>No reactions yet.</div>
                    )}
                </div>
            </div>
        );
    };

    // Handle reaction options hover for HomeView
    const handleReactionOptionsMouseEnter = (e, announcementId) => {
        clearTimeout(homeViewTimeoutRef.current); // Clear timeout for hiding main popup
        // Set hoveredHomeViewReactionData to show options popup
        setHoveredHomeViewReactionData({
            type: 'options', // Differentiate this popup
            id: announcementId,
        });
    };

    const handleReactionOptionsMouseLeave = () => {
        homeViewTimeoutRef.current = setTimeout(() => {
            setHoveredHomeViewReactionData(null);
        }, 300);
    };

    const handleReactionOptionClick = (announcementId, reactionType) => {
        handleTogglePostReactionHomeView(announcementId, reactionType);
        setHoveredHomeViewReactionData(null); // Hide options after selection
    };


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
                    <div className="relative z-10 flex flex-col md:flex-row md::items-start md:justify-between">
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
                                    <FaCalendarAlt className="w-6 h-6 mr-2" />
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

                {/* Main Stat & Info Grid - REORDERED */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                    {/* 1. Date and Time Card */}
                    <ClockWidget className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-600" />

                    {/* 2. Inspiration Card */}
                    <InspirationCard className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-300" />

                    {/* 3. Schedule of Activities Card */}
                    <div
                        className="bg-white p-6 rounded-3xl shadow-xl flex items-center justify-center flex-col text-center cursor-pointer transition transform hover:scale-105 duration-300 ease-in-out animate-fade-in animation-delay-900"
                        onClick={() => setIsScheduleModalOpen(true)} // Open the modal on click
                    >
                        <FaCalendarAlt className="h-10 w-10 text-rose-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-lg">Schedule of Activities</h3>
                        <p className="text-sm text-gray-500 mt-1">Check out what's due soon.</p>
                    </div>

                    {/* 4. Active Classes Card */}
                    <GradientStatCard
                        title="Active Classes"
                        value={activeClasses.length}
                        icon={<FaGraduationCap />}
                        gradient="from-green-500 to-emerald-600"
                        className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in"
                    />
                </div>

                {/* Announcements Section - Redesigned with a split layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Announcement Column */}
                    <div className="lg:col-span-1 p-6 bg-white rounded-3xl shadow-2xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">New Announcement</h2>
                        <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                    </div>

                    {/* Recent Announcements Column - Facebook News Feed Style */}
                    <div className="lg:col-span-2 space-y-6"> {/* Increased space-y for separation */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Recent Announcements</h2>
                        {teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                            const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                            const postReactionsForThisPost = homeViewPostReactions[post.id] || {};
                            const currentUserReaction = postReactionsForThisPost[currentUserId];
                            const isTruncated = post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;
                            const showFullAnnouncement = expandedAnnouncements[post.id];

                            return (
                                <div
                                    key={post.id}
                                    className="bg-white rounded-3xl shadow-xl p-6 relative group transform transition-transform duration-200 hover:scale-[1.005]" // Subtle hover effect
                                >
                                    {/* Post Header (Profile Picture, Name, Timestamp, Options) */}
                                    <div className="flex items-center mb-4">
                                        <div className={`w-10 h-10 bg-gradient-to-br ${getUserGradient(post.teacherId)} rounded-full flex items-center justify-center text-white font-bold text-lg mr-3 shadow-md`}>
                                            {post.teacherName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{post.teacherName}</p>
                                            <p className="text-xs text-gray-500">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</p>
                                        </div>
                                        {canModify && (
                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button onClick={(e) => { e.stopPropagation(); handleStartEditAnn(post); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Edit Announcement">
                                                    <FaPencilAlt className="w-5 h-5 text-gray-500" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteTeacherAnn(post.id); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Delete Announcement">
                                                    <FaTrash className="w-5 h-5 text-rose-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Announcement Content */}
                                    {editingAnnId === post.id ? (
                                        <>
                                            <textarea
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800 resize-none mb-4"
                                                rows="5"
                                                value={editingAnnText}
                                                onChange={(e) => setEditingAnnText(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button className="btn-secondary-light" onClick={(e) => { e.stopPropagation(); setEditingAnnId(null); }}>Cancel</button>
                                                <button className="btn-primary-glow-light" onClick={(e) => { e.stopPropagation(); handleUpdateTeacherAnn(); }}>Save</button>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap mb-4">
                                            {isTruncated && !showFullAnnouncement
                                                ? post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...'
                                                : post.content}
                                            {isTruncated && (
                                                <button
                                                    onClick={() => toggleAnnouncementExpansion(post.id)}
                                                    className="text-blue-500 hover:underline ml-1"
                                                >
                                                    {showFullAnnouncement ? 'Show Less' : 'See More...'}
                                                </button>
                                            )}
                                        </p>
                                    )}

                                    {/* Reactions Summary & Counts */}
                                    <div className="flex justify-between items-center text-sm text-gray-500 border-b border-gray-200 pb-3 mb-3">
                                        {formatReactionCountHomeView(postReactionsForThisPost, post.id)}
                                        <span className="cursor-pointer hover:underline" onClick={() => openAnnouncementModal(post)}>
                                            {/* Assuming commentsCount property or derived */}
                                            {post.commentsCount || 0} comments
                                        </span>
                                    </div>

                                    {/* Action Buttons (Like/React, Comment) */}
                                    <div className="flex justify-around items-center pt-3">
                                        {/* Like/React Button */}
                                        <div
                                            className="relative reaction-button-group" // This div is the positioning context for the options popup
                                            onMouseEnter={(e) => handleReactionOptionsMouseEnter(e, post.id)}
                                            onMouseLeave={handleReactionOptionsMouseLeave}
                                        >
                                            <button
                                                className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors duration-200
                                                ${currentUserReaction ? `${reactionIconsHomeView[currentUserReaction]?.color} bg-blue-50/50` : 'text-gray-600 hover:bg-gray-100'}`}
                                                onClick={() => handleTogglePostReactionHomeView(post.id, currentUserReaction || 'like')} // Default to 'like' if no reaction
                                            >
                                                {currentUserReaction ? (
                                                    <span className={`h-5 w-5 ${reactionIconsHomeView[currentUserReaction]?.color}`}>
                                                        {React.createElement(reactionIconsHomeView[currentUserReaction]?.solid)}
                                                    </span>
                                                ) : (
                                                    <FaThumbsUp className="h-5 w-5" />
                                                )}
                                                <span className="font-semibold capitalize">
                                                    {currentUserReaction || 'Like'}
                                                </span>
                                            </button>

                                            {/* Reaction Options Popup (visible on hover) */}
                                            {hoveredHomeViewReactionData && hoveredHomeViewReactionData.type === 'options' && hoveredHomeViewReactionData.id === post.id && (
                                                <div
                                                    ref={hoverReactionOptionsRef}
                                                    className="reaction-options-popup bg-white rounded-full shadow-lg p-2 flex space-x-2 absolute z-50" // Changed to absolute
                                                    style={{
                                                        bottom: 'calc(100% + 8px)', // Position 8px above the button
                                                        left: '50%', // Center horizontally
                                                        transform: 'translateX(-50%)', // Adjust for centering
                                                        opacity: 1, // Explicitly set opacity
                                                        pointerEvents: 'auto' // Explicitly set pointer events
                                                    }}
                                                    onMouseEnter={() => clearTimeout(homeViewTimeoutRef.current)} // Keep popup open
                                                    onMouseLeave={handleReactionOptionsMouseLeave}
                                                >
                                                    {Object.entries(reactionIconsHomeView).map(([type, { solid: SolidIcon, color }]) => (
                                                        <button
                                                            key={type}
                                                            className={`p-2 rounded-full hover:scale-125 transition-transform duration-150 ${color} reaction-pop-icon reaction-pop-icon-${type}`}
                                                            onClick={() => handleReactionOptionClick(post.id, type)}
                                                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                                                        >
                                                            <SolidIcon className="h-6 w-6" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Comment Button */}
                                        <button
                                            className="flex items-center space-x-2 py-2 px-4 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                                            onClick={() => openAnnouncementModal(post)}
                                        >
                                            <FaComment className="h-5 w-5" />
                                            <span className="font-semibold">Comment</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                                <FaBullhorn className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <p className="text-lg font-semibold">No new announcements for teachers.</p>
                                <p className="text-sm">Be the first to post an update!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Schedule Modal */}
            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                userRole={userProfile?.role}
                scheduleActivities={filteredScheduleActivitiesForDisplay}
                onAddActivity={handleAddScheduleActivity}
                onUpdateActivity={handleUpdateScheduleActivity}
                onDeleteActivity={handleDeleteScheduleActivity}
            />

            {/* Announcement Details Modal */}
            <AnnouncementModal
                isOpen={isAnnouncementModalOpen}
                onClose={closeAnnouncementModal}
                announcement={selectedAnnouncement}
                userProfile={userProfile}
                db={db}
            />

            {/* Reactions Breakdown Modal */}
            <ReactionsBreakdownModal
                isOpen={isReactionsBreakdownModalOpen}
                onClose={closeReactionsBreakdownModal}
                reactionsData={reactionsForBreakdownModal}
                userNamesMap={homeViewUserNamesMap}
            />

            {/* Custom CSS for the light theme and animations */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #d1d5db;
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

                /* Semi-3D Effect for Reaction Buttons - HomeView & Modal */
                .reaction-icon-btn {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    position: relative;
                    overflow: hidden;
                }
                .reaction-icon-btn:hover {
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    transform: translateY(-2px);
                }
                .reaction-icon-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.15);
                }
                .reaction-icon-btn::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .reaction-icon-btn:hover::before {
                    opacity: 1;
                }

                /* Reaction Hover Popup Styling - HomeView & Modal */
                .reaction-hover-popup, .reaction-hover-popup-homeview {
                    position: absolute; /* Changed to absolute to be relative to its parent */
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    /* opacity and pointer-events are now controlled by inline styles */
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    transform: translateX(-50%); /* Only translate X for centering */
                    white-space: nowrap;
                }

                /* Reaction Options Popup Styling for HomeView - NOW ABSOLUTE */
                .reaction-options-popup {
                    position: absolute; /* Changed to absolute for reliable positioning */
                    background-color: white;
                    border-radius: 9999px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    padding: 4px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    /* Opacity and pointer-events are now controlled via inline style */
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    /* Transform is now applied differently for absolute positioning */
                }

                /* --- NEW STYLES FOR FACEBOOK-LIKE ANIMATIONS --- */

                /* Main Reaction Button Container */
                .reaction-button-group {
                    position: relative;
                }

                /* Reaction Options Popup */
                .reaction-options-popup {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translate(-50%, 10px); /* Start position below the button */
                    opacity: 0;
                    pointer-events: none;
                    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
                    padding: 4px 8px; /* Adjusted padding */
                    border-radius: 50px;
                    background-color: white;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    z-index: 50;
                }

                .reaction-button-group:hover .reaction-options-popup {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translate(-50%, -10px); /* End position above the button */
                }

                /* Individual reaction icons in the popup - NOW WITH COLOR AND 3D-LIKE EFFECT */
                .reaction-pop-icon {
                    transform: scale(1) translateY(0); /* Start scale at 1, no translateY */
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease-out;
                    will-change: transform, box-shadow;
                    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2); /* Add initial subtle shadow */
                    border-radius: 9999px;
                    background-color: white; /* Ensure background is white for shadow to stand out */
                }

                /* Custom delays for the cascading effect */
                .reaction-pop-icon-like { animation-delay: 0s; }
                .reaction-pop-icon-heart { animation-delay: 0.05s; }
                .reaction-pop-icon-laugh { animation-delay: 0.1s; }
                .reaction-pop-icon-wow { animation-delay: 0.15s; }
                .reaction-pop-icon-sad { animation-delay: 0.2s; }
                .reaction-pop-icon-angry { animation-delay: 0.25s; } /* Added delay for angry */
                .reaction-pop-icon-care { animation-delay: 0.3s; } /* Added delay for care */
                
                /* Icon hover effect inside the popup - More pronounced 3D effect */
                .reaction-pop-icon:hover {
                    transform: scale(1.3) translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0,0,0,0.3); /* Stronger shadow on hover */
                    z-index: 51; /* Bring hovered icon to front */
                }
                
                /* Animation for popping in */
                @keyframes popIn {
                    0% { transform: scale(0.5) translateY(10px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                
                /* Remove previous inline-style override to allow CSS to work */
                .reaction-options-popup button {
                    position: relative; /* Add position for pseudo-element */
                    overflow: hidden;
                    background-color: transparent; /* Ensure button background is transparent */
                }

            `}</style>
        </div>
    );
};

export default HomeView;
