import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    FaAngry,
    FaHandHoldingHeart,
} from 'react-icons/fa';

import CreateAnnouncement from '../widgets/CreateAnnouncement';
import GradientStatCard from '../widgets/GradientStatCard';
import InspirationCard from '../widgets/InspirationCard';
import ClockWidget from '../widgets/ClockWidget';
import ScheduleModal from '../widgets/ScheduleModal';
import AnnouncementModal from '../widgets/AnnouncementModal';
import ReactionsBreakdownModal from '../widgets/ReactionsBreakdownModal';
import UserInitialsAvatar from '../../../../components/common/UserInitialsAvatar';
import AdminBannerEditModal from '../widgets/AdminBannerEditModal'; // New: Import the AdminBannerEditModal

import { db } from '../../../../services/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

// Define available reaction icons with more vibrant colors
const reactionIconsHomeView = {
    like: { outline: FaThumbsUp, solid: FaThumbsUp, color: 'text-blue-500' },
    heart: { outline: FaHeart, solid: FaHeart, color: 'text-red-600' },
    laugh: { outline: FaLaugh, solid: FaLaugh, color: 'text-yellow-500' },
    wow: { outline: FaGrinStars, solid: FaGrinStars, color: 'text-purple-600' },
    sad: { outline: FaFrown, solid: FaFrown, color: 'text-gray-700' },
    angry: { outline: FaAngry, solid: FaAngry, color: 'text-red-700' },
    care: { outline: FaHandHoldingHeart, solid: FaHandHoldingHeart, color: 'text-pink-500' },
};

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300;

