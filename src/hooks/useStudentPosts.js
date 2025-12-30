import { useState, useMemo, useCallback } from 'react';
import { 
    updateDoc, 
    doc, 
    deleteDoc, 
    runTransaction, 
    serverTimestamp, 
    addDoc, 
    collection 
} from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * A hook to manage all state and interactions for the student post feed.
 * ✅ NOW INCLUDES: Strict School-ID Filtering & Creation Logic
 */
export const useStudentPosts = (posts, setPosts, userProfile, showToast) => {
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

    // Derived helpers
    const currentUserId = userProfile?.id;
    // ✅ ENFORCEMENT: Determine the school ID (defaults to main if missing)
    const userSchoolId = userProfile?.schoolId || 'srcs_main';

    // ✅ UPDATED: Filter AND Sort posts
    // This ensures that even if 'posts' contains mixed data, we only process our school's data.
    const sortedPosts = useMemo(() => {
        if (!Array.isArray(posts)) return [];
        
        const filteredPosts = posts.filter(post => {
            // 1. If post has a schoolId, it MUST match the user's schoolId
            if (post.schoolId) {
                return post.schoolId === userSchoolId;
            }
            // 2. If post has NO schoolId (Legacy), it is only visible to 'srcs_main'
            return userSchoolId === 'srcs_main';
        });

        return filteredPosts.sort((a, b) => {
            const dateA = a.createdAt?.toDate() || 0;
            const dateB = b.createdAt?.toDate() || 0;
            return dateB - dateA; // Newest first
        });
    }, [posts, userSchoolId]);

    // --- ✅ NEW: Handle Post Creation (School Specific) ---
    const handleCreatePost = useCallback(async (content, audience = 'Public') => {
        if (!content.trim() || !currentUserId) return;

        try {
            const newPostData = {
                content: content.trim(),
                audience: audience, 
                authorId: currentUserId,
                
                // ✅ CRITICAL: Lock the post to this specific school
                schoolId: userSchoolId, 
                
                // Author Metadata
                teacherId: currentUserId, // Legacy support
                teacherName: `${userProfile.firstName} ${userProfile.lastName}`,
                teacherPhoto: userProfile.photoURL || null,
                
                // Post Stats
                createdAt: serverTimestamp(),
                reactions: {},
                commentsCount: 0,
                isPinned: false
            };

            // 1. Optimistic Update
            const optimisticPost = { 
                id: 'temp-' + Date.now(), 
                ...newPostData, 
                createdAt: { toDate: () => new Date() }
            };
            setPosts(prev => [optimisticPost, ...prev]);

            // 2. Database Insert
            const docRef = await addDoc(collection(db, 'studentPosts'), newPostData);
            
            // 3. Replace Optimistic ID
            setPosts(prev => prev.map(p => p.id === optimisticPost.id ? { ...p, id: docRef.id } : p));
            
            showToast("Posted successfully!", "success");
            return true; 

        } catch (error) {
            console.error("Error creating post:", error);
            showToast("Failed to post. Please try again.", "error");
            setPosts(prev => prev.filter(p => !p.id.startsWith('temp-')));
            return false;
        }
    }, [currentUserId, userSchoolId, userProfile, setPosts, showToast]);

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

        // Optimistic Update
        const optimisticPost = { 
            ...originalPost, 
            content: editingPostText,
            editedAt: new Date() 
        };
        setPosts(prevPosts => prevPosts.map(p => p.id === editingPostId ? optimisticPost : p));
        handleCancelEdit();

        try {
            await updateDoc(postDocRef, { 
                content: editingPostText,
                editedAt: serverTimestamp() 
            });
            showToast("Post updated successfully!", "success");
        } catch (error) {
            console.error("Error updating post:", error);
            showToast("Failed to update post. Reverting.", "error");
            setPosts(prevPosts => prevPosts.map(p => 
                p.id === editingPostId ? { ...p, content: originalContent, editedAt: originalPost.editedAt } : p
            ));
        }
    }, [editingPostId, editingPostText, posts, setPosts, showToast, handleCancelEdit]);

    const handleDeletePost = useCallback(async (id) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;

        const postToDelete = posts.find(p => p.id === id);
        if (!postToDelete) return;

        const optimisticPosts = posts.filter(p => p.id !== id);
        setPosts(optimisticPosts);

        try {
            await deleteDoc(doc(db, 'studentPosts', id));
            showToast("Post deleted.", "info");
        } catch (error) {
            console.error("Error deleting post:", error);
            showToast("Failed to delete post. Reverting.", "error");
            setPosts(posts); 
        }
    }, [posts, setPosts, showToast]);

    // --- Interaction Handlers ---

    const togglePostExpansion = useCallback((postId) => {
        setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
    }, []);

    const handleToggleReaction = useCallback(async (postId, reactionType) => {
        if (!currentUserId) return;
        
        const postRef = doc(db, 'studentPosts', postId);
        const originalPost = posts.find(p => p.id === postId);
        if (!originalPost) return;

        const originalReactions = { ...(originalPost.reactions || {}) };
        const optimisticReactions = { ...originalReactions };
        const currentReaction = optimisticReactions[currentUserId];

        if (currentReaction === reactionType) {
            delete optimisticReactions[currentUserId];
        } else {
            optimisticReactions[currentUserId] = reactionType;
        }

        const optimisticPost = { ...originalPost, reactions: optimisticReactions };
        setPosts(prevPosts => prevPosts.map(p => p.id === postId ? optimisticPost : p));

        try {
            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw "Post does not exist!";

                const freshReactions = postDoc.data().reactions || {};
                const freshCurrentReaction = freshReactions[currentUserId];

                if (freshCurrentReaction === reactionType) {
                    delete freshReactions[currentUserId];
                } else {
                    freshReactions[currentUserId] = reactionType;
                }
                
                transaction.update(postRef, { reactions: freshReactions });
            });
        } catch (error) {
            console.error("Error toggling reaction:", error);
            showToast("Failed to update reaction.", "error");
            const revertedPost = { ...originalPost, reactions: originalReactions };
            setPosts(prevPosts => prevPosts.map(p => p.id === postId ? revertedPost : p));
        }
    }, [currentUserId, posts, setPosts, showToast]);

    // --- Modal Handlers ---

    const handleViewReactions = useCallback((postId) => {
        const currentPost = posts.find(p => p.id === postId);
        if (currentPost) {
            setReactionsModalPost(currentPost);
            setIsReactionsModalOpen(true);
        }
    }, [posts]);
    
    const handleCloseReactions = useCallback(() => {
        setIsReactionsModalOpen(false);
    }, []);
    
    const handleViewComments = useCallback((postId) => {
        const currentPost = posts.find(p => p.id === postId);
        if (currentPost) {
            setCommentModalPost(currentPost);
            setIsCommentModalOpen(true);
        }
    }, [posts]);

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
        handleCreatePost, 
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