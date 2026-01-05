// src/components/teacher/dashboard/views/components/AnnouncementCard.jsx
import React, { useState, useRef, memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Pin, MessageCircle, ThumbsUp } from 'lucide-react';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar';
import Linkify from 'react-linkify'; 
import { useTheme } from '../../../../../contexts/ThemeContext';

// --- 1. CONFIGURATION: STATIC & ANIMATED PATHS ---
const reactionIconsHomeView = {
  like: { 
      static: '/emojis/like.png',
      animated: '/emojis/like.gif',
      label: 'Like', 
      color: 'text-blue-600',
      animation: { 
          rotate: [0, -15, 0, -15, 0], 
          scale: [1, 1.2, 1, 1.2, 1],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } 
      }
  },
  heart: { 
      static: '/emojis/love.png',
      animated: '/emojis/love.gif',
      label: 'Love', 
      color: 'text-red-600',
      animation: { 
          scale: [1, 1.2, 1], 
          transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 } 
      }
  },
  haha: { 
      static: '/emojis/haha.png',
      animated: '/emojis/haha.gif',
      label: 'Haha', 
      color: 'text-yellow-500',
      animation: { 
          rotate: [0, -5, 5, -5, 5, 0],
          y: [0, -3, 3, -3, 0],
          transition: { duration: 0.6, repeat: Infinity, ease: "linear" } 
      }
  },
  wow: { 
      static: '/emojis/wow.png',
      animated: '/emojis/wow.gif',
      label: 'Wow', 
      color: 'text-amber-500',
      animation: { 
          scale: [1, 1.1, 1],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } 
      }
  },
  sad: { 
      static: '/emojis/sad.png',
      animated: '/emojis/sad.gif',
      label: 'Sad', 
      color: 'text-blue-400',
      animation: { 
          y: [0, 2, -2, 0],
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } 
      }
  },
  angry: { 
      static: '/emojis/angry.png',
      animated: '/emojis/angry.gif',
      label: 'Angry', 
      color: 'text-red-700',
      animation: { 
          x: [0, 1, -1, 1, -1, 0], 
          transition: { duration: 0.2, repeat: Infinity, ease: "linear" } 
      }
  },
  care: { 
      static: '/emojis/care.png',
      animated: '/emojis/care.gif',
      label: 'Care', 
      color: 'text-pink-500',
      animation: { 
          scale: [1, 1.1, 1],
          transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } 
      }
  },
};

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300;

// --- HELPER: MONET CARD STYLES ---
const getMonetCardStyle = (activeOverlay) => {
    if (!activeOverlay) return null;

    // Base glass style
    const base = {
        card: "backdrop-blur-3xl shadow-xl border border-white/20 text-white",
        textTitle: "text-white",
        textMeta: "text-white/70",
        textBody: "text-white/90",
        divider: "border-white/10",
        button: "bg-white/10 hover:bg-white/20 text-white border border-white/5",
        pinned: "bg-white/20 border-white/20 text-white backdrop-blur-md",
        input: "bg-black/20 text-white placeholder:text-white/50 border-white/10",
        image: "bg-black/20 border-white/10"
    };

    switch (activeOverlay) {
        case 'christmas': return { ...base, card: `${base.card} bg-slate-900/60 border-emerald-500/20 shadow-emerald-900/20` };
        case 'valentines': return { ...base, card: `${base.card} bg-[#2c0b0e]/70 border-rose-500/20 shadow-rose-900/20` };
        case 'graduation': return { ...base, card: `${base.card} bg-[#1a1400]/70 border-amber-500/20 shadow-amber-900/20` };
        case 'rainy': return { ...base, card: `${base.card} bg-[#061816]/70 border-teal-500/20 shadow-teal-900/20` };
        case 'cyberpunk': return { ...base, card: `${base.card} bg-[#180a20]/70 border-fuchsia-500/20 shadow-fuchsia-900/20` };
        case 'spring': return { ...base, card: `${base.card} bg-[#1f0f15]/70 border-pink-500/20 shadow-pink-900/20` };
        case 'space': return { ...base, card: `${base.card} bg-[#020617]/70 border-indigo-500/20 shadow-indigo-900/20` };
        default: return null;
    }
};

