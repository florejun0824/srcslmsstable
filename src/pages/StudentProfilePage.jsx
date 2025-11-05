import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import {
    EnvelopeIcon,
    PencilIcon,
    SparklesIcon,
    FingerPrintIcon,
    RocketLaunchIcon,
    TrophyIcon,
    AcademicCapIcon,
    StarIcon,
} from '@heroicons/react/24/solid';
import { updateStudentDetailsInClasses } from '../services/firestoreService';

import { Switch } from '@headlessui/react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

import EditStudentProfileModal from '../components/student/EditStudentProfileModal';

import DOMPurify from 'dompurify';

// Helper for class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Helper to sanitize HTML before rendering
const createMarkup = (htmlContent) => {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if ('target' in node) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });
    const sanitized = DOMPurify.sanitize(htmlContent, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['iframe'], 
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
    });
    return { __html: sanitized };
};


const XPProgressBar = ({ level, currentXP, xpInThisLevel, xpNeededForThisLevel, xpGain }) => {
    // ... (No changes in this component)
    const percentage = xpNeededForThisLevel > 0 ? (xpInThisLevel / xpNeededForThisLevel) * 100 : 0;

    return (
        <div className="mt-4 relative">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Level {level}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {xpInThisLevel.toLocaleString()} / {xpNeededForThisLevel.toLocaleString()} XP
                </span>
            </div>
            <div className="relative w-full bg-neumorphic-base shadow-neumorphic-inset rounded-full h-3 overflow-hidden dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${xpGain > 0 ? 'xp-pulse' : 'bg-blue-500 dark:bg-blue-400'}`}
                    style={{ width: `${percentage}%` }}
                />
                {xpGain > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-600 dark:text-blue-300 font-bold animate-pulse">
                        +{xpGain} XP
                    </div>
                )}
            </div>
            <div className="text-right text-xs text-slate-400 dark:text-slate-500 mt-1">
                Total XP: {currentXP.toLocaleString()}
            </div>
        </div>
    );
};

const TITLE_MAP = {
    'title_adept': 'Adept',
    'title_guru': 'Guru',
    'title_legend': 'Legend',
};

const BADGE_MAP = {
  'first_quiz': { icon: RocketLaunchIcon, title: 'First Quiz' },
  'perfect_score': { icon: TrophyIcon, title: 'Perfect Score' },
  'badge_scholar': { icon: AcademicCapIcon, title: 'Scholar' },
  'badge_master': { icon: StarIcon, title: 'Master' },
  'badge_legend': { icon: SparklesIcon, title: 'Legend' },
};

