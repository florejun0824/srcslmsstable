import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import Spinner from './Spinner';
import CreatePost from './CreatePost';
import Post from './Post';

const NewsFeedTab = () => {
    const { user, userProfile } = useAuth();
    const [posts, setPosts] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPosts = useCallback(async () => {
        if (!user) return;
    
        setLoading(true);
        let allPosts = [];
    
        try {
            if (user.role === 'teacher' || user.role === 'admin') {
                // Query 1: Announcements for teachers/admins
                const teacherAnnouncementsQuery = query(
                    collection(db, "teacherAnnouncements"),
                    orderBy("createdAt", "desc")
                );
                const teacherAnnouncementsSnap = await getDocs(teacherAnnouncementsQuery);
                const teacherPosts = teacherAnnouncementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Query 2: Announcements for classes taught by the user
                const classAnnouncementsQuery = query(
                    collection(db, "classAnnouncements"),
                    orderBy("createdAt", "desc")
                );
                const classAnnouncementsSnap = await getDocs(classAnnouncementsQuery);
                const classPosts = classAnnouncementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
                allPosts = [...teacherPosts, ...classPosts];
            } else { // For students
                const classesQuery = query(collection(db, "classes"), where("studentIds", "array-contains", user.id));
                const classSnap = await getDocs(classesQuery);
                const classIds = classSnap.docs.map(d => d.id);
                
                if (classIds.length > 0) {
                    const studentPostsQuery = query(
                        collection(db, "classAnnouncements"),
                        where("classIds", "array-contains-any", classIds),
                        orderBy("createdAt", "desc")
                    );
                    const studentPostsSnap = await getDocs(studentPostsQuery);
                    allPosts = studentPostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
            }
    
            // Sort all fetched posts by creation date
            allPosts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setPosts(allPosts);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPosts();

        // Fetch teacher's classes for the CreatePost component
        if (user.role === 'teacher' || user.role === 'admin') {
            const teacherClassesQuery = query(collection(db, "classes"), where("teacherId", "==", user.id));
            const unsubscribe = onSnapshot(teacherClassesQuery, (snap) => {
                setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
            return () => unsubscribe();
        }

    }, [user, fetchPosts]);


    if (loading) return <Spinner />;

    return (
        <div className="max-w-2xl mx-auto">
            {(user.role === 'teacher' || user.role === 'admin') && (
                <CreatePost userProfile={userProfile} classes={classes} onPostCreated={fetchPosts} />
            )}
            
            {posts.length > 0 ? (
                posts.map(post => <Post key={post.id} post={post} onCommentAdded={fetchPosts} />)
            ) : (
                <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-500">
                    <h3 className="text-xl font-semibold">The Feed is Quiet</h3>
                    <p>There are no announcements to show right now.</p>
                </div>
            )}
        </div>
    );
};

export default NewsFeedTab;