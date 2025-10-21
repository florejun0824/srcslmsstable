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
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic p-8 text-center text-slate-800">
                        {/* MODIFIED: Added shadow-neumorphic-inset to the outer container for the pressed-in effect */}
                        <div className="relative inline-block mb-4 w-32 h-32 rounded-full p-1 bg-neumorphic-base shadow-neumorphic-inset">
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
                        <h2 className="text-2xl font-bold text-slate-900">
                            {userProfile?.firstName} {userProfile?.lastName}
                        </h2>
                        <p className="mt-1 text-base text-slate-500 font-medium capitalize">{userProfile?.role}</p>
                    </div>
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic divide-y divide-neumorphic-shadow-dark/30">
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

                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 px-2">Account Actions</h2>
                    
                    <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button 
                                onClick={() => setEditProfileModalOpen(true)} 
                                className="group text-left bg-neumorphic-base rounded-xl shadow-neumorphic p-6 space-y-4 transition-shadow duration-300 hover:shadow-neumorphic-inset"
                            >
                                <div className="p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block">
                                    <UserCircleIcon className="w-7 h-7 text-sky-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-lg">Edit Profile</p>
                                    <p className="text-sm text-slate-500 mt-1">Update your name and profile picture.</p>
                                </div>
                            </button>
                            
                            <button 
                                onClick={() => setChangePasswordModalOpen(true)} 
                                className="group text-left bg-neumorphic-base rounded-xl shadow-neumorphic p-6 space-y-4 transition-shadow duration-300 hover:shadow-neumorphic-inset"
                            >
                                <div className="p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block">
                                    <KeyIcon className="w-7 h-7 text-purple-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 text-lg">Change Password</p>
                                    <p className="text-sm text-slate-500 mt-1">Update your account security.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-neumorphic-base rounded-xl transition-shadow duration-300 text-red-600 font-semibold shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset">
                            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;