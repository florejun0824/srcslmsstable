import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext'; // 1. Import Theme Context
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
  LockClosedIcon, 
  CameraIcon
} from '@heroicons/react/24/solid';
import { updateStudentDetailsInClasses } from '../services/firestoreService';

import { Switch } from '@headlessui/react';
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

// 2. HELPER: MONET EFFECT COLOR EXTRACTION (Copied from Dashboard for consistency)
const getMonetStyle = (activeOverlay) => {
    if (activeOverlay === 'christmas') return { background: 'rgba(15, 23, 66, 0.85)', borderColor: 'rgba(100, 116, 139, 0.2)' }; 
    if (activeOverlay === 'valentines') return { background: 'rgba(60, 10, 20, 0.85)', borderColor: 'rgba(255, 100, 100, 0.15)' }; 
    if (activeOverlay === 'graduation') return { background: 'rgba(30, 25, 10, 0.85)', borderColor: 'rgba(255, 215, 0, 0.15)' }; 
    if (activeOverlay === 'rainy') return { background: 'rgba(20, 35, 20, 0.85)', borderColor: 'rgba(100, 150, 100, 0.2)' };
    if (activeOverlay === 'cyberpunk') return { background: 'rgba(35, 5, 45, 0.85)', borderColor: 'rgba(180, 0, 255, 0.2)' };
    if (activeOverlay === 'spring') return { background: 'rgba(50, 10, 20, 0.85)', borderColor: 'rgba(255, 150, 180, 0.2)' };
    if (activeOverlay === 'space') return { background: 'rgba(5, 5, 10, 0.85)', borderColor: 'rgba(100, 100, 255, 0.15)' };
    
    // Default Glass Style (Standard Dark Theme)
    return { 
        background: 'rgba(15, 23, 42, 0.75)', // Dark Slate (matches dark mode text)
        borderColor: 'rgba(255, 255, 255, 0.1)' 
    };
};

// --- CUSTOM CSS: MAC OS 26 SCROLLBARS & UTILS ---
const scrollbarStyles = `
  /* Glass Morphism Utilities - Fallback */
  .glass-panel {
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.06);
    transition: background-color 0.5s ease, border-color 0.5s ease;
  }
  .dark .glass-panel {
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  }
  
  /* Neon XP Bar */
  .xp-bar-glow {
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
  }
`;

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

