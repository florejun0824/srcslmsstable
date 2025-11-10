import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  FaPaperPlane,
  FaEdit,
  FaTrash,
  FaThumbsUp,
  FaComment,
  FaTimes,
} from 'react-icons/fa';
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

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];

const NativeEmoji = ({ emoji, ...props }) => <span {...props}>{emoji}</span>;

const reactionIcons = {
  like: {
    component: (props) => <NativeEmoji emoji="👍" {...props} />,
    color: 'text-blue-500 dark:text-blue-400',
    label: 'Like',
  },
  love: {
    component: (props) => <NativeEmoji emoji="❤️" {...props} />,
    color: 'text-red-500 dark:text-red-400',
    label: 'Love',
  },
  haha: {
    component: (props) => <NativeEmoji emoji="😂" {...props} />,
    color: 'text-yellow-500 dark:text-yellow-400',
    label: 'Haha',
  },
  wow: {
    component: (props) => <NativeEmoji emoji="😮" {...props} />,
    color: 'text-amber-500 dark:text-amber-400',
    label: 'Wow',
  },
  sad: {
    component: (props) => <NativeEmoji emoji="😢" {...props} />,
    color: 'text-slate-500 dark:text-slate-400',
    label: 'Sad',
  },
  angry: {
    component: (props) => <NativeEmoji emoji="😡" {...props} />,
    color: 'text-red-700 dark:text-red-500',
    label: 'Angry',
  },
  care: {
    component: (props) => <NativeEmoji emoji="🤗" {...props} />,
    color: 'text-pink-500 dark:text-pink-400',
    label: 'Care',
  },
};

const componentDecorator = (href, text, key) => (
  <a
    href={href}
    key={key}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
    onClick={(e) => e.stopPropagation()}
  >
    {text}
  </a>
);

