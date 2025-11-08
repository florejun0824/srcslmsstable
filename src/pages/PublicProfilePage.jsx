// src/pages/PublicProfilePage.jsx
import React, { useState, useEffect, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // <-- 1. Import useLocation, remove useParams
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

// ... (InfoRowPreview component is unchanged)
const InfoRowPreview = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <Icon className="w-6 h-6 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="flex-grow min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    </div>
);


const PublicProfilePage = () => {
    // const { userId } = useParams(); // <-- 2. REMOVE useParams
    const { userProfile: currentUserProfile } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation(); // <-- 3. Keep useLocation

    // --- 4. MANUALLY GET userId from URL ---
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
    // --- END OF FIX ---

    const [profile, setProfile] = useState(null);
    const [publicPosts, setPublicPosts] = useState([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    // --- 5. MODIFY Profile Fetching logic ---
    useEffect(() => {
        // Wait until we have the userId from the URL
        if (!userId) return; 

        const profileDataFromState = location.state?.profileData;

        // Check if the state data matches the URL ID
        if (profileDataFromState && profileDataFromState.id === userId) {
            // Data was passed via Link, use it. This fixes student loading.
            setProfile(profileDataFromState);
            setLoadingProfile(false);
        } else {
            // Fallback: If page was refreshed or data doesn't match.
            // This will only work for Teachers/Admins.
            console.warn("No profile state found, attempting direct fetch...");
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
    }, [userId, location.state, navigate, showToast]); // <-- Add userId as dependency
    // --- END OF FIX ---

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
    }, [userId, showToast]); // <-- Add userId as dependency

    // ... (useStudentPosts hook is unchanged) ...
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
    } = useStudentPosts(publicPosts, currentUserProfile?.id, showToast);

    // ... (canReact logic is unchanged) ...
    const canReact = currentUserProfile?.role === 'teacher' || currentUserProfile?.role === 'admin' || currentUserProfile?.canReact;

    // ... (aboutInfoPreviewList logic is unchanged) ...
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
            <div className="flex h-screen items-center justify-center bg-neumorphic-base dark:bg-neumorphic-base-dark">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!profile) {
        return <div className="p-8 text-center text-slate-600 dark:text-slate-400">User not found.</div>;
    }

    return (
        <>
            {/* "Back" button */}
            <div className="sticky top-0 z-30 p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark">
                <button
                    onClick={() => navigate(-1)} // Go back to the previous page (Lounge)
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 dark:text-slate-200 font-semibold shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back
                </button>
            </div>

            <div className="max-w-7xl mx-auto w-full space-y-8 sm:space-y-10 py-6 sm:py-8 px-4 font-sans">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* --- Profile Card (Left Column) --- */}
                    <div className="lg:col-span-1 lg:sticky lg:top-24">
                        <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg overflow-hidden">
                            {/* Cover Photo */}
                            <div className="relative h-48 sm:h-64 w-full">
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
                                    <div className="w-full h-full bg-slate-300 dark:bg-slate-700" />
                                )}
                            </div>

                            {/* Avatar */}
                            <div className="relative flex justify-center -mt-16 z-10">
                                <div className="relative w-32 h-32 rounded-full p-1 bg-neumorphic-base shadow-neumorphic dark:bg-neumorphic-base-dark dark:shadow-lg">
                                    <UserInitialsAvatar user={profile} size="full" />
                                    {/* NO EDIT BUTTON */}
                                </div>
                            </div>

                            {/* Name, Title & Bio */}
                            <div className="text-center p-6 pt-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {profile?.firstName} {profile?.lastName}
                                </h2>
                                {profile?.customBio && (
                                    <p className="mt-4 text-sm text-left text-slate-600 dark:text-slate-300 px-2 break-words">
                                        {profile.customBio}
                                    </p>
                                )}
                            </div>

                            {/* MODIFIED Public "About" Info */}
                            <div className="border-t border-neumorphic-shadow-dark/30 dark:border-slate-700 p-4">
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
                                        <p className="text-slate-400 dark:text-slate-500 italic text-sm text-center">
                                            This user hasn't added any public "About" info.
                                        </p>
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
                        </div>
                    </div>

                    {/* --- Right Column --- */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* "Public Posts" Feed */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 px-2 mb-3">Public Posts</h2>
                            <div className="space-y-6">
                                {loadingPosts ? (
                                    <div className="flex justify-center py-10"><Spinner /></div>
                                ) : sortedPosts.length === 0 ? (
                                    <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark text-center">
                                        <PencilSquareIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                                        <h3 className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">No Public Posts</h3>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This user hasn't made any public posts yet.</p>
                                    </div>
                                ) : (
                                    sortedPosts.map(post => (
                                        <StudentPostCard
                                            key={post.id}
                                            post={post}
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
                                    ))
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
        </>
    );
};

export default PublicProfilePage;