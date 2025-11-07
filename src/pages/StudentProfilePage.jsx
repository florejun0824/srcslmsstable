import React, { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
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
  BriefcaseIcon,
  MapPinIcon,
  PhoneIcon,
  HeartIcon,
  PencilSquareIcon,
  LockClosedIcon, 
} from '@heroicons/react/24/solid';
import { updateStudentDetailsInClasses } from '../services/firestoreService';

import { Switch } from '@headlessui/react';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

import EditStudentProfileModal from '../components/student/EditStudentProfileModal';
import AboutInfoModal from '../components/student/AboutInfoModal';
import { AnimatePresence } from 'framer-motion';

import DOMPurify from 'dompurify';

import CreateStudentPostModal from '../components/student/CreateStudentPostModal';
import { useStudentPosts } from '../hooks/useStudentPosts';
import StudentPostCard from '../components/student/StudentPostCard';
import StudentPostCommentsModal from '../components/student/StudentPostCommentsModal';
import ReactionsBreakdownModal from '../components/common/ReactionsBreakdownModal'; 


// Helper for class names
function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

// ... (createMarkup, XPProgressBar, TITLE_MAP, BADGE_MAP, InfoRowPreview components remain unchanged) ...
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
const InfoRowPreview = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="flex-grow min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    </div>
);
// ...


