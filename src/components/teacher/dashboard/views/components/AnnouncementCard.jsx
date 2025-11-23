// src/components/teacher/dashboard/components/AnnouncementCard.jsx
import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Pin, MessageCircle, ThumbsUp } from 'lucide-react';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar';
import Linkify from 'react-linkify'; 

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

// Themed reaction icons for the picker (Glass style)
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

// Link Decorator
const componentDecorator = (href, text, key) => (
    <a 
        href={href} 
        key={key} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline font-bold tracking-wide transition-all"
        onClick={(e) => e.stopPropagation()} 
    >
        {text}
    </a>
);

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
        : { component: ThumbsUp, label: 'Like', color: 'text-slate-600 dark:text-slate-400' };

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
        }, 500); 
    };
    
    const handleTouchEnd = () => {
        clearTimeout(longPressTimerRef.current);
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
                                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md shadow-sm ring-2 ring-white dark:ring-slate-900 ${index > 0 ? '-ml-2' : ''}`}
                                style={{ zIndex: 3 - index }}
                            >
                                <Icon className="text-sm" />
                            </div>
                        );
                    })}
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2 hover:text-blue-500 transition-colors">{totalReactions}</span>
            </div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            // --- GLASSMORPHIC CARD ---
            className="glass-panel rounded-[2.5rem] p-6 relative group shadow-lg hover:shadow-xl transition-shadow duration-500 border border-white/40 dark:border-white/10 font-sans"
        >
            {post.isPinned && (
                <div className="absolute top-5 left-5 flex items-center gap-2 bg-sky-100/80 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10 border border-sky-200/50 dark:border-sky-500/20 backdrop-blur-md">
                    <Pin className="w-3 h-3" />
                    <span>Pinned</span>
                </div>
            )}
            
            <div className={`flex items-start mb-5 ${post.isPinned ? 'pt-8' : ''}`}>
                <div className="w-11 h-11 flex-shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-white/10">
                    <UserInitialsAvatar user={authorProfile} size="full" className="w-full h-full text-[10px]" />
                </div>
                <div className="ml-3.5">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">{post.teacherName}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">
                        {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}
                    </p>
                </div>
                {canModify && (
                    <div className="absolute top-5 right-5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-full p-1 border border-white/30 dark:border-white/5 shadow-sm">
                         {userProfile?.role === 'admin' && (
                            <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onTogglePin(post.id, post.isPinned); }} className={`p-2 rounded-full transition-colors ${post.isPinned ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' : 'hover:bg-white/50 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400'}`} title={post.isPinned ? "Unpin" : "Pin"}>
                                <Pin className="w-4 h-4" />
                            </motion.button>
                        )}
                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} className="p-2 rounded-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </motion.button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <textarea
                        className="w-full p-4 rounded-2xl bg-white/50 dark:bg-black/20 text-slate-800 dark:text-slate-100 resize-none mb-4 border border-white/30 dark:border-white/10 focus:ring-2 focus:ring-blue-500/50 outline-none text-sm font-medium leading-relaxed shadow-inner backdrop-blur-sm"
                        rows="5"
                        value={editingText}
                        onChange={(e) => onTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-3">
                        <button className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-all" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                        <button className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30 transition-all" onClick={(e) => { e.stopPropagation(); onSave(); }}>Save</button>
                    </div>
                </motion.div>
            ) : (
                post.content && (
                    <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words tracking-wide">
                        {isTruncated && !isExpanded ? (
                            post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...'
                        ) : (
                            <Linkify componentDecorator={componentDecorator}>
                                {post.content}
                            </Linkify>
                        )}
                        {isTruncated && (
                            <button
                                onClick={() => onToggleExpansion(post.id)}
                                className="text-blue-600 dark:text-blue-400 hover:underline ml-1.5 font-bold text-xs"
                            >
                                {isExpanded ? 'Show Less' : 'See More'}
                            </button>
                        )}
                    </div>
                )
            )}
            
            {post.photoURL && !isEditing && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-5 relative group/img"
                >
                    <div className="absolute inset-0 bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-2xl transform rotate-1 group-hover/img:rotate-2 transition-transform duration-500" />
                    <img 
                        src={post.photoURL} 
                        alt="Announcement" 
                        className="relative rounded-2xl max-h-96 w-full object-cover shadow-md border border-white/20 dark:border-white/5"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {post.caption && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center font-medium italic">{post.caption}</p>
                    )}
                </motion.div>
            )}

            {((postReactions && Object.keys(postReactions).length > 0) || (post.commentsCount || 0) > 0) && (
                <div className="flex justify-between items-center mt-6 px-1">
                    {formatReactionCount()}
                    <span className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors" onClick={() => onViewComments(post)}>
                        {post.commentsCount > 0 ? `${post.commentsCount} Comments` : 'No comments'}
                    </span>
                </div>
            )}

            {/* Actions Bar (Glass Pill) */}
            <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100/50 dark:border-white/5">
                <div
                    className="relative"
                    onMouseEnter={handleReactionOptionsMouseEnter}
                    onMouseLeave={handleReactionOptionsMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                >
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl transition-all duration-300 w-full ${currentUserReaction ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        onClick={() => onToggleReaction(post.id, 'like')}
                    >
                        {currentUserReaction ? (
                            <motion.div
                                key={currentUserReaction}
                                initial={{ scale: 0, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="flex items-center gap-2"
                            >
                                <ReactionButtonIcon className="text-lg" />
                                <span className={`text-xs font-bold ${reactionColor}`}>{reactionLabel}</span>
                            </motion.div>
                        ) : (
                            <>
                                <ThumbsUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Like</span>
                            </>
                        )}
                    </motion.button>

                    <AnimatePresence>
                        {isReactionOptionsVisible && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={{
                                    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.03 } },
                                    hidden: { opacity: 0, y: 10, transition: { staggerChildren: 0.03, staggerDirection: -1 } }
                                }}
                                className="absolute bottom-full mb-3 left-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 dark:border-white/5 p-1.5 flex space-x-1 z-50"
                                onMouseEnter={handleReactionOptionsMouseEnter}
                                onMouseLeave={handleReactionOptionsMouseLeave}
                            >
                                {Object.entries(themedReactionIcons).map(([type, { emoji, label }]) => (
                                    <motion.div
                                        key={type}
                                        variants={{ hidden: { opacity: 0, scale: 0.5, y: 10 }, visible: { opacity: 1, scale: 1, y: 0 } }}
                                        whileHover={{ scale: 1.2, y: -5 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-1.5 rounded-full group/reaction relative cursor-pointer"
                                        onClick={() => handleReactionOptionClick(type)}
                                    >
                                        <span className="text-2xl filter drop-shadow-sm">{emoji}</span>
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover/reaction:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none transform translate-y-1 group-hover/reaction:translate-y-0 duration-200">
                                            {label}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center space-x-2 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300 w-full"
                    onClick={() => onViewComments(post)}
                >
                    <MessageCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Comment</span>
                </motion.button>
            </div>
        </motion.div>
    );
};

export default memo(AnnouncementCard);