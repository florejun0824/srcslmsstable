import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes, FaPaperPlane, FaThumbsUp, FaHeart, FaLaugh, FaStar, FaReply, FaFrown, FaEdit, FaTrash, FaComment, FaAngry, FaHandHoldingHeart
} from 'react-icons/fa'; // Importing Font Awesome icons including FaAngry and FaHandHoldingHeart

import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import ReactionsBreakdownModal from './ReactionsBreakdownModal'; // Import the new modal

// Define available reaction icons and their properties (consistent with HomeView)
const reactionIcons = {
    like: { solid: FaThumbsUp, color: 'text-blue-500', label: 'Like' },
    heart: { solid: FaHeart, color: 'text-red-500', label: 'Love' },
    laugh: { solid: FaLaugh, color: 'text-yellow-500', label: 'Haha' },
    wow: { solid: FaStar, color: 'text-purple-500', label: 'Wow' },
    sad: { solid: FaFrown, color: 'text-gray-700', label: 'Sad' },
    angry: { solid: FaAngry, color: 'text-red-700', label: 'Angry' }, // New reaction
    care: { solid: FaHandHoldingHeart, color: 'text-pink-500', label: 'Care' }, // New reaction
};

// Define a set of appealing gradient colors for profile pictures
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

// Function to get a consistent gradient based on user ID
const getUserGradient = (userId) => {
    if (!userId) return gradientColors[0]; // Default if no userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % gradientColors.length);
    return gradientColors[index];
};

const COMMENT_TRUNCATE_LENGTH = 150; // Max characters before truncation

