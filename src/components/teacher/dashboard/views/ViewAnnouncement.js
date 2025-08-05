import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../../services/firebase';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { ArrowLeftIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
    HandThumbUpIcon, HeartIcon, RocketLaunchIcon,
    FaceSmileIcon, FaceFrownIcon, ExclamationTriangleIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';

// Helper function to format Firestore Timestamp or Date objects
const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';

    let date;
    
    // Explicitly check for Firestore Timestamp, JavaScript Date, and then other valid types
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
        // Attempt to create a Date object from number or string, but be cautious
        try {
            date = new Date(timestamp);
        } catch (error) {
            console.error("Error creating Date object from timestamp:", error);
            return 'Invalid Date';
        }
    } else {
        // Fallback for any other unexpected data types
        console.warn("Unexpected timestamp format:", timestamp);
        return 'Invalid Date';
    }

    // Double-check if the date object is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    return date.toLocaleString();
};

const avatarGradients = [
    'bg-gradient-to-br from-purple-500 to-indigo-500',
    'bg-gradient-to-br from-green-500 to-emerald-500',
    'bg-gradient-to-br from-rose-500 to-pink-500',
    'bg-gradient-to-br from-yellow-500 to-orange-500',
    'bg-gradient-to-br from-cyan-500 to-blue-500',
    'bg-gradient-to-br from-fuchsia-500 to-violet-500',
    'bg-gradient-to-br from-sky-500 to-indigo-500',
    'bg-gradient-to-br from-lime-500 to-green-500',
];

