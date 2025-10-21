import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import UserInitialsAvatar from './UserInitialsAvatar';
import { ThumbsUp, MessageCircle, Pencil, Trash2 } from 'lucide-react'; // Using lucide-react icons

const Post = ({ post, onPostDeleted }) => {
    const { user, userProfile } = useAuth();
    const { showToast } = useToast();
    
    const [commentText, setCommentText] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);

    // This check is now robust. It will work once `teacherId` is in your data.
    const canModify = userProfile?.role === 'admin' || userProfile?.id === post.teacherId;

    const hasLiked = post.likes?.includes(user.id);

    const handleLike = async () => {
        // Dynamically select collection based on post.type for robustness
        const postRef = doc(db, post.type === 'classAnnouncement' ? 'classAnnouncements' : 'teacherAnnouncements', post.id); 
        await updateDoc(postRef, {
            likes: hasLiked ? arrayRemove(user.id) : arrayUnion(user.id)
        });
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        const commentData = {
            userId: user.id,
            userName: `${userProfile.firstName} ${userProfile.lastName}`,
            text: commentText,
            createdAt: Timestamp.now()
        };
        // Dynamically select collection based on post.type
        const postRef = doc(db, post.type === 'classAnnouncement' ? 'classAnnouncements' : 'teacherAnnouncements', post.id); 
        await updateDoc(postRef, { comments: arrayUnion(commentData) });
        setCommentText('');
    };

    const handleUpdatePost = async () => {
        if (!editedContent.trim()) return showToast("Post content cannot be empty.", "error");
        // Dynamically select collection based on post.type
        const postRef = doc(db, post.type === 'classAnnouncement' ? 'classAnnouncements' : 'teacherAnnouncements', post.id); 
        await updateDoc(postRef, { content: editedContent });
        setIsEditing(false);
        showToast("Post updated successfully!", "success");
    };

    const handleDeletePost = async () => {
        if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
            // Dynamically select collection based on post.type
            await deleteDoc(doc(db, post.type === 'classAnnouncement' ? 'classAnnouncements' : 'teacherAnnouncements', post.id)); 
            showToast("Post deleted.", "success");
            if (onPostDeleted) onPostDeleted();
        }
    };

    return (
        // Applied glassmorphism styling to the main container
        <div className="p-6 rounded-xl shadow-lg backdrop-blur-md bg-white/20 border border-white/30 mb-6 relative">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                    <UserInitialsAvatar firstName={post.teacherName.split(' ')[0]} lastName={post.teacherName.split(' ')[1] || ''} />
                    <div className="ml-3">
                        <p className="font-semibold text-gray-900">{post.teacherName}</p>
                        <p className="text-xs text-gray-500">{post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
                    </div>
                </div>
                {/* Conditionally render Edit and Delete buttons with improved hover states */}
                {canModify && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3">
                        <button onClick={() => setIsEditing(true)} className="p-2 rounded-full text-gray-700 hover:bg-white/50 transition-colors" aria-label="Edit post">
                            <Pencil size={18} />
                        </button>
                        <button onClick={handleDeletePost} className="p-2 rounded-full text-red-600 hover:bg-white/50 transition-colors" aria-label="Delete post">
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div>
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white/70 text-gray-800 resize-y"
                        rows={4}
                    />
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">
                            Cancel
                        </button>
                        <button onClick={handleUpdatePost} className="btn-primary">
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            )}
            
            <div className="flex justify-between text-sm text-gray-600 mb-4 border-t border-b border-gray-200 py-2">
                <span>{post.likes?.length || 0} Likes</span>
                <span>{post.comments?.length || 0} Comments</span>
            </div>

            <div className="flex">
                <button onClick={handleLike} className={`flex-1 flex justify-center items-center py-2 space-x-2 transition-colors duration-200 rounded-l-lg ${hasLiked ? 'text-primary-600 font-semibold bg-primary-50 hover:bg-primary-100' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <ThumbsUp size={20} />
                    <span>Like</span>
                </button>
                <label htmlFor={`comment-input-${post.id}`} className="flex-1 flex justify-center items-center py-2 space-x-2 text-gray-600 hover:bg-gray-100 transition-colors duration-200 cursor-pointer rounded-r-lg">
                    <MessageCircle size={20} />
                    <span>Comment</span>
                </label>
            </div>
            
            <div className="mt-4 space-y-3">
                {post.comments?.sort((a,b) => a.createdAt.seconds - b.createdAt.seconds).map((comment, index) => (
                    <div key={index} className="flex items-start space-x-3 animate-slide-in-right">
                        <UserInitialsAvatar size="sm" firstName={comment.userName.split(' ')[0]} lastName={comment.userName.split(' ')[1] || ''} />
                        <div className="bg-gray-100/50 p-3 rounded-lg flex-1 text-gray-700 border border-gray-200/50"> {/* Subtle glassmorphism for comments */}
                            <p className="font-semibold text-sm text-gray-900">{comment.userName}</p>
                            <p className="text-sm">{comment.text}</p>
                        </div>
                    </div>
                ))}
                <div className="flex items-center space-x-3 pt-4">
                    <UserInitialsAvatar size="sm" firstName={userProfile?.firstName} lastName={userProfile?.lastName} />
                    <form onSubmit={handleCommentSubmit} className="flex-1">
                        <input
                            id={`comment-input-${post.id}`}
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full bg-white/70 border border-gray-300 rounded-full py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-800"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Post;