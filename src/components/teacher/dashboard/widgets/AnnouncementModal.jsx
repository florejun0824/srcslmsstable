import React, { useState, useEffect, useRef } from 'react'
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

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care']

const NativeEmoji = ({ emoji, ...props }) => <span {...props}>{emoji}</span>

const reactionIcons = {
  like: {
    component: (props) => <NativeEmoji emoji="👍" {...props} />,
    color: 'text-blue-500',
    label: 'Like',
  },
  love: {
    component: (props) => <NativeEmoji emoji="❤️" {...props} />,
    color: 'text-red-500',
    label: 'Love',
  },
  haha: {
    component: (props) => <NativeEmoji emoji="😂" {...props} />,
    color: 'text-yellow-500',
    label: 'Haha',
  },
  wow: {
    component: (props) => <NativeEmoji emoji="😮" {...props} />,
    color: 'text-amber-500',
    label: 'Wow',
  },
  sad: {
    component: (props) => <NativeEmoji emoji="😢" {...props} />,
    color: 'text-slate-500',
    label: 'Sad',
  },
  angry: {
    component: (props) => <NativeEmoji emoji="😡" {...props} />,
    color: 'text-red-700',
    label: 'Angry',
  },
  care: {
    component: (props) => <NativeEmoji emoji="🤗" {...props} />,
    color: 'text-pink-500',
    label: 'Care',
  },
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

  // Convert timestamp to Date safely
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

  // keep live comment count in sync with announcement prop
  useEffect(() => {
    setLiveCommentCount(announcement?.commentsCount || 0)
  }, [announcement])

  // subscribe to comments and each comment's reactions
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

      // subscribe to reactions for each comment
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

      // cleanup reaction listeners when snapshot changes
      return () => commentReactionUnsubs.forEach((unsub) => unsub())
    })

    // cleanup comments subscription
    return () => {
      if (unsubscribeComments) unsubscribeComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, announcement?.id])

  // Posting a comment (handles replies via parentId)
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

  // toggle comment reaction for current user
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

  // prepare reply
  const handleSetReplyTo = (comment) => {
    const userName = usersMap[comment.userId]?.firstName
      ? `${usersMap[comment.userId].firstName} ${usersMap[comment.userId].lastName}`
      : 'User'
    setReplyToCommentId(comment.id)
    setReplyToUserName(userName)
    commentInputRef.current?.focus()
  }

  // edit handlers
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

  // delete comment (also deletes replies)
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

    // Find replies to delete
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

        // delete replies
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

  // reaction picker control
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
    }, 300)
  }

  const renderReactionPicker = (entityId, type, onSelect) => {
    const isActive =
      activeReactionPicker?.id === entityId && activeReactionPicker?.type === type
    const isHovered =
      hoveredReactionData?.id === entityId && hoveredReactionData?.type === type

    if (!isActive && !isHovered) return null

    return (
      <div className="absolute bottom-full mb-2 left-1 -translate-x-1 bg-neumorphic-base rounded-full shadow-neumorphic p-1 flex gap-1 z-50">
        {reactionTypes.map((rType) => (
          <button
            key={rType}
            className="p-2 rounded-full transition-shadow hover:shadow-neumorphic-inset"
            onClick={() => {
              setActiveReactionPicker(null)
              handleReactionOptionsMouseLeave()
              onSelect(rType)
            }}
          >
            <NativeEmoji
              emoji={reactionIcons[rType].component({}).props.emoji}
              className="text-2xl"
            />
          </button>
        ))}
      </div>
    )
  }

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
            const reaction = reactionIcons[type]
            if (!reaction) return null

            const { component: Icon } = reaction
            const zIndex = sortedUniqueReactions.length - index

            return (
              <div
                key={type}
                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-neumorphic-base shadow-neumorphic-inset ring-2 ring-neumorphic-base ${
                  index > 0 ? '-ml-2' : ''
                }`}
                style={{ zIndex: zIndex }}
              >
                <Icon className="text-xl" />
              </div>
            )
          })}
        </div>
        <span className="text-sm text-slate-500 font-medium ml-2">
          {totalReactions}
        </span>
      </div>
    )
  }

  const topLevelComments = comments.filter((comment) => !comment.parentId)
  const getReplies = (commentId) =>
    comments.filter((comment) => comment.parentId === commentId)

  if (!isOpen || !announcement) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 font-sans">
      <div className="bg-neumorphic-base rounded-[28px] shadow-neumorphic w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header (not fixed) */}
        <div className="flex items-center justify-center p-4 border-b border-neumorphic-shadow-dark/30 relative">
          <h2 className="text-lg font-semibold text-slate-800 pt-2">
            Announcement
          </h2>
          <button
            onClick={onClose}
            className="absolute top-3 right-4 p-2 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
          >
            <FaTimes className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="p-5 overflow-y-auto flex-grow">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 mr-4 flex-shrink-0">
              <UserInitialsAvatar
                user={usersMap[announcement.teacherId]}
                size="w-12 h-12 text-lg"
              />
            </div>
            <div>
              <p className="font-semibold text-slate-800">
                {usersMap[announcement.teacherId]?.firstName}{' '}
                {usersMap[announcement.teacherId]?.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {formatRelativeTime(convertTimestampToDate(announcement.createdAt))}
              </p>
            </div>
          </div>

          <div className="mb-4 pb-4">
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </p>
          </div>

          <div>
            {/* Counts + reactions - shifted right a little and widened */}
            <div className="flex justify-between items-center text-sm text-slate-500 border-y border-neumorphic-shadow-dark/30 py-2 my-2 max-w-lg pl-4 sm:pl-7">
              <div>{renderReactionCount(postReactions)}</div>
              <span className="text-sm text-slate-500">
                {liveCommentCount} {liveCommentCount === 1 ? 'Comment' : 'Comments'}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex justify-around items-center py-1 mb-4 max-w-lg pl-4 sm:pl-7">
              <div
                className="relative flex justify-center"
                onMouseEnter={() =>
                  handleReactionOptionsMouseEnter(announcement.id, 'post')
                }
                onMouseLeave={handleReactionOptionsMouseLeave}
              >
                <button
                  className={`flex items-center justify-center py-2 px-5 rounded-full font-semibold transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset ${
                    postReactions[currentUserId]
                      ? 'text-blue-500'
                      : 'text-slate-600'
                  }`}
                  onClick={() => toggleReactionPicker(announcement.id, 'post')}
                >
                  {postReactions[currentUserId] ? (
                    <NativeEmoji
                      emoji={
                        reactionIcons[
                          postReactions[currentUserId]
                        ].component({}).props.emoji
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
                {renderReactionPicker(announcement.id, 'post', (type) =>
                  onToggleReaction(announcement.id, type),
                )}
              </div>
              <button
                className="flex items-center justify-center py-2 px-5 rounded-full font-semibold text-slate-600 transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                onClick={() => commentInputRef.current?.focus()}
              >
                <FaComment className="h-5 w-5" />
                <span className="ml-2">Comment</span>
              </button>
            </div>

            {/* Comment list */}
            <div className="space-y-4 pl-4 sm:pl-7">
              {topLevelComments.length === 0 && (
                <p className="text-slate-500 text-center py-6">
                  Be the first to comment.
                </p>
              )}
              {topLevelComments.map((comment) => {
                const isCurrentUserComment = comment.userId === currentUserId
                const isBeingEdited = editingCommentId === comment.id
                const currentUserCommentReaction =
                  commentReactions[comment.id]?.[currentUserId]

                return (
                  <div key={comment.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 flex-shrink-0 mt-1">
                      <UserInitialsAvatar
                        user={usersMap[comment.userId]}
                        size="w-8 h-8 text-sm leading-none"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="max-w-lg">
                        <div className="relative group bg-neumorphic-base p-2.5 rounded-xl shadow-neumorphic">
                          {isCurrentUserComment && !isBeingEdited && (
                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEditing(comment)}
                                className="p-1.5 rounded-full hover:shadow-neumorphic-inset text-slate-500 hover:text-slate-700"
                                title="Edit comment"
                              >
                                <FaEdit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1.5 rounded-full hover:shadow-neumorphic-inset text-slate-500 hover:text-red-600"
                                title="Delete comment"
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          <p className="text-sm font-semibold text-slate-800 pr-12">
                            {usersMap[comment.userId]?.firstName}{' '}
                            {usersMap[comment.userId]?.lastName}
                          </p>

                          {isBeingEdited ? (
                            <div className="mt-2">
                              <textarea
                                className="w-full p-2 border-none rounded-xl shadow-neumorphic-inset bg-neumorphic-base text-slate-800 placeholder:text-slate-500 focus:ring-0 resize-y"
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
                                  className="px-3 py-1 text-sm font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-3 py-1 text-sm font-semibold text-white bg-blue-500 rounded-lg shadow-neumorphic hover:shadow-neumorphic-inset disabled:opacity-50"
                                  disabled={!editingCommentText.trim()}
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1 break-words">
                              {comment.commentText}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-slate-500 mt-1 pl-2 space-x-3">
                          <span>{formatRelativeTime(comment.createdAt)}</span>
                          <div
                            className="relative flex justify-center"
                            onMouseEnter={() =>
                              handleReactionOptionsMouseEnter(comment.id, 'comment')
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
                                  currentUserCommentReaction ? 'text-blue-500' : ''
                                }`}
                              >
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
                            className="font-semibold hover:underline"
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
                            className="flex items-start space-x-3 mt-2"
                          >
                            <div className="w-7 h-7 flex-shrink-0 mt-1">
                              <UserInitialsAvatar
                                user={usersMap[reply.userId]}
                                size="w-7 h-7 text-xs leading-none"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* vertical line + padded reply content for visual thread connection */}
                              <div className="ml-2 border-l border-neumorphic-shadow-dark/20 pl-4">
                                <div className="max-w-lg">
                                  <div className="relative group bg-neumorphic-base p-2.5 rounded-xl shadow-neumorphic">
                                    {isCurrentUserReply && !isReplyBeingEdited && (
                                      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleStartEditing(reply)}
                                          className="p-1.5 rounded-full hover:shadow-neumorphic-inset text-slate-500 hover:text-slate-700"
                                          title="Edit reply"
                                        >
                                          <FaEdit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteComment(reply.id)}
                                          className="p-1.5 rounded-full hover:shadow-neumorphic-inset text-slate-500 hover:text-red-600"
                                          title="Delete reply"
                                        >
                                          <FaTrash className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    <p className="text-sm font-semibold text-slate-800 pr-10">
                                      {usersMap[reply.userId]?.firstName}{' '}
                                      {usersMap[reply.userId]?.lastName}
                                    </p>

                                    {isReplyBeingEdited ? (
                                      <div className="mt-2">
                                        <textarea
                                          className="w-full p-2 border-none rounded-xl shadow-neumorphic-inset bg-neumorphic-base text-slate-800 placeholder:text-slate-500 focus:ring-0 resize-y"
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
                                            className="px-3 py-1 text-xs font-semibold text-slate-600 rounded-lg hover:shadow-neumorphic-inset"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-lg shadow-neumorphic hover:shadow-neumorphic-inset disabled:opacity-50"
                                            disabled={!editingCommentText.trim()}
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5 break-words">
                                        {reply.commentText}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center text-xs text-slate-500 mt-1 pl-2 space-x-3">
                                    <span>{formatRelativeTime(reply.createdAt)}</span>

                                    <div
                                      className="relative flex justify-center"
                                      onMouseEnter={() =>
                                        handleReactionOptionsMouseEnter(
                                          reply.id,
                                          'reply',
                                        )
                                      }
                                      onMouseLeave={handleReactionOptionsMouseLeave}
                                    >
                                      <button
                                        className="font-semibold hover:underline"
                                        onClick={() =>
                                          toggleReactionPicker(reply.id, 'reply')
                                        }
                                      >
                                        <span
                                          className={`capitalize ${
                                            currentUserReplyReaction
                                              ? 'text-blue-500'
                                              : ''
                                          }`}
                                        >
                                          {currentUserReplyReaction || 'Like'}
                                        </span>
                                      </button>
                                      {renderReactionPicker(reply.id, 'reply', (type) =>
                                        handleToggleCommentReaction(reply.id, type),
                                      )}
                                    </div>
                                    <button
                                      className="font-semibold hover:underline"
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

        {/* Input Section (not fixed) */}
        <div className="p-3 border-t border-neumorphic-shadow-dark/30 bg-neumorphic-base">
          <div>
            {replyToCommentId && (
              <div className="mb-2 text-xs text-slate-600 flex items-center justify-between px-3 max-w-lg pl-7">
                Replying to{' '}
                <span className="font-semibold text-slate-800 ml-1">
                  {replyToUserName}
                </span>
                <button
                  onClick={() => {
                    setReplyToCommentId(null)
                    setReplyToUserName('')
                  }}
                  className="p-1.5 rounded-full hover:shadow-neumorphic-inset"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 flex-shrink-0">
                <UserInitialsAvatar
                  user={userProfile}
                  size="w-8 h-8 text-sm leading-none"
                />
              </div>
              <div className="relative flex-grow">
                <div className="max-w-lg">
                  <textarea
                    ref={commentInputRef}
                    className="w-full p-2 pr-12 border-none rounded-xl shadow-neumorphic-inset bg-neumorphic-base text-slate-800 placeholder:text-slate-500 focus:ring-0 resize-none leading-tight"
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:shadow-neumorphic-inset disabled:opacity-50"
                    disabled={!newCommentText.trim()}
                  >
                    <FaPaperPlane
                      className={`w-4 h-4 transition-colors ${
                        newCommentText.trim() ? 'text-sky-600' : 'text-slate-400'
                      }`}
                    />
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
    </div>
  )
}

export default AnnouncementModal
