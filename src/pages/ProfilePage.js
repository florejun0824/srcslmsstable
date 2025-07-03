import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar'; // We'll use this for the avatar

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
            const userDocRef = doc(db, "users", user.id);
            await updateDoc(userDocRef, profile);
            await refreshUserProfile(); // Refresh the profile in the context
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
        // --- NEW: Main glass panel for the entire profile page ---
        <div className="bg-white/60 backdrop-blur-xl border border-white/30 rounded-2xl shadow-lg max-w-4xl mx-auto">
            <div className="p-8">
                {/* --- Profile Header --- */}
                <div className="flex flex-col items-center text-center mb-8">
                    <UserInitialsAvatar 
                        firstName={userProfile?.firstName} 
                        lastName={userProfile?.lastName} 
                        size="lg" // Use the large avatar size
                    />
                    <h2 className="text-3xl font-bold text-slate-800 mt-4">
                        {userProfile?.firstName} {userProfile?.lastName}
                    </h2>
                    <p className="text-md text-slate-600">{userProfile?.email}</p>
                </div>

                {/* --- Form with updated styling --- */}
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