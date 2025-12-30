import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilIcon, TrashIcon, GlobeAltIcon, LockClosedIcon, BuildingLibraryIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftIcon, HandThumbUpIcon } from '@heroicons/react/24/outline';
import UserInitialsAvatar from '../common/UserInitialsAvatar'; 
import Linkify from 'react-linkify';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext'; 

// --- Design Helpers ---

const getThemeCardStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': 
            return { backgroundColor: 'rgba(15, 23, 66, 0.6)', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': 
            return { backgroundColor: 'rgba(60, 10, 20, 0.6)', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': 
            return { backgroundColor: 'rgba(30, 25, 10, 0.6)', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': 
            return { backgroundColor: 'rgba(20, 35, 20, 0.6)', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': 
            return { backgroundColor: 'rgba(35, 5, 45, 0.6)', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': 
            return { backgroundColor: 'rgba(50, 10, 20, 0.6)', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': 
            return { backgroundColor: 'rgba(5, 5, 10, 0.6)', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: 
            return {}; 
    }
};

// 3D "Pop" Emoji
const EmojiBase = ({ symbol, className = "" }) => (
    <span 
        className={`inline-block transform transition-transform duration-200 ${className}`} 
        style={{ 
            fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
            filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.15))'
        }}
    >
        {symbol}
    </span>
);

const reactionIcons = {
  like: { component: (props) => (<EmojiBase symbol="👍" {...props} />), label: 'Like', color: 'text-blue-600' },
  love: { component: (props) => (<EmojiBase symbol="❤️" {...props} />), label: 'Love', color: 'text-red-500' },
  haha: { component: (props) => (<EmojiBase symbol="😂" {...props} />), label: 'Haha', color: 'text-yellow-500' },
  wow: { component: (props) => (<EmojiBase symbol="😮" {...props} />), label: 'Wow', color: 'text-amber-500' },
  sad: { component: (props) => (<EmojiBase symbol="😢" {...props} />), label: 'Sad', color: 'text-blue-400' },
  angry: { component: (props) => (<EmojiBase symbol="😡" {...props} />), label: 'Angry', color: 'text-orange-600' },
  care: { component: (props) => (<EmojiBase symbol="🤗" {...props} />), label: 'Care', color: 'text-pink-500' },
};

const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'care'];
const POST_TRUNCATE_LENGTH = 300;

const componentDecorator = (href, text, key) => (
    <a 
        href={href} 
        key={key} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-bold transition-all underline decoration-blue-300/50 hover:decoration-blue-500"
        onClick={(e) => e.stopPropagation()}
    >
        {text}
    </a>
);

const LockedButtonsPlaceholder = () => (
    <div className="flex justify-around items-center pt-3 mt-3 border-t border-indigo-50/50 dark:border-white/5">
        <div className="flex items-center gap-2 py-1.5 px-4 rounded-full bg-slate-50/50 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-400 dark:text-slate-500">
            <LockClosedIcon className="h-3.5 w-3.5" />
            <span className="font-bold text-[10px] tracking-wider uppercase">Level 40 Required</span>
        </div>
    </div>
);

// --- Main Component ---

const StudentPostCard = ({
    post,
    author,
    userProfile,
    canReact,
    isEditing,
    editingPostText,
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

    // Theme Context
    const { activeOverlay } = useTheme();
    const dynamicThemeStyle = getThemeCardStyle(activeOverlay);
    const isStandardTheme = activeOverlay === 'none';

    const postReactions = post.reactions || {};
    const currentUserReaction = postReactions[userProfile.id];
    
    // ✅ CRASH FIX: Robustly determine ID and Name (Legacy Support)
    const postOwnerId = post.authorId || post.teacherId;
    const rawName = post.authorName || post.teacherName || 'Unknown Student';
    
    // Check if current user is the author
    const isAuthor = userProfile.id === postOwnerId;
    const isTruncated = post.content && post.content.length > POST_TRUNCATE_LENGTH;
    const commentCount = post.commentsCount || 0;

    // ✅ CRASH FIX: Handle name splitting safely
    const postAuthor = author || {
        id: postOwnerId,
        firstName: rawName.split(' ')[0] || 'Unknown',
        lastName: rawName.split(' ').slice(1).join(' ') || '',
        photoURL: post.authorPhotoURL || post.teacherPhoto // Legacy photo field support
    };

    const profileLink = isAuthor
        ? (userProfile.role === 'student' ? '/student/profile' : '/dashboard/profile')
        : (userProfile.role === 'student' ? `/student/profile/${postOwnerId}` : `/dashboard/profile/${postOwnerId}`);
    
    // --- Handlers ---
    const openReactionPicker = () => {
        clearTimeout(pickerTimerRef.current);
        setIsReactionPickerOpen(true);
    };

    const closeReactionPicker = () => {
        pickerTimerRef.current = setTimeout(() => {
            setIsReactionPickerOpen(false);
        }, 300);
    };

    const handleReactionSelect = (reactionType) => {
        onToggleReaction(post.id, reactionType);
        setIsReactionPickerOpen(false);
        clearTimeout(pickerTimerRef.current);
    };

    // --- Logic: Stacked Reactions ---
    const formatReactionCount = () => {
        if (!postReactions || Object.keys(postReactions).length === 0) return <div className="h-5"></div>; 

        const counts = {};
        Object.values(postReactions).forEach(type => {
            counts[type] = (counts[type] || 0) + 1;
        });

        const sortedReactionTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const topReactions = sortedReactionTypes.slice(0, 3);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        
        return (
            <div 
                className="flex items-center gap-2 cursor-pointer group/stats select-none py-1 px-2 rounded-full hover:bg-white/40 dark:hover:bg-white/5 transition-colors" 
                onClick={() => onViewReactions(post.id)}
            >
                <div className="flex -space-x-1.5">
                    {topReactions.map((type, index) => (
                        <div 
                            key={type} 
                            className="relative w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 ring-2 ring-white dark:ring-gray-800 shadow-sm z-10"
                            style={{ zIndex: 30 - index }}
                        >
                            <div className="text-[12px] transform scale-110">
                                {reactionIcons[type].component({})}
                            </div>
                        </div>
                    ))}
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover/stats:text-blue-600 dark:group-hover/stats:text-blue-400 transition-colors">
                    {total}
                </span>
            </div>
        );
    };

    const {
        component: ReactionButtonIcon,
        label: reactionLabel,
        color: reactionColor
    } = currentUserReaction && reactionIcons[currentUserReaction]
        ? reactionIcons[currentUserReaction]
        : { component: HandThumbUpIcon, label: 'Like', color: 'text-slate-500 dark:text-slate-400' };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
            style={dynamicThemeStyle} 
            className={`
                relative group mb-5
                backdrop-blur-2xl 
                rounded-[26px] 
                p-5 sm:p-6
                border border-white/60 dark:border-white/10 
                shadow-[0_15px_40px_-10px_rgba(59,130,246,0.1)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.6)]
                hover:shadow-[0_25px_60px_-15px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]
                transition-all duration-500 ease-out
                ${isStandardTheme 
                    ? 'bg-gradient-to-br from-white/95 via-indigo-50/30 to-blue-50/10 dark:from-gray-900/95 dark:via-indigo-900/20 dark:to-gray-900/40' 
                    : 'bg-white/40 dark:bg-[#1F2229]/40'
                }
            `}
        >
            {/* Header (Compact) */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Link to={profileLink} state={{ profileData: postAuthor }} className="relative block">
                        {/* Avatar Pop Effect */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-0 group-hover:opacity-100 blur transition duration-500"></div>
                        <div className="relative w-11 h-11 rounded-full p-0.5 bg-white dark:bg-gray-800">
                            <UserInitialsAvatar user={postAuthor} size="full" />
                        </div>
                    </Link>
                    
                    <div className="flex flex-col">
                        <Link to={profileLink} state={{ profileData: postAuthor }}>
                            <h3 className="font-bold text-[16px] text-slate-900 dark:text-white tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {postAuthor.firstName} {postAuthor.lastName}
                            </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            <span>{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Now'}</span>
                            <span className="w-0.5 h-0.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                            
                            {/* ✅ Updated Logic: Public = School Wide */}
                            {post.audience === 'Public' ? (
                                <div className="flex items-center gap-1" title="Visible to School">
                                    <BuildingLibraryIcon className="w-3 h-3 opacity-80" />
                                    <span>School</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1" title="Visible to friends">
                                    <LockClosedIcon className="w-3 h-3 opacity-80" />
                                    <span>Private</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {isAuthor && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <motion.button 
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.8)" }} whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} 
                            className="p-2 rounded-full bg-white/40 dark:bg-white/5 text-slate-500 hover:text-indigo-600 backdrop-blur-md shadow-sm transition-colors"
                        >
                            <PencilIcon className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button 
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.8)" }} whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} 
                            className="p-2 rounded-full bg-white/40 dark:bg-white/5 text-slate-500 hover:text-red-600 backdrop-blur-md shadow-sm transition-colors"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="px-1 mb-2">
                {isEditing ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/60 dark:bg-black/30 rounded-2xl p-2 ring-2 ring-indigo-500/20 dark:ring-indigo-500/40 backdrop-blur-sm"
                    >
                        <textarea
                            className="w-full p-4 border-none bg-transparent focus:ring-0 text-slate-800 dark:text-slate-100 text-[15px] resize-none leading-relaxed font-medium"
                            rows="4"
                            value={editingPostText}
                            onChange={(e) => onTextChange(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex justify-end gap-3 p-2">
                            <button className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                            <button className="px-5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5" onClick={(e) => { e.stopPropagation(); onSave(); }}>Save</button>
                        </div>
                    </motion.div>
                ) : (
                    post.content && (
                        <div className="text-[16px] leading-relaxed text-slate-700 dark:text-slate-200 font-normal tracking-wide mb-3">
                            {isTruncated && !isExpanded ? (
                                <div>
                                    <span>{post.content.substring(0, POST_TRUNCATE_LENGTH)}...</span>
                                    <button
                                        onClick={() => onToggleExpansion(post.id)}
                                        className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-sm"
                                    >
                                        Read more
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Linkify componentDecorator={componentDecorator}>
                                        {post.content}
                                    </Linkify>
                                    {isTruncated && (
                                        <button
                                            onClick={() => onToggleExpansion(post.id)}
                                            className="block mt-2 text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-sm"
                                        >
                                            Show Less
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )
                )}

                {/* Images */}
                {(post.images?.length > 0 || post.imageURL) && (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10">
                        {post.images && post.images.length > 1 ? (
                            <div className={`grid gap-0.5 ${
                                post.images.length === 2 ? 'grid-cols-2' :
                                post.images.length === 3 ? 'grid-cols-2' : 
                                post.images.length === 4 ? 'grid-cols-2' :
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
                                                <span className="text-white font-bold text-xl">+{post.images.length - 4}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="relative bg-slate-100 dark:bg-white/5">
                                <img 
                                    src={post.images ? post.images[0] : post.imageURL} 
                                    alt="Post attachment" 
                                    className="w-full max-h-[500px] object-contain cursor-pointer"
                                    onClick={() => window.open(post.images ? post.images[0] : post.imageURL, '_blank')}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="flex justify-between items-center mt-2 px-1">
                {formatReactionCount()}
                
                <div 
                    className="group/comments flex items-center gap-2 cursor-pointer py-1 px-3 rounded-full hover:bg-white/40 dark:hover:bg-white/5 transition-all"
                    onClick={() => onViewComments(post.id)}
                >
                    <span className={`text-xs font-bold transition-colors ${commentCount > 0 ? 'text-slate-600 dark:text-slate-300 group-hover/comments:text-indigo-600' : 'text-slate-400 dark:text-slate-500'}`}>
                        {commentCount > 0 ? `${commentCount} Comments` : 'View Comments'}
                    </span>
                </div>
            </div>

            {/* Action Deck */}
            {canReact ? (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-indigo-100/50 dark:border-white/5 relative">
                    
                    {/* Like Button */}
                    <div
                        className="relative"
                        onMouseEnter={openReactionPicker}
                        onMouseLeave={closeReactionPicker}
                    >
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className={`
                                group/btn w-full flex items-center justify-center gap-2.5 py-2 rounded-xl transition-all duration-300 font-bold text-sm
                                ${currentUserReaction 
                                    ? 'bg-indigo-50/80 dark:bg-indigo-900/30 ' + reactionColor 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-indigo-50/50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-300'
                                }
                            `}
                            onClick={() => onToggleReaction(post.id, 'like')}
                        >
                            {currentUserReaction ? (
                                <motion.div
                                    initial={{ scale: 0, rotate: -20 }} 
                                    animate={{ scale: 1, rotate: 0 }}
                                    className="text-lg filter drop-shadow-md"
                                >
                                    <ReactionButtonIcon />
                                </motion.div>
                            ) : (
                                <HandThumbUpIcon className="w-5 h-5 stroke-2 group-hover/btn:scale-110 transition-transform" />
                            )}
                            <span>{reactionLabel}</span>
                        </motion.button>

                        {/* Pop-up Reaction Dock */}
                        <AnimatePresence>
                            {isReactionPickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: -10, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                    className="absolute bottom-full left-0 right-0 mx-auto w-max mb-1 flex gap-2 p-2 bg-white/80 dark:bg-gray-900/90 backdrop-blur-2xl rounded-full shadow-2xl border border-white/50 dark:border-white/10 z-50 ring-1 ring-black/5"
                                    onMouseEnter={openReactionPicker}
                                    onMouseLeave={closeReactionPicker}
                                >
                                    {reactionTypes.map((type) => (
                                        <motion.button
                                            key={type}
                                            whileHover={{ scale: 1.35, y: -5 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleReactionSelect(type)}
                                            className="p-1 text-2xl cursor-pointer transition-transform hover:drop-shadow-xl"
                                        >
                                            {reactionIcons[type].component({})}
                                        </motion.button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Comment Button */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="
                            group/btn flex items-center justify-center gap-2.5 py-2 rounded-xl text-slate-500 dark:text-slate-400 
                            hover:bg-indigo-50/50 dark:hover:bg-white/5 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all duration-300 font-bold text-sm
                        "
                        onClick={() => onViewComments(post.id)}
                    >
                        <ChatBubbleLeftIcon className="w-5 h-5 stroke-2 group-hover/btn:scale-110 transition-transform" />
                        <span>Comment</span>
                    </motion.button>
                </div>
            ) : (
                <LockedButtonsPlaceholder />
            )}
        </motion.div>
    );
};

export default memo(StudentPostCard);