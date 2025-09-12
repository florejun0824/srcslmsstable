import React, { useState, useEffect, useRef } from 'react';
import {
    FaTimes, FaPaperPlane, FaEdit, FaTrash, FaThumbsUp, FaComment,
} from 'react-icons/fa';
import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import ReactionsBreakdownModal from './ReactionsBreakdownModal';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

const COMMENT_TRUNCATE_LENGTH = 150;
const reactionTypes = ["like", "love", "haha", "wow", "sad", "angry", "care"];

const NativeEmoji = ({ emoji, ...props }) => <span {...props}>{emoji}</span>;

const reactionIcons = {
    like: { component: (props) => <NativeEmoji emoji="👍" {...props} />, color: 'text-blue-500', label: 'Like' },
    heart: { component: (props) => <NativeEmoji emoji="❤️" {...props} />, color: 'text-red-500', label: 'Love' }, // <-- FIXED: "love" is now "heart"
    haha: { component: (props) => <NativeEmoji emoji="😂" {...props} />, color: 'text-yellow-500', label: 'Haha' },
    wow: { component: (props) => <NativeEmoji emoji="😮" {...props} />, color: 'text-amber-500', label: 'Wow' },
    sad: { component: (props) => <NativeEmoji emoji="😢" {...props} />, color: 'text-slate-500', label: 'Sad' },
    angry: { component: (props) => <NativeEmoji emoji="😡" {...props} />, color: 'text-red-700', label: 'Angry' },
    care: { component: (props) => <NativeEmoji emoji="🤗" {...props} />, color: 'text-pink-500', label: 'Care' }
};

const IosEmoji = ({ type = 'like', size = '1.5rem', className = '' }) => {
    const map = {
        like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡', care: '🤗',
    };
    const labelMap = {
        like: 'Like', love: 'Love', haha: 'Haha', wow: 'Wow', sad: 'Sad', angry: 'Angry', care: 'Care',
    };
    return (
        <span
            className={`flex items-center justify-center transition-transform duration-200 ease-out ${className}`}
            role="img"
            aria-label={labelMap[type]}
            style={{ fontSize: size }}
        >
            {map[type]}
        </span>
    );
};

