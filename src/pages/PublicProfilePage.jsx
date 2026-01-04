// src/pages/PublicProfilePage.jsx
import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeftIcon, 
    BriefcaseIcon, 
    AcademicCapIcon, 
    MapPinIcon, 
    PencilSquareIcon,
    PhoneIcon,
    HeartIcon 
} from '@heroicons/react/24/solid';

// Import all the components we need
import Spinner from '../components/common/Spinner';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import { useStudentPosts } from '../hooks/useStudentPosts';
import StudentPostCard from '../components/student/StudentPostCard';
import StudentPostCommentsModal from '../components/student/StudentPostCommentsModal';
import ReactionsBreakdownModal from '../components/common/ReactionsBreakdownModal';
import AboutInfoModal from '../components/student/AboutInfoModal';

// InfoRowPreview component
const InfoRowPreview = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4 p-2">
        <div className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
             <Icon className="w-5 h-5" />
        </div>
        <div className="flex-grow min-w-0 pt-1">
            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[15px]">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        </div>
    </div>
);

const PublicProfilePage = () => {
    const { userProfile: currentUserProfile } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation(); 

    // MANUALLY GET userId from URL
    const [userId, setUserId] = useState(null);
    useEffect(() => {
        const pathSegments = location.pathname.split('/');
        const id = pathSegments[pathSegments.length - 1]; // Gets the last part of the URL (the ID)
        if (id) {
            setUserId(id);
        } else {
            // Handle error case, e.g., /profile/ with no ID
            showToast("User ID not found in URL.", "error");
            navigate(-1);
        }
    }, [location.pathname, navigate, showToast]);

    const [profile, setProfile] = useState(null);
    const [publicPosts, setPublicPosts] = useState([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    // MODIFY Profile Fetching logic
    useEffect(() => {
        // Wait until we have the userId from the URL
        if (!userId) return; 

        const profileDataFromState = location.state?.profileData;

        // Check if the passed state data is a *complete* profile.
        const isProfileDataComplete = profileDataFromState && profileDataFromState.hasOwnProperty('role');

        // Check if the state data matches the URL ID *AND* is complete
        if (profileDataFromState && profileDataFromState.id === userId && isProfileDataComplete) {
            // Data was passed via Link AND is complete, use it.
            setProfile(profileDataFromState);
            setLoadingProfile(false);
        } else {
            // Fallback: If page was refreshed, data doesn't match, or (most importantly)
            // if the data is INCOMPLETE (like from the teacher's lounge view).
            console.warn("No complete profile state found, attempting direct fetch...");
            const userDocRef = doc(db, 'users', userId);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
                } else {
                    showToast("User profile not found.", "error");
                    navigate(-1); // Go back
                }
            }).catch(err => {
                console.error("Error fetching user profile:", err);
                showToast("Failed to load profile. You may not have permission.", "error");
                navigate(-1);
            }).finally(() => {
                setLoadingProfile(false);
            });
        }
    }, [userId, location.state, navigate, showToast]); 

    // Fetch *only* public posts for this user
    useEffect(() => {
        if (!userId) return; // Wait for userId
        setLoadingPosts(true);
        const postsQuery = query(
            collection(db, 'studentPosts'),
            where('authorId', '==', userId),
            where('audience', '==', 'Public'), // The crucial filter
            orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPublicPosts(posts);
            setLoadingPosts(false);
        }, (error) => {
            console.error("Error fetching public posts:", error);
            showToast("Could not load posts.", "error");
            setLoadingPosts(false);
        });

        return () => unsubscribe();
    }, [userId, showToast]);

    // useStudentPosts hook
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
    } = useStudentPosts(publicPosts, setPublicPosts, currentUserProfile?.id, showToast); 

    // canReact logic
    const canReact = currentUserProfile?.role === 'teacher' || currentUserProfile?.role === 'admin' || currentUserProfile?.canReact;

    // aboutInfoPreviewList logic
    const aboutInfoPreviewList = [
        { icon: BriefcaseIcon, label: "Work", value: profile?.work },
        { icon: AcademicCapIcon, label: "Education", value: profile?.education },
        { icon: MapPinIcon, label: "Lives in", value: profile?.current_city },
        { icon: MapPinIcon, label: "From", value: profile?.hometown },
        { icon: PhoneIcon, label: "Mobile", value: profile?.mobile_phone },
        { icon: HeartIcon, label: "Relationship", value: profile?.relationship_status },
    ].filter(item => item.value && item.value.trim() !== '');
    const aboutInfoPreview = aboutInfoPreviewList.slice(0, 3);

    if (loadingProfile) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!profile) {
        return <div className="p-8 text-center text-slate-600 dark:text-slate-400">User not found.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* "Back" button - Floating Glassmorphic Header */}
            <div className="sticky top-0 z-30 px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto w-full">
                    <button
                        onClick={() => navigate(-1)} 
                        className="group flex items-center gap-3 px-1 pr-4 py-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm transition-all">
                             <ArrowLeftIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-bold text-lg">Profile</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto w-full space-y-8 sm:space-y-10 py-6 sm:py-8 px-4 font-sans">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* --- Profile Card (Left Column) --- */}
                    <div className="lg:col-span-1 lg:sticky lg:top-24">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden relative">
                            
                            {/* Cover Photo */}
                            <div className="relative h-48 sm:h-56 w-full">
                                {profile?.coverPhotoURL ? (
                                    <div
                                        className="w-full h-full"
                                        style={{
                                            backgroundImage: `url(${profile.coverPhotoURL})`,
                                            backgroundSize: 'cover',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: profile.coverPhotoPosition || '50% 50%',
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700" />
                                )}
                                {/* Fade gradient at bottom of cover for smooth avatar transition */}
                                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/10 dark:from-slate-800/10 to-transparent" />
                            </div>

                            {/* Avatar */}
                            <div className="relative px-6">
                                <div className="-mt-16 w-32 h-32 rounded-full p-1.5 bg-white dark:bg-slate-800 shadow-lg mx-auto lg:mx-0">
                                    <UserInitialsAvatar user={profile} size="full" />
                                </div>
                            </div>

                            {/* Name, Title & Bio */}
                            <div className="p-6 pt-4 text-center lg:text-left">
                                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {profile?.firstName} {profile?.lastName}
                                </h2>
                                {profile?.customBio && (
                                    <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300 break-words">
                                        {profile.customBio}
                                    </p>
                                )}
                            </div>

                            {/* Public "About" Info */}
                            <div className="p-4 mx-2 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                                <div className="space-y-2">
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
                                        <p className="py-4 text-slate-400 dark:text-slate-500 italic text-sm text-center">
                                            No public info added.
                                        </p>
                                    )}
                                </div>
                                {aboutInfoPreviewList.length > 3 && (
                                    <button 
                                        onClick={() => setIsAboutModalOpen(true)}
                                        className="mt-4 w-full py-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                                    >
                                        See all details
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- Right Column --- */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* "Public Posts" Feed */}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white px-2 mb-4 tracking-tight">Public Posts</h2>
                            <div className="space-y-6">
                                {loadingPosts ? (
                                    <div className="flex justify-center py-10"><Spinner /></div>
                                ) : sortedPosts.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-10 text-center shadow-sm border border-slate-100 dark:border-slate-700">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <PencilSquareIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Public Posts</h3>
                                        <p className="mt-2 text-slate-500 dark:text-slate-400">This user hasn't shared any public updates yet.</p>
                                    </div>
                                ) : (
                                    sortedPosts.map(post => {
                                        // Find the author details (which is the profile we just fetched)
                                        const authorDetails = profile;

                                        return (
                                            <StudentPostCard
                                                key={post.id}
                                                post={post}
                                                author={authorDetails} // Pass the *viewed* profile as author
                                                userProfile={currentUserProfile} // Pass the *logged-in* user here
                                                canReact={canReact} // Pass the calculated permission
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
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD ALL MODALS */}
            <AnimatePresence>
                {isAboutModalOpen && (
                    <AboutInfoModal
                        isOpen={isAboutModalOpen}
                        onClose={() => setIsAboutModalOpen(false)}
                        userProfile={profile} // Pass the *viewed* profile
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCommentModalOpen && (
                    <StudentPostCommentsModal
                        isOpen={isCommentModalOpen}
                        onClose={handleCloseComments}
                        post={commentModalPost}
                        userProfile={currentUserProfile} // Pass the *logged-in* user
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
        </div>
    );
};

export default PublicProfilePage;