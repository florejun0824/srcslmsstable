import React, { useState, useRef, memo, forwardRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Pencil, Trash2, Pin, MessageCircle, ThumbsUp, Maximize2 } from 'lucide-react';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar';
import Linkify from 'react-linkify'; 
import { useTheme } from '../../../../../contexts/ThemeContext';

// --- CONFIGURATION (Keep your existing emoji config) ---
const reactionIconsHomeView = {
  like: { static: '/emojis/like.png', animated: '/emojis/like.gif', label: 'Like', color: 'text-blue-600' },
  heart: { static: '/emojis/love.png', animated: '/emojis/love.gif', label: 'Love', color: 'text-red-600' },
  haha: { static: '/emojis/haha.png', animated: '/emojis/haha.gif', label: 'Haha', color: 'text-yellow-500' },
  wow: { static: '/emojis/wow.png', animated: '/emojis/wow.gif', label: 'Wow', color: 'text-amber-500' },
  sad: { static: '/emojis/sad.png', animated: '/emojis/sad.gif', label: 'Sad', color: 'text-blue-400' },
  angry: { static: '/emojis/angry.png', animated: '/emojis/angry.gif', label: 'Angry', color: 'text-red-700' },
  care: { static: '/emojis/care.png', animated: '/emojis/care.gif', label: 'Care', color: 'text-pink-500' },
};

const ANNOUNCEMENT_TRUNCATE_LENGTH = 300;

