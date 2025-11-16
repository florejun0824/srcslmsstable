import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Pin, MessageCircle, ThumbsUp } from 'lucide-react';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar';
import Linkify from 'react-linkify'; // We still need this

// Original reaction icons for mapping text to actual emoji characters and their associated colors/labels
const reactionIconsHomeView = {
  like: { component: (props) => (<span {...props}>👍</span>), label: 'Like', color: 'text-blue-500 dark:text-blue-400' },
  heart: { component: (props) => (<span {...props}>❤️</span>), label: 'Love', color: 'text-red-500 dark:text-red-400' },
  haha: { component: (props) => (<span {...props}>😂</span>), label: 'Haha', color: 'text-yellow-500 dark:text-yellow-400' },
  wow: { component: (props) => (<span {...props}>😮</span>), label: 'Wow', color: 'text-amber-500 dark:text-amber-400' },
  sad: { component: (props) => (<span {...props}>😢</span>), label: 'Sad', color: 'text-slate-500 dark:text-slate-400' },
  angry: { component: (props) => (<span {...props}>😡</span>), label: 'Angry', color: 'text-red-700 dark:text-red-500' },
  care: { component: (props) => (<span {...props}>🤗</span>), label: 'Care', color: 'text-pink-500 dark:text-pink-400' },
};

// Themed reaction icons for the picker. These will be neumorphed.
const themedReactionIcons = {
  like: { emoji: '👍', label: 'Like' },
  heart: { emoji: '❤️', label: 'Love' },
  haha: { emoji: '😂', label: 'Haha' },
  wow: { emoji: '😮', label: 'Wow' },
  sad: { emoji: '😢', label: 'Sad' },
  angry: { emoji: '😡', label: 'Angry' },
  care: { emoji: '🤗', label: 'Care' },
};

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300;

// --- ADDED ---
// This function will find links and wrap them in an <a> tag
// with our desired classes (blue color) and target properties (new tab).
const componentDecorator = (href, text, key) => (
    <a 
        href={href} 
        key={key} 
        target="_blank" 
        rel="noopener noreferrer"
        // --- MODIFIED: Added dark mode link color ---
        className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
        onClick={(e) => e.stopPropagation()} // Prevents card click when clicking link
    >
        {text}
    </a>
);
// --- END OF ADDED SECTION ---

