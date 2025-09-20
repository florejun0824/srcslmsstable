import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Pin, MessageCircle, ThumbsUp } from 'lucide-react';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar'; // Adjusted path for new structure

// DEV NOTE: This object is used for displaying reaction icons.
// For better code organization, it's recommended to move this to a shared file,
// e.g., 'src/utils/constants.js', and import it here and in other components that might need it.
const reactionIconsHomeView = {
  like: { component: (props) => (<span {...props}>👍</span>), label: 'Like', color: 'text-blue-500' },
  heart: { component: (props) => (<span {...props}>❤️</span>), label: 'Love', color: 'text-red-500' },
  haha: { component: (props) => (<span {...props}>😂</span>), label: 'Haha', color: 'text-yellow-500' },
  wow: { component: (props) => (<span {...props}>😮</span>), label: 'Wow', color: 'text-amber-500' },
  sad: { component: (props) => (<span {...props}>😢</span>), label: 'Sad', color: 'text-slate-500' },
  angry: { component: (props) => (<span {...props}>😡</span>), label: 'Angry', color: 'text-red-700' },
  care: { component: (props) => (<span {...props}>🤗</span>), label: 'Care', color: 'text-pink-500' },
};

const themedReactionIcons = {
  like: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-sky-300 to-blue-500 text-white shadow-lg shadow-sky-300/40 hover:scale-110 hover:shadow-sky-400/50 transition-all duration-200" {...props}>👍</span>, label: 'Like' },
  heart: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-rose-300 to-red-500 text-white shadow-lg shadow-rose-300/40 hover:scale-110 hover:shadow-rose-400/50 transition-all duration-200" {...props}>❤️</span>, label: 'Love' },
  haha: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-yellow-400 text-black shadow-lg shadow-amber-300/40 hover:scale-110 hover:shadow-amber-400/50 transition-all duration-200" {...props}>😂</span>, label: 'Haha' },
  wow: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-200 to-orange-400 text-black shadow-lg shadow-yellow-300/40 hover:scale-110 hover:shadow-yellow-400/50 transition-all duration-200" {...props}>😮</span>, label: 'Wow' },
  sad: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-sky-200 to-slate-400 text-white shadow-lg shadow-sky-300/40 hover:scale-110 hover:shadow-sky-400/50 transition-all duration-200" {...props}>😢</span>, label: 'Sad' },
  angry: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-400/40 hover:scale-110 hover:shadow-rose-500/50 transition-all duration-200" {...props}>😡</span>, label: 'Angry' },
  care: { component: (props) => <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-300 to-pink-500 text-white shadow-lg shadow-fuchsia-300/40 hover:scale-110 hover:shadow-fuchsia-400/50 transition-all duration-200" {...props}>🤗</span>, label: 'Care' },
};

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300;

const AnnouncementCard = ({
    post,
    userProfile,
    authorProfile,
    postReactions,
    usersMap, // Needed for reaction count display
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
        : { component: ThumbsUp, label: 'Like', color: 'text-slate-600' };

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
                                className={`relative w-6 h-6 flex items-center justify-center rounded-full bg-white ring-2 ring-white ${index > 0 ? '-ml-2' : ''}`}
                                style={{ zIndex: 3 - index }}
                            >
                                <Icon className="text-xl" />
                            </div>
                        );
                    })}
                </div>
                <span className="text-sm text-slate-600 font-medium ml-2 hover:underline">{totalReactions}</span>
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
            // MODIFIED: Applied a gradient background and colored shadow to match the new theme.
            className={`bg-gradient-to-br from-white/70 to-violet-100/50 backdrop-blur-lg rounded-3xl shadow-xl shadow-violet-300/20 p-6 relative group transform transition-all duration-300 hover:shadow-2xl hover:shadow-violet-300/30 hover:-translate-y-2 hover:scale-[1.01] border ${post.isPinned ? 'border-violet-300 ring-2 ring-violet-200/50' : 'border-white/70'}`}
        >
            {post.isPinned && (
                <div className="absolute top-4 left-4 flex items-center gap-2 text-violet-700 bg-violet-100 px-3 py-1 rounded-full text-xs font-semibold z-10">
                    <Pin className="w-3 h-3" />
                    <span>Pinned</span>
                </div>
            )}
            <div className={`flex items-start mb-4 ${post.isPinned ? 'pt-8' : ''}`}>
                <div className="w-10 h-10 flex-shrink-0">
                    <UserInitialsAvatar user={authorProfile} size="w-10 h-10" />
                </div>
                <div className="ml-3">
                    <p className="font-bold text-slate-800">{post.teacherName}</p>
                    <p className="text-xs text-slate-500">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : ''}</p>
                </div>
                {canModify && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/50 backdrop-blur-sm rounded-full p-1">
                         {userProfile?.role === 'admin' && (
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onTogglePin(post.id, post.isPinned); }} className={`p-2 rounded-full hover:bg-gray-100 transition ${post.isPinned ? 'text-violet-500' : 'text-slate-500'}`} title={post.isPinned ? "Unpin Announcement" : "Pin Announcement"}>
                                <Pin className="w-5 h-5" />
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Edit Announcement">
                            <Pencil className="w-5 h-5 text-slate-500" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} className="p-2 rounded-full hover:bg-gray-100 transition" title="Delete Announcement">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </motion.button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <>
                    <textarea
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-slate-50 text-slate-800 resize-none mb-4"
                        rows="5"
                        value={editingText}
                        onChange={(e) => onTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end gap-2">
                        <button className="px-4 py-2 rounded-full font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                        <button className="px-4 py-2 rounded-full font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all duration-300 shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/20" onClick={(e) => { e.stopPropagation(); onSave(); }}>Save</button>
                    </div>
                </>
            ) : (
                post.content && (
                    <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
                        {isTruncated && !isExpanded
                            ? post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...'
                            : post.content}
                        {isTruncated && (
                            <button
                                onClick={() => onToggleExpansion(post.id)}
                                className="text-sky-600 hover:underline ml-1 font-semibold"
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
                        className="rounded-xl max-h-96 w-full object-contain bg-slate-100"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    {post.caption && (
                        <p className="text-sm text-slate-600 mt-2 text-center italic">{post.caption}</p>
                    )}
                </div>
            )}

            {((postReactions && Object.keys(postReactions).length > 0) || (post.commentsCount || 0) > 0) && (
                <div className="flex justify-between items-center text-sm text-slate-500 mt-4">
                    {formatReactionCount()}
                    <span className="cursor-pointer hover:underline font-medium" onClick={() => onViewComments(post)}>
                        View Comments
                    </span>
                </div>
            )}

            <div className="flex justify-around items-center pt-3 mt-4 border-t border-slate-200/80">
                <div
                    className="relative"
                    onMouseEnter={handleReactionOptionsMouseEnter}
                    onMouseLeave={handleReactionOptionsMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                >
                    <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors duration-200 w-full justify-center ${currentUserReaction ? reactionColor : 'text-slate-600'} hover:bg-slate-100/80`}
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
                                // MODIFIED: Updated reaction picker to match the card's glassmorphism style.
                                className="absolute bottom-full mb-2 bg-white/60 backdrop-blur-md rounded-full shadow-xl p-2 flex space-x-1 z-50 border border-white/70"
                                onMouseEnter={handleReactionOptionsMouseEnter} // Keep open when mouse moves to options
                                onMouseLeave={handleReactionOptionsMouseLeave}
                            >
                                {Object.entries(themedReactionIcons).map(([type, { component: IconComponent, label }]) => (
                                    <motion.button
                                        key={type}
                                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                                        whileHover={{ scale: 1.3, y: -8 }}
                                        whileTap={{ scale: 0.9 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                        className="p-1 rounded-full group/reaction relative"
                                        onClick={() => handleReactionOptionClick(type)}
                                    >
                                        <IconComponent className="text-4xl" />
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-semibold px-2 py-1 rounded-md opacity-0 group-hover/reaction:opacity-100 transition-opacity whitespace-nowrap">
                                            {label}
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center space-x-2 py-2 px-4 rounded-full text-slate-600 hover:bg-slate-100 transition-colors duration-200"
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