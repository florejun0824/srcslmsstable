import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    Pencil,
    Trash2,
    Megaphone,
    CalendarDays,
    Clock,
    Pin,
    MessageCircle,
    ThumbsUp
} from 'lucide-react';

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
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

const NativeEmoji = ({ emoji, ...props }) => <span {...props}>{emoji}</span>;

const reactionIconsHomeView = {
    like: { component: (props) => <NativeEmoji emoji="👍" {...props} />, color: 'text-blue-500', label: 'Like' },
    heart: { component: (props) => <NativeEmoji emoji="❤️" {...props} />, color: 'text-red-500', label: 'Love' },
    haha: { component: (props) => <NativeEmoji emoji="😂" {...props} />, color: 'text-yellow-500', label: 'Haha' },
    wow: { component: (props) => <NativeEmoji emoji="😮" {...props} />, color: 'text-amber-500', label: 'Wow' },
    sad: { component: (props) => <NativeEmoji emoji="😢" {...props} />, color: 'text-slate-500', label: 'Sad' },
    angry: { component: (props) => <NativeEmoji emoji="😡" {...props} />, color: 'text-red-700', label: 'Angry' },
    care: { component: (props) => <NativeEmoji emoji="🤗" {...props} />, color: 'text-pink-500', label: 'Care' }
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
            return dateB - a;
        });
    }, [teacherAnnouncements]);

    const toggleAnnouncementExpansion = (announcementId) => {
        setExpandedAnnouncements(prev => ({
            ...prev,
            [announcementId]: !prev[announcementId]
        }));
    };

    const currentUserId = userProfile?.id;

    const fetchUsersData = useCallback(async (userIds) => {
        const usersToFetch = [...new Set(userIds.filter(id => id && !homeViewUsersMap[id]))];
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
            
            setHomeViewUsersMap(prev => ({ ...prev, ...newUsersData }));
        } catch (error) {
            console.error("Error fetching users data:", error);
        }
    }, [homeViewUsersMap]);


    useEffect(() => {
        if (!Array.isArray(teacherAnnouncements) || teacherAnnouncements.length === 0) {
            setHomeViewPostReactions({});
            return;
        };

        const announcementIds = teacherAnnouncements.map(a => a.id).filter(Boolean);
        if(announcementIds.length === 0) return;
        
        const allUserIds = new Set(teacherAnnouncements.map(a => a.teacherId).filter(Boolean));
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

            setHomeViewPostReactions(newReactionsByAnnouncement);
            fetchUsersData(Array.from(allUserIds));
        }, (error) => {
            console.error("Error fetching reactions:", error);
        });

        return () => unsubscribe();
    }, [teacherAnnouncements, fetchUsersData]);


    useEffect(() => {
        const unsubscribe = onSnapshot(scheduleCollectionRef, (snapshot) => {
            const fetchedSchedules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setScheduleActivities(fetchedSchedules);
        }, (error) => {
            console.error("Error listening to schedules:", error);
            showToast("Failed to load schedules in real-time.", "error");
        });

        return () => unsubscribe();
    }, [showToast]);


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

	const handleCloseAnnouncementModal = () => {
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

        const reactionDocId = `${currentUserId}_${announcementId}`;
        const reactionRef = doc(db, 'reactions', reactionDocId);
        const existingReactionType = homeViewPostReactions[announcementId]?.[currentUserId];


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
			<div className="flex items-center">
			    {Object.values(safeReactions).map((reactionType, index) => {
			        const reaction = reactionIconsHomeView[reactionType];
			        if (!reaction) return null;
			        const { component: Icon } = reaction;
        
			        // We use a simple index for the key as reaction types are no longer unique
			        return (
			            <div
			                key={index} 
			                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-white ring-2 ring-white ${index > 0 ? '-ml-2' : ''}`}
			                style={{ zIndex: Object.values(safeReactions).length - index }}
			            >
			                <Icon className="text-xl" />
			            </div>
			        );
			    })}
			</div>
                <span className="text-sm text-gray-600 font-medium ml-2">{Object.keys(safeReactions).length}</span>
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute z-50 bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg"
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
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, ease: "easeInOut" }
    };

    return (
        <div className="relative min-h-screen p-3 sm:p-4 md:p-6 bg-gray-50 text-gray-800 font-sans overflow-hidden rounded-3xl">
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-200/40 rounded-full filter blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-200/40 rounded-full filter blur-3xl opacity-50"></div>
            </div>

            <div className="relative z-10 space-y-4 md:space-y-6">
                <motion.header
                    {...fadeProps}
                    className="relative p-4 md:p-6 bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 overflow-hidden"
                >
                    {isSpecialBannerActive ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full items-center">
                            <div className="col-span-1 text-center md:text-left">
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 drop-shadow-sm leading-tight">
                                    Welcome, {userProfile?.firstName}!
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">Here's your dashboard at a glance.</p>
                            </div>

                            <div
                                className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                                onClick={userProfile?.role === 'admin' ? handleBannerImageClick : undefined}
                                style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                            >
                                <motion.img
                                    src={bannerSettings.imageUrl}
                                    alt="Promotional Banner"
                                    className="block h-24 md:h-36 w-auto object-contain p-1 drop-shadow-lg"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x38/E0E7EE/888888?text=Image+Load+Error'; }}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 120, damping: 15 }}
                                />
                            </div>

                            <div className="col-span-1 flex items-center justify-center h-full">
                                <div className="bg-white text-gray-800 rounded-2xl shadow-md border border-gray-200/50 w-full h-full p-4 flex flex-col justify-between">
                                    <p className="font-bold text-indigo-700 flex items-center gap-2">
                                        <CalendarDays className="w-5 h-5" />
                                        <span className="text-lg">Today's Schedule</span>
                                    </p>
                                    
                                    <div className="flex-grow flex items-center justify-center text-center">
                                        <AnimatePresence mode="wait">
                                            {todayActivities.length > 0 && todayActivities[currentActivityIndex] ? (
                                                <motion.div
                                                    key={todayActivities[currentActivityIndex].id}
                                                    className="flex flex-col items-center justify-center"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <span className="font-bold text-xl text-indigo-900 leading-tight block">{todayActivities[currentActivityIndex].title}</span>
                                                    {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && (
                                                        <span className="flex items-center text-md justify-center mt-1 text-gray-700 font-light">
                                                            <Clock className="w-4 h-4 mr-2 opacity-70" /> {todayActivities[currentActivityIndex].time}
                                                        </span>
                                                    )}
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="no-activities"
                                                    className="text-center"
                                                    {...fadeProps}
                                                >
                                                   <p className="text-lg font-semibold text-gray-500">All Clear!</p>
                                                   <p className="text-sm text-gray-400">No activities scheduled.</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <p className="text-xs text-center pt-2 opacity-90 border-t border-indigo-200/80 text-gray-700">Stay on top of your day!</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full py-4">
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 drop-shadow-sm leading-tight">
                                     Welcome, {userProfile?.firstName}!
                                </h1>
                                <p className="text-base md:text-lg text-gray-600 mt-2">Here's your dashboard at a glance.</p>
                            </div>
                            <div className="mt-6 md:mt-0 md:ml-6 p-4 bg-white text-gray-800 rounded-2xl shadow-lg border border-gray-200/50 w-full max-w-sm flex-shrink-0 flex flex-col justify-between">
                                <p className="font-bold text-indigo-700 flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5" />
                                    <span className="text-lg">Today's Schedule</span>
                                </p>
                                <div className="flex-grow flex items-center justify-center text-center py-4">
                                    <AnimatePresence mode="wait">
                                        {todayActivities.length > 0 && todayActivities[currentActivityIndex] ? (
                                            <motion.div
                                                key={todayActivities[currentActivityIndex].id}
                                                className="flex flex-col items-center justify-center"
                                                {...fadeProps}
                                            >
                                                <span className="font-bold text-2xl text-indigo-900 leading-tight block">{todayActivities[currentActivityIndex].title}</span>
                                                {todayActivities[currentActivityIndex].time && todayActivities[currentActivityIndex].time !== 'N/A' && (
                                                    <span className="flex items-center text-xl justify-center mt-1 text-gray-700 font-light">
                                                        <Clock className="w-4 h-4 mr-2 opacity-70" /> {todayActivities[currentActivityIndex].time}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="no-activities"
                                                className="text-center"
                                                {...fadeProps}
                                            >
                                               <p className="text-lg font-semibold text-gray-500">All Clear!</p>
                                               <p className="text-sm text-gray-400">No activities scheduled.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <p className="text-xs text-center pt-2 opacity-90 border-t border-indigo-200/80 text-gray-700">Stay on top of your day!</p>
                            </div>
                        </div>
                    )}
                </motion.header>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    <motion.div {...fadeProps} transition={{ duration: 0.4, delay: 0.1 }}>
                        <ClockWidget className="rounded-3xl shadow-lg transition-transform transform hover:-translate-y-1 duration-300 ease-in-out hover:shadow-xl border border-white/50" />
                    </motion.div>
                    <motion.div {...fadeProps} transition={{ duration: 0.4, delay: 0.2 }}>
                        <InspirationCard className="rounded-3xl shadow-lg transition-transform transform hover:-translate-y-1 duration-300 ease-in-out hover:shadow-xl border border-white/50" />
                    </motion.div>
                    <motion.div
                        {...fadeProps}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-lg flex items-center justify-center flex-col text-center cursor-pointer transition-transform transform hover:-translate-y-1 duration-300 ease-in-out border border-white/50"
                        onClick={() => setIsScheduleModalOpen(true)}
                    >
                        <CalendarDays className="h-10 w-10 text-indigo-500 mb-2" />
                        <h3 className="font-bold text-gray-800 text-lg">Schedule of Activities</h3>
                        <p className="text-sm text-gray-600 mt-1">Click to view what's coming up.</p>
                    </motion.div>
                    <motion.div
                        {...fadeProps}
                        transition={{ duration: 0.4, delay: 0.4 }}
                        className="cursor-pointer transition-transform transform hover:-translate-y-1 duration-300 ease-in-out hover:shadow-xl"
                        onClick={() => handleViewChange('classes')}
                    >
                        <GradientStatCard
                            title="Active Classes"
                            value={activeClasses.length}
                            icon={<GraduationCap />}
                            gradient="from-green-500 to-emerald-600"
                            className="rounded-3xl shadow-lg"
                        />
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <motion.div
                        {...fadeProps}
                        transition={{ duration: 0.4 }}
                        className="lg:col-span-1 p-6 bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-white/50"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-indigo-100 p-3 rounded-2xl">
                                <Megaphone className="w-6 h-6 text-indigo-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Create Announcement</h2>
                            </div>
                        </div>
                        <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
                    </motion.div>

                    <div className="lg:col-span-2 space-y-6">
                        <motion.div {...fadeProps} className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-800">Activity Feed</h2>
                        </motion.div>
                        <AnimatePresence>
                            {sortedAnnouncements && sortedAnnouncements.length > 0 ? sortedAnnouncements.map((post, index) => {
                                const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
                                const postReactionsForThisPost = post.id ? (homeViewPostReactions[post.id] || {}) : {};
                                const currentUserReaction = postReactionsForThisPost[currentUserId];
                                const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;
                                const showFullAnnouncement = expandedAnnouncements[post.id];
                                const authorProfile = homeViewUsersMap[post.teacherId];
                          

                                const {
                                    component: ReactionButtonIcon,
                                    label: reactionLabel,
                                    color: reactionColor
                                } = currentUserReaction && reactionIconsHomeView[currentUserReaction]
                                    ? reactionIconsHomeView[currentUserReaction]
                                    : { component: ThumbsUp, label: 'Like', color: 'text-gray-600' };


                                return (
                                    <motion.div
                                        key={post.id}
                                        {...fadeProps}
                                        transition={{ duration: 0.4, delay: index * 0.05 }}
                                        className={`bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg p-6 relative group transform transition-all duration-300 hover:shadow-xl border ${post.isPinned ? 'border-amber-400 ring-2 ring-amber-200' : 'border-white/50'}`}
                                    >
                                        {post.isPinned && (
                                            <div className="absolute top-4 left-4 flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-semibold z-10">
                                                <Pin className="w-3 h-3" />
                                                <span>Pinned</span>
                                            </div>
                                        )}
                                        <div className={`flex items-start mb-4 ${post.isPinned ? 'pt-8' : ''}`}>
                                            <div className="w-10 h-10 flex-shrink-0">
                                                <UserInitialsAvatar user={authorProfile} size="w-10 h-10" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="font-bold text-gray-800">{post.teacherName}</p>
                                                <p className="text-xs text-gray-500">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</p>
                                            </div>
                                            {canModify && (
                                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/50 backdrop-blur-sm rounded-full p-1">
                                                     {userProfile?.role === 'admin' && (
                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleTogglePinAnnouncement(post.id, post.isPinned); }} className={`p-2 rounded-full hover:bg-gray-100 transition ${post.isPinned ? 'text-amber-500' : 'text-gray-500'}`} title={post.isPinned ? "Unpin Announcement" : "Pin Announcement"}>
                                                            <Pin className="w-5 h-5" />
                                                        </motion.button>
                                                    )}
                                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleStartEditAnn(post); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Edit Announcement">
                                                        <Pencil className="w-5 h-5 text-gray-500" />
                                                    </motion.button>
                                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleDeleteTeacherAnn(post.id); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Delete Announcement">
                                                        <Trash2 className="w-5 h-5 text-red-500" />
                                                    </motion.button>
                                                </div>
                                            )}
                                        </div>

                                        {editingAnnId === post.id ? (
                                            <>
                                                <textarea
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-gray-800 resize-none mb-4"
                                                    rows="5"
                                                    value={editingAnnText}
                                                    onChange={(e) => setEditingAnnText(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button className="px-4 py-2 rounded-full font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors" onClick={(e) => { e.stopPropagation(); setEditingAnnId(null); }}>Cancel</button>
                                                    <button className="px-4 py-2 rounded-full font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/20" onClick={(e) => { e.stopPropagation(); handleUpdateTeacherAnn(); }}>Save</button>
                                                </div>
                                            </>
                                        ) : (
                                            post.content && (
                                                <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                                                    {isTruncated && !showFullAnnouncement
                                                        ? post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...'
                                                        : post.content}
                                                    {isTruncated && (
                                                        <button
                                                            onClick={() => toggleAnnouncementExpansion(post.id)}
                                                            className="text-blue-500 hover:underline ml-1 font-semibold"
                                                        >
                                                            {showFullAnnouncement ? 'Show Less' : 'See More'}
                                                        </button>
                                                    )}
                                                </p>
                                            )
                                        )}
                                        
                                        {post.photoURL && (
                                            <div className="mt-4">
                                                <img 
                                                    src={post.photoURL} 
                                                    alt="Announcement" 
                                                    className="rounded-xl max-h-96 w-full object-contain bg-gray-100"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                {post.caption && (
                                                    <p className="text-sm text-gray-600 mt-2 text-center italic">{post.caption}</p>
                                                )}
                                            </div>
                                        )}

										{((postReactionsForThisPost && Object.keys(postReactionsForThisPost).length > 0) || (post.commentsCount || 0) > 0) && (
										    <div className="flex justify-between items-center text-sm text-gray-500 mt-4">
										        {formatReactionCountHomeView(postReactionsForThisPost, post.id)}
										        <span className="cursor-pointer hover:underline font-medium" onClick={() => openAnnouncementModal(post)}>
										            View Comments
										        </span>
										    </div>
										)}

                                        <div className="flex justify-around items-center pt-3 mt-4 border-t border-gray-200/80">
                                            <div
                                                className="relative"
                                                onMouseEnter={(e) => handleReactionOptionsMouseEnter(e, post.id)}
                                                onMouseLeave={handleReactionOptionsMouseLeave}
                                                onTouchStart={(e) => handleTouchStart(e, post.id)}
                                                onTouchEnd={handleTouchEnd}
                                                onTouchMove={handleTouchMove}
                                            >
                                                <motion.button
                                                    whileHover={{ y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors duration-200 w-full justify-center ${currentUserReaction ? reactionColor : 'text-gray-600'} hover:bg-gray-100/80`}
                                                    onClick={() => handleTogglePostReactionHomeView(post.id, 'like')}
                                                >
                                                    {currentUserReaction ? (
                                                        <motion.div
                                                            key={currentUserReaction}
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="w-6 h-6 flex items-center justify-center"
                                                        >
                                                            <ReactionButtonIcon className="text-2xl" />
                                                        </motion.div>
                                                    ) : (
                                                        <ThumbsUp className="h-5 w-5" />
                                                    )}
                                                    <span className="font-semibold">{reactionLabel}</span>
                                                </motion.button>

                                                <AnimatePresence>
                                                    {hoveredHomeViewReactionData && hoveredHomeViewReactionData.type === 'options' && hoveredHomeViewReactionData.id === post.id && (
                                                        <motion.div
                                                            ref={hoverReactionOptionsRef}
                                                            initial="hidden"
                                                            animate="visible"
                                                            exit="hidden"
                                                            variants={{
                                                                visible: { transition: { staggerChildren: 0.05 } },
                                                                hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
                                                            }}
                                                            className="absolute bottom-full mb-2 bg-white/80 backdrop-blur-md rounded-full shadow-xl p-2 flex space-x-1 z-50 border border-gray-200/50"
                                                        >
                                                            {Object.entries(reactionIconsHomeView).map(([type, { component: IconComponent, label }]) => (
                                                                <motion.button
                                                                    key={type}
                                                                    variants={{
                                                                        hidden: { opacity: 0, y: 10 },
                                                                        visible: { opacity: 1, y: 0 }
                                                                    }}
                                                                    whileHover={{ scale: 1.3, y: -8 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                                                    className="p-1 rounded-full group/reaction relative"
                                                                    onClick={() => handleReactionOptionClick(post.id, type)}
                                                                >
                                                                    <IconComponent className="text-4xl" />
                                                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover/reaction:opacity-100 transition-opacity whitespace-nowrap">
                                                                        {label}
                                                                    </div>
                                                                </motion.button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <motion.button
                                                whileHover={{ y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="flex items-center space-x-2 py-2 px-4 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                                                onClick={() => openAnnouncementModal(post)}
                                            >
                                                <MessageCircle className="h-5 w-5" />
                                                <span className="font-semibold">Comment</span>
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <motion.div
                                    key="no-announcements"
                                    {...fadeProps}
                                    className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-300 rounded-3xl bg-gray-100/50"
                                >
                                    <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <p className="text-lg font-semibold">No new announcements.</p>
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

            {isAnnouncementModalOpen && (
                <AnnouncementModal
                    isOpen={isAnnouncementModalOpen}
                    onClose={handleCloseAnnouncementModal} // --- FIX: Use the new handler ---
                    announcement={selectedAnnouncement}
                    userProfile={userProfile}
                    db={db}
                    postReactions={selectedAnnouncement ? homeViewPostReactions[selectedAnnouncement.id] : {}}
                    onToggleReaction={handleTogglePostReactionHomeView}
                    usersMap={homeViewUsersMap}
                />
            )}

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
        </div>
    );
};

export default HomeView;