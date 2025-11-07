import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilIcon, TrashIcon, GlobeAltIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import Linkify from 'react-linkify';

// Emojis for the reaction picker and display
const reactionIcons = {
  like: { component: (props) => (<span {...props}>👍</span>), label: 'Like', color: 'text-blue-500 dark:text-blue-400' },
  love: { component: (props) => (<span {...props}>❤️</span>), label: 'Love', color: 'text-red-500 dark:text-red-400' },
  haha: { component: (props) => (<span {...props}>😂</span>), label: 'Haha', color: 'text-yellow-500 dark:text-yellow-400' },
  wow: { component: (props) => (<span {...props}>😮</span>), label: 'Wow', color: 'text-amber-500 dark:text-amber-400' },
  sad: { component: (props) => (<span {...props}>😢</span>), label: 'Sad', color: 'text-slate-500 dark:text-slate-400' },
  angry: { component: (props) => (<span {...props}>😡</span>), label: 'Angry', color: 'text-red-700 dark:text-red-500' },
  care: { component: (props) => (<span {...props}>🤗</span>), label: 'Care', color: 'text-pink-500 dark:text-pink-400' },
};

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];
const POST_TRUNCATE_LENGTH = 300;

// Linkify decorator
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

// Locked buttons placeholder
const LockedButtonsPlaceholder = () => (
    <div className="flex justify-around items-center pt-3 mt-4 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 opacity-60">
        <div className="flex items-center space-x-2 py-2 px-4 rounded-full text-slate-500 dark:text-slate-400">
            <LockClosedIcon className="h-5 w-5" />
            <span className="font-semibold text-sm">Reach Lvl 40 to React & Comment</span>
        </div>
    </div>
);

