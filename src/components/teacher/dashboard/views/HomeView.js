import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import other icons from react-icons library as needed
import {
    FaGraduationCap,
    FaPencilAlt,
    FaTrash,
    FaBullhorn,
    FaCalendarAlt,
    FaClock,
    FaThumbtack,
    FaRegCommentDots} from 'react-icons/fa';

import CreateAnnouncement from '../widgets/CreateAnnouncement';
import GradientStatCard from '../widgets/GradientStatCard';
import InspirationCard from '../widgets/InspirationCard';
import ClockWidget from '../widgets/ClockWidget';
import ScheduleModal from '../widgets/ScheduleModal';
import AnnouncementModal from '../widgets/AnnouncementModal';
import ReactionsBreakdownModal from '../widgets/ReactionsBreakdownModal';
import UserInitialsAvatar from '../../../../components/common/UserInitialsAvatar';
import AdminBannerEditModal from '../widgets/AdminBannerEditModal';

import { db } from '../../../../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';

// Lightweight inline emoji components (no external deps)
const FacebookEmoji = ({ type = 'like', size = 18, className = '' }) => {
    const map = {
        like: '👍',
        heart: '❤️',
        haha: '😆',
        wow: '😮',
        sad: '😢',
        angry: '😡',
        care: '🤗',
    };
    const labelMap = {
        like: 'Like',
        heart: 'Love',
        haha: 'Haha',
        wow: 'Wow',
        sad: 'Sad',
        angry: 'Angry',
        care: 'Care',
    };
    const emoji = map[type] || map.like;
    const label = labelMap[type] || 'Like';
    return (
        <span
            role="img"
            aria-label={label}
            title={label}
            className={className}
            style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}
        >
            {emoji}
        </span>
    );
};

