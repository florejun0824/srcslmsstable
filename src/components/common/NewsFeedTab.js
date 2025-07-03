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

    const fetchPosts = useCallback(() => {
        if (!user) return;

        let postsQuery;

        if (user.role === 'teacher') {
            // Teacher sees all posts they've created
            postsQuery = query(
                collection(db, "announcements"),
                where("teacherId", "==", user.id),
                orderBy("createdAt", "desc")
            );
        } else { // Student
            // Student sees posts from classes they are enrolled in
            const classesQuery = query(collection(db, "classes"), where("students", "array-contains", user.id));
            getDocs(classesQuery).then(classSnap => {
                const classIds = classSnap.docs.map(d => d.id);
                if (classIds.length > 0) {
                    const studentPostsQuery = query(
                        collection(db, "announcements"),
                        where("classIds", "array-contains-any", classIds),
                        orderBy("createdAt", "desc")
                    );
                    const unsubscribe = onSnapshot(studentPostsQuery, (querySnapshot) => {
                        const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setPosts(fetchedPosts);
                        setLoading(false);
                    });
                    return () => unsubscribe();
                } else {
                    setLoading(false);
                }
            });
            return; // Exit early as getDocs is async
        }
        
        const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
            const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(fetchedPosts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        fetchPosts();
        
        // Fetch teacher's classes for the CreatePost component
        if (user.role === 'teacher') {
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
            {user.role === 'teacher' && (
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