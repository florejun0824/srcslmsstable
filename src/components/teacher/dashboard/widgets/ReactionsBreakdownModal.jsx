import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';

// NEW: iOS-inspired emoji component for a more vibrant, modern feel.
const IOSEmoji = ({ type = 'like', size = 20, className = '' }) => {
    const map = {
        like: '👍',
        heart: '❤️',
        haha: '😂', // Using a slightly different 'haha' for variety
        wow: '😮',
        sad: '😢',
        angry: '😡',
        care: '🤗',
    };
    const labelMap = {
        like: 'Like',
        heart: 'Love',
        haha: 'Haha',
        wow: 'Wow',
        sad: 'Sad',
        angry: 'Angry',
        care: 'Care',
    };
    const emoji = map[type] || map.like;
    const label = labelMap[type] || 'Like';
    return (
        <span
            role="img"
            aria-label={label}
            title={label}
            className={className}
            style={{ fontSize: size, lineHeight: 1, display: 'inline-block' }}
        >
            {emoji}
        </span>
    );
};

// UPDATED: Reaction icons now use the new IOSEmoji component.
const reactionIcons = {
    all: { color: 'text-zinc-600', label: 'All', component: null },
    like: { color: 'text-blue-500', label: 'Like', component: (props) => <IOSEmoji type="like" {...props} /> },
    heart: { color: 'text-red-500', label: 'Love', component: (props) => <IOSEmoji type="heart" {...props} /> },
    haha: { color: 'text-yellow-500', label: 'Haha', component: (props) => <IOSEmoji type="haha" {...props} /> },
    wow: { color: 'text-purple-500', label: 'Wow', component: (props) => <IOSEmoji type="wow" {...props} /> },
    sad: { color: 'text-zinc-700', label: 'Sad', component: (props) => <IOSEmoji type="sad" {...props} /> },
    angry: { color: 'text-red-700', label: 'Angry', component: (props) => <IOSEmoji type="angry" {...props} /> },
    care: { color: 'text-pink-500', label: 'Care', component: (props) => <IOSEmoji type="care" {...props} /> },
};

const ReactionsBreakdownModal = ({ isOpen, onClose, reactionsData, usersMap }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [groupedReactions, setGroupedReactions] = useState({});

    useEffect(() => {
        if (!isOpen) return; // Reset tab to 'all' when modal opens

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
            const userName = user ? `${user.firstName} ${user.lastName}`.trim() : `User ID: ${userId.substring(0, 5)}...`;
            const reactionEntry = { userId, userName, reactionType, userProfile: user };

            newGroupedReactions.all.push(reactionEntry);
            if (newGroupedReactions[reactionType]) {
                newGroupedReactions[reactionType].push(reactionEntry);
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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="bg-zinc-50/95 rounded-3xl shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col border border-zinc-200/80"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-zinc-900 ml-2">Reactions ({totalReactionsCount})</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-200/80 active:scale-95 transition-colors">
                                <XMarkIcon className="w-6 h-6 text-zinc-500" />
                            </button>
                        </div>

                        {/* iOS-Style Segmented Control Tabs */}
                        <div className="flex-shrink-0 border-b border-zinc-200/80 px-4 pb-2">
                            <div className="p-1 bg-zinc-200/70 rounded-xl flex items-center overflow-x-auto custom-scrollbar-horizontal space-x-1">
                                {Object.entries(reactionIcons).map(([type, { component: Icon, color, label }]) => {
                                    const count = groupedReactions[type] ? groupedReactions[type].length : 0;
                                    if (count === 0 && type !== 'all') return null;

                                    const isActive = activeTab === type;
                                    return (
                                        <button 
                                            key={type} 
                                            onClick={() => setActiveTab(type)} 
                                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${
                                                isActive ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                                            }`}
                                        >
                                            {Icon && <Icon className="h-5 w-5" />}
                                            <span className="capitalize">{label}</span>
                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                                                isActive ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-300/70 text-zinc-500'
                                            }`}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>


                        {/* User List */}
                        <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {groupedReactions[activeTab] && groupedReactions[activeTab].length > 0 ? (
                                groupedReactions[activeTab].map((reaction, index) => (
                                    <div key={index} className="flex items-center p-2 rounded-xl transition-colors duration-200 hover:bg-zinc-200/60">
                                        <div className="w-9 h-9 mr-3 flex-shrink-0">
                                            <UserInitialsAvatar user={reaction.userProfile} size="w-9 h-9" />
                                        </div>
                                        <div className="flex-grow text-zinc-800 text-sm font-medium">
                                            {reaction.userName}
                                        </div>
                                        {reaction.reactionType && reactionIcons[reaction.reactionType]?.component && (
                                            <div className="flex-shrink-0">
                                                {React.createElement(reactionIcons[reaction.reactionType].component)}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-zinc-500 pt-10 text-sm">No {reactionIcons[activeTab]?.label || activeTab} reactions yet.</p>
                            )}
                        </div>
                    </motion.div>
                    <style jsx>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                            height: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background-color: #a1a1aa; /* zinc-400 */
                            border-radius: 10px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background-color: #71717a; /* zinc-500 */
                        }
                        .custom-scrollbar-horizontal {
                            scrollbar-width: thin;
                            scrollbar-color: #a1a1aa transparent;
                        }
                        .custom-scrollbar-horizontal::-webkit-scrollbar {
                            height: 4px;
                        }
                        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
                            background-color: transparent;
                        }
                        .custom-scrollbar-horizontal:hover::-webkit-scrollbar-thumb {
                            background-color: #d4d4d8; /* zinc-300 */
                        }
                    `}</style>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReactionsBreakdownModal;