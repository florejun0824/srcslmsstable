import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaSearch, FaRobot, FaEdit } from 'react-icons/fa';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import Spinner from '../common/Spinner';

// Function to get a consistent gradient based on user ID
const gradientColors = [
    'from-blue-400 to-indigo-500',
    'from-green-400 to-teal-500',
    'from-purple-400 to-pink-500',
    'from-yellow-400 to-orange-500',
    'from-red-400 to-rose-500',
    'from-indigo-400 to-purple-500',
    'from-teal-400 to-cyan-500',
    'from-pink-400 to-red-500',
];
const getUserGradient = (userId) => {
    if (!userId) return gradientColors[0];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % gradientColors.length);
    return gradientColors[index];
};

const ChatListOverview = ({ isOpen, onClose, userProfile, allUsers, messages, onOpenChat, onOpenTeacherChatInterface, chatUnreadCounts }) => {
    const [conversations, setConversations] = useState([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);

    const currentUserId = userProfile?.id;

    // Process messages to form a list of unique conversations
    useEffect(() => {
        if (!currentUserId || !messages || !allUsers) {
            setIsLoadingConversations(false);
            return;
        }

        const conversationMap = new Map(); // Map to store latest message for each chat ID

        // Iterate through all messages to find the latest for each conversation
        Object.keys(messages).forEach(chatId => {
            const chatMessages = messages[chatId];
            if (chatMessages && chatMessages.length > 0) {
                // Get the latest message (assuming messages are ordered by timestamp)
                const latestMessage = chatMessages[chatMessages.length - 1];

                // Determine chat partner
                let partnerId;
                let partnerDetails = {};

                if (chatId === 'ai') { // Handle AI chat specifically
                    partnerId = 'ai';
                    partnerDetails = { id: 'ai', firstName: 'Lumina', lastName: 'AI', type: 'ai', displayName: 'AI Assistant' };
                } else {
                    // For peer-to-peer chats, parse partner ID from chatId
                    const participantIds = chatId.split('_').filter(id => id !== currentUserId);
                    if (participantIds.length > 0) {
                        partnerId = participantIds[0]; // Assuming only two participants
                        partnerDetails = allUsers.find(u => u.id === partnerId);
                        if (!partnerDetails) {
                            // Fallback if user profile not found for some reason
                            partnerDetails = { id: partnerId, firstName: 'Unknown', lastName: 'User', type: 'user' };
                        } else {
                             // Ensure partnerDetails has the name structure expected by MessageDialog
                            partnerDetails = { ...partnerDetails, type: 'user' };
                        }
                    } else {
                        // This case should ideally not happen for valid chat IDs
                        return; 
                    }
                }
                
                conversationMap.set(chatId, {
                    chatId,
                    partnerDetails,
                    lastMessage: latestMessage.text,
                    timestamp: latestMessage.timestamp,
                    senderId: latestMessage.senderId, // Useful for "You: message"
                    unreadCount: chatUnreadCounts[chatId] || 0 // Get unread count from prop
                });
            }
        });

        // Convert map values to array and sort by latest message timestamp
        const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
            return timeB - timeA; // Sort descending (latest first)
        });

        setConversations(sortedConversations);
        setIsLoadingConversations(false);
    }, [messages, allUsers, currentUserId, chatUnreadCounts]); // Added chatUnreadCounts to dependencies


    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm h-[80vh] flex flex-col transform transition-all duration-300 scale-100 opacity-100 border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-3xl shadow-md">
                    <h2 className="text-2xl font-extrabold flex items-center tracking-wide">
                        <span className="relative mr-3">
                            <FaEdit className="w-8 h-8 text-purple-100" /> {/* Edit/Pencil icon for new message */}
                        </span>
                        Messages
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                        title="Close Messages"
                    >
                        <FaTimes className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* New Message Button / Search for new chats */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <button 
                        onClick={onOpenTeacherChatInterface}
                        className="w-full bg-blue-500 text-white py-3 rounded-full font-semibold shadow-md hover:bg-blue-600 transition-all duration-200 flex items-center justify-center text-lg"
                        title="Start New Chat"
                    >
                        <FaEdit className="w-5 h-5 mr-2" /> Start New Chat
                    </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                    {isLoadingConversations ? (
                        <div className="flex flex-col justify-center items-center h-full text-gray-600">
                            <Spinner className="w-10 h-10 text-blue-500" /> 
                            <span className="mt-3 text-lg font-medium">Loading conversations...</span>
                        </div>
                    ) : (
                        <ul className="p-2 space-y-2">
                            {conversations.length > 0 ? (
                                conversations.map(conv => (
                                    <li
                                        key={conv.chatId}
                                        className="relative flex items-center p-3 bg-white hover:bg-gray-100 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.01]"
                                        onClick={() => { onOpenChat(conv.partnerDetails); onClose(); }} // Open chat dialog and close overview
                                    >
                                        {conv.partnerDetails.type === 'ai' ? (
                                            <FaRobot className="w-10 h-10 mr-3 text-blue-600 flex-shrink-0 p-2 bg-blue-200 rounded-full" />
                                        ) : (
                                            <UserInitialsAvatar
                                                firstName={conv.partnerDetails.firstName}
                                                lastName={conv.partnerDetails.lastName}
                                                size="lg"
                                                className="mr-3 flex-shrink-0 shadow"
                                                gradientColor={getUserGradient(conv.partnerDetails.id)}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-lg truncate">
                                                {conv.partnerDetails.firstName} {conv.partnerDetails.lastName}
                                            </p>
                                            <p className="text-sm text-gray-600 truncate">
                                                {conv.senderId === currentUserId ? 'You: ' : ''}{conv.lastMessage}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                            {conv.timestamp?.toDate ? conv.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                        {/* Unread dot/count for list item */}
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
                                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                            </span>
                                        )}
                                    </li>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-8 text-lg">No active conversations. Start a new chat!</p>
                            )}
                        </ul>
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
            `}</style>
        </div>
    );
};

export default ChatListOverview;
