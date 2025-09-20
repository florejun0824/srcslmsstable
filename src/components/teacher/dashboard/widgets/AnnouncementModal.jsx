import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaEdit, FaTrash, FaThumbsUp, FaComment, FaTimes } from 'react-icons/fa';
import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc, runTransaction } from 'firebase/firestore';
import ReactionsBreakdownModal from './ReactionsBreakdownModal';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

const COMMENT_TRUNCATE_LENGTH = 150;
const reactionTypes = ["like", "love", "haha", "wow", "sad", "angry", "care"];

const NativeEmoji = ({ emoji, ...props }) => <span {...props}>{emoji}</span>;

const reactionIcons = {
    like: { component: (props) => <NativeEmoji emoji="👍" {...props} />, color: 'text-blue-500', label: 'Like' },
    love: { component: (props) => <NativeEmoji emoji="❤️" {...props} />, color: 'text-red-500', label: 'Love' },
    haha: { component: (props) => <NativeEmoji emoji="😂" {...props} />, color: 'text-yellow-500', label: 'Haha' },
    wow: { component: (props) => <NativeEmoji emoji="😮" {...props} />, color: 'text-amber-500', label: 'Wow' },
    sad: { component: (props) => <NativeEmoji emoji="😢" {...props} />, color: 'text-slate-500', label: 'Sad' },
    angry: { component: (props) => <NativeEmoji emoji="😡" {...props} />, color: 'text-red-700', label: 'Angry' },
    care: { component: (props) => <NativeEmoji emoji="🤗" {...props} />, color: 'text-pink-500', label: 'Care' }
};

