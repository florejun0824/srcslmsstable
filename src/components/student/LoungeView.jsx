// src/components/student/LoungeView.jsx
import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';

// Import the post components
import StudentPostCard from './StudentPostCard';
import StudentPostCommentsModal from './StudentPostCommentsModal';
import ReactionsBreakdownModal from '../common/ReactionsBreakdownModal';
import { 
    ArrowPathIcon, 
    ChatBubbleLeftRightIcon,
    SparklesIcon,
    RocketLaunchIcon
} from '@heroicons/react/24/solid';

// --- THEME UTILITIES ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas': 
            return {
                wrapper: "bg-slate-900/5 border-slate-900/10 dark:bg-blue-900/20 dark:border-blue-800/30",
                gradient: "from-red-500/10 to-green-500/10",
                accentText: "text-red-600 dark:text-red-400",
                button: "bg-gradient-to-r from-red-600 to-green-600 shadow-red-500/20"
            };
        case 'valentines': 
            return {
                wrapper: "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30",
                gradient: "from-pink-500/10 to-red-500/10",
                accentText: "text-pink-600 dark:text-pink-400",
                button: "bg-gradient-to-r from-pink-500 to-rose-600 shadow-pink-500/20"
            };
        case 'cyberpunk':
            return {
                wrapper: "bg-fuchsia-900/5 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:border-fuchsia-800/30",
                gradient: "from-fuchsia-500/10 to-purple-500/10",
                accentText: "text-fuchsia-600 dark:text-fuchsia-400",
                button: "bg-gradient-to-r from-fuchsia-600 to-purple-600 shadow-fuchsia-500/20"
            };
        // Default clean surface
        default: 
            return {
                wrapper: "bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-xl border-white/40 dark:border-white/5",
                gradient: "from-indigo-500/5 to-blue-500/5",
                accentText: "text-indigo-600 dark:text-indigo-400",
                button: "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-500/20"
            };
    }
};

