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
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
                    My Profile
                </h1>
                <p className="mt-2 text-lg text-slate-500">
                    Manage your account settings and personal information.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* User Info Card (Left) - This section is already well-aligned with the design. */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-800">
                        <div className="relative inline-block mb-4 w-32 h-32 rounded-full overflow-hidden border-2 border-slate-200">
                            {userProfile?.photoURL ? (
                                <img
                                    src={userProfile.photoURL}
                                    alt={`${userProfile?.firstName} ${userProfile?.lastName}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserInitialsAvatar
                                    firstName={userProfile?.firstName}
                                    lastName={userProfile?.lastName}
                                    size="full"
                                />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {userProfile?.firstName} {userProfile?.lastName}
                        </h2>
                        <p className="mt-1 text-base text-slate-500 font-medium capitalize">{userProfile?.role}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-200">
                        <div className="flex items-center gap-4 p-4">
                            <EnvelopeIcon className="w-6 h-6 text-slate-500" />
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-800">{userProfile?.email}</p>
                                <p className="text-sm text-slate-500">Email Address</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4">
                            <IdentificationIcon className="w-6 h-6 text-slate-500" />
                            <div className="flex-grow">
                                <p className="font-mono text-sm text-slate-800">{user?.uid || user?.id}</p>
                                <p className="text-sm text-slate-500">User ID</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* **MODIFICATION START** - Account Actions Card (Right) */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 px-2">Account Actions</h2>
                    
                    {/* This new "Control Surface" container gives a recessed, tangible feel. */}
                    <div className="bg-slate-100 rounded-2xl p-6 shadow-inner">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Edit Profile Tile with refined hover effects */}
                            <button 
                                onClick={() => setEditProfileModalOpen(true)} 
                                className="group text-left bg-white rounded-xl border border-slate-200 p-6 space-y-4 transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-600/20 hover:-translate-y-1.5"
                            >
                                <div className="p-3 bg-blue-500 rounded-lg inline-block">
                                    <UserCircleIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-lg">Edit Profile</p>
                                    <p className="text-sm text-slate-500 mt-1">Update your name and profile picture.</p>
                                </div>
                            </button>
                            
                            {/* Change Password Tile with refined hover effects */}
                            <button 
                                onClick={() => setChangePasswordModalOpen(true)} 
                                className="group text-left bg-white rounded-xl border border-slate-200 p-6 space-y-4 transition-all duration-300 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-600/20 hover:-translate-y-1.5"
                            >
                                <div className="p-3 bg-purple-500 rounded-lg inline-block">
                                    <KeyIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-lg">Change Password</p>
                                    <p className="text-sm text-slate-500 mt-1">Update your account security.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Logout Button remains separate as a primary, distinct action */}
                    <div className="pt-4">
                        <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl transition-all duration-300 text-red-500 font-semibold hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 active:scale-95">
                            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
                {/* **MODIFICATION END** */}
            </div>
        </div>
    );
};

export default ProfileView;