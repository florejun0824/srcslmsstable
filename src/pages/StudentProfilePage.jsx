import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon, PhotoIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { updateStudentDetailsInClasses } from '../services/firestoreService';

// Neumorphic styled input field
const NeumorphicFormField = ({ label, icon: Icon, children }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5 px-1">{label}</label>
        <div className="flex items-center gap-3 bg-neumorphic-base shadow-neumorphic-inset rounded-xl px-4">
            {Icon && <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />}
            {children}
        </div>
    </div>
);

const StudentProfilePage = () => {
    const { user, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
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
    }, [userProfile, authLoading]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        if (!user?.id) {
            const msg = "Authentication error: User ID is missing. Please log in again.";
            setError(msg);
            showToast(msg, 'error');
            setIsSubmitting(false);
            return;
        }

        if (!profile.firstName.trim() || !profile.lastName.trim()) {
            const msg = 'First and last names are required.';
            setError(msg);
            showToast(msg, 'error');
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

            // ✅ MODIFIED: Pass the full updated data object to ensure firstName,
            // lastName, and photoURL are updated in the class documents for the teacher's view.
            await updateStudentDetailsInClasses(user.id, {
                firstName: updatedData.firstName,
                lastName: updatedData.lastName,
                displayName: updatedData.displayName,
                photoURL: updatedData.photoURL,
            });

            await refreshUserProfile();
            setSuccessMessage('Profile updated successfully!');
            showToast('Profile updated successfully!', 'success');
        } catch (err) {
            console.error("Error updating profile:", err);
            const msg = `Failed to update profile: ${err.message}`;
            setError(msg);
            showToast(msg, 'error');
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
        <div className="max-w-4xl mx-auto">
            <div className="bg-neumorphic-base p-6 sm:p-8 rounded-3xl shadow-neumorphic">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-slate-200/80 pb-8">
                    <div className="relative w-28 h-28 flex-shrink-0">
                        <div className="w-full h-full bg-neumorphic-base shadow-neumorphic rounded-full flex items-center justify-center p-1.5">
                            {userProfile?.photoURL ? (
                                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <UserInitialsAvatar
                                    user={userProfile}
                                    className="w-full h-full text-5xl bg-red-100 text-red-700 flex items-center justify-center rounded-full"
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-center sm:text-left">
                        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                            {userProfile?.displayName || 'Student Profile'}
                        </h1>
                        <p className="text-md text-slate-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                            <EnvelopeIcon className="h-5 w-5 text-slate-400" /> {userProfile?.email}
                        </p>
                    </div>
                </div>

                {/* Profile Form Section */}
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NeumorphicFormField label="First Name" icon={UserCircleIcon}>
                            <input
                                type="text"
                                value={profile.firstName}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                placeholder="Your first name"
                                className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none"
                            />
                        </NeumorphicFormField>
                        <NeumorphicFormField label="Last Name" icon={UserCircleIcon}>
                            <input
                                type="text"
                                value={profile.lastName}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                placeholder="Your last name"
                                className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none"
                            />
                        </NeumorphicFormField>
                        <NeumorphicFormField label="Profile Picture URL" icon={PhotoIcon}>
                             <input
                                type="url"
                                value={profile.photoURL}
                                onChange={(e) => setProfile({ ...profile, photoURL: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none"
                            />
                        </NeumorphicFormField>
                        <NeumorphicFormField label="Gender" icon={IdentificationIcon}>
                            <select
                                value={profile.gender}
                                onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                className="w-full bg-transparent py-3 text-slate-800 outline-none border-none appearance-none cursor-pointer"
                            >
                                <option value="Not specified">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </NeumorphicFormField>
                    </div>

                    {error && (
                        <div className="mt-6 p-4 rounded-xl bg-red-50 border-l-4 border-red-400 flex items-center gap-3">
                            <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                    {successMessage && (
                         <div className="mt-6 p-4 rounded-xl bg-green-50 border-l-4 border-green-400 flex items-center gap-3">
                            <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
                            <p className="text-sm text-green-800">{successMessage}</p>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-neumorphic-base text-red-600 font-bold py-3 px-8 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-[1.03]"
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentProfilePage;