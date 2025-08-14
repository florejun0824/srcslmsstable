import React, { useState, useEffect, createContext, useContext, useMemo, useCallback, useRef } from 'react';
import { db } from '../services/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    addDoc,
    deleteDoc,
    updateDoc,
    writeBatch,
    arrayUnion,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';

const AuthContext = createContext(null);

const MOCK_PASSWORD_CHECK = (submittedPassword, storedPassword) => {
    return submittedPassword === storedPassword;
};

const firestoreService = {
    // ... (all your existing functions like getUserProfile, getAllUsers, etc. remain the same)
    getUserProfile: async (uid) => {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
    },
    getAllUsers: async () => {
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    addUser: (userData) => {
        return addDoc(collection(db, "users"), userData);
    },
    deleteUser: (userId) => {
        return deleteDoc(doc(db, "users", userId));
    },
    updateUserPassword: (userId, newPassword) => {
        return updateDoc(doc(db, "users", userId), { password: newPassword });
    },
    addMultipleUsers: async (users) => {
        const batch = writeBatch(db);
        const usersCollectionRef = collection(db, "users");
        users.forEach((user) => {
            const newUserRef = doc(usersCollectionRef);
            batch.set(newUserRef, user);
        });
        await batch.commit();
    },
    updateUserProfile: (userId, data) => {
        const userDocRef = doc(db, "users", userId);
        return updateDoc(userDocRef, data);
    },
    deleteMultipleUsers: async (userIds) => {
        const batch = writeBatch(db);
        userIds.forEach(userId => {
            const userDocRef = doc(db, 'users', userId);
            batch.delete(userDocRef);
        });
        await batch.commit();
    },
    updateClassArchiveStatus: (classId, isArchived) => {
        const classDocRef = doc(db, "classes", classId);
        return updateDoc(classDocRef, { isArchived: isArchived });
    },
    deleteClass: async (classId) => {
        const classDocRef = doc(db, "classes", classId);
        return await deleteDoc(classDocRef);
    },
    joinClassWithCode: async (classCode, studentProfile) => {
        if (!classCode || !studentProfile) {
            throw new Error("Class code and student profile are required.");
        }
        const upperCaseClassCode = classCode.toUpperCase();
        const classesRef = collection(db, "classes");
        const q = query(classesRef, where("classCode", "==", upperCaseClassCode));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            throw new Error("Invalid class code. Please check the code and try again.");
        }
        const classDoc = querySnapshot.docs[0];
        const classDocRef = doc(db, "classes", classDoc.id);
        const studentObject = { 
            id: studentProfile.id, 
            firstName: studentProfile.firstName, 
            lastName: studentProfile.lastName 
        };
        const studentId = studentProfile.id;
        await updateDoc(classDocRef, { 
            students: arrayUnion(studentObject),
            studentIds: arrayUnion(studentId)
        });
        return { success: true, className: classDoc.data().name };
    },
    updateAnnouncement: (classId, postId, newContent) => {
        const postRef = doc(db, `classes/${classId}/posts`, postId);
        return updateDoc(postRef, { content: newContent });
    },
    deleteAnnouncement: (classId, postId) => {
        const postRef = doc(db, `classes/${classId}/posts`, postId);
        return deleteDoc(postRef);
    },
    postTeacherAnnouncement: (teacherProfile, content) => {
        const announcementsRef = collection(db, "teacherAnnouncements");
        return addDoc(announcementsRef, {
            content,
            teacherId: teacherProfile.id,
            teacherName: `${teacherProfile.firstName} ${teacherProfile.lastName}`,
            createdAt: serverTimestamp(),
        });
    },

    /**
     * Updates the restriction flag directly in Firestore.
     * NOTE: This does NOT disable the user's ability to log in. It only sets a flag.
     */
    setUserRestrictionStatus: async (userId, shouldRestrict) => {
        const userDocRef = doc(db, 'users', userId);
        return updateDoc(userDocRef, { isRestricted: shouldRestrict });
    },

    /**
     * Updates the role directly in Firestore.
     * NOTE: This does NOT change the user's actual security permissions.
     */
    updateUserRole: async (userId, newRole) => {
        const userDocRef = doc(db, 'users', userId);
        return updateDoc(userDocRef, { role: newRole });
    },
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSessionConflictModalOpen, setIsSessionConflictModalOpen] = useState(false);
    const [sessionConflictMessage, setSessionConflictMessage] = useState('');
    const currentSessionId = useRef(null); // Use ref to store the current session ID

    // Function to handle session conflict (e.g., another device logs in)
    const handleSessionConflict = useCallback((message = "Your account was logged into from another device.") => {
        console.warn("Session conflict detected.");
        setSessionConflictMessage(message);
        setIsSessionConflictModalOpen(true);
        // Do NOT call logout immediately here. Let the user acknowledge the modal.
    }, []);

    const performLogout = useCallback(() => {
        console.log("Performing full logout.");
        setUser(null);
        localStorage.removeItem('loggedInUser');
        if (user && user.id) {
            localStorage.removeItem(`currentSessionId_${user.id}`); // Clear local session ID as well
        }
        currentSessionId.current = null; // Clear ref
        setIsSessionConflictModalOpen(false); // Close modal if open
        window.location.href = '/'; // Redirect to login page
    }, [user]); // Depend on user to ensure correct local storage key is cleared

    useEffect(() => {
        try {
            const loggedInUser = localStorage.getItem('loggedInUser');
            if (loggedInUser && loggedInUser !== 'null' && loggedInUser !== 'undefined') {
                const parsedUser = JSON.parse(loggedInUser);
                setUser(parsedUser);
                // When a user loads, check if they have a session ID
                if (parsedUser.id) {
                    currentSessionId.current = localStorage.getItem(`currentSessionId_${parsedUser.id}`);
                }
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage. Clearing it.", error);
            localStorage.removeItem('loggedInUser');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect to set up real-time listener for current user's session ID
    useEffect(() => {
        let unsubscribe = () => {}; // Initialize as a no-op function

        if (user && user.id) {
            const userDocRef = doc(db, 'users', user.id);
            unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const latestUserData = docSnap.data();
                    const firestoreSessionId = latestUserData.lastSessionId;

                    // Only trigger conflict if there's a current local session and it doesn't match Firestore
                    if (currentSessionId.current && firestoreSessionId && firestoreSessionId !== currentSessionId.current) {
                        console.log("Firestore session ID mismatch, triggering conflict:", firestoreSessionId, "vs local:", currentSessionId.current);
                        handleSessionConflict();
                    } else if (currentSessionId.current && !firestoreSessionId) {
                        // This means the user was logged in here, but another device explicitly logged out, clearing the Firestore ID
                        console.log("Firestore session ID cleared by another device, triggering conflict.");
                        handleSessionConflict("Your account was logged out from another device.");
                    }
                    // If currentSessionId.current is null, it means this user is not considered "logged in" with a session yet.
                    // Or if they match, no action needed.
                } else {
                    // User document no longer exists, log out
                    handleSessionConflict("Your user account no longer exists or has been deactivated.");
                }
            }, (error) => {
                console.error("Error listening to user document for session control:", error);
                // Optionally, handle this error (e.g., show a persistent warning, but don't force logout)
            });
        }

        // Cleanup function for the snapshot listener
        return () => unsubscribe();
    }, [user, handleSessionConflict]); // Re-run effect if user object changes

    const login = useCallback(async (email, password, selectedRole) => {
        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                throw new Error("Invalid username or password.");
            }

            const userDoc = querySnapshot.docs[0];
            const userData = { id: userDoc.id, ...userDoc.data() };

            if (!MOCK_PASSWORD_CHECK(password, userData.password)) {
                throw new Error("Invalid username or password.");
            }

            // Check if the account is restricted
            if (userData.isRestricted) {
                throw new Error("This account has been restricted. Please contact an administrator.");
            }

            const designatedRole = userData.role;
            if (selectedRole === 'teacher' && designatedRole !== 'admin' && designatedRole !== 'teacher') {
                throw new Error(`You are not registered as a teacher.`);
            } else if (designatedRole !== selectedRole && designatedRole !== 'admin') {
                throw new Error(`You are not registered as a ${selectedRole}.`);
            }

            // Generate a unique session ID for this login
            const newSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
            currentSessionId.current = newSessionId; // Store it in the ref
            localStorage.setItem(`currentSessionId_${userData.id}`, newSessionId); // Also store in local storage

            // Update user's Firestore document with the new session ID
            const userDocRef = doc(db, 'users', userData.id);
            await updateDoc(userDocRef, { lastSessionId: newSessionId });

            setUser(userData);
            localStorage.setItem('loggedInUser', JSON.stringify(userData));
        } catch (error) {
            console.error("Login error:", error);
            throw error; // Re-throw to be caught by the login form
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        if (user && user.id) {
            try {
                // Clear the session ID from Firestore upon explicit logout
                const userDocRef = doc(db, 'users', user.id);
                await updateDoc(userDocRef, { lastSessionId: null });
            } catch (error) {
                console.error("Error clearing session ID from Firestore:", error);
            }
        }
        performLogout(); // Call the shared logout function
    }, [user, performLogout]);

    const refreshUserProfile = useCallback(async () => {
        if (user) {
            const profile = await firestoreService.getUserProfile(user.id);
            if (profile) {
                // Ensure the current session ID is re-established if userProfile is refreshed
                const storedSessionId = localStorage.getItem(`currentSessionId_${user.id}`);
                if (storedSessionId) {
                    currentSessionId.current = storedSessionId;
                }
                setUser(profile);
                localStorage.setItem('loggedInUser', JSON.stringify(profile));
            } else {
                logout(); // If profile is not found, log out
            }
        }
    }, [user, logout]);


    const value = useMemo(() => ({
        user,
        userProfile: user, // userProfile is just 'user' for consistency
        loading,
        login,
        logout,
        refreshUserProfile,
        firestoreService,
        isSessionConflictModalOpen,
        sessionConflictMessage,
        setIsSessionConflictModalOpen, // Pass setter for modal to UI
        performLogout // Pass direct logout function for modal
    }), [user, loading, login, logout, refreshUserProfile, isSessionConflictModalOpen, sessionConflictMessage, performLogout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