const AnnouncementModal = ({ isOpen, onClose, announcement, userProfile, db, postReactions, onToggleReaction, usersMap }) => {
    const [comments, setComments] = useState([]);
    // --- FIX: Use a local state for the live count within the modal ---
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
            setLiveCommentCount(fetchedComments.length); // Update with the live count

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

            return () => {
                unsubscribeComments();
                commentReactionUnsubs.forEach(unsub => unsub());
            };
        });

        return () => {
            if(unsubscribeComments) unsubscribeComments();
        };
    }, [isOpen, announcement?.id, db]);

    const handlePostComment = async () => { if (!newCommentText.trim() || !commentsCollectionRef) return; try { await addDoc(commentsCollectionRef, { userId: currentUserId, userName: currentUserName, commentText: newCommentText.trim(), createdAt: new Date(), parentId: replyToCommentId }); setNewCommentText(''); setReplyToCommentId(null); setReplyToUserName(''); } catch (error) { console.error("Error adding comment:", error); } };
    const handleReplyClick = (commentId, userName) => { setReplyToCommentId(commentId); setReplyToUserName(userName); setNewCommentText(`@${userName} `); };
    const handleToggleCommentReaction = async (commentId, reactionType) => { if (!currentUserId || !announcement?.id) return; const commentReactionsRef = collection(db, `teacherAnnouncements/${announcement.id}/comments/${commentId}/reactions`); const userCommentReactionRef = doc(commentReactionsRef, currentUserId); const existingCommentReactionType = commentReactions[commentId]?.[currentUserId]; try { if (existingCommentReactionType === reactionType) await deleteDoc(userCommentReactionRef); else await setDoc(userCommentReactionRef, { userId: currentUserId, reactionType: reactionType }); } catch (error) { console.error("Error toggling comment reaction:", error); } };
    const handleStartEditComment = (comment) => { setEditingCommentId(comment.id); setEditingCommentText(comment.commentText); };
    const handleSaveEditComment = async (commentId) => { if (!editingCommentText.trim() || !commentsCollectionRef) return; try { await updateDoc(doc(commentsCollectionRef, commentId), { commentText: editingCommentText.trim(), editedAt: new Date() }); setEditingCommentId(null); setEditingCommentText(''); } catch (error) { console.error("Error updating comment:", error); } };
    const handleCancelEditComment = () => { setEditingCommentId(null); setEditingCommentText(''); };
    const handleDeleteComment = async (commentId) => { if (!commentsCollectionRef) return; try { await deleteDoc(doc(commentsCollectionRef, commentId)); } catch (error) { console.error("Error deleting comment:", error); } };
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

	// Replace the entire function in AnnouncementModal.js with this one.
	const renderReactionCount = (reactions) => {
	    if (!reactions || Object.keys(reactions).length === 0) return null;

	    const allReactionTypes = Object.values(reactions);

	    return (
	        <div className="flex items-center space-x-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); openReactionsBreakdownModal(reactions); }}>
	            <div className="flex items-center">
	                {allReactionTypes.map((type, index) => {
	                    // This lookup will now work correctly with the fixed icon names
	                    const reaction = reactionIcons[type]; 
	                    if (!reaction) return null;

	                    const { component: Icon } = reaction;
	                    const zIndex = allReactionTypes.length - index;

	                    return (
	                        <div
	                            key={index}
	                            className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-white ring-2 ring-white ${index > 0 ? '-ml-2' : ''}`}
	                            style={{ zIndex: zIndex }}
	                        >
	                            <Icon className="text-xl" />
	                        </div>
	                    );
	                })}
	            </div>
	            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium ml-2">{allReactionTypes.length}</span>
	        </div>
	    );
	};
    
    if (!isOpen || !announcement) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-800 rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ease-in-out animate-slide-up">
                <div className="flex items-center justify-center p-4 border-b border-zinc-200 dark:border-zinc-700 relative">
                    <div className="w-10 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full absolute top-2.5"></div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 pt-2">Announcement</h2>
                    {/* --- FIX: Pass the live count back on close --- */}
                    <button onClick={() => onClose(liveCommentCount)} className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center bg-zinc-200/70 dark:bg-zinc-700/70 rounded-full hover:bg-zinc-300/80 dark:hover:bg-zinc-600/80 transition-colors">
                        <FaTimes className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </button>
                </div>
                
                <div className="p-5 overflow-y-auto flex-grow custom-scrollbar">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 mr-4 flex-shrink-0">
                           <UserInitialsAvatar user={usersMap[announcement.teacherId]} size="w-12 h-12 text-lg" />
                        </div>
                        <div>
                            <p className="font-semibold text-zinc-800 dark:text-zinc-100">{usersMap[announcement.teacherId]?.firstName} {usersMap[announcement.teacherId]?.lastName}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{formattedAnnouncementDate}</p>
                        </div>
                    </div>
                    <div className="mb-4 pb-4">
                        <p className="text-zinc-700 dark:text-zinc-300 text-base leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm text-zinc-500 border-y border-zinc-200 dark:border-zinc-700 py-2 my-2">
                        <div>
                           {renderReactionCount(postReactions)}
                        </div>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{liveCommentCount} {liveCommentCount === 1 ? 'Comment' : 'Comments'}</span>
                    </div>

                    <div className="flex justify-around items-center py-1 mb-4">
                        <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(announcement.id, 'post')} onMouseLeave={handleReactionOptionsMouseLeave}>
                            <button className="ios-action-button" onClick={() => onToggleReaction(announcement.id, currentUserPostReaction || 'like')}>
                                {currentUserPostReaction ? <IosEmoji type={currentUserPostReaction} size="1.25rem" /> : <FaThumbsUp className="h-5 w-5" />}
                                <span className={`font-semibold capitalize ml-2 ${currentUserPostReaction ? 'text-blue-500' : ''}`}>{currentUserPostReaction || 'Like'}</span>
                            </button>
                             {hoveredReactionData?.type === 'post' && hoveredReactionData?.id === announcement.id && (
                                <div className="ios-reaction-popup" onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                    {reactionTypes.map((type) => (
                                        <button key={type} className="p-1" onClick={() => { handleReactionOptionsMouseLeave(); onToggleReaction(announcement.id, type); }}>
                                            <IosEmoji type={type} size="2rem" className="hover:scale-125" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className="ios-action-button">
                            <FaComment className="h-5 w-5" />
                            <span className="font-semibold ml-2">Comment</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {topLevelComments.length === 0 && <p className="text-zinc-500 text-center py-6">Be the first to comment.</p>}
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
                                        <div className="relative group bg-zinc-100 dark:bg-zinc-700/50 p-3 rounded-xl">
                                            {isBeingEdited ? (
                                                <textarea className="ios-textarea w-full" rows="3" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} autoFocus />
                                            ) : (
                                                <>
                                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{usersMap[comment.userId]?.firstName} {usersMap[comment.userId]?.lastName}</p>
                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-1 break-words">
                                                        {isTruncated && !showFullComment ? `${comment.commentText.substring(0, COMMENT_TRUNCATE_LENGTH)}...` : comment.commentText}
                                                        {isTruncated && <button onClick={() => toggleCommentExpansion(comment.id)} className="text-blue-500 hover:underline ml-1 text-xs font-semibold">{showFullComment ? 'Less' : 'More'}</button>}
                                                    </p>
                                                </>
                                            )}
                                            {isCurrentUserComment && !isBeingEdited && (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button onClick={() => handleStartEditComment(comment)} className="p-1 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-600/50 transition" title="Edit"><FaEdit className="w-4 h-4 text-zinc-500" /></button>
                                                    <button onClick={() => handleDeleteComment(comment.id)} className="p-1 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-600/50 transition" title="Delete"><FaTrash className="w-4 h-4 text-rose-500" /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mt-1 pl-2 space-x-3">
                                            {isBeingEdited ? (
                                                <div className="flex justify-start gap-2 mt-1">
                                                    <button className="ios-edit-button-secondary" onClick={handleCancelEditComment}>Cancel</button>
                                                    <button className="ios-edit-button-primary" onClick={() => handleSaveEditComment(comment.id)}>Save</button>
                                                </div>
                                            ) : (
                                                 <>
                                                    <span>{formatRelativeTime(comment.createdAt)}</span>
                                                    <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(comment.id, 'comment')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                        <button className="font-semibold hover:underline" onClick={() => handleToggleCommentReaction(comment.id, currentUserCommentReaction || 'like')}>
                                                            <span className={`capitalize ${currentUserCommentReaction ? 'text-blue-500' : ''}`}>
                                                                {currentUserCommentReaction || 'Like'}
                                                            </span>
                                                        </button>
                                                        {hoveredReactionData?.type === 'comment' && hoveredReactionData?.id === comment.id && (
                                                            <div className="ios-reaction-popup" style={{bottom: '100%', marginBottom: '6px'}} onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                {reactionTypes.map((type) => (
                                                                    <button key={type} className="p-0.5" onClick={() => { handleReactionOptionsMouseLeave(); handleToggleCommentReaction(comment.id, type); }}>
                                                                        <IosEmoji type={type} size="1.75rem" className="hover:scale-125" />
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
                                                            <div className="relative group bg-zinc-100 dark:bg-zinc-700/50 p-2.5 rounded-xl">
                                                                {isReplyBeingEdited ? <textarea className="ios-textarea w-full" rows="2" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} autoFocus /> : <>
                                                                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{usersMap[reply.userId]?.firstName} {usersMap[reply.userId]?.lastName}</p>
                                                                    <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-0.5 break-words">{reply.commentText}</p>
                                                                </>}
                                                                {isCurrentUserReply && !isReplyBeingEdited && (
                                                                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => handleStartEditComment(reply)} className="p-1" title="Edit Reply"><FaEdit className="w-3 h-3 text-zinc-500" /></button>
                                                                        <button onClick={() => handleDeleteComment(reply.id)} className="p-1" title="Delete Reply"><FaTrash className="w-3 h-3 text-rose-500" /></button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 mt-1 pl-2 space-x-3">
                                                                {isReplyBeingEdited ? <div className="flex gap-2 mt-1"><button className="ios-edit-button-secondary" onClick={handleCancelEditComment}>Cancel</button><button className="ios-edit-button-primary" onClick={() => handleSaveEditComment(reply.id)}>Save</button></div> : <>
                                                                    <span>{formatRelativeTime(reply.createdAt)}</span>
                                                                    <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(reply.id, 'reply')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                        <button className="font-semibold hover:underline" onClick={() => handleToggleCommentReaction(reply.id, currentUserReplyReaction || 'like')}>
                                                                            <span className={`capitalize ${currentUserReplyReaction ? 'text-blue-500' : ''}`}>
                                                                                {currentUserReplyReaction || 'Like'}
                                                                            </span>
                                                                        </button>
                                                                        {hoveredReactionData?.type === 'reply' && hoveredReactionData?.id === reply.id && (
                                                                            <div className="ios-reaction-popup" style={{bottom: '100%', marginBottom: '6px'}} onMouseEnter={() => clearTimeout(timeoutRef.current)} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                                                {reactionTypes.map((type) => (
                                                                                    <button key={type} className="p-0.5" onClick={() => { handleReactionOptionsMouseLeave(); handleToggleCommentReaction(reply.id, type); }}>
                                                                                        <IosEmoji type={type} size="1.75rem" className="hover:scale-125" />
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

                <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md">
                    {replyToCommentId && (
                        <div className="mb-2 text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between px-3">
                            Replying to <span className="font-semibold text-zinc-800 dark:text-zinc-200 ml-1">{replyToUserName}</span>
                            <button onClick={() => { setReplyToCommentId(null); setNewCommentText(''); setReplyToUserName(''); }} className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600">
                                <FaTimes className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 flex-shrink-0">
                            <UserInitialsAvatar user={userProfile} size="w-9 h-9" />
                        </div>
                        <div className="relative flex-grow">
                             <textarea className="ios-textarea w-full !pr-12" rows="1" placeholder="Add a comment..." value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} />
                             <button onClick={handlePostComment} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 disabled:scale-75 disabled:opacity-50" disabled={!newCommentText.trim()}>
                                 <FaPaperPlane className={`w-4 h-4 transition-colors ${newCommentText.trim() ? 'text-blue-500' : 'text-zinc-400'}`} />
                             </button>
                        </div>
                    </div>
                </div>
            </div>

            <ReactionsBreakdownModal isOpen={isReactionsBreakdownModalOpen} onClose={closeReactionsBreakdownModal} reactionsData={reactionsForBreakdownModal} usersMap={usersMap} />
            <style jsx global>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                
                @keyframes slide-up { 0% { transform: translateY(20px) scale(0.98); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #52525b; }
                
                .ios-action-button { display: flex; align-items: center; padding: 8px 16px; border-radius: 9999px; font-size: 0.9rem; color: #3f3f46; background-color: #f4f4f5; transition: background-color 0.2s ease; }
                .ios-action-button:hover { background-color: #e4e4e7; }
                .dark .ios-action-button { color: #d4d4d8; background-color: #3f3f46; }
                .dark .ios-action-button:hover { background-color: #52525b; }
                
                .ios-reaction-popup { position: absolute; left: 50%; transform: translateX(-50%); background-color: white; border-radius: 9999px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); padding: 4px; display: flex; gap: 4px; align-items: center; z-index: 50; }
                .dark .ios-reaction-popup { background-color: #27272a; }

                .ios-textarea { background-color: #f4f4f5; color: #18181b; border: 1px solid #f4f4f5; border-radius: 18px; padding: 8px 16px; font-size: 0.95rem; resize: none; transition: all 0.2s ease; line-height: 1.4; }
                .ios-textarea:focus { background-color: white; outline: none; border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.5); }
                .dark .ios-textarea { background-color: #3f3f46; color: #f4f4f5; border-color: #3f3f46; }
                .dark .ios-textarea:focus { background-color: #27272a; border-color: #60a5fa; }
                
                .ios-edit-button-primary { background-color: #007aff; color: white; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; transition: background-color 0.2s ease; }
                .ios-edit-button-primary:hover { background-color: #0056b3; }
                .ios-edit-button-secondary { background-color: #e5e7eb; color: #374151; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; transition: background-color 0.2s ease; }
                .dark .ios-edit-button-secondary { background-color: #52525b; color: #e5e7eb; }
                .ios-edit-button-secondary:hover { background-color: #d1d5db; }
                .dark .ios-edit-button-secondary:hover { background-color: #71717a; }
            `}</style>
        </div>
    );
};

export default AnnouncementModal;