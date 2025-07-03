import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, Timestamp } from 'firebase/firestore';
import UserInitialsAvatar from './UserInitialsAvatar';
import { ThumbsUp, MessageCircle } from 'lucide-react';

const Post = ({ post, onCommentAdded }) => {
    const { user, userProfile } = useAuth();
    const [commentText, setCommentText] = useState('');
    const { showToast } = useToast();

    const hasLiked = post.likes?.includes(user.id);

    const handleLike = async () => {
        const postRef = doc(db, "announcements", post.id);
        try {
            await updateDoc(postRef, {
                likes: hasLiked ? arrayRemove(user.id) : arrayUnion(user.id)
            });
        } catch (error) {
            console.error("Error liking post:", error);
        }
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

        try {
            const postRef = doc(db, "announcements", post.id);
            // We are using an array for comments for simplicity here.
            // For a large-scale app, a subcollection would be better.
            await updateDoc(postRef, {
                comments: arrayUnion(commentData)
            });
            setCommentText('');
            showToast("Comment added!", "success");
            if(onCommentAdded) onCommentAdded();
        } catch (error) {
            showToast("Failed to add comment.", "error");
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            {/* Post Header */}
            <div className="flex items-center mb-4">
                <UserInitialsAvatar firstName={post.teacherName.split(' ')[0]} lastName={post.teacherName.split(' ')[1] || ''} />
                <div className="ml-3">
                    <p className="font-bold text-gray-800">{post.teacherName}</p>
                    <p className="text-xs text-gray-500">{new Date(post.createdAt.seconds * 1000).toLocaleString()}</p>
                </div>
            </div>

            {/* Post Content */}
            <p className="text-gray-700 mb-4 whitespace-pre-wrap">{post.content}</p>

            {/* Post Stats */}
            <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>{post.likes?.length || 0} Likes</span>
                <span>{post.comments?.length || 0} Comments</span>
            </div>

            {/* Post Actions (for Students) */}
            {user.role === 'student' && (
                <div className="border-t border-b border-gray-200 flex">
                    <button
                        onClick={handleLike}
                        className={`flex-1 flex justify-center items-center py-2 space-x-2 hover:bg-gray-100 transition-colors ${hasLiked ? 'text-blue-600' : 'text-gray-600'}`}
                    >
                        <ThumbsUp size={20} />
                        <span className="font-semibold">Like</span>
                    </button>
                    <button className="flex-1 flex justify-center items-center py-2 space-x-2 text-gray-600 hover:bg-gray-100 transition-colors">
                        <MessageCircle size={20} />
                        <span className="font-semibold">Comment</span>
                    </button>
                </div>
            )}

            {/* Comments Section */}
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

                {/* Add Comment Form (for Students) */}
                {user.role === 'student' && (
                    <div className="flex items-center space-x-3 pt-4">
                        <UserInitialsAvatar size="sm" firstName={userProfile.firstName} lastName={userProfile.lastName} />
                        <form onSubmit={handleCommentSubmit} className="flex-1">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Write a comment..."
                                className="w-full bg-gray-100 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Post;