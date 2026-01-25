// src/components/teacher/dashboard/widgets/AnnouncementModal.jsx
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FaPaperPlane,
  FaEdit,
  FaTrash,
  FaThumbsUp,
  FaComment,
  FaTimes,
  FaArrowLeft,
  FaSpinner
} from 'react-icons/fa'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc, // We will use this directly again
  updateDoc,
  runTransaction,
} from 'firebase/firestore'
import ReactionsBreakdownModal from './ReactionsBreakdownModal'
import UserInitialsAvatar from '../../../common/UserInitialsAvatar'
import Linkify from 'react-linkify'

const reactionTypes = ['like', 'heart', 'haha', 'wow', 'sad', 'angry', 'care']

// --- CONFIG: STATIC VS ANIMATED PATHS ---
const reactionIcons = {
  like: {
    static: '/emojis/like.png',
    animated: '/emojis/like.gif',
    color: 'text-blue-600',
    label: 'Like',
  },
  heart: {
    static: '/emojis/love.png',
    animated: '/emojis/love.gif',
    color: 'text-red-600',
    label: 'Love',
  },
  haha: {
    static: '/emojis/haha.png',
    animated: '/emojis/haha.gif',
    color: 'text-yellow-500',
    label: 'Haha',
  },
  wow: {
    static: '/emojis/wow.png',
    animated: '/emojis/wow.gif',
    color: 'text-amber-500',
    label: 'Wow',
  },
  sad: {
    static: '/emojis/sad.png',
    animated: '/emojis/sad.gif',
    color: 'text-blue-400',
    label: 'Sad',
  },
  angry: {
    static: '/emojis/angry.png',
    animated: '/emojis/angry.gif',
    color: 'text-red-700',
    label: 'Angry',
  },
  care: {
    static: '/emojis/care.png',
    animated: '/emojis/care.gif',
    color: 'text-pink-500',
    label: 'Care',
  },
}

// Link Decorator
const componentDecorator = (href, text, key) => (
  <a
    href={href}
    key={key}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 dark:text-blue-400 hover:underline font-bold tracking-wide"
    onClick={(e) => e.stopPropagation()}
  >
    {text}
  </a>
)

