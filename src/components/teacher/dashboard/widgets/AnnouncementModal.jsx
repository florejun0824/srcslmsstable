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
} from 'react-icons/fa'
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
} from 'firebase/firestore'
import ReactionsBreakdownModal from './ReactionsBreakdownModal'
import UserInitialsAvatar from '../../../common/UserInitialsAvatar'
import Linkify from 'react-linkify'

const reactionTypes = ['like', 'heart', 'haha', 'wow', 'sad', 'angry', 'care']

// --- UPDATED CONFIG: STATIC VS ANIMATED PATHS ---
const reactionIcons = {
  like: {
    static: '/emojis/like.png',      // Static Image
    animated: '/emojis/like.gif',    // Animated GIF
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

const AnnouncementModal = ({
  isOpen,
  onClose,
  announcement,
  userProfile,
  db,
  postReactions,
  onToggleReaction,
  usersMap,
}) => {
  // state
  const [comments, setComments] = useState([])
  const [liveCommentCount, setLiveCommentCount] = useState(
    announcement?.commentsCount || 0,
  )
  const [newCommentText, setNewCommentText] = useState('')
  const [replyToCommentId, setReplyToCommentId] = useState(null)
  const [replyToUserName, setReplyToUserName] = useState('')
  const [commentReactions, setCommentReactions] = useState({})
  const [hoveredReactionData, setHoveredReactionData] = useState(null)
  
  // Track specifically which emoji inside the picker is being hovered
  const [hoveredPickerEmoji, setHoveredPickerEmoji] = useState(null)

  const [activeReactionPicker, setActiveReactionPicker] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] =
    useState(false)
  const [reactionsForBreakdownModal, setReactionsForBreakdownModal] =
    useState(null)

  const timeoutRef = useRef(null)
  const commentInputRef = useRef(null)

  const currentUserId = userProfile?.id
  const currentUserName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim()

  const commentsCollectionRef = announcement?.id
    ? collection(db, `teacherAnnouncements/${announcement.id}/comments`)
    : null

  // Close modal on Escape
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  // Time utils
  const convertTimestampToDate = (timestamp) => {
    if (!timestamp) return null
    if (typeof timestamp.toDate === 'function') return timestamp.toDate()
    if (timestamp instanceof Date) return timestamp
    try {
      return new Date(timestamp)
    } catch (e) {
      console.error('Could not convert timestamp:', timestamp, e)
      return null
    }
  }

  const formatRelativeTime = (date) => {
    if (!date) return ''
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    if (seconds < 60) return `now`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    const weeks = Math.floor(days / 7)
    return `${weeks}w`
  }

  // Sync comment count
  useEffect(() => {
    setLiveCommentCount(announcement?.commentsCount || 0)
  }, [announcement])

  // Real-time comments
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, announcement?.id])

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
    const userName = usersMap[comment.userId]?.firstName
      ? `${usersMap[comment.userId].firstName} ${usersMap[comment.userId].lastName}`
      : 'User'
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

  const handleDeleteComment = async (commentId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this comment? This action cannot be undone.',
      )
    )
      return

    const commentRef = doc(
      db,
      `teacherAnnouncements/${announcement.id}/comments`,
      commentId,
    )
    const announcementRef = doc(db, 'teacherAnnouncements', announcement.id)
    const repliesToDelete = comments.filter((c) => c.parentId === commentId)

    try {
      await runTransaction(db, async (transaction) => {
        const annDoc = await transaction.get(announcementRef)
        if (!annDoc.exists()) throw 'Announcement does not exist!'

        const deleteCount = 1 + repliesToDelete.length
        const newCount = Math.max(
          0,
          (annDoc.data().commentsCount || 0) - deleteCount,
        )

        transaction.update(announcementRef, { commentsCount: newCount })
        transaction.delete(commentRef)

        for (const reply of repliesToDelete) {
          const replyRef = doc(
            db,
            `teacherAnnouncements/${announcement.id}/comments`,
            reply.id,
          )
          transaction.delete(replyRef)
        }
      })
    } catch (error) {
      console.error('Error deleting comment in transaction:', error)
    }
  }

  const toggleReactionPicker = (entityId, type) => {
    if (
      activeReactionPicker?.id === entityId &&
      activeReactionPicker?.type === type
    ) {
      setActiveReactionPicker(null)
    } else {
      setActiveReactionPicker({ id: entityId, type })
    }
  }

  const openReactionsBreakdownModal = (reactions) => {
    setReactionsForBreakdownModal(reactions)
    setIsReactionsBreakdownModalOpen(true)
  }
  const closeReactionsBreakdownModal = () => {
    setIsReactionsBreakdownModalOpen(false)
    setReactionsForBreakdownModal(null)
  }

  const handleReactionOptionsMouseEnter = (entityId, type) => {
    clearTimeout(timeoutRef.current)
    setHoveredReactionData({ type, id: entityId })
  }
  const handleReactionOptionsMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredReactionData(null)
      setHoveredPickerEmoji(null) // Reset hovered emoji
    }, 300)
  }

  // --- Components ---

  // --- UPDATED: Horizontal Picker with Hover Logic ---
  const renderReactionPicker = (entityId, type, onSelect) => {
    const isActive =
      activeReactionPicker?.id === entityId && activeReactionPicker?.type === type
    const isHovered =
      hoveredReactionData?.id === entityId && hoveredReactionData?.type === type

    if (!isActive && !isHovered) return null

    return (
        <AnimatePresence>
            <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                    visible: { opacity: 1, y: 0, scale: 1, transition: { staggerChildren: 0.04 } },
                    hidden: { opacity: 0, y: 10, scale: 0.9, transition: { staggerChildren: 0.02, staggerDirection: -1 } }
                }}
                className="absolute bottom-full mb-3 left-0 glass-panel rounded-full p-1.5 flex items-center gap-1 z-50 shadow-2xl border border-white/40 dark:border-white/10 min-w-max"
                onMouseEnter={() => handleReactionOptionsMouseEnter(entityId, type)}
                onMouseLeave={handleReactionOptionsMouseLeave}
            >
                {reactionTypes.map((rType) => {
                    const icon = reactionIcons[rType];
                    const isEmojiHovered = hoveredPickerEmoji === rType;
                    
                    return (
                        <motion.button
                            key={rType}
                            variants={{
                                hidden: { opacity: 0, y: 15, scale: 0.5 },
                                visible: { opacity: 1, y: 0, scale: 1 }
                            }}
                            whileHover={{ scale: 1.3, y: -5 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-white/10 transition-colors relative group/emoji"
                            // Track individual hover for this specific emoji button
                            onMouseEnter={() => setHoveredPickerEmoji(rType)}
                            onMouseLeave={() => setHoveredPickerEmoji(null)}
                            onClick={() => {
                                setActiveReactionPicker(null)
                                handleReactionOptionsMouseLeave()
                                onSelect(rType)
                            }}
                        >
                            {/* LOGIC: Show GIF if hovered, otherwise PNG */}
                            <img 
                                src={isEmojiHovered ? icon.animated : icon.static} 
                                alt={icon.label}
                                className="w-8 h-8 object-contain" 
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/emoji:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none backdrop-blur-sm">
                                {icon.label}
                            </div>
                        </motion.button>
                    );
                })}
            </motion.div>
        </AnimatePresence>
    )
  }

  // --- UPDATED: Reaction Count (Always Static) ---
  const renderReactionCount = (reactions) => {
    if (!reactions || Object.keys(reactions).length === 0) return null

    const counts = {}
    Object.values(reactions).forEach((type) => {
      counts[type] = (counts[type] || 0) + 1
    })
    const sortedUniqueReactions = Object.entries(counts).sort(
      ([, a], [, b]) => b - a,
    )
    const totalReactions = Object.keys(reactions).length

    return (
      <div
        className="flex items-center space-x-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          openReactionsBreakdownModal(reactions)
        }}
      >
        <div className="flex items-center">
          {sortedUniqueReactions.map(([type], index) => {
            const reactionConfig = reactionIcons[type] || reactionIcons['like'];
            const zIndex = sortedUniqueReactions.length - index;

            return (
              <div
                key={type}
                className={`relative w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 ring-2 ring-white dark:ring-slate-900 ${
                  index > 0 ? '-ml-1.5' : ''
                }`}
                style={{ zIndex: zIndex }}
              >
                 {/* ALWAYS STATIC */}
                 <img 
                    src={reactionConfig.static} 
                    alt={reactionConfig.label}
                    className="w-full h-full object-contain p-0.5"
                 />
              </div>
            )
          })}
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1.5 hover:text-blue-500 transition-colors">
          {totalReactions}
        </span>
      </div>
    )
  }

  const topLevelComments = comments.filter((comment) => !comment.parentId)
  const getReplies = (commentId) =>
    comments.filter((comment) => comment.parentId === commentId)

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !announcement) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 font-sans"
      onClick={handleBackdropClick}
    >
      <div className="glass-panel bg-white/80 dark:bg-slate-900/80 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-white/40 dark:border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-slate-200/50 dark:border-white/5 relative">
          <h2 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight pt-1">
            Announcement Details
          </h2>
          <button
            onClick={onClose}
            className="absolute top-3.5 right-4 p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
          >
            <FaTimes className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
          <div className="flex items-center mb-5">
            <div className="w-12 h-12 mr-4 flex-shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-white/10">
              <UserInitialsAvatar
                user={usersMap[announcement.teacherId]}
                size="full"
                className="w-full h-full text-sm"
              />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {usersMap[announcement.teacherId]?.firstName}{' '}
                {usersMap[announcement.teacherId]?.lastName}
              </p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                {formatRelativeTime(convertTimestampToDate(announcement.createdAt))}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words tracking-wide">
              <Linkify componentDecorator={componentDecorator}>
                {announcement.content}
              </Linkify>
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 border-y border-slate-100/50 dark:border-white/5 py-3 my-2 max-w-lg px-2">
              <div>{renderReactionCount(postReactions)}</div>
              <span className="hover:text-blue-500 cursor-pointer transition-colors">
                {liveCommentCount} {liveCommentCount === 1 ? 'Comment' : 'Comments'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex justify-around items-center py-2 mb-6 max-w-lg">
              <div
                className="relative flex justify-center flex-1"
                onMouseEnter={() =>
                  handleReactionOptionsMouseEnter(announcement.id, 'post')
                }
                onMouseLeave={handleReactionOptionsMouseLeave}
              >
                <button
                  className={`flex items-center justify-center py-2 px-6 rounded-xl font-bold text-xs transition-all w-full hover:bg-slate-50 dark:hover:bg-white/5 ${
                    postReactions[currentUserId]
                      ? (reactionIcons[postReactions[currentUserId]]?.color || 'text-slate-600 dark:text-slate-400')
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                  onClick={() => toggleReactionPicker(announcement.id, 'post')}
                >
                  {/* ALWAYS STATIC HERE (Active State) */}
                  {postReactions[currentUserId] ? (
                    <img
                        src={(reactionIcons[postReactions[currentUserId]] || reactionIcons['like']).static}
                        alt="reaction"
                        className="w-5 h-5 mr-2 object-contain"
                    />
                  ) : (
                    <FaThumbsUp className="h-4 w-4 mr-2" />
                  )}
                  <span className="capitalize">
                    {postReactions[currentUserId] || 'Like'}
                  </span>
                </button>
                {renderReactionPicker(announcement.id, 'post', (type) =>
                  onToggleReaction(announcement.id, type),
                )}
              </div>
              <button
                className="flex items-center justify-center py-2 px-6 rounded-xl font-bold text-xs text-slate-500 dark:text-slate-400 transition-all flex-1 hover:bg-slate-50 dark:hover:bg-white/5"
                onClick={() => commentInputRef.current?.focus()}
              >
                <FaComment className="h-4 w-4 mr-2" />
                Comment
              </button>
            </div>

            {/* Comment list */}
            <div className="space-y-5 pl-2 sm:pl-4">
              {topLevelComments.length === 0 && (
                <div className="text-center py-8 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No comments yet.</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Be the first to start the conversation.</p>
                </div>
              )}
              {topLevelComments.map((comment) => {
                const isCurrentUserComment = comment.userId === currentUserId
                const isBeingEdited = editingCommentId === comment.id
                const currentUserCommentReaction =
                  commentReactions[comment.id]?.[currentUserId]

                return (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 flex-shrink-0 mt-1 rounded-full shadow-sm">
                      <UserInitialsAvatar
                        user={usersMap[comment.userId]}
                        size="full"
                        className="w-full h-full text-[10px]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="max-w-lg group">
                        <div className="relative bg-slate-100/70 dark:bg-white/5 p-3.5 rounded-2xl rounded-tl-none">
                          {isCurrentUserComment && !isBeingEdited && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEditing(comment)}
                                className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors"
                                title="Edit"
                              >
                                <FaEdit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                            {usersMap[comment.userId]?.firstName}{' '}
                            {usersMap[comment.userId]?.lastName}
                          </p>

                          {isBeingEdited ? (
                            <div className="mt-2">
                              <textarea
                                className="w-full p-3 text-xs rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
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
                                  className="px-3 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1 text-[10px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-md transition-all disabled:opacity-50"
                                  disabled={!editingCommentText.trim()}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed break-words">
                              <Linkify componentDecorator={componentDecorator}>
                                {comment.commentText}
                              </Linkify>
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 pl-2 space-x-3">
                          <span>{formatRelativeTime(comment.createdAt)}</span>
                          <div
                            className="relative"
                            onMouseEnter={() =>
                              handleReactionOptionsMouseEnter(comment.id, 'comment')
                            }
                            onMouseLeave={handleReactionOptionsMouseLeave}
                          >
                            <button
                              className={`hover:underline transition-colors ${
                                currentUserCommentReaction ? 'text-blue-500 dark:text-blue-400' : 'hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                              onClick={() =>
                                toggleReactionPicker(comment.id, 'comment')
                              }
                            >
                              <span className="capitalize">
                                {currentUserCommentReaction || 'Like'}
                              </span>
                            </button>
                            {renderReactionPicker(
                              comment.id,
                              'comment',
                              (type) => handleToggleCommentReaction(comment.id, type),
                            )}
                          </div>
                          <button
                            className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
                            onClick={() => handleSetReplyTo(comment)}
                          >
                            Reply
                          </button>
                          {renderReactionCount(commentReactions[comment.id] || {})}
                        </div>
                      </div>

                      {/* Replies */}
                      {getReplies(comment.id).map((reply) => {
                        const isCurrentUserReply = reply.userId === currentUserId
                        const isReplyBeingEdited = editingCommentId === reply.id
                        const currentUserReplyReaction =
                          commentReactions[reply.id]?.[currentUserId]
                        return (
                          <div
                            key={reply.id}
                            className="flex items-start space-x-3 mt-3 pl-4 relative"
                          >
                            {/* Connector Line */}
                            <div className="absolute left-0 top-[-10px] bottom-4 w-4 border-l-2 border-b-2 border-slate-100 dark:border-white/5 rounded-bl-xl pointer-events-none" />
                            
                            <div className="w-6 h-6 flex-shrink-0 mt-1 rounded-full shadow-sm z-10">
                              <UserInitialsAvatar
                                user={usersMap[reply.userId]}
                                size="full"
                                className="w-full h-full text-[8px]"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="max-w-lg group">
                                  <div className="relative bg-slate-50 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-white/5">
                                    {isCurrentUserReply && !isReplyBeingEdited && (
                                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleStartEditing(reply)}
                                          className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                          <FaEdit className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="p-1 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                          <FaTrash className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    
                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-0.5">
                                      {usersMap[reply.userId]?.firstName}{' '}
                                      {usersMap[reply.userId]?.lastName}
                                    </p>

                                    {isReplyBeingEdited ? (
                                      <div className="mt-2">
                                        <textarea
                                          className="w-full p-2 text-xs rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                                          rows="2"
                                          value={editingCommentText}
                                          onChange={(e) =>
                                            setEditingCommentText(e.target.value)
                                          }
                                          autoFocus
                                        />
                                        <div className="flex items-center justify-end gap-2 mt-2">
                                          <button
                                            onClick={handleCancelEditing}
                                            className="px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={handleSaveEdit}
                                            className="px-2 py-1 text-[10px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-md shadow-sm disabled:opacity-50"
                                            disabled={!editingCommentText.trim()}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed break-words">
                                        <Linkify componentDecorator={componentDecorator}>
                                          {reply.commentText}
                                        </Linkify>
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 pl-2 space-x-3">
                                    <span>{formatRelativeTime(reply.createdAt)}</span>

                                    <div
                                      className="relative"
                                      onMouseEnter={() =>
                                        handleReactionOptionsMouseEnter(
                                          reply.id,
                                          'reply',
                                        )
                                      }
                                      onMouseLeave={handleReactionOptionsMouseLeave}
                                    >
                                      <button
                                        className={`hover:underline transition-colors ${
                                            currentUserReplyReaction ? 'text-blue-500 dark:text-blue-400' : 'hover:text-slate-600 dark:hover:text-slate-300'
                                        }`}
                                        onClick={() =>
                                          toggleReactionPicker(reply.id, 'reply')
                                        }
                                      >
                                        <span className="capitalize">
                                          {currentUserReplyReaction || 'Like'}
                                        </span>
                                      </button>
                                      {renderReactionPicker(reply.id, 'reply', (type) =>
                                        handleToggleCommentReaction(reply.id, type),
                                      )}
                                    </div>
                                    <button
                                      className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
                                      onClick={() => handleSetReplyTo(reply)}
                                    >
                                      Reply
                                    </button>
                                    {renderReactionCount(
                                      commentReactions[reply.id] || {},
                                    )}
                                  </div>
                                </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="p-4 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <div>
            {replyToCommentId && (
              <div className="mb-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between px-3 max-w-lg pl-10 bg-blue-50/50 dark:bg-blue-900/10 py-1.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                <span>
                    Replying to <span className="text-blue-600 dark:text-blue-400">{replyToUserName}</span>
                </span>
                <button
                  onClick={() => {
                    setReplyToCommentId(null)
                    setReplyToUserName('')
                  }}
                  className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-end space-x-3">
              <div className="w-8 h-8 flex-shrink-0 mb-1 rounded-full shadow-sm ring-2 ring-white dark:ring-white/10">
                <UserInitialsAvatar
                  user={userProfile}
                  size="full"
                  className="w-full h-full text-xs"
                />
              </div>
              <div className="relative flex-grow">
                <div className="max-w-lg relative">
                  <textarea
                    ref={commentInputRef}
                    className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none resize-none leading-relaxed shadow-inner"
                    rows="1"
                    placeholder="Write a comment..."
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
                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        newCommentText.trim() 
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95' 
                        : 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    }`}
                    disabled={!newCommentText.trim()}
                  >
                    <FaPaperPlane className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReactionsBreakdownModal
        isOpen={isReactionsBreakdownModalOpen}
        onClose={closeReactionsBreakdownModal}
        reactionsData={reactionsForBreakdownModal}
        usersMap={usersMap}
      />
    </div>,
    document.body 
  )
}

export default AnnouncementModal