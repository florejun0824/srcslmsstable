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
  const [liveCommentCount, setLiveCommentCount] = useState(announcement?.commentsCount || 0)
  const [newCommentText, setNewCommentText] = useState('')
  const [replyToCommentId, setReplyToCommentId] = useState(null)
  const [replyToUserName, setReplyToUserName] = useState('')
  const [commentReactions, setCommentReactions] = useState({})
  
  // Hover & Picker State
  const [hoveredReactionData, setHoveredReactionData] = useState(null)
  const [hoveredPickerEmoji, setHoveredPickerEmoji] = useState(null)
  const [activeReactionPicker, setActiveReactionPicker] = useState(null)
  
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false)
  const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null)

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
      if (event.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
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
    if (!window.confirm('Are you sure you want to delete this comment?')) return

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
        const newCount = Math.max(0, (annDoc.data().commentsCount || 0) - deleteCount)

        transaction.update(announcementRef, { commentsCount: newCount })
        transaction.delete(commentRef)

        for (const reply of repliesToDelete) {
          const replyRef = doc(db, `teacherAnnouncements/${announcement.id}/comments`, reply.id)
          transaction.delete(replyRef)
        }
      })
    } catch (error) {
      console.error('Error deleting comment in transaction:', error)
    }
  }

  const toggleReactionPicker = (entityId, type) => {
    if (activeReactionPicker?.id === entityId && activeReactionPicker?.type === type) {
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
      setHoveredPickerEmoji(null) 
    }, 300)
  }

  // --- Components ---

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
                    hidden: { opacity: 0, y: 10, scale: 0.9, transition: { staggerChildren: 0.02, staggerDirection: -1 } }
                }}
                className="absolute bottom-full mb-3 left-0 bg-white/90 dark:bg-[#1E1E1E]/95 backdrop-blur-xl rounded-full p-2 flex items-center gap-1.5 z-50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/10 min-w-max"
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
                                className="w-9 h-9 object-contain drop-shadow-sm" 
                            />
                            {/* Tooltip */}
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full opacity-0 group-hover/emoji:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
                                {icon.label}
                            </div>
                        </motion.button>
                    );
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
        className="flex items-center gap-1.5 cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation()
          openReactionsBreakdownModal(reactions)
        }}
      >
        <div className="flex items-center -space-x-2">
          {sortedUniqueReactions.map(([type], index) => {
            const reactionConfig = reactionIcons[type] || reactionIcons['like'];
            const zIndex = sortedUniqueReactions.length - index;

            return (
              <div
                key={type}
                className="relative w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 ring-[1.5px] ring-white dark:ring-slate-900 shadow-sm overflow-hidden"
                style={{ zIndex: zIndex }}
              >
                 <img 
                    src={reactionConfig.static} 
                    alt={reactionConfig.label}
                    className="w-full h-full object-contain p-[2px]"
                 />
              </div>
            )
          })}
        </div>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
          {totalReactions}
        </span>
      </div>
    )
  }

  const topLevelComments = comments.filter((comment) => !comment.parentId)
  const getReplies = (commentId) => comments.filter((comment) => comment.parentId === commentId)

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen || !announcement) return null;

  // --- MAIN RENDER ---
  // Fix: Check if "post" reaction is currently being hovered or picker is active
  const isPostReactionActive = 
    (hoveredReactionData?.id === announcement.id && hoveredReactionData?.type === 'post') ||
    (activeReactionPicker?.id === announcement.id && activeReactionPicker?.type === 'post');

  return createPortal(
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 font-sans"
        onClick={handleBackdropClick}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-[#FDFDFD] dark:bg-[#121212] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/50 dark:border-white/5"
      >
        
        {/* Header - Minimalist */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-white/5 bg-white/50 dark:bg-[#121212]/50 backdrop-blur-sm z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Post Details
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all active:scale-90"
          >
            <FaTimes className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-black/20">
          <div className="p-8 pb-32"> {/* Added ample bottom padding for scroll */}
            
            {/* Author Section */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-[1.2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-white/5">
                <UserInitialsAvatar
                  user={usersMap[announcement.teacherId]}
                  size="full"
                  className="w-full h-full text-base font-bold"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {usersMap[announcement.teacherId]?.firstName} {usersMap[announcement.teacherId]?.lastName}
                </h3>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                  {formatRelativeTime(convertTimestampToDate(announcement.createdAt))}
                </span>
              </div>
            </div>

            {/* Post Content */}
            <div className="mb-8">
              <p className="text-[15px] leading-7 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-medium">
                <Linkify componentDecorator={componentDecorator}>
                  {announcement.content}
                </Linkify>
              </p>
            </div>

            {/* Engagement Stats Bar */}
            <div className="flex justify-between items-center py-4 border-t border-b border-slate-100 dark:border-white/5 mb-6">
              <div>{renderReactionCount(postReactions)}</div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
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
                  className={`flex items-center justify-center w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 ${
                    postReactions[currentUserId]
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm'
                  }`}
                  onClick={() => toggleReactionPicker(announcement.id, 'post')}
                >
                  {postReactions[currentUserId] ? (
                    <img
                        // FIX: Now uses the boolean we calculated earlier
                        src={isPostReactionActive 
                            ? (reactionIcons[postReactions[currentUserId]] || reactionIcons['like']).animated 
                            : (reactionIcons[postReactions[currentUserId]] || reactionIcons['like']).static
                        }
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
                {renderReactionPicker(announcement.id, 'post', (type) => onToggleReaction(announcement.id, type))}
              </div>

              <button
                className="flex items-center justify-center w-full py-3.5 rounded-2xl font-bold text-sm bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all duration-200 active:scale-95"
                onClick={() => commentInputRef.current?.focus()}
              >
                <FaComment className="h-4 w-4 mr-2 opacity-70" />
                Comment
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
              {topLevelComments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 opacity-60">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <FaComment className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No comments yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Start the conversation!</p>
                </div>
              )}
              
              {topLevelComments.map((comment) => {
                const isCurrentUserComment = comment.userId === currentUserId
                const isBeingEdited = editingCommentId === comment.id
                const currentUserCommentReaction = commentReactions[comment.id]?.[currentUserId]

                return (
                  <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex-shrink-0 mt-1">
                        <UserInitialsAvatar
                            user={usersMap[comment.userId]}
                            size={36}
                            className="rounded-[12px] text-xs font-bold shadow-sm"
                        />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="group relative">
                        {/* Comment Bubble */}
                        <div className={`p-4 rounded-[1.2rem] rounded-tl-none relative ${
                            isCurrentUserComment 
                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20' 
                                : 'bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-white/5 shadow-sm'
                        }`}>
                          
                          {/* Header */}
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {usersMap[comment.userId]?.firstName} {usersMap[comment.userId]?.lastName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>

                          {/* Content or Edit Mode */}
                          {isBeingEdited ? (
                            <div className="mt-2">
                              <textarea
                                className="w-full p-3 text-sm rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                rows="3"
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={handleCancelEditing}
                                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-lg shadow-sm"
                                  disabled={!editingCommentText.trim()}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                              <Linkify componentDecorator={componentDecorator}>
                                {comment.commentText}
                              </Linkify>
                            </p>
                          )}

                          {/* Edit/Delete Actions (Hidden until hover) */}
                          {isCurrentUserComment && !isBeingEdited && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleStartEditing(comment)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-blue-500 transition-colors">
                                <FaEdit className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteComment(comment.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                                <FaTrash className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Comment Footer Actions */}
                        <div className="flex items-center gap-4 mt-1.5 pl-2">
                            <div
                                className="relative"
                                onMouseEnter={() => handleReactionOptionsMouseEnter(comment.id, 'comment')}
                                onMouseLeave={handleReactionOptionsMouseLeave}
                            >
                                <button
                                    className={`text-xs font-bold transition-colors ${
                                        currentUserCommentReaction ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                                    }`}
                                    onClick={() => toggleReactionPicker(comment.id, 'comment')}
                                >
                                    {currentUserCommentReaction || 'Like'}
                                </button>
                                {renderReactionPicker(comment.id, 'comment', (type) => handleToggleCommentReaction(comment.id, type))}
                            </div>
                            
                            <button
                                className="text-xs font-bold text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                                onClick={() => handleSetReplyTo(comment)}
                            >
                                Reply
                            </button>
                            
                            {renderReactionCount(commentReactions[comment.id] || {})}
                        </div>
                      </div>

                      {/* Replies */}
                      <div className="mt-3 pl-3 border-l-2 border-slate-100 dark:border-white/5 space-y-4">
                        {getReplies(comment.id).map((reply) => {
                            const isCurrentUserReply = reply.userId === currentUserId
                            const isReplyBeingEdited = editingCommentId === reply.id
                            const currentUserReplyReaction = commentReactions[reply.id]?.[currentUserId]
                            
                            return (
                                <div key={reply.id} className="flex gap-3 group/reply relative pl-3">
                                    <div className="flex-shrink-0 mt-1">
                                        <UserInitialsAvatar user={usersMap[reply.userId]} size={28} className="rounded-[10px] text-[10px] font-bold shadow-sm" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none relative">
                                            {/* Reply Header */}
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                                    {usersMap[reply.userId]?.firstName} {usersMap[reply.userId]?.lastName}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                                    {formatRelativeTime(reply.createdAt)}
                                                </span>
                                            </div>

                                            {isReplyBeingEdited ? (
                                                <div className="mt-2">
                                                    <textarea
                                                        className="w-full p-2 text-xs rounded-lg bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                                        rows="2"
                                                        value={editingCommentText}
                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button onClick={handleCancelEditing} className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200 rounded">Cancel</button>
                                                        <button onClick={handleSaveEdit} className="px-2 py-1 text-[10px] font-bold text-white bg-blue-500 hover:bg-blue-600 rounded">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                                    <Linkify componentDecorator={componentDecorator}>{reply.commentText}</Linkify>
                                                </p>
                                            )}

                                            {isCurrentUserReply && !isReplyBeingEdited && (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                                    <button onClick={() => handleStartEditing(reply)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-blue-500"><FaEdit className="w-2.5 h-2.5" /></button>
                                                    <button onClick={() => handleDeleteComment(reply.id)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-slate-400 hover:text-red-500"><FaTrash className="w-2.5 h-2.5" /></button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reply Actions */}
                                        <div className="flex items-center gap-3 mt-1 pl-2">
                                             <div className="relative" onMouseEnter={() => handleReactionOptionsMouseEnter(reply.id, 'reply')} onMouseLeave={handleReactionOptionsMouseLeave}>
                                                <button 
                                                    className={`text-[10px] font-bold transition-colors ${currentUserReplyReaction ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                                                    onClick={() => toggleReactionPicker(reply.id, 'reply')}
                                                >
                                                    {currentUserReplyReaction || 'Like'}
                                                </button>
                                                {renderReactionPicker(reply.id, 'reply', (type) => handleToggleCommentReaction(reply.id, type))}
                                             </div>
                                             <button className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors" onClick={() => handleSetReplyTo(reply)}>Reply</button>
                                             {renderReactionCount(commentReactions[reply.id] || {})}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Floating Input Section */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border-t border-slate-100 dark:border-white/5 z-20">
          <div className="max-w-3xl mx-auto">
            {replyToCommentId && (
              <div className="flex items-center justify-between px-4 py-2 mb-2 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Replying to <span className="text-blue-600 dark:text-blue-400">{replyToUserName}</span>
                </span>
                <button onClick={() => { setReplyToCommentId(null); setReplyToUserName(''); }} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400">
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-3">
              <div className="flex-shrink-0 mb-1">
                 <UserInitialsAvatar user={userProfile} size={40} className="rounded-[14px] text-xs font-bold shadow-sm" />
              </div>
              
              <div className="flex-grow relative">
                <textarea
                  ref={commentInputRef}
                  className="w-full pl-5 pr-14 py-3.5 rounded-[1.5rem] bg-slate-100 dark:bg-white/5 border-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 resize-none shadow-inner"
                  rows="1"
                  placeholder="Add a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                />
                
                <button
                  onClick={handlePostComment}
                  disabled={!newCommentText.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-300 ${
                    newCommentText.trim() 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95' 
                        : 'bg-transparent text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </motion.div>

      <ReactionsBreakdownModal
        isOpen={isReactionsBreakdownModalOpen}
        onClose={closeReactionsBreakdownModal}
        reactionsData={reactionsForBreakdownModal}
        usersMap={usersMap}
      />
    </motion.div>,
    document.body 
  )
}

export default AnnouncementModal