// --- DELETE CONFIRMATION DIALOG ---
const DeleteDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 border border-white/20 shadow-2xl overflow-hidden text-center"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4 text-red-500 mx-auto">
            <FaTrash className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {title || 'Delete Item?'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {message || 'This action cannot be undone.'}
          </p>
          <div className="flex flex-col w-full gap-2">
            <button
              onClick={onConfirm}
              className="w-full py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-md active:scale-95 transition-all text-xs"
            >
              Yes, Delete
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-xs"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

// --- RECURSIVE COMMENT COMPONENT ---
const CommentNode = ({
  comment,
  allComments,
  usersMap,
  currentUserId,
  commentReactions,
  editingCommentId,
  editingCommentText,
  setEditingCommentText,
  isReply = false,
  onSetReplyTo,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onDeleteComment,
  onToggleReaction,
  renderReactionPicker,
  renderReactionCount,
  formatRelativeTime,
  handleReactionOptionsMouseEnter,
  handleReactionOptionsMouseLeave,
  toggleReactionPicker
}) => {
  // Safe Access for User Profile
  const safeUsersMap = usersMap || {};
  const commentUser = safeUsersMap[comment.userId] || { firstName: 'Unknown', lastName: 'User' };

  const isCurrentUserComment = comment.userId === currentUserId
  const isBeingEdited = editingCommentId === comment.id
  const currentUserCommentReaction = commentReactions[comment.id]?.[currentUserId]

  // Find children
  const replies = allComments.filter((c) => c.parentId === comment.id)

  const avatarWrapperClass = isReply ? "w-10 h-10" : "w-12 h-12"
  const avatarTextSize = isReply ? 'text-[11px]' : 'text-[12px]'

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Avatar Wrapper */}
      <div className={`flex-shrink-0 mt-1 rounded-full overflow-hidden ${avatarWrapperClass}`}>
        <UserInitialsAvatar
          user={commentUser}
          size="100%"
          className={`w-full h-full font-bold shadow-sm object-cover ${avatarTextSize}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="group/comment relative">
          {/* Comment Bubble */}
          <div
            className={`px-3 py-2 rounded-2xl relative ${
              isCurrentUserComment
                ? 'bg-blue-50/50 dark:bg-blue-900/10'
                : 'bg-slate-100 dark:bg-[#1E1E1E]'
            }`}
          >
            {/* Header (Name + Time) */}
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mr-2">
                {commentUser.firstName} {commentUser.lastName}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>

            {/* Content or Edit Mode */}
            {isBeingEdited ? (
              <div className="mt-1">
                <textarea
                  className="w-full p-2 text-sm rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  rows="2"
                  value={editingCommentText}
                  onChange={(e) => setEditingCommentText(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={onCancelEditing}
                    className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSaveEdit}
                    className="px-2 py-1 text-[10px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded shadow-sm"
                    disabled={!editingCommentText.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-snug whitespace-pre-wrap break-words">
                <Linkify componentDecorator={componentDecorator}>{comment.commentText}</Linkify>
              </p>
            )}

            {/* Edit/Delete Actions */}
            {isCurrentUserComment && !isBeingEdited && (
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                <button
                  onClick={() => onStartEditing(comment)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <FaEdit className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                >
                  <FaTrash className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comment Footer Actions (Like, Reply, Counts) */}
        <div className="flex items-center gap-4 mt-1 ml-2 h-5"> 
          <div
            className="relative flex items-center h-full"
            onMouseEnter={() => handleReactionOptionsMouseEnter(comment.id, 'comment')}
            onMouseLeave={handleReactionOptionsMouseLeave}
          >
            <button
              className={`text-xs font-bold transition-colors flex items-center h-full ${
                currentUserCommentReaction
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
              onClick={() => toggleReactionPicker(comment.id, 'comment')}
            >
              {currentUserCommentReaction || 'Like'}
            </button>
            {renderReactionPicker(comment.id, 'comment', (type) =>
              onToggleReaction(comment.id, type),
            )}
          </div>

          <button
            className="text-xs font-bold text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors flex items-center h-full"
            onClick={() => onSetReplyTo(comment)}
          >
            Reply
          </button>

          <div className="flex items-center h-full">
            {renderReactionCount(commentReactions[comment.id] || {})}
          </div>
        </div>

        {/* Recursive Replies */}
        {replies.length > 0 && (
          <div className="mt-2 pl-2 space-y-2">
            {replies.map((reply) => (
              <CommentNode
                key={reply.id}
                comment={reply}
                allComments={allComments}
                usersMap={safeUsersMap}
                currentUserId={currentUserId}
                commentReactions={commentReactions}
                editingCommentId={editingCommentId}
                editingCommentText={editingCommentText}
                setEditingCommentText={setEditingCommentText}
                isReply={true}
                onSetReplyTo={onSetReplyTo}
                onStartEditing={onStartEditing}
                onCancelEditing={onCancelEditing}
                onSaveEdit={onSaveEdit}
                onDeleteComment={onDeleteComment}
                onToggleReaction={onToggleReaction}
                renderReactionPicker={renderReactionPicker}
                renderReactionCount={renderReactionCount}
                formatRelativeTime={formatRelativeTime}
                handleReactionOptionsMouseEnter={handleReactionOptionsMouseEnter}
                handleReactionOptionsMouseLeave={handleReactionOptionsMouseLeave}
                toggleReactionPicker={toggleReactionPicker}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const AnnouncementModal = ({
  isOpen,
  onClose,
  announcement,
  userProfile,
  db,
  postReactions,
  onToggleReaction,
  usersMap,
  onDelete, // We might not use this if we go direct, but keeping it in props is fine
}) => {
  // --- STATE: Deleting Status ---
  const [isDeleting, setIsDeleting] = useState(false);

  // --- CRITICAL SAFEGUARDS ---
  const safeUsersMap = usersMap || {};
  const postAuthor = (announcement?.teacherId && safeUsersMap[announcement.teacherId]) 
      ? safeUsersMap[announcement.teacherId] 
      : { firstName: 'Unknown', lastName: 'User' };

  // --- STATE ---
  const [comments, setComments] = useState([])
  const [liveCommentCount, setLiveCommentCount] = useState(announcement?.commentsCount || 0)
  
  // Post Edit State
  const [isEditingPost, setIsEditingPost] = useState(false)
  const [editingPostText, setEditingPostText] = useState('')
  const [showPostDeleteConfirm, setShowPostDeleteConfirm] = useState(false)

  // Comment Input State
  const [newCommentText, setNewCommentText] = useState('')
  const [replyToCommentId, setReplyToCommentId] = useState(null)
  const [replyToUserName, setReplyToUserName] = useState('')
  
  // Comment Reactions State
  const [commentReactions, setCommentReactions] = useState({})

  // Hover & Picker State
  const [hoveredReactionData, setHoveredReactionData] = useState(null)
  const [hoveredPickerEmoji, setHoveredPickerEmoji] = useState(null)
  const [activeReactionPicker, setActiveReactionPicker] = useState(null)

  // Comment Edit State
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [commentToDeleteId, setCommentToDeleteId] = useState(null) // For dialog

  // Modal State
  const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false)
  const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null)

  const timeoutRef = useRef(null)
  const commentInputRef = useRef(null)

  const currentUserId = userProfile?.id
  const currentUserName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim()
  const canModifyPost = userProfile?.role === 'admin' || userProfile?.id === announcement?.teacherId

  const commentsCollectionRef = announcement?.id
    ? collection(db, `teacherAnnouncements/${announcement.id}/comments`)
    : null

  // --- EFFECT: Close on Escape ---
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // --- EFFECT: Sync Count ---
  useEffect(() => {
    setLiveCommentCount(announcement?.commentsCount || 0)
    if (announcement) {
        setEditingPostText(announcement.content || '')
    }
  }, [announcement])

  // --- EFFECT: Real-time Comments ---
  useEffect(() => {
    if (!isOpen || !announcement?.id || !commentsCollectionRef) {
      setComments([])
      setCommentReactions({})
      return
    }

    const commentsQuery = query(commentsCollectionRef, orderBy('createdAt', 'asc'))
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestampToDate(doc.data().createdAt),
      }))
      setComments(fetchedComments)
      setLiveCommentCount(fetchedComments.length)

      const commentReactionUnsubs = fetchedComments.map((comment) => {
        const commentReactionsRef = collection(
          db,
          `teacherAnnouncements/${announcement.id}/comments/${comment.id}/reactions`,
        )
        return onSnapshot(commentReactionsRef, (reactionSnap) => {
          const reactionsForThisComment = {}
          reactionSnap.docs.forEach((rDoc) => {
            reactionsForThisComment[rDoc.id] = rDoc.data().reactionType
          })
          setCommentReactions((prev) => ({
            ...prev,
            [comment.id]: reactionsForThisComment,
          }))
        })
      })

      return () => commentReactionUnsubs.forEach((unsub) => unsub())
    })

    return () => {
      if (unsubscribeComments) unsubscribeComments()
    }
  }, [isOpen, announcement?.id])

  // --- UTILS ---
  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return null
    if (typeof timestamp.toDate === 'function') return timestamp.toDate()
    if (timestamp instanceof Date) return timestamp
    try {
      return new Date(timestamp)
    } catch (e) {
      return null
    }
  }

  const formatRelativeTime = (date) => {
    if (!date) return ''
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return `Just now`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    const weeks = Math.floor(days / 7)
    return `${weeks}w`
  }

  // --- POST EDIT/DELETE HANDLERS ---
  const handleSavePostEdit = async () => {
    if (!editingPostText.trim() || !announcement.id) return
    const postRef = doc(db, 'teacherAnnouncements', announcement.id)
    try {
        await updateDoc(postRef, {
            content: editingPostText.trim()
        })
        setIsEditingPost(false)
    } catch (error) {
        console.error("Error updating post:", error)
        alert("Failed to update post.")
    }
  }

  // --- FIXED DELETE HANDLER ---
  const handleDeletePost = async () => {
    if (!announcement.id) return;
    
    // 1. Activate Loading State immediately to prevent access to undefined props
    setIsDeleting(true);

    try {
        // 2. Use direct deleteDoc to bypass the faulty hook logic
        const postRef = doc(db, 'teacherAnnouncements', announcement.id);
        await deleteDoc(postRef);

        // 3. Close modal after successful delete
        onClose(); 
    } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post.");
        // 4. Reset state if error occurs
        setIsDeleting(false); 
    }
  }

  // --- COMMENT HANDLERS ---
  const handlePostComment = async () => {
    if (!newCommentText.trim() || !commentsCollectionRef) return
    const announcementRef = doc(db, 'teacherAnnouncements', announcement.id)
    const newCommentRef = doc(commentsCollectionRef)

    try {
      await runTransaction(db, async (transaction) => {
        const annDoc = await transaction.get(announcementRef)
        if (!annDoc.exists()) throw 'Announcement does not exist!'
        const newCount = (annDoc.data().commentsCount || 0) + 1
        transaction.update(announcementRef, { commentsCount: newCount })
        transaction.set(newCommentRef, {
          userId: currentUserId,
          userName: currentUserName,
          commentText: newCommentText.trim(),
          createdAt: new Date(),
          parentId: replyToCommentId || null,
        })
      })
      setNewCommentText('')
      setReplyToCommentId(null)
      setReplyToUserName('')
    } catch (error) {
      console.error('Error posting comment in transaction:', error)
    }
  }

  const handleToggleCommentReaction = async (commentId, reactionType) => {
    if (!currentUserId || !announcement?.id) return

    const reactionRef = doc(
      db,
      `teacherAnnouncements/${announcement.id}/comments/${commentId}/reactions`,
      currentUserId,
    )
    const currentReaction = commentReactions[commentId]?.[currentUserId]

    try {
      if (currentReaction === reactionType) {
        await deleteDoc(reactionRef)
      } else {
        await setDoc(reactionRef, { reactionType })
      }
    } catch (error) {
      console.error('Error toggling comment reaction:', error)
    }
  }

  const handleSetReplyTo = (comment) => {
    const user = safeUsersMap[comment.userId] || { firstName: 'User', lastName: '' }
    const userName = `${user.firstName} ${user.lastName}`.trim()
    setReplyToCommentId(comment.id)
    setReplyToUserName(userName)
    commentInputRef.current?.focus()
  }

  const handleStartEditing = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.commentText)
  }

  const handleCancelEditing = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const handleSaveEdit = async () => {
    if (!editingCommentText.trim() || !editingCommentId) return
    const commentRef = doc(
      db,
      `teacherAnnouncements/${announcement.id}/comments`,
      editingCommentId,
    )
    try {
      await updateDoc(commentRef, {
        commentText: editingCommentText.trim(),
      })
      handleCancelEditing()
    } catch (error) {
      console.error('Error updating comment:', error)
    }
  }

  const handleDeleteCommentConfirm = async () => {
    if (!commentToDeleteId) return

    const commentRef = doc(
      db,
      `teacherAnnouncements/${announcement.id}/comments`,
      commentToDeleteId,
    )
    const announcementRef = doc(db, 'teacherAnnouncements', announcement.id)
    
    // Recursive delete helper (finds all IDs in the tree below this comment)
    const getAllReplyIds = (parentId, allC) => {
        const directReplies = allC.filter(c => c.parentId === parentId)
        let ids = directReplies.map(c => c.id)
        directReplies.forEach(r => {
            ids = [...ids, ...getAllReplyIds(r.id, allC)]
        })
        return ids
    }

    const repliesToDeleteIds = getAllReplyIds(commentToDeleteId, comments)

    try {
      await runTransaction(db, async (transaction) => {
        const annDoc = await transaction.get(announcementRef)
        if (!annDoc.exists()) throw 'Announcement does not exist!'

        const deleteCount = 1 + repliesToDeleteIds.length
        const newCount = Math.max(0, (annDoc.data().commentsCount || 0) - deleteCount)

        transaction.update(announcementRef, { commentsCount: newCount })
        transaction.delete(commentRef)

        for (const replyId of repliesToDeleteIds) {
          const replyRef = doc(db, `teacherAnnouncements/${announcement.id}/comments`, replyId)
          transaction.delete(replyRef)
        }
      })
      setCommentToDeleteId(null)
    } catch (error) {
      console.error('Error deleting comment in transaction:', error)
      setCommentToDeleteId(null)
    }
  }

  // --- REACTION UI LOGIC ---
  const toggleReactionPicker = (entityId, type) => {
    if (activeReactionPicker?.id === entityId && activeReactionPicker?.type === type) {
      setActiveReactionPicker(null)
    } else {
      setActiveReactionPicker({ id: entityId, type })
    }
  }

  const handleReactionOptionsMouseEnter = (entityId, type) => {
    clearTimeout(timeoutRef.current)
    setHoveredReactionData({ type, id: entityId })
  }
  const handleReactionOptionsMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredReactionData(null)
      setHoveredPickerEmoji(null)
    }, 300)
  }

  // --- RENDERERS ---
  const renderReactionPicker = (entityId, type, onSelect) => {
    const isActive = activeReactionPicker?.id === entityId && activeReactionPicker?.type === type
    const isHovered = hoveredReactionData?.id === entityId && hoveredReactionData?.type === type

    if (!isActive && !isHovered) return null

    return (
      <AnimatePresence>
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={{
            visible: { opacity: 1, y: 0, scale: 1, transition: { staggerChildren: 0.04 } },
            hidden: {
              opacity: 0,
              y: 10,
              scale: 0.9,
              transition: { staggerChildren: 0.02, staggerDirection: -1 },
            },
          }}
          className="absolute bottom-full mb-3 left-0 bg-white/90 dark:bg-[#1E1E1E]/95 backdrop-blur-xl rounded-full p-2 flex items-center gap-1.5 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 min-w-max"
          onMouseEnter={() => handleReactionOptionsMouseEnter(entityId, type)}
          onMouseLeave={handleReactionOptionsMouseLeave}
        >
          {reactionTypes.map((rType) => {
            const icon = reactionIcons[rType]
            const isEmojiHovered = hoveredPickerEmoji === rType

            return (
              <motion.button
                key={rType}
                variants={{
                  hidden: { opacity: 0, y: 15, scale: 0.5 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                whileHover={{ scale: 1.35, y: -6 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-full relative group/emoji"
                onMouseEnter={() => setHoveredPickerEmoji(rType)}
                onMouseLeave={() => setHoveredPickerEmoji(null)}
                onClick={() => {
                  setActiveReactionPicker(null)
                  handleReactionOptionsMouseLeave()
                  onSelect(rType)
                }}
              >
                <img
                  src={isEmojiHovered ? icon.animated : icon.static}
                  alt={icon.label}
                  className="w-8 h-8 object-contain drop-shadow-sm"
                />
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full opacity-0 group-hover/emoji:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
                  {icon.label}
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    )
  }

  const renderReactionCount = (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) return null

    const counts = {}
    Object.values(reactions).forEach((type) => {
      counts[type] = (counts[type] || 0) + 1
    })
    const sortedUniqueReactions = Object.entries(counts).sort(([, a], [, b]) => b - a)
    const totalReactions = Object.keys(reactions).length

    return (
      <div
        className="flex items-center gap-1.5 cursor-pointer group select-none"
        onClick={(e) => {
          e.stopPropagation()
          setReactionsForBreakdownModal(reactions)
          setIsReactionsBreakdownModalOpen(true)
        }}
      >
        <div className="flex items-center -space-x-2">
          {sortedUniqueReactions.map(([type], index) => {
            const reactionConfig = reactionIcons[type] || reactionIcons['like']
            const zIndex = sortedUniqueReactions.length - index

            return (
              <div
                key={type}
                className="relative w-4 h-4 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 ring-[1.5px] ring-white dark:ring-slate-900 shadow-sm overflow-hidden"
                style={{ zIndex: zIndex }}
              >
                <img
                  src={reactionConfig.static}
                  alt={reactionConfig.label}
                  className="w-full h-full object-contain p-[1px]"
                />
              </div>
            )
          })}
        </div>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
          {totalReactions}
        </span>
      </div>
    )
  }

  // --- IMMEDIATE LOADING RETURN ---
  // If we are deleting, show the spinner and DO NOT render the rest of the component.
  // This prevents accessing `announcement` props when they might be undefined/null.
  if (isDeleting) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#1C1C1E] p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-white/20"
        >
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">Deleting post...</p>
        </motion.div>
      </div>,
      document.body
    );
  }

  if (!isOpen || !announcement) return null

  // Post Reaction Active State
  const isPostReactionActive =
    (hoveredReactionData?.id === announcement.id && hoveredReactionData?.type === 'post') ||
    (activeReactionPicker?.id === announcement.id && activeReactionPicker?.type === 'post')

  // Top level comments
  const topLevelComments = comments.filter((comment) => !comment.parentId)

  return createPortal(
    <>
        <DeleteDialog 
            isOpen={showPostDeleteConfirm} 
            onClose={() => setShowPostDeleteConfirm(false)}
            onConfirm={handleDeletePost}
            title="Delete Post?"
            message="This action cannot be undone. All comments will be lost."
        />
        
        <DeleteDialog 
            isOpen={!!commentToDeleteId} 
            onClose={() => setCommentToDeleteId(null)}
            onConfirm={handleDeleteCommentConfirm}
            title="Delete Comment?"
            message="This will also delete all replies to this comment."
        />

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-white dark:bg-[#000000] font-sans flex flex-col"
        >
        
            {/* Header - Floating Island Squircle Style */}
            <div className="relative flex-shrink-0 flex items-center justify-between px-6 py-4 mt-4 mx-auto w-full max-w-4xl bg-white dark:bg-[#121212] z-40 shadow-md rounded-[2rem] border border-slate-100 dark:border-white/5">
    
                {/* Left Group: Back Button, Title, and Author Info */}
                <div className="flex items-center gap-3 z-10">
                     <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <FaArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
        
                    {/* Hidden on mobile, shown on desktop */}
                    <h2 className="hidden sm:block text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight mr-4">
                        Post Details
                    </h2>

                    {/* Author Info Container */}
                    <div className="flex items-center gap-4 relative sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
                         <div className="w-12 h-12 rounded-full shadow-sm overflow-hidden border border-slate-100 dark:border-white/5">
                            <UserInitialsAvatar
                                user={postAuthor}
                                size="full"
                                className="w-full h-full text-[12px] font-bold"
                            />
                         </div>
                         <div className="flex flex-col items-start">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {postAuthor.firstName} {postAuthor.lastName}
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                {formatRelativeTime(convertTimestampToDate(announcement.createdAt))}
                            </span>
                        </div>
                    </div>
                </div>
    
                {/* Right Group: Action Buttons */}
                <div className="flex items-center gap-2 z-10">
                     {canModifyPost && !isEditingPost && (
                        <div className="flex gap-1 mr-2 border-r border-slate-200 dark:border-white/10 pr-2">
                            <button 
                                onClick={() => setIsEditingPost(true)} 
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500 hover:text-blue-500 transition-colors"
                            >
                                <FaEdit className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setShowPostDeleteConfirm(true)} 
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                            >
                                <FaTrash className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all active:scale-90"
                    >
                        <FaTimes className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    </button>
                </div>
            </div>

        {/* Scrollable Content Container */}
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-black">
            <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pb-72"> 
            
            {/* Post Content */}
            <div className="mb-6 mt-2">
                {isEditingPost ? (
                    <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                         <textarea
                            className="w-full bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-200 text-sm font-medium leading-relaxed"
                            rows="6"
                            value={editingPostText}
                            onChange={(e) => setEditingPostText(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button 
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors" 
                                onClick={() => { setIsEditingPost(false); setEditingPostText(announcement.content); }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-md" 
                                onClick={handleSavePostEdit}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-medium">
                    <Linkify componentDecorator={componentDecorator}>
                        {announcement.content}
                    </Linkify>
                    </p>
                )}
                
                {announcement.photoURL && !isEditingPost && (
                     <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm max-h-[500px]">
                        <img src={announcement.photoURL} alt="Attachment" className="w-full h-full object-cover" />
                     </div>
                )}
            </div>

            {/* Engagement Stats Bar */}
            <div className="flex justify-between items-center py-3 border-t border-b border-slate-100 dark:border-white/5 mb-6">
                <div>{renderReactionCount(postReactions)}</div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {liveCommentCount} comments
                </span>
            </div>

            {/* Big Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-10">
                <div
                className="relative"
                onMouseEnter={() => handleReactionOptionsMouseEnter(announcement.id, 'post')}
                onMouseLeave={handleReactionOptionsMouseLeave}
                >
                <button
                    className={`flex items-center justify-center w-full py-3 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${
                    postReactions[currentUserId]
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm border border-slate-100 dark:border-white/5'
                    }`}
                    onClick={() => toggleReactionPicker(announcement.id, 'post')}
                >
                    {postReactions[currentUserId] ? (
                    <img
                        src={isPostReactionActive
                            ? (reactionIcons[postReactions[currentUserId]] || reactionIcons['like']).animated
                            : (reactionIcons[postReactions[currentUserId]] || reactionIcons['like']).static
                        }
                        alt="reaction"
                        className="w-4 h-4 mr-2 object-contain"
                    />
                    ) : (
                    <FaThumbsUp className="h-3.5 w-3.5 mr-2" />
                    )}
                    <span className="capitalize">
                    {postReactions[currentUserId] || 'Like'}
                    </span>
                </button>
                {renderReactionPicker(announcement.id, 'post', (type) => onToggleReaction(announcement.id, type))}
                </div>

                <button
                className="flex items-center justify-center w-full py-3 rounded-xl font-bold text-xs bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm border border-slate-100 dark:border-white/5 transition-all duration-200 active:scale-95"
                onClick={() => commentInputRef.current?.focus()}
                >
                <FaComment className="h-3.5 w-3.5 mr-2 opacity-70" />
                Comment
                </button>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {topLevelComments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 opacity-60">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <FaComment className="w-5 h-5 text-slate-300 dark:text-slate-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No comments yet</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Start the conversation!</p>
                </div>
                )}

                {/* Recursive Comment Rendering */}
                {topLevelComments.map((comment) => (
                    <CommentNode
                        key={comment.id}
                        comment={comment}
                        allComments={comments}
                        usersMap={safeUsersMap}
                        currentUserId={currentUserId}
                        commentReactions={commentReactions}
                        editingCommentId={editingCommentId}
                        editingCommentText={editingCommentText}
                        setEditingCommentText={setEditingCommentText}
                        isReply={false} // Top level
                        onSetReplyTo={handleSetReplyTo}
                        onStartEditing={handleStartEditing}
                        onCancelEditing={handleCancelEditing}
                        onSaveEdit={handleSaveEdit}
                        onDeleteComment={(id) => setCommentToDeleteId(id)}
                        onToggleReaction={handleToggleCommentReaction}
                        renderReactionPicker={renderReactionPicker}
                        renderReactionCount={renderReactionCount}
                        formatRelativeTime={formatRelativeTime}
                        handleReactionOptionsMouseEnter={handleReactionOptionsMouseEnter}
                        handleReactionOptionsMouseLeave={handleReactionOptionsMouseLeave}
                        toggleReactionPicker={toggleReactionPicker}
                    />
                ))}
            </div>
                <div className="h-40 w-full flex-shrink-0" aria-hidden="true" />
            </div>
        </div>

                {/* STICKY FOOTER */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl z-30 bg-white dark:bg-[#121212] border-t border-x border-slate-200 dark:border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] rounded-t-[2rem]">
                  <div className="px-6 py-4">
                    {/* Reply indicator */}
                    {replyToCommentId && (
                      <div className="flex items-center justify-between px-4 py-2 mb-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-500/10">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Replying to <span className="text-blue-600 dark:text-blue-400">{replyToUserName}</span>
                        </span>
                        <button
                          onClick={() => { setReplyToCommentId(null); setReplyToUserName(''); }}
                          className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-3">
                      {/* User Avatar in Footer */}
                      <div className="flex-shrink-0 mb-1">
                        <UserInitialsAvatar user={userProfile} size={32} className="rounded-xl text-xs font-bold shadow-sm" />
                      </div>

                      {/* Input Field */}
                      <div className="flex-grow relative">
                        <textarea
                          ref={commentInputRef}
                          className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-100 dark:bg-[#1E1E1E] border-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 resize-none"
                          rows="1"
                          placeholder="Add a comment..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handlePostComment()
                            }
                          }}
                        />
                        <button
                          onClick={handlePostComment}
                          disabled={!newCommentText.trim()}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${
                            newCommentText.trim()
                              ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-white/10'
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <FaPaperPlane className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
        <ReactionsBreakdownModal
            isOpen={isReactionsBreakdownModalOpen}
            onClose={() => setIsReactionsBreakdownModalOpen(false)}
            reactionsData={reactionsForBreakdownModal}
            usersMap={safeUsersMap}
        />
        </motion.div>
    </>,
    document.body,
  )
}

export default AnnouncementModal