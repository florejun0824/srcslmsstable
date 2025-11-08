// src/components/teacher/dashboard/views/ProfileView.jsx
import React, { useState, useEffect, Fragment, useCallback, useRef } from 'react';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import { 
    PencilIcon, 
    EnvelopeIcon, 
    // IdentificationIcon, // <-- REMOVED
    ArrowLeftOnRectangleIcon,
    FingerPrintIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    MapPinIcon,
    PhoneIcon,
    HeartIcon,
    PencilSquareIcon,
    LockClosedIcon,
    GlobeAltIcon,
    UserIcon as UserSolidIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';
import { Switch, Dialog, Transition, RadioGroup } from '@headlessui/react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';
import { useToast } from '../../../../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

// Firebase Imports
import { db } from '../../../../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

// Post Components & Hook
import { useStudentPosts } from '../../../../hooks/useStudentPosts';
import StudentPostCard from '../../../student/StudentPostCard';
import StudentPostCommentsModal from '../../../student/StudentPostCommentsModal';
import ReactionsBreakdownModal from '../../../common/ReactionsBreakdownModal';
import Spinner from '../../../common/Spinner';

// Import the student's "About" modal
import AboutInfoModal from '../../../student/AboutInfoModal';

// Helper for class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

// --- [NEW] Create Post Modal Component (Self-contained) ---
const CreateTeacherPostModal = ({ isOpen, onClose, userProfile, onSubmit, isPosting }) => {
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState('Public'); // Default to Public
    const textareaRef = useRef(null);

    const audienceOptions = [
        { name: 'Public', description: 'Visible to everyone in the Lounge.', icon: GlobeAltIcon },
        { name: 'Private', description: 'Only visible on your profile.', icon: LockClosedIcon },
    ];

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        } else {
            setContent('');
            setAudience('Public');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim() || isPosting) return;
        onSubmit(content, audience);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[999]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 text-left align-middle shadow-neumorphic dark:shadow-neumorphic-dark transition-all">
                                <form onSubmit={handleSubmit}>
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-lg font-bold leading-6 text-slate-900 dark:text-slate-100"
                                        >
                                            Create Post
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 flex-shrink-0">
                                                <UserInitialsAvatar user={userProfile} size="full" />
                                            </div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                                                {userProfile?.firstName} {userProfile?.lastName}
                                            </div>
                                        </div>
                                        <textarea
                                            ref={textareaRef}
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder={`What's on your mind, ${userProfile?.firstName}?`}
                                            className="mt-4 w-full h-32 p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div className="mt-4">
                                        <RadioGroup value={audience} onChange={setAudience}>
                                            <RadioGroup.Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Audience</RadioGroup.Label>
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {audienceOptions.map((option) => (
                                                <RadioGroup.Option
                                                    key={option.name}
                                                    value={option.name}
                                                    className={({ active, checked }) =>
                                                    `${
                                                        checked
                                                        ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark ring-2 ring-blue-500'
                                                        : 'shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'
                                                    }
                                                    relative flex cursor-pointer rounded-lg p-3 bg-neumorphic-base dark:bg-neumorphic-base-dark transition-all focus:outline-none`
                                                    }
                                                >
                                                    {({ active, checked }) => (
                                                    <>
                                                        <div className="flex w-full items-center justify-between">
                                                            <div className="flex items-center">
                                                                <div className="text-sm">
                                                                    <RadioGroup.Label
                                                                        as="p"
                                                                        className={`font-medium ${
                                                                        checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100'
                                                                        }`}
                                                                    >
                                                                        <option.icon className={`inline w-4 h-4 mr-1.5 ${checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                                                                        {option.name}
                                                                    </RadioGroup.Label>
                                                                    <RadioGroup.Description
                                                                        as="span"
                                                                        className={`text-xs ${
                                                                        checked ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                                                                        }`}
                                                                    >
                                                                        {option.description}
                                                                    </RadioGroup.Description>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                    )}
                                                </RadioGroup.Option>
                                                ))}
                                            </div>
                                        </RadioGroup>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={!content.trim() || isPosting}
                                            className="flex items-center justify-center px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isPosting ? <Spinner size="sm" /> : 'Post'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// --- InfoRowPreview Component (copied from student profile) ---
const InfoRowPreview = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="flex-grow min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    </div>
);


const ProfileView = ({
    user,
    userProfile,
    setEditProfileModalOpen,
    logout
}) => {
    const { showToast } = useToast();
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const [isLoadingBiometrics, setIsLoadingBiometrics] = useState(true);
    
    // State for Modals and Posts
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [isCreatingPost, setIsCreatingPost] = useState(false);
    const [myPosts, setMyPosts] = useState([]);
    const [isPostsLoading, setIsPostsLoading] = useState(true);

	const {
	        sortedPosts,
	        editingPostId,
	        editingPostText, // <-- ADD THIS LINE
	        setEditingPostText, // <-- ADD THIS LINE
	        expandedPosts,
	        reactionsModalPost,
	        isReactionsModalOpen,
	        commentModalPost,
	        isCommentModalOpen,
	        handleStartEditPost,
	        handleCancelEdit,
	        handleUpdatePost,
	        handleDeletePost,
	        togglePostExpansion,
	        handleToggleReaction,
	        handleViewReactions,
	        handleCloseReactions,
	        handleViewComments,
	        handleCloseComments,
	    } = useStudentPosts(myPosts, userProfile?.id, showToast);
    // Biometric Effect
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

    // Fetch Teacher's Posts
    useEffect(() => {
        if (!userProfile?.id) { 
            setIsPostsLoading(false);
            setMyPosts([]);
            return;
        }
        setIsPostsLoading(true);
        const postsQuery = query(
            collection(db, 'studentPosts'),
            where('authorId', '==', userProfile.id),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMyPosts(posts);
            setIsPostsLoading(false);
        }, (error) => {
            console.error("Error fetching student posts:", error);
            showToast("Could not load your posts.", "error");
            setIsPostsLoading(false);
        });
        return () => unsubscribe();
    }, [userProfile?.id, showToast]);

    // Biometric Handler
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

    // Handle Create Post
    const handleCreatePost = async (content, audience) => {
        if (!content.trim()) { 
            showToast("Post content cannot be empty.", "error");
            return; 
        }
        setIsCreatingPost(true);
        try {
            await addDoc(collection(db, 'studentPosts'), {
                authorId: userProfile.id,
                authorName: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
                authorPhotoURL: userProfile.photoURL || '',
                content: content,
                audience: audience,
                createdAt: serverTimestamp(),
                reactions: {},
                commentsCount: 0
            });
            showToast("Post created successfully!", "success");
            setIsCreatePostModalOpen(false);
        } catch (err) {
            console.error("Error creating post:", err);
            showToast(`Failed to create post: ${err.message}`, "error");
        } finally {
            setIsCreatingPost(false);
        }
    };

    // "About" Info Logic
    const aboutInfoPreviewList = [
        { icon: BriefcaseIcon, label: "Work", value: userProfile?.work },
        { icon: AcademicCapIcon, label: "Education", value: userProfile?.education },
        { icon: MapPinIcon, label: "Lives in", value: userProfile?.current_city },
        { icon: MapPinIcon, label: "From", value: userProfile?.hometown },
        { icon: PhoneIcon, label: "Mobile", value: userProfile?.mobile_phone },
        { icon: HeartIcon, label: "Relationship", value: userProfile?.relationship_status },
    ].filter(item => item.value && item.value.trim() !== '');

    const aboutInfoPreview = aboutInfoPreviewList.slice(0, 3); // Show 3 items max

    return (
        <>
            <style>{`
                /* ... (style tag content unchanged) ... */
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
                .ql-editor-display .ql-color-red { color: #ef4444; }
                .ql-editor-display .ql-color-blue { color: #3b82f6; }
            `}</style>
        
            <div className="max-w-7xl mx-auto w-full space-y-10 py-8 px-4 font-sans">
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Profile Card (Left Column) */}
                    <div className="lg:col-span-1 lg:sticky lg:top-24">
                        <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden">
                            
                            {/* Taller Cover Photo */}
                            <div className="relative h-48 sm:h-64 w-full">
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
                            <div className="relative flex justify-center -mt-16 z-10">
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
                                            id={userProfile.id}
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

                            {/* Name, Role & Bio */}
                            <div className="text-center p-6 pt-4">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {userProfile?.firstName} {userProfile?.lastName}
                                </h2>
                                <p className="mt-1 text-base text-slate-500 dark:text-slate-400 font-medium capitalize">
                                    {userProfile?.role}
                                </p>
                                
                                {userProfile?.bio && (
                                    <div
                                        className="mt-4 text-sm text-left text-slate-600 dark:text-slate-300 px-2 ql-editor-display break-words"
                                        dangerouslySetInnerHTML={{ __html: userProfile.bio }}
                                    />
                                )}
                            </div>

                            {/* --- [MODIFIED] User Info (Email & About Preview) --- */}
                            <div className="border-t border-neumorphic-shadow-dark/30 dark:border-slate-700 divide-y divide-neumorphic-shadow-dark/30 dark:divide-slate-700">
                                <div className="flex items-center gap-4 p-4">
                                    <EnvelopeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                    <div className="flex-grow">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{userProfile?.email}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Email Address</p>
                                    </div>
                                </div>
                                
                                {/* --- [MOVED] About Section Preview --- */}
                                <div className="p-4">
                                    <div className="space-y-5">
                                        {aboutInfoPreview.length > 0 ? (
                                            aboutInfoPreview.map(item => (
                                                <InfoRowPreview 
                                                    key={item.label}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    value={item.value}
                                                />
                                            ))
                                        ) : (
                                            <p className="text-slate-400 dark:text-slate-500 italic text-sm">No "About" info provided. Click 'Edit Profile' to add details.</p>
                                        )}
                                    </div>
                                    {aboutInfoPreviewList.length > 3 && (
                                        <button 
                                            onClick={() => setIsAboutModalOpen(true)}
                                            className="mt-6 w-full px-5 py-2.5 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 font-semibold shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all"
                                        >
                                            See all about info
                                        </button>
                                    )}
                                </div>
                                {/* --- [END] About Section Preview --- */}
                            </div>
                        </div>
                    </div>


                    {/* --- Right Column --- */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Create Post Box (Unlocked) */}
                        <div className="bg-neumorphic-base rounded-2xl p-4 sm:p-6 shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
                                    <UserInitialsAvatar user={userProfile} size="full" />
                                </div>
                                <button 
                                    onClick={() => setIsCreatePostModalOpen(true)}
                                    className="flex-1 text-left p-3 sm:p-4 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-500 dark:text-slate-400 hover:shadow-neumorphic-inset-hover dark:hover:shadow-neumorphic-inset-dark-hover transition-shadow"
                                >
                                    What's on your mind, {userProfile?.firstName}?
                                </button>
                            </div>
                        </div>

                        {/* "My Posts" Feed (Unlocked) */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2 mb-3">My Posts</h2>
                            <div className="space-y-6">
                                {isPostsLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Spinner />
                                    </div>
                                ) : myPosts.length === 0 ? (
                                    <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark text-center">
                                        <PencilSquareIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                                        <h3 className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">No Posts Yet</h3>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your posts (both public and private) will appear here.</p>
                                    </div>
                                ) : (
									sortedPosts.map(post => (
									                                        <StudentPostCard
									                                            key={post.id}
									                                            post={post}
									                                            author={userProfile} // <-- PASS userProfile AS THE AUTHOR
									                                            userProfile={userProfile}
									                                            canReact={true} // Teachers can always react
									                                            onStartEdit={handleStartEditPost}
									                                            onDelete={handleDeletePost}
									                                            onToggleReaction={handleToggleReaction}
									                                            onViewComments={handleViewComments}
									                                            onViewReactions={handleViewReactions}
									                                            onToggleExpansion={togglePostExpansion}
									                                            isEditing={editingPostId === post.id}
									                                            editingPostText={editingPostId === post.id ? editingPostText : ''}
									                                            onTextChange={setEditingPostText}
									                                            onSave={handleUpdatePost}
									                                            onCancelEdit={handleCancelEdit}
									                                            isExpanded={!!expandedPosts[post.id]}
									                                        />
									                                    ))
                                )}
                            </div>
                        </div>
                        
                        {/* --- [REMOVED] Old "About" Section --- */}

                        {/* Security Section */}
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

                        {/* Logout Button */}
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

            {/* --- Modals --- */}
            <AnimatePresence>
                {isAboutModalOpen && (
                    <AboutInfoModal
                        isOpen={isAboutModalOpen}
                        onClose={() => setIsAboutModalOpen(false)}
                        userProfile={userProfile}
                    />
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {isCreatePostModalOpen && (
                    <CreateTeacherPostModal
                        isOpen={isCreatePostModalOpen}
                        onClose={() => setIsCreatePostModalOpen(false)}
                        onSubmit={handleCreatePost}
                        userProfile={userProfile}
                        isPosting={isCreatingPost}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCommentModalOpen && (
                    <StudentPostCommentsModal
                        isOpen={isCommentModalOpen}
                        onClose={handleCloseComments}
                        post={commentModalPost}
                        userProfile={userProfile}
                        onToggleReaction={handleToggleReaction} 
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isReactionsModalOpen && (
                    <ReactionsBreakdownModal
                        isOpen={isReactionsModalOpen}
                        onClose={handleCloseReactions}
                        reactionsData={reactionsModalPost?.reactions}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default ProfileView;