const HomeView = ({
    showToast,
    userProfile,
    teacherAnnouncements,
    handleCreateAnnouncement,
    activeClasses,
    editingAnnId,
    editingAnnText,
    setEditingAnnText,
    handleStartEditAnn,
    handleUpdateTeacherAnn,
    setEditingAnnId,
    handleDeleteTeacherAnn,
    handleViewChange // <-- Make sure this prop is passed down
}) => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [scheduleActivities, setScheduleActivities] = useState([]);
    const scheduleCollectionRef = collection(db, 'schedules');

    const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    const [homeViewPostReactions, setHomeViewPostReactions] = useState({});
    const [homeViewUsersMap, setHomeViewUsersMap] = useState({});
    const [hoveredHomeViewReactionData, setHoveredHomeViewReactionData] = useState(null);
    const homeViewTimeoutRef = useRef(null);
    const hoverReactionOptionsRef = useRef(null);

    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});

    // New State for Banner Management
    const [bannerSettings, setBannerSettings] = useState({
        imageUrl: 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png', // Default image
        endDate: null // Default end date (null means indefinite)
    });
    const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);

    const toggleAnnouncementExpansion = (announcementId) => {
        setExpandedAnnouncements(prev => ({
            ...prev,
            [announcementId]: !prev[announcementId]
        }));
    };

    const currentUserId = userProfile?.id;

    const fetchUsersData = async (userIds, dbInstance, currentUserProfile, setUsersMap) => {
        const usersData = {};
        if (userIds.length === 0) return;

        const uniqueUserIds = [...new Set(userIds)];

        if (currentUserProfile?.id) {
            usersData[currentUserProfile.id] = {
                ...currentUserProfile,
                id: currentUserProfile.id,
            };
        }

        const promises = uniqueUserIds.map(async (uid) => {
            if (usersData[uid]) return;

            try {
                const userDocRef = doc(dbInstance, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    usersData[uid] = {
                        firstName: userData.firstName || '',
                        lastName: userData.lastName || '',
                        photoURL: userData.photoURL || null,
                        id: uid,
                    };
                } else {
                    usersData[uid] = { firstName: 'Unknown', lastName: 'User', id: uid, photoURL: null };
                }
            } catch (error) {
                console.warn(`Could not fetch user data for ID ${uid}:`, error);
                usersData[uid] = { firstName: 'Error', lastName: 'User', id: uid, photoURL: null };
            }
        });

        await Promise.all(promises);
        setUsersMap(prev => ({ ...prev, ...usersData }));
    };

    // MODIFIED: Effect to listen for schedules in real-time
    useEffect(() => {
        const unsubscribe = onSnapshot(scheduleCollectionRef, (snapshot) => {
            const fetchedSchedules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setScheduleActivities(fetchedSchedules);
        }, (error) => {
            console.error("Error listening to schedules:", error);
            showToast("Failed to load schedules in real-time.", "error");
        });

        // Cleanup listener on component unmount
        return () => unsubscribe();
    }, [scheduleCollectionRef, showToast]);


    // Effect to listen for reactions on announcements in HomeView
    useEffect(() => {
        const unsubscribeFunctions = [];
        if (!Array.isArray(teacherAnnouncements)) {
            console.warn("teacherAnnouncements prop is not an array:", teacherAnnouncements);
            return () => {};
        }

        const allUserIdsInReactions = new Set();

        teacherAnnouncements.forEach(announcement => {
            if (announcement.id) {
                if (announcement.teacherId) {
                    allUserIdsInReactions.add(announcement.teacherId);
                }

                const reactionsQuery = collection(db, `teacherAnnouncements/${announcement.id}/reactions`);
                const unsubscribe = onSnapshot(reactionsQuery, (snapshot) => {
                    const fetchedPostReactions = {};
                    snapshot.docs.forEach(doc => {
                        const reactionData = doc.data();
                        fetchedPostReactions[doc.id] = reactionData.reactionType;
                        allUserIdsInReactions.add(doc.id);
                    });

                    setHomeViewPostReactions(prev => ({
                        ...prev,
                        [announcement.id]: fetchedPostReactions
                    }));

                    fetchUsersData(Array.from(allUserIdsInReactions), db, userProfile, setHomeViewUsersMap);

                }, (error) => {
                    console.error(`Error fetching reactions for announcement ${announcement.id}:`, error);
                });
                unsubscribeFunctions.push(unsubscribe);
            }
        });

        return () => {
            unsubscribeFunctions.forEach(unsub => unsub());
        };
    }, [teacherAnnouncements, db, userProfile]);


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
    const todayFormatted = now.toISOString().split('T')[0]; // YYYY-MM-DD string

    const todayActivities = scheduleActivities.filter(activity => {
        const activityStartDate = activity.startDate; // YYYY-MM-DD string
        const activityEndDate = activity.endDate;   // YYYY-MM-DD string

        const isActivityActiveTodayByDate = todayFormatted >= activityStartDate && todayFormatted <= activityEndDate;

        if (!isActivityActiveTodayByDate) {
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

                return activityDateTime >= now;
            } catch (e) {
                console.error("Error parsing activity time, defaulting to showing it:", activity.time, e);
                return true;
            }
        }
        return true;
    }).sort((a, b) => {
        if (a.time === 'N/A' || !a.time) return -1;
        if (b.time === 'N/A' || !b.time) return 1;

        const [aTimePart, aAmpm] = a.time.split(' ');
        const [bTimePart, bAmpm] = b.time.split(' ');

        let [aHours, aMinutes] = aTimePart.split(':').map(Number);
        let [bHours, bMinutes] = bTimePart.split(':').map(Number);

        if (aAmpm && aAmpm.toUpperCase() === 'PM' && aHours !== 12) aHours += 12;
        else if (aAmpm && aAmpm.toUpperCase() === 'AM' && aHours === 12) aHours = 0;

        if (bAmpm && bAmpm.toUpperCase() === 'PM' && bHours !== 12) bHours += 12;
        else if (bAmpm && bAmpm.toUpperCase() === 'AM' && bHours === 12) bHours = 0;

        const timeA = aHours * 60 + aMinutes;
        const timeB = bHours * 60 + bMinutes;

        return timeA - timeB;
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
            setCurrentActivityIndex(0); // Reset index if activities become 0 or 1
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

    const openReactionsBreakdownModal = (reactions, usersMap) => {
        setReactionsForBreakdownModal(reactions);
        setIsReactionsBreakdownModalOpen(true);
    };

    const closeReactionsBreakdownModal = () => {
        setIsReactionsBreakdownModalOpen(false);
        setReactionsForBreakdownModal(null);
    };


    const handleTogglePostReactionHomeView = async (announcementId, reactionType) => {
        if (!currentUserId || !announcementId) {
            showToast("User not logged in or announcement ID missing.", "error");
            return;
        }

        const userReactionRef = doc(db, `teacherAnnouncements/${announcementId}/reactions`, currentUserId);
        const existingReactionType = homeViewPostReactions[announcementId]?.[currentUserId];

        try {
            if (existingReactionType === reactionType) {
                await deleteDoc(userReactionRef);
                showToast(`Your ${reactionType} reaction has been removed.`, "info");
            } else {
                await setDoc(userReactionRef, { userId: currentUserId, reactionType: reactionType, timestamp: new Date() });
                showToast(`You reacted with ${reactionType}!`, "success");
            }
        } catch (error) {
            console.error("Error toggling post reaction in HomeView:", error);
            showToast("Failed to update reaction.", "error");
        }
    };

    const formatReactionCountHomeView = (reactions, announcementId) => {
        const safeReactions = reactions || {};
        const counts = {};
        Object.values(safeReactions).forEach(type => {
            counts[type] = (counts[type] || 0) + 1;
        });
        const sortedReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);

        if (Object.keys(safeReactions).length === 0) return null;

        const allReactingUsers = Object.keys(safeReactions).map(userId => {
            const user = homeViewUsersMap[userId];
            return user ? `${user.firstName} ${user.lastName}`.trim() : `User ID: ${userId.substring(0, 5)}...`;
        });

        const handleMouseEnter = (e) => {
            clearTimeout(homeViewTimeoutRef.current);
            setHoveredHomeViewReactionData({
                type: 'post',
                id: announcementId,
                users: allReactingUsers,
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

        const isVisible = hoveredHomeViewReactionData && hoveredHomeViewReactionData.id === announcementId && hoveredHomeViewReactionData.type === 'post';

        return (
            <div
                className="flex items-center space-x-1 cursor-pointer relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                    e.stopPropagation();
                    openReactionsBreakdownModal(reactions, homeViewUsersMap);
                }}
            >
                {sortedReactions.map(([type]) => {
                    const Icon = reactionIconsHomeView[type]?.solid;
                    return Icon ? <Icon key={type} className={`h-4 w-4 ${reactionIconsHomeView[type]?.color}`} /> : null;
                })}
                <span className="text-xs text-gray-500 font-medium">{Object.keys(safeReactions).length}</span>

                <div
                    className="reaction-hover-popup-homeview bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg absolute z-50 transform -translate-x-1/2"
                    style={{
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
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

    const handleReactionOptionsMouseEnter = (e, announcementId) => {
        clearTimeout(homeViewTimeoutRef.current);
        setHoveredHomeViewReactionData({
            type: 'options',
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
        setHoveredHomeViewReactionData(null);
    };

    // MODIFIED: Simplified banner settings fetching to rely solely on onSnapshot
    useEffect(() => {
        const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
        const unsubscribe = onSnapshot(bannerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setBannerSettings(docSnap.data());
            } else {
                setBannerSettings({
                    imageUrl: 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png',
                    endDate: null
                });
            }
        }, (error) => {
            console.error("Error listening to banner settings:", error);
            showToast("Real-time banner updates failed.", "error");
        });

        return () => unsubscribe(); // Cleanup listener
    }, [showToast]);

    const isSpecialBannerActive = useMemo(() => {
        const now = new Date();
        // Check if there's an imageUrl and if the endDate is in the future or not set
        return bannerSettings.imageUrl && (!bannerSettings.endDate || bannerSettings.endDate.toDate() > now);
    }, [bannerSettings]);

    // Admin-specific banner click handler
    const handleBannerImageClick = () => {
        console.log("Banner image clicked. User role:", userProfile?.role); // For debugging
        if (userProfile?.role === 'admin') {
            setIsBannerEditModalOpen(true);
        } else {
            showToast("Only administrators can edit banner settings.", "info");
        }
    };

    return (
        <div className="relative min-h-screen p-4 md:p-8 bg-gray-100 text-gray-800 font-sans overflow-hidden rounded-3xl">
            {/* Dynamic Background Elements - Retained for general aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow"></div>
                <div className="absolute bottom-20 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow-reverse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-spin-slow animation-delay-4000"></div>
            </div>

            {/* Main Content Container with a modern, clean feel */}
            <div className="relative z-10 space-y-10">
                {/* Header with a subtle animated gradient - Now with a fixed height and static, clean background */}
                <div className={`relative px-5 py-0.5 md:px-8 md:py-0.5 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-down default-banner-background h-48`}>
                    {/* Conditional rendering for the main banner content */}
                    {isSpecialBannerActive ? (
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-0 h-full items-center px-0.5">
                            {/* Left Column: Greeting */}
                            <div className="col-span-1 text-center md:text-left flex flex-col justify-center h-full">
                                <h1 className="text-3xl font-extrabold text-gray-800 drop-shadow-sm leading-tight"> {/* Doubled h1 size to 3xl */}
                                    Hey there, {userProfile?.firstName}!
                                </h1>
                                <p className="text-xs text-gray-500 mt-0">SRCS LMS dashboard at a glance.</p>
                            </div>

                            {/* Center Column: Image Container (Clickable) */}
                            <div
                                className="col-span-1 flex items-center justify-center h-full w-full relative z-20" // Made this div the clickable target
                                onClick={userProfile?.role === 'admin' ? handleBannerImageClick : undefined} // Conditional click handler
                                style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }} // Explicit cursor style
                            >
                                <img
                                    src={bannerSettings.imageUrl} // Dynamically load image from state
                                    alt="Promotional Banner"
                                    className="block h-[170px] w-auto object-contain p-2" // Set fixed height and auto width
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x38/E0E7EE/888888?text=Image+Load+Error'; }} // Fallback
                                />
                            </div>

                            {/* Right Column: Upcoming Today Card */}
                            <div className="col-span-1 flex items-center justify-center h-full overflow-hidden">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 rounded-xl shadow-lg border border-indigo-200 w-full h-28 flex flex-col px-2 py-0.5">
                                    {/* Subtle background pattern/effect */}
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGwlM0QiMDAwMDAwIiUyMGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM2SDI0VjI0aDEyYzEuMTA0IDAgMiAuODk2IDIgMlYyMmMwIDEuMTA0LS44OTYgMi0yIDJ6TTQ0IDQ0SDMyVjMyaDEyYzEuMTA0IDAgMiAuODk2IDIgMlY0MmMwADEuMTA0LS44OTYgMi0yIDJ6Ii8+PC9nPjwvZ34KPC9zdmc+')] opacity-20 transform rotate-45 scale-150 transition-transform duration-500 group-hover:scale-100"></div>
                                    
                                    <p className="font-bold text-lg mb-0 flex items-center relative z-10">
                                        <FaCalendarAlt className="w-3 h-3 mr-1 text-indigo-600" />
                                        Today's Schedule(s)
                                    </p>
                                    <div className="relative z-10 flex-grow flex items-center justify-center">
                                        {todayActivities.length > 0 && todayActivities[currentActivityIndex] ? (
                                            <p
                                                key={todayActivities[currentActivityIndex].id}
                                                className="text-center activity-slide-in font-light block text-lg leading-tight"
                                            >
                                                <span className="font-bold block text-xs leading-tight">{todayActivities[currentActivityIndex].title}</span>
                                                {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && (
                                                    <span className="flex items-center text-lg justify-center mt-0 text-gray-700">
                                                        <FaClock className="w-3 h-3 mr-0.5 opacity-70" /> {todayActivities[currentActivityIndex].time}
                                                    </span>
                                                )}
                                                {todayActivities[currentActivityIndex].inCharge && (
                                                    <span className="block text-xs opacity-80 text-gray-600">
                                                        In-charge: {todayActivities[currentActivityIndex].inCharge}
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-xs font-light text-gray-500 text-center">No activities scheduled for today.</p>
                                        )}
                                    </div>
                                    <p className="text-xs mt-auto pt-0 pb-0 opacity-90 relative z-10 border-t border-indigo-200 text-gray-700">Stay on top of your schedule!</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Original content when special banner is not active (flex row for greeting and schedule)
                        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between h-full w-full">
                            <div className="flex-1">
                                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">
                                    Hey there, {userProfile?.firstName}!
                                </h1>
                                <p className="text-lg text-gray-500 mt-2">SRCS LMS Dashboard At a Glance.</p>
                            </div>
                            {/* Upcoming Today card (sibling to greeting) */}
                            <div className="mt-6 md:mt-0 md:ml-6 px-5 py-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 rounded-xl shadow-lg border border-indigo-200 max-w-sm flex-shrink-0 relative overflow-hidden group h-28 flex flex-col">
                                {/* Subtle background pattern/effect */}
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGwlM0QiMDAwMDAwIiUyMGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM2SDI0VjI0aDEyYzEuMTA0IDAgMiAuODk2IDIgMlYyMmMwIDEuMTA0LS44OTYgMi0yIDJ6TTQ0IDQ0SDMyVjMyaDEyYzEuMTA0IDAgMiAuODk2IDIgMlY0MmMwADEuMTA0LS44OTYgMi0yIDJ6Ii8+PC9nPjwvZ34KPC9zdmc+')] opacity-20 transform rotate-45 scale-150 transition-transform duration-500 group-hover:scale-100"></div>
                                
                                <p className="font-bold text-xl mb-1 flex items-center relative z-10">
                                    <FaCalendarAlt className="w-7 h-7 mr-3 text-indigo-600" />
                                    Today's Schedule(s)'
                                </p>
                                <div className="relative z-10 flex-grow flex items-center justify-center">
                                    {todayActivities.length > 0 && todayActivities[currentActivityIndex] ? (
                                        <p
                                            key={todayActivities[currentActivityIndex].id}
                                            className="text-center activity-slide-in font-light block text-sm"
                                        >
                                            <span className="font-bold block text-base leading-tight">{todayActivities[currentActivityIndex].title}</span>
                                            {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && (
                                                <span className="flex items-center text-sm mt-1 text-gray-700">
                                                    <FaClock className="w-4 h-4 mr-1 opacity-70" /> {todayActivities[currentActivityIndex].time}
                                                </span>
                                            )}
                                            {todayActivities[currentActivityIndex].inCharge && (
                                                <span className="block text-xs opacity-80 text-gray-600">
                                                    In-charge: {todayActivities[currentActivityIndex].inCharge}
                                                </span>
                                            )}
                                        </p>
                                    ) : (
                                        <p className="text-sm font-light text-gray-500 text-center">No activities scheduled for today.</p>
                                    )}
                                </div>
                                <p className="text-xs mt-auto pt-1 opacity-90 relative z-10 border-t border-indigo-200 text-gray-700">Stay on top of your schedule!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Stat & Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                    {/* 1. Date and Time Card */}
                    <ClockWidget className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-600" />

                    {/* 2. Inspiration Card */}
                    <InspirationCard className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in animation-delay-300" />

                    {/* 3. Schedule of Activities Card */}
                    <div
                        className="bg-white p-6 rounded-3xl shadow-xl flex items-center justify-center flex-col text-center cursor-pointer transition transform hover:scale-105 duration-300 ease-in-out animate-fade-in animation-delay-900"
                        onClick={() => setIsScheduleModalOpen(true)}
                    >
                        <FaCalendarAlt className="h-10 w-10 text-rose-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-lg">Schedule of Activities</h3>
                        <p className="text-sm text-gray-500 mt-1">Check out what's due soon.</p>
                    </div>

                    {/* 4. Active Classes Card - Now Clickable */}
                    <div
                        className="cursor-pointer transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl animate-fade-in"
                        onClick={() => handleViewChange('classes')} // Click to navigate to Classes tab
                    >
                        <GradientStatCard
                            title="Active Classes"
                            value={activeClasses.length}
                            icon={<FaGraduationCap />}
                            gradient="from-green-500 to-emerald-600"
                            className="rounded-3xl shadow-xl" // Apply shadow to the card itself
                        />
                    </div>
                </div>

                {/* Announcements Section - Redesigned with a split layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Announcement Column */}
                    <div className="lg:col-span-1 p-6 bg-white rounded-3xl shadow-2xl animate-fade-in-up">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">New Announcement</h2>
                        <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                    </div>

                    {/* Recent Announcements Column - Facebook News Feed Style */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Recent Announcements</h2>
                        {teacherAnnouncements && teacherAnnouncements.length > 0 ? teacherAnnouncements.map(post => {
                            const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                            const postReactionsForThisPost = post.id ? (homeViewPostReactions[post.id] || {}) : {};
                            const currentUserReaction = postReactionsForThisPost[currentUserId];
                            const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;
                            const showFullAnnouncement = expandedAnnouncements[post.id];
                            const authorProfile = homeViewUsersMap[post.teacherId];

                            return (
                                <div
                                    key={post.id}
                                    className="bg-white rounded-3xl shadow-xl p-6 relative group transform transition-transform duration-200 hover:scale-[1.005]"
                                >
                                    {/* Post Header (Profile Picture, Name, Timestamp, Options) */}
                                    <div className="flex items-center mb-4">
                                        <div className="w-10 h-10 flex-shrink-0">
                                            <UserInitialsAvatar user={authorProfile} size="w-10 h-10" />
                                        </div>
                                        <div className="ml-3">
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
                                            {post.commentsCount || 0} comments
                                        </span>
                                    </div>

                                    {/* Action Buttons (Like/React, Comment) */}
                                    <div className="flex justify-around items-center pt-3">
                                        <div
                                            className="relative reaction-button-group"
                                            onMouseEnter={(e) => handleReactionOptionsMouseEnter(e, post.id)}
                                            onMouseLeave={handleReactionOptionsMouseLeave}
                                        >
                                            <button
                                                className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors duration-200
                                                ${currentUserReaction ? `${reactionIconsHomeView[currentUserReaction]?.color} bg-blue-50/50` : 'text-gray-600 hover:bg-gray-100'}`}
                                                onClick={() => handleTogglePostReactionHomeView(post.id, currentUserReaction || 'like')}
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

                                            {hoveredHomeViewReactionData && hoveredHomeViewReactionData.type === 'options' && hoveredHomeViewReactionData.id === post.id && (
                                                <div
                                                    ref={hoverReactionOptionsRef}
                                                    className="reaction-options-popup bg-white rounded-full shadow-lg p-2 flex space-x-2 absolute z-50"
                                                    style={{
                                                        bottom: 'calc(100% + 8px)',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        opacity: 1,
                                                        pointerEvents: 'auto'
                                                    }}
                                                    onMouseEnter={() => clearTimeout(homeViewTimeoutRef.current)}
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

            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                userRole={userProfile?.role}
                scheduleActivities={filteredScheduleActivitiesForDisplay}
                onAddActivity={handleAddScheduleActivity}
                onUpdateActivity={handleUpdateScheduleActivity}
                onDeleteActivity={handleDeleteScheduleActivity}
            />

            <AnnouncementModal
                isOpen={isAnnouncementModalOpen}
                onClose={closeAnnouncementModal}
                announcement={selectedAnnouncement}
                userProfile={userProfile}
                db={db}
            />

            <ReactionsBreakdownModal
                isOpen={isReactionsBreakdownModalOpen}
                onClose={closeReactionsBreakdownModal}
                reactionsData={reactionsForBreakdownModal}
                usersMap={homeViewUsersMap}
            />

            {/* Admin Banner Edit Modal */}
            <AdminBannerEditModal
                isOpen={isBannerEditModalOpen}
                onClose={() => setIsBannerEditModalOpen(false)}
                currentImageUrl={bannerSettings.imageUrl}
                currentEndDate={bannerSettings.endDate}
                onSaveSuccess={() => { /* onSnapshot will handle re-fetch */ }}
            />

            <style jsx>{`
                /* Default Banner Background (replaces weather backgrounds) */
                .default-banner-background {
                    background: linear-gradient(135deg, #f0f4f8 0%, #e0e7ee 100%); /* A subtle, modern light grey/blue gradient */
                }

                /* Animation for Activity Text Slide-In */
                @keyframes activitySlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .activity-slide-in {
                    animation: activitySlideIn 0.5s ease-out forwards; /* 0.5 seconds duration, stay at end state */
                }


                /* Existing Styles */
                /* Removed custom-scrollbar as it's no longer needed for fixed height with truncation */


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
                    animation: fadeIn 1s ease-out 0.6s forwards; /* Example with forward fill-mode */
                }
                .animation-delay-900 {
                    animation: fadeIn 1s ease-out 0.9s forwards; /* Example with forward fill-mode */
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

                /* Removed .animate-pulse-light as it's no longer used for the main banner */
                /* @keyframes pulseLight {
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 0.5; }
                } */

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

                .reaction-hover-popup, .reaction-hover-popup-homeview {
                    position: absolute;
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    transform: translateX(-50%);
                    white-space: nowrap;
                }

                .reaction-options-popup {
                    position: absolute;
                    background-color: white;
                    border-radius: 9999px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    padding: 4px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                }

                .reaction-button-group {
                    position: relative;
                }

                .reaction-options-popup {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translate(-50%, 10px);
                    opacity: 0;
                    pointer-events: none;
                    transition: transform 0.2s ease-out, opacity 0.2s ease-out;
                    padding: 4px 8px;
                    border-radius: 50px;
                    background-color: white;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    z-index: 50;
                }

                .reaction-button-group:hover .reaction-options-popup {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translate(-50%, -10px);
                }

                .reaction-pop-icon {
                    transform: scale(1) translateY(0);
                    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease-out;
                    will-change: transform, box-shadow;
                    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    border-radius: 9999px;
                    background-color: white;
                }

                .reaction-pop-icon-like { animation-delay: 0s; }
                .reaction-pop-icon-heart { animation-delay: 0.05s; }
                .reaction-pop-icon-laugh { animation-delay: 0.1s; }
                .reaction-pop-icon-wow { animation-delay: 0.15s; }
                .reaction-pop-icon-sad { animation-delay: 0.2s; }
                .reaction-pop-icon-angry { animation-delay: 0.25s; }
                .reaction-pop-icon-care { animation-delay: 0.3s; }
                
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.5) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                
                .reaction-pop-icon:hover {
                    transform: scale(1.3) translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0,0,0,0.3);
                    z-index: 51;
                }
                
                .reaction-options-popup button {
                    position: relative;
                    overflow: hidden;
                    background-color: transparent;
                }
            `}</style>
        </div>
    );
};

export default HomeView;
