import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../../services/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PiThumbsUpFill, PiHeartFill, PiSmileyStickerFill, PiStarFill, PiSmileySadFill, PiAngryFill, PiHeartbeatFill, PiChatCircleDotsFill } from 'react-icons/pi';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar'; // Assuming path
import Spinner from '../../../common/Spinner'; // Assuming path

const userProfileCache = new Map();

const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    let date;
    if (timestamp?.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    return date.toLocaleString();
};


const ViewAnnouncement = ({ announcementId, currentUserProfile, onBack }) => {
    const [announcement, setAnnouncement] = useState(null);
    const [comments, setComments] = useState([]);
    const [reactions, setReactions] = useState({});
    const [usersMap, setUsersMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState("");

    const fetchUsers = useCallback(async (userIds) => {
        const idsToFetch = [...new Set(userIds.filter(id => id && !userProfileCache.has(id)))];
        if (idsToFetch.length === 0) {
            setUsersMap(Object.fromEntries(userProfileCache));
            return;
        };

        try {
            const userBatches = [];
            for (let i = 0; i < idsToFetch.length; i += 30) {
                userBatches.push(idsToFetch.slice(i, i + 30));
            }
            for (const batch of userBatches) {
                 const usersQuery = query(collection(db, 'users'), where('__name__', 'in', batch));
                 const snapshot = await getDocs(usersQuery);
                 snapshot.forEach(doc => userProfileCache.set(doc.id, { id: doc.id, ...doc.data() }));
            }
           
            setUsersMap(Object.fromEntries(userProfileCache));
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    }, []);

    useEffect(() => {
        if (!announcementId) return;
        setLoading(true);

        const unsubAnnouncement = onSnapshot(doc(db, 'teacherAnnouncements', announcementId), (doc) => {
            if (doc.exists()) {
                const annData = { id: doc.id, ...doc.data() };
                setAnnouncement(annData);
                fetchUsers([annData.teacherId]);
            } else {
                setAnnouncement(null);
            }
            setLoading(false);
        });

        const commentsQuery = query(collection(db, `teacherAnnouncements/${announcementId}/comments`), orderBy('timestamp', 'asc'));
        const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
            const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setComments(fetchedComments);
            fetchUsers(fetchedComments.map(c => c.userId));
        });

        const reactionsQuery = query(collection(db, 'reactions'), where('announcementId', '==', announcementId));
        const unsubReactions = onSnapshot(reactionsQuery, (snapshot) => {
            const fetchedReactions = {};
            const userIds = [];
            snapshot.forEach(doc => {
                const reaction = doc.data();
                fetchedReactions[reaction.userId] = reaction.reactionType;
                userIds.push(reaction.userId);
            });
            setReactions(fetchedReactions);
            fetchUsers(userIds);
        });

        return () => {
            unsubAnnouncement();
            unsubComments();
            unsubReactions();
        };
    }, [announcementId, fetchUsers]);

     const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserProfile?.id) return;

        const commentData = {
            text: newComment,
            userId: currentUserProfile.id,
            timestamp: new Date(),
        };

        try {
            await addDoc(collection(db, `teacherAnnouncements/${announcementId}/comments`), commentData);
            setNewComment("");
        } catch (error) {
            console.error("Error posting comment: ", error);
        }
    };


    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Spinner /></div>;
    }

    if (!announcement) {
        return <div className="p-8 text-center">Announcement not found. <button onClick={onBack} className="text-blue-500">Go Back</button></div>;
    }
    
    const author = usersMap[announcement.teacherId];

    return (
        <div className="bg-zinc-50 min-h-screen">
            <header className="sticky top-0 bg-white/80 backdrop-blur-lg shadow-sm z-10 p-4 flex items-center">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-zinc-200">
                    <ArrowLeftIcon className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold ml-4">Announcement</h1>
            </header>
            
            <main className="p-4">
                <div className="bg-white rounded-xl shadow-md p-5">
                    <div className="flex items-center space-x-3 mb-4">
                        <UserInitialsAvatar user={author} size="w-12 h-12" />
                        <div>
                            <p className="font-bold">{author ? `${author.firstName} ${author.lastName}` : '...'}</p>
                            <p className="text-sm text-zinc-500">{formatTimestamp(announcement.createdAt)}</p>
                        </div>
                    </div>
                    <p className="text-zinc-800 whitespace-pre-wrap">{announcement.content}</p>
                    {announcement.photoURL && <img src={announcement.photoURL} alt="Announcement" className="mt-4 rounded-lg max-h-[50vh] w-full object-contain" />}
                </div>

                {/* Comments Section */}
                <div className="mt-6">
                    <h2 className="text-lg font-bold mb-4">Comments ({comments.length})</h2>
                     <div className="space-y-4">
                        {comments.map(comment => {
                             const commentAuthor = usersMap[comment.userId];
                            return (
                                <div key={comment.id} className="flex items-start space-x-3">
                                    <UserInitialsAvatar user={commentAuthor} size="w-10 h-10" />
                                    <div className="bg-white rounded-xl p-3 flex-1 shadow-sm">
                                        <p className="font-semibold text-sm">{commentAuthor ? `${commentAuthor.firstName} ${commentAuthor.lastName}` : '...'}</p>
                                        <p className="text-sm mt-1">{comment.text}</p>
                                        <p className="text-xs text-zinc-400 mt-2">{formatTimestamp(comment.timestamp)}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Post Comment Form */}
                    <form onSubmit={handlePostComment} className="mt-6 flex items-start space-x-3">
                         <UserInitialsAvatar user={currentUserProfile} size="w-10 h-10" />
                         <div className="flex-1">
                             <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full border-zinc-300 rounded-xl shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                rows="3"
                            ></textarea>
                            <button type="submit" className="mt-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition">Post Comment</button>
                         </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ViewAnnouncement;