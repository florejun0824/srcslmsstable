// src/components/teacher/dashboard/components/AnnouncementCard.jsx
import React, { useState, useRef, memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Pin, MessageCircle, ThumbsUp } from 'lucide-react';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar';
import Linkify from 'react-linkify'; 
import { useTheme } from '../../../../../contexts/ThemeContext'; // 1. Import Theme Context

// --- Reaction Constants ---
const reactionIconsHomeView = {
  like: { component: (props) => (<span {...props}>👍</span>), label: 'Like', color: 'text-blue-600 dark:text-blue-400' },
  heart: { component: (props) => (<span {...props}>❤️</span>), label: 'Love', color: 'text-red-600 dark:text-red-400' },
  haha: { component: (props) => (<span {...props}>😂</span>), label: 'Haha', color: 'text-yellow-600 dark:text-yellow-400' },
  wow: { component: (props) => (<span {...props}>😮</span>), label: 'Wow', color: 'text-amber-600 dark:text-amber-400' },
  sad: { component: (props) => (<span {...props}>😢</span>), label: 'Sad', color: 'text-slate-600 dark:text-slate-400' },
  angry: { component: (props) => (<span {...props}>😡</span>), label: 'Angry', color: 'text-red-700 dark:text-red-500' },
  care: { component: (props) => (<span {...props}>🤗</span>), label: 'Care', color: 'text-pink-600 dark:text-pink-400' },
};

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

// --- HELPER: MONET CARD STYLES ---
const getMonetCardStyle = (activeOverlay) => {
    if (!activeOverlay) return null;

    // Base glass style for all monet themes (Forces dark mode aesthetic for contrast against backgrounds)
    const base = {
        card: "backdrop-blur-xl shadow-lg border text-white",
        textTitle: "text-white",
        textMeta: "text-white/60",
        textBody: "text-slate-100",
        divider: "border-white/10",
        button: "bg-white/10 hover:bg-white/20 text-white",
        pinned: "bg-white/20 border-white/20 text-white",
        input: "bg-black/30 border-white/10 text-white placeholder:text-white/40",
    };

    switch (activeOverlay) {
        case 'christmas':
            return { ...base, card: `${base.card} bg-[#0f172a]/80 border-emerald-500/30 shadow-emerald-900/10` };
        case 'valentines':
            return { ...base, card: `${base.card} bg-[#2c0b0e]/80 border-rose-500/30 shadow-rose-900/10` };
        case 'graduation':
            return { ...base, card: `${base.card} bg-[#1a1400]/80 border-amber-500/30 shadow-amber-900/10` };
        case 'rainy':
            return { ...base, card: `${base.card} bg-[#061816]/80 border-teal-500/30 shadow-teal-900/10` };
        case 'cyberpunk':
            return { ...base, card: `${base.card} bg-[#180a20]/80 border-fuchsia-500/30 shadow-fuchsia-900/10` };
        case 'spring':
            return { ...base, card: `${base.card} bg-[#1f0f15]/80 border-pink-500/30 shadow-pink-900/10` };
        case 'space':
            return { ...base, card: `${base.card} bg-[#020617]/80 border-indigo-500/30 shadow-indigo-900/10` };
        default:
            return null;
    }
};

