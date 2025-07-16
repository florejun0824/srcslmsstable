import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon } from '@heroicons/react/24/outline';

import {
    updateStudentDetailsInClasses,
    updateTeacherDetailsInDocuments
} from '../services/firestoreService';

const FormField = ({ label, children }) => (
    <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
        {children}
    </div>
);

const ProfilePage = () => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState({ firstName: '', lastName: '', gender: '' });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (userProfile) {
            setProfile({
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                gender: userProfile.gender || 'Not specified'
            });
            setLoading(false);
        }
    }, [userProfile]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profile.firstName || !profile.lastName) {
            showToast("First and last name cannot be empty.", "error");
            return;
        }
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.id);
            await updateDoc(userDocRef, profile);

            if (userProfile.role === 'student') {
                await updateStudentDetailsInClasses(user.id, {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                });
            } else if (userProfile.role === 'teacher') {
                await updateTeacherDetailsInDocuments(user.id, {
                    teacherName: `${profile.firstName} ${profile.lastName}`
                });
            }

            await refreshUserProfile();
            showToast("Profile updated successfully!", "success");

        } catch (error) {
            showToast("Failed to update profile.", "error");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="min-h-full p-4">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200">
                {/* ✅ FIXED: Used flexbox to ensure avatar is always centered */}
                <div className="p-6 flex flex-col items-center text-center border-b border-gray-200">
                    <UserInitialsAvatar
                        firstName={userProfile?.firstName}
                        lastName={userProfile?.lastName}
                        size="xl"
                    />
                    {/* ✅ FIXED: Smaller, responsive font sizes */}
                    <h1 className="mt-3 text-xl sm:text-2xl font-bold text-slate-800">
                        {userProfile?.firstName} {userProfile?.lastName}
                    </h1>
                    <p className="text-sm text-slate-500 capitalize">{userProfile?.role}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left side: Read-only details */}
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">Account Information</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <EnvelopeIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">Email Address</p>
                                    <p className="font-medium text-sm text-slate-700 break-all">{userProfile?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <UserCircleIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">Gender</p>
                                    <p className="font-medium text-sm text-slate-700">{userProfile?.gender || 'Not Specified'}</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-3">
                                <IdentificationIcon className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-slate-500">User ID</p>
                                    <p className="font-mono text-xs text-slate-600 break-all">{user.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Edit form */}
                    <div className="p-4 sm:p-6 bg-slate-50 md:rounded-br-2xl border-t md:border-t-0 md:border-l border-gray-200">
                         <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">Edit Profile</h2>
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="First Name">
                                    <input
                                        type="text"
                                        value={profile.firstName}
                                        onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                                        className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="Your first name"
                                    />
                                </FormField>
                                <FormField label="Last Name">
                                    <input
                                        type="text"
                                        value={profile.lastName}
                                        onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                                        className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="Your last name"
                                    />
                                </FormField>
                            </div>
                            <FormField label="Gender">
                                <select
                                    value={profile.gender}
                                    onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                    className="w-full p-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
                                >
                                    <option value="Not specified">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </FormField>
                            <div className="pt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                                >
                                    {isSubmitting ? 'Saving...' : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;