const AnnouncementCard = forwardRef(({
    post,
    userProfile,
    authorProfile,
    postReactions = {},
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
    const [hoveredReaction, setHoveredReaction] = useState(null);
    const [isHoveringCount, setIsHoveringCount] = useState(false);
    const hoverTimeoutRef = useRef(null);
    const longPressTimerRef = useRef(null);

    const { activeOverlay } = useTheme();
    const monet = getMonetCardStyle(activeOverlay);

    const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
    const currentUserReaction = postReactions[userProfile?.id];
    const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;

    const currentReactionConfig = currentUserReaction ? reactionIconsHomeView[currentUserReaction] : null;
    const reactionLabel = currentReactionConfig ? currentReactionConfig.label : 'Like';
    const reactionColor = currentReactionConfig ? currentReactionConfig.color : (monet ? 'text-slate-300' : 'text-slate-500');

    // Handlers
    const handleReactionOptionsMouseEnter = () => { clearTimeout(hoverTimeoutRef.current); setReactionOptionsVisible(true); };
    const handleReactionOptionsMouseLeave = () => { hoverTimeoutRef.current = setTimeout(() => { setReactionOptionsVisible(false); }, 300); };
    const handleTouchStart = () => { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = setTimeout(() => { setReactionOptionsVisible(true); }, 500); };
    const handleTouchEnd = () => { clearTimeout(longPressTimerRef.current); setTimeout(() => setReactionOptionsVisible(false), 2000); };
    const handleTouchMove = () => { clearTimeout(longPressTimerRef.current); };
    
    const handleReactionOptionClick = (reactionType) => { 
        onToggleReaction(post.id, reactionType); 
        setReactionOptionsVisible(false); 
        setHoveredReaction(null);
    };

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

    // --- REACTION GROUPING LOGIC ---
    const formatReactionCount = () => {
        const reactionsValues = Object.values(postReactions);
        const totalReactions = reactionsValues.length;
        
        if (totalReactions === 0) return null;

        const counts = {};
        reactionsValues.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
        const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        const isUniform = sortedTypes.length === 1; 
        
        // MIXED
        if (!isUniform) {
            const typesToShow = sortedTypes.slice(0, 3);
            return (
                <div 
                    className="flex items-center gap-2 cursor-pointer group select-none" 
                    onClick={(e) => { e.stopPropagation(); onViewReactions(postReactions, usersMap); }}
                    onMouseEnter={() => setIsHoveringCount(true)}
                    onMouseLeave={() => setIsHoveringCount(false)}
                >
                    <div className="flex items-center -space-x-2.5">
                        {typesToShow.map((type, index) => {
                            const conf = reactionIconsHomeView[type];
                            if (!conf) return null;
                            const zIndex = 30 - index;
                            return (
                                <div key={type} style={{ zIndex }} className={`
                                    relative w-6 h-6 flex items-center justify-center rounded-full ring-[2px] shadow-sm overflow-hidden transition-transform
                                    ${monet ? 'bg-slate-800 ring-slate-700' : 'bg-white dark:bg-slate-800 ring-white dark:ring-slate-900'}
                                `}>
                                    <img 
                                        src={isHoveringCount ? conf.animated : conf.static} 
                                        alt={conf.label}
                                        className="w-full h-full object-contain p-0.5" 
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <span className={`text-xs font-bold transition-colors ml-0.5 ${monet ? 'text-slate-300 group-hover:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                        {totalReactions}
                    </span>
                </div>
            );
        }

        // UNIFORM
        const singleType = sortedTypes[0];
        const conf = reactionIconsHomeView[singleType];
        
        return (
            <div 
                className="flex items-center gap-2 cursor-pointer group select-none" 
                onClick={(e) => { e.stopPropagation(); onViewReactions(postReactions, usersMap); }}
                onMouseEnter={() => setIsHoveringCount(true)}
                onMouseLeave={() => setIsHoveringCount(false)}
            >
                <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center shadow-sm
                    ${monet ? 'bg-white/10' : 'bg-blue-50 dark:bg-slate-800'}
                `}>
                    {conf ? (
                        <img 
                            src={isHoveringCount ? conf.animated : conf.static} 
                            alt={conf.label} 
                            className="w-5 h-5 object-contain" 
                        />
                    ) : (
                        <ThumbsUp className="w-4 h-4" />
                    )}
                </div>
                <span className={`text-xs font-bold ${conf?.color || (monet ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400')}`}>
                    {totalReactions}
                </span>
            </div>
        );
    };

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className={`rounded-[2.5rem] p-7 relative group transition-all duration-300 font-sans backdrop-blur-3xl
                ${monet ? monet.card : 'bg-white/80 dark:bg-[#121212]/80 border border-white/50 dark:border-white/5 shadow-xl hover:shadow-2xl'}`}
        >
            {/* PINNED BADGE */}
            {post.isPinned && (
                <div className={`absolute top-7 left-7 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold z-10 border shadow-sm
                    ${monet ? monet.pinned : 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-500/20 backdrop-blur-md'}`}>
                    <Pin className="w-3 h-3" strokeWidth={3} />
                    <span>PINNED</span>
                </div>
            )}
            
            {/* HEADER */}
            <div className={`flex items-center mb-5 ${post.isPinned ? 'pt-10' : ''}`}>
                {/* ONE UI: Squircle Avatar Container */}
                <div className={`w-[3.25rem] h-[3.25rem] flex-shrink-0 rounded-[1.4rem] shadow-sm overflow-hidden border 
                    ${monet ? 'bg-white/10 border-white/10' : 'bg-slate-100 dark:bg-slate-800 border-slate-100 dark:border-white/5'}`}>
                    <UserInitialsAvatar user={authorProfile} size="full" className="w-full h-full text-sm font-bold" />
                </div>
                
                <div className="ml-4 flex-1 min-w-0">
                    <h3 className={`font-bold text-[1.05rem] tracking-tight truncate ${monet ? monet.textTitle : 'text-slate-900 dark:text-slate-100'}`}>
                        {post.teacherName}
                    </h3>
                    <p className={`text-xs font-semibold mt-0.5 tracking-wide uppercase ${monet ? monet.textMeta : 'text-slate-400 dark:text-slate-500'}`}>
                        {post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : ''}
                    </p>
                </div>
                
                {/* HEADER ACTIONS (Floating Bubbles) */}
                {canModify && (
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         {userProfile?.role === 'admin' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onTogglePin(post.id, post.isPinned); }} 
                                className={`p-2.5 rounded-[1rem] transition-all active:scale-90 ${post.isPinned 
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                    : (monet ? monet.button : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10')}`}
                            >
                                <Pin className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} 
                            className={`p-2.5 rounded-[1rem] transition-all active:scale-90 ${monet ? monet.button : 'bg-slate-100/50 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} 
                            className={`p-2.5 rounded-[1rem] transition-all active:scale-90 ${monet ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-50/50 text-red-500 hover:bg-red-50 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20'}`}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* CONTENT */}
            <div className="pl-1">
                {isEditing ? (
                    <div className={`p-5 rounded-[1.8rem] border mb-4 shadow-inner ${monet ? monet.input : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10'}`}>
                        <textarea
                            className={`w-full bg-transparent resize-none mb-2 focus:outline-none text-[0.95rem] font-medium leading-relaxed custom-scrollbar ${monet ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}
                            rows="4"
                            value={editingText}
                            onChange={(e) => onTextChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="What's on your mind?"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-2">
                            <button 
                                className={`px-5 py-2.5 rounded-[1rem] text-xs font-bold transition-colors ${monet ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-white/10'}`}
                                onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-6 py-2.5 rounded-[1rem] text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/30 transition-all" 
                                onClick={(e) => { e.stopPropagation(); onSave(); }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                ) : (
                    post.content && (
                        <div className={`text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words tracking-wide ${monet ? monet.textBody : 'text-slate-700 dark:text-slate-200'}`}>
                            {isTruncated && !isExpanded ? (
                                <>
                                    <Linkify componentDecorator={componentDecorator}>
                                        {post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH)}
                                    </Linkify>
                                    <span className="opacity-60">...</span>
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
                
                {/* PHOTO ATTACHMENT */}
                {post.photoURL && !isEditing && (
                    <div className={`mt-5 rounded-[2rem] overflow-hidden shadow-sm border ${monet ? monet.image : 'border-slate-100 dark:border-white/5'}`}>
                        <img 
                            loading="lazy"
                            src={post.photoURL} 
                            alt="Announcement" 
                            className={`w-full max-h-[450px] object-cover hover:scale-[1.01] transition-transform duration-500 ${monet ? '' : 'bg-slate-50 dark:bg-slate-900'}`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {post.caption && (
                            <div className={`px-5 py-3 border-t backdrop-blur-md ${monet ? 'bg-black/30 border-white/10' : 'bg-white/80 dark:bg-black/40 border-slate-100 dark:border-white/5'}`}>
                                <p className={`text-xs font-medium italic ${monet ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>{post.caption}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* STATS BAR */}
                <div className={`flex justify-between items-center mt-6 pt-4 border-t ${monet ? monet.divider : 'border-slate-100 dark:border-white/5'}`}>
                    {formatReactionCount() || <div />} 
                    <button 
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${monet ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-blue-400'}`}
                        onClick={() => onViewComments(post)}
                    >
                        {post.commentsCount > 0 ? `${post.commentsCount} comments` : '0 comments'}
                    </button>
                </div>

                {/* ACTION BUTTONS (One UI 8.5 Style) */}
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
                            className={`flex items-center justify-center gap-2.5 py-3 rounded-[1.2rem] w-full transition-all duration-200 active:scale-95 ${
                                currentUserReaction 
                                    ? (monet ? 'bg-white/20 text-white shadow-inner' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300') 
                                    : (monet ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10')
                            }`}
                            onClick={() => onToggleReaction(post.id, 'like')}
                        >
                            {currentUserReaction ? (
                                <>
                                    {currentReactionConfig && (
                                        <img 
                                            src={isReactionOptionsVisible ? currentReactionConfig.animated : currentReactionConfig.static} 
                                            alt={currentReactionConfig.label} 
                                            className="w-5 h-5 object-contain" 
                                        />
                                    )}
                                    <span className={`text-[13px] font-bold capitalize ${monet ? 'text-white' : reactionColor}`}>{reactionLabel}</span>
                                </>
                            ) : (
                                <>
                                    <ThumbsUp className="h-[18px] w-[18px]" />
                                    <span className="text-[13px] font-bold">Like</span>
                                </>
                            )}
                        </button>

                        {/* --- GLASS DOCK --- */}
                        <AnimatePresence>
                            {isReactionOptionsVisible && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 15, scale: 0.8 }}
                                    transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
                                    className={`absolute bottom-full mb-3 left-0 rounded-[2rem] px-2.5 py-2 flex gap-1.5 z-50 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                                        ${monet ? 'bg-black/60 border border-white/20' : 'bg-white/90 dark:bg-[#1E1E1E]/90 border border-white/20 dark:border-white/10'}`}
                                    onMouseEnter={handleReactionOptionsMouseEnter}
                                    onMouseLeave={handleReactionOptionsMouseLeave}
                                >
                                    {Object.entries(reactionIconsHomeView).map(([type, config], index) => (
                                        <motion.div
                                            key={type}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.04 }} 
                                            className="relative group"
                                        >
                                            <motion.div
                                                className={`w-10 h-10 flex items-center justify-center rounded-full cursor-pointer origin-bottom transition-all relative
                                                    ${hoveredReaction === type ? 'z-50' : 'z-10'}`}
                                                whileHover={{ scale: 1.45, y: -8 }} 
                                                animate={hoveredReaction === type ? config.animation : {}} 
                                                onHoverStart={() => setHoveredReaction(type)}
                                                onHoverEnd={() => setHoveredReaction(null)}
                                                onClick={() => handleReactionOptionClick(type)}
                                            >
                                                <img 
                                                    src={hoveredReaction === type ? config.animated : config.static} 
                                                    alt={config.label}
                                                    className="w-full h-full object-contain filter drop-shadow-md" 
                                                />
                                            </motion.div>
                                            
                                            {/* Minimal Tooltip */}
                                            {hoveredReaction === type && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 0 }}
                                                    animate={{ opacity: 1, y: -24 }}
                                                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-2.5 py-1 text-[10px] font-bold rounded-full whitespace-nowrap pointer-events-none bg-black text-white shadow-lg z-50"
                                                >
                                                    {config.label}
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        className={`flex items-center justify-center gap-2.5 py-3 rounded-[1.2rem] w-full transition-all duration-200 active:scale-95 
                            ${monet ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                        onClick={() => onViewComments(post)}
                    >
                        <MessageCircle className="h-[18px] w-[18px]" />
                        <span className="text-[13px] font-bold">Comment</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
});

export default memo(AnnouncementCard);