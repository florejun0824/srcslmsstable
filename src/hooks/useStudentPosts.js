import { useState, useMemo, useCallback } from 'react';
import { updateDoc, doc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust this path if needed

/**
 * A hook to manage all state and interactions for the student post feed.
 * @param {Array} initialPosts - The raw list of posts from Firestore.
 * @param {string} currentUserId - The ID of the currently logged-in student.
 * @param {function} showToast - The showToast function from useToast.
 */
export const useStudentPosts = (initialPosts, currentUserId, showToast) => {
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
        if (!Array.isArray(initialPosts)) return [];
        return [...initialPosts].sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA; // Newest first
        });
    }, [initialPosts]);

    // --- Post CRUD Handlers ---

    const handleStartEditPost = useCallback((post) => {
        setEditingPostId(post.id);
        setEditingPostText(post.content);
    }, []);
    
    const handleCancelEdit = useCallback(() => {
        setEditingPostId(null);
        setEditingPostText('');
    }, []);

    const handleUpdatePost = useCallback(async () => {
        if (!editingPostId) return;
        const postDocRef = doc(db, 'studentPosts', editingPostId);
        try {
            await updateDoc(postDocRef, { 
                content: editingPostText,
                editedAt: serverTimestamp() 
            });
            showToast("Post updated successfully!", "success");
            handleCancelEdit();
        } catch (error) {
            console.error("Error updating post:", error);
            showToast("Failed to update post.", "error");
        }
    }, [editingPostId, editingPostText, showToast, handleCancelEdit]);

    const handleDeletePost = useCallback(async (id) => {
        if (window.confirm("Are you sure you want to delete this post? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, 'studentPosts', id));
                showToast("Post deleted.", "info");
                // We'll need to add logic to delete comments/reactions here later
            } catch (error) {
                console.error("Error deleting post:", error);
                showToast("Failed to delete post.", "error");
            }
        }
    }, [showToast]);

    // --- Interaction Handlers ---

    const togglePostExpansion = useCallback((postId) => {
        setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    }, []);

    const handleToggleReaction = useCallback(async (postId, reactionType) => {
        if (!currentUserId) return;
        
        const postRef = doc(db, 'studentPosts', postId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                    throw "Post does not exist!";
                }

                const data = postDoc.data();
                const reactions = data.reactions || {};
                const currentReaction = reactions[currentUserId];

                if (currentReaction === reactionType) {
                    // User is clicking the same reaction, so un-react
                    delete reactions[currentUserId];
                } else {
                    // User is adding a new reaction or changing their reaction
                    reactions[currentUserId] = reactionType;
                }
                
                transaction.update(postRef, { reactions });
            });
        } catch (error) {
            console.error("Error toggling reaction:", error);
            showToast("Failed to update reaction.", "error");
        }
    }, [currentUserId, showToast]);

    // --- Modal Handlers ---

    const handleViewReactions = useCallback((post) => {
        setReactionsModalPost(post);
        setIsReactionsModalOpen(true);
    }, []);
    
    const handleCloseReactions = useCallback(() => {
        setIsReactionsModalOpen(false);
    }, []);
    
    const handleViewComments = useCallback((post) => {
        setCommentModalPost(post);
        setIsCommentModalOpen(true);
    }, []);

    const handleCloseComments = useCallback(() => {
        setIsCommentModalOpen(false);
    }, []);

    return {
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
    };
};