const PostSkeleton = () => (
    <div className="bg-white/40 dark:bg-[#1A1D24]/40 rounded-[2rem] p-6 w-full shadow-sm border border-white/40 dark:border-white/5 animate-pulse mb-6 break-inside-avoid">
        <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-[1.2rem] bg-slate-200 dark:bg-white/5"></div>
            <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-slate-200 dark:bg-white/5 rounded-full"></div>
                <div className="h-3 w-20 bg-slate-200 dark:bg-white/5 rounded-full"></div>
            </div>
        </div>
        <div className="space-y-3 mb-6">
            <div className="h-3 w-full bg-slate-200 dark:bg-white/5 rounded-full"></div>
            <div className="h-3 w-5/6 bg-slate-200 dark:bg-white/5 rounded-full"></div>
        </div>
    </div>
);

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

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
  
  const theme = useMemo(() => getThemeStyles(activeOverlay), [activeOverlay]);

  // PRE-FILTERING
  const userSchoolId = userProfile?.schoolId || 'srcs_main';
  const displayPosts = sortedPosts?.filter(post => {
      if (post.schoolId) return post.schoolId === userSchoolId;
      return userSchoolId === 'srcs_main'; 
  }) || [];

  return (
    <>
      {/* Container with EXPANDED WIDTH for desktop to use full space */}
      <div className="max-w-[1600px] mx-auto w-full space-y-6 px-4 md:px-8 pb-40 lg:pb-12 relative z-10">
        
        {/* --- 1. SOCIAL CONTROL DECK --- */}
        <div className={`
            sticky top-4 z-30
            flex flex-row items-center justify-between gap-2 sm:gap-4
            p-3 sm:p-5 rounded-[2rem] sm:rounded-[2.5rem]
            shadow-sm border
            transition-all duration-300
            ${theme.wrapper}
        `}>
             {/* Gradient Ambience */}
             <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-50 rounded-[2rem] sm:rounded-[2.5rem] pointer-events-none`} />

             <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                 <div className={`
                    w-10 h-10 sm:w-12 sm:h-12 rounded-[1rem] sm:rounded-[1.2rem] flex items-center justify-center 
                    bg-white/50 dark:bg-white/10 shadow-sm border border-white/20 dark:border-white/5
                    ${theme.accentText}
                 `}>
                    <RocketLaunchIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                 </div>
                 <div>
                    <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Community Lounge
                    </h1>
                    
                 </div>
             </div>

             <div className="relative z-10 flex items-center gap-2">
                 <button
                    onClick={() => fetchPublicPosts()}
                    disabled={isPostsLoading}
                    className="
                        group relative overflow-hidden
                        px-4 sm:px-5 py-2 sm:py-3 rounded-[1rem] sm:rounded-[1.2rem]
                        bg-slate-100 dark:bg-black/20 
                        hover:bg-slate-200 dark:hover:bg-black/40
                        text-slate-600 dark:text-slate-300
                        font-bold text-[10px] sm:text-xs tracking-wide
                        transition-all active:scale-95 disabled:opacity-50
                        flex items-center gap-2
                    "
                >
                    <ArrowPathIcon className={`w-3.5 h-3.5 transition-transform group-hover:rotate-180 ${isPostsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
             </div>
        </div>

        {/* --- 2. POST FEED (MASONRY LAYOUT) --- */}
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-0"
        >
            {isPostsLoading && (!displayPosts || displayPosts.length === 0) ? (
                // LOADING SKELETONS (In Columns)
                <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <PostSkeleton key={i} />
                    ))}
                </div>
            ) : (displayPosts.length === 0) ? (
                /* --- EMPTY STATE HERO (Centered) --- */
                <motion.div 
                    variants={itemVariants}
                    className={`
                        relative overflow-hidden
                        max-w-3xl mx-auto
                        rounded-[3rem] p-8 sm:p-12 
                        text-center flex flex-col items-center justify-center 
                        border transition-colors duration-500
                        ${theme.wrapper}
                    `}
                >
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 [mask-image:linear-gradient(0deg,white,transparent)] pointer-events-none" />

                    <div className="relative z-10">
                        <div className="w-24 h-24 bg-gradient-to-tr from-slate-100 to-white dark:from-slate-800 dark:to-slate-700 rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-white/50 dark:border-white/10">
                            <ChatBubbleLeftRightIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                        </div>
                        
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
                            The Lounge is Quiet
                        </h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed mb-8">
                            It looks like no one has posted yet. Be the first to spark a conversation!
                        </p>
                        
                        {/* Call to Action (Pill) */}
                        <button className={`
                            flex items-center gap-2 px-8 py-4 rounded-full 
                            ${theme.button}
                            text-white text-sm font-bold tracking-wide
                            hover:scale-105 transition-transform active:scale-95
                        `}>
                            <SparklesIcon className="w-4 h-4" /> 
                            <span>Create First Post</span>
                        </button>
                    </div>
                </motion.div>
            ) : (
                /* --- FEED ITEMS (MASONRY GRID) --- */
                /* columns-1: Mobile (Stack)
                   md:columns-2: Tablet (2 Cols)
                   xl:columns-3: Desktop (3 Cols)
                   gap-6: Spacing between columns
                */
                <div className="columns-1 md:columns-2 xl:columns-3 gap-6">
                    {displayPosts.map(post => {
                        const authorDetails = usersMap[post.authorId] || usersMap[post.teacherId];
                        const isPrivilegedUser = userProfile.role === 'teacher' || userProfile.role === 'admin';

                        return (
                            // IMPORTANT: 'break-inside-avoid' prevents cards from being split across columns
                            // 'mb-6' adds vertical spacing between items in the masonry layout
                            <motion.div key={post.id} variants={itemVariants} className="break-inside-avoid mb-6">
                                <StudentPostCard
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
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
      </div>

      {/* --- MODALS --- */}
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