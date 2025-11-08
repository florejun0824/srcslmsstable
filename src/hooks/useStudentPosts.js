import { useState, useMemo, useCallback } from 'react';
import { updateDoc, doc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust this path if needed

/**
 * A hook to manage all state and interactions for the student post feed
 * using OPTIMISTIC UPDATES.
 * @param {Array} posts - The raw list of posts from Firestore.
 * @param {function} setPosts - The React state setter function for the posts array.
 * @param {string} currentUserId - The ID of the currently logged-in student.
 * @param {function} showToast - The showToast function from useToast.
 */
export const useStudentPosts = (posts, setPosts, currentUserId, showToast) => {
    // State for editing a post
    const [editingPostId, setEditingPostId] = useState(null);
    const [editingPostText, setEditingPostText] = useState('');

    // State for "See More"
    const [expandedPosts, setExpandedPosts] = useState({});

    // State for the "View Reactions" modal
    const [reactionsModalPost, setReactionsModalPost] = useState(null);
    const [isReactionsModalOpen, setIsReactionsModalOpen] = useState(false);

    // State for the "View Comments" modal
    const [commentModalPost, setCommentModalPost] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

    // Memoize sorted posts to prevent re-sorting on every render
    const sortedPosts = useMemo(() => {
        if (!Array.isArray(posts)) return [];
        return [...posts].sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA; // Newest first
        });
    }, [posts]);

    // --- Post CRUD Handlers (Optimistic) ---

    const handleStartEditPost = useCallback((post) => {
        setEditingPostId(post.id);
        setEditingPostText(post.content);
    }, []);
    
    const handleCancelEdit = useCallback(() => {
        setEditingPostId(null);
        setEditingPostText('');
    }, []);

    const handleUpdatePost = useCallback(async () => {
        if (!editingPostId || !editingPostText) return;

        const postDocRef = doc(db, 'studentPosts', editingPostId);
        const originalPost = posts.find(p => p.id === editingPostId);
        if (!originalPost) return;

        const originalContent = originalPost.content;

        // 1. Optimistic Update
        const optimisticPost = { 
            ...originalPost, 
            content: editingPostText,
            editedAt: new Date() // Use local date for optimistic UI
        };
        setPosts(prevPosts => prevPosts.map(p => p.id === editingPostId ? optimisticPost : p));
        handleCancelEdit();

        // 2. Database Update
        try {
            await updateDoc(postDocRef, { 
                content: editingPostText,
                editedAt: serverTimestamp() // Use server timestamp for DB
            });
            showToast("Post updated successfully!", "success");
            // No need to setPosts again, UI is already updated
        } catch (error) {
            console.error("Error updating post:", error);
            showToast("Failed to update post. Reverting.", "error");
            // 3. Revert on failure
            setPosts(prevPosts => prevPosts.map(p => 
                p.id === editingPostId ? { ...p, content: originalContent, editedAt: originalPost.editedAt } : p
            ));
        }
    }, [editingPostId, editingPostText, posts, setPosts, showToast, handleCancelEdit]);

    const handleDeletePost = useCallback(async (id) => {
        if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) {
            return;
        }

        const postToDelete = posts.find(p => p.id === id);
        if (!postToDelete) return;

        // 1. Optimistic Update (Remove from UI)
        const optimisticPosts = posts.filter(p => p.id !== id);
        setPosts(optimisticPosts);

        // 2. Database Update
        try {
            await deleteDoc(doc(db, 'studentPosts', id));
            showToast("Post deleted.", "info");
            // TODO: Add logic to delete comments/reactions subcollections if needed
        } catch (error) {
            console.error("Error deleting post:", error);
            showToast("Failed to delete post. Reverting.", "error");
            // 3. Revert on failure (Add back to list)
            setPosts(posts); // `posts` still holds the original state from the hook's closure
        }
    }, [posts, setPosts, showToast]);

    // --- Interaction Handlers (Optimistic) ---

    const togglePostExpansion = useCallback((postId) => {
        setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    }, []);

    const handleToggleReaction = useCallback(async (postId, reactionType) => {
        if (!currentUserId) {
            console.warn("handleToggleReaction called with no currentUserId.");
            return;
        }
        
        const postRef = doc(db, 'studentPosts', postId);
        
        // Find the original post from the *current* state
        const originalPost = posts.find(p => p.id === postId);
        if (!originalPost) {
            console.error("Could not find post to react to in local state.");
            return;
        }

        const originalReactions = { ...(originalPost.reactions || {}) };

        // 1. Optimistic Update
        const optimisticReactions = { ...originalReactions };
        const currentReaction = optimisticReactions[currentUserId];

        if (currentReaction === reactionType) {
            // User is un-reacting
            delete optimisticReactions[currentUserId];
        } else {
            // User is adding or changing reaction
            optimisticReactions[currentUserId] = reactionType;
        }

        const optimisticPost = { ...originalPost, reactions: optimisticReactions };
        
        // Update the local state immediately
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? optimisticPost : p));

        // 2. Database Update
        try {
            // Use a transaction for safety
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post does not exist!";
                }

                // Get fresh reactions from DB to avoid race conditions
                const freshReactions = postDoc.data().reactions || {};
                const freshCurrentReaction = freshReactions[currentUserId];

                if (freshCurrentReaction === reactionType) {
                    delete freshReactions[currentUserId];
                } else {
                    freshReactions[currentUserId] = reactionType;
                }
                
                transaction.update(postRef, { reactions: freshReactions });
            });
            // Success! UI is already updated, so do nothing.
        } catch (error) {
            console.error("Error toggling reaction:", error);
            showToast("Failed to update reaction. Reverting.", "error");
            // 3. Revert on failure
            const revertedPost = { ...originalPost, reactions: originalReactions };
            setPosts(prevPosts => prevPosts.map(p => p.id === postId ? revertedPost : p));
        }
    }, [currentUserId, posts, setPosts, showToast]);

    // --- Modal Handlers ---

    // --- THIS IS THE FIX (A) ---
    // Change to accept `postId` and find the post from the `posts` state array.
    const handleViewReactions = useCallback((postId) => {
        const currentPost = posts.find(p => p.id === postId);
        if (currentPost) {
            setReactionsModalPost(currentPost);
            setIsReactionsModalOpen(true);
        } else {
            console.error("Could not find post to view reactions for.");
        }
    }, [posts]); // Add `posts` dependency
    // --- END OF FIX (A) ---
    
    const handleCloseReactions = useCallback(() => {
        setIsReactionsModalOpen(false);
    }, []);
    
    // --- THIS IS THE FIX (B) ---
    // Change to accept `postId` and find the post from the `posts` state array.
    const handleViewComments = useCallback((postId) => {
        const currentPost = posts.find(p => p.id === postId);
        if (currentPost) {
            setCommentModalPost(currentPost);
            setIsCommentModalOpen(true);
        } else {
            console.error("Could not find post to view comments for.");
        }
    }, [posts]); // Add `posts` dependency
    // --- END OF FIX (B) ---

    const handleCloseComments = useCallback(() => {
        setIsCommentModalOpen(false);
    }, []);

    // Return all state and handlers
    return {
        sortedPosts, // This is derived from the `posts` prop
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
    };
};