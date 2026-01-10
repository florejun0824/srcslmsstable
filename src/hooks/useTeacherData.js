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
      const snapshot = await getDocs(postsQuery); 
      
      // 2. Filter Client-Side 
      const userSchoolId = userProfile.schoolId || 'srcs_main';
      
      const posts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => {
            const postSchool = post.schoolId || 'srcs_main'; 
            return postSchool === userSchoolId;
        });

      setLoungePosts(posts);

      // 3. Gather User IDs for authors and reactions
      const userIdsToFetch = new Set();
      posts.forEach(post => {
        userIdsToFetch.add(post.authorId);
        if (post.reactions) {
            Object.keys(post.reactions).forEach(userId => userIdsToFetch.add(userId));
        }
      });
      
      await fetchMissingLoungeUsers(Array.from(userIdsToFetch));

    } catch (error) {
      console.error("Error fetching public posts:", error);
      // We handle the toast in the UI component based on error state if needed
    } finally {
      setIsLoungeLoading(false);
      setHasLoungeFetched(true); 
    }
  }, [userProfile, fetchMissingLoungeUsers]);

  // --- Effect: Main Data Subscriptions ---
  useEffect(() => {
    if (!user || !userProfile) {
        if (!user) setLoading(false);
        return;
    }

    setLoading(true);
    const teacherId = user.uid || user.id;

    // 1. Classes: Fetches by TeacherID
    const classesQuery = query(collection(db, "classes"), where("teacherId", "==", teacherId));
    
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
        setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter Legacy Announcements Client-Side
        const filtered = data.filter(ann => {
            const annSchool = ann.schoolId || 'srcs_main';
            return annSchool === schoolId;
        });
        setTeacherAnnouncements(filtered);
    }, (err) => {
        console.error("Firestore (announcements) error:", err);
    });

    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
        setCourseCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
        console.error("Firestore (categories) error:", err);
    });
    
    // Promise wrapper to determine "initial loading" state
    Promise.all([
        getDocs(classesQuery),
        getDocs(coursesQuery),
        getDocs(announcementsQuery)
    ]).then(() => {
        setLoading(false);
    }).catch(err => {
        console.error("Error during initial data fetch:", err);
        setLoading(false); 
    });

    return () => {
        unsubClasses();
        unsubCourses();
        unsubAnnouncements();
        unsubCategories();
    };
  }, [user, userProfile, schoolId]);

  // --- Effect: Import Classes List (On Demand) ---
  useEffect(() => {
    if (activeView === 'studentManagement' && userProfile?.schoolId) {
        setIsImportViewLoading(true);
        const fetchAllClassesForImport = async () => {
            try {
                // Fetch ALL classes sorted by name
                const q = query(
                    collection(db, "classes"), 
                    orderBy("name")
                );
                const querySnapshot = await getDocs(q);
                const allRawClasses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Filter Client-Side for Legacy Support
                const userSchoolId = userProfile.schoolId || 'srcs_main';
                const filteredClasses = allRawClasses.filter(cls => {
                    const clsSchool = cls.schoolId || 'srcs_main';
                    return clsSchool === userSchoolId;
                });

                setAllLmsClasses(filteredClasses);
            } catch (err) {
                console.error("Error fetching all classes:", err);
                setError("Failed to load class list for import.");
            } finally {
                setIsImportViewLoading(false);
            }
        };

        fetchAllClassesForImport();
    }
  }, [activeView, userProfile]);

  // --- Effect: Sync Current User to Lounge Map ---
  useEffect(() => {
    if (userProfile?.id) {
        setLoungeUsersMap(prev => ({
            ...prev,
            [userProfile.id]: userProfile
        }));
    }
  }, [userProfile]);

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
    fetchLoungePosts
  };
};