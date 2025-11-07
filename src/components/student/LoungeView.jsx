// src/components/student/LoungeView.jsx
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  documentId,
} from 'firebase/firestore';
import { AnimatePresence } from 'framer-motion';
import Spinner from '../common/Spinner';
import UserInitialsAvatar from '../common/UserInitialsAvatar';

// --- REMOVED IONIC IMPORTS ---

// Import the post components and hook
import { useStudentPosts } from '../../hooks/useStudentPosts';
import StudentPostCard from './StudentPostCard';
import StudentPostCommentsModal from './StudentPostCommentsModal';
import ReactionsBreakdownModal from '../common/ReactionsBreakdownModal';
// --- 1. IMPORT ArrowPathIcon ---
import { RocketLaunchIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const LoungeView = () => {
  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const [publicPosts, setPublicPosts] = useState([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});

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
  } = useStudentPosts(publicPosts, userProfile?.id, showToast);

  useEffect(() => {
    if (userProfile?.id) {
        setUsersMap(prev => ({
            ...prev,
            [userProfile.id]: userProfile
        }));
    }
  }, [userProfile]);

  const fetchMissingUsers = useCallback(async (userIds) => {
    const uniqueIds = [...new Set(userIds.filter(id => !!id))];
    if (uniqueIds.length === 0) return;

    const usersToFetch = uniqueIds.filter(id => !usersMap[id]);
    if (usersToFetch.length === 0) return;
    
    try {
        for (let i = 0; i < usersToFetch.length; i += 30) {
            const chunk = usersToFetch.slice(i, i + 30);
            const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
            const userSnap = await getDocs(usersQuery);
            const newUsers = {};
            userSnap.forEach(doc => {
                newUsers[doc.id] = doc.data();
            });
            setUsersMap(prev => ({ ...prev, ...newUsers }));
        }
    } catch (err) {
        console.error("Error fetching users:", err);
    }
  }, [usersMap]); 

  const fetchPublicPosts = useCallback(async () => {
    if (!userProfile?.id) return;

    if (!isPostsLoading) {
        setIsPostsLoading(true);
    }
    
    try {
      const postsQuery = query(
        collection(db, 'studentPosts'),
        where('audience', '==', 'Public'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(postsQuery);

      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPublicPosts(posts);

      const userIdsToFetch = new Set();
      posts.forEach(post => {
        userIdsToFetch.add(post.authorId);
        if (post.reactions) {
            Object.keys(post.reactions).forEach(userId => userIdsToFetch.add(userId));
        }
      });
      await fetchMissingUsers(Array.from(userIdsToFetch));

    } catch (error) {
      console.error("Error fetching public posts:", error);
      showToast("Could not load the Lounge feed.", "error");
    } finally {
      setIsPostsLoading(false);
    }
  }, [userProfile?.id, showToast, fetchMissingUsers, isPostsLoading]); 

  useEffect(() => {
    if (userProfile?.id) {
        fetchPublicPosts();
    }
  }, [userProfile?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // --- REMOVED handleRefresh (we just call fetchPublicPosts directly) ---

  return (
    <>
      {/* --- REMOVED IonRefresher --- */}
      
      {/* --- 2. RE-ADDED PADDING HERE --- */}
      <div className="max-w-3xl mx-auto w-full space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header (Added refresh button) */}
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3 dark:text-slate-100">
                    <RocketLaunchIcon className="w-8 h-8 sm:w-9 sm:h-9 text-red-500 dark:text-red-400"/>
                    SRCS Lounge
                </h1>
                {/* --- 3. ADDED REFRESH BUTTON BACK --- */}
                <button
                    onClick={() => fetchPublicPosts()}
                    disabled={isPostsLoading}
                    className="p-2 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-lg hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50"
                    title="Refresh feed"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isPostsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <p className="mt-2 text-base sm:text-lg text-slate-500 dark:text-slate-400">
                See what's happening. This feed shows all "Public" posts from students.
            </p>
        </div>

        {/* Post Feed */}
        <div className="space-y-6">
            {isPostsLoading ? (
                <div className="flex justify-center py-20">
                    <Spinner size="lg" />
                </div>
            ) : sortedPosts.length === 0 ? (
                <div className="bg-neumorphic-base rounded-2xl p-6 shadow-neumorphic-inset dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark text-center">
                    <RocketLaunchIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                    <h3 className="mt-2 text-lg font-semibold text-slate-700 dark:text-slate-200">The Lounge is Quiet</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Be the first to create a public post from your profile!</p>
                </div>
            ) : (
                sortedPosts.map(post => (
                    <StudentPostCard
                        key={post.id}
                        post={post}
                        userProfile={userProfile}
                        canReact={userProfile.canReact || false}
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
      </div>
      {/* --- END PADDING DIV --- */}

      {/* --- Modals --- */}
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

export default LoungeView;