const StudentPostCard = ({
    post,
    userProfile,
    canReact,
    isEditing,
    editingText,
    isExpanded,
    onTextChange,
    onSave,
    onCancelEdit,
    onStartEdit,
    onDelete,
    onToggleReaction,
    onToggleExpansion,
    onViewComments,
    onViewReactions,
}) => {
    const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
    const pickerTimerRef = useRef(null);

    const postReactions = post.reactions || {};
    const currentUserReaction = postReactions[userProfile.id];
    const isAuthor = userProfile.id === post.authorId;
    const isTruncated = post.content && post.content.length > POST_TRUNCATE_LENGTH;

    const {
        component: ReactionButtonIcon,
        label: reactionLabel,
        color: reactionColor
    } = currentUserReaction && reactionIcons[currentUserReaction]
        ? reactionIcons[currentUserReaction]
        : { component: HandThumbUpIcon, label: 'Like', color: 'text-slate-600 dark:text-slate-400' };
    
    // --- Reaction Picker Handlers ---
    const openReactionPicker = () => {
        clearTimeout(pickerTimerRef.current);
        setIsReactionPickerOpen(true);
    };
    const closeReactionPicker = () => {
        pickerTimerRef.current = setTimeout(() => {
            setIsReactionPickerOpen(false);
        }, 300); // 300ms delay to allow moving mouse
    };
    const handleReactionSelect = (reactionType) => {
        onToggleReaction(post.id, reactionType);
        setIsReactionPickerOpen(false);
    };

    // --- Reaction Count Display ---
    const formatReactionCount = () => {
        const totalReactions = Object.keys(postReactions).length;
        if (totalReactions === 0) return null;

        const counts = {};
        Object.values(postReactions).forEach((type) => {
            counts[type] = (counts[type] || 0) + 1;
        });
        const sortedUniqueReactions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

        return (
            <div
                className="flex items-center space-x-1 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onViewReactions(post); // Pass the whole post
                }}
            >
                <div className="flex items-center">
                    {sortedUniqueReactions.slice(0, 3).map((type, index) => {
                        const reaction = reactionIcons[type];
                        if (!reaction) return null;
                        const { component: Icon } = reaction;
                        return (
                            <div
                                key={index}
                                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark ring-2 ring-neumorphic-base dark:ring-neumorphic-base-dark ${index > 0 ? '-ml-2' : ''}`}
                                style={{ zIndex: 3 - index }}
                            >
                                <Icon className="text-xl" />
                            </div>
                        );
                    })}
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium ml-2 hover:underline">{totalReactions}</span>
            </div>
        );
    };

    return (
        <motion.div
            layout
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className={`bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl p-4 sm:p-6 relative group transition-shadow duration-300 shadow-neumorphic dark:shadow-neumorphic-dark`}
        >
            {/* --- Post Header --- */}
            <div className="flex items-start mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                    <UserInitialsAvatar 
                        firstName={post.authorName.split(' ')[0]} 
                        lastName={post.authorName.split(' ')[1] || ''} 
                        photoURL={post.authorPhotoURL}
                        size="full"
                    />
                </div>
                <div className="ml-3">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{post.authorName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : 'Just now'}</span>
                        {post.audience === 'Public' ? (
                            <GlobeAltIcon className="w-3 h-3" title="Public" />
                        ) : (
                            <LockClosedIcon className="w-3 h-3" title="Private" />
                        )}
                        {post.editedAt && (
                            <span>(Edited)</span>
                        )}
                    </div>
                </div>
                {isAuthor && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark rounded-full p-1">
                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow" title="Edit Post">
                            <PencilIcon className="w-5 h-5" />
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} className="p-2 rounded-full text-red-500 dark:text-red-400 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow" title="Delete Post">
                            <TrashIcon className="w-5 h-5" />
                        </motion.button>
                    </div>
                )}
            </div>

            {/* --- Post Content --- */}
            {isEditing ? (
                <>
                    <textarea
                        className="w-full p-3 border-none ring-0 focus:ring-0 rounded-lg bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-800 dark:text-slate-100 resize-none mb-4 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark"
                        rows="5"
                        value={editingText}
                        onChange={(e) => onTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button className="px-5 py-2 rounded-full font-semibold text-slate-700 dark:text-slate-200 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                        <button className="px-5 py-2 rounded-full font-semibold text-blue-600 dark:text-blue-400 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" onClick={(e) => { e.stopPropagation(); onSave(); }}>Save</button>
                    </div>
                </>
            ) : (
                post.content && (
                    <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap break-words">
                        {isTruncated && !isExpanded ? (
                            post.content.substring(0, POST_TRUNCATE_LENGTH) + '...'
                        ) : (
                            <Linkify componentDecorator={componentDecorator}>
                                {post.content}
                            </Linkify>
                        )}
                        {isTruncated && (
                            <button
                                onClick={() => onToggleExpansion(post.id)}
                                className="text-blue-600 dark:text-blue-400 hover:underline ml-1 font-semibold"
                            >
                                {isExpanded ? 'Show Less' : 'See More'}
                            </button>
                        )}
                    </p>
                )
            )}
            
            {/* --- Post Counts --- */}
            {((postReactions && Object.keys(postReactions).length > 0) || (post.commentsCount || 0) > 0) && (
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                    {formatReactionCount()}
                    <span className="cursor-pointer hover:underline font-medium" onClick={() => onViewComments(post)}>
                        {post.commentsCount || 0} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
                    </span>
                </div>
            )}

            {/* --- Post Actions (Conditional) --- */}
            {canReact ? (
                <div className="flex justify-around items-center pt-3 mt-4 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30">
                    {/* --- Like Button --- */}
                    <div
                        className="relative"
                        onMouseEnter={openReactionPicker}
                        onMouseLeave={closeReactionPicker}
                    >
                        <motion.button
                            whileTap={{ scale: 0.95 }}
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
                                <HandThumbUpIcon className="h-5 w-5" />
                            )}
                            <span className="font-semibold">{reactionLabel}</span>
                        </motion.button>

                        {/* --- Reaction Picker --- */}
                        <AnimatePresence>
                            {isReactionPickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full mb-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark p-2 flex space-x-1 z-50"
                                    onMouseEnter={openReactionPicker}
                                    onMouseLeave={closeReactionPicker}
                                >
                                    {reactionTypes.map((type) => (
                                        <motion.div
                                            key={type}
                                            whileTap={{ scale: 0.9 }}
                                            whileHover={{ scale: 1.2, y: -5 }}
                                            className="p-1 rounded-full group/reaction relative"
                                            onClick={() => handleReactionSelect(type)}
                                        >
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark transition-shadow duration-200 cursor-pointer shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark">
                                                <span className="text-2xl">{reactionIcons[type].component({}).props.children}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* --- Comment Button --- */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center space-x-2 py-2 px-4 rounded-full text-slate-600 dark:text-slate-400 transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                        onClick={() => onViewComments(post)}
                    >
                        <ChatBubbleLeftIcon className="h-5 w-5" />
                        <span className="font-semibold">Comment</span>
                    </motion.button>
                </div>
            ) : (
                // --- LOCKED BUTTONS ---
                <LockedButtonsPlaceholder />
            )}
        </motion.div>
    );
};

export default memo(StudentPostCard);