// Map of reaction types to components + colors
const reactionIconsHomeView = {
    like: {
        component: (props) => <FacebookEmoji type="like" {...props} />,
        color: 'text-blue-500',
    },
    heart: {
        component: (props) => <FacebookEmoji type="heart" {...props} />,
        color: 'text-red-500',
    },
    haha: {
        component: (props) => <FacebookEmoji type="haha" {...props} />,
        color: 'text-yellow-500',
    },
    wow: {
        component: (props) => <FacebookEmoji type="wow" {...props} />,
        color: 'text-purple-600',
    },
    sad: {
        component: (props) => <FacebookEmoji type="sad" {...props} />,
        color: 'text-gray-700',
    },
    angry: {
        component: (props) => <FacebookEmoji type="angry" {...props} />,
        color: 'text-red-700',
    },
    care: {
        component: (props) => <FacebookEmoji type="care" {...props} />,
        color: 'text-pink-500',
    },
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
    handleTogglePinAnnouncement,
    handleViewChange
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
    const longPressTimerRef = useRef(null);

    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});

    const [bannerSettings, setBannerSettings] = useState({
        imageUrl: 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png',
        endDate: null
    });
    const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);

    const sortedAnnouncements = useMemo(() => {
        if (!Array.isArray(teacherAnnouncements)) return [];
        return [...teacherAnnouncements].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA;
        });
    }, [teacherAnnouncements]);

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

    useEffect(() => {
        const unsubscribe = onSnapshot(scheduleCollectionRef, (snapshot) => {
            const fetchedSchedules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setScheduleActivities(fetchedSchedules);
        }, (error) => {
            console.error("Error listening to schedules:", error);
            showToast("Failed to load schedules in real-time.", "error");
        });

        return () => unsubscribe();
    }, [scheduleCollectionRef, showToast]);


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
    const todayFormatted = now.toISOString().split('T')[0];

    const todayActivities = scheduleActivities.filter(activity => {
        const activityStartDate = activity.startDate;
        const activityEndDate = activity.endDate;

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
                    const IconComponent = reactionIconsHomeView[type]?.component;
                    return IconComponent ? <IconComponent key={type} /> : null;
                })}
                <span className="text-xs text-gray-500 font-medium">{Object.keys(safeReactions).length}</span>
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="reaction-hover-popup-homeview bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg absolute z-50 transform -translate-x-1/2"
                            style={{
                                bottom: 'calc(100% + 8px)',
                                left: '50%',
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
                        </motion.div>
                    )}
                </AnimatePresence>
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
    
    const handleTouchStart = (e, announcementId) => {
        e.preventDefault();
        clearTimeout(longPressTimerRef.current);
        homeViewTimeoutRef.current = setTimeout(() => {
            setHoveredHomeViewReactionData(null);
        }, 300);
    
        longPressTimerRef.current = setTimeout(() => {
            setHoveredHomeViewReactionData({
                type: 'options',
                id: announcementId,
            });
        }, 500);
    };
    
    const handleTouchEnd = () => {
        clearTimeout(longPressTimerRef.current);
        clearTimeout(homeViewTimeoutRef.current);
    
        setTimeout(() => {
            setHoveredHomeViewReactionData(null);
        }, 100);
    };
    
    const handleTouchMove = () => {
        clearTimeout(longPressTimerRef.current);
    };

    const handleReactionOptionClick = (announcementId, reactionType) => {
        handleTogglePostReactionHomeView(announcementId, reactionType);
        setHoveredHomeViewReactionData(null);
    };

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

        return () => unsubscribe();
    }, [showToast]);

    const isSpecialBannerActive = useMemo(() => {
        const now = new Date();
        return bannerSettings.imageUrl && (!bannerSettings.endDate || bannerSettings.endDate.toDate() > now);
    }, [bannerSettings]);

    const handleBannerImageClick = () => {
        if (userProfile?.role === 'admin') {
            setIsBannerEditModalOpen(true);
        } else {
            showToast("Only administrators can edit banner settings.", "info");
        }
    };

    const fadeProps = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        transition: { duration: 0.5, ease: "easeOut" }
    };

    return (
        <div className="relative min-h-screen p-4 md:p-8 bg-gray-100 text-gray-800 font-sans overflow-hidden rounded-3xl">
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <motion.div
                    className="absolute -top-40 -left-40 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-20 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 30, ease: "linear", repeat: Infinity, delay: 2 }}
                />
                <motion.div
                    className="absolute top-1/2 left-1/4 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, ease: "linear", repeat: Infinity, delay: 4 }}
                />
            </div>

            <div className="relative z-10 space-y-10">
                <motion.div
                    {...fadeProps}
                    className={`relative px-5 py-0.5 md:px-8 md:py-0.5 bg-white rounded-3xl shadow-2xl overflow-hidden default-banner-background h-48`}
                >
                    {isSpecialBannerActive ? (
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-0 h-full items-center px-0.5">
                            <div className="col-span-1 text-center md:text-left flex flex-col justify-center h-full">
                                <h1 className="text-3xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">
                                    Hey there, {userProfile?.firstName}!
                                </h1>
                                <p className="text-xs text-gray-500 mt-0">SRCS LMS dashboard at a glance.</p>
                            </div>

                            <div
                                className="col-span-1 flex items-center justify-center h-full w-full relative z-20"
                                onClick={userProfile?.role === 'admin' ? handleBannerImageClick : undefined}
                                style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                            >
                                <motion.img
                                    src={bannerSettings.imageUrl}
                                    alt="Promotional Banner"
                                    className="block h-[170px] w-auto object-contain p-2"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x38/E0E7EE/888888?text=Image+Load+Error'; }}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                />
                            </div>

                            <div className="col-span-1 flex items-center justify-center h-full overflow-hidden">
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 rounded-2xl shadow-lg border border-indigo-200/50 w-full h-full p-4 flex flex-col justify-between">
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGwlM0QiMDAwMDAwIiUyMGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM2SDI4VjI0aDEyYzEuMTA0IDAgMiAuODk2IDIgMlYyMmMwIDEuMTA0LS44OTYgMi0yIDJ6TTQ0IDQ0SDMyVjMyaDEyYzEuMTA0IDAgMiAuODk2IDIgMlY0MmMwIDEuMTA0LS44OTYgMi0yIDJ6Ii8+PC9nPjwvZ34KPC9zdmc+')] opacity-10 transform rotate-45 scale-150 transition-transform duration-500 group-hover:scale-100"></div>
                                    
                                    <div className="relative z-10">
                                        <p className="font-bold text-indigo-700 flex items-center gap-2">
                                            <FaCalendarAlt className="w-5 h-5" />
                                            <span className="text-lg">Today's Schedule</span>
                                        </p>
                                    </div>
                                    
                                    <div className="relative z-10 flex-grow flex items-center justify-center text-center">
                                        <AnimatePresence mode="wait">
                                            {todayActivities.length > 0 && todayActivities[currentActivityIndex] ? (
                                                <motion.div
                                                    key={todayActivities[currentActivityIndex].id}
                                                    className="flex flex-col items-center justify-center"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                    <span className="font-bold text-2xl text-indigo-900 leading-tight block">{todayActivities[currentActivityIndex].title}</span>
                                                    {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && (
                                                        <span className="flex items-center text-xl justify-center mt-1 text-gray-700 font-light">
                                                            <FaClock className="w-4 h-4 mr-2 opacity-70" /> {todayActivities[currentActivityIndex].time}
                                                        </span>
                                                    )}
                                                    {todayActivities[currentActivityIndex].inCharge && (
                                                        <span className="block text-xs opacity-80 text-indigo-800 mt-2 bg-indigo-200/50 px-2 py-1 rounded-full">
                                                            In-charge: {todayActivities[currentActivityIndex].inCharge}
                                                        </span>
                                                    )}
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="no-activities"
                                                    className="text-center"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                   <p className="text-lg font-semibold text-gray-500">All Clear!</p>
                                                   <p className="text-sm text-gray-400">No activities scheduled for today.</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="relative z-10">
                                        <p className="text-xs text-center pt-2 opacity-90 border-t border-indigo-200/80 text-gray-700">Stay on top of your schedule!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between h-full w-full">
                            <div className="flex-1">
                                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">
                                    Hey there, {userProfile?.firstName}!
                                </h1>
                                <p className="text-lg text-gray-500 mt-2">SRCS LMS Dashboard At a Glance.</p>
                            </div>
                            <div className="mt-6 md:mt-0 md:ml-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-800 rounded-2xl shadow-lg border border-indigo-200/50 max-w-sm flex-shrink-0 relative overflow-hidden group flex flex-col justify-between">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGwlM0QiMDAwMDAwIiUyMGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM2SDI0VjI0aDEyYzEuMTA0IDAgMiAuODk2IDIgMlYyMmMwIDEuMTA0LS44OTYgMi0yIDJ6TTQ0IDQ0SDMyVjMyaDEyYzEuMTA0IDAgMiAuODk2IDIgMlY0MmMwIDEuMTA0LS44OTYgMi0yIDJ6Ii8+PC9nPjwvZ34KPC9zdmc+')] opacity-10 transform rotate-45 scale-150 transition-transform duration-500 group-hover:scale-100"></div>
                                
                                <div className="relative z-10">
                                    <p className="font-bold text-indigo-700 flex items-center gap-2">
                                        <FaCalendarAlt className="w-5 h-5" />
                                        <span className="text-lg">Today's Schedule</span>
                                    </p>
                                </div>
                                
                                <div className="relative z-10 flex-grow flex items-center justify-center text-center py-4">
                                    <AnimatePresence mode="wait">
                                        {todayActivities.length > 0 && todayActivities[currentActivityIndex] ? (
                                            <motion.div
                                                key={todayActivities[currentActivityIndex].id}
                                                className="flex flex-col items-center justify-center"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                <span className="font-bold text-2xl text-indigo-900 leading-tight block">{todayActivities[currentActivityIndex].title}</span>
                                                {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && (
                                                    <span className="flex items-center text-xl justify-center mt-1 text-gray-700 font-light">
                                                        <FaClock className="w-4 h-4 mr-2 opacity-70" /> {todayActivities[currentActivityIndex].time}
                                                    </span>
                                                )}
                                                {todayActivities[currentActivityIndex].inCharge && (
                                                    <span className="block text-xs opacity-80 text-indigo-800 mt-2 bg-indigo-200/50 px-2 py-1 rounded-full">
                                                        In-charge: {todayActivities[currentActivityIndex].inCharge}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="no-activities"
                                                className="text-center"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.5 }}
                                            >
                                               <p className="text-lg font-semibold text-gray-500">All Clear!</p>
                                               <p className="text-sm text-gray-400">No activities scheduled for today.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="relative z-10">
                                    <p className="text-xs text-center pt-2 opacity-90 border-t border-indigo-200/80 text-gray-700">Stay on top of your schedule!</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                    <motion.div {...fadeProps} transition={{ duration: 0.5, delay: 0.3 }}>
                        <ClockWidget className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl" />
                    </motion.div>
                    <motion.div {...fadeProps} transition={{ duration: 0.5, delay: 0.6 }}>
                        <InspirationCard className="rounded-3xl shadow-xl transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl" />
                    </motion.div>
                    <motion.div
                        {...fadeProps}
                        transition={{ duration: 0.5, delay: 0.9 }}
                        className="bg-white p-6 rounded-3xl shadow-xl flex items-center justify-center flex-col text-center cursor-pointer transition transform hover:scale-105 duration-300 ease-in-out"
                        onClick={() => setIsScheduleModalOpen(true)}
                    >
                        <FaCalendarAlt className="h-10 w-10 text-rose-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-lg">Schedule of Activities</h3>
                        <p className="text-sm text-gray-500 mt-1">Check out what's due soon.</p>
                    </motion.div>
                    <motion.div
                        {...fadeProps}
                        transition={{ duration: 0.5, delay: 1.2 }}
                        className="cursor-pointer transition transform hover:scale-105 duration-300 ease-in-out hover:shadow-2xl"
                        onClick={() => handleViewChange('classes')}
                    >
                        <GradientStatCard
                            title="Active Classes"
                            value={activeClasses.length}
                            icon={<FaGraduationCap />}
                            gradient="from-green-500 to-emerald-600"
                            className="rounded-3xl shadow-xl"
                        />
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div
                        {...fadeProps}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-1 p-6 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow duration-300"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-rose-100 p-3 rounded-2xl">
                                <FaBullhorn className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Create Announcement</h2>
                            </div>
                        </div>
                        <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                    </motion.div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-3 mb-4">
            
                            <h2 className="text-2xl font-bold text-gray-800">Activity Feed</h2>
                        </div>
                        <AnimatePresence>
                            {sortedAnnouncements && sortedAnnouncements.length > 0 ? sortedAnnouncements.map(post => {
                                const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                                const postReactionsForThisPost = post.id ? (homeViewPostReactions[post.id] || {}) : {};
                                const currentUserReaction = postReactionsForThisPost[currentUserId];
                                const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;
                                const showFullAnnouncement = expandedAnnouncements[post.id];
                                const authorProfile = homeViewUsersMap[post.teacherId];
                                const CurrentReactionIcon = currentUserReaction ? reactionIconsHomeView[currentUserReaction]?.component : reactionIconsHomeView.like?.component;
                                const reactionColor = currentUserReaction ? reactionIconsHomeView[currentUserReaction]?.color : '';

                                return (
                                    <motion.div
                                        key={post.id}
                                        {...fadeProps}
                                        className={`bg-white rounded-3xl shadow-xl p-6 relative group transform transition-transform duration-200 hover:scale-[1.005] border ${post.isPinned ? 'border-yellow-400' : 'border-transparent hover:border-blue-200'} transition-colors`}
                                    >
                                        {post.isPinned && (
                                            <div className="absolute top-4 left-4 flex items-center gap-2 text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full text-xs font-semibold z-10">
                                                <FaThumbtack className="w-3 h-3" />
                                                <span>Pinned</span>
                                            </div>
                                        )}
                                        <div className={`flex items-center mb-4 ${post.isPinned ? 'mt-8' : ''}`}>
                                            <div className="w-10 h-10 flex-shrink-0">
                                                <UserInitialsAvatar user={authorProfile} size="w-10 h-10" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="font-bold text-gray-800">{post.teacherName}</p>
                                                <p className="text-xs text-gray-500">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</p>
                                            </div>
                                            {canModify && (
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                     {userProfile?.role === 'admin' && (
                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleTogglePinAnnouncement(post.id, post.isPinned); }} className={`p-2 rounded-full hover:bg-gray-100 transition ${post.isPinned ? 'text-yellow-500' : 'text-gray-500'}`} title={post.isPinned ? "Unpin Announcement" : "Pin Announcement"}>
                                                            <FaThumbtack className="w-5 h-5" />
                                                        </motion.button>
                                                    )}
                                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleStartEditAnn(post); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Edit Announcement">
                                                        <FaPencilAlt className="w-5 h-5 text-gray-500" />
                                                    </motion.button>
                                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleDeleteTeacherAnn(post.id); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Delete Announcement">
                                                        <FaTrash className="w-5 h-5 text-rose-500" />
                                                    </motion.button>
                                                </div>
                                            )}
                                        </div>

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
                                            post.content && (
                                                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                                                    {isTruncated && !showFullAnnouncement
                                                        ? post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...'
                                                        : post.content}
                                                    {isTruncated && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => toggleAnnouncementExpansion(post.id)}
                                                            className="text-blue-500 hover:underline ml-1"
                                                        >
                                                            {showFullAnnouncement ? 'Show Less' : 'See More...'}
                                                        </motion.button>
                                                    )}
                                                </p>
                                            )
                                        )}
                                        
                                        {post.photoURL && (
                                            <div className="mt-4">
                                                <img 
                                                    src={post.photoURL} 
                                                    alt="Announcement" 
                                                    className="rounded-lg max-h-96 w-full object-contain bg-gray-100"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                {post.caption && (
                                                    <p className="text-sm text-gray-600 mt-2 text-center italic">{post.caption}</p>
                                                )}
                                            </div>
                                        )}

                                        {(Object.keys(postReactionsForThisPost).length > 0 || (post.commentsCount || 0) > 0) && (
                                            <div className="flex justify-between items-center text-sm text-gray-500 mt-4">
                                                {formatReactionCountHomeView(postReactionsForThisPost, post.id)}
                                                <span className="cursor-pointer hover:underline" onClick={() => openAnnouncementModal(post)}>
                                                    {post.commentsCount || 0} comments
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-around items-center pt-2 mt-2 border-t border-gray-100">
                                            <div
                                                className="relative reaction-button-group"
                                                onMouseEnter={(e) => handleReactionOptionsMouseEnter(e, post.id)}
                                                onMouseLeave={handleReactionOptionsMouseLeave}
                                                onTouchStart={(e) => handleTouchStart(e, post.id)}
                                                onTouchEnd={handleTouchEnd}
                                                onTouchMove={handleTouchMove}
                                            >
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`flex items-center space-x-2 py-1 px-3 rounded-full transition-colors duration-200
                                                    ${currentUserReaction ? `${reactionIconsHomeView[currentUserReaction]?.color} bg-blue-50/50` : 'text-gray-600 hover:bg-gray-100'}`}
                                                    onClick={() => handleTogglePostReactionHomeView(post.id, currentUserReaction || 'like')}
                                                >
                                                    <motion.span
                                                        key={currentUserReaction}
                                                        initial={{ scale: 0, rotate: -180 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                                        className={`h-5 w-5 ${reactionColor}`}
                                                    >
                                                        {CurrentReactionIcon && <CurrentReactionIcon />}
                                                    </motion.span>
                                                    <span className="font-semibold capitalize">
                                                        {currentUserReaction || 'Like'}
                                                    </span>
                                                </motion.button>

                                                <AnimatePresence>
                                                    {hoveredHomeViewReactionData && hoveredHomeViewReactionData.type === 'options' && hoveredHomeViewReactionData.id === post.id && (
                                                        <motion.div
                                                            ref={hoverReactionOptionsRef}
                                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                            animate={{ opacity: 1, y: -10, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                                            className="reaction-options-popup bg-white rounded-full shadow-lg p-2 flex space-x-2 absolute z-50"
                                                        >
                                                            {Object.entries(reactionIconsHomeView).map(([type, { component: IconComponent }]) => (
                                                                <motion.button
                                                                    key={type}
                                                                    whileHover={{ scale: 1.3, y: -5 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                                                    className="p-2 rounded-full"
                                                                    onClick={() => handleReactionOptionClick(post.id, type)}
                                                                    title={type.charAt(0).toUpperCase() + type.slice(1)}
                                                                >
                                                                    <IconComponent className="h-6 w-6" />
                                                                </motion.button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <button
                                                className="flex items-center space-x-2 py-1 px-3 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                                                onClick={() => openAnnouncementModal(post)}
                                            >
                                                <FaRegCommentDots className="h-5 w-5" />
                                                <span className="font-semibold">Comment</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    key="no-announcements"
                                    {...fadeProps}
                                    className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50"
                                >
                                    <FaBullhorn className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-lg font-semibold">No new announcements for teachers.</p>
                                    <p className="text-sm">Be the first to post an update!</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                usersMap={homeViewUsersMap}
            />

            <ReactionsBreakdownModal
                isOpen={isReactionsBreakdownModalOpen}
                onClose={closeReactionsBreakdownModal}
                reactionsData={reactionsForBreakdownModal}
                usersMap={homeViewUsersMap}
            />

            <AdminBannerEditModal
                isOpen={isBannerEditModalOpen}
                onClose={() => setIsBannerEditModalOpen(false)}
                currentImageUrl={bannerSettings.imageUrl}
                currentEndDate={bannerSettings.endDate}
                onSaveSuccess={() => { /* onSnapshot will handle re-fetch */ }}
            />

            <style jsx>{`
                .default-banner-background {
                    background: linear-gradient(135deg, #f0f4f8 0%, #e0e7ee 100%);
                }
                .btn-primary-glow-light { background-color: #f43f5e; color: white; padding: 8px 16px; border-radius: 9999px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 0px 10px rgba(244, 63, 94, 0.3); }
                .btn-primary-glow-light:hover { background-color: #e11d48; box-shadow: 0 0px 15px rgba(244, 63, 94, 0.6); }
                .btn-secondary-light { background-color: #e5e7eb; color: #4b5563; padding: 8px 16px; border-radius: 9999px; font-weight: 600; transition: all 0.3s ease; }
                .btn-secondary-light:hover { background-color: #d1d5db; }
                .reaction-hover-popup, .reaction-hover-popup-homeview { position: absolute; background-color: rgba(0, 0, 0, 0.8); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.75rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); transition: opacity 0.2s ease, transform 0.2s ease; transform: translateX(-50%); white-space: nowrap; }
                .reaction-options-popup { position: absolute; background-color: white; border-radius: 9999px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); padding: 4px; display: flex; gap: 8px; align-items: center; transition: opacity 0.2s ease, transform 0.2s ease; }
                .reaction-button-group { position: relative; }
            `}</style>
        </div>
    );
};

export default HomeView;