const AnnouncementCard = forwardRef(({
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
}, ref) => {
    const [isReactionOptionsVisible, setReactionOptionsVisible] = useState(false);
    const hoverTimeoutRef = useRef(null);
    const longPressTimerRef = useRef(null);

    // Theme Context
    const { activeOverlay } = useTheme();
    const monet = getMonetCardStyle(activeOverlay);

    const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
    const currentUserReaction = postReactions[userProfile?.id];
    const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;

    const {
        component: ReactionButtonIcon,
        label: reactionLabel,
        color: reactionColor
    } = currentUserReaction && reactionIconsHomeView[currentUserReaction]
        ? reactionIconsHomeView[currentUserReaction]
        : { component: ThumbsUp, label: 'Like', color: monet ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400' };

    // Handlers
    const handleReactionOptionsMouseEnter = () => { clearTimeout(hoverTimeoutRef.current); setReactionOptionsVisible(true); };
    const handleReactionOptionsMouseLeave = () => { hoverTimeoutRef.current = setTimeout(() => { setReactionOptionsVisible(false); }, 300); };
    const handleTouchStart = () => { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = setTimeout(() => { setReactionOptionsVisible(true); }, 500); };
    const handleTouchEnd = () => { clearTimeout(longPressTimerRef.current); setTimeout(() => setReactionOptionsVisible(false), 2000); };
    const handleTouchMove = () => { clearTimeout(longPressTimerRef.current); };
    const handleReactionOptionClick = (reactionType) => { onToggleReaction(post.id, reactionType); setReactionOptionsVisible(false); };

    // Custom Link Decorator (Dynamic Color)
    const componentDecorator = (href, text, key) => (
        <a 
            href={href} 
            key={key} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${monet ? 'text-blue-300 hover:text-white' : 'text-blue-600 dark:text-blue-400'} hover:underline font-bold transition-colors`}
            onClick={(e) => e.stopPropagation()} 
        >
            {text}
        </a>
    );

    // Reaction Count UI
    const formatReactionCount = () => {
        const totalReactions = Object.keys(postReactions).length;
        if (totalReactions === 0) return null;
        return (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.stopPropagation(); onViewReactions(postReactions, usersMap); }}>
                <div className="flex items-center -space-x-2">
                    {Object.values(postReactions).slice(0, 3).map((reactionType, index) => {
                        const reaction = reactionIconsHomeView[reactionType];
                        if (!reaction) return null;
                        const { component: Icon } = reaction;
                        return (
                            <div key={index} className={`relative w-6 h-6 flex items-center justify-center rounded-full ring-2 z-10 ${monet ? 'bg-slate-800 ring-slate-700' : 'bg-slate-50 dark:bg-slate-800 ring-white dark:ring-slate-900'}`}>
                                <Icon className="text-sm" />
                            </div>
                        );
                    })}
                </div>
                <span className={`text-xs font-bold transition-colors ${monet ? 'text-slate-300 group-hover:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                    {totalReactions}
                </span>
            </div>
        );
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`rounded-[32px] p-6 relative group transition-shadow duration-200 font-sans 
                ${monet ? monet.card : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'}`}
        >
            {post.isPinned && (
                <div className={`absolute top-6 left-6 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold z-10 border 
                    ${monet ? monet.pinned : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'}`}>
                    <Pin className="w-3 h-3" strokeWidth={2.5} />
                    <span>Pinned</span>
                </div>
            )}
            
            <div className={`flex items-start mb-4 ${post.isPinned ? 'pt-10' : ''}`}>
                <div className={`w-12 h-12 flex-shrink-0 rounded-2xl shadow-sm overflow-hidden border 
                    ${monet ? 'bg-white/10 border-white/10' : 'bg-slate-100 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                    <UserInitialsAvatar user={authorProfile} size="full" className="w-full h-full text-xs font-bold" />
                </div>
                <div className="ml-4 flex-1">
                    <h3 className={`font-bold text-base ${monet ? monet.textTitle : 'text-slate-900 dark:text-slate-100'}`}>{post.teacherName}</h3>
                    <p className={`text-xs font-medium mt-0.5 ${monet ? monet.textMeta : 'text-slate-500 dark:text-slate-400'}`}>
                        {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </p>
                </div>
                
                {/* Action Buttons (Edit/Delete) */}
                {canModify && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {userProfile?.role === 'admin' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onTogglePin(post.id, post.isPinned); }} 
                                className={`p-2 rounded-full transition-colors ${post.isPinned ? 'bg-blue-100 text-blue-600' : (monet ? monet.button : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400')}`}
                            >
                                <Pin className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} 
                            className={`p-2 rounded-full transition-colors ${monet ? monet.button : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} 
                            className={`p-2 rounded-full transition-colors ${monet ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'}`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="pl-0 md:pl-16">
                {isEditing ? (
                    <div className={`p-4 rounded-3xl border mb-4 ${monet ? 'bg-black/20 border-white/10' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                        <textarea
                            className={`w-full bg-transparent resize-none mb-3 focus:outline-none text-sm font-medium leading-relaxed ${monet ? 'text-white placeholder:text-white/40' : 'text-slate-900 dark:text-slate-100'}`}
                            rows="4"
                            value={editingText}
                            onChange={(e) => onTextChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Edit your announcement..."
                        />
                        <div className="flex justify-end gap-3">
                            <button 
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${monet ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                                onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all" 
                                onClick={(e) => { e.stopPropagation(); onSave(); }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <div className={`text-sm leading-7 whitespace-pre-wrap break-words ${monet ? monet.textBody : 'text-slate-800 dark:text-slate-200'}`}>
                            {isTruncated && !isExpanded ? (
                                <>
                                    <Linkify componentDecorator={componentDecorator}>
                                        {post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH)}
                                    </Linkify>
                                    <span className={monet ? 'text-slate-400' : 'text-slate-400'}>...</span>
                                </>
                            ) : (
                                <Linkify componentDecorator={componentDecorator}>
                                    {post.content}
                                </Linkify>
                            )}
                            {isTruncated && (
                                <button onClick={() => onToggleExpansion(post.id)} className={`block mt-2 hover:underline font-bold text-xs ${monet ? 'text-blue-300' : 'text-blue-600 dark:text-blue-400'}`}>
                                    {isExpanded ? 'Show Less' : 'Read More'}
                                </button>
                            )}
                        </div>
                    )
                )}
                
                {post.photoURL && !isEditing && (
                    <div className={`mt-4 rounded-3xl overflow-hidden shadow-sm border ${monet ? 'border-white/10' : 'border-slate-100 dark:border-slate-800'}`}>
                        <img 
                            loading="lazy"
                            src={post.photoURL} 
                            alt="Announcement" 
                            className={`w-full max-h-[400px] object-cover ${monet ? 'bg-black/20' : 'bg-slate-50 dark:bg-slate-900'}`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {post.caption && (
                            <div className={`px-4 py-2 border-t ${monet ? 'bg-black/20 border-white/10' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`}>
                                <p className={`text-xs font-medium italic ${monet ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{post.caption}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Engagement Stats */}
                <div className={`flex justify-between items-center mt-6 pt-4 border-t ${monet ? monet.divider : 'border-slate-100 dark:border-slate-800'}`}>
                    {formatReactionCount() || <div />} {/* Spacer if empty */}
                    <button 
                        className={`text-xs font-bold transition-colors ${monet ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'}`}
                        onClick={() => onViewComments(post)}
                    >
                        {post.commentsCount > 0 ? `${post.commentsCount} Comments` : '0 Comments'}
                    </button>
                </div>

                {/* Reaction Actions (Solid Buttons) */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div
                        className="relative"
                        onMouseEnter={handleReactionOptionsMouseEnter}
                        onMouseLeave={handleReactionOptionsMouseLeave}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                    >
                        <button
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl w-full transition-all duration-200 ${
                                currentUserReaction 
                                    ? (monet ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300') 
                                    : (monet ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700')
                            }`}
                            onClick={() => onToggleReaction(post.id, 'like')}
                        >
                            {currentUserReaction ? (
                                <>
                                    <ReactionButtonIcon className="text-lg" />
                                    <span className={`text-xs font-bold ${monet ? 'text-white' : reactionColor}`}>{reactionLabel}</span>
                                </>
                            ) : (
                                <>
                                    <ThumbsUp className="h-4 w-4" />
                                    <span className="text-xs font-bold">Like</span>
                                </>
                            )}
                        </button>

                        {/* Floating Reaction Bar */}
                        <AnimatePresence>
                            {isReactionOptionsVisible && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute bottom-full mb-2 left-0 rounded-full shadow-xl border p-2 flex gap-1 z-50 
                                        ${monet ? 'bg-[#1e1e1e] border-white/10' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                                    onMouseEnter={handleReactionOptionsMouseEnter}
                                    onMouseLeave={handleReactionOptionsMouseLeave}
                                >
                                    {Object.entries(themedReactionIcons).map(([type, { emoji }]) => (
                                        <div
                                            key={type}
                                            className={`w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110 
                                                ${monet ? 'hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                            onClick={() => handleReactionOptionClick(type)}
                                        >
                                            <span className="text-xl leading-none">{emoji}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-200 w-full 
                            ${monet ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        onClick={() => onViewComments(post)}
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs font-bold">Comment</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
});

export default memo(AnnouncementCard);