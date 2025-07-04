import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';

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
            showToast("Profile updated successfully!");

        } catch (error) {
            showToast("Failed to update profile.", "error");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg max-w-4xl mx-auto">
            <div className="p-8">
                {/* --- Profile Header --- */}
                <div className="flex flex-col items-center text-center mb-8">
                    <UserInitialsAvatar
                        firstName={userProfile?.firstName}
                        lastName={userProfile?.lastName}
                        size="lg"
                    />
                    <h2 className="text-3xl font-bold text-slate-800 mt-4">
                        {userProfile?.firstName} {userProfile?.lastName}
                    </h2>
                    <p className="text-md text-slate-600">{userProfile?.email}</p>
                </div>

                {/* --- Form --- */}
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* First Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                            <input
                                type="text"
                                value={profile.firstName}
                                onChange={e => setProfile({...profile, firstName: e.target.value})}
                                className="w-full p-3 bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        {/* Last Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={profile.lastName}
                                onChange={e => setProfile({...profile, lastName: e.target.value})}
                                className="w-full p-3 bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                    </div>
                    {/* Gender Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                        <select
                            value={profile.gender}
                            onChange={e => setProfile({...profile, gender: e.target.value})}
                            className="w-full p-3 bg-white/50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-200 shadow disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;