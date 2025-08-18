import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes, FaPaperPlane, FaReply, FaEdit, FaTrash, FaComment,
} from 'react-icons/fa';

import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import ReactionsBreakdownModal from './ReactionsBreakdownModal';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar'; // Import the unified avatar component

const COMMENT_TRUNCATE_LENGTH = 150; // Max characters before truncation
const reactionTypes = ["like", "love", "haha", "wow", "sad", "angry", "care"]; // Define available reaction types

// Lightweight inline emoji component from HomeView.js
const FacebookEmoji = ({ type = 'like', size = 18, className = '' }) => {
    const map = {
        like: '👍',
        love: '❤️',
        haha: '😆',
        wow: '😮',
        sad: '😢',
        angry: '😡',
        care: '🤗',
    };
    const labelMap = {
        like: 'Like',
        love: 'Love',
        haha: 'Haha',
        wow: 'Wow',
        sad: 'Sad',
        angry: 'Angry',
        care: 'Care',
    };
    return (
        <span
            className={className}
            role="img"
            aria-label={labelMap[type]}
            style={{ fontSize: size }}
        >
            {map[type]}
        </span>
    );
};

const AnnouncementModal = ({ isOpen, onClose, announcement, userProfile, db }) => {
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [replyToCommentId, setReplyToCommentId] = useState(null);
    const [replyToUserName, setReplyToUserName] = useState('');
    const [postReactions, setPostReactions] = useState({});
    const [commentReactions, setCommentReactions] = useState({});
    const [usersMap, setUsersMap] = useState({}); // Stores full user objects {userId: {firstName, lastName, photoURL, id}}
    const [hoveredReactionData, setHoveredReactionData] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);
    const [expandedComments, setExpandedComments] = useState({});
    const timeoutRef = useRef(null);
    const hoverReactionOptionsRef = useRef(null);

    const currentUserId = userProfile?.id;
    const currentUserName = `${userProfile?.firstName} ${userProfile?.lastName}`;
    const isAdmin = userProfile?.role === 'admin';

    const commentsCollectionRef = announcement?.id ? collection(db, `teacherAnnouncements/${announcement.id}/comments`) : null;
    const postReactionsCollectionRef = announcement?.id ? collection(db, `teacherAnnouncements/${announcement.id}/reactions`) : null;

    const convertTimestampToDate = (timestamp) => {
        if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp instanceof Date) return timestamp;
        try { return new Date(timestamp); }
        catch (e) { console.error("Could not convert timestamp:", timestamp, e); return null; }
    };

    const formatRelativeTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks}w`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo`;
        const years = Math.floor(days / 365);
        return `${years}y`;
    };

    // Helper function to fetch user data (including photoURL)
    const fetchUsersData = async (userIds, dbInstance, currentUserProfile, setUsersMap) => {
        const usersData = {};
        if (userIds.length === 0) return;

        const uniqueUserIds = [...new Set(userIds)];

        if (currentUserProfile?.id) {
            usersData[currentUserProfile.id] = { ...currentUserProfile, id: currentUserProfile.id };
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
                    usersData[uid] = { firstName: 'Unknown', lastName: 'User', photoURL: null, id: uid };
                }
            } catch (error) {
                console.warn(`Could not fetch user data for ID ${uid}:`, error);
                usersData[uid] = { firstName: 'Error', lastName: 'User', photoURL: null, id: uid };
            }
        });

        await Promise.all(promises);
        setUsersMap(prev => ({ ...prev, ...usersData }));
    };

    // Combined useEffect to manage all listeners and data fetching
    useEffect(() => {
        if (!isOpen || !announcement?.id) {
            // Clean up all state when the modal is closed
            setComments([]);
            setPostReactions({});
            setCommentReactions({});
            setUsersMap({});
            setHoveredReactionData(null);
            clearTimeout(timeoutRef.current);
            setExpandedComments({});
            return;
        }

        const unsubscribes = [];
        const allUserIds = new Set();
        allUserIds.add(announcement.teacherId);
        if (userProfile?.id) {
            allUserIds.add(userProfile.id);
        }

        // 1. Listener for Comments
        const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
        unsubscribes.push(onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: convertTimestampToDate(doc.data().createdAt)
            }));
            setComments(fetchedComments);
            fetchedComments.forEach(comment => allUserIds.add(comment.userId));

            // Set up comment reaction listeners
            const commentReactionUnsubs = [];
            const newCommentReactions = {};
            fetchedComments.forEach(comment => {
                const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${comment.id}/reactions`);
                const unsubscribeCommentReactions = onSnapshot(commentReactionsRef, (reactionSnap) => {
                    const reactionsForThisComment = {};
                    reactionSnap.docs.forEach(rDoc => {
                        reactionsForThisComment[rDoc.id] = rDoc.data().reactionType;
                        allUserIds.add(rDoc.id);
                    });
                    newCommentReactions[comment.id] = reactionsForThisComment;
                    setCommentReactions(prev => ({
                        ...prev,
                        [comment.id]: reactionsForThisComment
                    }));
                }, (error) => {
                    console.error(`Error fetching reactions for comment ${comment.id}:`, error);
                });
                commentReactionUnsubs.push(unsubscribeCommentReactions);
            });
            // Return a cleanup function for the comment reaction listeners
            unsubscribes.push(() => commentReactionUnsubs.forEach(unsub => unsub()));

            fetchUsersData([...allUserIds], db, userProfile, setUsersMap);
        }, (error) => {
            console.error("Error fetching comments:", error);
        }));

        // 2. Listener for Post Reactions
        if (postReactionsCollectionRef) {
            unsubscribes.push(onSnapshot(postReactionsCollectionRef, (snapshot) => {
                const fetchedPostReactions = {};
                snapshot.docs.forEach(doc => {
                    fetchedPostReactions[doc.id] = doc.data().reactionType;
                    allUserIds.add(doc.id);
                });
                setPostReactions(fetchedPostReactions);
                fetchUsersData([...allUserIds], db, userProfile, setUsersMap);
            }, (error) => {
                console.error("Error fetching post reactions:", error);
            }));
        }

        // Cleanup function for when the modal closes or dependencies change
        return () => unsubscribes.forEach(unsub => unsub());

    }, [isOpen, announcement?.id, db, userProfile, commentsCollectionRef, postReactionsCollectionRef]);


    const handlePostComment = async () => {
        if (!newCommentText.trim() || !commentsCollectionRef) return;
        try {
            await addDoc(commentsCollectionRef, {
                userId: currentUserId,
                userName: currentUserName,
                commentText: newCommentText.trim(),
                createdAt: new Date(),
                parentId: replyToCommentId,
            });
            setNewCommentText('');
            setReplyToCommentId(null);
            setReplyToUserName('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const handleReplyClick = (commentId, userName) => {
        setReplyToCommentId(commentId);
        setReplyToUserName(userName);
        setNewCommentText(`@${userName} `);
    };

    const handleTogglePostReaction = async (reactionType) => {
        if (!currentUserId || !postReactionsCollectionRef) return;
        const userReactionRef = doc(postReactionsCollectionRef, currentUserId);
        const existingReactionType = postReactions[currentUserId];
        try {
            // Update UI state immediately to prevent flicker
            const newPostReactions = { ...postReactions };
            if (existingReactionType === reactionType) {
                // Remove reaction
                delete newPostReactions[currentUserId];
                await deleteDoc(userReactionRef);
            } else {
                // Add or change reaction
                newPostReactions[currentUserId] = reactionType;
                await setDoc(userReactionRef, { userId: currentUserId, reactionType: reactionType });
            }
            setPostReactions(newPostReactions); // Update local state
        } catch (error) {
            console.error("Error toggling post reaction:", error);
            // Revert local state if the Firestore operation fails
            setPostReactions(postReactions);
        }
    };

    const handleToggleCommentReaction = async (commentId, reactionType) => {
        if (!currentUserId || !announcement?.id) return;
        const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${commentId}/reactions`);
        const userCommentReactionRef = doc(commentReactionsRef, currentUserId);
        const existingCommentReactionType = commentReactions[commentId]?.[currentUserId];

        // Optimistically update the local state to prevent flicker
        const updatedCommentReactions = { ...commentReactions };
        if (!updatedCommentReactions[commentId]) {
            updatedCommentReactions[commentId] = {};
        }

        try {
            if (existingCommentReactionType === reactionType) {
                delete updatedCommentReactions[commentId][currentUserId];
                await deleteDoc(userCommentReactionRef);
            } else {
                updatedCommentReactions[commentId][currentUserId] = reactionType;
                await setDoc(userCommentReactionRef, { userId: currentUserId, reactionType: reactionType });
            }
            setCommentReactions(updatedCommentReactions);
        } catch (error) {
            console.error("Error toggling comment reaction:", error);
            // Revert the local state if the Firestore operation fails
            setCommentReactions(commentReactions);
        }
    };

    const handleStartEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.commentText);
    };

    const handleSaveEditComment = async (commentId) => {
        if (!editingCommentText.trim() || !commentsCollectionRef) return;
        try {
            await updateDoc(doc(commentsCollectionRef, commentId), {
                commentText: editingCommentText.trim(),
                editedAt: new Date(),
            });
            setEditingCommentId(null);
            setEditingCommentText('');
        } catch (error) {
            console.error("Error updating comment:", error);
        }
    };

    const handleCancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    const handleDeleteComment = async (commentId) => {
        if (!commentsCollectionRef) return;
        try {
            await deleteDoc(doc(commentsCollectionRef, commentId));
        } catch (error) {
            console.error("Error deleting comment:", error);
        }
    };

    const openReactionsBreakdownModal = (reactions) => {
        setReactionsForBreakdownModal(reactions);
        setIsReactionsBreakdownModalOpen(true);
    };

    const closeReactionsBreakdownModal = () => {
        setIsReactionsBreakdownModalOpen(false);
        setReactionsForBreakdownModal(null);
    };

    const toggleCommentExpansion = (commentId) => {
        setExpandedComments(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    };

    const topLevelComments = comments.filter(comment => !comment.parentId);
    const getReplies = (commentId) => comments.filter(comment => comment.parentId === commentId);

    const formatReactionCount = (reactions, entityId, type) => {
        const safeReactions = reactions || {};
        const counts = {};
        Object.values(safeReactions).forEach(t => {
            counts[t] = (counts[t] || 0) + 1;
        });

        const sortedReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);

        if (Object.keys(safeReactions).length === 0) return null;

        const allReactingUsers = Object.keys(safeReactions).map(userId => {
            const user = usersMap[userId];
            return user ? `${user.firstName} ${user.lastName}`.trim() : `User ID: ${userId.substring(0, 8)}...`;
        }).join(', ');


        // Logic to get the current user's reaction
        const currentUserReaction = safeReactions[currentUserId];

        const getEmojiForType = (reactionType) => {
            const map = {
                like: '👍',
                love: '❤️',
                haha: '😆',
                wow: '😮',
                sad: '😢',
                angry: '😡',
                care: '🤗',
            };
            return map[reactionType] || '';
        };

        const topEmojis = sortedReactions.slice(0, 3).map(([type]) => getEmojiForType(type));

        // Prepare the display string, including the current user's reaction if present
        const count = Object.keys(safeReactions).length;
        let reactionText;
        if (currentUserReaction && sortedReactions.length > 1) {
            const otherReactorsCount = count - 1;
            reactionText = `You and ${otherReactorsCount} others`;
        } else if (currentUserReaction && sortedReactions.length === 1) {
            reactionText = `You`;
        } else {
            reactionText = `${count}`;
        }

        const handleMouseEnter = (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            clearTimeout(timeoutRef.current);
            setHoveredReactionData({
                top: rect.top,
                left: rect.left,
                users: allReactingUsers,
            });
        };

        const handleMouseLeave = () => {
            timeoutRef.current = setTimeout(() => {
                setHoveredReactionData(null);
            }, 300);
        };

        return (
            <div
                className="flex items-center space-x-1 cursor-pointer relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => openReactionsBreakdownModal(safeReactions)}
            >
                <div className="flex -space-x-1">
                    {topEmojis.map((emoji, index) => (
                        <span key={index} className="text-sm z-10">{emoji}</span>
                    ))}
                </div>
                <span className="text-xs font-semibold text-gray-500 hover:underline">
                    {reactionText}
                </span>
            </div>
        );
    };

    const renderComment = (comment) => {
        const commentAuthor = usersMap[comment.userId];
        const isAuthor = comment.userId === currentUserId;
        const isEditing = editingCommentId === comment.id;
        const commentReactionsForThisComment = commentReactions[comment.id] || {};
        const ownReaction = commentReactionsForThisComment[currentUserId];
        const hasReactions = Object.keys(commentReactionsForThisComment).length > 0;
        const replies = getReplies(comment.id);
        const isExpanded = expandedComments[comment.id];
        const hasParent = !!comment.parentId;

        const handleMouseOver = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            // Show reaction options on hover
            if (hoverReactionOptionsRef.current) {
                hoverReactionOptionsRef.current.style.display = 'flex';
            }
        };

        const handleMouseOut = () => {
            timeoutRef.current = setTimeout(() => {
                if (hoverReactionOptionsRef.current) {
                    hoverReactionOptionsRef.current.style.display = 'none';
                }
            }, 300);
        };


        return (
            <div key={comment.id} className={`flex ${hasParent ? 'ml-8' : ''}`}>
                <div className="flex-shrink-0 mr-3">
                    <UserInitialsAvatar name={commentAuthor?.firstName} size={9} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start">
                        <div className="bg-gray-100 p-3 rounded-xl flex-1 relative group"
                             onMouseEnter={handleMouseOver}
                             onMouseLeave={handleMouseOut}>
                            <div className="absolute -top-3 right-0 hidden group-hover:block z-10">
                                <div className="flex space-x-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-md">
                                    {reactionTypes.map(type => (
                                        <button key={type} onClick={() => handleToggleCommentReaction(comment.id, type)} className="hover:scale-125 transition-transform">
                                            <FacebookEmoji type={type} size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-gray-800 truncate">{commentAuthor?.firstName} {commentAuthor?.lastName}</span>
                                <span className="text-xs text-gray-400 ml-2">{formatRelativeTime(comment.createdAt)}</span>
                            </div>
                            {isEditing ? (
                                <div className="w-full">
                                    <textarea
                                        value={editingCommentText}
                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                        className="w-full text-sm p-1 border rounded"
                                        rows="3"
                                    />
                                    <div className="flex space-x-2 mt-2">
                                        <button onClick={() => handleSaveEditComment(comment.id)} className="text-blue-500 text-sm">Save</button>
                                        <button onClick={handleCancelEditComment} className="text-gray-500 text-sm">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                    {isExpanded || comment.commentText.length <= COMMENT_TRUNCATE_LENGTH
                                        ? comment.commentText
                                        : `${comment.commentText.substring(0, COMMENT_TRUNCATE_LENGTH)}...`}
                                    {comment.commentText.length > COMMENT_TRUNCATE_LENGTH && (
                                        <button onClick={() => toggleCommentExpansion(comment.id)} className="text-blue-500 text-sm ml-1">
                                            {isExpanded ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </p>
                            )}

                        </div>
                        {hasReactions && (
                            <div className="absolute bottom-1 right-2 translate-y-full -mb-3 z-10">
                                {formatReactionCount(commentReactionsForThisComment, comment.id, 'comment')}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 px-2">
                        <div className="relative">
                            <button
                                className={`text-xs font-semibold ${ownReaction ? 'text-indigo-500' : 'text-gray-500 hover:text-indigo-500'}`}
                                onClick={() => handleToggleCommentReaction(comment.id, ownReaction || 'like')}
                                onMouseEnter={(e) => {
                                    clearTimeout(timeoutRef.current);
                                    if (hoverReactionOptionsRef.current) {
                                        hoverReactionOptionsRef.current.style.display = 'flex';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    timeoutRef.current = setTimeout(() => {
                                        if (hoverReactionOptionsRef.current) {
                                            hoverReactionOptionsRef.current.style.display = 'none';
                                        }
                                    }, 300);
                                }}
                            >
                                {ownReaction ? <span className="flex items-center"><FacebookEmoji type={ownReaction} size={12} className="mr-1"/>{ownReaction.charAt(0).toUpperCase() + ownReaction.slice(1)}</span> : 'Like'}
                            </button>
                            <div ref={hoverReactionOptionsRef} className="absolute bottom-full mb-2 -left-2 hidden">
                                <div className="flex space-x-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-md">
                                    {reactionTypes.map(type => (
                                        <button key={type} onClick={() => handleToggleCommentReaction(comment.id, type)} className="hover:scale-125 transition-transform">
                                            <FacebookEmoji type={type} size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleReplyClick(comment.id, commentAuthor?.firstName)} className="text-xs text-gray-500 font-semibold hover:underline">Reply</button>
                        {(isAuthor || isAdmin) && (
                            <>
                                <button onClick={() => handleStartEditComment(comment)} className="text-xs text-gray-500 font-semibold hover:underline">Edit</button>
                                <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
                            </>
                        )}
                    </div>
                    {replies.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {replies.map(renderComment)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const teacher = usersMap[announcement?.teacherId];
    const isTeacher = userProfile?.id === announcement?.teacherId;
    const postReactionCount = Object.keys(postReactions).length;
    const ownPostReaction = postReactions[currentUserId];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all sm:max-w-xl sm:w-full max-h-[90vh] flex flex-col relative z-50">
                {/* Header */}
                <div className="flex-shrink-0 bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-900">Announcement Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <FaTimes size={24} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Announcement Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                        <div className="flex items-center mb-3">
                            <UserInitialsAvatar name={teacher?.firstName} size={12} />
                            <div className="ml-3">
                                <p className="text-sm font-semibold text-gray-800">{teacher?.firstName} {teacher?.lastName}</p>
                                <p className="text-xs text-gray-500">{convertTimestampToDate(announcement.createdAt)?.toLocaleString()}</p>
                            </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                    </div>

                    {/* Reactions Section */}
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="relative group">
                            <button
                                onClick={() => handleTogglePostReaction(ownPostReaction || 'like')}
                                className={`flex items-center px-4 py-2 rounded-full transition-colors ${ownPostReaction ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'}`}
                            >
                                <FacebookEmoji type={ownPostReaction || 'like'} size={18} className="mr-2" />
                                <span className="font-semibold">{ownPostReaction ? ownPostReaction.charAt(0).toUpperCase() + ownPostReaction.slice(1) : 'Like'}</span>
                            </button>
                            {/* Reaction options on hover */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                                <div className="flex space-x-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-md">
                                    {reactionTypes.map(type => (
                                        <button key={type} onClick={() => handleTogglePostReaction(type)} className="hover:scale-125 transition-transform">
                                            <FacebookEmoji type={type} size={20} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {postReactionCount > 0 && (
                            <div className="flex-1 text-right">
                                {formatReactionCount(postReactions, 'post', 'post')}
                            </div>
                        )}
                    </div>

                    {/* Comment Section */}
                    <div className="space-y-4">
                        {topLevelComments.map(renderComment)}
                    </div>
                </div>

                {/* Comment Input */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder={replyToCommentId ? `Replying to ${replyToUserName}...` : "Write a comment..."}
                            className="flex-1 p-3 rounded-full bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handlePostComment();
                                }
                            }}
                        />
                        <button
                            onClick={handlePostComment}
                            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                </div>
            </div>
            {isReactionsBreakdownModalOpen && (
                <ReactionsBreakdownModal
                    isOpen={isReactionsBreakdownModalOpen}
                    onClose={closeReactionsBreakdownModal}
                    reactions={reactionsForBreakdownModal}
                    usersMap={usersMap}
                />
            )}
        </div>
    );
};

export default AnnouncementModal;
