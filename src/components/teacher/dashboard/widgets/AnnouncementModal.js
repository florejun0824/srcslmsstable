import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes, FaPaperPlane, FaThumbsUp, FaHeart, FaLaugh, FaStar, FaReply, FaFrown, FaEdit, FaTrash, FaComment, FaAngry, FaHandHoldingHeart
} from 'react-icons/fa';

import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import ReactionsBreakdownModal from './ReactionsBreakdownModal';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar'; // Import the unified avatar component

// Define available reaction icons and their properties (consistent with HomeView)
const reactionIcons = {
    like: { solid: FaThumbsUp, color: 'text-blue-500', label: 'Like' },
    heart: { solid: FaHeart, color: 'text-red-500', label: 'Love' },
    laugh: { solid: FaLaugh, color: 'text-yellow-500', label: 'Haha' },
    wow: { solid: FaStar, color: 'text-purple-500', label: 'Wow' },
    sad: { solid: FaFrown, color: 'text-gray-700', label: 'Sad' },
    angry: { solid: FaAngry, color: 'text-red-700', label: 'Angry' },
    care: { solid: FaHandHoldingHeart, color: 'text-pink-500', label: 'Care' },
};

const COMMENT_TRUNCATE_LENGTH = 150; // Max characters before truncation

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

    useEffect(() => {
        if (!isOpen || !announcement?.id || !commentsCollectionRef || !postReactionsCollectionRef) {
            setComments([]);
            setPostReactions({});
            setCommentReactions({});
            setUsersMap({});
            setHoveredReactionData(null);
            clearTimeout(timeoutRef.current);
            setExpandedComments({});
            return;
        }

        const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: convertTimestampToDate(doc.data().createdAt)
            }));
            setComments(fetchedComments);

            const allUserIds = new Set();
            allUserIds.add(announcement.teacherId);
            fetchedComments.forEach(comment => {
                allUserIds.add(comment.userId);
            });

            const commentReactionUnsubs = [];
            fetchedComments.forEach(comment => {
                const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${comment.id}/reactions`);
                const unsubscribeCommentReactions = onSnapshot(commentReactionsRef, (reactionSnap) => {
                    const reactionsForThisComment = {};
                    reactionSnap.docs.forEach(rDoc => {
                        reactionsForThisComment[rDoc.id] = rDoc.data().reactionType;
                        allUserIds.add(rDoc.id);
                    });
                    setCommentReactions(prev => ({
                        ...prev,
                        [comment.id]: reactionsForThisComment
                    }));
                }, (error) => {
                    console.error(`Error fetching reactions for comment ${comment.id}:`, error);
                });
                commentReactionUnsubs.push(unsubscribeCommentReactions);
            });

            const unsubscribePostReactions = onSnapshot(postReactionsCollectionRef, (snapshot) => {
                const fetchedPostReactions = {};
                snapshot.docs.forEach(doc => {
                    fetchedPostReactions[doc.id] = doc.data().reactionType;
                    allUserIds.add(doc.id);
                });
                setPostReactions(fetchedPostReactions);
                fetchUsersData([...allUserIds], db, userProfile, setUsersMap);
            }, (error) => {
                console.error("Error fetching post reactions:", error);
            });

            return () => {
                unsubscribeComments();
                unsubscribePostReactions();
                commentReactionUnsubs.forEach(unsub => unsub());
            };
        }, (error) => {
            console.error("Error fetching comments:", error);
        });

    }, [isOpen, announcement?.id, db, userProfile]);

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
            if (existingReactionType === reactionType) await deleteDoc(userReactionRef);
            else await setDoc(userReactionRef, { userId: currentUserId, reactionType: reactionType });
        } catch (error) {
            console.error("Error toggling post reaction:", error);
        }
    };

    const handleToggleCommentReaction = async (commentId, reactionType) => {
        if (!currentUserId || !announcement?.id) return;
        const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${commentId}/reactions`);
        const userCommentReactionRef = doc(commentReactionsRef, currentUserId);
        const existingCommentReactionType = commentReactions[commentId]?.[currentUserId];
        try {
            if (existingCommentReactionType === reactionType) await deleteDoc(userCommentReactionRef);
            else await setDoc(userCommentReactionRef, { userId: currentUserId, reactionType: reactionType });
        } catch (error) {
            console.error("Error toggling comment reaction:", error);
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
        Object.values(safeReactions).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
        const sortedReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);
        if (Object.keys(safeReactions).length === 0) return null;

        const allReactingUsers = Object.keys(safeReactions).map(userId => {
            const user = usersMap[userId];
            return user ? `${user.firstName} ${user.lastName}`.trim() : `User ID: ${userId.substring(0, 5)}...`;
        });

        const handleMouseEnter = () => {
            clearTimeout(timeoutRef.current);
            setHoveredReactionData({ type, id: entityId, users: allReactingUsers });
        };
        const handleMouseLeave = () => { timeoutRef.current = setTimeout(() => { setHoveredReactionData(null); }, 300); };
        const handlePopupMouseEnter = () => { clearTimeout(timeoutRef.current); };
        const handlePopupMouseLeave = () => { setHoveredReactionData(null); };
        const isVisible = hoveredReactionData && hoveredReactionData.id === entityId && hoveredReactionData.type === type;

        return (
            <div className="flex items-center space-x-1 cursor-pointer relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={(e) => { e.stopPropagation(); openReactionsBreakdownModal(reactions); }}>
                {sortedReactions.map(([t]) => {
                    const Icon = reactionIcons[t]?.solid;
                    return Icon ? <Icon key={t} className={`h-4 w-4 ${reactionIcons[t]?.color}`} /> : null;
                })}
                <span className="text-xs text-gray-500 font-medium">{Object.keys(safeReactions).length}</span>
                <div className="reaction-hover-popup bg-gray-800 text-white text-xs p-2 rounded-lg shadow-lg absolute z-50 transform -translate-x-1/2" style={{ bottom: 'calc(100% + 8px)', left: '50%', opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none' }} onMouseEnter={handlePopupMouseEnter} onMouseLeave={handlePopupMouseLeave}>
                    {(hoveredReactionData?.users || []).map((name, index) => (<div key={index}>{name}</div>))}
                </div>
            </div>
        );
    };

    const handleReactionOptionsMouseEnter = (entityId, type) => {
        clearTimeout(timeoutRef.current);
        setHoveredReactionData({ type, id: entityId });
    };
    const handleReactionOptionsMouseLeave = () => { timeoutRef.current = setTimeout(() => { setHoveredReactionData(null); }, 300); };

    const currentUserPostReaction = postReactions[currentUserId];
    const announcementDate = announcement?.createdAt ? convertTimestampToDate(announcement.createdAt) : null;
    const formattedAnnouncementDate = announcementDate ? announcementDate.toLocaleString() : 'Invalid Date';

    if (!isOpen || !announcement) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100 opacity-100">
                <div className="flex items-center justify-between p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Announcement Details</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <FaTimes className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 mr-3 flex-shrink-0">
                           <UserInitialsAvatar user={usersMap[announcement.teacherId]} size="w-10 h-10" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800">{announcement.teacherName}</p>
                            <p className="text-xs text-gray-500">{formattedAnnouncementDate}</p>
                        </div>
                    </div>
                    <div className="mb-6 pb-4 border-b border-gray-200">
                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 border-b border-gray-200 pb-3 mb-3">
                        {formatReactionCount(postReactions, announcement.id, 'postReactionCount')}
                    </div>
                    <div className="flex justify-around items-center pt-3 mb-6">
                        <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(announcement.id, 'postReactionOptions')} onMouseLeave={handleReactionOptionsMouseLeave}>
                            <button className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors duration-200 ${currentUserPostReaction ? `${reactionIcons[currentUserPostReaction]?.color} bg-blue-50/50` : 'text-gray-600 hover:bg-gray-100'}`} onClick={() => handleTogglePostReaction(currentUserPostReaction || 'like')}>
                                {currentUserPostReaction ? React.createElement(reactionIcons[currentUserPostReaction].solid, { className: `h-5 w-5 ${reactionIcons[currentUserPostReaction].color}` }) : <FaThumbsUp className="h-5 w-5 text-gray-600" />}
                                <span className="font-semibold capitalize">{currentUserPostReaction || 'Like'}</span>
                            </button>
                            {hoveredReactionData?.type === 'postReactionOptions' && hoveredReactionData?.id === announcement.id && (
                                <div ref={hoverReactionOptionsRef} className="reaction-options-popup bg-white rounded-full shadow-lg p-2 flex space-x-2 absolute z-50" style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', opacity: 1, pointerEvents: 'auto' }} onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                    {Object.entries(reactionIcons).map(([type, { solid: SolidIcon, color }]) => (
                                        <button key={type} className={`p-2 rounded-full hover:scale-125 transition-transform duration-150 ${color}`} onClick={() => { handleReactionOptionsMouseLeave(); handleTogglePostReaction(type); }} title={type.charAt(0).toUpperCase() + type.slice(1)}>
                                            <SolidIcon className="h-6 w-6" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="flex items-center space-x-2 py-2 px-4 rounded-full text-gray-600 hover:bg-gray-100 transition-colors duration-200">
                            <FaComment className="h-5 w-5" />
                            <span className="font-semibold">Comment</span>
                        </button>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Comments ({comments.length})</h3>
                        {topLevelComments.length === 0 && <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>}
                        {topLevelComments.map(comment => {
                            const isCurrentUserComment = comment.userId === currentUserId;
                            const isBeingEdited = editingCommentId === comment.id;
                            const currentUserCommentReaction = commentReactions[comment.id]?.[currentUserId];
                            const isTruncated = comment.commentText.length > COMMENT_TRUNCATE_LENGTH;
                            const showFullComment = expandedComments[comment.id];
                            return (
                                <div key={comment.id} className="relative mb-4">
                                    <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200 group">
                                        <div className="flex items-start mb-2">
                                            <div className="flex-shrink-0 w-8 h-8 mr-3">
                                                <UserInitialsAvatar user={usersMap[comment.userId]} size="w-8 h-8" />
                                            </div>
                                            <div className="flex-1">
                                                {isBeingEdited ? (
                                                    <>
                                                        <textarea className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800 resize-none" rows="3" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                                                        <div className="flex justify-end gap-2 mt-3">
                                                            <button className="btn-secondary-light" onClick={handleCancelEditComment}>Cancel</button>
                                                            <button className="btn-primary-glow-light" onClick={() => handleSaveEditComment(comment.id)}>Save</button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-sm font-medium text-gray-800 leading-tight">{comment.userName}</p>
                                                        <p className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
                                                            {isTruncated && !showFullComment ? `${comment.commentText.substring(0, COMMENT_TRUNCATE_LENGTH)}...` : comment.commentText}
                                                            {isTruncated && <button onClick={() => toggleCommentExpansion(comment.id)} className="text-blue-500 hover:underline ml-1">{showFullComment ? 'Show Less' : 'See More...'}</button>}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isCurrentUserComment && (
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button onClick={() => handleStartEditComment(comment)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Edit Comment"><FaEdit className="w-4 h-4 text-gray-500" /></button>
                                                <button onClick={() => handleDeleteComment(comment.id)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Delete Comment"><FaTrash className="w-4 h-4 text-rose-500" /></button>
                                            </div>
                                        )}
                                    </div>
                                    {!isBeingEdited && (
                                        <div className="flex items-center text-xs text-gray-500 mt-1 pl-14 pr-4 space-x-2">
                                            <span className="text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
                                            {(Object.keys(commentReactions[comment.id] || {}).length > 0 || currentUserId) && <span className="text-gray-400">•</span>}
                                            {formatReactionCount(commentReactions[comment.id] || {}, comment.id, 'commentReactionCount')}
                                            <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(comment.id, 'commentReactionOptions')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                <button className="font-semibold capitalize px-1 py-0.5 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => handleToggleCommentReaction(comment.id, currentUserCommentReaction || 'like')}>Like</button>
                                                {hoveredReactionData?.type === 'commentReactionOptions' && hoveredReactionData?.id === comment.id && (
                                                    <div className="reaction-options-popup bg-white rounded-full shadow-lg p-0.5 flex space-x-0.5 absolute z-50" style={{ bottom: 'calc(100% + 1px)', left: '50%', transform: 'translateX(-50%)', opacity: 1, pointerEvents: 'auto' }} onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                        {Object.entries(reactionIcons).map(([type, { solid: SolidIcon, color }]) => (
                                                            <button key={type} className={`p-0.5 rounded-full hover:scale-125 transition-transform duration-150 ${color}`} onClick={() => { handleReactionOptionsMouseLeave(); handleToggleCommentReaction(comment.id, type); }} title={type.charAt(0).toUpperCase() + type.slice(1)}><SolidIcon className="h-4 w-4" /></button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => handleReplyClick(comment.id, comment.userName)} className="text-blue-500 hover:underline flex items-center px-1 py-0.5">Reply</button>
                                        </div>
                                    )}
                                    <div className="ml-12 mt-3 space-y-3 border-l pl-4 border-gray-200">
                                        {getReplies(comment.id).map(reply => {
                                            const isCurrentUserReply = reply.userId === currentUserId;
                                            const isReplyBeingEdited = editingCommentId === reply.id;
                                            const currentUserReplyReaction = commentReactions[reply.id]?.[currentUserId];
                                            const isReplyTruncated = reply.commentText.length > COMMENT_TRUNCATE_LENGTH;
                                            const showFullReply = expandedComments[reply.id];
                                            return (
                                                <div key={reply.id} className="relative mb-2">
                                                    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 group">
                                                        <div className="flex items-start mb-1">
                                                            <div className="flex-shrink-0 w-7 h-7 mr-2">
                                                                <UserInitialsAvatar user={usersMap[reply.userId]} size="w-7 h-7" />
                                                            </div>
                                                            <div className="flex-1">
                                                                {isReplyBeingEdited ? (
                                                                    <>
                                                                        <textarea className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-gray-100 text-gray-800 resize-none" rows="2" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                                                                        <div className="flex justify-end gap-2 mt-3"><button className="btn-secondary-light" onClick={handleCancelEditComment}>Cancel</button><button className="btn-primary-glow-light" onClick={() => handleSaveEditComment(reply.id)}>Save</button></div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p className="text-sm font-medium text-gray-800 leading-tight">{reply.userName}</p>
                                                                        <p className="text-gray-700 text-xs whitespace-pre-wrap mt-2">
                                                                            {isReplyTruncated && !showFullReply ? `${reply.commentText.substring(0, COMMENT_TRUNCATE_LENGTH)}...` : reply.commentText}
                                                                            {isReplyTruncated && <button onClick={() => toggleCommentExpansion(reply.id)} className="text-blue-500 hover:underline ml-1">{showFullReply ? 'Show Less' : 'See More...'}</button>}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isCurrentUserReply && (
                                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <button onClick={() => handleStartEditComment(reply)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Edit Reply"><FaEdit className="w-3 h-3 mr-1" /></button>
                                                                <button onClick={() => handleDeleteComment(reply.id)} className="p-1 rounded-full hover:bg-gray-200/50 transition" title="Delete Reply"><FaTrash className="w-3 h-3 mr-1" /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {!isReplyBeingEdited && (
                                                        <div className="flex items-center text-xs text-gray-500 mt-1 pl-9 pr-2 space-x-2">
                                                            <span className="text-gray-500">{formatRelativeTime(reply.createdAt)}</span>
                                                            {(Object.keys(commentReactions[reply.id] || {}).length > 0 || currentUserId) && <span className="text-gray-400">•</span>}
                                                            {formatReactionCount(commentReactions[reply.id] || {}, reply.id, 'commentReactionCount')}
                                                            <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(reply.id, 'commentReactionOptions')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                <button className="font-semibold capitalize px-1 py-0.5 rounded-md text-gray-600 hover:bg-gray-100" onClick={() => handleToggleCommentReaction(reply.id, currentUserReplyReaction || 'like')}>Like</button>
                                                                {hoveredReactionData?.type === 'commentReactionOptions' && hoveredReactionData?.id === reply.id && (
                                                                    <div className="reaction-options-popup bg-white rounded-full shadow-lg p-0.5 flex space-x-0.5 absolute z-50" style={{ bottom: 'calc(100% + 1px)', left: '50%', transform: 'translateX(-50%)', opacity: 1, pointerEvents: 'auto' }} onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                        {Object.entries(reactionIcons).map(([type, { solid: SolidIcon, color }]) => (
                                                                            <button key={type} className={`p-0.5 rounded-full hover:scale-125 transition-transform duration-150 ${color}`} onClick={() => { handleReactionOptionsMouseLeave(); handleToggleCommentReaction(reply.id, type); }} title={type.charAt(0).toUpperCase() + type.slice(1)}><SolidIcon className="h-4 w-4" /></button>
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
                <div className="p-5 border-t border-gray-200 bg-gray-50">
                    {replyToCommentId && (
                        <div className="mb-2 text-sm text-gray-600 flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                            Replying to <span className="font-semibold ml-1">{replyToUserName}</span>
                            <button onClick={() => { setReplyToCommentId(null); setNewCommentText(''); setReplyToUserName(''); }} className="text-red-500 hover:text-red-700 ml-2"><FaTimes className="w-4 h-4" /></button>
                        </div>
                    )}
                    <div className="flex items-center space-x-3">
                        <textarea className="flex-grow p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 bg-white text-gray-800 resize-none custom-scrollbar" rows="2" placeholder="Write a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} />
                        <button onClick={handlePostComment} className="btn-primary-glow-light p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300" disabled={!newCommentText.trim()}><FaPaperPlane className="w-6 h-6" /></button>
                    </div>
                </div>
            </div>
            <ReactionsBreakdownModal isOpen={isReactionsBreakdownModalOpen} onClose={closeReactionsBreakdownModal} reactionsData={reactionsForBreakdownModal} usersMap={usersMap} />
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #e5e7eb; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 10px; border: 2px solid #e5e7eb; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #9ca3af; }
                .btn-primary-glow-light { background-color: #f43f5e; color: white; padding: 8px 16px; border-radius: 9999px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 0px 10px rgba(244, 63, 94, 0.3); }
                .btn-primary-glow-light:hover { background-color: #e11d48; box-shadow: 0 0px 15px rgba(244, 63, 94, 0.6); }
                .btn-secondary-light { background-color: #e5e7eb; color: #4b5563; padding: 8px 16px; border-radius: 9999px; font-weight: 600; transition: all 0.3s ease; }
                .btn-secondary-light:hover { background-color: #d1d5db; }
                .reaction-hover-popup { position: absolute; background-color: rgba(0, 0, 0, 0.8); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.75rem; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3); transition: opacity 0.2s ease, transform 0.2s ease; transform: translateX(-50%); white-space: nowrap; }
                .reaction-options-popup { position: absolute; background-color: white; border-radius: 9999px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); padding: 4px; display: flex; gap: 8px; align-items: center; transition: opacity 0.2s ease, transform 0.2s ease; }
            `}</style>
        </div>
    );
};

export default AnnouncementModal;
