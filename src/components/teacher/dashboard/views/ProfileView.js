import React from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { EnvelopeIcon, IdentificationIcon, PencilSquareIcon, KeyIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    setChangePasswordModalOpen,
    logout
}) => {
    return (
        <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 text-center text-white h-full flex flex-col justify-between">
                        <div>
                            <div className="relative inline-block mb-4 w-40 h-40 rounded-full overflow-hidden">
                                <UserInitialsAvatar
                                    firstName={userProfile?.firstName}
                                    lastName={userProfile?.lastName}
                                    size="full"
                                />
                            </div>
                            <h1 className="text-3xl font-bold text-white">
                                {userProfile?.firstName} {userProfile?.lastName}
                            </h1>
                            <p className="text-md text-slate-400 capitalize">{userProfile?.role}</p>
                        </div>
                        <div className="space-y-4 mt-8 text-left">
                            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                <EnvelopeIcon className="w-6 h-6 text-white/70" />
                                <div>
                                    <p className="text-sm text-white/60">Email</p>
                                    <p className="font-semibold text-white">{userProfile?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                <IdentificationIcon className="w-6 h-6 text-white/70" />
                                <div>
                                    <p className="text-sm text-white/60">User ID</p>
                                    <p className="font-mono text-xs text-white">{user?.uid || user?.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-xl p-8 h-full">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">Account Actions</h3>
                        <div className="space-y-4">
                            <button onClick={() => setEditProfileModalOpen(true)} className="w-full text-left flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all duration-300 group">
                                <div className="p-3 bg-blue-100 rounded-lg"><PencilSquareIcon className="w-6 h-6 text-blue-600" /></div>
                                <div>
                                    <p className="font-semibold text-slate-800">Edit Profile</p>
                                    <p className="text-sm text-slate-500">Update your first and last name.</p>
                                </div>
                                <span className="ml-auto text-slate-400 group-hover:text-blue-600 transition-colors">&rarr;</span>
                            </button>
                            <button onClick={() => setChangePasswordModalOpen(true)} className="w-full text-left flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all duration-300 group">
                                <div className="p-3 bg-purple-100 rounded-lg"><KeyIcon className="w-6 h-6 text-purple-600" /></div>
                                <div>
                                    <p className="font-semibold text-slate-800">Change Password</p>
                                    <p className="text-sm text-slate-500">Update your account security.</p>
                                </div>
                                <span className="ml-auto text-slate-400 group-hover:text-purple-600 transition-colors">&rarr;</span>
                            </button>
                            <div className="pt-8">
                                <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 shadow-lg">
                                    <ArrowLeftOnRectangleIcon className="w-6 h-6" /> Logout
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