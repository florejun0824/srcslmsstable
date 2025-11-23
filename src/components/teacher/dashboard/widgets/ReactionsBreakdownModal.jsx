// src/components/teacher/dashboard/widgets/ReactionsBreakdownModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

// --- Reaction Config (Consistent with AnnouncementModal) ---
const IOSEmoji = ({ emoji, className = '' }) => (
    <span className={`inline-block leading-none ${className}`} style={{ fontSize: '1.25rem' }}>
        {emoji}
    </span>
);

const reactionIcons = {
    all: { label: 'All', emoji: null },
    like: { label: 'Like', emoji: '👍' },
    heart: { label: 'Love', emoji: '❤️' },
    haha: { label: 'Haha', emoji: '😂' },
    wow: { label: 'Wow', emoji: '😮' },
    sad: { label: 'Sad', emoji: '😢' },
    angry: { label: 'Angry', emoji: '😡' },
    care: { label: 'Care', emoji: '🤗' },
};

const ReactionsBreakdownModal = ({ isOpen, onClose, reactionsData, usersMap }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [groupedReactions, setGroupedReactions] = useState({});

    useEffect(() => {
        if (!isOpen) return;

        if (!reactionsData || !usersMap) {
            setGroupedReactions({});
            return;
        }

        const newGroupedReactions = { all: [] };
        Object.keys(reactionIcons).forEach(type => {
            if (type !== 'all') newGroupedReactions[type] = [];
        });

        Object.entries(reactionsData).forEach(([userId, reactionType]) => {
            const user = usersMap[userId];
            // Fallback to 'like' if reactionType is unknown to prevent crashes
            const safeReactionType = reactionIcons[reactionType] ? reactionType : 'like';
            
            const userName = user ? `${user.firstName} ${user.lastName}`.trim() : `User ID: ${userId.substring(0, 5)}...`;
            const reactionEntry = { userId, userName, reactionType: safeReactionType, userProfile: user };

            newGroupedReactions.all.push(reactionEntry);
            if (newGroupedReactions[safeReactionType]) {
                newGroupedReactions[safeReactionType].push(reactionEntry);
            }
        });

        Object.keys(newGroupedReactions).forEach(type => {
            newGroupedReactions[type].sort((a, b) => a.userName.localeCompare(b.userName));
        });

        setGroupedReactions(newGroupedReactions);
        setActiveTab('all');
    }, [isOpen, reactionsData, usersMap]);

    const totalReactionsCount = reactionsData ? Object.keys(reactionsData).length : 0;
    
    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
    };

    // Close on Escape
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        }
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 font-sans" onClick={(e) => e.target === e.currentTarget && onClose()}>
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="relative glass-panel bg-white/90 dark:bg-slate-900/90 rounded-[2.5rem] shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col border border-white/40 dark:border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Reactions</h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                                    {totalReactionsCount} Total
                                </p>
                            </div>
                            <button 
                                onClick={onClose} 
                                className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
                            >
                                <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* macOS Segmented Control Tabs */}
                        <div className="px-6 py-2 bg-white/30 dark:bg-black/10 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5">
                            <div className="flex items-center gap-1 overflow-x-auto pb-2 no-scrollbar mask-linear-fade">
                                {Object.entries(reactionIcons).map(([type, { emoji, label }]) => {
                                    const count = groupedReactions[type] ? groupedReactions[type].length : 0;
                                    if (count === 0 && type !== 'all') return null;

                                    const isActive = activeTab === type;
                                    return (
                                        <button 
                                            key={type} 
                                            onClick={() => setActiveTab(type)} 
                                            className="relative px-4 py-2 rounded-full flex-shrink-0 transition-all group outline-none"
                                        >
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="activeReactionTab"
                                                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-full shadow-sm border border-slate-200/50 dark:border-white/5"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <div className="relative z-10 flex items-center gap-2">
                                                {emoji && <IOSEmoji emoji={emoji} className="text-lg filter drop-shadow-sm" />}
                                                <span className={`text-xs font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                                                    {type === 'all' ? 'All' : ''}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none ${
                                                    isActive ? 'bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-300' : 'bg-slate-200/50 dark:bg-white/5 text-slate-500 dark:text-slate-500'
                                                }`}>
                                                    {count}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* User List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30 dark:bg-black/5">
                            {groupedReactions[activeTab] && groupedReactions[activeTab].length > 0 ? (
                                groupedReactions[activeTab].map((reaction, index) => (
                                    <motion.div 
                                        key={index} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                                    >
                                        <div className="w-10 h-10 mr-3 flex-shrink-0 rounded-full shadow-sm ring-2 ring-white dark:ring-white/5">
                                            <UserInitialsAvatar user={reaction.userProfile} size="full" className="w-full h-full text-xs" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                                {reaction.userName}
                                            </p>
                                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                                Reacted with {reactionIcons[reaction.reactionType]?.label || 'Like'}
                                            </p>
                                        </div>
                                        {reaction.reactionType && (
                                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-sm text-xl">
                                                {reactionIcons[reaction.reactionType]?.emoji}
                                            </div>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                                    <div className="text-4xl mb-2 grayscale">
                                        {reactionIcons[activeTab]?.emoji || '📭'}
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No reactions yet</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ReactionsBreakdownModal;