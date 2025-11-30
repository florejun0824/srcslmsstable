import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom'; // Added for Portal
import {
  PaperAirplaneIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  LockClosedIcon,
  ChatBubbleLeftIcon 
} from '@heroicons/react/24/solid';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction,
  getDocs,
  where,
  documentId,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import ReactionsBreakdownModal from '../common/ReactionsBreakdownModal';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import Linkify from 'react-linkify';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext'; // [Added] Theme Context

// --- HELPER: Hyper-real Emojis ---
const EmojiBase = ({ symbol, className = "" }) => (
    <span 
        className={`inline-block transform transition-transform duration-200 ${className}`} 
        style={{ 
            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
            filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.2))'
        }}
    >
        {symbol}
    </span>
);

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

const reactionIcons = {
  like: { component: (props) => <EmojiBase symbol="👍" {...props} />, color: 'text-blue-500', label: 'Like' },
  love: { component: (props) => <EmojiBase symbol="❤️" {...props} />, color: 'text-red-500', label: 'Love' },
  haha: { component: (props) => <EmojiBase symbol="😂" {...props} />, color: 'text-yellow-500', label: 'Haha' },
  wow: { component: (props) => <EmojiBase symbol="😮" {...props} />, color: 'text-amber-500', label: 'Wow' },
  sad: { component: (props) => <EmojiBase symbol="😢" {...props} />, color: 'text-blue-400', label: 'Sad' },
  angry: { component: (props) => <EmojiBase symbol="😡" {...props} />, color: 'text-red-600', label: 'Angry' },
  care: { component: (props) => <EmojiBase symbol="🤗" {...props} />, color: 'text-pink-500', label: 'Care' },
};

const componentDecorator = (href, text, key) => (
  <a
    href={href}
    key={key}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-bold transition-colors underline decoration-blue-300/50 hover:decoration-blue-500"
    onClick={(e) => e.stopPropagation()}
  >
    {text}
  </a>
);

