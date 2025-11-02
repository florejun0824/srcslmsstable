import React from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { UserCircleIcon, EnvelopeIcon, IdentificationIcon, KeyIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    setChangePasswordModalOpen,
    logout
}) => {

    return (
        <div className="max-w-7xl mx-auto w-full space-y-10 py-8 px-4 font-sans">
            <div className="text-left">
                {/* --- MODIFIED: Added dark theme text --- */}
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    My Profile
                </h1>
                {/* --- MODIFIED: Added dark theme text --- */}
                <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                    Manage your account settings and personal information.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6">
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic p-8 text-center text-slate-800 dark:bg-neumorphic-base-dark dark:shadow-lg dark:text-slate-100">
                        {/* --- MODIFIED: Added dark theme styles --- */}
                        <div className="relative inline-block mb-4 w-32 h-32 rounded-full p-1 bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                            {userProfile?.photoURL ? (
                                <img
                                    src={userProfile.photoURL}
                                    alt={`${userProfile?.firstName} ${userProfile?.lastName}`}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : (
                                <UserInitialsAvatar
                                    firstName={userProfile?.firstName}
                                    lastName={userProfile?.lastName}
                                    size="full"
                                />
                            )}
                        </div>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {userProfile?.firstName} {userProfile?.lastName}
                        </h2>
                        {/* --- MODIFIED: Added dark theme text --- */}
                        <p className="mt-1 text-base text-slate-500 dark:text-slate-400 font-medium capitalize">{userProfile?.role}</p>
                    </div>
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic divide-y divide-neumorphic-shadow-dark/30 dark:bg-neumorphic-base-dark dark:shadow-lg dark:divide-slate-700">
                        <div className="flex items-center gap-4 p-4">
                            {/* --- MODIFIED: Added dark theme icon --- */}
                            <EnvelopeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            <div className="flex-grow">
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{userProfile?.email}</p>
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <p className="text-sm text-slate-500 dark:text-slate-400">Email Address</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4">
                            {/* --- MODIFIED: Added dark theme icon --- */}
                            <IdentificationIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            <div className="flex-grow">
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{user?.uid || user?.id}</p>
                                {/* --- MODIFIED: Added dark theme text --- */}
                                <p className="text-sm text-slate-500 dark:text-slate-400">User ID</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* --- MODIFIED: Added dark theme text --- */}
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2">Account Actions</h2>
                    
                    {/* --- MODIFIED: Added dark theme styles --- */}
                    <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button 
                                onClick={() => setEditProfileModalOpen(true)} 
                                // --- MODIFIED: Added dark theme styles ---
                                className="group text-left bg-neumorphic-base rounded-xl shadow-neumorphic p-6 space-y-4 transition-shadow duration-300 hover:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                            >
                                {/* --- MODIFIED: Added dark theme styles --- */}
                                <div className="p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                    {/* --- MODIFIED: Added dark theme icon --- */}
                                    <UserCircleIcon className="w-7 h-7 text-sky-600 dark:text-sky-400" />
                                </div>
                                <div>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Edit Profile</p>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your name and profile picture.</p>
                                </div>
                            </button>
                            
                            <button 
                                onClick={() => setChangePasswordModalOpen(true)} 
                                // --- MODIFIED: Added dark theme styles ---
                                className="group text-left bg-neumorphic-base rounded-xl shadow-neumorphic p-6 space-y-4 transition-shadow duration-300 hover:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                            >
                                {/* --- MODIFIED: Added dark theme styles --- */}
                                <div className="p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                    {/* --- MODIFIED: Added dark theme icon --- */}
                                    <KeyIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Change Password</p>
                                    {/* --- MODIFIED: Added dark theme text --- */}
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your account security.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button onClick={logout} 
                            // --- MODIFIED: Added dark theme styles ---
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-neumorphic-base rounded-xl transition-shadow duration-300 text-red-600 font-semibold shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:text-red-400 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark">
                            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                            <span>Logout</span>
                        </button>Old
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;