import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { EnvelopeIcon, UserCircleIcon, IdentificationIcon, PhotoIcon, CheckCircleIcon, ExclamationCircleIcon, PencilIcon } from '@heroicons/react/24/solid';
import { updateStudentDetailsInClasses } from '../services/firestoreService';
import { Switch } from '@tremor/react'; // Keep the import

// Neumorphic styled input field (Unchanged)
const NeumorphicFormField = ({ label, icon: Icon, children, className = '' }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-600 mb-1.5 px-1">{label}</label>
        <div className="flex items-center gap-3 bg-neumorphic-base shadow-neumorphic-inset rounded-xl px-4">
            {Icon && <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />}
            {children}
        </div>
    </div>
);

// XP Progress Bar Component (Unchanged)
const XPProgressBar = ({ level, currentXP, xpInThisLevel, xpNeededForThisLevel }) => {
    const percentage = xpNeededForThisLevel > 0 ? (xpInThisLevel / xpNeededForThisLevel) * 100 : 0;

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-blue-600">Level {level}</span>
                <span className="text-xs font-medium text-slate-500">
                    {xpInThisLevel.toLocaleString()} / {xpNeededForThisLevel.toLocaleString()} XP
                </span>
            </div>
            <div className="w-full bg-neumorphic-base shadow-neumorphic-inset rounded-full h-3 overflow-hidden">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className="text-right text-xs text-slate-400 mt-1">
                Total XP: {currentXP.toLocaleString()}
            </div>
        </div>
    );
};

// Title Mapping (Unchanged)
const TITLE_MAP = {
    'title_adept': 'Adept',
    'title_guru': 'Guru',
    'title_legend': 'Legend',
};

// Updated Badge Map (Unchanged)
const BADGE_MAP = {
    'first_quiz': { icon: '🚀', title: 'First Quiz' },
    'perfect_score': { icon: '🏆', title: 'Perfect Score' },
    'badge_scholar': { icon: '🎓', title: 'Scholar' },
    'badge_master': { icon: '🌟', title: 'Master' },
    'badge_legend': { icon: '👑', title: 'Legend' },
};

