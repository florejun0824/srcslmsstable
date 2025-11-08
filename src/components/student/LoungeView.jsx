// src/components/student/LoungeView.jsx
import React, { Fragment } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';
import Spinner from '../common/Spinner';

// Import the post components
import StudentPostCard from './StudentPostCard';
import StudentPostCommentsModal from './StudentPostCommentsModal';
import ReactionsBreakdownModal from '../common/ReactionsBreakdownModal';
import { RocketLaunchIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

// --- 1. Receive all data and handlers as props ---
const LoungeView = ({
  isPostsLoading,
  publicPosts,
  usersMap,
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
  fetchPublicPosts // This is the refresh function from the dashboard
}) => {
  const { userProfile } = useAuth(); // Still need this for role/permission checks

  // --- 2. ALL STATE, useStudentPosts, useEffects, and fetch functions are GONE ---

  return (
    <>
      <div className="max-w-3xl mx-auto w-full space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3 dark:text-slate-100">
                    <RocketLaunchIcon className="w-8 h-8 sm:w-9 sm:h-9 text-red-500 dark:text-red-400"/>
                    SRCS Lounge
                </h1>
                <button
                    onClick={() => fetchPublicPosts()} // <-- 3. Use the passed-in refresh function
                    disabled={isPostsLoading}
                    className="p-2 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-lg hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50"
                    title="Refresh feed"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isPostsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <p className="mt-2 text-base sm:text-lg text-slate-500 dark:text-slate-400">
                See what's happening. This feed shows all "Public" posts from students and teachers.
            </p>
        </div>

        {/* Post Feed */}
        <div className="space-y-6">
            {isPostsLoading && publicPosts.length === 0 ? ( // Show spinner only if posts are empty
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
                // --- 4. This rendering logic now uses the props correctly ---
                sortedPosts.map(post => {
                    const authorDetails = usersMap[post.authorId]; // <-- This prop now comes from the parent
                    const isPrivilegedUser = userProfile.role === 'teacher' || userProfile.role === 'admin';

					return (
                        <StudentPostCard
                            key={post.id}
                            post={post}
                            author={authorDetails} // <-- This will pass the full author object
                            userProfile={userProfile}
                            canReact={isPrivilegedUser ? true : (userProfile.canReact || false)}
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

      {/* --- 5. Modals are unchanged, they receive props perfectly --- */}
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