import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

const MOCK_PASSWORD_CHECK = (submittedPassword, storedPassword) => {
    return submittedPassword === storedPassword;
};

const firestoreService = {
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

    // --- ADDED: The missing function for joining a class ---
    joinClassWithCode: async (classCode, studentProfile) => {
        if (!classCode || !studentProfile) {
            throw new Error("Class code and student profile are required.");
        }
        // Ensure class code is uppercase to match database
        const upperCaseClassCode = classCode.toUpperCase();
        
        const classesRef = collection(db, "classes");
        const q = query(classesRef, where("classCode", "==", upperCaseClassCode));
        
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            throw new Error("Invalid class code. Please check the code and try again.");
        }

        const classDoc = querySnapshot.docs[0];
        const classDocRef = doc(db, "classes", classDoc.id);

        // Prepare the data to be added to the arrays
        const studentObject = { 
            id: studentProfile.id, 
            firstName: studentProfile.firstName, 
            lastName: studentProfile.lastName 
        };
        const studentId = studentProfile.id;

        // Update both the students object array and the studentIds array
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
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const loggedInUser = localStorage.getItem('loggedInUser');
            if (loggedInUser && loggedInUser !== 'null' && loggedInUser !== 'undefined') {
                setUser(JSON.parse(loggedInUser));
            }
        } catch (error) {
            console.error("Failed to parse user from localStorage. Clearing it.", error);
            localStorage.removeItem('loggedInUser');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password, selectedRole) => {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) throw new Error("Invalid username or password.");

        const userDoc = querySnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() };
        
        if (!MOCK_PASSWORD_CHECK(password, userData.password)) {
            throw new Error("Invalid username or password.");
        }

        const designatedRole = userData.role;
        if (selectedRole === 'teacher' && designatedRole !== 'admin' && designatedRole !== 'teacher') {
            throw new Error(`You are not registered as a teacher.`);
        } else if (designatedRole !== selectedRole && designatedRole !== 'admin') {
            throw new Error(`You are not registered as a ${selectedRole}.`);
        }

        setUser(userData);
        localStorage.setItem('loggedInUser', JSON.stringify(userData));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('loggedInUser');
    }, []);

    const refreshUserProfile = useCallback(async () => {
        if (user) {
            const profile = await firestoreService.getUserProfile(user.id);
            if (profile) {
                setUser(profile);
                localStorage.setItem('loggedInUser', JSON.stringify(profile));
            } else {
                logout();
            }
        }
    }, [user, logout]);

    const value = useMemo(() => ({
        user, 
        userProfile: user,
        loading, 
        login, 
        logout, 
        refreshUserProfile, 
        firestoreService 
    }), [user, loading, login, logout, refreshUserProfile]);
    
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);