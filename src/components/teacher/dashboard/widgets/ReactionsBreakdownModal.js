import React, { useState, useEffect } from 'react';
import { XMarkIcon, HandThumbUpIcon, HeartIcon, FaceSmileIcon, SparklesIcon, FaceFrownIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as SolidHandThumbUpIcon, HeartIcon as SolidHeartIcon, FaceSmileIcon as SolidFaceSmileIcon, SparklesIcon as SolidSparklesIcon, FaceFrownIcon as SolidFaceFrownIcon } from '@heroicons/react/24/solid';
import { FaAngry, FaHandHoldingHeart } from 'react-icons/fa';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar'; // Import the avatar component

const reactionIcons = {
    all: { outline: null, solid: null, color: 'text-gray-600', label: 'All' },
    like: { outline: HandThumbUpIcon, solid: SolidHandThumbUpIcon, color: 'text-blue-500', label: 'Like' },
    heart: { outline: HeartIcon, solid: SolidHeartIcon, color: 'text-red-500', label: 'Love' },
    laugh: { outline: FaceSmileIcon, solid: SolidFaceSmileIcon, color: 'text-yellow-500', label: 'Haha' },
    wow: { outline: SparklesIcon, solid: SolidSparklesIcon, color: 'text-purple-500', label: 'Wow' },
    sad: { outline: FaceFrownIcon, solid: SolidFaceFrownIcon, color: 'text-gray-700', label: 'Sad' },
    angry: { outline: FaAngry, solid: FaAngry, color: 'text-red-700', label: 'Angry' },
    care: { outline: FaHandHoldingHeart, solid: FaHandHoldingHeart, color: 'text-pink-500', label: 'Care' },
};

const ReactionsBreakdownModal = ({ isOpen, onClose, reactionsData, usersMap }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [groupedReactions, setGroupedReactions] = useState({});

    useEffect(() => {
        if (!reactionsData || !usersMap) {
            setGroupedReactions({});
            return;
        }

        const newGroupedReactions = { all: [] };
        Object.keys(reactionIcons).forEach(type => {
            if (type !== 'all') {
                newGroupedReactions[type] = [];
            }
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

        // Sort reactions alphabetically by user name
        Object.keys(newGroupedReactions).forEach(type => {
            newGroupedReactions[type].sort((a, b) => a.userName.localeCompare(b.userName));
        });

        setGroupedReactions(newGroupedReactions);
        setActiveTab('all');
    }, [reactionsData, usersMap]);

    if (!isOpen) {
        return null;
    }

    const totalReactionsCount = reactionsData ? Object.keys(reactionsData).length : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-3xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100 opacity-100">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Reactions ({totalReactionsCount})</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Tabs for Reaction Categories */}
                <div className="sticky top-0 z-10 flex justify-start border-b border-gray-200 px-5 pt-3 bg-white overflow-x-auto custom-scrollbar-horizontal">
                    {Object.entries(reactionIcons).map(([type, { solid: Icon, color, label }]) => {
                        const count = groupedReactions[type] ? groupedReactions[type].length : 0;
                        if (count === 0 && type !== 'all') return null;

                        const isActive = activeTab === type;
                        const buttonClasses = `
                            flex items-center space-x-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ease-in-out
                            ${isActive ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
                        `;

                        return (
                            <button key={type} onClick={() => setActiveTab(type)} className={buttonClasses}>
                                {Icon && <Icon className={`h-5 w-5 ${color}`} />}
                                <span>{label} ({count})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Reaction List */}
                <div className="flex-grow overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {groupedReactions[activeTab] && groupedReactions[activeTab].length > 0 ? (
                        groupedReactions[activeTab].map((reaction, index) => (
                            <div key={index} className="flex items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-200 hover:shadow-md hover:scale-[1.01]">
                                <div className="w-8 h-8 mr-4 flex-shrink-0">
                                    <UserInitialsAvatar user={reaction.userProfile} size="w-8 h-8" />
                                </div>
                                <div className="flex-grow text-gray-800 text-xs font-normal">
                                    <span className="block">{reaction.userName}</span>
                                </div>
                                {reaction.reactionType && reactionIcons[reaction.reactionType]?.solid && (
                                    <div className="flex-shrink-0">
                                        {React.createElement(reactionIcons[reaction.reactionType].solid, {
                                            className: `h-5 w-5 ${reactionIcons[reaction.reactionType].color}`
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-4">No {reactionIcons[activeTab]?.label || activeTab} reactions yet.</p>
                    )}
                </div>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                    border: 2px solid #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
                .custom-scrollbar-horizontal {
                    overflow-x: auto;
                    white-space: nowrap;
                }
                .custom-scrollbar-horizontal::-webkit-scrollbar {
                    height: 8px;
                }
            `}</style>
        </div>
    );
};

export default ReactionsBreakdownModal;
