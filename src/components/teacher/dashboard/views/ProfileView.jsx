// src/pages/Profile/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { 
    UserCircleIcon, 
    EnvelopeIcon, 
    IdentificationIcon, 
    KeyIcon, 
    ArrowLeftOnRectangleIcon,
    // --- ADDED: Icon for biometrics ---
    FingerPrintIcon 
} from '@heroicons/react/24/outline';
// --- ADDED: Headless UI for the toggle switch ---
import { Switch } from '@headlessui/react';
// --- ADDED: Biometric/Preferences plugins ---
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
// --- ADDED: Toast context ---
import { useToast } from '../../../../contexts/ToastContext';

// Helper for class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    setChangePasswordModalOpen,
    logout
}) => {
    // --- ADDED: State for the biometric toggle ---
    const { showToast } = useToast();
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isLoadingBiometrics, setIsLoadingBiometrics] = useState(true);

    // --- ADDED: Check biometric status on component load ---
    useEffect(() => {
        const checkBiometricStatus = async () => {
            try {
                const { isAvailable } = await BiometricAuth.checkBiometry();
                setIsBiometricSupported(isAvailable);

                if (isAvailable) {
                    // Check if we have credentials stored
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

    // --- ADDED: Handler for the toggle switch ---
    const handleBiometricToggle = async (enabled) => {
        if (enabled) {
            // --- CANNOT ENABLE from here ---
            // This is a security precaution. We don't have the user's password
            // to re-save securely. They must do it from the login page.
            showToast(
                "Please log out and log in with your password to enable biometrics.", 
                "info"
            );
            // We don't change the state, so the toggle snaps back to 'off'
        } else {
            // --- DISABLE ---
            // This is safe to do. We just remove the credentials.
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


    return (
        <div className="max-w-7xl mx-auto w-full space-y-10 py-8 px-4 font-sans">
            <div className="text-left">
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                    My Profile
                </h1>
                <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                    Manage your account settings and personal information.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* --- Profile Card (Unchanged) --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic p-8 text-center text-slate-800 dark:bg-neumorphic-base-dark dark:shadow-lg dark:text-slate-100">
                        <div className="relative inline-block mb-4 w-32 h-32 rounded-full p-1 bg-neumorphic-base shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                            {userProfile?.photoURL ? (
                                <img
                                    src={userProfile.photoURL}
                                    alt={`${userProfile?.firstName} ${userProfile?.lastName}`}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : (
                                <UserInitialsAvatar
                                    firstName={userProfile?.firstName}
                                    lastName={userProfile?.lastName}
                                    size="full"
                                />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            {userProfile?.firstName} {userProfile?.lastName}
                        </h2>
                        <p className="mt-1 text-base text-slate-500 dark:text-slate-400 font-medium capitalize">{userProfile?.role}</p>
                    </div>
                    <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic divide-y divide-neumorphic-shadow-dark/30 dark:bg-neumorphic-base-dark dark:shadow-lg dark:divide-slate-700">
                        <div className="flex items-center gap-4 p-4">
                            <EnvelopeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            <div className="flex-grow">
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{userProfile?.email}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Email Address</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4">
                            <IdentificationIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            <div className="flex-grow">
                                <p className="font-mono text-sm text-slate-800 dark:text-slate-100">{user?.uid || user?.id}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">User ID</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">

                    {/* --- ADDED: Security Section --- */}
                    {isBiometricSupported && !isLoadingBiometrics && (
                        <>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2">Security</h2>
                            <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                <Switch.Group as="div" className="flex items-center justify-between">
                                    <span className="flex-grow flex flex-col">
                                        <Switch.Label as="span" className="font-semibold text-slate-800 dark:text-slate-100 text-lg" passive>
                                            Biometric Login
                                        </Switch.Label>
                                        <Switch.Description as="span" className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
                        </>
                    )}
                    {/* --- END: Security Section --- */}


                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2">Account Actions</h2>
                    <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button 
                                onClick={() => setEditProfileModalOpen(true)} 
                                className="group text-left bg-neumorphic-base rounded-xl shadow-neumorphic p-6 space-y-4 transition-shadow duration-300 hover:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                            >
                                <div className="p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                    <UserCircleIcon className="w-7 h-7 text-sky-600 dark:text-sky-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Edit Profile</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your name and profile picture.</p>
                                </div>
                            </button>
                            
                            <button 
                                onClick={() => setChangePasswordModalOpen(true)} 
                                className="group text-left bg-neumorphic-base rounded-xl shadow-neumorphic p-6 space-y-4 transition-shadow duration-300 hover:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark"
                            >
                                <div className="p-3 bg-neumorphic-base shadow-neumorphic-inset rounded-lg inline-block dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                    <KeyIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg">Change Password</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Update your account security.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button onClick={logout} 
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-neumorphic-base rounded-xl transition-shadow duration-300 text-red-600 font-semibold shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:text-red-400 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark">
                            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;