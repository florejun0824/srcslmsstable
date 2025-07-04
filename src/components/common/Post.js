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
        const postRef = doc(db, "announcements", post.id);
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
        const postRef = doc(db, "announcements", post.id);
        await updateDoc(postRef, { comments: arrayUnion(commentData) });
        setCommentText('');
    };

    const handleUpdatePost = async () => {
        if (!editedContent.trim()) return showToast("Post content cannot be empty.", "error");
        const postRef = doc(db, "announcements", post.id);
        await updateDoc(postRef, { content: editedContent });
        setIsEditing(false);
        showToast("Post updated successfully!", "success");
    };

    const handleDeletePost = async () => {
        if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
            await deleteDoc(doc(db, "announcements", post.id));
            showToast("Post deleted.", "success");
            if (onPostDeleted) onPostDeleted();
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                    <UserInitialsAvatar firstName={post.teacherName.split(' ')[0]} lastName={post.teacherName.split(' ')[1] || ''} />
                    <div className="ml-3">
                        <p className="font-bold text-gray-800">{post.teacherName}</p>
                        <p className="text-xs text-gray-500">{new Date(post.createdAt?.seconds * 1000).toLocaleString()}</p>
                    </div>
                </div>
                {/* Conditionally render Edit and Delete buttons */}
                {canModify && !isEditing && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-gray-100" aria-label="Edit post">
                            <Pencil size={18} className="text-gray-600" />
                        </button>
                        <button onClick={handleDeletePost} className="p-2 rounded-full hover:bg-gray-100" aria-label="Delete post">
                            <Trash2 size={18} className="text-red-600" />
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div>
                    <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={4}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                            Cancel
                        </button>
                        <button onClick={handleUpdatePost} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            Save Changes
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>
            )}
            
            <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>{post.likes?.length || 0} Likes</span>
                <span>{post.comments?.length || 0} Comments</span>
            </div>

            <div className="border-t border-b border-gray-200 flex">
                <button onClick={handleLike} className={`flex-1 flex justify-center items-center py-2 space-x-2 hover:bg-gray-100 transition-colors ${hasLiked ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                    <ThumbsUp size={20} />
                    <span>Like</span>
                </button>
                <label htmlFor={`comment-input-${post.id}`} className="flex-1 flex justify-center items-center py-2 space-x-2 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
                    <MessageCircle size={20} />
                    <span>Comment</span>
                </label>
            </div>
            
            <div className="mt-4 space-y-3">
                {post.comments?.sort((a,b) => a.createdAt.seconds - b.createdAt.seconds).map((comment, index) => (
                    <div key={index} className="flex items-start space-x-3">
                        <UserInitialsAvatar size="sm" firstName={comment.userName.split(' ')[0]} lastName={comment.userName.split(' ')[1] || ''} />
                        <div className="bg-gray-100 p-2 rounded-lg flex-1">
                            <p className="font-bold text-sm text-gray-800">{comment.userName}</p>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                        </div>
                    </div>
                ))}
                <div className="flex items-center space-x-3 pt-4">
                    <UserInitialsAvatar size="sm" firstName={userProfile.firstName} lastName={userProfile.lastName} />
                    <form onSubmit={handleCommentSubmit} className="flex-1">
                        <input
                            id={`comment-input-${post.id}`}
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full bg-gray-100 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Post;