const StudentProfilePage = () => {
    const { user, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        photoURL: '',
        customBio: '',
        xp: 0,
        level: 1
    });

    const [xpGain, setXpGain] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTogglingCosmetics, setIsTogglingCosmetics] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const isInitialXpLoad = useRef(true);

    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isLoadingBiometrics, setIsLoadingBiometrics] = useState(true);


    // --- THIS IS THE FIX ---
    useEffect(() => {
        // --- MODIFIED: Removed the "!profile.firstName" check ---
        // This ensures the local 'profile' state always syncs
        // with the global 'userProfile' when it's refreshed.
        if (!authLoading && userProfile) {
            setProfile(prev => ({
                ...prev,
                xp: userProfile.xp || 0,
                level: userProfile.level || 1,
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                gender: userProfile.gender || 'Not specified',
                photoURL: userProfile.photoURL || '',
                customBio: userProfile.customBio || '',
            }));
        }
    }, [authLoading, userProfile]); // This dependency array is correct
    // --- END OF FIX ---

    useEffect(() => {
        // ... (No changes in this useEffect)
        const checkBiometricStatus = async () => {
            try {
                const { isAvailable } = await BiometricAuth.checkBiometry();
                setIsBiometricSupported(isAvailable);

                if (isAvailable) {
                    const { value } = await Preferences.get({ key: 'userCredentials' });
                    setIsBiometricEnabled(!!value);
                }
            } catch (error) {
                console.error("Failed to check biometric status:", error);
                setIsBiometricSupported(false);
            } finally {
                setIsLoadingBiometrics(false);
            }
        };

        checkBiometricStatus();
    }, []);

    useEffect(() => {
        // ... (No changes in this useEffect)
         if (!userProfile) return;
        const prevXp = profile.xp || 0;
        const newXp = userProfile.xp || 0;
        if (isInitialXpLoad.current) {
            if (newXp !== prevXp) {
                setProfile(prev => ({ ...prev, xp: newXp, level: userProfile.level || prev.level }));
            }
            isInitialXpLoad.current = false;
            return;
        }
        if (newXp > prevXp) {
            const gained = newXp - prevXp;
            setXpGain(gained);
            setProfile(prev => ({ ...prev, xp: newXp, level: userProfile.level || prev.level }));
            const timeout = setTimeout(() => setXpGain(0), 1500);
            return () => clearTimeout(timeout);
        } else if (newXp !== prevXp) {
            setProfile(prev => ({ ...prev, xp: newXp, level: userProfile.level || prev.level }));
        }
    }, [userProfile?.xp]);

    useEffect(() => {
        // ... (No changes in this useEffect)
        if (!userProfile) return;
        const prevLevel = profile.level || 1;
        const newLevel = userProfile.level || 1;
        if (newLevel > prevLevel) {
            setXpGain(0);
            setProfile(prev => ({ ...prev, level: newLevel }));
        }
    }, [userProfile?.level]);

    const handleModalProfileSubmit = async (updates) => {
        // ... (No changes in this function)
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

        if (!updates.firstName || !updates.lastName) {
            const msg = 'First and last names are required.';
            setError(msg);
            showToast(msg, 'error');
            setIsSubmitting(false);
            return;
        }

        try {
            const userDocRef = doc(db, 'users', user.id);
            const { firstName, lastName, gender, photoURL, customBio } = updates;
            const updatedData = {
                firstName,
                lastName,
                gender,
                photoURL,
                customBio, 
                displayName: `${firstName} ${lastName}`.trim(),
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
            setIsEditModalOpen(false); 
        } catch (err) {
            console.error("Error updating profile:", err);
            const msg = `Failed to update profile: ${err.message}`;
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    useEffect(() => {
        // ... (No changes)
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        // ... (No changes)
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleToggleCosmetics = async (enabled) => {
        // ... (No changes)
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

    const handleBiometricToggle = async (enabled) => {
        // ... (No changes)
        if (enabled) {
            showToast(
                "Please log out and log in with your password to enable biometrics.", 
                "info"
            );
        } else {
            try {
                await Preferences.remove({ key: 'userCredentials' });
                setIsBiometricEnabled(false);
                showToast("Biometric Login Disabled", "success");
            } catch (error) {
                console.error("Failed to disable biometrics:", error);
                showToast("Could not disable biometric login.", "error");
            }
        }
    };

    if (authLoading || !userProfile) {
        // ... (No changes)
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Spinner size="lg" />
            </div>
        );
    }

    // ... (No changes to variable calculations)
    const currentLevel = profile.level || 1;
    const currentXP = profile.xp || 0;
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

    const getBackgroundClass = () => {
        // ... (No changes)
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
        <div className="max-w-4xl mx-auto">
            {/* --- The background class is applied here --- */}
            <div className={`bg-neumorphic-base p-6 sm:p-8 rounded-3xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg ${backgroundClass}`}>
                
                {/* --- z-10 wrapper --- */}
                <div className="relative z-10">

                    <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 border-b border-slate-200/80 dark:border-slate-700 pb-8">
                        
                        <div className="relative flex-shrink-0">
                            <UserInitialsAvatar
                                user={userProfile}
                                size="xl"
                                borderType={selectedBorder}
                                effectsEnabled={cosmeticsEnabled}
                                className="w-28 h-28"
                            />
                        </div>
                        
                        <div className="text-center sm:text-left flex-1 w-full">
                            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                    {userProfile?.displayName || 'Student Profile'}
                                    {xpGain > 0 && <SparklesIcon className="h-5 w-5 text-yellow-400 animate-ping" />}
                                </h1>
                            </div>

                            {cosmeticsEnabled && displayTitleName && (
                                <span className="mt-2 px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md inline-block">
                                    {displayTitleName}
                                </span>
                            )}

                            <p className="text-md text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-2 mt-2">
                                <EnvelopeIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" /> {userProfile?.email}
                            </p>
                            
                            {canSetBio && (
                                <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                                    {customBio ? (
                                        <div
                                            className="bio-content-display text-sm text-slate-600 dark:text-slate-300 px-2 py-1 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block max-w-full dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark"
                                            dangerouslySetInnerHTML={createMarkup(customBio)}
                                        />
                                    ) : (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                            No bio set.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-4 flex justify-center sm:justify-start">
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 ring-1 ring-black/10 dark:ring-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    title="Edit Profile"
                                >
                                    <PencilIcon className="h-4 w-4" />
                                    Edit Profile
                                </button>
                            </div>

                            <XPProgressBar
                                level={currentLevel}
                                currentXP={currentXP}
                                xpInThisLevel={xpInThisLevel}
                                xpNeededForThisLevel={xpNeededForThisLevel}
                                xpGain={xpGain}
                            />
                        </div>
                    </div>

                    
                    <div className="mb-8 bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg flex items-center justify-between">
                        {/* ... (No changes to cosmetics toggle) ... */}
                        <label htmlFor="cosmetics-toggle-profile" className="font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">
                            Enable Cosmetic Effects
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                                Toggles borders, backgrounds, titles, etc.
                            </span>
                        </label>
                        <button
                            type="button"
                            id="cosmetics-toggle-profile"
                            role="switch"
                            aria-checked={cosmeticsEnabled}
                            onClick={() => handleToggleCosmetics(!cosmeticsEnabled)}
                            disabled={isTogglingCosmetics}
                            className={`relative w-14 h-8 flex-shrink-0 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${cosmeticsEnabled ? 'bg-green-500 shadow-neumorphic-inset dark:bg-green-400 dark:shadow-neumorphic-inset-dark' : 'bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg'} disabled:opacity-50`}
                        >
                            <span className="sr-only">Toggle Cosmetic Effects</span>
                            <span
                                aria-hidden="true"
                                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white dark:bg-slate-300 shadow-md transform transition-all duration-300 ease-in-out ${cosmeticsEnabled ? 'translate-x-6 shadow-none' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                    
                    {badges.length > 0 && (
                        <div className="mb-8">
                            {/* ... (No changes to badges) ... */}
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Your Badges</h2>
                            <div className="flex flex-wrap gap-4">
                                {badges.map(badgeKey => {
                                    const badge = BADGE_MAP[badgeKey];
                                    if (!badge) return null;
                                    const { icon: Icon, title } = badge;
                                    return (
                                        <div key={badgeKey} className="flex flex-col items-center justify-center text-center p-4 w-28 h-28 bg-neumorphic-base rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg" title={title}>
                                            <Icon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2">
                                                {title}
                                            </span>
                                        </div>
                                    );
B                                })}
                            </div>
                        </div>
                    )}
                    
                    {isBiometricSupported && !isLoadingBiometrics && (
                        <div className="mb-8 bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
                            {/* ... (No changes to biometrics) ... */}
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 -mt-1 flex items-center gap-2">
                            <FingerPrintIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            Security
                            </h3>
                            <Switch.Group as="div" className="flex items-center justify-between">
                                <span className="flex-grow flex flex-col">
                                    <Switch.Label as="span" className="font-semibold text-slate-800 dark:text-slate-100 cursor-pointer" passive>
                                        Biometric Login
                                    </Switch.Label>
                                    <Switch.Description as="span" className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {isBiometricEnabled ? "Enabled" : "Disabled"}. Use Face/Fingerprint to log in.
                                    </Switch.Description>
                                </span>
                                <Switch
                                    checked={isBiometricEnabled}
                                    onChange={handleBiometricToggle}
                                    className={classNames(
                                        isBiometricEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700',
                                        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={classNames(
                                            isBiometricEnabled ? 'translate-x-5' : 'translate-x-0',
                                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                                        )}
                                    />
                                </Switch>
                            </Switch.Group>
                        </div>
                    )}
                
                </div> {/* --- END: z-10 wrapper --- */}

            </div>

            {/* --- Modals --- */}
            {isEditModalOpen && ( 
                <EditStudentProfileModal
                    user={profile}
                    canSetBio={canSetBio} 
                    onSubmit={handleModalProfileSubmit}
                    onClose={() => {
                        setIsEditModalOpen(false); 
                        setError(''); 
                        setSuccessMessage(''); 
                    }}
                    isLoading={isSubmitting}
                    error={error}
                    successMessage={successMessage}
                />
            )}
            
        </div>
    );
};

export default StudentProfilePage;