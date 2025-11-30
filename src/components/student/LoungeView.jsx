// src/components/student/LoungeView.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; // [Added] Theme Context
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

// --- CUSTOM CSS: MAC OS 26 UTILS ---
const loungeStyles = `
  .glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(25px) saturate(180%);
    -webkit-backdrop-filter: blur(25px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.5);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
    transition: background-color 0.5s ease, border-color 0.5s ease;
  }
  .dark .glass-panel {
    background: rgba(30, 41, 59, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  }
  
  .glass-button {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    transition: all 0.3s ease;
  }
  .glass-button:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  }
  .dark .glass-button {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .dark .glass-button:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

// --- [ADDED] Helper: Monet/Theme Color Extraction ---
const getThemeCardStyle = (activeOverlay) => {
    switch (activeOverlay) {
        case 'christmas': 
            return { backgroundColor: 'rgba(15, 23, 66, 0.6)', borderColor: 'rgba(100, 116, 139, 0.2)' };
        case 'valentines': 
            return { backgroundColor: 'rgba(60, 10, 20, 0.6)', borderColor: 'rgba(255, 100, 100, 0.15)' };
        case 'graduation': 
            return { backgroundColor: 'rgba(30, 25, 10, 0.6)', borderColor: 'rgba(255, 215, 0, 0.15)' };
        case 'rainy': 
            return { backgroundColor: 'rgba(20, 35, 20, 0.6)', borderColor: 'rgba(100, 150, 100, 0.2)' };
        case 'cyberpunk': 
            return { backgroundColor: 'rgba(35, 5, 45, 0.6)', borderColor: 'rgba(180, 0, 255, 0.2)' };
        case 'spring': 
            return { backgroundColor: 'rgba(50, 10, 20, 0.6)', borderColor: 'rgba(255, 150, 180, 0.2)' };
        case 'space': 
            return { backgroundColor: 'rgba(5, 5, 10, 0.6)', borderColor: 'rgba(100, 100, 255, 0.15)' };
        default: 
            return {}; 
    }
};

// --- SKELETON LOADER COMPONENT ---
const PostSkeleton = () => (
    <div className="glass-panel rounded-[2rem] p-6 w-full animate-pulse">
        {/* Header: Avatar & Name */}
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
            <div className="space-y-2 flex-1">
                <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700/50 rounded-md"></div>
                <div className="h-2 w-20 bg-slate-200 dark:bg-slate-700/50 rounded-md"></div>
            </div>
        </div>
        
        {/* Body Text Lines */}
        <div className="space-y-3 mb-6">
            <div className="h-3 w-full bg-slate-200 dark:bg-slate-700/50 rounded-md"></div>
            <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-700/50 rounded-md"></div>
            <div className="h-3 w-4/6 bg-slate-200 dark:bg-slate-700/50 rounded-md"></div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/30 dark:border-white/5">
             <div className="flex gap-3">
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700/50 rounded-full"></div>
             </div>
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
  
  // [Added] Get Theme
  const { activeOverlay } = useTheme();
  const dynamicThemeStyle = getThemeCardStyle(activeOverlay);

  return (
    <>
      <style>{loungeStyles}</style>

      <div className="max-w-4xl mx-auto w-full space-y-8 px-4 sm:px-6 lg:px-8 pb-32">
        
        {/* --- Header Section (Aero Glass - Compact & Themed) --- */}
        <div 
            className="relative glass-panel rounded-[2rem] p-4 sm:p-5 overflow-hidden group transition-colors duration-500"
            style={dynamicThemeStyle} // [Applied Theme]
        >
            
            {/* Background Mesh Gradient (Opacity reduced slightly for readability over themes) */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-orange-400/10 to-pink-400/10 rounded-full blur-[80px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">
                        SRCS Lounge
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md">
                        Connect, share, and learn with your peers across campus.
                    </p>
                </div>

                {/* Refresh Button - Compact */}
                <button
                    onClick={() => fetchPublicPosts()}
                    disabled={isPostsLoading}
                    className="glass-button self-start sm:self-center px-4 py-2 rounded-lg flex-shrink-0 flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wide shadow-sm hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${isPostsLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>
        </div>

        {/* --- Post Feed --- */}
        <div className="space-y-6 relative z-0">
            {/* SKELETON LOADING STATE */}
            {isPostsLoading && (!publicPosts || publicPosts.length === 0) ? (
                <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                        <PostSkeleton key={i} />
                    ))}
                </div>
            ) : (!sortedPosts || sortedPosts.length === 0) ? (
                // Empty State - Glass Card (Themed)
                <div 
                    className="glass-panel rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center transition-colors duration-500"
                    style={dynamicThemeStyle} // [Applied Theme]
                >
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <ChatBubbleLeftRightIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">The Lounge is Quiet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Be the first to spark a conversation! Create a public post from your profile.
                    </p>
                    <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide border border-blue-100 dark:border-blue-500/20">
                        <SparklesIcon className="w-4 h-4" /> Start Posting
                    </div>
                </div>
            ) : (
                // Feed Items
                <div className="space-y-6">
                    {sortedPosts.map(post => {
                        const authorDetails = usersMap[post.authorId];
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