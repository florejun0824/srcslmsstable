import React from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { UserCircleIcon, EnvelopeIcon, IdentificationIcon, KeyIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';

const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    setChangePasswordModalOpen,
    logout
}) => {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-7xl mx-auto w-full space-y-10">
                <div className="text-center">
                    <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight">
                        My Profile
                    </h2>
                    <p className="mt-4 text-xl text-gray-500">
                        Manage your account settings and personal information.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* User Info Card */}
                    <div className="lg:col-span-1 rounded-3xl bg-white shadow-xl border border-gray-200 p-8 text-center text-slate-800 flex flex-col justify-between transform transition-all duration-500 hover:scale-105">
                        <div>
                            <div className="relative inline-block mb-6 w-48 h-48 rounded-full overflow-hidden border-4 border-indigo-200 shadow-lg">
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
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 mix-blend-overlay rounded-full"></div>
                            </div>
                            <h1 className="text-4xl font-bold text-slate-900 tracking-wide">
                                {userProfile?.firstName} {userProfile?.lastName}
                            </h1>
                            <p className="mt-2 text-lg text-gray-600 font-medium capitalize">{userProfile?.role}</p>
                        </div>
                        <div className="space-y-5 mt-10 text-left">
                            <div className="flex items-center gap-5 p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-300 hover:bg-indigo-50">
                                <EnvelopeIcon className="w-8 h-8 text-indigo-500" />
                                <div>
                                    <p className="text-sm text-gray-400 font-light">Email Address</p>
                                    <p className="font-semibold text-slate-800 text-lg">{userProfile?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all duration-300 hover:bg-indigo-50">
                                <IdentificationIcon className="w-8 h-8 text-indigo-500" />
                                <div>
                                    <p className="text-sm text-gray-400 font-light">User ID</p>
                                    <p className="font-mono text-sm text-slate-800">{user?.uid || user?.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Actions Card */}
                    <div className="lg:col-span-2 rounded-3xl bg-white shadow-xl border border-gray-200 p-8">
                        <h3 className="text-3xl font-bold text-slate-900 mb-8 tracking-wide">Account Actions</h3>
                        <div className="space-y-6">
                            <button onClick={() => setEditProfileModalOpen(true)} className="w-full text-left flex items-center gap-6 p-5 rounded-2xl bg-gray-50 border border-gray-200 transition-all duration-500 hover:bg-indigo-50 group transform hover:-translate-y-1 hover:shadow-lg">
                                <div className="p-4 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl shadow-lg"><UserCircleIcon className="w-8 h-8 text-white" /></div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-900 text-xl">Edit Profile</p>
                                    <p className="text-md text-gray-500 mt-1">Update your first and last name.</p>
                                </div>
                                <span className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300 text-3xl font-light">&rarr;</span>
                            </button>
                            <button onClick={() => setChangePasswordModalOpen(true)} className="w-full text-left flex items-center gap-6 p-5 rounded-2xl bg-gray-50 border border-gray-200 transition-all duration-500 hover:bg-indigo-50 group transform hover:-translate-y-1 hover:shadow-lg">
                                <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl shadow-lg"><KeyIcon className="w-8 h-8 text-white" /></div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-900 text-xl">Change Password</p>
                                    <p className="text-md text-gray-500 mt-1">Update your account security.</p>
                                </div>
                                <span className="text-gray-400 group-hover:text-purple-500 transition-colors duration-300 text-3xl font-light">&rarr;</span>
                            </button>
                            <div className="pt-10">
                                <button onClick={logout} className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.01] transform transition-all duration-500 border-2 border-transparent hover:border-red-300 group">
                                    <ArrowLeftOnRectangleIcon className="w-7 h-7 transform group-hover:-translate-x-1 transition-transform duration-300" />
                                    <span className="text-xl">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;