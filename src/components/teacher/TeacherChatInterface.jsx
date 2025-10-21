import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaRobot, FaUserCircle, FaCommentDots } from 'react-icons/fa';
// Removed unused imports from firebase/firestore and db as it's not needed here directly.
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


const TeacherChatInterface = ({
    isOpen,
    onClose,
    userProfile, // The logged-in user's profile
    allUsers = [], // Ensure allUsers defaults to an empty array
    onOpenChat, // Function to open a specific chat window
    currentUserUid, // The Firebase Auth UID of the current user
    isUsersLoading, // New prop: Pass the loading state from TeacherDashboard
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    console.log("TeacherChatInterface Props - allUsers:", allUsers, "currentUserUid:", currentUserUid, "isUsersLoading:", isUsersLoading);

    // Filter out the current user and students, then apply search term
    const otherTeachersAndAdmins = (allUsers || []).filter(user =>
        user.id !== currentUserUid && (user.role?.toLowerCase() !== 'student') // Safely access role and convert to lowercase
    ).filter(user =>
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || // Added safe navigation (?)
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log("TeacherChatInterface - Filtered Teachers/Admins:", otherTeachersAndAdmins);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-md">
                    <h2 className="text-xl font-bold">Chat Hub</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                        <FaTimes className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search teachers or admins..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Chat Options / User List */}
                <>
                    {/* AI Assistant Chat Option */}
                    <div className="p-4 border-b border-gray-200">
                        <button
                            className="flex items-center w-full p-3 rounded-lg hover:bg-blue-50 transition-colors space-x-3"
                            onClick={() => {
                                // Ensure onOpenChat is a function before calling
                                if (typeof onOpenChat === 'function') {
                                    onOpenChat({ id: 'ai', firstName: 'Lumina', lastName: 'AI', type: 'ai', displayName: 'AI Assistant' });
                                } else {
                                    console.error("onOpenChat is not a function in AI chat button.");
                                }
                                onClose(); // Close the hub after opening chat
                            }}
                        >
                            <FaRobot className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="font-semibold text-gray-800">Lumina AI Assistant</p>
                                <p className="text-sm text-gray-500">Instant help & support</p>
                            </div>
                        </button>
                    </div>

                    {/* Other Teachers and Admins */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <h3 className="text-lg font-bold text-gray-700 px-4 pt-4">Other Teachers & Admins</h3>
                        {isUsersLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <Spinner />
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {otherTeachersAndAdmins.length > 0 ? (
                                    otherTeachersAndAdmins.map(user => (
                                        <li
                                            key={user.id} // Added key for list items
                                            className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors space-x-3"
                                            onClick={() => {
                                                // Ensure onOpenChat is a function before calling
                                                if (typeof onOpenChat === 'function') {
                                                    onOpenChat(user); // Pass the full user object
                                                } else {
                                                    console.error("onOpenChat is not a function in user list item.");
                                                }
                                                onClose(); // Close the hub after opening chat
                                            }}
                                        >
                                            <UserInitialsAvatar
                                                firstName={user.firstName}
                                                lastName={user.lastName}
                                                size="md"
                                                gradientColor={getUserGradient(user.id)}
                                            />
                                            <div>
                                                <p className="font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
                                                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No other teachers or admins found.</p>
                                )}
                            </ul>
                        )}
                    </div>
                </>
            </div>
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

export default TeacherChatInterface;
