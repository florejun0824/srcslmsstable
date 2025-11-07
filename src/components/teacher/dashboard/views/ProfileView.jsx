// src/pages/Profile/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { 
    PencilIcon, 
    EnvelopeIcon, 
    IdentificationIcon, 
    ArrowLeftOnRectangleIcon,
    FingerPrintIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    MapPinIcon,
    PhoneIcon,
    HeartIcon 
} from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { useToast } from '../../../../contexts/ToastContext';

// Helper for class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    logout
}) => {
    // --- Biometric State (Unchanged) ---
    const { showToast } = useToast();
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isLoadingBiometrics, setIsLoadingBiometrics] = useState(true);

    // --- Biometric Effect (Unchanged) ---
    useEffect(() => {
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

    // --- Biometric Handler (Unchanged) ---
    const handleBiometricToggle = async (enabled) => {
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


    return (
        <>
            {/* --- [NEW] Style block for rendering Quill's rich text --- */}
            <style>{`
                .ql-editor-display p,
                .ql-editor-display ol,
                .ql-editor-display ul {
                    margin-bottom: 0.5rem;
                }
                .ql-editor-display p:last-child {
                    margin-bottom: 0;
                }
                .ql-editor-display ol,
                .ql-editor-display ul {
                    padding-left: 1.5em;
                }
                .ql-editor-display li {
                    color: inherit;
                }
                .ql-editor-display a {
                    color: #2563eb; /* Tailwind blue-600 */
                    text-decoration: underline;
                }
                .dark .ql-editor-display a {
                    color: #60a5fa; /* Tailwind blue-400 */
                }
                /* Handle Quill's inline color styles */
                .ql-editor-display .ql-color-red { color: #ef4444; }
                .ql-editor-display .ql-color-blue { color: #3b82f6; }
                /* Add more colors as needed from your Quill config */
            `}</style>
        
            <div className="max-w-7xl mx-auto w-full space-y-10 py-8 px-4 font-sans">
                {/* --- Header (Unchanged) --- */}
               

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* --- Profile Card --- */}
                    <div className="lg:col-span-1">
                        <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden">
                            
                            {/* Cover Photo Area */}
                            <div className="relative h-40 w-full">
							{userProfile?.coverPhotoURL ? (
							    <div
							        className="w-full h-full"
							        style={{
							            backgroundImage: `url(${userProfile.coverPhotoURL})`,
							            backgroundSize: 'cover',
							            backgroundRepeat: 'no-repeat',
							            backgroundPosition: userProfile.coverPhotoPosition || '50% 50%',
							        }}
							    />
							) : (
							    <div className="w-full h-full bg-slate-300 dark:bg-slate-700"></div>
							)}
                                
                            </div>

                            {/* Overlapping Avatar */}
                            <div className="relative flex justify-center -mt-16">
                                <div className="relative w-32 h-32 rounded-full p-1 bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
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
                                    <button
                                        onClick={() => setEditProfileModalOpen(true)}
                                        className="absolute bottom-1 right-1 p-2 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark"
                                        aria-label="Edit profile"
                                    >
                                        <PencilIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                    </button>
                                </div>
                            </div>

                            {/* --- [MODIFIED] Name, Role & Bio --- */}
                            <div className="text-center p-6 pt-4">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {userProfile?.firstName} {userProfile?.lastName}
                                </h2>
                                <p className="mt-1 text-base text-slate-500 dark:text-slate-400 font-medium capitalize">
                                    {userProfile?.role}
                                </p>
                                
                                {/* --- [MODIFIED] Display Rich Text Bio --- */}
                                {userProfile?.bio && (
                                    <div
                                        className="mt-4 text-sm text-left text-slate-600 dark:text-slate-300 px-2 ql-editor-display break-words"
                                        dangerouslySetInnerHTML={{ __html: userProfile.bio }}
                                    />
                                )}
                            </div>

                            {/* User Info (Email & ID) */}
                            <div className="border-t border-neumorphic-shadow-dark/30 dark:border-slate-700 divide-y divide-neumorphic-shadow-dark/30 dark:divide-slate-700">
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
                    </div>
                    {/* --- [END] Profile Card --- */}


                    {/* --- Right Column --- */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* --- [MODIFIED] About Section --- */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2 mb-3">About</h2>
                            <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                <div className="space-y-5">
                                    
                                    {/* --- Work --- */}
                                    <div className="flex items-start gap-4">
                                        <BriefcaseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-grow">
                                            <p className={`font-medium ${userProfile?.work ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                {userProfile?.work || "No work details provided"}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Work</p>
                                        </div>
                                    </div>
                                    
                                    {/* --- Education --- */}
                                    <div className="flex items-start gap-4">
                                        <AcademicCapIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-grow">
                                            <p className={`font-medium ${userProfile?.education ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                {userProfile?.education || "No education details provided"}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Education</p>
                                        </div>
                                    </div>
                                    
                                    {/* --- Current City --- */}
                                    <div className="flex items-start gap-4">
                                        <MapPinIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-grow">
                                            <p className={`font-medium ${userProfile?.current_city ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                {userProfile?.current_city || "No current city provided"}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Lives in</p>
                                        </div>
                                    </div>
                                    
                                    {/* --- Hometown --- */}
                                    <div className="flex items-start gap-4">
                                        <MapPinIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-grow">
                                            <p className={`font-medium ${userProfile?.hometown ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                {userProfile?.hometown || "No hometown provided"}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">From</p>
                                        </div>
                                    </div>
                                    
                                    {/* --- Mobile Phone --- */}
                                    <div className="flex items-start gap-4">
                                        <PhoneIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-grow">
                                            <p className={`font-medium ${userProfile?.mobile_phone ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                {userProfile?.mobile_phone || "No phone number provided"}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Mobile</p>
                                        </div>
                                    </div>
                                    
                                    {/* --- [MODIFIED] Relationship Status --- */}
                                    <div className="flex items-start gap-4">
                                        <HeartIcon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-grow">
                                            <p className={`font-medium ${userProfile?.relationship_status ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                                                {userProfile?.relationship_status || "No relationship status provided"}
                                                
                                                {/* --- [NEW] Display partner name --- */}
                                                {userProfile.relationship_status && (userProfile.relationship_status === 'In a Relationship' || userProfile.relationship_status === 'Married') && userProfile.relationship_partner && (
                                                    <span className="font-normal text-slate-600 dark:text-slate-300"> with {userProfile.relationship_partner}</span>
                                                )}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Relationship</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* --- [END] About Section --- */}


                        {/* --- Security Section (Unchanged) --- */}
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


                        {/* --- Logout Button (Unchanged) --- */}
                        <div className={isBiometricSupported && !isLoadingBiometrics ? "pt-4" : "pt-0"}>
                            <button onClick={logout} 
                                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-neumorphic-base rounded-xl transition-shadow duration-300 text-red-600 font-semibold shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:text-red-400 dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark">
                                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfileView;