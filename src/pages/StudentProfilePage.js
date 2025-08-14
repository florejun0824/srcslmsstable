import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase'; // Ensure this path is correct for your Firebase init
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon, PhotoIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

import { TextInput, Button, Callout, Card } from '@tremor/react';

import {
    updateStudentDetailsInClasses,
} from '../services/firestoreService'; // Make sure this path is correct and functions are implemented

const FormField = ({ label, children, icon: Icon }) => (
    <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ top: '0.625rem' }}>
                <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
        )}
        {children}
    </div>
);

const StudentProfilePage = ({ authLoading }) => {
    const { user, userProfile, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState({ firstName: '', lastName: '', gender: '', photoURL: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        console.log("StudentProfilePage useEffect - authLoading:", authLoading, "user:", user, "userProfile:", userProfile, "user.id:", user?.id);

        if (!authLoading && userProfile) {
            setProfile({
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                gender: userProfile.gender || 'Not specified',
                photoURL: userProfile.photoURL || '',
            });
        }
    }, [user, userProfile, authLoading]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        console.log("Attempting profile update. Current user:", user, "Current userProfile:", userProfile, "user.id at submission:", user?.id);

        if (!user || !user.id) {
            const errorMessage = "Authentication error: User not logged in or ID missing. Please log in again.";
            setError(errorMessage);
            showToast(errorMessage, 'error');
            setIsSubmitting(false);
            console.error("Profile update failed: No user or ID found at submission.", user);
            return;
        }

        if (!profile.firstName.trim() || !profile.lastName.trim()) {
            const errorMessage = 'First name and last name cannot be empty.';
            setError(errorMessage);
            showToast(errorMessage, 'error');
            setIsSubmitting(false);
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, {
                firstName: profile.firstName,
                lastName: profile.lastName,
                gender: profile.gender,
                photoURL: profile.photoURL,
                displayName: `${profile.firstName} ${profile.lastName}`.trim(),
            });

            await updateStudentDetailsInClasses(user.id, {
                displayName: `${profile.firstName} ${profile.lastName}`.trim(),
                email: user.email,
            });

            await refreshUserProfile();
            setSuccessMessage('Profile updated successfully!');
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            console.error("Error updating profile:", err);
            if (err.code === 'permission-denied') {
                setError("Permission denied. You do not have the necessary rights to update this profile. Please check Firebase security rules for 'users' and 'classes' collections.");
            } else if (err.code === 'not-found') {
                setError("Profile document not found. The user's document or a related class document may have been deleted.");
            } else {
                setError(`Failed to update profile: ${err.message || 'An unknown error occurred. Check console for details.'}`);
            }
            showToast('Failed to update profile.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || !userProfile) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl">
            <Card className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl transform transition-all duration-300 hover:shadow-2xl border border-slate-100">
                {/* Profile Header Section - Enhanced Design */}
                <div className="bg-gradient-to-r from-red-700 to-red-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-6 rounded-t-2xl">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0 flex items-center justify-center">
                        {userProfile?.photoURL ? (
                            // --- IMPORTANT CHANGE: Added object-position-top to image ---
                            <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover object-position-top" />
                        ) : (
                            <UserInitialsAvatar
                                user={userProfile}
                                className="w-full h-full text-6xl text-red-700 bg-white flex items-center justify-center"
                            />
                        )}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-4xl font-extrabold tracking-tight mb-1">
                            {userProfile?.displayName || 'Student Profile'}
                        </h2>
                        <p className="text-lg opacity-90 font-medium flex items-center justify-center sm:justify-start gap-2">
                            <EnvelopeIcon className="h-6 w-6" /> {userProfile?.email}
                        </p>
                        <p className="text-base opacity-80 mt-2">Student Account</p>
                    </div>
                </div>

                {/* Profile Form Section */}
                <div className="p-6 sm:p-8 lg:p-10">
                    <p className="text-lg text-slate-700 mb-8 max-w-prose">
                        Update your personal information to keep your profile current. This helps in personalizing your learning experience.
                    </p>

                    <Card className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-3 border-slate-200">Personal Details</h3>
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <FormField label="First Name" icon={UserCircleIcon}>
                                    <TextInput
                                        value={profile.firstName}
                                        onValueChange={(val) => setProfile({ ...profile, firstName: val })}
                                        placeholder="Enter your first name"
                                        className="pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    />
                                </FormField>
                                <FormField label="Last Name" icon={UserCircleIcon}>
                                    <TextInput
                                        value={profile.lastName}
                                        onValueChange={(val) => setProfile({ ...profile, lastName: val })}
                                        placeholder="Enter your last name"
                                        className="pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    />
                                </FormField>
                                <FormField label="Profile Picture URL" icon={PhotoIcon}>
                                    <TextInput
                                        value={profile.photoURL}
                                        onValueChange={(val) => setProfile({ ...profile, photoURL: val })}
                                        placeholder="Paste image link here (e.g., https://example.com/image.jpg)"
                                        className="pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                    />
                                </FormField>
                                <FormField label="Gender" icon={IdentificationIcon}>
                                    <div className="relative">
                                        <select
                                            value={profile.gender}
                                            onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                            className="w-full p-2.5 pl-10 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition appearance-none pr-10"
                                        >
                                            <option value="Not specified">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700" style={{ top: '0.625rem' }}>
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </FormField>
                            </div>

                            {error && (
                                <Callout
                                    className="mt-6"
                                    title="Update Failed"
                                    icon={ExclamationCircleIcon}
                                    color="rose"
                                >
                                    {error}
                                </Callout>
                            )}
                            {successMessage && (
                                <Callout
                                    className="mt-6"
                                    title="Update Successful"
                                    icon={CheckCircleIcon}
                                    color="teal"
                                >
                                    {successMessage}
                                </Callout>
                            )}

                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    loading={isSubmitting}
                                    disabled={isSubmitting || authLoading || !user?.id}
                                    className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white font-bold py-3.5 px-6 rounded-xl hover:from-red-800 hover:to-red-950 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.005]"
                                >
                                    {isSubmitting ? 'Saving Changes...' : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </Card>
        </div>
    );
};

export default StudentProfilePage;