const AnnouncementModal = ({ isOpen, onClose, announcement, userProfile, db, postReactions, onToggleReaction, usersMap }) => {
    const [comments, setComments] = useState([]);
    const [liveCommentCount, setLiveCommentCount] = useState(announcement?.commentsCount || 0);
    const [newCommentText, setNewCommentText] = useState('');
    const [replyToCommentId, setReplyToCommentId] = useState(null);
    const [replyToUserName, setReplyToUserName] = useState('');
    const [commentReactions, setCommentReactions] = useState({});
    const [hoveredReactionData, setHoveredReactionData] = useState(null);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);
    const [expandedComments, setExpandedComments] = useState({});
    const timeoutRef = useRef(null);

    const currentUserId = userProfile?.id;
    const currentUserName = `${userProfile?.firstName} ${userProfile?.lastName}`;
    
    const commentsCollectionRef = announcement?.id ? collection(db, `teacherAnnouncements/${announcement.id}/comments`) : null;

    useEffect(() => {
        setLiveCommentCount(announcement?.commentsCount || 0);
    }, [announcement]);

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
        if (seconds < 60) return `now`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        const weeks = Math.floor(days / 7);
        return `${weeks}w`;
    };
    
    useEffect(() => {
        if (!isOpen || !announcement?.id || !commentsCollectionRef) {
            setComments([]); setCommentReactions({});
            return;
        }

        const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: convertTimestampToDate(doc.data().createdAt) }));
            setComments(fetchedComments);
            setLiveCommentCount(fetchedComments.length);

            const commentReactionUnsubs = fetchedComments.map(comment => {
                const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${comment.id}/reactions`);
                return onSnapshot(commentReactionsRef, (reactionSnap) => {
                    const reactionsForThisComment = {};
                    reactionSnap.docs.forEach(rDoc => {
                        reactionsForThisComment[rDoc.id] = rDoc.data().reactionType;
                    });
                    setCommentReactions(prev => ({ ...prev, [comment.id]: reactionsForThisComment }));
                });
            });

            return () => commentReactionUnsubs.forEach(unsub => unsub());
        });

        return () => {
            if(unsubscribeComments) unsubscribeComments();
        };
    }, [isOpen, announcement?.id]);

	const handlePostComment = async () => {
	    if (!newCommentText.trim() || !commentsCollectionRef) return;
	    const announcementRef = doc(db, 'teacherAnnouncements', announcement.id);
	    const newCommentRef = doc(commentsCollectionRef);

	    try {
	        await runTransaction(db, async (transaction) => {
	            const annDoc = await transaction.get(announcementRef);
	            if (!annDoc.exists()) throw "Announcement does not exist!";
	            const newCount = (annDoc.data().commentsCount || 0) + 1;
	            transaction.update(announcementRef, { commentsCount: newCount });
	            transaction.set(newCommentRef, {
	                userId: currentUserId,
	                userName: currentUserName,
	                commentText: newCommentText.trim(),
	                createdAt: new Date(),
	                parentId: replyToCommentId
	            });
	        });
	        setNewCommentText('');
	        setReplyToCommentId(null);
	        setReplyToUserName('');
	    } catch (error) {
	        console.error("Error posting comment in transaction:", error);
	    }
	};
    
    const handleReplyClick = (commentId, userName) => { setReplyToCommentId(commentId); setReplyToUserName(userName); setNewCommentText(`@${userName} `); };
    const handleToggleCommentReaction = async (commentId, reactionType) => { if (!currentUserId || !announcement?.id) return; const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${commentId}/reactions`); const userCommentReactionRef = doc(commentReactionsRef, currentUserId); const existingCommentReactionType = commentReactions[commentId]?.[currentUserId]; try { if (existingCommentReactionType === reactionType) await deleteDoc(userCommentReactionRef); else await setDoc(userCommentReactionRef, { userId: currentUserId, reactionType: reactionType }); } catch (error) { console.error("Error toggling comment reaction:", error); } };
    const handleStartEditComment = (comment) => { setEditingCommentId(comment.id); setEditingCommentText(comment.commentText); };
    const handleSaveEditComment = async (commentId) => { if (!editingCommentText.trim() || !commentsCollectionRef) return; try { await updateDoc(doc(commentsCollectionRef, commentId), { commentText: editingCommentText.trim(), editedAt: new Date() }); setEditingCommentId(null); setEditingCommentText(''); } catch (error) { console.error("Error updating comment:", error); } };
    const handleCancelEditComment = () => { setEditingCommentId(null); setEditingCommentText(''); };
	const handleDeleteComment = async (commentId) => {
	    if (!commentsCollectionRef) return;
	    const announcementRef = doc(db, 'teacherAnnouncements', announcement.id);
	    const commentToDeleteRef = doc(commentsCollectionRef, commentId);

	    try {
	        await runTransaction(db, async (transaction) => {
	            const annDoc = await transaction.get(announcementRef);
	            if (annDoc.exists()) {
	                const newCount = Math.max(0, (annDoc.data().commentsCount || 0) - 1);
	                transaction.update(announcementRef, { commentsCount: newCount });
	            }
	            transaction.delete(commentToDeleteRef);
	        });
	    } catch (error) {
	        console.error("Error deleting comment in transaction:", error);
	    }
	};
    const openReactionsBreakdownModal = (reactions) => { setReactionsForBreakdownModal(reactions); setIsReactionsBreakdownModalOpen(true); };
    const closeReactionsBreakdownModal = () => { setIsReactionsBreakdownModalOpen(false); setReactionsForBreakdownModal(null); };
    const toggleCommentExpansion = (commentId) => { setExpandedComments(prev => ({ ...prev, [commentId]: !prev[commentId] })); };
    const handleReactionOptionsMouseEnter = (entityId, type) => { clearTimeout(timeoutRef.current); setHoveredReactionData({ type, id: entityId }); };
    const handleReactionOptionsMouseLeave = () => { timeoutRef.current = setTimeout(() => { setHoveredReactionData(null); }, 300); };
    
    const topLevelComments = comments.filter(comment => !comment.parentId);
    const getReplies = (commentId) => comments.filter(comment => comment.parentId === commentId);
    const currentUserPostReaction = postReactions[currentUserId];
    const announcementDate = announcement?.createdAt ? convertTimestampToDate(announcement.createdAt) : null;
    const formattedAnnouncementDate = announcementDate ? announcementDate.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Invalid Date';

	// MODIFIED: This function now correctly counts and displays unique reaction icons, sorted by count.
	const renderReactionCount = (reactions) => {
	    if (!reactions || Object.keys(reactions).length === 0) return null;
	    
	    const counts = {};
	    Object.values(reactions).forEach(type => {
	        counts[type] = (counts[type] || 0) + 1;
	    });
	    const sortedUniqueReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);
	    const totalReactions = Object.keys(reactions).length;

	    return (
	        <div className="flex items-center space-x-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); openReactionsBreakdownModal(reactions); }}>
	            <div className="flex items-center">
	                {sortedUniqueReactions.map(([type], index) => {
	                    const reaction = reactionIcons[type]; 
	                    if (!reaction) return null;

	                    const { component: Icon } = reaction;
	                    const zIndex = sortedUniqueReactions.length - index;

	                    return (
	                        <div key={type} className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-neumorphic-base shadow-neumorphic-inset ring-2 ring-neumorphic-base ${index > 0 ? '-ml-2' : ''}`} style={{ zIndex: zIndex }}>
	                            <Icon className="text-xl" />
	                        </div>
	                    );
	                })}
	            </div>
	            <span className="text-sm text-slate-500 font-medium ml-2">{totalReactions}</span>
	        </div>
	    );
	};
    
    if (!isOpen || !announcement) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 font-sans">
            <div className="bg-neumorphic-base rounded-[28px] shadow-neumorphic w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-center p-4 border-b border-neumorphic-shadow-dark/30 relative">
                    <h2 className="text-lg font-semibold text-slate-800 pt-2">Announcement</h2>
                    <button onClick={onClose} className="absolute top-3 right-4 p-2 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">
                        <FaTimes className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto flex-grow">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 mr-4 flex-shrink-0">
                           <UserInitialsAvatar user={usersMap[announcement.teacherId]} size="w-12 h-12 text-lg" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">{usersMap[announcement.teacherId]?.firstName} {usersMap[announcement.teacherId]?.lastName}</p>
                            <p className="text-xs text-slate-500">{formattedAnnouncementDate}</p>
                        </div>
                    </div>
                    <div className="mb-4 pb-4">
                        <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-500 border-y border-neumorphic-shadow-dark/30 py-2 my-2">
                        <div>
                           {renderReactionCount(postReactions)}
                        </div>
                        <span className="text-sm text-slate-500">{liveCommentCount} {liveCommentCount === 1 ? 'Comment' : 'Comments'}</span>
                    </div>

                    <div className="flex justify-around items-center py-1 mb-4">
                        <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(announcement.id, 'post')} onMouseLeave={handleReactionOptionsMouseLeave}>
                            <button className={`flex items-center justify-center py-2 px-5 rounded-full font-semibold transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset ${currentUserPostReaction ? 'text-blue-500' : 'text-slate-600'}`} onClick={() => onToggleReaction(announcement.id, currentUserPostReaction || 'like')}>
                                {currentUserPostReaction ? <NativeEmoji emoji={reactionIcons[currentUserPostReaction].component({}).props.emoji} className="text-xl" /> : <FaThumbsUp className="h-5 w-5" />}
                                <span className="capitalize ml-2">{currentUserPostReaction || 'Like'}</span>
                            </button>
                             {hoveredReactionData?.type === 'post' && hoveredReactionData?.id === announcement.id && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neumorphic-base rounded-full shadow-neumorphic p-1 flex gap-1 z-50" onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                    {reactionTypes.map((type) => (
                                        <button key={type} className="p-2 rounded-full transition-shadow hover:shadow-neumorphic-inset" onClick={() => { handleReactionOptionsMouseLeave(); onToggleReaction(announcement.id, type); }}>
                                            <NativeEmoji emoji={reactionIcons[type].component({}).props.emoji} className="text-2xl" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="flex items-center justify-center py-2 px-5 rounded-full font-semibold text-slate-600 transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">
                            <FaComment className="h-5 w-5" />
                            <span className="ml-2">Comment</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {topLevelComments.length === 0 && <p className="text-slate-500 text-center py-6">Be the first to comment.</p>}
                        {topLevelComments.map(comment => {
                            const isCurrentUserComment = comment.userId === currentUserId;
                            const isBeingEdited = editingCommentId === comment.id;
                            const isTruncated = comment.commentText.length > COMMENT_TRUNCATE_LENGTH;
                            const showFullComment = expandedComments[comment.id];
                            const currentUserCommentReaction = commentReactions[comment.id]?.[currentUserId];
                            
                            return (
                                <div key={comment.id} className="flex items-start space-x-3">
                                    <div className="w-9 h-9 flex-shrink-0">
                                        <UserInitialsAvatar user={usersMap[comment.userId]} size="w-9 h-9" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="relative group bg-neumorphic-base p-3 rounded-xl shadow-neumorphic">
                                            {isBeingEdited ? (
                                                <textarea className="w-full p-2 border-none ring-0 focus:ring-0 rounded-lg bg-neumorphic-base text-slate-800 resize-none shadow-neumorphic-inset" rows="3" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} autoFocus />
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-slate-800">{usersMap[comment.userId]?.firstName} {usersMap[comment.userId]?.lastName}</p>
                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1 break-words">
                                                        {isTruncated && !showFullComment ? `${comment.commentText.substring(0, COMMENT_TRUNCATE_LENGTH)}...` : comment.commentText}
                                                        {isTruncated && <button onClick={() => toggleCommentExpansion(comment.id)} className="text-sky-600 hover:underline ml-1 text-xs font-semibold">{showFullComment ? 'Less' : 'More'}</button>}
                                                    </p>
                                                </>
                                            )}
                                            {isCurrentUserComment && !isBeingEdited && (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button onClick={() => handleStartEditComment(comment)} className="p-1.5 rounded-full hover:shadow-neumorphic-inset transition" title="Edit"><FaEdit className="w-4 h-4 text-slate-500" /></button>
                                                    <button onClick={() => handleDeleteComment(comment.id)} className="p-1.5 rounded-full hover:shadow-neumorphic-inset transition" title="Delete"><FaTrash className="w-4 h-4 text-rose-500" /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center text-xs text-slate-500 mt-1 pl-2 space-x-3">
                                            {isBeingEdited ? (
                                                <div className="flex justify-start gap-2 mt-1">
                                                    <button className="px-3 py-1 text-xs rounded-full font-semibold text-slate-600 transition-shadow hover:shadow-neumorphic-inset" onClick={handleCancelEditComment}>Cancel</button>
                                                    <button className="px-3 py-1 text-xs rounded-full font-semibold text-sky-600 transition-shadow hover:shadow-neumorphic-inset" onClick={() => handleSaveEditComment(comment.id)}>Save</button>
                                                </div>
                                            ) : (
                                                 <>
                                                    <span>{formatRelativeTime(comment.createdAt)}</span>
                                                    <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(comment.id, 'comment')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                        <button className="font-semibold hover:underline" onClick={() => handleToggleCommentReaction(comment.id, currentUserCommentReaction || 'like')}>
                                                            <span className={`capitalize ${currentUserCommentReaction ? 'text-blue-500' : ''}`}>{currentUserCommentReaction || 'Like'}</span>
                                                        </button>
                                                        {hoveredReactionData?.type === 'comment' && hoveredReactionData?.id === comment.id && (
                                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-neumorphic-base rounded-full shadow-neumorphic p-1 flex gap-1 z-50" onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                {reactionTypes.map((type) => (
                                                                    <button key={type} className="p-1.5 rounded-full transition-shadow hover:shadow-neumorphic-inset" onClick={() => { handleReactionOptionsMouseLeave(); handleToggleCommentReaction(comment.id, type); }}>
                                                                        <NativeEmoji emoji={reactionIcons[type].component({}).props.emoji} className="text-xl" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button className="font-semibold hover:underline" onClick={() => handleReplyClick(comment.id, `${usersMap[comment.userId]?.firstName} ${usersMap[comment.userId]?.lastName}`)}>Reply</button>
                                                    {renderReactionCount(commentReactions[comment.id] || {})}
                                                 </>
                                            )}
                                        </div>
                                        <div className="mt-3 space-y-3">
                                            {getReplies(comment.id).map(reply => {
                                                const isCurrentUserReply = reply.userId === currentUserId;
                                                const isReplyBeingEdited = editingCommentId === reply.id;
                                                const currentUserReplyReaction = commentReactions[reply.id]?.[currentUserId];

                                                return (
                                                    <div key={reply.id} className="flex items-start space-x-3">
                                                        <div className="w-7 h-7 flex-shrink-0">
                                                            <UserInitialsAvatar user={usersMap[reply.userId]} size="w-7 h-7" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="relative group bg-neumorphic-base p-2.5 rounded-xl shadow-neumorphic">
                                                                {isReplyBeingEdited ? <textarea className="w-full p-2 border-none ring-0 focus:ring-0 rounded-lg bg-neumorphic-base text-slate-800 resize-none shadow-neumorphic-inset" rows="2" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} autoFocus /> : <>
                                                                    <p className="text-sm font-semibold text-slate-800">{usersMap[reply.userId]?.firstName} {usersMap[reply.userId]?.lastName}</p>
                                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5 break-words">{reply.commentText}</p>
                                                                </>}
                                                                {isCurrentUserReply && !isReplyBeingEdited && (
                                                                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => handleStartEditComment(reply)} className="p-1 rounded-full hover:shadow-neumorphic-inset" title="Edit Reply"><FaEdit className="w-3 h-3 text-slate-500" /></button>
                                                                        <button onClick={() => handleDeleteComment(reply.id)} className="p-1 rounded-full hover:shadow-neumorphic-inset" title="Delete Reply"><FaTrash className="w-3 h-3 text-rose-500" /></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center text-xs text-slate-500 mt-1 pl-2 space-x-3">
                                                                {isReplyBeingEdited ? <div className="flex gap-2 mt-1"><button className="px-2 py-0.5 text-xs rounded-full font-semibold text-slate-600 transition-shadow hover:shadow-neumorphic-inset" onClick={handleCancelEditComment}>Cancel</button><button className="px-2 py-0.5 text-xs rounded-full font-semibold text-sky-600 transition-shadow hover:shadow-neumorphic-inset" onClick={() => handleSaveEditComment(reply.id)}>Save</button></div> : <>
                                                                    <span>{formatRelativeTime(reply.createdAt)}</span>
                                                                    <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(reply.id, 'reply')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                        <button className="font-semibold hover:underline" onClick={() => handleToggleCommentReaction(reply.id, currentUserReplyReaction || 'like')}>
                                                                            <span className={`capitalize ${currentUserReplyReaction ? 'text-blue-500' : ''}`}>
                                                                                {currentUserReplyReaction || 'Like'}
                                                                            </span>
                                                                        </button>
                                                                        {hoveredReactionData?.type === 'reply' && hoveredReactionData?.id === reply.id && (
                                                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-neumorphic-base rounded-full shadow-neumorphic p-1 flex gap-1 z-50" onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                                {reactionTypes.map((type) => (
                                                                                    <button key={type} className="p-1.5 rounded-full transition-shadow hover:shadow-neumorphic-inset" onClick={() => { handleReactionOptionsMouseLeave(); handleToggleCommentReaction(reply.id, type); }}>
                                                                                        <NativeEmoji emoji={reactionIcons[type].component({}).props.emoji} className="text-xl" />
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {renderReactionCount(commentReactions[reply.id] || {})}
                                                                </>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-3 border-t border-neumorphic-shadow-dark/30 bg-neumorphic-base">
                    {replyToCommentId && (
                        <div className="mb-2 text-xs text-slate-600 flex items-center justify-between px-3">
                            Replying to <span className="font-semibold text-slate-800 ml-1">{replyToUserName}</span>
                            <button onClick={() => { setReplyToCommentId(null); setNewCommentText(''); setReplyToUserName(''); }} className="p-1.5 rounded-full hover:shadow-neumorphic-inset">
                                <FaTimes className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 flex-shrink-0">
                            <UserInitialsAvatar user={userProfile} size="w-9 h-9" />
                        </div>
                        <div className="relative flex-grow">
                             <textarea className="w-full p-2 pr-12 border-none rounded-xl shadow-neumorphic-inset bg-neumorphic-base text-slate-800 placeholder:text-slate-500 focus:ring-0 resize-none leading-tight" rows="1" placeholder="Add a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} />
                             <button onClick={handlePostComment} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:shadow-neumorphic-inset disabled:opacity-50" disabled={!newCommentText.trim()}>
                                 <FaPaperPlane className={`w-4 h-4 transition-colors ${newCommentText.trim() ? 'text-sky-600' : 'text-slate-400'}`} />
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            <ReactionsBreakdownModal isOpen={isReactionsBreakdownModalOpen} onClose={closeReactionsBreakdownModal} reactionsData={reactionsForBreakdownModal} usersMap={usersMap} />
        </div>
    );
};

export default AnnouncementModal;