const TeacherAvatar = ({ name, userId }) => {
    // A failsafe check for the name prop before splitting it
    const initials = name && typeof name === 'string'
        ? name.split(' ').map(n => n[0]).join('').toUpperCase()
        : '?';
    const uniqueHash = userId ? userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const gradientIndex = uniqueHash % avatarGradients.length;
    const gradientClass = avatarGradients[gradientIndex];
    return (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-md ${gradientClass}`}>
            {initials.length > 0 ? initials : '?'}
        </div>
    );
};

const reactionIcons = {
    like: { icon: HandThumbUpIcon, color: 'text-blue-500', name: 'Like' },
    love: { icon: HeartIcon, color: 'text-rose-500', name: 'Love' },
    haha: { icon: FaceSmileIcon, color: 'text-yellow-500', name: 'Haha' },
    wow: { icon: RocketLaunchIcon, color: 'text-orange-500', name: 'Wow' },
    sad: { icon: FaceFrownIcon, color: 'text-purple-500', name: 'Sad' },
    angry: { icon: ExclamationTriangleIcon, color: 'text-red-500', name: 'Angry' },
};

const getReactionUsersTitle = (reactionType, reactionUsers) => {
    const users = reactionUsers[reactionType] || [];
    // Add a filter to ensure all user IDs are valid strings before joining
    const validUsers = users.filter(user => typeof user === 'string' && user.trim() !== '');
    if (validUsers.length === 0) return '';
    if (validUsers.length === 1) return `${reactionIcons[reactionType].name} by ${validUsers[0]}`;
    return `${reactionIcons[reactionType].name} by ${validUsers.join(', ')}`;
};

const ReactionButtons = ({ currentReaction, handleReaction }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleButtonClick = (reactionType) => {
        handleReaction(reactionType);
        setIsMenuOpen(false); // Close menu after a reaction is chosen
    };

    const handleMainButtonClick = (e) => {
        e.preventDefault();
        // If the menu is open, and a reaction exists, clicking again will remove the reaction
        if (isMenuOpen) {
            setIsMenuOpen(false);
        } else if (currentReaction) {
            handleButtonClick(currentReaction);
        } else {
            setIsMenuOpen(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    // Determine the icon and color based on the user's current reaction
    const ReactionIcon = currentReaction ? reactionIcons[currentReaction].icon : HandThumbUpIcon;
    const iconColor = currentReaction ? reactionIcons[currentReaction].color : 'text-gray-500';
    const reactionName = currentReaction ? reactionIcons[currentReaction].name : 'Like';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={handleMainButtonClick}
                className={`flex items-center gap-1 p-2 rounded-full transition-all duration-200 ease-in-out
                    ${currentReaction ? `bg-white shadow-lg border-2 border-${reactionIcons[currentReaction].color.split('-')[1]}-500 transform scale-105` : 'bg-gray-200 hover:bg-gray-300'}
                    ${iconColor}
                `}
                title={reactionName}
            >
                <ReactionIcon className="w-6 h-6" />
                <span className="text-sm font-medium text-gray-800">{reactionName}</span>
            </button>

            {isMenuOpen && (
                <div className="absolute bottom-full mb-2 flex items-center gap-1 p-2 rounded-full bg-white shadow-lg border border-gray-200 animate-fade-in-up">
                    {Object.keys(reactionIcons).map((key) => {
                        const Icon = reactionIcons[key].icon;
                        const isSelected = currentReaction === key;
                        
                        return (
                            <button
                                key={key}
                                onClick={() => handleButtonClick(key)}
                                className={`flex items-center gap-1 p-1 rounded-full transition-all duration-200 ease-in-out
                                    ${isSelected ? `bg-${reactionIcons[key].color.split('-')[1]}-100 transform scale-110` : 'hover:bg-gray-200'}
                                    ${reactionIcons[key].color}
                                `}
                                title={reactionIcons[key].name}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const CommentReactionButtons = ({ comment, userProfile, handleCommentReaction, commentIndex }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const userCurrentReaction = Object.keys(reactionIcons).find(type =>
        comment.reactionUsers?.[type]?.includes(userProfile.id)
    );

    const handleButtonClick = (reactionType) => {
        handleCommentReaction(commentIndex, reactionType);
        setIsMenuOpen(false); // Close menu after a reaction is chosen
    };

    const handleMainButtonClick = (e) => {
        e.preventDefault();
        // If the menu is open, and a reaction exists, clicking again will remove the reaction
        if (isMenuOpen) {
            setIsMenuOpen(false);
        } else if (userCurrentReaction) {
            handleButtonClick(userCurrentReaction);
        } else {
            setIsMenuOpen(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    // Determine the icon and color based on the user's current reaction
    const reactionCount = userCurrentReaction ? comment.reactions?.[userCurrentReaction] || 0 : 0;
    const ReactionIcon = userCurrentReaction ? reactionIcons[userCurrentReaction].icon : HandThumbUpIcon;
    const iconColor = userCurrentReaction ? reactionIcons[userCurrentReaction].color : 'text-gray-500';
    const reactionName = userCurrentReaction ? reactionIcons[userCurrentReaction].name : 'Like';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={handleMainButtonClick}
                className={`flex items-center gap-1 p-1 rounded-full transition-all duration-200 ease-in-out
                    ${userCurrentReaction ? `bg-white shadow-md border-2 border-${reactionIcons[userCurrentReaction].color.split('-')[1]}-500 transform scale-110` : 'hover:bg-gray-200'}
                    ${iconColor}
                `}
                title={reactionName}
            >
                <ReactionIcon className="w-5 h-5" />
                {reactionCount > 0 && <span className="text-xs font-medium text-gray-800">{reactionCount}</span>}
            </button>

            {isMenuOpen && (
                <div className="absolute bottom-full mb-2 flex items-center gap-1 p-2 rounded-full bg-white shadow-lg border border-gray-200 animate-fade-in-up">
                    {Object.keys(reactionIcons).map((key) => {
                        const Icon = reactionIcons[key].icon;
                        const isSelected = userCurrentReaction === key;
                        
                        return (
                            <button
                                key={key}
                                onClick={() => handleButtonClick(key)}
                                className={`flex items-center gap-1 p-1 rounded-full transition-all duration-200 ease-in-out
                                    ${isSelected ? `bg-${reactionIcons[key].color.split('-')[1]}-100 transform scale-110` : 'hover:bg-gray-200'}
                                    ${reactionIcons[key].color}
                                `}
                                title={reactionIcons[key].name}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const ViewAnnouncement = ({ announcementId, userProfile, onBack }) => {
    const [announcement, setAnnouncement] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userReaction, setUserReaction] = useState(null);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (!announcementId || !userProfile?.id) {
            setIsLoading(false);
            return;
        }

        const announcementDocRef = doc(db, 'teacherAnnouncements', announcementId);
        const unsubscribe = onSnapshot(announcementDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = { id: docSnap.id, ...docSnap.data() };

                // Get all unique commenter IDs
                let uniqueUserIds = new Set(data.comments?.map(c => c.userId) || []);
                
                // Add all unique user IDs from reactions (both on announcement and comments)
                Object.values(data.reactionUsers || {}).forEach(ids => ids.forEach(id => uniqueUserIds.add(id)));
                data.comments?.forEach(comment => {
                    Object.values(comment.reactionUsers || {}).forEach(ids => ids.forEach(id => uniqueUserIds.add(id)));
                });
                
                // Filter out any invalid (falsy) user IDs before fetching
                const profilesToFetch = Array.from(uniqueUserIds).filter(Boolean);

                // Fetch all profiles in parallel
                const fetchedProfiles = await Promise.all(
                    profilesToFetch.map(async (userId) => {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            return {
                                userId,
                                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User'
                            };
                        }
                        return { userId, name: 'Unknown User' };
                    })
                );

                // Create a map from the fetched profiles
                const profileMap = fetchedProfiles.reduce((acc, profile) => {
                    acc[profile.userId] = profile.name;
                    return acc;
                }, {});
                
                // Add the commenterName to each comment object before setting state
                const commentsWithNames = data.comments?.map(comment => ({
                    ...comment,
                    commenterName: profileMap[comment.userId] || 'Unknown User'
                }));

                const updatedAnnouncement = {
                    ...data,
                    comments: commentsWithNames || []
                };

                setAnnouncement(updatedAnnouncement);
                
                // Determine the user's current reaction on the main post
                const foundReaction = Object.keys(reactionIcons).find(reactionType =>
                    data.reactionUsers?.[reactionType]?.includes(userProfile?.id)
                );
                setUserReaction(foundReaction);
            } else {
                setAnnouncement(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching announcement:", error);
            setAnnouncement(null);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [announcementId, userProfile?.id]);

    const handleReaction = async (reactionType) => {
        if (!announcement || !userProfile || !userProfile.id) return;

        const announcementDocRef = doc(db, 'teacherAnnouncements', announcement.id);
        const batchUpdates = {};

        if (userReaction === reactionType) {
            batchUpdates[`reactions.${reactionType}`] = (announcement.reactions?.[reactionType] || 0) - 1;
            batchUpdates[`reactionUsers.${reactionType}`] = (announcement.reactionUsers?.[reactionType] || []).filter(id => id !== userProfile.id);
            setUserReaction(null);
        } else {
            if (userReaction) {
                batchUpdates[`reactions.${userReaction}`] = (announcement.reactions?.[userReaction] || 0) - 1;
                batchUpdates[`reactionUsers.${userReaction}`] = (announcement.reactionUsers?.[userReaction] || []).filter(id => id !== userProfile.id);
            }
            batchUpdates[`reactions.${reactionType}`] = (announcement.reactions?.[reactionType] || 0) + 1;
            batchUpdates[`reactionUsers.${reactionType}`] = [...(announcement.reactionUsers?.[reactionType] || []), userProfile.id];
            setUserReaction(reactionType);
        }
        
        try {
            await updateDoc(announcementDocRef, batchUpdates);
        } catch (error) {
            console.error("Error updating reaction:", error);
            setUserReaction(userReaction); // Revert state on error
        }
    };
    
    const handleCommentReaction = async (commentIndex, reactionType) => {
        if (!announcement || !userProfile || !userProfile.id) return;
        
        const announcementDocRef = doc(db, 'teacherAnnouncements', announcement.id);
        const comments = [...(announcement.comments || [])];
        const comment = comments[commentIndex];

        comment.reactions = comment.reactions || {};
        comment.reactionUsers = comment.reactionUsers || {};
        
        const userCurrentReaction = Object.keys(reactionIcons).find(type =>
            comment.reactionUsers?.[type]?.includes(userProfile.id)
        );

        if (userCurrentReaction === reactionType) {
            // User is removing their reaction
            comment.reactions[reactionType] = (comment.reactions[reactionType] || 0) - 1;
            comment.reactionUsers[reactionType] = comment.reactionUsers[reactionType].filter(id => id !== userProfile.id);
        } else {
            // User is changing or adding a reaction
            if (userCurrentReaction) {
                // Remove old reaction
                comment.reactions[userCurrentReaction] = (comment.reactions[userCurrentReaction] || 0) - 1;
                comment.reactionUsers[userCurrentReaction] = comment.reactionUsers[userCurrentReaction].filter(id => id !== userProfile.id);
            }
            // Add new reaction
            comment.reactions[reactionType] = (comment.reactions[reactionType] || 0) + 1;
            comment.reactionUsers[reactionType] = [...(comment.reactionUsers[reactionType] || []), userProfile.id];
        }

        try {
            await updateDoc(announcementDocRef, { comments });
        } catch (error) {
            console.error("Error updating comment reaction:", error);
        }
    };
    
    const handleEditAnn = () => {
        // Implement edit logic here
    };
    
    const handleDeleteAnn = () => {
        // Implement delete logic here
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !announcement || !userProfile?.id) return;

        try {
            const announcementDocRef = doc(db, 'teacherAnnouncements', announcement.id);
            await updateDoc(announcementDocRef, {
                comments: [...(announcement.comments || []), {
                    userId: userProfile.id,
                    content: newComment,
                    createdAt: new Date(),
                    reactions: {},
                    reactionUsers: {},
                }]
            });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };
    
    const handleReply = (commenterName) => {
        setNewComment(`@${commenterName} `);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!announcement) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>Announcement not found.</p>
                <button onClick={onBack} className="mt-4 text-primary-500 hover:underline flex items-center justify-center">
                    <ArrowLeftIcon className="w-5 h-5 mr-1" />
                    Back to Dashboard
                </button>
            </div>
        );
    }
    
    if (!userProfile) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>User profile not loaded. Please try again later.</p>
                <button onClick={onBack} className="mt-4 text-primary-500 hover:underline flex items-center justify-center">
                    <ArrowLeftIcon className="w-5 h-5 mr-1" />
                    Back to Dashboard
                </button>
            </div>
        )
    }

    const canModify = userProfile?.role === 'admin' || userProfile?.id === announcement.teacherId;
    const sortedReactions = announcement.reactions ? Object.entries(announcement.reactions)
        .filter(([key, count]) => count > 0 && reactionIcons[key])
        .sort(([, countA], [, countB]) => countB - countA) : [];

    return (
        <div className="relative min-h-screen p-4 md:p-8 bg-gray-100 text-gray-800 font-sans overflow-hidden rounded-3xl">
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow"></div>
                <div className="absolute bottom-20 -right-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-spin-slow-reverse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-spin-slow animation-delay-4000"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto space-y-8 pb-32">
                <button
                    onClick={onBack}
                    className="flex items-center text-lg font-medium text-gray-600 hover:text-primary-500 transition-colors duration-200"
                >
                    <ArrowLeftIcon className="w-6 h-6 mr-2" />
                    Back
                </button>

                <div className="bg-white p-8 rounded-3xl shadow-2xl animate-fade-in-down">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <TeacherAvatar name={announcement.teacherName} userId={announcement.teacherId} />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">{announcement.teacherName}</h1>
                                <p className="text-gray-500 text-sm mt-1">
                                    Posted: {formatTimestamp(announcement.createdAt)}
                                </p>
                            </div>
                        </div>
                        {canModify && (
                            <div className="flex gap-2">
                                <button onClick={handleEditAnn} className="p-2 rounded-full text-gray-500 hover:text-primary-500 transition-colors" title="Edit">
                                    <PencilSquareIcon className="w-6 h-6" />
                                </button>
                                <button onClick={handleDeleteAnn} className="p-2 rounded-full text-gray-500 hover:text-rose-500 transition-colors" title="Delete">
                                    <TrashIcon className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="mt-6 text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">{announcement.content}</p>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                {sortedReactions.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        {sortedReactions.map(([key, count]) => {
                                            const Icon = reactionIcons[key].icon;
                                            const titleText = getReactionUsersTitle(key, announcement.reactionUsers || {});
                                            return (
                                                <div
                                                    key={key}
                                                    className={`flex items-center gap-1 p-2 rounded-full bg-gray-100 transition-colors cursor-default ${reactionIcons[key].color}`}
                                                    title={titleText}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="text-sm font-medium">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 font-medium">
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                {announcement.comments?.length || 0} Comments
                            </div>
                        </div>

                        {/* Reaction buttons for main announcement */}
                        <div className="flex items-center gap-4 mt-4 p-4 border rounded-2xl bg-gray-50 animate-fade-in-up">
                            <ReactionButtons 
                                currentReaction={userReaction}
                                handleReaction={handleReaction}
                            />
                        </div>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-gray-800">Comments</h3>
                        <div className="mt-4 space-y-4">
                            {announcement.comments?.length > 0 ? (
                                announcement.comments.map((comment, index) => (
                                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl shadow-sm">
                                        <TeacherAvatar name={comment.commenterName} userId={comment.userId} />
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800">{comment.commenterName}</div>
                                            <div className="text-sm text-gray-500">
                                                {formatTimestamp(comment.createdAt)}
                                            </div>
                                            <p className="mt-2 text-gray-700">{comment.content}</p>

                                            <div className="mt-3 flex items-center gap-4 text-sm">
                                                <CommentReactionButtons 
                                                    comment={comment}
                                                    userProfile={userProfile}
                                                    handleCommentReaction={handleCommentReaction}
                                                    commentIndex={index}
                                                />
                                                <button 
                                                    onClick={() => handleReply(comment.commenterName)}
                                                    className="text-gray-500 hover:underline hover:text-primary-500 transition-colors"
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-gray-400 py-8">No comments yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Sticky Comment Box */}
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white shadow-2xl p-4 md:p-6 border-t border-gray-200">
                <div className="max-w-4xl mx-auto flex items-start gap-4">
                    <TeacherAvatar name={`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim()} userId={userProfile.id} />
                    <form onSubmit={handleAddComment} className="flex-1 flex items-start gap-2">
                        <textarea
                            className="flex-1 p-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800 placeholder-gray-400 resize-none max-h-24 overflow-y-auto"
                            rows="1"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        ></textarea>
                        <button
                            type="submit"
                            className="btn-primary-glow-light px-6 py-3 rounded-2xl self-end"
                        >
                            Post
                        </button>
                    </form>
                </div>
            </div>

            <style jsx>{`
                .btn-primary-glow-light {
                    background-color: #f43f5e;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    box-shadow: 0 0px 10px rgba(244, 63, 94, 0.3);
                }
                .animate-fade-in-down {
                    animation: fadeInDown 0.8s ease-out;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.8s ease-out;
                }
                .animate-spin-slow {
                    animation: spin 30s linear infinite;
                }
                .animate-spin-slow-reverse {
                    animation: spin-reverse 30s linear infinite;
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
            `}</style>
        </div>
    );
};

export default ViewAnnouncement;