// --- DELETE DIALOG (Unchanged) ---
const DeleteDialog = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/20 shadow-2xl overflow-hidden text-center">
                        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-5 text-red-500 mx-auto">
                            <Trash2 className="w-7 h-7" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Post?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">This action cannot be undone.</p>
                        <div className="flex flex-col w-full gap-3">
                            <button onClick={onConfirm} className="w-full py-4 rounded-[1.2rem] font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg active:scale-95 transition-all text-sm">Yes, Delete</button>
                            <button onClick={onClose} className="w-full py-4 rounded-[1.2rem] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all text-sm">Cancel</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>, document.body
    );
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const hoverTimeoutRef = useRef(null);

    const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;
    const currentUserReaction = postReactions[userProfile?.id];
    const isTruncated = post.content && post.content.length > ANNOUNCEMENT_TRUNCATE_LENGTH;
    const hasImage = !!post.photoURL;

    // --- REACTION LOGIC ---
    const currentReactionConfig = currentUserReaction ? reactionIconsHomeView[currentUserReaction] : null;
    const reactionLabel = currentReactionConfig ? currentReactionConfig.label : 'Like';
    
    const reactionStats = useMemo(() => {
        const reactionsValues = Object.values(postReactions);
        const totalReactions = reactionsValues.length;
        if (totalReactions === 0) return null;
        const counts = {};
        reactionsValues.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
        const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        return { total: totalReactions, sortedTypes };
    }, [postReactions]);

    // --- HANDLERS ---
    const handleReactionOptionsMouseEnter = () => { clearTimeout(hoverTimeoutRef.current); setReactionOptionsVisible(true); };
    const handleReactionOptionsMouseLeave = () => { hoverTimeoutRef.current = setTimeout(() => { setReactionOptionsVisible(false); }, 300); };

    // --- RENDER HELPERS ---
    const renderTextContent = () => (
        <div className="text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words tracking-wide text-slate-700 dark:text-slate-200 font-medium">
            <Linkify componentDecorator={(href, text, key) => (
                <a href={href} key={key} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold" onClick={(e) => e.stopPropagation()}>{text}</a>
            )}>
                {isTruncated && !isExpanded ? post.content.substring(0, ANNOUNCEMENT_TRUNCATE_LENGTH) + '...' : post.content}
            </Linkify>
            {isTruncated && (
                <button onClick={(e) => { e.stopPropagation(); onToggleExpansion(post.id); }} className="block mt-2 font-bold text-xs text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider">
                    {isExpanded ? 'Show Less' : 'Read More'}
                </button>
            )}
        </div>
    );

    const renderActions = () => (
        <div className="mt-auto pt-6">
            {/* Stats Line */}
            <div className="flex justify-between items-center mb-4 px-1">
                 {reactionStats ? (
                    <div className="flex items-center gap-2 cursor-pointer group select-none" onClick={(e) => { e.stopPropagation(); onViewReactions(postReactions, usersMap); }}>
                        <div className="flex items-center -space-x-2">
                            {reactionStats.sortedTypes.slice(0, 3).map((type, index) => (
                                <div key={type} style={{ zIndex: 30 - index }} className="relative w-5 h-5 rounded-full bg-white dark:bg-slate-800 ring-2 ring-white dark:ring-[#1E1E1E]">
                                    <img src={reactionIconsHomeView[type]?.static} className="w-full h-full object-contain" alt={type} />
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">{reactionStats.total}</span>
                    </div>
                ) : <div className="text-xs font-bold text-slate-400">Be the first to react</div>}
                <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors" onClick={(e) => { e.stopPropagation(); onViewComments(post); }}>
                    {post.commentsCount > 0 ? `${post.commentsCount} comments` : '0 comments'}
                </button>
            </div>

            {/* Buttons Row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="relative" onMouseEnter={handleReactionOptionsMouseEnter} onMouseLeave={handleReactionOptionsMouseLeave}>
                    <button 
                        className={`flex items-center justify-center gap-2 py-3 rounded-[1.2rem] w-full transition-all active:scale-95 ${currentUserReaction ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`} 
                        onClick={(e) => { e.stopPropagation(); onToggleReaction(post.id, 'like'); }}
                    >
                        {currentUserReaction ? (
                            <><img src={currentReactionConfig?.static} alt="r" className="w-5 h-5" /><span className="text-xs font-bold">{reactionLabel}</span></>
                        ) : (
                            <><ThumbsUp className="w-4 h-4" /><span className="text-xs font-bold">Like</span></>
                        )}
                    </button>
                    {/* Reaction Popup */}
                    <AnimatePresence>
                        {isReactionOptionsVisible && (
                            <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute bottom-full mb-2 left-0 p-1.5 flex gap-1 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-white/10 z-50">
                                {Object.entries(reactionIconsHomeView).map(([type, config]) => (
                                    <button key={type} onClick={(e) => { e.stopPropagation(); onToggleReaction(post.id, type); setReactionOptionsVisible(false); }} className="w-8 h-8 hover:scale-125 transition-transform"><img src={config.animated} alt={type} className="w-full h-full object-contain" /></button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <button 
                    className="flex items-center justify-center gap-2 py-3 rounded-[1.2rem] w-full bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all" 
                    onClick={(e) => { e.stopPropagation(); onViewComments(post); }}
                >
                    <MessageCircle className="w-4 h-4" /><span className="text-xs font-bold">Comment</span>
                </button>
            </div>
        </div>
    );

    // --- MAIN RENDER ---
    return (
        <>
            <DeleteDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => { onDelete(post.id); setShowDeleteConfirm(false); }} />

            <div ref={ref} className="group relative w-full bg-white dark:bg-[#121212] rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-white/5 transition-all hover:shadow-2xl overflow-hidden">
                
                {/* --- PINNED INDICATOR --- */}
                {post.isPinned && (
                    <div className="absolute top-0 right-0 z-30 p-4">
                         <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-600 dark:text-blue-400 p-2 rounded-full">
                            <Pin className="w-4 h-4" fill="currentColor" />
                         </div>
                    </div>
                )}

                {/* --- LAYOUT SWITCHER --- */}
                {hasImage && !isEditing ? (
                    // === EDITORIAL SPLIT LAYOUT (Desktop: Image Right / Mobile: Image Top) ===
                    <div className="flex flex-col lg:flex-row h-full">
                        
                        {/* 1. CONTENT SIDE (Left) */}
                        <div className="flex-1 p-6 sm:p-8 flex flex-col min-h-[300px] relative z-10 order-2 lg:order-1">
                             {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800"><UserInitialsAvatar user={authorProfile} size="full" /></div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{post.teacherName}</h3>
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Just now'}</p>
                                </div>
                                {/* Context Menu */}
                                {canModify && (
                                    <div className="ml-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div className="flex-1">
                                {renderTextContent()}
                            </div>

                            {/* Footer */}
                            {renderActions()}
                        </div>

                        {/* 2. IMAGE SIDE (Right on Desktop, Top on Mobile) */}
                        <div className="lg:w-[40%] min-h-[250px] lg:min-h-[400px] relative order-1 lg:order-2 overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer" onClick={() => window.open(post.photoURL, '_blank')}>
                             <img src={post.photoURL} alt="Post Attachment" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:bg-gradient-to-l lg:from-transparent lg:to-black/10 pointer-events-none" />
                             
                             {/* Mobile Only Caption Overlay */}
                             {post.caption && (
                                <div className="absolute bottom-4 left-4 right-4 lg:hidden">
                                     <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                                        <p className="text-xs text-white/90 font-medium italic line-clamp-2">{post.caption}</p>
                                     </div>
                                </div>
                             )}
                             
                             {/* Maximize Icon */}
                             <div className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Maximize2 className="w-4 h-4" />
                             </div>
                        </div>
                    </div>
                ) : (
                    // === CENTERED "GLASS ISLAND" LAYOUT (No Image or Editing) ===
                    <div className="p-6 sm:p-8 relative">
                         {/* Header */}
                         <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800"><UserInitialsAvatar user={authorProfile} size="full" /></div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{post.teacherName}</h3>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{post.createdAt ? new Date(post.createdAt.toDate()).toLocaleDateString() : ''}</p>
                                </div>
                            </div>
                            {canModify && (
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); onStartEdit(post); }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-500"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                        </div>

                        {/* Content Area - "The Glass Island" */}
                        {isEditing ? (
                            <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-3xl border border-slate-200 dark:border-white/10">
                                <textarea className="w-full bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-200 text-sm font-medium" rows="4" value={editingText} onChange={(e) => onTextChange(e.target.value)} autoFocus />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button className="px-4 py-2 text-xs font-bold text-slate-500" onClick={onCancelEdit}>Cancel</button>
                                    <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold" onClick={onSave}>Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50/50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 mb-2">
                                {renderTextContent()}
                            </div>
                        )}
                        
                        {/* Footer */}
                        {renderActions()}
                    </div>
                )}
            </div>
        </>
    );
});

export default memo(AnnouncementCard);