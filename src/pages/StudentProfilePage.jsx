import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon, PhotoIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

import { TextInput, Button, Callout, Card } from '@tremor/react';

import {
    updateStudentDetailsInClasses,
} from '../services/firestoreService';

// iOS Vibe: A cleaner, more modern form field component
const FormField = ({ label, children, icon: Icon }) => (
    <div className="relative">
        <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
        {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ top: '0.625rem' }}>
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

        if (!user || !user.id) {
            const errorMessage = "Authentication error: User ID is missing. Please log in again.";
            setError(errorMessage);
            showToast(errorMessage, 'error');
            setIsSubmitting(false);
            return;
        }

        if (!profile.firstName.trim() || !profile.lastName.trim()) {
            const errorMessage = 'First and last names are required.';
            setError(errorMessage);
            showToast(errorMessage, 'error');
            setIsSubmitting(false);
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.id);
            const updatedData = {
                firstName: profile.firstName,
                lastName: profile.lastName,
                gender: profile.gender,
                photoURL: profile.photoURL,
                displayName: `${profile.firstName} ${profile.lastName}`.trim(),
            };
            await updateDoc(userDocRef, updatedData);

            await updateStudentDetailsInClasses(user.id, {
                displayName: updatedData.displayName,
                email: user.email,
            });

            await refreshUserProfile();
            setSuccessMessage('Profile updated successfully!');
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            console.error("Error updating profile:", err);
            const errorMessage = `Failed to update profile: ${err.message}`;
            setError(errorMessage);
            showToast(errorMessage, 'error');
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
        // iOS Vibe: Added padding and a subtle background for the page container itself
        <div className="min-h-full flex items-center justify-center p-4">
            {/* iOS Vibe: Card with a more pronounced floating shadow */}
            <Card className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-lg-floating-md border border-slate-200/80 p-0 transition-all duration-300 ease-out hover:shadow-xl-floating-lg">
                {/* iOS Vibe: Enhanced header with a more vibrant gradient and typography */}
                <div className="bg-gradient-to-br from-red-600 to-red-800 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:justify-start gap-6">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/80 shadow-xl-floating flex-shrink-0 flex items-center justify-center transform hover:scale-[1.03] transition-transform duration-300">
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover object-center" />
                        ) : (
                            <UserInitialsAvatar
                                user={userProfile}
                                className="w-full h-full text-6xl text-red-700 bg-white flex items-center justify-center"
                            />
                        )}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-4xl font-bold tracking-tight">
                            {userProfile?.displayName || 'Student Profile'}
                        </h2>
                        <p className="text-lg opacity-90 font-medium flex items-center justify-center sm:justify-start gap-2.5 mt-1">
                            <EnvelopeIcon className="h-5 w-5" /> {userProfile?.email}
                        </p>
                    </div>
                </div>

                {/* Profile Form Section */}
                <div className="p-6 sm:p-8 lg:p-10 bg-white">
                    <p className="text-md text-slate-600 mb-8 max-w-prose">
                        Keep your profile up-to-date. Changes made here will be reflected across the platform.
                    </p>

                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                            <FormField label="First Name" icon={UserCircleIcon}>
                                <TextInput
                                    value={profile.firstName}
                                    onValueChange={(val) => setProfile({ ...profile, firstName: val })}
                                    placeholder="Your first name"
                                    className="pl-11 bg-slate-100 border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                                />
                            </FormField>
                            <FormField label="Last Name" icon={UserCircleIcon}>
                                <TextInput
                                    value={profile.lastName}
                                    onValueChange={(val) => setProfile({ ...profile, lastName: val })}
                                    placeholder="Your last name"
                                    className="pl-11 bg-slate-100 border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                                />
                            </FormField>
                            <FormField label="Profile Picture URL" icon={PhotoIcon}>
                                <TextInput
                                    value={profile.photoURL}
                                    onValueChange={(val) => setProfile({ ...profile, photoURL: val })}
                                    placeholder="https://example.com/image.jpg"
                                    className="pl-11 bg-slate-100 border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                                />
                            </FormField>
                            <FormField label="Gender" icon={IdentificationIcon}>
                                <div className="relative">
                                    <select
                                        value={profile.gender}
                                        onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                        className="w-full p-2.5 pl-10 text-tremor-default bg-slate-100 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition appearance-none"
                                    >
                                        <option value="Not specified">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                </div>
                            </FormField>
                        </div>

                        {error && (
                            <Callout title="Update Failed" icon={ExclamationCircleIcon} color="rose" className="mt-6">
                                {error}
                            </Callout>
                        )}
                        {successMessage && (
                            <Callout title="Success" icon={CheckCircleIcon} color="teal" className="mt-6">
                                {successMessage}
                            </Callout>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                loading={isSubmitting}
                                disabled={isSubmitting || authLoading || !user?.id}
                                // iOS Vibe: Button with a more pronounced floating shadow
                                className="w-full sm:w-auto bg-gradient-to-br from-red-600 to-red-700 text-white font-bold py-3 px-8 rounded-xl hover:from-red-700 transition-all duration-300 shadow-lg-floating-xs hover:shadow-lg-floating-sm disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-[1.03]"
                            >
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default StudentProfilePage;