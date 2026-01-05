// src/components/student/LoungeView.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatePresence } from 'framer-motion';

// Import the post components
import StudentPostCard from './StudentPostCard';
import StudentPostCommentsModal from './StudentPostCommentsModal';
import ReactionsBreakdownModal from '../common/ReactionsBreakdownModal';
import { 
    ArrowPathIcon, 
    ChatBubbleLeftRightIcon,
    SparklesIcon
} from '@heroicons/react/24/solid';

const getThemeCardStyle = (activeOverlay) => {
    // Return subtle tint classes or styles based on theme
    switch (activeOverlay) {
        case 'christmas': 
            return "bg-slate-900/5 border-slate-900/10 dark:bg-blue-900/20 dark:border-blue-800/30";
        case 'valentines': 
            return "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30";
        case 'graduation': 
            return "bg-yellow-50/50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30";
        // Default clean surface
        default: 
            return "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"; 
    }
};

const PostSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 w-full shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700"></div>
            <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
            </div>
        </div>
        <div className="space-y-3 mb-6">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
            <div className="h-3 w-4/6 bg-slate-100 dark:bg-slate-700 rounded-lg"></div>
        </div>
        <div className="flex gap-3">
             <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
             <div className="h-8 w-20 bg-slate-100 dark:bg-slate-700 rounded-full"></div>
        </div>
    </div>
);

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
  fetchPublicPosts
}) => {
  const { userProfile } = useAuth();
  const { activeOverlay } = useTheme();
  
  // Use a string class helper instead of inline styles for cleaner One UI look
  const themeClasses = getThemeCardStyle(activeOverlay);

  // ✅ PRE-FILTERING: Ensure userProfile matches post schoolId
  const userSchoolId = userProfile?.schoolId || 'srcs_main';
  const displayPosts = sortedPosts?.filter(post => {
      if (post.schoolId) return post.schoolId === userSchoolId;
      return userSchoolId === 'srcs_main'; // Show legacy posts only to SRCS
  }) || [];

  return (
    <>
      <div className="max-w-4xl mx-auto w-full space-y-8 px-4 sm:px-6 lg:px-8 pb-32">
        
        {/* --- Header Section (Floating Surface) --- */}
        <div className={`relative rounded-[2.5rem] p-6 sm:p-8 overflow-hidden shadow-sm border transition-colors duration-500 ${themeClasses}`}>
            {/* Subtle Gradient decoration for One UI feel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-purple-400/5 dark:from-white/5 dark:to-white/0 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                       Lounge
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                        Connect, share, and learn with your peers.
                    </p>
                </div>

                <button
                    onClick={() => fetchPublicPosts()}
                    disabled={isPostsLoading}
                    className="
                        group self-start sm:self-center px-6 py-3 rounded-full 
                        bg-slate-100 dark:bg-slate-700/50 
                        hover:bg-slate-200 dark:hover:bg-slate-700
                        text-slate-700 dark:text-slate-200 
                        font-bold text-sm tracking-wide 
                        transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100
                        flex items-center gap-2.5
                    "
                >
                    <ArrowPathIcon className={`w-4 h-4 transition-transform group-hover:rotate-180 ${isPostsLoading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                    <span>Refresh</span>
                </button>
            </div>
        </div>

        {/* --- Post Feed --- */}
        <div className="space-y-6 relative z-0">
            {isPostsLoading && (!displayPosts || displayPosts.length === 0) ? (
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <PostSkeleton key={i} />
                    ))}
                </div>
            ) : (displayPosts.length === 0) ? (
                // Empty State
                <div className={`rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center border transition-colors duration-500 ${themeClasses}`}>
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                        <ChatBubbleLeftRightIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">The Lounge is Quiet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mb-8">
                        Be the first to spark a conversation!
                    </p>
                    
                    {/* One UI Pill Button */}
                    <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
                        <SparklesIcon className="w-4 h-4" /> 
                        Start Posting
                    </button>
                </div>
            ) : (
                // Feed Items
                <div className="space-y-6">
                    {displayPosts.map(post => {
                        const authorDetails = usersMap[post.authorId] || usersMap[post.teacherId];
                        const isPrivilegedUser = userProfile.role === 'teacher' || userProfile.role === 'admin';

                        return (
                            <StudentPostCard
                                key={post.id}
                                post={post}
                                author={authorDetails}
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
                    })}
                </div>
            )}
        </div>
      </div>

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