const StudentProfilePage = () => {
  const { user, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    firstName: '', lastName: '', gender: '', photoURL: '', customBio: '',
    xp: 0, level: 1,
    coverPhotoURL: '', coverPhotoPosition: '50% 50%',
    work: '', education: '', current_city: '', hometown: '',
    mobile_phone: '', relationship_status: '', relationship_partner: '',
    canUploadProfilePic: false, canUploadCover: false, canUpdateInfo: false,
    canCreatePost: false, 
    canReact: false,
  });

  const [xpGain, setXpGain] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  
  const isInitialXpLoad = useRef(true);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isLoadingBiometrics, setIsLoadingBiometrics] = useState(true);

  // Initialize the student posts hook
  const {
    sortedPosts,
    editingPostId,
    editingPostText,
    setEditingPostText,
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

  // Sync profile from useAuth
  useEffect(() => {
    if (!authLoading && userProfile) {
      setProfile({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        gender: userProfile.gender || 'Not specified',
        photoURL: userProfile.photoURL || '',
        customBio: userProfile.customBio || '',
        work: userProfile.work || '',
        education: userProfile.education || '',
        current_city: userProfile.current_city || '',
        hometown: userProfile.hometown || '',
        mobile_phone: userProfile.mobile_phone || '',
        relationship_status: userProfile.relationship_status || '',
        relationship_partner: userProfile.relationship_partner || '',
        coverPhotoURL: userProfile.coverPhotoURL || '',
        coverPhotoPosition: userProfile.coverPhotoPosition || '50% 50%',
        canUploadProfilePic: userProfile.canUploadProfilePic || false,
        canUploadCover: userProfile.canUploadCover || false,
        canUpdateInfo: userProfile.canUpdateInfo || false,
        canSetBio: userProfile.canSetBio || false,
        canCreatePost: userProfile.canCreatePost || false,
        canReact: userProfile.canReact || false,
        xp: userProfile.xp || 0,
        level: userProfile.level || 1,
        id: userProfile.id || null,
      });
    }
  }, [authLoading, userProfile]);

  // Fetch student's own posts
  useEffect(() => {
    if (!profile.id) { 
        setIsPostsLoading(false);
        setMyPosts([]);
        return;
    }
    if (!profile.canCreatePost) {
        setIsPostsLoading(false);
        setMyPosts([]);
        return;
    }
    setIsPostsLoading(true);
    const postsQuery = query(
      collection(db, 'studentPosts'),
      where('authorId', '==', profile.id),
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
  }, [profile.id, profile.canCreatePost, showToast]); 

  // ... (checkBiometricStatus, xpGain effect, levelUp effect all remain the same) ...
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
            } finally {
                setIsLoadingBiometrics(false);
            }
        };
        checkBiometricStatus();
    }, []);
  useEffect(() => {
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
    }, [userProfile?.xp, profile.xp]);
  useEffect(() => {
        if (!userProfile) return;
        const prevLevel = profile.level || 1;
        const newLevel = userProfile.level || 1;
        if (newLevel > prevLevel) {
            setXpGain(0);
            setProfile(prev => ({ ...prev, level: newLevel }));
        }
    }, [userProfile?.level, profile.level]);
  // ...

  // Profile Edit Modal Submit Handler
  const handleModalProfileSubmit = async (updates) => {
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    if (!user?.id) { /* ... */ return; }
    if (!updates.firstName || !updates.lastName) { /* ... */ return; }
    try {
      const userDocRef = doc(db, 'users', user.id);
      const updatedData = {
          firstName: updates.firstName,
          lastName: updates.lastName,
          displayName: `${updates.firstName} ${updates.lastName}`.trim(),
          gender: updates.gender,
          photoURL: updates.photoURL,
          customBio: updates.customBio,
          coverPhotoURL: updates.coverPhotoURL,
          coverPhotoPosition: updates.coverPhotoPosition,
          work: updates.work,
          education: updates.education,
          current_city: updates.current_city,
          hometown: updates.hometown,
          mobile_phone: updates.mobile_phone,
          relationship_status: updates.relationship_status,
          relationship_partner: updates.relationship_partner,
      };
      await updateDoc(userDocRef, updatedData);
      await updateStudentDetailsInClasses(user.id, {
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
          displayName: updatedData.displayName,
          photoURL: updatedData.photoURL,
      });
      const storage = getStorage();
      const oldCoverUrl = userProfile.coverPhotoURL;
      const newCoverUrl = updates.coverPhotoURL;
      if (oldCoverUrl && oldCoverUrl !== newCoverUrl && oldCoverUrl.includes('firebasestorage.googleapis.com')) {
          const oldCoverRef = ref(storage, oldCoverUrl);
          deleteObject(oldCoverRef).catch((err) => console.error("Failed to delete old cover photo", err));
      }
      const oldPhotoUrl = userProfile.photoURL;
      const newPhotoUrl = updates.photoURL;
      if (oldPhotoUrl && oldPhotoUrl !== newPhotoUrl && oldPhotoUrl.includes('firebasestorage.googleapis.com')) {
          const oldPhotoRef = ref(storage, oldPhotoUrl);
          deleteObject(oldPhotoRef).catch((err) => console.error("Failed to delete old profile photo", err));
      }
      
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

  // ... (Error/Success message timeouts remain the same) ...
  useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);
  useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);


  // Handler for creating a post
  const handleCreatePost = async (content, audience) => {
    if (!content.trim()) { /* ... */ return; }
    setIsCreatingPost(true);
    try {
        await addDoc(collection(db, 'studentPosts'), {
            authorId: profile.id,
            authorName: `${profile.firstName} ${profile.lastName}`.trim(),
            authorPhotoURL: profile.photoURL || '',
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

  // ... (handleBiometricToggle remains the same) ...
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

  if (authLoading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // --- Read post permissions ---
  const {
    canCreatePost,
    canReact,
    canSetBio,
    canUpdateInfo,
    selectedBorder,
    cosmeticsEnabled,
  } = userProfile;

  const currentLevel = userProfile.level || 1;
  const currentXP = userProfile.xp || 0;
  const xpForCurrentLevel = ((currentLevel - 1) * currentLevel / 2) * 500;
  const xpForNextLevel = (currentLevel * (currentLevel + 1) / 2) * 500;
  const xpInThisLevel = currentXP - xpForCurrentLevel;
  const xpNeededForThisLevel = xpForNextLevel - xpForCurrentLevel;
  const badges = userProfile.genericBadges || [];
  const displayTitleId = userProfile.displayTitle;
  const displayTitleName = displayTitleId ? TITLE_MAP[displayTitleId] : null;
  const customBio = userProfile.customBio || '';
  
  const aboutInfoPreviewList = [
    { icon: BriefcaseIcon, label: "Work", value: userProfile?.work },
    { icon: AcademicCapIcon, label: "Education", value: userProfile?.education },
    { icon: MapPinIcon, label: "Lives in", value: userProfile?.current_city },
    { icon: MapPinIcon, label: "From", value: userProfile?.hometown },
    { icon: PhoneIcon, label: "Mobile", value: userProfile?.mobile_phone },
    { icon: HeartIcon, label: "Relationship", value: userProfile?.relationship_status },
  ].filter(item => item.value && item.value.trim() !== '');

  const aboutInfoPreview = aboutInfoPreviewList.slice(0, 3);


  return (
    <>
      <style>{`
            .bio-content-display p,
            .bio-content-display ol,
            .bio-content-display ul {
                margin-bottom: 0.5rem;
            }
            .bio-content-display p:last-child {
                margin-bottom: 0;
            }
            .bio-content-display ol,
            .bio-content-display ul {
                padding-left: 1.5em;
            }
            .bio-content-display a {
                color: #2563eb; /* Tailwind blue-600 */
                text-decoration: underline;
            }
            .dark .bio-content-display a {
                color: #60a5fa; /* Tailwind blue-400 */
            }
        `}</style>

      <div className="max-w-7xl mx-auto w-full space-y-8 sm:space-y-10 py-6 sm:py-8 px-4 font-sans">
        
        {/* --- REMOVED: The main h1 title was here --- */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* --- Profile Card (Left Column) --- */}
          {/* --- MODIFIED: Added lg:sticky lg:top-24 to make it stick on desktop --- */}
          <div className="lg:col-span-1 lg:sticky lg:top-24">
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden">
              
              {/* --- 1. MODIFIED: Cover Photo Height --- */}
              <div className="relative h-48 sm:h-64 w-full">
                {userProfile?.canUploadCover && userProfile?.coverPhotoURL ? (
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
                    <div className="w-full h-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                        {!userProfile?.canUploadCover && (
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unlock at Lvl 10</span>
                        )}
                    </div>
                )}
              </div>

              {/* --- 2. MODIFIED: Avatar margin --- */}
              <div className="relative flex justify-center -mt-16 z-10">
                <div className="relative w-32 h-32 rounded-full p-1 bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
                  <UserInitialsAvatar
                    user={userProfile}
                    size="full"
                    borderType={selectedBorder}
                    effectsEnabled={cosmeticsEnabled}
                    className="w-full h-full"
                  />
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute bottom-1 right-1 z-20 p-2 bg-neumorphic-base rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-lg dark:hover:shadow-neumorphic-inset-dark dark:active:shadow-neumorphic-inset-dark"
                    aria-label="Edit profile"
                  >
                    <PencilIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  </button>
                </div>
              </div>

              {/* Name, Title & Bio */}
              <div className="text-center p-6 pt-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                  {userProfile?.displayName || 'Student Profile'}
                  {xpGain > 0 && <SparklesIcon className="h-5 w-5 text-yellow-400 animate-ping" />}
                </h2>
                {displayTitleName && (
                  <span className="mt-2 px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-md inline-block">
                    {displayTitleName}
                  </span>
                )}
                {canSetBio && customBio && (
                  <div
                    className="mt-4 text-sm text-left text-slate-600 dark:text-slate-300 px-2 bio-content-display break-words"
                    dangerouslySetInnerHTML={createMarkup(customBio)}
                  />
                )}
                {!canSetBio && !customBio && (
                  <p className="mt-4 text-sm text-slate-400 italic">Bio unlocks at Lvl 15</p>
                )}
              </div>

              {/* XP Progress Bar */}
              <div className="px-6 pb-6">
                <XPProgressBar
                  level={currentLevel}
                  currentXP={currentXP}
                  xpInThisLevel={xpInThisLevel}
                  xpNeededForThisLevel={xpNeededForThisLevel}
                  xpGain={xpGain}
                />
              </div>

              {/* User Info (Email & Badges) */}
              <div className="border-t border-neumorphic-shadow-dark/30 dark:border-slate-700 divide-y divide-neumorphic-shadow-dark/30 dark:divide-slate-700">
                <div className="flex items-center gap-4 p-4">
                  <EnvelopeIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                  <div className="flex-grow">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 break-all">{userProfile?.email}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Email Address</p>
                  </div>
                </div>
                {badges.length > 0 && (
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Badges Earned</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {badges.map(badgeKey => {
                        const badge = BADGE_MAP[badgeKey];
                        if (!badge) return null;
                        const { icon: Icon, title } = badge;
                        return (
                          <div 
                            key={badgeKey} 
                            className="flex flex-col items-center justify-center text-center p-2 bg-neumorphic-base rounded-xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg aspect-square" 
                            title={title}
                          >
                            <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-tight">
                              {title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* --- [END] Profile Card --- */}


          {/* --- Right Column --- */}
          <div className="lg:col-span-2 space-y-6">

            {/* "About" Section */}
            {canUpdateInfo && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2 mb-3">About (Lvl 20+)</h2>
                <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
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
                      <p className="text-slate-400 dark:text-slate-500 italic">No "About" info provided. Click the pencil to add details.</p>
                    )}
                  </div>
                  {aboutInfoPreviewList.length > 0 && (
                    <button 
                      onClick={() => setIsAboutModalOpen(true)}
                      className="mt-6 w-full px-5 py-2.5 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 font-semibold shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark transition-all"
                    >
                      See your about info
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* --- Create Post Box --- */}
            <div className="bg-neumorphic-base rounded-2xl p-4 sm:p-6 shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12">
                        <UserInitialsAvatar user={userProfile} size="full" />
                    </div>
                    
                    {canCreatePost ? (
                        // UNLOCKED STATE
                        <button 
                            onClick={() => setIsCreatePostModalOpen(true)}
                            className="flex-1 text-left p-3 sm:p-4 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-500 dark:text-slate-400 hover:shadow-neumorphic-inset-hover dark:hover:shadow-neumorphic-inset-dark-hover transition-shadow"
                        >
                            What's on your mind, {profile.firstName}?
                        </button>
                    ) : (
                        // LOCKED STATE
                        <div className="flex-1 text-left p-3 sm:p-4 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark opacity-60">
                            <div className="flex items-center gap-2">
                                <LockClosedIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" /> 
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Create Post (Unlocks at Lvl 30)</span>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            {/* --- END: Create Post Box --- */}
            
            {/* --- "My Posts" Feed --- */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2 mb-3">My Posts</h2>
                
                {canCreatePost ? (
                    // UNLOCKED STATE
                    <div className="space-y-6">
                        {isPostsLoading ? (
                            <div className="flex justify-center py-10">
                                <Spinner />
                            </div>
                        ) : myPosts.length === 0 ? (
                            <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark text-center">
                                <PencilSquareIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                                <h3 className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">No Posts Yet</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your posts will appear here once you create them.</p>
                            </div>
                        ) : (
                            // RENDER THE POST CARDS
                            sortedPosts.map(post => (
                                <StudentPostCard
                                    key={post.id}
                                    post={post}
                                    userProfile={userProfile}
                                    canReact={canReact}
                                    onStartEdit={handleStartEditPost}
                                    onDelete={handleDeletePost}
                                    onToggleReaction={handleToggleReaction}
                                    onViewComments={handleViewComments}
                                    onViewReactions={handleViewReactions}
                                    onToggleExpansion={togglePostExpansion}
                                    isEditing={editingPostId === post.id}
                                    editingText={editingPostId === post.id ? editingText : ''}
                                    onTextChange={setEditingPostText}
                                    onSave={handleUpdatePost}
                                    onCancelEdit={handleCancelEdit}
                                    isExpanded={!!expandedPosts[post.id]}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    // LOCKED STATE
                    <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark text-center opacity-60">
                        <LockClosedIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                        <h3 className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">Posts Locked</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reach Level 30 to unlock the ability to create and view your posts.</p>
                    </div>
                )}
            </div>
            {/* --- END: "My Posts" Feed --- */}

            {/* Security Section */}
            {isBiometricSupported && !isLoadingBiometrics && (
              <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
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
          
          </div>
          {/* --- [END] Right Column --- */}

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
            <CreateStudentPostModal
                isOpen={isCreatePostModalOpen}
                onClose={() => setIsCreatePostModalOpen(false)}
                onSubmit={handleCreatePost}
                userProfile={userProfile}
                isPosting={isCreatingPost}
            />
        )}
      </AnimatePresence>

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

export default StudentProfilePage;