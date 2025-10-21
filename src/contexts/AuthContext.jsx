// src/contexts/AuthContext.jsx

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef
} from 'react';
import { db } from '../services/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';

// ✅ Import the unified firestoreService
import firestoreService from '../services/firestoreService';

const AuthContext = createContext(null);

const MOCK_PASSWORD_CHECK = (submittedPassword, storedPassword) => {
  return submittedPassword === storedPassword;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSessionConflictModalOpen, setIsSessionConflictModalOpen] = useState(false);
  const [sessionConflictMessage, setSessionConflictMessage] = useState('');
  const currentSessionId = useRef(null);

  const handleSessionConflict = useCallback(
    (message = 'Your account was logged into from another device.') => {
      console.warn('Session conflict detected.');
      setSessionConflictMessage(message);
      setIsSessionConflictModalOpen(true);
    },
    []
  );

  const performLogout = useCallback(() => {
    console.log('Performing full logout.');
    setUser(null);
    localStorage.removeItem('loggedInUser');
    if (user && user.id) {
      localStorage.removeItem(`currentSessionId_${user.id}`);
    }
    currentSessionId.current = null;
    setIsSessionConflictModalOpen(false);
    window.location.href = '/';
  }, [user]);

  // 🔹 Restore logged in user from localStorage
  useEffect(() => {
    try {
      const loggedInUser = localStorage.getItem('loggedInUser');
      if (loggedInUser && loggedInUser !== 'null' && loggedInUser !== 'undefined') {
        const parsedUser = JSON.parse(loggedInUser);
        setUser(parsedUser);
        if (parsedUser.id) {
          currentSessionId.current = localStorage.getItem(
            `currentSessionId_${parsedUser.id}`
          );
        }
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage. Clearing it.', error);
      localStorage.removeItem('loggedInUser');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Session conflict listener
  useEffect(() => {
    let unsubscribe = () => {};

    if (user && user.id) {
      const userDocRef = doc(db, 'users', user.id);
      unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const latestUserData = docSnap.data();
            const firestoreSessionId = latestUserData.lastSessionId;

            if (
              currentSessionId.current &&
              firestoreSessionId &&
              firestoreSessionId !== currentSessionId.current
            ) {
              console.log(
                'Firestore session ID mismatch, triggering conflict:',
                firestoreSessionId,
                'vs local:',
                currentSessionId.current
              );
              handleSessionConflict();
            } else if (currentSessionId.current && !firestoreSessionId) {
              console.log(
                'Firestore session ID cleared by another device, triggering conflict.'
              );
              handleSessionConflict(
                'Your account was logged out from another device.'
              );
            }
          } else {
            handleSessionConflict(
              'Your user account no longer exists or has been deactivated.'
            );
          }
        },
        (error) => {
          console.error('Error listening to user document for session control:', error);
        }
      );
    }

    return () => unsubscribe();
  }, [user, handleSessionConflict]);

  // 🔹 Login
  const login = useCallback(async (email, password, selectedRole) => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('Invalid username or password.');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() };

      if (!MOCK_PASSWORD_CHECK(password, userData.password)) {
        throw new Error('Invalid username or password.');
      }

      if (userData.isRestricted) {
        throw new Error(
          'This account has been restricted. Please contact an administrator.'
        );
      }

      const designatedRole = userData.role;
      if (
        selectedRole === 'teacher' &&
        designatedRole !== 'admin' &&
        designatedRole !== 'teacher'
      ) {
        throw new Error(`You are not registered as a teacher.`);
      } else if (designatedRole !== selectedRole && designatedRole !== 'admin') {
        throw new Error(`You are not registered as a ${selectedRole}.`);
      }

      const newSessionId =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      currentSessionId.current = newSessionId;
      localStorage.setItem(`currentSessionId_${userData.id}`, newSessionId);

      const userDocRef = doc(db, 'users', userData.id);
      await updateDoc(userDocRef, { lastSessionId: newSessionId });

      setUser(userData);
      localStorage.setItem('loggedInUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Logout
  const logout = useCallback(async () => {
    if (user && user.id) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { lastSessionId: null });
      } catch (error) {
        console.error('Error clearing session ID from Firestore:', error);
      }
    }
    performLogout();
  }, [user, performLogout]);

  // 🔹 Refresh user profile
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      const profile = await firestoreService.getUserProfile(user.id);
      if (profile) {
        const storedSessionId = localStorage.getItem(`currentSessionId_${user.id}`);
        if (storedSessionId) {
          currentSessionId.current = storedSessionId;
        }
        setUser(profile);
        localStorage.setItem('loggedInUser', JSON.stringify(profile));
      } else {
        logout();
      }
    }
  }, [user, logout]);

  const value = useMemo(
    () => ({
      user,
      userProfile: user,
      loading,
      login,
      logout,
      refreshUserProfile,
      firestoreService, // ✅ pulled from unified file
      isSessionConflictModalOpen,
      sessionConflictMessage,
      setIsSessionConflictModalOpen,
      performLogout
    }),
    [
      user,
      loading,
      login,
      logout,
      refreshUserProfile,
      isSessionConflictModalOpen,
      sessionConflictMessage,
      performLogout
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