const AnnouncementCard = ({
    post,
    userProfile,
    authorProfile,
    postReactions,
    usersMap,
    isEditing,
    editingText,
    isExpanded,
    onTextChange,
    onSave,
    onCancelEdit,
    onStartEdit,
    onDelete,
    onTogglePin,
    onToggleReaction,
    onToggleExpansion,
    onViewComments,
    onViewReactions,
}) => {
    const [isReactionOptionsVisible, setReactionOptionsVisible] = useState(false);
    const hoverTimeoutRef = useRef(null);
    const longPressTimerRef = useRef(null);

    const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
    const currentUserReaction = postReactions[userProfile?.id];
    const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;

    const {
        component: ReactionButtonIcon,
        label: reactionLabel,
        color: reactionColor
    } = currentUserReaction && reactionIconsHomeView[currentUserReaction]
        ? reactionIconsHomeView[currentUserReaction]
        // --- MODIFIED: Added dark mode default text color ---
        : { component: ThumbsUp, label: 'Like', color: 'text-slate-600 dark:text-slate-400' };

    // ... (rest of the handlers from handleReactionOptionsMouseEnter to formatReactionCount remain unchanged) ...
    // --- Reaction Hover/Touch Handlers ---
    const handleReactionOptionsMouseEnter = () => {
        clearTimeout(hoverTimeoutRef.current);
        setReactionOptionsVisible(true);
    };

    const handleReactionOptionsMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setReactionOptionsVisible(false);
        }, 300);
    };

    const handleTouchStart = (e) => {
        e.preventDefault();
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = setTimeout(() => {
            setReactionOptionsVisible(true);
        }, 500); // 500ms for long press
    };
    
    const handleTouchEnd = () => {
        clearTimeout(longPressTimerRef.current);
        // Keep options visible for a moment to allow selection
        setTimeout(() => setReactionOptionsVisible(false), 2000);
    };
    
    const handleTouchMove = () => {
        clearTimeout(longPressTimerRef.current);
    };

    const handleReactionOptionClick = (reactionType) => {
        onToggleReaction(post.id, reactionType);
        setReactionOptionsVisible(false);
    };
    
    const formatReactionCount = () => {
        const totalReactions = Object.keys(postReactions).length;
        if (totalReactions === 0) return null;

        return (
            <div
                className="flex items-center space-x-1 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onViewReactions(postReactions, usersMap);
                }}
            >
                <div className="flex items-center">
                    {Object.values(postReactions).slice(0, 3).map((reactionType, index) => {
                        const reaction = reactionIconsHomeView[reactionType];
                        if (!reaction) return null;
                        const { component: Icon } = reaction;
                        return (
                            <div
                                key={index}
                                // --- MODIFIED: Apply dark mode classes to reaction count emojis ---
                                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark ring-2 ring-neumorphic-base dark:ring-neumorphic-base-dark ${index > 0 ? '-ml-2' : ''}`}
                                style={{ zIndex: 3 - index }}
                            >
                                <Icon className="text-xl" />
                            </div>
                        );
                    })}
                </div>
                {/* --- MODIFIED: Added dark mode text color --- */}
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium ml-2 hover:underline">{totalReactions}</span>
            </div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            // --- MODIFIED: Added dark mode classes ---
            className={`bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl p-6 relative group transition-shadow duration-300 shadow-neumorphic dark:shadow-neumorphic-dark`}
        >
            {post.isPinned && (
                // --- MODIFIED: Added dark mode classes ---
                <div className="absolute top-4 left-4 flex items-center gap-2 text-sky-700 dark:text-sky-400 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark px-3 py-1 rounded-full text-xs font-semibold z-10">
                    <Pin className="w-3 h-3" />
                    <span>Pinned</span>
                </div>
            )}
            <div className={`flex items-start mb-4 ${post.isPinned ? 'pt-8' : ''}`}>
                <div className="w-10 h-10 flex-shrink-0">
                    <UserInitialsAvatar user={authorProfile} size="w-10 h-10" />
                </div>
                <div className="ml-3">
                    {/* --- MODIFIED: Added dark mode text colors --- */}
                    <p className="font-bold text-slate-800 dark:text-slate-100">{post.teacherName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</p>
                </div>
                {canModify && (
                    // --- MODIFIED: Added dark mode classes ---
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark rounded-full p-1">
                         {userProfile?.role === 'admin' && (
                            // --- MODIFIED: Added dark mode classes ---
                            <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onTogglePin(post.id, post.isPinned); }} className={`p-2 rounded-full hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow ${post.isPinned ? 'text-sky-500 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} title={post.isPinned ? "Unpin Announcement" : "Pin Announcement"}>
                                <Pin className="w-5 h-5" />
                            </motion.button>
                        )}
                        {/* --- MODIFIED: Added dark mode classes --- */}
                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow" title="Edit Announcement">
                            <Pencil className="w-5 h-5" />
                        </motion.button>
                        {/* --- MODIFIED: Added dark mode classes --- */}
                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} className="p-2 rounded-full text-red-500 dark:text-red-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow" title="Delete Announcement">
                            <Trash2 className="w-5 h-5" />
                        </motion.button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <>
                    {/* --- MODIFIED: Added dark mode classes --- */}
                    <textarea
                        className="w-full p-3 border-none ring-0 focus:ring-0 rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 resize-none mb-4 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark"
                        rows="5"
                        value={editingText}
                        onChange={(e) => onTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-2">
                        {/* --- MODIFIED: Added dark mode classes --- */}
                        <button className="px-5 py-2 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                        <button className="px-5 py-2 rounded-full font-semibold text-sky-600 dark:text-sky-400 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark" onClick={(e) => { e.stopPropagation(); onSave(); }}>Save</button>
                    </div>
                </>
            ) : (
                post.content && (
                    // --- MODIFIED: Added dark mode classes ---
                    <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                        {isTruncated && !isExpanded ? (
                            post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...'
                        ) : (
                            <Linkify componentDecorator={componentDecorator}>
                                {post.content}
                            </Linkify>
                        )}
                        {isTruncated && (
                             // --- MODIFIED: Added dark mode classes ---
                            <button
                                onClick={() => onToggleExpansion(post.id)}
                                className="text-sky-600 dark:text-sky-400 hover:underline ml-1 font-semibold"
                            >
                                {isExpanded ? 'Show Less' : 'See More'}
                            </button>
                        )}
                    </p>
                )
            )}
            
            {post.photoURL && !isEditing && (
                <div className="mt-4">
                    <img 
                        src={post.photoURL} 
                        alt="Announcement" 
                        // --- MODIFIED: Added dark mode classes ---
                        className="rounded-xl max-h-96 w-full object-contain bg-slate-100 dark:bg-slate-800"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {post.caption && (
                        // --- MODIFIED: Added dark mode classes ---
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 text-center italic">{post.caption}</p>
                    )}
                </div>
            )}

            {((postReactions && Object.keys(postReactions).length > 0) || (post.commentsCount || 0) > 0) && (
                // --- MODIFIED: Added dark mode classes ---
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                    {formatReactionCount()}
                    <span className="cursor-pointer hover:underline font-medium" onClick={() => onViewComments(post)}>
                        View Comments
                    </span>
                </div>
            )}

            {/* --- MODIFIED: Added dark mode classes --- */}
            <div className="flex justify-around items-center pt-3 mt-4 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30">
                <div
                    className="relative"
                    onMouseEnter={handleReactionOptionsMouseEnter}
                    onMouseLeave={handleReactionOptionsMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                >
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        // --- MODIFIED: Added dark mode classes ---
                        className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-all duration-200 w-full justify-center ${currentUserReaction ? reactionColor : 'text-slate-600 dark:text-slate-400'} hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark`}
                        onClick={() => onToggleReaction(post.id, 'like')} // Default toggle is 'like'
                    >
                        {currentUserReaction ? (
                            <motion.div
                                key={currentUserReaction}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-6 h-6 flex items-center justify-center"
                            >
                                <ReactionButtonIcon className="text-2xl" />
                            </motion.div>
                        ) : (
                            <ThumbsUp className="h-5 w-5" />
                        )}
                        <span className="font-semibold">{reactionLabel}</span>
                    </motion.button>

                    <AnimatePresence>
                        {isReactionOptionsVisible && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.05 } },
                                    hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
                                }}
                                // --- MODIFIED: Added dark mode classes for reaction picker ---
                                className="absolute bottom-full mb-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark p-2 flex space-x-1 z-50"
                                onMouseEnter={handleReactionOptionsMouseEnter}
                                onMouseLeave={handleReactionOptionsMouseLeave}
                            >
                                {Object.entries(themedReactionIcons).map(([type, { emoji, label }]) => (
                                    <motion.div
                                        key={type}
                                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-1 rounded-full group/reaction relative"
                                        onClick={() => handleReactionOptionClick(type)}
                                    >
                                        {/* --- MODIFIED: Added dark mode classes for emoji button --- */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark transition-shadow duration-200 cursor-pointer hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                                            <span className="text-2xl">{emoji}</span>
                                        </div>
                                        {/* --- MODIFIED: Added dark mode classes for tooltip --- */}
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover/reaction:opacity-100 transition-opacity whitespace-nowrap">
                                            {label}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    // --- MODIFIED: Added dark mode classes ---
                    className="flex items-center space-x-2 py-2 px-4 rounded-full text-slate-600 dark:text-slate-400 transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                    onClick={() => onViewComments(post)}
                >
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold">Comment</span>
                </motion.button>
            </div>
        </motion.div>
    );
};

export default memo(AnnouncementCard);