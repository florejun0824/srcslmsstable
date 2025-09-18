import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaMinus, FaPaperPlane, FaEllipsisV, FaTrash, FaPen, FaRobot } from 'react-icons/fa';
import UserInitialsAvatar from '../common/UserInitialsAvatar';
import Spinner from '../common/Spinner';

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

const MessageDialog = ({
    chatId,
    isOpen,
    onClose,
    onMinimize,
    messages = [],
    onSendMessage,
    isThinking = false,
    partnerDetails,
    userProfile,
    currentAuthUserId,
    initialPosition,
    onReadMessages,
    onDeleteMessage,
    onDeleteConversation,
}) => {
    const [messageInput, setMessageInput] = useState('');
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const messageContainerRef = useRef(null);
    const dialogRef = useRef(null);

    const [contextMenu, setContextMenu] = useState(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);

    const [isConversationDeleteConfirmOpen, setIsConversationDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (initialPosition) {
            setPosition(initialPosition);
        }
    }, [initialPosition]);

    useEffect(() => {
        if (messageContainerRef.current) {
            messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
        }
        if (isOpen && onReadMessages) {
            onReadMessages(chatId);
        }
    }, [messages, isThinking, isOpen, onReadMessages, chatId]);

    const handleMouseDown = (e) => {
        if (e.target.closest('.no-drag')) return;
        setIsDragging(true);
        setOffset({
            x: e.clientX - position.left,
            y: e.clientY - position.top,
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            left: e.clientX - offset.x,
            top: e.clientY - offset.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, offset]);

    const handleSendClick = () => {
        if (messageInput.trim()) {
            onSendMessage(chatId, messageInput);
            setMessageInput('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const formatTimestamp = (timestamp) => {
        // If timestamp is null, undefined, or a FieldValue (not yet a proper Date or Firestore Timestamp)
        if (!timestamp || (typeof timestamp === 'object' && timestamp !== null && typeof timestamp.toDate !== 'function')) {
            return 'Sending...';
        }
        
        let date;
        if (typeof timestamp.toDate === 'function') { // Firestore Timestamp
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) { // Already a Date object
            date = timestamp;
        } else { // Fallback, should ideally not be reached if previous checks are good
            return 'Invalid Date';
        }

        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
    };

    const handleContextMenu = (e, message) => {
        e.preventDefault();
        setContextMenu({
            messageId: message.id,
            x: e.clientX,
            y: e.clientY,
            isUserMessage: message.senderId === currentAuthUserId,
        });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenu && dialogRef.current && !dialogRef.current.contains(event.target)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [contextMenu]);

    const confirmDeleteMessage = (messageId) => {
        setMessageToDelete(messageId);
        setIsDeleteConfirmOpen(true);
        setContextMenu(null);
    };

    const executeDeleteMessage = () => {
        if (messageToDelete && onDeleteMessage) {
            onDeleteMessage(chatId, messageToDelete);
            setMessageToDelete(null);
        }
        setIsDeleteConfirmOpen(false);
    };

    const cancelDeleteMessage = () => {
        setMessageToDelete(null);
        setIsDeleteConfirmOpen(false);
    };

    const confirmDeleteConversation = () => {
        setIsConversationDeleteConfirmOpen(true);
        setContextMenu(null);
    };

    const executeDeleteConversation = () => {
        if (onDeleteConversation) {
            onDeleteConversation(chatId);
        }
        setIsConversationDeleteConfirmOpen(false);
        onClose();
    };

    const cancelDeleteConversation = () => {
        setIsConversationDeleteConfirmOpen(false);
    };

    if (!isOpen) return null;

    const partnerName = partnerDetails.type === 'ai' ? partnerDetails.displayName : `${partnerDetails.firstName} ${partnerDetails.lastName}`;

    return (
        <div
            ref={dialogRef}
            className="fixed flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
            style={{
                width: '320px',
                height: '450px',
                left: position.left,
                top: position.top,
                zIndex: 999
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md cursor-grab">
                <div className="flex items-center space-x-2 no-drag">
                    {partnerDetails.type === 'ai' ? (
                        <FaRobot className="w-5 h-5 text-white" />
                    ) : (
                        <UserInitialsAvatar
                            firstName={partnerDetails.firstName}
                            lastName={partnerDetails.lastName}
                            size="sm"
                            gradientColor={getUserGradient(partnerDetails.id)}
                        />
                    )}
                    <h3 className="font-semibold text-lg">{partnerName}</h3>
                </div>
                <div className="flex items-center space-x-2 no-drag">
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu(prev => prev ? null : { messageId: 'conversation', x: e.clientX, y: e.clientY, isUserMessage: true });
                            }}
                            className="p-1 rounded-full hover:bg-white/20 transition-colors"
                            title="Options"
                        >
                            <FaEllipsisV className="w-4 h-4" />
                        </button>
                        {contextMenu && contextMenu.messageId === 'conversation' && (
                            <div
                                className="absolute bg-white shadow-lg rounded-md py-1 z-50 right-0 mt-2 text-gray-800 text-sm"
                                style={{
                                    top: '100%',
                                    minWidth: '120px',
                                }}
                            >
                                <button
                                    className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-red-500"
                                    onClick={() => confirmDeleteConversation()}
                                >
                                    <FaTrash className="mr-2" /> Delete Chat
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onMinimize}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        title="Minimize"
                    >
                        <FaMinus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                        title="Close"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div ref={messageContainerRef} className="flex-1 p-4 overflow-y-auto bg-gray-100 custom-scrollbar">
                {messages.length === 0 && !isThinking && (
                    <div className="flex items-center justify-center h-full text-gray-500 text-center">
                        Start a conversation with {partnerName}!
                    </div>
                )}
                {messages.map((msg, index) => {
                    const isSender = msg.senderId === currentAuthUserId;
                    const isAiSender = msg.senderId === 'ai';
                    const showAvatar = !(isSender && messages[index + 1]?.senderId === msg.senderId) &&
                                       !(isAiSender && messages[index + 1]?.senderId === msg.senderId);

                    return (
                        <div key={msg.id || index} className={`flex mb-3 ${isSender ? 'justify-end' : 'justify-start'}`}>
                            {!isSender && showAvatar && !isAiSender && (
                                <UserInitialsAvatar
                                    firstName={partnerDetails.firstName}
                                    lastName={partnerDetails.lastName}
                                    size="sm"
                                    gradientColor={getUserGradient(partnerDetails.id)}
                                    className="mr-2 self-end"
                                />
                            )}
                            {isAiSender && showAvatar && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm mr-2 self-end">
                                    <FaRobot className="w-4 h-4" />
                                </div>
                            )}

                            <div
                                className={`flex flex-col max-w-[75%] px-4 py-2 rounded-lg shadow ${
                                    isSender
                                        ? 'bg-blue-500 text-white rounded-br-none'
                                        : isAiSender
                                            ? 'bg-blue-100 text-gray-800 rounded-bl-none'
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                }`}
                                onContextMenu={(e) => handleContextMenu(e, msg)}
                            >
                                <p className="text-sm break-words">{msg.text}</p>
                                <span className={`text-xs mt-1 ${isSender ? 'text-blue-200' : 'text-gray-500'} self-end`}>
                                    {formatTimestamp(msg.timestamp)}
                                </span>
                            </div>

                            {contextMenu && contextMenu.messageId === msg.id && (
                                <div
                                    className="absolute bg-white shadow-lg rounded-md py-1 z-50 text-gray-800 text-sm"
                                    style={{ left: contextMenu.x, top: contextMenu.y }}
                                >
                                    {contextMenu.isUserMessage && (
                                        <button
                                            className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left"
                                            onClick={() => { console.log('Edit message (Not implemented)'); setContextMenu(null); }}
                                        >
                                            <FaPen className="mr-2" /> Edit
                                        </button>
                                    )}
                                    {(partnerDetails.type !== 'ai' || contextMenu.isUserMessage) && (
                                        <button
                                            className="flex items-center px-4 py-2 hover:bg-gray-100 w-full text-left text-red-500"
                                            onClick={() => confirmDeleteMessage(msg.id)}
                                        >
                                            <FaTrash className="mr-2" /> Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {isThinking && (
                    <div className={`flex mb-3 ${partnerDetails.type === 'ai' ? 'justify-start' : 'justify-start'}`}>
                        {partnerDetails.type === 'ai' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm mr-2 self-end">
                                <FaRobot className="w-4 h-4" />
                            </div>
                        )}
                        <div className={`flex flex-col max-w-[75%] px-4 py-2 rounded-lg shadow ${partnerDetails.type === 'ai' ? 'bg-blue-100 rounded-bl-none' : 'bg-gray-200 rounded-bl-none'}`}>
                            <Spinner />
                            <span className={`text-xs mt-1 ${partnerDetails.type === 'ai' ? 'text-gray-500' : 'text-gray-500'} self-end`}>
                                Typing...
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white border-t border-gray-200 no-drag">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isThinking}
                    />
                    <button
                        onClick={handleSendClick}
                        className="bg-blue-500 text-white p-3 rounded-full shadow-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!messageInput.trim() || isThinking}
                    >
                        <FaPaperPlane className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
                    <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                        <p className="text-lg font-semibold mb-4">Are you sure you want to delete this message?</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={cancelDeleteMessage} className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                            <button onClick={executeDeleteMessage} className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {isConversationDeleteConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
                    <div className="bg-white p-6 rounded-lg shadow-xl text-center">
                        <p className="text-lg font-semibold mb-4">Are you sure you want to delete this entire conversation?</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={cancelDeleteConversation} className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancel</button>
                            <button onClick={executeDeleteConversation} className="px-5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">Delete All</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
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

export default MessageDialog;