// --- ENHANCED XP BAR ---
const XPProgressBar = ({ level, currentXP, xpInThisLevel, xpNeededForThisLevel, xpGain }) => {
    const percentage = xpNeededForThisLevel > 0 ? (xpInThisLevel / xpNeededForThisLevel) * 100 : 0;
    return (
        <div className="relative group w-full mt-3">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Lvl {level}
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {Math.round(percentage)}%
                </span>
            </div>
            
            <div className="relative w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2.5 overflow-hidden shadow-inner border border-white/50 dark:border-white/5">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${xpGain > 0 ? 'animate-pulse' : ''}`}
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 xp-bar-glow"></div>
                </div>
            </div>
        </div>
    );
};

// --- COMPACT INFO ROW ---
const InfoRowCompact = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors group border border-transparent hover:border-white/20 dark:hover:border-white/5">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 dark:text-blue-400">
            <Icon className="w-4 h-4" />
        </div>
        <div className="flex-grow min-w-0">
             <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate leading-tight">{value}</p>
             <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">{label}</p> 
        </div>
    </div>
);

const StudentProfilePage = () => {
  const { user, userProfile, refreshUserProfile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { activeOverlay } = useTheme(); // 3. Get Active Theme
  const monetStyle = getMonetStyle(activeOverlay); // 4. Compute Dynamic Styles

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

  // Initialize posts hook
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

  // Sync profile
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

  // Fetch posts
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
  
  // Handle Updates
  const handleModalProfileSubmit = async (updates) => {
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    if (!user?.id) { /* ... */ return; }
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
      if (userProfile.coverPhotoURL && userProfile.coverPhotoURL !== updates.coverPhotoURL && userProfile.coverPhotoURL.includes('firebasestorage')) {
         try { deleteObject(ref(storage, userProfile.coverPhotoURL)); } catch(e){}
      }
      if (userProfile.photoURL && userProfile.photoURL !== updates.photoURL && userProfile.photoURL.includes('firebasestorage')) {
         try { deleteObject(ref(storage, userProfile.photoURL)); } catch(e){}
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

  const handleCreatePost = async (content, audience) => {
    if (!content.trim()) return;
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

  const handleBiometricToggle = async (enabled) => {
        // ... (Logic remains same)
  };

  if (authLoading || !userProfile) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

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

  const aboutInfoPreview = aboutInfoPreviewList.slice(0, 5); 

  return (
    <>
      <style>{scrollbarStyles}</style>
      <style>{`
            .bio-content-display p, .bio-content-display ol, .bio-content-display ul { margin-bottom: 0.5rem; }
            .bio-content-display p:last-child { margin-bottom: 0; }
            .bio-content-display a { color: #3B82F6; text-decoration: underline; }
            .dark .bio-content-display a { color: #60A5FA; }
        `}</style>

      {/* --- LAYOUT CONTAINER --- */}
      <div className="relative w-full min-h-screen pb-32 font-sans">
         
         {/* 5. REMOVED HARDCODED BACKGROUND MESH HERE to allow UniversalBackground to show through */}

         {/* --- CINEMATIC HEADER --- */}
         <div className="relative z-10 w-full max-w-[1920px] mx-auto">
             
             {/* 1. Massive Cover Photo (Edge to Edge) */}
             <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-b-[3rem] shadow-2xl group">
                <div className="absolute inset-0 bg-slate-300 dark:bg-slate-800 animate-pulse z-0"></div>
                
                {userProfile?.canUploadCover && userProfile?.coverPhotoURL ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transform transition-transform duration-[20s] ease-linear hover:scale-105"
                        style={{
                            backgroundImage: `url(${userProfile.coverPhotoURL})`,
                            backgroundPosition: userProfile.coverPhotoPosition || '50% 50%',
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                         {!userProfile?.canUploadCover && (
                             <div className="px-5 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white text-sm font-bold flex items-center gap-2">
                                 <LockClosedIcon className="w-4 h-4" /> Unlock at Lvl 10
                             </div>
                         )}
                    </div>
                )}
                
                {/* Cinematic Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
             </div>

             {/* 2. Floating "Glass Island" Profile Header - APPLIED MONET STYLE */}
             <div className="relative -mt-20 md:-mt-24 px-4 sm:px-8 z-20">
                 <div 
                    style={monetStyle}
                    className="glass-panel rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 shadow-2xl border-t border-white/40 dark:border-white/10 backdrop-blur-3xl transition-colors duration-500"
                 >
                     
                     {/* Avatar (Overlapping) */}
                     <div className="flex-shrink-0 -mt-16 md:-mt-20 relative">
                         <div className="h-32 w-32 md:h-44 md:w-44 rounded-full p-1.5 bg-white dark:bg-slate-800 shadow-2xl ring-4 ring-white/50 dark:ring-white/5">
                            <UserInitialsAvatar
                                user={userProfile}
                                size="full"
                                borderType={selectedBorder}
                                effectsEnabled={cosmeticsEnabled}
                                className="w-full h-full rounded-full"
                            />
                            <button 
                                onClick={() => setIsEditModalOpen(true)}
                                className="absolute bottom-1 right-1 bg-slate-100 dark:bg-slate-700 p-2.5 rounded-full shadow-lg text-slate-600 dark:text-slate-200 hover:scale-110 transition-transform"
                            >
                                <CameraIcon className="w-5 h-5" />
                            </button>
                         </div>
                     </div>

                     {/* Name & Stats */}
                     <div className="flex-1 text-center md:text-left pb-2">
                         <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1">
                             <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                 {userProfile?.displayName}
                             </h1>
                             {displayTitleName && (
                                 <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold uppercase tracking-widest shadow-md">
                                     {displayTitleName}
                                 </span>
                             )}
                         </div>
                         
                         {/* Level & XP Bar */}
                         <div className="max-w-md mx-auto md:mx-0 w-full">
                             <XPProgressBar
                                level={currentLevel}
                                currentXP={currentXP}
                                xpInThisLevel={xpInThisLevel}
                                xpNeededForThisLevel={xpNeededForThisLevel}
                                xpGain={xpGain}
                            />
                         </div>
                     </div>

                     {/* Actions */}
                     <div className="flex-shrink-0 flex gap-3 pb-2">
                         {canUpdateInfo && (
                             <button 
                                 onClick={() => setIsEditModalOpen(true)}
                                 className="px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 text-sm"
                             >
                                 <PencilIcon className="w-4 h-4" /> Edit Profile
                             </button>
                         )}
                     </div>
                 </div>
             </div>
         </div>

         {/* --- MAIN CONTENT GRID --- */}
         <div className="relative z-10 w-full max-w-[1920px] mx-auto py-10 px-4 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* --- LEFT COLUMN: Identity & Metadata (Sticky) --- */}
                <aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-28 self-start">
                    
                    {/* Intro Card - APPLIED MONET STYLE */}
                    <div style={monetStyle} className="glass-panel rounded-[2rem] p-6 transition-colors duration-500">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-5">Intro</h2>
                        
                        {/* Bio Capsule */}
                        <div className="mb-6">
                             {canSetBio && customBio ? (
                                <div className="bg-slate-100/50 dark:bg-black/20 p-4 rounded-2xl text-center border border-slate-200 dark:border-white/5">
                                    <div
                                        className="text-sm text-slate-700 dark:text-slate-300 bio-content-display break-words"
                                        dangerouslySetInnerHTML={createMarkup(customBio)}
                                    />
                                </div>
                            ) : (
                                <div className="text-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                    <p className="text-xs text-slate-400 italic">
                                        {!canSetBio ? "Reach Level 15 to add a bio" : "No bio added yet."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Info List */}
                        <div className="space-y-1 mb-4">
                            <div className="flex items-center gap-3 py-2.5 px-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><EnvelopeIcon className="w-4 h-4"/></div>
                                <div className="min-w-0"><p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{userProfile?.email}</p><p className="text-[10px] uppercase text-slate-400 font-bold">Email</p></div>
                            </div>
                            {aboutInfoPreview.map(item => (
                                <InfoRowCompact key={item.label} icon={item.icon} label={item.label} value={item.value} />
                            ))}
                        </div>
                        
                        <button onClick={() => setIsAboutModalOpen(true)} className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors">
                            View Full Info
                        </button>
                    </div>

                    {/* Badges - APPLIED MONET STYLE */}
                    {badges.length > 0 && (
                        <div style={monetStyle} className="glass-panel rounded-[2rem] p-6 transition-colors duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white">Badges</h2>
                                <span className="text-xs font-bold text-slate-400">{badges.length} Total</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {badges.map(badgeKey => {
                                    const badge = BADGE_MAP[badgeKey];
                                    if (!badge) return null;
                                    const { icon: Icon, title } = badge;
                                    return (
                                        <div key={badgeKey} className="aspect-square rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-sm hover:scale-105 transition-transform" title={title}>
                                            <Icon className="w-6 h-6 drop-shadow-sm" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Security - APPLIED MONET STYLE */}
                    {isBiometricSupported && !isLoadingBiometrics && (
                        <div style={monetStyle} className="glass-panel rounded-[2rem] p-4 flex items-center justify-between transition-colors duration-500">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500"><FingerPrintIcon className="w-5 h-5" /></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Biometric Login</span>
                            </div>
                            <Switch
                                checked={isBiometricEnabled}
                                onChange={handleBiometricToggle}
                                className={classNames(isBiometricEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700', 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none')}
                            >
                                <span aria-hidden="true" className={classNames(isBiometricEnabled ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out')} />
                            </Switch>
                        </div>
                    )}

                </aside>

                {/* --- RIGHT COLUMN: Activity Feed (Spacious) --- */}
                <main className="lg:col-span-8 xl:col-span-9 space-y-6">
                    
                    {/* Create Post Input - APPLIED MONET STYLE */}
                    <div style={monetStyle} className="glass-panel rounded-[2rem] p-6 shadow-sm transition-colors duration-500">
                        <div className="flex items-center gap-4">
                            <UserInitialsAvatar user={userProfile} size="md" className="rounded-full shadow-sm flex-shrink-0" />
                            {canCreatePost ? (
                                <button 
                                    onClick={() => setIsCreatePostModalOpen(true)}
                                    className="flex-1 text-left py-3.5 px-6 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all shadow-inner text-sm font-medium"
                                >
                                    What's on your mind, {profile.firstName}?
                                </button>
                            ) : (
                                <div className="flex-1 text-left py-3 px-5 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between opacity-70 cursor-not-allowed">
                                    <span className="text-slate-400 text-sm">Create Post</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Locked</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feed Title */}
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white">Activity Feed</h3>
                    </div>

                    {/* Content Stream */}
                    {canCreatePost ? (
                        <div className="space-y-6">
                            {isPostsLoading ? (
                                <div className="flex justify-center py-20">
                                    <Spinner />
                                </div>
                            ) : myPosts.length === 0 ? (
                                <div style={monetStyle} className="glass-panel rounded-[2.5rem] p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 transition-colors duration-500">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <PencilIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Posts Yet</h3>
                                    <p className="mt-2 text-slate-500 dark:text-slate-400">Share your thoughts to get started!</p>
                                </div>
                            ) : (
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
                        // LOCKED FEED STATE - APPLIED MONET STYLE
                        <div style={monetStyle} className="glass-panel rounded-[2rem] p-16 text-center relative overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-500">
                            <div className="p-5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 mb-2">
                                <LockClosedIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div className="max-w-md mx-auto px-4">
                                <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">Feed Locked</h3>
                                <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Reach <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">Level 30</span> to unlock the ability to create and view posts from your classmates.
                                </p>
                            </div>
                        </div>
                    )}

                </main>

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