// --- [ADDED] Helper: Monet/Theme Background Extraction ---
const getThemeModalStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': 
            return { background: 'linear-gradient(to bottom, rgba(15, 23, 66, 0.95), rgba(15, 23, 66, 0.9))', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': 
            return { background: 'linear-gradient(to bottom, rgba(60, 10, 20, 0.95), rgba(60, 10, 20, 0.9))', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': 
            return { background: 'linear-gradient(to bottom, rgba(30, 25, 10, 0.95), rgba(30, 25, 10, 0.9))', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': 
            return { background: 'linear-gradient(to bottom, rgba(20, 35, 20, 0.95), rgba(20, 35, 20, 0.9))', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': 
            return { background: 'linear-gradient(to bottom, rgba(35, 5, 45, 0.95), rgba(35, 5, 45, 0.9))', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': 
            return { background: 'linear-gradient(to bottom, rgba(50, 10, 20, 0.95), rgba(50, 10, 20, 0.9))', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': 
            return { background: 'linear-gradient(to bottom, rgba(5, 5, 10, 0.95), rgba(5, 5, 10, 0.9))', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: 
            return {}; // Fallback to class-based gradient
    }
};

// --- MAIN COMPONENT ---

const StudentPostCommentsModal = ({
  isOpen,
  onClose,
  post,
  userProfile,
  onToggleReaction,
}) => {
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToUserName, setReplyToUserName] = useState('');
  const [commentReactions, setCommentReactions] = useState({});
  const [hoveredReactionData, setHoveredReactionData] = useState(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
  const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);
  const [usersMap, setUsersMap] = useState({});

  const timeoutRef = useRef(null);
  const commentInputRef = useRef(null);
  
  // [Added] Theme Context
  const { activeOverlay } = useTheme();
  const dynamicThemeStyle = getThemeModalStyle(activeOverlay);
  
  const canReact = userProfile?.role === 'teacher' || userProfile?.role === 'admin' || (userProfile?.canReact || false);
  const usersMapRef = useRef(usersMap);

  useEffect(() => { usersMapRef.current = usersMap; }, [usersMap]);

  // --- Data Fetching Logic ---
  const fetchMissingUsers = useCallback(async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter((id) => !!id))];
    if (uniqueIds.length === 0) return;
    const usersToFetch = uniqueIds.filter((id) => !usersMapRef.current[id]);
    if (usersToFetch.length === 0) return;

    try {
      let newUsers = {};
      for (let i = 0; i < usersToFetch.length; i += 30) {
        const chunk = usersToFetch.slice(i, i + 30);
        const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const userSnap = await getDocs(usersQuery);
        userSnap.forEach((doc) => { newUsers[doc.id] = doc.data(); });
      }
      setUsersMap((prevMap) => ({ ...prevMap, ...newUsers }));
    } catch (err) { console.error('Error fetching users:', err); }
  }, []);

  const currentUserId = userProfile?.id;
  const currentUserName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();

  const commentsCollectionRef = useMemo(() => {
    return post?.id ? collection(db, `studentPosts/${post.id}/comments`) : null;
  }, [post?.id]);

  const postReactions = post?.reactions || {};

  useEffect(() => {
    const handleEsc = (event) => { if (event.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    try { return new Date(timestamp); } catch (e) { return null; }
  };

  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return `Just now`;
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
    if (isOpen && post && userProfile) {
      const initialUserMap = {
        [userProfile.id]: userProfile,
        [post.authorId]: {
          firstName: post.authorName.split(' ')[0],
          lastName: post.authorName.split(' ')[1] || '',
          photoURL: post.authorPhotoURL,
          id: post.authorId,
        },
      };
      setUsersMap(initialUserMap);
      if (post.reactions) fetchMissingUsers(Object.keys(post.reactions));
    } else {
      setComments([]);
      setCommentReactions({});
      setUsersMap({});
    }
  }, [isOpen, post, userProfile, fetchMissingUsers]);

  useEffect(() => {
    if (!isOpen || !post?.id || !commentsCollectionRef) {
      setComments([]);
      setCommentReactions({});
      return;
    }

    const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestampToDate(doc.data().createdAt),
      }));
      setComments(fetchedComments);

      const commenterIds = fetchedComments.map((c) => c.userId);
      fetchMissingUsers(commenterIds);

      const commentReactionUnsubs = fetchedComments.map((comment) => {
        const commentReactionsRef = collection(db, `studentPosts/${post.id}/comments/${comment.id}/reactions`);
        return onSnapshot(commentReactionsRef, (reactionSnap) => {
          const reactionsForThisComment = {};
          const reactorIds = [];
          reactionSnap.docs.forEach((rDoc) => {
            reactionsForThisComment[rDoc.id] = rDoc.data().reactionType;
            reactorIds.push(rDoc.id);
          });
          setCommentReactions((prev) => ({ ...prev, [comment.id]: reactionsForThisComment }));
          fetchMissingUsers(reactorIds);
        });
      });
      return () => commentReactionUnsubs.forEach((unsub) => unsub());
    });
    return () => { if (unsubscribeComments) unsubscribeComments(); };
  }, [isOpen, post?.id, fetchMissingUsers, commentsCollectionRef]);

  // --- Action Handlers ---

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !commentsCollectionRef) return;
    const postRef = doc(db, 'studentPosts', post.id);
    const newCommentRef = doc(commentsCollectionRef);

    try {
      await runTransaction(db, async (transaction) => {
        const annDoc = await transaction.get(postRef);
        if (!annDoc.exists()) throw 'Post does not exist!';
        const newCount = (annDoc.data().commentsCount || 0) + 1;
        transaction.update(postRef, { commentsCount: newCount });
        transaction.set(newCommentRef, {
          userId: currentUserId,
          userName: currentUserName,
          commentText: newCommentText.trim(),
          createdAt: new Date(),
          parentId: replyToCommentId || null,
        });
      });
      setNewCommentText('');
      setReplyToCommentId(null);
      setReplyToUserName('');
    } catch (error) { console.error('Error posting comment:', error); }
  };

  const handleToggleCommentReaction = async (commentId, reactionType) => {
    if (!currentUserId || !post?.id) return;
    const reactionRef = doc(db, `studentPosts/${post.id}/comments/${commentId}/reactions`, currentUserId);
    const currentReaction = commentReactions[commentId]?.[currentUserId];
    try {
      if (currentReaction === reactionType) await deleteDoc(reactionRef);
      else await setDoc(reactionRef, { reactionType });
    } catch (error) { console.error('Error toggling comment reaction:', error); }
  };

  const handleSetReplyTo = (comment) => {
    const userName = usersMap[comment.userId]?.firstName ? `${usersMap[comment.userId].firstName} ${usersMap[comment.userId].lastName}` : 'User';
    setReplyToCommentId(comment.id);
    setReplyToUserName(userName);
    commentInputRef.current?.focus();
  };

  const handleStartEditing = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.commentText);
  };

  const handleCancelEditing = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEdit = async () => {
    if (!editingCommentText.trim() || !editingCommentId) return;
    const commentRef = doc(db, `studentPosts/${post.id}/comments`, editingCommentId);
    try {
      await updateDoc(commentRef, { commentText: editingCommentText.trim() });
      handleCancelEditing();
    } catch (error) { console.error('Error updating comment:', error); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    const commentRef = doc(db, `studentPosts/${post.id}/comments`, commentId);
    const postRef = doc(db, 'studentPosts', post.id);
    const repliesToDelete = comments.filter((c) => c.parentId === commentId);

    try {
      await runTransaction(db, async (transaction) => {
        const annDoc = await transaction.get(postRef);
        if (!annDoc.exists()) throw 'Post does not exist!';
        const deleteCount = 1 + repliesToDelete.length;
        const newCount = Math.max(0, (annDoc.data().commentsCount || 0) - deleteCount);
        transaction.update(postRef, { commentsCount: newCount });
        transaction.delete(commentRef);
        for (const reply of repliesToDelete) {
          const replyRef = doc(db, `studentPosts/${post.id}/comments`, reply.id);
          transaction.delete(replyRef);
        }
      });
    } catch (error) { console.error('Error deleting comment:', error); }
  };

  const toggleReactionPicker = (entityId, type) => {
    if (activeReactionPicker?.id === entityId && activeReactionPicker?.type === type) setActiveReactionPicker(null);
    else setActiveReactionPicker({ id: entityId, type });
  };

  const openReactionsBreakdownModal = (reactions) => {
    setReactionsForBreakdownModal(reactions);
    setIsReactionsBreakdownModalOpen(true);
  };
  const closeReactionsBreakdownModal = () => {
    setIsReactionsBreakdownModalOpen(false);
    setReactionsForBreakdownModal(null);
  };

  const handleReactionOptionsMouseEnter = (entityId, type) => {
    clearTimeout(timeoutRef.current);
    setHoveredReactionData({ type, id: entityId });
  };
  const handleReactionOptionsMouseLeave = () => {
    timeoutRef.current = setTimeout(() => { setHoveredReactionData(null); }, 300);
  };

  // --- Render Helpers ---

  const renderReactionPicker = (entityId, type, onSelect) => {
    const isActive = activeReactionPicker?.id === entityId && activeReactionPicker?.type === type;
    const isHovered = hoveredReactionData?.id === entityId && hoveredReactionData?.type === type;

    if (!isActive && !isHovered) return null;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: -5, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.9 }}
        className="absolute bottom-full left-0 mb-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-full shadow-2xl border border-white/40 dark:border-white/10 p-2 flex gap-1 z-50"
      >
        {reactionTypes.map((rType) => (
          <motion.button
            key={rType}
            whileHover={{ scale: 1.4, y: -5 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 text-2xl hover:drop-shadow-lg transition-all origin-bottom"
            onClick={() => {
              setActiveReactionPicker(null);
              handleReactionOptionsMouseLeave();
              onSelect(rType);
            }}
          >
            {reactionIcons[rType].component({})}
          </motion.button>
        ))}
      </motion.div>
    );
  };

  const renderReactionCount = (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) return null;
    const counts = {};
    Object.values(reactions).forEach((type) => { counts[type] = (counts[type] || 0) + 1; });
    const sortedUniqueReactions = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const totalReactions = Object.keys(reactions).length;

    return (
      <div
        className="flex items-center gap-1.5 cursor-pointer bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full border border-white/40 dark:border-white/5 hover:bg-white/80 transition-all shadow-sm"
        onClick={(e) => {
          e.stopPropagation();
          openReactionsBreakdownModal(reactions);
        }}
      >
        <div className="flex items-center -space-x-1.5">
          {sortedUniqueReactions.slice(0, 3).map(([type], index) => {
            const reaction = reactionIcons[type];
            if (!reaction) return null;
            const { component: Icon } = reaction;
            return (
              <div key={type} className="relative w-4 h-4 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm z-10" style={{ zIndex: 30 - index }}>
                <div className="transform scale-110"><Icon /></div>
              </div>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">{totalReactions}</span>
      </div>
    );
  };

  const topLevelComments = comments.filter((comment) => !comment.parentId);
  const getReplies = (commentId) => comments.filter((comment) => comment.parentId === commentId);

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  if (!isOpen || !post) return null;

  const authorUser = usersMap[post.authorId] || {
    firstName: post.authorName.split(' ')[0],
    lastName: post.authorName.split(' ')[1] || '',
    photoURL: post.authorPhotoURL,
    id: post.authorId,
  };

  const isPostAuthorMe = userProfile.id === post.authorId;
  const currentUserRole = userProfile.role;
  const postAuthorProfileLink = isPostAuthorMe
    ? (currentUserRole === 'student' ? '/student/profile' : '/dashboard/profile')
    : (currentUserRole === 'student' ? `/student/profile/${post.authorId}` : `/dashboard/profile/${post.authorId}`);

  // --- PORTAL IMPLEMENTATION ---
  // This moves the modal to document.body to break out of the dashboard's stacking context
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center" onClick={handleBackdropClick}>
        {/* Backdrop with blur */}
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-lg"
        />

        {/* Glass Modal */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            style={dynamicThemeStyle} // [Applied Theme Style]
            className={`
                relative w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden
                backdrop-blur-3xl
                rounded-[40px]
                shadow-[0_25px_80px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.7)]
                border border-white/50 dark:border-white/10
                ring-1 ring-white/40 dark:ring-white/5
                ${activeOverlay === 'none' ? 'bg-gradient-to-b from-white/90 via-white/80 to-white/60 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-900/60' : ''}
            `}
        >
            {/* --- Header --- */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5 bg-white/10 backdrop-blur-sm z-20">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                    Post by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{post.authorName}</span>
                </h2>
                <button 
                    onClick={onClose} 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-all duration-300 group"
                >
                    <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-300 group-hover:text-white" />
                </button>
            </div>

            {/* --- Scrollable Body --- */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative">
                
                {/* Original Post Context Card */}
                <div className="flex gap-4 mb-8 group">
                    <div className="flex-shrink-0 pt-1">
                        <Link to={postAuthorProfileLink} state={{ profileData: authorUser }} className="relative block">
                            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-blue-400 to-indigo-400 shadow-md">
                                <UserInitialsAvatar user={authorUser} size="full" />
                            </div>
                        </Link>
                    </div>
                    <div className="flex-1 min-w-0">
                        {/* Glass Context Box */}
                        <div className="relative bg-white/40 dark:bg-white/5 p-5 rounded-[24px] rounded-tl-none border border-white/40 dark:border-white/10 shadow-sm backdrop-blur-md transition-all hover:bg-white/60 dark:hover:bg-white/10">
                            <Link to={postAuthorProfileLink} state={{ profileData: authorUser }}>
                                <div className="font-bold text-slate-900 dark:text-white text-[15px] tracking-tight mb-1 hover:text-blue-600 transition-colors">
                                    {post.authorName}
                                </div>
                            </Link>
                            <div className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-normal">
                                <Linkify componentDecorator={componentDecorator}>{post.content}</Linkify>
                            </div>

                            {/* [UPDATED] Image Content Area */}
                            {(post.images?.length > 0 || post.imageURL) && (
                                <div className="mt-3 rounded-xl overflow-hidden border border-white/40 dark:border-white/10 shadow-sm">
                                    {/* A. Multiple Images Grid */}
                                    {post.images && post.images.length > 1 ? (
                                        <div className={`grid gap-0.5 ${
                                            post.images.length === 2 ? 'grid-cols-2' :
                                            post.images.length === 3 ? 'grid-cols-2' : 
                                            'grid-cols-2' 
                                        }`}>
                                            {post.images.slice(0, 4).map((img, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`relative overflow-hidden bg-slate-100 dark:bg-white/5 ${
                                                        post.images.length === 3 && idx === 0 ? 'row-span-2 h-full' : 'aspect-square'
                                                    }`}
                                                >
                                                    <img 
                                                        src={img} 
                                                        alt={`Attachment ${idx + 1}`} 
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                                                        onClick={() => window.open(img, '_blank')}
                                                    />
                                                    {post.images.length > 4 && idx === 3 && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer" onClick={() => window.open(post.images[3], '_blank')}>
                                                            <span className="text-white font-bold text-lg">+{post.images.length - 4}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* B. Single Image */
                                        <div className="relative bg-slate-100 dark:bg-white/5">
                                            <img 
                                                src={post.images ? post.images[0] : post.imageURL} 
                                                alt="Post attachment" 
                                                className="w-full max-h-[400px] object-cover cursor-pointer"
                                                onClick={() => window.open(post.images ? post.images[0] : post.imageURL, '_blank')}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Post Stats / Meta in Footer of Box */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                                <span className="text-xs text-slate-400 font-semibold tracking-wide">{formatRelativeTime(convertTimestampToDate(post.createdAt))}</span>
                                {renderReactionCount(postReactions)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-4 mb-4">
                   <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent"></div>
                   <span className="absolute px-3 bg-transparent text-xs font-bold text-slate-400 uppercase tracking-widest">Comments</span>
                </div>

                {/* Comments Feed */}
                <div className="space-y-6 pb-20">
                    {topLevelComments.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 opacity-60">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <ChatBubbleLeftIcon className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-bold">No comments yet.</p>
                            <p className="text-xs text-slate-400">Be the first to spark a conversation!</p>
                        </div>
                    )}
                    
                    {topLevelComments.map((comment) => {
                        const isCurrentUserComment = comment.userId === currentUserId;
                        const commentAuthor = usersMap[comment.userId] || { firstName: 'Unknown', lastName: 'User', id: comment.userId };
                        
                        return (
                            <CommentItem 
                                key={comment.id}
                                comment={comment}
                                author={commentAuthor}
                                isCurrentUser={isCurrentUserComment}
                                canReact={canReact}
                                reactions={commentReactions[comment.id]}
                                currentUserReaction={commentReactions[comment.id]?.[currentUserId]}
                                onToggleReaction={handleToggleCommentReaction}
                                onReply={handleSetReplyTo}
                                onEdit={handleStartEditing}
                                onDelete={handleDeleteComment}
                                isEditing={editingCommentId === comment.id}
                                editingText={editingCommentText}
                                setEditingText={setEditingCommentText}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={handleCancelEditing}
                                activePicker={activeReactionPicker}
                                togglePicker={toggleReactionPicker}
                                hoveredReaction={hoveredReactionData}
                                setHoveredReaction={handleReactionOptionsMouseEnter}
                                clearHoveredReaction={handleReactionOptionsMouseLeave}
                                renderPicker={renderReactionPicker}
                                renderCount={renderReactionCount}
                                replies={getReplies(comment.id)}
                                usersMap={usersMap}
                                userProfile={userProfile}
                            />
                        );
                    })}
                </div>
            </div>

            {/* --- Footer Input (Floating Glass Dock) --- */}
            {canReact ? (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 z-30">
                    <div className="relative max-w-xl mx-auto">
                        {replyToCommentId && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="flex justify-between items-center px-4 py-1 mb-1 mx-2 text-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-t-xl border border-b-0 border-slate-200 dark:border-white/10 text-slate-500"
                            >
                                <span>Replying to <span className="font-bold text-blue-500">{replyToUserName}</span></span>
                                <button onClick={() => { setReplyToCommentId(null); setReplyToUserName(''); }} className="hover:text-red-500"><XMarkIcon className="w-3 h-3"/></button>
                            </motion.div>
                        )}
                        <div className="flex items-end gap-2 bg-white/70 dark:bg-black/40 backdrop-blur-xl p-2 rounded-[28px] border border-white/50 dark:border-white/10 shadow-xl shadow-blue-900/5 dark:shadow-black/50 ring-1 ring-white/50">
                            <div className="flex-shrink-0 mb-1 ml-1">
                                <UserInitialsAvatar user={userProfile} size="sm" className="rounded-full shadow-sm" />
                            </div>
                            <div className="flex-1 relative">
                                <textarea
                                    ref={commentInputRef}
                                    className="w-full pl-3 pr-12 py-2.5 max-h-32 rounded-2xl bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-0 resize-none text-[15px] leading-relaxed"
                                    rows="1"
                                    placeholder="Add a comment..."
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }}}
                                    style={{ minHeight: '44px' }}
                                />
                            </div>
                            <button
                                onClick={handlePostComment}
                                disabled={!newCommentText.trim()}
                                className="mb-1 mr-1 p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-90"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                 <div className="p-4 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-white/20 dark:border-white/5 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold border border-white/10">
                        <LockClosedIcon className="w-3 h-3" /> Level 40 required to comment
                    </div>
                 </div>
            )}
        </motion.div>
      
        <ReactionsBreakdownModal isOpen={isReactionsBreakdownModalOpen} onClose={closeReactionsBreakdownModal} reactionsData={reactionsForBreakdownModal} />
    </div>,
    document.body // Portal target
  );
};

// --- SUB-COMPONENT: Comment Item ---
const CommentItem = ({ 
    comment, author, isCurrentUser, canReact, reactions, currentUserReaction, 
    onToggleReaction, onReply, onEdit, onDelete, isEditing, editingText, 
    setEditingText, onSaveEdit, onCancelEdit, activePicker, togglePicker, 
    hoveredReaction, setHoveredReaction, clearHoveredReaction, renderPicker, 
    renderCount, replies, usersMap, userProfile 
}) => {
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 group"
        >
            <div className="flex-shrink-0 mt-1">
                <UserInitialsAvatar user={author} size="sm" className="rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="relative group/bubble">
                    {/* Glass Bubble */}
                    <div className="bg-white/60 dark:bg-white/10 backdrop-blur-md p-3.5 rounded-[20px] rounded-tl-none border border-white/40 dark:border-white/5 shadow-sm inline-block max-w-full min-w-[120px]">
                        
                        {/* Floating Actions (Edit/Delete) */}
                        {isCurrentUser && !isEditing && (
                            <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 bg-white dark:bg-slate-800 shadow-lg rounded-full p-1 border border-slate-100 dark:border-slate-700 z-10 scale-90 group-hover/bubble:scale-100">
                                <button onClick={() => onEdit(comment)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"><PencilIcon className="w-3 h-3" /></button>
                                <button onClick={() => onDelete(comment.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-3 h-3" /></button>
                            </div>
                        )}
                        
                        <span className="text-[13px] font-bold text-slate-900 dark:text-white block mb-0.5 tracking-tight">{author.firstName} {author.lastName}</span>
                        
                        {isEditing ? (
                            <div className="mt-1 w-full min-w-[240px]">
                                <textarea 
                                    className="w-full p-3 text-sm rounded-xl bg-white/50 dark:bg-black/30 border-none ring-1 ring-blue-500/30 focus:ring-blue-500 mb-2 resize-none" 
                                    value={editingText} 
                                    onChange={(e) => setEditingText(e.target.value)} 
                                    autoFocus 
                                    rows={2}
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={onCancelEdit} className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-full transition-colors">Cancel</button>
                                    <button onClick={onSaveEdit} className="px-3 py-1 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-full shadow-md transition-colors">Save</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[15px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed font-normal">
                                 <Linkify componentDecorator={componentDecorator}>{comment.commentText}</Linkify>
                            </p>
                        )}
                    </div>

                    {/* Reactions Count Overlay (Floating Pill) */}
                    {reactions && Object.keys(reactions).length > 0 && (
                         <div className="absolute -bottom-3 right-0 transform translate-x-1/4">
                             {renderCount(reactions)}
                         </div>
                    )}
                </div>

                {/* Actions Row */}
                {canReact && (
                    <div className="flex items-center gap-4 mt-1.5 pl-2">
                        {/* Like Button & Picker */}
                        <div className="relative" onMouseEnter={() => setHoveredReaction(comment.id, 'comment')} onMouseLeave={clearHoveredReaction}>
                            <button 
                                onClick={() => togglePicker(comment.id, 'comment')}
                                className={`text-xs font-bold hover:underline transition-colors ${currentUserReaction ? reactionIcons[currentUserReaction].color : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                {currentUserReaction ? reactionIcons[currentUserReaction].label : 'Like'}
                            </button>
                            {renderPicker(comment.id, 'comment', (type) => onToggleReaction(comment.id, type))}
                        </div>
                        <button onClick={() => onReply(comment)} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline transition-colors">Reply</button>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-semibold">{comment.createdAt && new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                )}

                {/* Nested Replies */}
                {replies.length > 0 && (
                    <div className="mt-3 pl-4 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 dark:from-slate-700 to-transparent"></div>
                        <div className="space-y-4">
                            {replies.map(reply => {
                                const replyAuthor = usersMap[reply.userId] || { firstName: 'Unknown', lastName: 'User', id: reply.userId };
                                const isCurrentUserReply = reply.userId === userProfile?.id;
                                return (
                                    <CommentItem 
                                        key={reply.id}
                                        comment={reply}
                                        author={replyAuthor}
                                        isCurrentUser={isCurrentUserReply}
                                        canReact={canReact}
                                        reactions={null}
                                        currentUserReaction={null}
                                        onToggleReaction={onToggleReaction}
                                        onReply={() => {}} 
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        isEditing={false}
                                        editingText=""
                                        setEditingText={() => {}}
                                        onSaveEdit={() => {}}
                                        onCancelEdit={() => {}}
                                        activePicker={null}
                                        togglePicker={() => {}}
                                        hoveredReaction={null}
                                        setHoveredReaction={() => {}}
                                        clearHoveredReaction={() => {}}
                                        renderPicker={() => null}
                                        renderCount={() => null}
                                        replies={[]}
                                        usersMap={usersMap}
                                        userProfile={userProfile}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default StudentPostCommentsModal;