const AnnouncementModal = ({ isOpen, onClose, announcement, userProfile, db }) => {
    // State for comments and new comment input
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');

    // State for replying to comments
    const [replyToCommentId, setReplyToCommentId] = useState(null);
    const [replyToUserName, setReplyToUserName] = useState('');

    // State for post and comment reactions
    const [postReactions, setPostReactions] = useState({}); // {userId: reactionType}
    const [commentReactions, setCommentReactions] = useState({}); // {commentId: {userId: reactionType}}

    // State for displaying user names on reaction hover
    const [userNamesMap, setUserNamesMap] = useState({}); // {userId: 'FirstName LastName'}
    const [hoveredReactionData, setHoveredReactionData] = useState(null); // { type: 'post' | 'commentReactionCount' | 'postReactionOptions' | 'commentReactionOptions', id: annId | commentId, users?: string[] }

    // State for editing comments
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');

    // State for ReactionsBreakdownModal
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

    // State for managing expanded comments (See More/Show Less)
    const [expandedComments, setExpandedComments] = useState({}); // {commentId: boolean}

    // Refs for positioning the hover popup and managing timeouts
    const timeoutRef = useRef(null);
    const hoverReactionOptionsRef = useRef(null);

    // Get current user details from props
    const currentUserId = userProfile?.id;
    const currentUserName = `${userProfile?.firstName} ${userProfile?.lastName}`;
    const isAdmin = userProfile?.role === 'admin';

    // Firestore collection references (conditional based on announcement.id)
    const commentsCollectionRef = announcement?.id ? collection(db, `teacherAnnouncements/${announcement.id}/comments`) : null;
    const postReactionsCollectionRef = announcement?.id ? collection(db, `teacherAnnouncements/${announcement.id}/reactions`) : null;

    // Helper to convert Firestore Timestamp to Date, or handle Date objects
    const convertTimestampToDate = (timestamp) => {
        if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }
        if (timestamp instanceof Date) {
            return timestamp;
        }
        // Fallback for cases where it might be a plain object or string already
        try {
            return new Date(timestamp);
        } catch (e) {
            console.error("Could not convert timestamp:", timestamp, e);
            return null;
        }
    };

    // Helper to format date into a relative time string (e.g., "5m", "2h", "3d")
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

    // Effect to fetch and listen to comments and reactions
    useEffect(() => {
        if (!isOpen || !announcement?.id || !commentsCollectionRef || !postReactionsCollectionRef) {
            // Clear states if no valid announcement is selected or modal is closed
            setComments([]);
            setPostReactions({});
            setCommentReactions({});
            setUserNamesMap({}); // Clear user names map as well
            setHoveredReactionData(null); // Hide any open popups
            clearTimeout(timeoutRef.current);
            setExpandedComments({}); // Clear expanded comments state
            return;
        }

        // --- Comments Listener ---
        const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: convertTimestampToDate(doc.data().createdAt) // Convert Firestore Timestamp to Date
            }));
            setComments(fetchedComments);

            // Collect all user IDs from fetched comments and announcement data
            const allUserIds = new Set();
            allUserIds.add(announcement.teacherId); // Add announcer's ID
            fetchedComments.forEach(comment => {
                allUserIds.add(comment.userId);
            });

            // --- Comment Reactions Listeners (Nested) ---
            const commentReactionUnsubs = []; // To store unsubscribe functions for nested listeners

            fetchedComments.forEach(comment => {
                const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${comment.id}/reactions`);
                const unsubscribeCommentReactions = onSnapshot(commentReactionsRef, (reactionSnap) => {
                    const reactionsForThisComment = {};
                    reactionSnap.docs.forEach(rDoc => {
                        reactionsForThisComment[rDoc.id] = rDoc.data().reactionType; // rDoc.id is userId
                        allUserIds.add(rDoc.id); // Add reactor's ID
                    });
                    // Update only this specific comment's reactions using functional update
                    setCommentReactions(prev => ({
                        ...prev,
                        [comment.id]: reactionsForThisComment
                    }));
                }, (error) => {
                    console.error(`Error fetching reactions for comment ${comment.id}:`, error);
                });
                commentReactionUnsubs.push(unsubscribeCommentReactions); // Store unsubscribe function
            });

            // --- Post Reactions Listener ---
            const unsubscribePostReactions = onSnapshot(postReactionsCollectionRef, (snapshot) => {
                const fetchedPostReactions = {};
                snapshot.docs.forEach(doc => {
                    fetchedPostReactions[doc.id] = doc.data().reactionType; // doc.id is userId
                    allUserIds.add(doc.id); // Add reactor's ID
                });
                setPostReactions(fetchedPostReactions);

                // Now that we have all user IDs, fetch their names
                fetchUserNames([...allUserIds], db, userProfile, currentUserName, setUserNamesMap);

            }, (error) => {
                console.error("Error fetching post reactions:", error);
            });

            // Cleanup function for all listeners
            return () => {
                unsubscribeComments();
                unsubscribePostReactions();
                commentReactionUnsubs.forEach(unsub => unsub()); // Unsubscribe all nested comment reaction listeners
            };
        }, (error) => {
            console.error("Error fetching comments:", error);
        });

    }, [isOpen, announcement?.id, db, userProfile, currentUserName]); // Dependencies for useEffect

    // Helper function to fetch user names
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

    // Handler to post a new comment or reply
    const handlePostComment = async () => {
        if (!newCommentText.trim() || !commentsCollectionRef) return;

        try {
            const commentData = {
                userId: currentUserId,
                userName: currentUserName, // Store user name with comment for simpler display
                commentText: newCommentText.trim(),
                createdAt: new Date(),
                parentId: replyToCommentId,
            };
            await addDoc(commentsCollectionRef, commentData);
            setNewCommentText('');
            setReplyToCommentId(null);
            setReplyToUserName('');
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    // Handler for "Reply" button click
    const handleReplyClick = (commentId, userName) => {
        setReplyToCommentId(commentId);
        setReplyToUserName(userName);
        setNewCommentText(`@${userName} `); // Pre-fill input for reply
    };

    // Handler to toggle post reactions
    const handleTogglePostReaction = async (reactionType) => {
        if (!currentUserId || !postReactionsCollectionRef) return;

        const userReactionRef = doc(postReactionsCollectionRef, currentUserId);
        const existingReactionType = postReactions[currentUserId];

        try {
            if (existingReactionType === reactionType) {
                await deleteDoc(userReactionRef);
            } else {
                await setDoc(userReactionRef, { userId: currentUserId, reactionType: reactionType });
            }
        } catch (error) {
            console.error("Error toggling post reaction:", error);
        }
    };

    // Handler to toggle comment reactions
    const handleToggleCommentReaction = async (commentId, reactionType) => {
        if (!currentUserId || !announcement?.id) return;

        const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${commentId}/reactions`);
        const userCommentReactionRef = doc(commentReactionsRef, currentUserId);
        const existingCommentReactionType = commentReactions[commentId]?.[currentUserId];

        try {
            if (existingCommentReactionType === reactionType) {
                await deleteDoc(userCommentReactionRef);
            } else {
                await setDoc(userCommentReactionRef, { userId: currentUserId, reactionType: reactionType });
            }
        } catch (error) {
            console.error("Error toggling comment reaction:", error);
        }
    };

    // Handler for editing a comment
    const handleStartEditComment = (comment) => {
        setEditingCommentId(comment.id);
        setEditingCommentText(comment.commentText);
    };

    const handleSaveEditComment = async (commentId) => {
        if (!editingCommentText.trim() || !commentsCollectionRef) return;

        try {
            const commentDocRef = doc(commentsCollectionRef, commentId);
            await updateDoc(commentDocRef, {
                commentText: editingCommentText.trim(),
                editedAt: new Date(), // Optional: Add an edited timestamp
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

    // Handler for deleting a comment
    const handleDeleteComment = async (commentId) => {
        // In a real app, you'd want a confirmation dialog here
        if (!commentsCollectionRef) return;

        try {
            const commentDocRef = doc(commentsCollectionRef, commentId);
            await deleteDoc(commentDocRef);

            // Also delete all sub-collections (replies, reactions) if they exist.
            // Firestore doesn't automatically delete sub-collections.
            // This requires a more complex batched delete operation, often done on the server-side
            // via Cloud Functions to ensure atomicity and handle sub-collection deletion.
            // For a client-side simple delete, we'll delete the comment document itself.
            // Deleting sub-collections from client-side is complex and usually requires listing all docs in sub-collections.
            // For now, note this limitation.
            console.log(`Comment ${commentId} and its direct reactions/replies should be handled in a robust delete logic.`);

        } catch (error) {
            console.error("Error deleting comment:", error);
        }
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

    // Function to toggle comment expansion
    const toggleCommentExpansion = (commentId) => {
        setExpandedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    // Group comments into top-level and replies
    const topLevelComments = comments.filter(comment => !comment.parentId);
    const getReplies = (commentId) => comments.filter(comment => comment.parentId === commentId);

    // Formats reactions for display, including hover effect (for comments and posts)
    const formatReactionCount = (reactions, entityId, type) => { // 'postReactionCount' or 'commentReactionCount'
        const safeReactions = reactions || {};
        const counts = {};
        Object.values(safeReactions).forEach(t => {
            counts[t] = (counts[t] || 0) + 1;
        });
        const sortedReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);

        if (Object.keys(safeReactions).length === 0) return null;

        const allReactingUsers = Object.keys(safeReactions).map(userId => userNamesMap[userId] || `User ID: ${userId.substring(0, 5)}...`);

        const handleMouseEnter = () => {
            clearTimeout(timeoutRef.current); // Clear any existing timeout
            setHoveredReactionData({
                type: type, // Use the passed type
                id: entityId,
                users: allReactingUsers,
            });
        };

        const handleMouseLeave = () => {
            timeoutRef.current = setTimeout(() => {
                setHoveredReactionData(null);
            }, 300); // Small delay
        };

        const handlePopupMouseEnter = () => {
            clearTimeout(timeoutRef.current); // Keep popup visible if mouse enters it
        };

        const handlePopupMouseLeave = () => {
            setHoveredReactionData(null);
        };

        const isVisible = hoveredReactionData && hoveredReactionData.id === entityId && hoveredReactionData.type === type;

        return (
            <div
                className="flex items-center space-x-1 cursor-pointer relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                    e.stopPropagation();
                    openReactionsBreakdownModal(reactions, userNamesMap);
                }}
            >
                {sortedReactions.map(([t]) => {
                    const Icon = reactionIcons[t]?.solid;
                    return Icon ? <Icon key={t} className={`h-4 w-4 ${reactionIcons[t]?.color}`} /> : null;
                })}
                <span className="text-xs text-gray-500 font-medium">{Object.keys(safeReactions).length}</span>

                {/* Reaction Hover Popup for counts */}
                <div
                    className="reaction-hover-popup bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg absolute z-50 transform -translate-x-1/2"
                    style={{
                        bottom: 'calc(100% + 8px)',
                        left: '50%',
                        opacity: isVisible ? 1 : 0,
                        pointerEvents: isVisible ? 'auto' : 'none'
                    }}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                >
                    {(hoveredReactionData?.users || []).length > 0 ? (
                        hoveredReactionData.users.map((name, index) => (
                            <div key={index}>{name}</div>
                        ))
                    ) : (
                        <div>No reactions yet.</div>
                    )}
                </div>
            </div>
        );
    };

    // Reaction options hover for the main announcement and comments
    const handleReactionOptionsMouseEnter = (entityId, type) => { // 'postReactionOptions' or 'commentReactionOptions'
        clearTimeout(timeoutRef.current);
        setHoveredReactionData({
            type: type,
            id: entityId,
        });
    };

    const handleReactionOptionsMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setHoveredReactionData(null);
        }, 300);
    };

    // Get current user's reaction on the main announcement
    const currentUserPostReaction = postReactions[currentUserId];

    // Format announcement creation date for display
    const announcementDate = announcement?.createdAt ? convertTimestampToDate(announcement.createdAt) : null;
    const formattedAnnouncementDate = announcementDate ? announcementDate.toLocaleString() : 'Invalid Date';

    // If modal is not open or no announcement, render nothing
    if (!isOpen || !announcement) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100 opacity-100"> {/* Increased max-w and max-h */}
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Announcement Details</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <FaTimes className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Announcement Content */}
                <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
                    {/* Announcement Header (Facebook-like style) */}
                    <div className="flex items-center mb-4">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getUserGradient(announcement.teacherId)} rounded-full flex items-center justify-center text-white font-bold text-lg mr-3 shadow-md`}>
                            {announcement.teacherName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{announcement.teacherName}</p>
                            <p className="text-xs text-gray-500">{formattedAnnouncementDate}</p>
                        </div>
                    </div>
                    <div className="mb-6 pb-4 border-b border-gray-200">
                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                    </div>

                    {/* Post Reactions Summary & Counts */}
                    <div className="flex justify-between items-center text-sm text-gray-500 border-b border-gray-200 pb-3 mb-3">
                        {formatReactionCount(postReactions, announcement.id, 'postReactionCount')}
                    </div>

                    {/* Action Buttons (Like/React, Comment) for main announcement */}
                    <div className="flex justify-around items-center pt-3 mb-6">
                        {/* Like/React Button for Post */}
                        <div
                            className="relative"
                            onMouseEnter={() => handleReactionOptionsMouseEnter(announcement.id, 'postReactionOptions')}
                            onMouseLeave={handleReactionOptionsMouseLeave}
                        >
                            <button
                                className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors duration-200
                                ${currentUserPostReaction ? `${reactionIcons[currentUserPostReaction]?.color} bg-blue-50/50` : 'text-gray-600 hover:bg-gray-100'}`}
                                onClick={() => handleTogglePostReaction(currentUserPostReaction || 'like')} // Default to 'like' if no reaction
                            >
                                {currentUserPostReaction ? (
                                    <span className={`h-5 w-5 ${reactionIcons[currentUserPostReaction]?.color}`}>
                                        {React.createElement(reactionIcons[currentUserPostReaction]?.solid)}
                                    </span>
                                ) : (
                                    <FaThumbsUp className="h-5 w-5 text-gray-600" />
                                )}
                                <span className="font-semibold capitalize">
                                    {currentUserPostReaction || 'Like'}
                                </span>
                            </button>

                            {/* Reaction Options Popup (visible on hover) */}
                            {hoveredReactionData && hoveredReactionData.type === 'postReactionOptions' && hoveredReactionData.id === announcement.id && (
                                <div
                                    ref={hoverReactionOptionsRef}
                                    className="reaction-options-popup bg-white rounded-full shadow-lg p-2 flex space-x-2 absolute z-50"
                                    style={{
                                        bottom: 'calc(100% + 8px)', // This is for the main post, keep it as is or adjust slightly
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        opacity: 1,
                                        pointerEvents: 'auto'
                                    }}
                                    onMouseEnter={() => clearTimeout(timeoutRef.current)}
                                    onMouseLeave={handleReactionOptionsMouseLeave}
                                >
                                    {Object.entries(reactionIcons).map(([type, { solid: SolidIcon, color }]) => (
                                        <button
                                            key={type}
                                            className={`p-2 rounded-full hover:scale-125 transition-transform duration-150 ${color}`}
                                            onClick={() => {handleReactionOptionsMouseLeave(); handleTogglePostReaction(type);}}
                                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                                        >
                                            <SolidIcon className="h-6 w-6" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comment Button (always visible) */}
                        <button
                            className="flex items-center space-x-2 py-2 px-4 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                            onClick={() => { /* Do nothing, already in comments view */ }}
                        >
                            <FaComment className="h-5 w-5" />
                            <span className="font-semibold">Comment</span>
                        </button>
                    </div>


                    {/* Comments Section */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Comments ({comments.length})</h3>
                        {topLevelComments.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
                        )}
                        {topLevelComments.map(comment => {
                            const isCurrentUserComment = comment.userId === currentUserId;
                            const isBeingEdited = editingCommentId === comment.id;
                            const currentUserCommentReaction = commentReactions[comment.id]?.[currentUserId];
                            const isTruncated = comment.commentText.length > COMMENT_TRUNCATE_LENGTH;
                            const showFullComment = expandedComments[comment.id];

                            return (
                                <div key={comment.id} className="relative mb-4"> {/* Added mb-4 for spacing between comment blocks */}
                                    <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 group">
                                        <div className="flex items-start mb-2">
                                            <div className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br ${getUserGradient(comment.userId)} rounded-full flex items-center justify-center text-white font-bold text-sm mr-3`}> {/* Reverted size, added dynamic gradient */}
                                                {comment.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                {isBeingEdited ? (
                                                    <>
                                                        <textarea
                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800 resize-none"
                                                            rows="3"
                                                            value={editingCommentText}
                                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                                        />
                                                        <div className="flex justify-end gap-2 mt-3">
                                                            <button className="btn-secondary-light" onClick={handleCancelEditComment}>Cancel</button>
                                                            <button className="btn-primary-glow-light" onClick={() => handleSaveEditComment(comment.id)}>Save</button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Profile Pic > Name */}
                                                        <p className="text-sm font-medium text-gray-800 leading-tight">{comment.userName}</p>
                                                        {/* Comment */}
                                                        <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
                                                            {isTruncated && !showFullComment
                                                                ? comment.commentText.substring(0, COMMENT_TRUNCATE_LENGTH) + '...'
                                                                : comment.commentText}
                                                            {isTruncated && (
                                                                <button
                                                                    onClick={() => toggleCommentExpansion(comment.id)}
                                                                    className="text-blue-500 hover:underline ml-1"
                                                                >
                                                                    {showFullComment ? 'Show Less' : 'See More...'}
                                                                </button>
                                                            )}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {/* Edit/Delete buttons for comments - now hoverable */}
                                        {isCurrentUserComment && (
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button onClick={() => handleStartEditComment(comment)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Edit Comment">
                                                    <FaEdit className="w-4 h-4 text-gray-500" />
                                                </button>
                                                <button onClick={() => handleDeleteComment(comment.id)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Delete Comment">
                                                    <FaTrash className="w-4 h-4 text-rose-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Reactions, Timestamp, Like, Reply outside comment box, aligned with comment start */}
                                    {!isBeingEdited && (
                                        <div className="flex items-center text-xs text-gray-500 mt-1 pl-14 pr-4 space-x-2"> {/* ml-14 for indentation, space-x-2 for closeness */}
                                            {/* Relative time */}
                                            <span className="text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                                            {/* Separator if reactions or like/reply buttons are present */}
                                            {(Object.keys(commentReactions[comment.id] || {}).length > 0 || currentUserId) && <span className="text-gray-400">•</span>}
                                            
                                            {/* Reaction Count and Icons */}
                                            {formatReactionCount(commentReactions[comment.id] || {}, comment.id, 'commentReactionCount')}
                                            
                                            {/* Like Button (triggers reaction picker) */}
                                            <div
                                                className="relative"
                                                onMouseEnter={() => handleReactionOptionsMouseEnter(comment.id, 'commentReactionOptions')}
                                                onMouseLeave={handleReactionOptionsMouseLeave}
                                            >
                                                <button
                                                    className={`font-semibold capitalize px-1 py-0.5 rounded-md text-gray-600 hover:bg-gray-100`}
                                                    onClick={() => handleToggleCommentReaction(comment.id, currentUserCommentReaction || 'like')}
                                                >
                                                    Like
                                                </button>
                                                {/* Reaction Options Popup for Comments */}
                                                {hoveredReactionData && hoveredReactionData.type === 'commentReactionOptions' && hoveredReactionData.id === comment.id && (
                                                    <div
                                                        className="reaction-options-popup bg-white rounded-full shadow-lg p-0.5 flex space-x-0.5 absolute z-50"
                                                        style={{
                                                            bottom: 'calc(100% + 1px)',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            opacity: 1,
                                                            pointerEvents: 'auto'
                                                        }}
                                                        onMouseEnter={() => clearTimeout(timeoutRef.current)}
                                                        onMouseLeave={handleReactionOptionsMouseLeave}
                                                    >
                                                        {Object.entries(reactionIcons).map(([type, { solid: SolidIcon, color }]) => (
                                                            <button
                                                                key={type}
                                                                className={`p-0.5 rounded-full hover:scale-125 transition-transform duration-150 ${color}`}
                                                                onClick={() => {handleReactionOptionsMouseLeave(); handleToggleCommentReaction(comment.id, type);}}
                                                                title={type.charAt(0).toUpperCase() + type.slice(1)}
                                                            >
                                                                <SolidIcon className="h-4 w-4" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Reply Button */}
                                            <button
                                                onClick={() => handleReplyClick(comment.id, comment.userName)}
                                                className="text-blue-500 hover:underline flex items-center px-1 py-0.5"
                                            >
                                                Reply
                                            </button>
                                        </div>
                                    )}

                                    {/* Replies Section for this comment */}
                                    <div className="ml-12 mt-3 space-y-3 border-l pl-4 border-gray-200">
                                        {getReplies(comment.id).map(reply => {
                                            const isCurrentUserReply = reply.userId === currentUserId;
                                            const isReplyBeingEdited = editingCommentId === reply.id;
                                            const currentUserReplyReaction = commentReactions[reply.id]?.[currentUserId];
                                            const isReplyTruncated = reply.commentText.length > COMMENT_TRUNCATE_LENGTH;
                                            const showFullReply = expandedComments[reply.id];

                                            return (
                                                <div key={reply.id} className="relative mb-2"> {/* Added mb-2 for spacing between replies */}
                                                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                                                        <div className="flex items-start mb-1">
                                                            <div className={`flex-shrink-0 w-7 h-7 bg-gradient-to-br ${getUserGradient(reply.userId)} rounded-full flex items-center justify-center text-white font-semibold text-xs mr-2`}> {/* Added dynamic gradient */}
                                                                {reply.userName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1">
                                                                {isReplyBeingEdited ? (
                                                                    <>
                                                                        <textarea
                                                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800 resize-none"
                                                                            rows="2"
                                                                            value={editingCommentText}
                                                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                                                        />
                                                                        <div className="flex justify-end gap-2 mt-3">
                                                                            <button className="btn-secondary-light" onClick={handleCancelEditComment}>Cancel</button>
                                                                            <button className="btn-primary-glow-light" onClick={() => handleSaveEditComment(reply.id)}>Save</button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {/* Profile Pic > Name */}
                                                                        <p className="text-sm font-medium text-gray-800 leading-tight">{reply.userName}</p>
                                                                        {/* Comment */}
                                                                        <p className="text-gray-700 text-xs whitespace-pre-wrap mt-2">
                                                                            {isReplyTruncated && !showFullReply
                                                                                ? reply.commentText.substring(0, COMMENT_TRUNCATE_LENGTH) + '...'
                                                                                : reply.commentText}
                                                                            {isReplyTruncated && (
                                                                                <button
                                                                                    onClick={() => toggleCommentExpansion(reply.id)}
                                                                                    className="text-blue-500 hover:underline ml-1"
                                                                                >
                                                                                    {showFullReply ? 'Show Less' : 'See More...'}
                                                                                </button>
                                                                            )}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Edit/Delete buttons for replies - now hoverable */}
                                                        {isCurrentUserReply && (
                                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <button onClick={() => handleStartEditComment(reply)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Edit Reply">
                                                                    <FaEdit className="w-3 h-3 mr-1" />
                                                                </button>
                                                                <button onClick={() => handleDeleteComment(reply.id)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Delete Reply">
                                                                    <FaTrash className="w-3 h-3 mr-1" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Reactions > Reply for replies */}
                                                    {!isReplyBeingEdited && (
                                                        <div className="flex items-center text-xs text-gray-500 mt-1 pl-9 pr-2 space-x-2"> {/* pl-9 to align with reply text, space-x-2 for closeness */}
                                                            {/* Relative time */}
                                                            <span className="text-gray-500">{formatRelativeTime(reply.createdAt)}</span>
                                                            {/* Separator if reactions or like/reply buttons are present */}
                                                            {(Object.keys(commentReactions[reply.id] || {}).length > 0 || currentUserId) && <span className="text-gray-400">•</span>}
                                                            
                                                            {/* Reply Comment Reaction Button with hover options */}
                                                            {formatReactionCount(commentReactions[reply.id] || {}, reply.id, 'commentReactionOptions')}

                                                            {/* Like Button (triggers reaction picker) */}
                                                            <div
                                                                className="relative"
                                                                onMouseEnter={() => handleReactionOptionsMouseEnter(reply.id, 'commentReactionOptions')}
                                                                onMouseLeave={handleReactionOptionsMouseLeave}
                                                            >
                                                                <button
                                                                    className={`font-semibold capitalize px-1 py-0.5 rounded-md text-gray-600 hover:bg-gray-100`}
                                                                    onClick={() => handleToggleCommentReaction(reply.id, currentUserReplyReaction || 'like')}
                                                                >
                                                                    Like
                                                                </button>

                                                                {/* Reaction Options Popup for Replies */}
                                                                {hoveredReactionData && hoveredReactionData.type === 'commentReactionOptions' && hoveredReactionData.id === reply.id && (
                                                                    <div
                                                                        className="reaction-options-popup bg-white rounded-full shadow-lg p-0.5 flex space-x-0.5 absolute z-50"
                                                                        style={{
                                                                            bottom: 'calc(100% + 1px)',
                                                                            left: '50%',
                                                                            transform: 'translateX(-50%)',
                                                                            opacity: 1,
                                                                            pointerEvents: 'auto'
                                                                        }}
                                                                        onMouseEnter={() => clearTimeout(timeoutRef.current)}
                                                                        onMouseLeave={handleReactionOptionsMouseLeave}
                                                                    >
                                                                        {Object.entries(reactionIcons).map(([type, { solid: SolidIcon, color }]) => (
                                                                            <button
                                                                                key={type}
                                                                                className={`p-0.5 rounded-full hover:scale-125 transition-transform duration-150 ${color}`}
                                                                                onClick={() => {handleReactionOptionsMouseLeave(); handleToggleCommentReaction(reply.id, type);}}
                                                                                title={type.charAt(0).toUpperCase() + type.slice(1)}
                                                                            >
                                                                                <SolidIcon className="h-4 w-4" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Comment Input */}
                <div className="p-5 border-t border-gray-200 bg-gray-50">
                    {replyToCommentId && (
                        <div className="mb-2 text-sm text-gray-600 flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                            Replying to <span className="font-semibold ml-1">{replyToUserName}</span>
                            <button onClick={() => { setReplyToCommentId(null); setNewCommentText(''); setReplyToUserName(''); }} className="text-red-500 hover:text-red-700 ml-2">
                                <FaTimes className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center space-x-3">
                        <textarea
                            className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white text-gray-800 resize-none custom-scrollbar"
                            rows="2"
                            placeholder="Write a comment..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                        />
                        <button
                            onClick={handlePostComment}
                            className="btn-primary-glow-light p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                            disabled={!newCommentText.trim()}
                        >
                            <FaPaperPlane className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Reactions Breakdown Modal for Main Announcement */}
            <ReactionsBreakdownModal
                isOpen={isReactionsBreakdownModalOpen}
                onClose={closeReactionsBreakdownModal}
                reactionsData={reactionsForBreakdownModal}
                userNamesMap={userNamesMap} // Pass the userNamesMap from AnnouncementModal's state
            />
            {/* Custom scrollbar and styling */}
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

                /* Semi-3D Effect for Reaction Buttons */
                .reaction-icon-btn {
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Subtle shadow for depth */
                    position: relative;
                    overflow: hidden; /* Ensures inner glow/shadow stays within bounds */
                }

                .reaction-icon-btn:hover {
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2); /* More prominent shadow on hover */
                    transform: translateY(-2px); /* Slight lift on hover */
                }

                .reaction-icon-btn:active {
                    transform: translateY(0); /* Press down effect on click */
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
                    opacity: 1; /* Subtle highlight effect on hover */
                }

                /* Reaction Hover Popup Styling (for user names list) */
                .reaction-hover-popup {
                    position: absolute; /* Changed to absolute to be relative to its parent */
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 0.75rem; /* text-xs */
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                    /* opacity and pointer-events are now controlled by inline styles */
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    transform: translateX(-50%); /* Only translate X for centering */
                    white-space: nowrap; /* Prevent names from wrapping */
                }

                /* Reaction Options Popup Styling (for Like button hover) */
                .reaction-options-popup {
                    position: absolute;
                    background-color: white;
                    border-radius: 9999px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                    padding: 4px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    /* opacity and pointer-events are now controlled via inline style */
                    transition: opacity 0.2s ease, transform 0.2s ease;
                }
            `}</style>
        </div>
    );
};

export default AnnouncementModal;