const StudentProfilePage = () => {
    const { user, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const [profile, setProfile] = useState({ firstName: '', lastName: '', gender: '', photoURL: '', customBio: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTogglingCosmetics, setIsTogglingCosmetics] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!authLoading && userProfile) {
            setProfile({
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                gender: userProfile.gender || 'Not specified',
                photoURL: userProfile.photoURL || '',
                customBio: userProfile.customBio || '',
            });
        }
    }, [userProfile, authLoading]);

    // Handler to save profile changes (Unchanged)
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
                customBio: profile.customBio || '',
            };
            await updateDoc(userDocRef, updatedData);

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

    // Handler for Cosmetics Toggle (Unchanged)
    const handleToggleCosmetics = async (enabled) => {
        if (!user?.id || isTogglingCosmetics) return;
        setIsTogglingCosmetics(true);
        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, { cosmeticsEnabled: enabled });
            await refreshUserProfile();
            showToast(`Cosmetic effects ${enabled ? 'enabled' : 'disabled'}.`, 'success');
        } catch (err) {
            console.error("Error toggling cosmetics:", err);
            showToast(`Failed to update setting: ${err.message}`, 'error');
        } finally {
            setIsTogglingCosmetics(false);
        }
    };


    if (authLoading || !userProfile) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    // --- Reward/Cosmetic Data (Unchanged) ---
    const currentLevel = userProfile.level || 1;
    const currentXP = userProfile.xp || 0;
    const xpForCurrentLevel = ((currentLevel - 1) * currentLevel / 2) * 500;
    const xpForNextLevel = (currentLevel * (currentLevel + 1) / 2) * 500;
    const xpInThisLevel = currentXP - xpForCurrentLevel;
    const xpNeededForThisLevel = xpForNextLevel - xpForCurrentLevel;

    const badges = userProfile.genericBadges || [];
    const displayTitleId = userProfile.displayTitle;
    const displayTitleName = displayTitleId ? TITLE_MAP[displayTitleId] : null;
    const canSetBio = userProfile.canSetBio || false;
    const customBio = userProfile.customBio || '';
    const selectedBorder = userProfile.selectedBorder || 'none';
    const selectedBackground = userProfile.selectedBackground || 'none';
    const cosmeticsEnabled = userProfile.cosmeticsEnabled ?? true;
    // --- End Reward/Cosmetic Data ---

    // Background Class Logic (Unchanged)
    const getBackgroundClass = () => {
        if (!cosmeticsEnabled || selectedBackground === 'none') return '';
        const bgClassMap = {
            'bg_pattern_1': 'profile-bg-pattern-1',
            'bg_pattern_2': 'profile-bg-pattern-2',
            'bg_pattern_elite': 'profile-bg-elite',
            'bg_pattern_legendary': 'profile-bg-legendary',
        };
        return bgClassMap[selectedBackground] || '';
    };
    const backgroundClass = getBackgroundClass();

    return (
        <div className={`max-w-4xl mx-auto ${backgroundClass}`}>
            <div className="bg-neumorphic-base p-6 sm:p-8 rounded-3xl shadow-neumorphic">
                {/* Header Section (Unchanged content, just Avatar props) */}
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-slate-200/80 pb-8">
                    <UserInitialsAvatar
                        user={userProfile}
                        size="xl"
                        borderType={selectedBorder}
                        effectsEnabled={cosmeticsEnabled}
                        className="w-28 h-28 flex-shrink-0"
                    />
                    <div className="text-center sm:text-left flex-1 w-full">
                        <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                             <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                                {userProfile?.displayName || 'Student Profile'}
                            </h1>
                            {cosmeticsEnabled && displayTitleName && (
                                <span className="mt-1 px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md">
                                    {displayTitleName}
                                </span>
                            )}
                        </div>
                        <p className="text-md text-slate-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                            <EnvelopeIcon className="h-5 w-5 text-slate-400" /> {userProfile?.email}
                        </p>
                        {canSetBio && customBio && (
                             <p className="mt-2 text-sm text-slate-600 italic px-2 py-1 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block max-w-full truncate" title={customBio}>
                                "{customBio}"
                             </p>
                        )}
                        <XPProgressBar
                            level={currentLevel}
                            currentXP={currentXP}
                            xpInThisLevel={xpInThisLevel}
                            xpNeededForThisLevel={xpNeededForThisLevel}
                        />
                    </div>
                </div>

                {/* Badges Section (Unchanged) */}
                {badges.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Your Badges</h2>
                        <div className="flex flex-wrap gap-4">
                            {badges.map(badgeKey => {
                                const badge = BADGE_MAP[badgeKey];
                                if (!badge) return null;
                                return (
                                    <div key={badgeKey} className="flex flex-col items-center justify-center text-center p-4 w-28 h-28 bg-neumorphic-base rounded-2xl shadow-neumorphic" title={badge.title}>
                                        <span className="text-4xl">{badge.icon}</span>
                                        <span className="text-xs font-semibold text-slate-600 mt-2">{badge.title}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                 {/* --- MODIFIED: Cosmetics Toggle --- */}
                <div className="mb-8 bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic flex items-center justify-between">
                    <label htmlFor="cosmetics-toggle-profile" className="font-semibold text-slate-800">
                        Enable Cosmetic Effects
                        <span className="block text-xs text-slate-500">Toggles borders, backgrounds, titles, etc.</span>
                    </label>
                    {/* Apply iOS styling classes */}
                    <Switch
                        id="cosmetics-toggle-profile"
                        checked={cosmeticsEnabled}
                        onChange={handleToggleCosmetics}
                        disabled={isTogglingCosmetics}
                        className="group relative inline-flex h-[22px] w-[42px] flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 bg-gray-200 ui-checked:bg-green-500"
                    >
                         <span
                          aria-hidden="true"
                          className="pointer-events-none inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0.5 ui-checked:translate-x-[20.5px]"
                         />
                    </Switch>
                </div>
                {/* --- END MODIFIED --- */}

                {/* Profile Form Section (Unchanged) */}
                <h2 className="text-xl font-bold text-slate-800 mb-4">Edit Profile</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info Fields */}
                        <NeumorphicFormField label="First Name" icon={UserCircleIcon}>
                            <input
                                type="text"
                                value={profile.firstName}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                placeholder="Your first name"
                                className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                            />
                        </NeumorphicFormField>
                        <NeumorphicFormField label="Last Name" icon={UserCircleIcon}>
                            <input
                                type="text"
                                value={profile.lastName}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                placeholder="Your last name"
                                className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                            />
                        </NeumorphicFormField>
                        <NeumorphicFormField label="Profile Picture URL" icon={PhotoIcon}>
                             <input
                                type="url"
                                value={profile.photoURL}
                                onChange={(e) => setProfile({ ...profile, photoURL: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                            />
                        </NeumorphicFormField>
                        <NeumorphicFormField label="Gender" icon={IdentificationIcon}>
                            <select
                                value={profile.gender}
                                onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                className="w-full bg-transparent py-3 text-slate-800 outline-none border-none appearance-none cursor-pointer focus:ring-0"
                            >
                                <option value="Not specified">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </NeumorphicFormField>
                         {/* End Basic Info Fields */}

                        {/* Custom Bio Field (Conditional) */}
                        {canSetBio && (
                            <NeumorphicFormField label="Custom Bio (Max 100 chars)" icon={PencilIcon} className="md:col-span-2">
                                <input
                                    type="text"
                                    value={profile.customBio}
                                    onChange={(e) => setProfile({ ...profile, customBio: e.target.value.slice(0, 100) })}
                                    placeholder="Write something about yourself..."
                                    maxLength={100}
                                    className="w-full bg-transparent py-3 text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                                />
                            </NeumorphicFormField>
                        )}
                        {/* End Custom Bio Field */}

                    </div>

                    {/* Error Message Display */}
                    {error && (
                        <div className="mt-6 p-4 rounded-xl bg-red-50 border-l-4 border-red-400 flex items-center gap-3">
                            <ExclamationCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                    {/* Success Message Display */}
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