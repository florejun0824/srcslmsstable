import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon, SparklesIcon } from '@heroicons/react/24/outline';

// --- Import the propagation functions from your service file ---
import {
    updateStudentDetailsInClasses,
    updateTeacherDetailsInDocuments
} from '../services/firestoreService';

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
            // Step 1: Update the main user document in the 'users' collection
            const userDocRef = doc(db, "users", user.id);
            await updateDoc(userDocRef, profile);

            // Step 2: Propagate the changes to other collections based on user role
            if (userProfile.role === 'student') {
                const studentData = {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                };
                await updateStudentDetailsInClasses(user.id, studentData);
            } else if (userProfile.role === 'teacher') {
                const teacherData = {
                    teacherName: `${profile.firstName} ${profile.lastName}`
                };
                await updateTeacherDetailsInDocuments(user.id, teacherData);
            }

            // Step 3: Refresh the profile in the context and notify the user
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

    // Reusable component for profile information fields
    const InfoField = ({ icon, label, value }) => (
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
            <div className="p-2 bg-white/10 rounded-full">
                {React.cloneElement(icon, { className: "w-6 h-6 text-white/70" })}
            </div>
            <div>
                <p className="text-sm text-white/60">{label}</p>
                <p className="font-semibold text-white">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: User Info Card */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center text-white h-full flex flex-col justify-between">
                        <div>
                            <div className="relative inline-block mb-4">
                                <UserInitialsAvatar
                                    firstName={userProfile?.firstName}
                                    lastName={userProfile?.lastName}
                                    size="xl"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-teal-400 to-cyan-500 p-1.5 rounded-full shadow-lg">
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold text-white">
                                {userProfile?.firstName} {userProfile?.lastName}
                            </h2>
                            <p className="text-md text-slate-400 capitalize">{userProfile?.role}</p>
                        </div>
                        <div className="space-y-4 mt-8 text-left">
                            <InfoField icon={<EnvelopeIcon />} label="Email Address" value={userProfile?.email} />
                            <InfoField icon={<UserCircleIcon />} label="Gender" value={userProfile?.gender || 'Not Specified'} />
                            <InfoField icon={<IdentificationIcon />} label="User ID" value={user.id} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Edit Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">Edit Your Profile</h3>
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* First Name Input */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={profile.firstName}
                                        onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                                        className="w-full p-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="Enter your first name"
                                    />
                                </div>
                                {/* Last Name Input */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={profile.lastName}
                                        onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                                        className="w-full p-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        placeholder="Enter your last name"
                                    />
                                </div>
                            </div>
                            {/* Gender Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                                <select
                                    value={profile.gender}
                                    onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                    className="w-full p-3 bg-white/70 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
                                >
                                    <option value="Not specified">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            {/* Save Button */}
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-300 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </div>
                                    ) : "Save Changes"}
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