const StudentPostCommentsModal = ({
  isOpen,
  onClose,
  post,
  userProfile,
  onToggleReaction,
}) => {
  const [comments, setComments] = useState([]);
  const [liveCommentCount, setLiveCommentCount] = useState(
    post?.commentsCount || 0,
  );
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToUserName, setReplyToUserName] = useState('');
  const [commentReactions, setCommentReactions] = useState({});
  const [hoveredReactionData, setHoveredReactionData] = useState(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] =
    useState(false);
  const [reactionsForBreakdownModal, setReactionsForBreakdownModal] =
    useState(null);

  const [usersMap, setUsersMap] = useState({});

  const timeoutRef = useRef(null);
  const commentInputRef = useRef(null);

  // --- FIX 1 (Permissions): Define permission flag ---
  const canReact =
    userProfile?.role === 'teacher' ||
    userProfile?.role === 'admin' ||
    (userProfile?.canReact || false);

  // --- FIX 2 (Race Condition): Add a ref to track usersMap ---
  const usersMapRef = useRef(usersMap);
  useEffect(() => {
    usersMapRef.current = usersMap;
  }, [usersMap]);

  // --- FIX 2 (Race Condition): Create a safe fetcher ---
  const fetchMissingUsers = useCallback(async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter((id) => !!id))];
    if (uniqueIds.length === 0) return;

    // Use the ref to get the *current* usersMap
    const usersToFetch = uniqueIds.filter((id) => !usersMapRef.current[id]);

    if (usersToFetch.length === 0) return;

    try {
      let newUsers = {};
      // Batch in groups of 30 (Firebase 'in' query limit)
      for (let i = 0; i < usersToFetch.length; i += 30) {
        const chunk = usersToFetch.slice(i, i + 30);
        const usersQuery = query(
          collection(db, 'users'),
          where(documentId(), 'in', chunk),
        );
        const userSnap = await getDocs(usersQuery);
        userSnap.forEach((doc) => {
          newUsers[doc.id] = doc.data();
        });
      }
      // Use functional update to safely merge new users
      setUsersMap((prevMap) => ({ ...prevMap, ...newUsers }));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, []); // <-- Dependency array IS empty. This is correct.
  // --- END OF FIX 2 ---

  const currentUserId = userProfile?.id;
  const currentUserName =
    `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();

  // --- FIX 3 (Infinite Loop): Memoize the collection reference ---
  const commentsCollectionRef = useMemo(() => {
    return post?.id
      ? collection(db, `studentPosts/${post.id}/comments`)
      : null;
  }, [post?.id]); // <-- Depends ONLY on post.id
  // --- END OF FIX 3 ---

  const postReactions = post?.reactions || {};

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return null;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    try {
      return new Date(timestamp);
    } catch (e) {
      console.error('Could not convert timestamp:', timestamp, e);
      return null;
    }
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
    setLiveCommentCount(post?.commentsCount || 0);
  }, [post]);

  // This useEffect now safely uses the new fetchMissingUsers
  useEffect(() => {
    // Add guard to ensure post and userProfile are loaded
    if (isOpen && post && userProfile) {
      // Pre-load current user and post author
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

      // Fetch users who reacted to the main post
      if (post.reactions) {
        fetchMissingUsers(Object.keys(post.reactions));
      }
    } else {
      // Clear state on close or if data is missing
      setComments([]);
      setCommentReactions({});
      setUsersMap({});
    }
  }, [isOpen, post, userProfile, fetchMissingUsers]);

  // subscribe to comments and each comment's reactions
  // This useEffect now safely uses the memoized commentsCollectionRef
  useEffect(() => {
    if (!isOpen || !post?.id || !commentsCollectionRef) {
      setComments([]);
      setCommentReactions({});
      return;
    }

    const commentsQuery = query(
      commentsCollectionRef,
      orderBy('createdAt', 'asc'),
    );
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestampToDate(doc.data().createdAt),
      }));
      setComments(fetchedComments);
      setLiveCommentCount(fetchedComments.length);

      const commenterIds = fetchedComments.map((c) => c.userId);
      fetchMissingUsers(commenterIds);

      const commentReactionUnsubs = fetchedComments.map((comment) => {
        const commentReactionsRef = collection(
          db,
          `studentPosts/${post.id}/comments/${comment.id}/reactions`,
        );
        return onSnapshot(commentReactionsRef, (reactionSnap) => {
          const reactionsForThisComment = {};
          const reactorIds = [];
          reactionSnap.docs.forEach((rDoc) => {
            reactionsForThisComment[rDoc.id] = rDoc.data().reactionType;
            reactorIds.push(rDoc.id);
          });
          setCommentReactions((prev) => ({
            ...prev,
            [comment.id]: reactionsForThisComment,
          }));
          fetchMissingUsers(reactorIds); // Fetch users who reacted to comments
        });
      });

      return () => commentReactionUnsubs.forEach((unsub) => unsub());
    });

    return () => {
      if (unsubscribeComments) unsubscribeComments();
    };
  }, [isOpen, post?.id, fetchMissingUsers, commentsCollectionRef]); // Now stable

  // Posting a comment (handles replies via parentId)
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
    } catch (error) {
      console.error('Error posting comment in transaction:', error);
    }
  };

  // toggle comment reaction for current user
  const handleToggleCommentReaction = async (commentId, reactionType) => {
    if (!currentUserId || !post?.id) return;

    const reactionRef = doc(
      db,
      `studentPosts/${post.id}/comments/${commentId}/reactions`,
      currentUserId,
    );
    const currentReaction = commentReactions[commentId]?.[currentUserId];

    try {
      if (currentReaction === reactionType) {
        await deleteDoc(reactionRef);
      } else {
        await setDoc(reactionRef, { reactionType });
      }
    } catch (error) {
      console.error('Error toggling comment reaction:', error);
    }
  };

  // prepare reply
  const handleSetReplyTo = (comment) => {
    const userName = usersMap[comment.userId]?.firstName
      ? `${usersMap[comment.userId].firstName} ${
          usersMap[comment.userId].lastName
        }`
      : 'User';
    setReplyToCommentId(comment.id);
    setReplyToUserName(userName);
    commentInputRef.current?.focus();
  };

  // edit handlers
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
    const commentRef = doc(
      db,
      `studentPosts/${post.id}/comments`,
      editingCommentId,
    );
    try {
      await updateDoc(commentRef, {
        commentText: editingCommentText.trim(),
      });
      handleCancelEditing();
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  // delete comment (also deletes replies)
  const handleDeleteComment = async (commentId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this comment? This action cannot be undone.',
      )
    )
      return;

    const commentRef = doc(
      db,
      `studentPosts/${post.id}/comments`,
      commentId,
    );
    const postRef = doc(db, 'studentPosts', post.id);

    const repliesToDelete = comments.filter((c) => c.parentId === commentId);

    try {
      await runTransaction(db, async (transaction) => {
        const annDoc = await transaction.get(postRef);
        if (!annDoc.exists()) throw 'Post does not exist!';

        const deleteCount = 1 + repliesToDelete.length;
        const newCount = Math.max(
          0,
          (annDoc.data().commentsCount || 0) - deleteCount,
        );

        transaction.update(postRef, { commentsCount: newCount });
        transaction.delete(commentRef);

        for (const reply of repliesToDelete) {
          const replyRef = doc(
            db,
            `studentPosts/${post.id}/comments`,
            reply.id,
          );
          transaction.delete(replyRef);
        }
      });
    } catch (error) {
      console.error('Error deleting comment in transaction:', error);
    }
  };

  // reaction picker control
  const toggleReactionPicker = (entityId, type) => {
    if (
      activeReactionPicker?.id === entityId &&
      activeReactionPicker?.type === type
    ) {
      setActiveReactionPicker(null);
    } else {
      setActiveReactionPicker({ id: entityId, type });
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

  const handleReactionOptionsMouseEnter = (entityId, type) => {
    clearTimeout(timeoutRef.current);
    setHoveredReactionData({ type, id: entityId });
  };
  const handleReactionOptionsMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredReactionData(null);
    }, 300);
  };

  const renderReactionPicker = (entityId, type, onSelect) => {
    const isActive =
      activeReactionPicker?.id === entityId &&
      activeReactionPicker?.type === type;
    const isHovered =
      hoveredReactionData?.id === entityId &&
      hoveredReactionData?.type === type;

    if (!isActive && !isHovered) return null;

    return (
      <div className="absolute bottom-full mb-2 left-1 -translate-x-1 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark p-1 flex flex-wrap gap-1 z-50 w-64">
        {reactionTypes.map((rType) => (
          <button
            key={rType}
            className="p-2 rounded-full transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
            onClick={() => {
              setActiveReactionPicker(null);
              handleReactionOptionsMouseLeave();
              onSelect(rType);
            }}
          >
            <NativeEmoji
              emoji={reactionIcons[rType].component({}).props.emoji}
              className="text-2xl"
            />
          </button>
        ))}
      </div>
    );
  };

  const renderReactionCount = (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) return null;

    const counts = {};
    Object.values(reactions).forEach((type) => {
      counts[type] = (counts[type] || 0) + 1;
    });
    const sortedUniqueReactions = Object.entries(counts).sort(
      ([, a], [, b]) => b - a,
    );
    const totalReactions = Object.keys(reactions).length;

    return (
      <div
        className="flex items-center space-x-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          openReactionsBreakdownModal(reactions);
        }}
      >
        <div className="flex items-center">
          {sortedUniqueReactions.map(([type], index) => {
            const reaction = reactionIcons[type];
            if (!reaction) return null;

            const { component: Icon } = reaction;
            const zIndex = sortedUniqueReactions.length - index;

            return (
              <div
                key={type}
                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark ring-2 ring-neumorphic-base dark:ring-neumorphic-base-dark ${
                  index > 0 ? '-ml-2' : ''
                }`}
                style={{ zIndex: zIndex }}
              >
                <Icon className="text-xl" />
              </div>
            );
          })}
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-2">
          {totalReactions}
        </span>
      </div>
    );
  };

  const topLevelComments = comments.filter((comment) => !comment.parentId);
  const getReplies = (commentId) =>
    comments.filter((comment) => comment.parentId === commentId);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 font-sans"
      onClick={handleBackdropClick}
    >
      <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-[28px] shadow-neumorphic dark:shadow-neumorphic-dark w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 relative">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 pt-2">
            Post by {post.authorName}
          </h2>
          <button
            onClick={onClose}
            className="absolute top-3 right-4 p-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
          >
            <FaTimes className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="p-5 overflow-y-auto flex-grow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 mr-4 flex-shrink-0">
              <UserInitialsAvatar
                user={authorUser} // Use the user object from usersMap
                size="w-12 h-12 text-lg"
              />
            </div>
            <div>
              <Link
                to={postAuthorProfileLink}
                state={{ profileData: authorUser }}
                className="font-semibold text-slate-800 dark:text-slate-100 hover:underline"
              >
                {post.authorName}
              </Link>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatRelativeTime(convertTimestampToDate(post.createdAt))}
              </p>
            </div>
          </div>

          <div className="mb-4 pb-4">
            <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap break-words">
              <Linkify componentDecorator={componentDecorator}>
                {post.content}
              </Linkify>
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 border-y border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 py-2 my-2 max-w-lg pl-4 sm:pl-7">
              <div>{renderReactionCount(postReactions)}</div>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {liveCommentCount}{' '}
                {liveCommentCount === 1 ? 'Comment' : 'Comments'}
              </span>
            </div>

            {/* --- FIX 1 (Permissions): Conditionally render action buttons --- */}
            {canReact && (
              <div className="flex justify-around items-center py-1 mb-4 max-w-lg pl-4 sm:pl-7">
                <div
                  className="relative flex justify-center"
                  onMouseEnter={() =>
                    handleReactionOptionsMouseEnter(post.id, 'post')
                  }
                  onMouseLeave={handleReactionOptionsMouseLeave}
                >
                  <button
                    className={`flex items-center justify-center py-2 px-5 rounded-full font-semibold transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark ${
                      postReactions[currentUserId]
                        ? reactionIcons[postReactions[currentUserId]].color
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    onClick={() => toggleReactionPicker(post.id, 'post')}
                  >
                    {postReactions[currentUserId] ? (
                      <NativeEmoji
                        emoji={
                          reactionIcons[postReactions[currentUserId]]
                            .component({}).props.emoji
                        }
                        className="text-xl"
                      />
                    ) : (
                      <FaThumbsUp className="h-5 w-5" />
                    )}
                    <span className="capitalize ml-2">
                      {postReactions[currentUserId] || 'Like'}
                    </span>
                  </button>
                  {renderReactionPicker(post.id, 'post', (type) =>
                    onToggleReaction(post.id, type),
                  )}
                </div>
                <button
                  className="flex items-center justify-center py-2 px-5 rounded-full font-semibold text-slate-600 dark:text-slate-400 transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
                  onClick={() => commentInputRef.current?.focus()}
                >
                  <FaComment className="h-5 w-5" />
                  <span className="ml-2">Comment</span>
                </button>
              </div>
            )}
            {/* --- END OF FIX 1 --- */}

            {/* Comment list */}
            <div className="space-y-4 pl-4 sm:pl-7">
              {topLevelComments.length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-center py-6">
                  Be the first to comment.
                </p>
              )}
              {topLevelComments.map((comment) => {
                const isCurrentUserComment = comment.userId === currentUserId;
                const isBeingEdited = editingCommentId === comment.id;
                const currentUserCommentReaction =
                  commentReactions[comment.id]?.[currentUserId];
                const commentAuthor = usersMap[comment.userId] || {
                  firstName: 'Unknown',
                  lastName: 'User',
                  id: comment.userId, // <-- Add ID to fallback
                };

                const isThisCommentAuthorMe = userProfile.id === comment.userId;
                const profileLink = isThisCommentAuthorMe
                  ? (currentUserRole === 'student' ? '/student/profile' : '/dashboard/profile')
                  : (currentUserRole === 'student' ? `/student/profile/${comment.userId}` : `/dashboard/profile/${comment.userId}`);

                return (
                  <div key={comment.id} className="flex items-start space-x-4">
                    <div className="w-9 h-9 flex-shrink-0 mt-2">
                      <UserInitialsAvatar
                        user={commentAuthor}
                        size="w-6 h-6 text-xs leading-none"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="max-w-lg">
                        <div className="relative group bg-neumorphic-base dark:bg-neumorphic-base-dark p-2.5 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark">
                          {isCurrentUserComment && !isBeingEdited && (
                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEditing(comment)}
                                className="p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                title="Edit comment"
                              >
                                <FaEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                title="Delete comment"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <Link
                            to={profileLink}
                            state={{ profileData: commentAuthor }}
                            className="text-sm font-semibold text-slate-800 dark:text-slate-100 pr-12 hover:underline"
                          >
                            {commentAuthor.firstName} {commentAuthor.lastName}
                          </Link>

                          {isBeingEdited ? (
                            <div className="mt-2">
                              <textarea
                                className="w-full p-2 border-none rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-0 resize-y"
                                rows="3"
                                value={editingCommentText}
                                onChange={(e) =>
                                  setEditingCommentText(e.target.value)
                                }
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <button
                                  onClick={handleCancelEditing}
                                  className="px-3 py-1 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1 text-sm font-semibold text-white bg-blue-500 dark:bg-blue-600 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark disabled:opacity-50"
                                  disabled={!editingCommentText.trim()}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-1 break-words">
                              <Linkify componentDecorator={componentDecorator}>
                                {comment.commentText}
                              </Linkify>
                            </p>
                          )}
                        </div>
                        {/* --- FIX 1 (Permissions): Conditionally render comment actions --- */}
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 pl-2 space-x-3">
                          <span>{formatRelativeTime(comment.createdAt)}</span>
                          {canReact && (
                            <>
                              <div
                                className="relative flex justify-center"
                                onMouseEnter={() =>
                                  handleReactionOptionsMouseEnter(
                                    comment.id,
                                    'comment',
                                  )
                                }
                                onMouseLeave={handleReactionOptionsMouseLeave}
                              >
                                <button
                                  className="font-semibold hover:underline"
                                  onClick={() =>
                                    toggleReactionPicker(comment.id, 'comment')
                                  }
                                >
                                  <span
                                    className={`capitalize ${
                                      currentUserCommentReaction
                                        ? 'text-blue-500 dark:text-blue-400'
                                        : ''
                                    }`}
                                  >
                                    {currentUserCommentReaction || 'Like'}
                                  </span>
                                </button>
                                {renderReactionPicker(
                                  comment.id,
                                  'comment',
                                  (type) =>
                                    handleToggleCommentReaction(
                                      comment.id,
                                      type,
                                    ),
                                )}
                              </div>
                              <button
                                className="font-semibold hover:underline"
                                onClick={() => handleSetReplyTo(comment)}
                              >
                                Reply
                              </button>
                            </>
                          )}
                          {renderReactionCount(
                            commentReactions[comment.id] || {},
                          )}
                        </div>
                        {/* --- END OF FIX 1 --- */}
                      </div>

                      {/* Replies */}
                      {getReplies(comment.id).map((reply) => {
                        const isCurrentUserReply = reply.userId === currentUserId;
                        const isReplyBeingEdited = editingCommentId === reply.id;
                        const currentUserReplyReaction =
                          commentReactions[reply.id]?.[currentUserId];
                        const replyAuthor = usersMap[reply.userId] || {
                          firstName: 'Unknown',
                          lastName: 'User',
                          id: reply.userId, // <-- Add ID to fallback
                        };

                        const isThisReplyAuthorMe = userProfile.id === reply.userId;
                        const replyAuthorProfileLink = isThisReplyAuthorMe
                          ? (currentUserRole === 'student' ? '/student/profile' : '/dashboard/profile')
                          : (currentUserRole === 'student' ? `/student/profile/${reply.userId}` : `/dashboard/profile/${reply.userId}`);

                        return (
                          <div
                            key={reply.id}
                            className="flex items-start space-x-4 mt-2"
                          >
                            <div className="w-5 h-5 flex-shrink-0 mt-2">
                              <UserInitialsAvatar
                                user={replyAuthor}
                                size="w-4 h-4 text-3xs leading-none"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="ml-2 border-l border-neumorphic-shadow-dark/20 dark:border-neumorphic-shadow-light-dark/20 pl-4">
                                <div className="max-w-lg">
                                  <div className="relative group bg-neumorphic-base dark:bg-neumorphic-base-dark p-2.5 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark">
                                    {isCurrentUserReply &&
                                      !isReplyBeingEdited && (
                                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() =>
                                              handleStartEditing(reply)
                                            }
                                            className="p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                            title="Edit reply"
                                          >
                                            <FaEdit className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(reply.id)
                                            }
                                            className="p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                            title="Delete reply"
                                          >
                                            <FaTrash className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    <Link
                                      to={replyAuthorProfileLink}
                                      state={{ profileData: replyAuthor }}
                                      className="text-sm font-semibold text-slate-800 dark:text-slate-100 pr-10 hover:underline"
                                    >
                                      {replyAuthor.firstName}{' '}
                                      {replyAuthor.lastName}
                                    </Link>

                                    {isReplyBeingEdited ? (
                                      <div className="mt-2">
                                        <textarea
                                          className="w-full p-2 border-none rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-0 resize-y"
                                          rows="2"
                                          value={editingCommentText}
                                          onChange={(e) =>
                                            setEditingCommentText(
                                              e.target.value,
                                            )
                                          }
                                          autoFocus
                                        />
                                        <div className="flex items-center justify-end gap-2 mt-2">
                                          <button
                                            onClick={handleCancelEditing}
                                            className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 dark:bg-blue-600 rounded-lg shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark disabled:opacity-50"
                                            disabled={
                                              !editingCommentText.trim()
                                            }
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-0.5 break-words">
                                        <Linkify
                                          componentDecorator={
                                            componentDecorator
                                          }
                                        >
                                          {reply.commentText}
                                        </Linkify>
                                      </p>
                                    )}
                                  </div>

                                  {/* --- FIX 1 (Permissions): Conditionally render reply actions --- */}
                                  <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1 pl-2 space-x-3">
                                    <span>
                                      {formatRelativeTime(reply.createdAt)}
                                    </span>

                                    {canReact && (
                                      <>
                                        <div
                                          className="relative flex justify-center"
                                          onMouseEnter={() =>
                                            handleReactionOptionsMouseEnter(
                                              reply.id,
                                              'reply',
                                            )
                                          }
                                          onMouseLeave={
                                            handleReactionOptionsMouseLeave
                                          }
                                        >
                                          <button
                                            className="font-semibold hover:underline"
                                            onClick={() =>
                                              toggleReactionPicker(
                                                reply.id,
                                                'reply',
                                              )
                                            }
                                          >
                                            <span
                                              className={`capitalize ${
                                                currentUserReplyReaction
                                                  ? 'text-blue-500 dark:text-blue-400'
                                                  : ''
                                              }`}
                                            >
                                              {currentUserReplyReaction ||
                                                'Like'}
                                            </span>
                                          </button>
                                          {renderReactionPicker(
                                            reply.id,
                                            'reply',
                                            (type) =>
                                              handleToggleCommentReaction(
                                                reply.id,
                                                type,
                                              ),
                                          )}
                                        </div>
                                        <button
                                          className="font-semibold hover:underline"
                                          onClick={() =>
                                            handleSetReplyTo(reply)
                                          }
                                        >
                                          Reply
                                        </button>
                                      </>
                                    )}
                                    {renderReactionCount(
                                      commentReactions[reply.id] || {},
                                    )}
                                  </div>
                                  {/* --- END OF FIX 1 --- */}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- FIX 1 (Permissions): Conditionally render comment input --- */}
        {/* Input Section (not fixed) */}
        {canReact ? (
          <div className="p-3 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 bg-neumorphic-base dark:bg-neumorphic-base-dark">
            <div>
              {replyToCommentId && (
                <div className="mb-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between px-3 max-w-lg pl-7">
                  Replying to{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-100 ml-1">
                    {replyToUserName}
                  </span>
                  <button
                    onClick={() => {
                      setReplyToCommentId(null);
                      setReplyToUserName('');
                    }}
                    className="p-1.5 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                  >
                    <FaTimes className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 flex-shrink-0">
                  <UserInitialsAvatar
                    user={userProfile}
                    size="w-6 h-6 text-sm leading-none"
                  />
                </div>
                <div className="relative flex-grow">
                  <div className="max-w-lg">
                    <textarea
                      ref={commentInputRef}
                      className="w-full p-2 pr-12 border-none rounded-xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-0 resize-none leading-tight"
                      rows="1"
                      placeholder="Add a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                    />
                    <button
                      onClick={handlePostComment}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark disabled:opacity-50"
                      disabled={!newCommentText.trim()}
                    >
                      <FaPaperPlane
                        className={`w-5 h-5 transition-colors ${
                          newCommentText.trim()
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 bg-neumorphic-base dark:bg-neumorphic-base-dark">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
              Reach Level 40 to react and comment.
            </p>
          </div>
        )}
        {/* --- END OF FIX 1 --- */}
      </div>

      <ReactionsBreakdownModal
        isOpen={isReactionsBreakdownModalOpen}
        onClose={closeReactionsBreakdownModal}
        reactionsData={reactionsForBreakdownModal}
      />
    </div>
  );
};

export default StudentPostCommentsModal;