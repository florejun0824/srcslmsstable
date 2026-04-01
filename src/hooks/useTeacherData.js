import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    documentId
} from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust path if needed based on your folder structure
import { DEFAULT_SCHOOL_ID } from '../contexts/AuthContext'; // Adjust path
import { getWorker } from '../workers/workerApi';

export const useTeacherData = (user, userProfile, activeView) => {
    // --- State Definitions ---
    const [classes, setClasses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [courseCategories, setCourseCategories] = useState([]);
    const [teacherAnnouncements, setTeacherAnnouncements] = useState([]);

    // Lounge / Social State
    const [loungePosts, setLoungePosts] = useState([]);
    const [loungeUsersMap, setLoungeUsersMap] = useState({});
    const [hasLoungeFetched, setHasLoungeFetched] = useState(false);
    const [isLoungeLoading, setIsLoungeLoading] = useState(false);

    // Import View State
    const [allLmsClasses, setAllLmsClasses] = useState([]);
    const [isImportViewLoading, setIsImportViewLoading] = useState(false);

    // Admin Monitoring Data
    const [adminMonitoringTeachers, setAdminMonitoringTeachers] = useState([]);

    // General Loading/Error
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Derived School ID
    const schoolId = userProfile?.schoolId || DEFAULT_SCHOOL_ID;

    // --- Helper: Fetch Missing Lounge Users ---
    const fetchMissingLoungeUsers = useCallback(async (userIds) => {
        const uniqueIds = [...new Set(userIds.filter(id => !!id))];
        if (uniqueIds.length === 0) return;

        let usersToFetch = [];

        // Check against current map to avoid refetching
        setLoungeUsersMap(prevMap => {
            usersToFetch = uniqueIds.filter(id => !prevMap[id]);
            return prevMap;
        });

        if (usersToFetch.length === 0) return;

        try {
            // Firestore 'in' queries are limited to 30 items usually (safe limit)
            for (let i = 0; i < usersToFetch.length; i += 30) {
                const chunk = usersToFetch.slice(i, i + 30);
                const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
                const userSnap = await getDocs(usersQuery);
                const newUsers = {};
                userSnap.forEach(doc => {
                    newUsers[doc.id] = doc.data();
                });
                setLoungeUsersMap(prev => ({ ...prev, ...newUsers }));
            }
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    }, []);

    // --- Function: Fetch Lounge Posts ---
    const fetchLoungePosts = useCallback(async () => {
        if (!userProfile?.id || !userProfile?.schoolId) return;

        setIsLoungeLoading(true);

        try {
            // 1. Fetch posts WITHOUT strict school filtering in query (Legacy Support)
            const postsQuery = query(
                collection(db, 'studentPosts'),
                where('audience', '==', 'Public'),
                orderBy('createdAt', 'desc')
            );

            const unsubscribeLounge = onSnapshot(postsQuery, (snapshot) => {
                const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                getWorker().filterBySchool(fetchedPosts, schoolId, 'schoolId').then(result => {
                    setLoungePosts(result);
                    
                    // Find users we haven't fetched yet
                    const userIds = result.map(p => p.authorId);
                    result.forEach(p => {
                        if (p.likes) userIds.push(...p.likes);
                        if (p.comments) p.comments.forEach(c => userIds.push(c.authorId));
                    });
                    
                    fetchMissingLoungeUsers(userIds).finally(() => {
                        setIsLoungeLoading(false);
                        setHasLoungeFetched(true);
                    });
                });
            }, (err) => {
                console.error("Error fetching public posts:", err);
                setIsLoungeLoading(false);
            });

        } catch (error) {
            console.error("Error fetching public posts:", error);
        }
    }, [userProfile, schoolId, fetchMissingLoungeUsers]);

    // --- Effect: Main Data Subscriptions ---
    useEffect(() => {
        if (!user || !userProfile) {
            if (!user) setLoading(false);
            return;
        }

        setLoading(true);
        const teacherId = user.uid || user.id;

        // 1. Classes: Fetches by TeacherID
        const classesQuery = query(collection(db, "classes"));

        // 2. Courses: Shared Content
        const coursesQuery = query(collection(db, "courses"));

        // 3. Announcements: Sorted by date
        const announcementsQuery = query(
            collection(db, "teacherAnnouncements"),
            orderBy("createdAt", "desc")
        );

        // 4. Categories
        const categoriesQuery = query(collection(db, "subjectCategories"), orderBy("name"));

        // Subscriptions
        const unsubClasses = onSnapshot(classesQuery, snapshot => {
            const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Keep the filtered view for the sidebar
            const userClasses = fetchedClasses.filter(c => c.teacherId === teacherId);
            setClasses(userClasses);

            // Offload school filtering to worker for the import modal
            getWorker().filterBySchool(fetchedClasses, schoolId, 'schoolId').then(result => {
                setAllLmsClasses(result);
            });
        }, err => {
            console.error("Firestore (classes) error:", err);
            setError("Failed to load class data.");
        });

        const unsubCourses = onSnapshot(coursesQuery, snapshot => {
            setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, err => {
            console.error("Firestore (courses) error:", err);
            setError("Failed to load course data.");
        });

        const unsubAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            getWorker().filterBySchool(fetched, schoolId, 'targetSchool').then(result => {
                setTeacherAnnouncements(result);
            });
        }, (err) => {
            console.error("Firestore (announcements) error:", err);
        });

        const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
            setCourseCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
            console.error("Firestore (categories) error:", err);
        });

        const loadingTimer = setTimeout(() => {
            setLoading(false);
        }, 300);

        return () => {
            unsubClasses();
            unsubCourses();
            unsubAnnouncements();
            unsubCategories();
            clearTimeout(loadingTimer);
        };
    }, [user, userProfile, schoolId]);

    // --- Effect: Sync Current User to Lounge Map ---
    useEffect(() => {
        if (userProfile?.id) {
            setLoungeUsersMap(prev => ({
                ...prev,
                [userProfile.id]: userProfile
            }));
        }
    }, [userProfile]);

    // --- Effect: Fetch Teachers For Admin Monitoring ---
    useEffect(() => {
        if (activeView === 'monitoring' && userProfile?.role === 'admin') {
            const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedTeachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Filter by same school (like announcements/classes)
                const userSchoolId = userProfile?.schoolId || 'srcs_main';
                const filteredTeachers = fetchedTeachers.filter(t => (t.schoolId || 'srcs_main') === userSchoolId);

                // Sort alphabetically by first name
                filteredTeachers.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

                console.log("[useTeacherData] Fetched monitoring teachers:", filteredTeachers.length);

                setAdminMonitoringTeachers(filteredTeachers);
            }, (err) => {
                console.error("Failed to fetch teachers for monitoring:", err);
            });

            return () => unsubscribe();
        }
    }, [activeView, userProfile]);

    return {
        classes,
        courses,
        setCourses,
        courseCategories,
        teacherAnnouncements,
        setTeacherAnnouncements,
        loungePosts,
        setLoungePosts,
        loungeUsersMap,
        hasLoungeFetched,
        setHasLoungeFetched,
        allLmsClasses,
        loading,
        error,
        isLoungeLoading,
        isImportViewLoading,
        fetchLoungePosts,
        adminMonitoringTeachers
    };
};