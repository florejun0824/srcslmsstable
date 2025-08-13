import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon, PhotoIcon } from '@heroicons/react/24/outline'; // Importing icons

import { TextInput, Button } from '@tremor/react'; // Assuming you have Tremor components or similar

import {
    updateStudentDetailsInClasses,
    updateTeacherDetailsInDocuments
} from '../services/firestoreService';

const FormField = ({ label, children, icon: Icon }) => (
    <div className="relative">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
        {Icon && (
            // Adjusted 'top' for better vertical alignment with input text
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ top: '0.625rem' }}>
                <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
        )}
        {children}
    </div>
);

const ProfilePage = () => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState({ firstName: '', lastName: '', gender: '', photoURL: '' });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (userProfile) {
            setProfile({
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                gender: userProfile.gender || 'Not specified',
                photoURL: userProfile.photoURL || '',
            });
            setLoading(false);
        }
    }, [userProfile]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        if (!profile.firstName.trim() || !profile.lastName.trim()) {
            setError('First name and last name cannot be empty.');
            showToast('First name and last name cannot be empty.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                firstName: profile.firstName,
                lastName: profile.lastName,
                gender: profile.gender,
                photoURL: profile.photoURL, // Update photoURL
                displayName: `${profile.firstName} ${profile.lastName}`.trim(), // Update displayName
            });

            // Update user details in related documents (classes, lessons, etc.)
            if (userProfile.isTeacher) {
                await updateTeacherDetailsInDocuments(user.uid, {
                    displayName: `${profile.firstName} ${profile.lastName}`.trim(),
                    email: user.email, // Assuming email is also part of the teacher details to update
                });
            } else { // Assume student
                await updateStudentDetailsInClasses(user.uid, {
                    displayName: `${profile.firstName} ${profile.lastName}`.trim(),
                    email: user.email, // Assuming email is also part of the student details to update
                });
            }

            await refreshUserProfile(); // Refresh the user profile in AuthContext
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            console.error("Error updating profile: ", err);
            setError("Failed to update profile. Please try again.");
            showToast('Failed to update profile.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl"> {/* Overall page background */}
            <div className="w-full max-w-3xl bg-white shadow-xl rounded-2xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
                {/* Profile Header Section */}
                <div className="bg-gradient-to-r from-red-700 to-red-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 rounded-t-2xl">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserInitialsAvatar user={userProfile} size="2xl" />
                        )}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-1">
                            {userProfile?.displayName || 'Your Profile'}
                        </h2>
                        <p className="text-lg opacity-90 font-medium flex items-center justify-center sm:justify-start gap-2">
                            <EnvelopeIcon className="h-5 w-5" /> {userProfile?.email}
                        </p>
                        {userProfile?.isTeacher && (
                            <p className="text-sm opacity-80 mt-1">Teacher Account</p>
                        )}
                    </div>
                </div>

                {/* Profile Form Section */}
                <div className="p-6 sm:p-8 lg:p-10">
                    <p className="text-lg text-slate-700 mb-8 max-w-prose">
                        Manage your personal information here. Keep your profile updated to ensure smooth communication and a personalized experience.
                    </p>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-3 border-slate-200">Personal Details</h3>
                        <form onSubmit={handleProfileSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                <FormField label="First Name" icon={UserCircleIcon}>
                                    <TextInput
                                        value={profile.firstName}
                                        onValueChange={(val) => setProfile({ ...profile, firstName: val })}
                                        placeholder="Enter your first name"
                                        // Enhanced focus styling and padding for icon
                                        className="pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    />
                                </FormField>
                                <FormField label="Last Name" icon={UserCircleIcon}>
                                    <TextInput
                                        value={profile.lastName}
                                        onValueChange={(val) => setProfile({ ...profile, lastName: val })}
                                        placeholder="Enter your last name"
                                        // Enhanced focus styling and padding for icon
                                        className="pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    />
                                </FormField>
                                <FormField label="Profile Picture URL" icon={PhotoIcon}>
                                    <TextInput
                                        value={profile.photoURL}
                                        onValueChange={(val) => setProfile({ ...profile, photoURL: val })}
                                        placeholder="Paste image link here"
                                        className="pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    />
                                </FormField>
                                <FormField label="Gender" icon={IdentificationIcon}>
                                    <div className="relative">
                                        <select
                                            value={profile.gender}
                                            onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                            // Enhanced focus styling, padding for icon, and custom arrow
                                            className="w-full p-2.5 pl-10 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition appearance-none pr-10"
                                        >
                                            <option value="Not specified">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {/* Custom dropdown arrow */}
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" style={{ top: '0.625rem' }}>
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </FormField>
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm text-center mt-4">{error}</p>
                            )}

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    loading={isSubmitting} // Use Tremor's loading prop
                                    disabled={isSubmitting}
                                    className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white font-bold py-3 px-6 rounded-xl hover:from-red-800 hover:to-red-950 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.005]" // Enhanced button
                                >
                                    {isSubmitting ? 'Saving Changes...' : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;