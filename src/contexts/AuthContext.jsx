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

// 🔹 XP formula helper
const getXpForLevel = (level) => ((level - 1) * level / 2) * 500;

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

  // 🔹 Session conflict listener + XP-safe sync
  useEffect(() => {
    if (!user?.id) return;

    const userDocRef = doc(db, "users", user.id);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          handleSessionConflict(
            "Your user account no longer exists or has been deactivated."
          );
          return;
        }

        const latestUserData = docSnap.data();
        const firestoreSessionId = latestUserData.lastSessionId;

        // 🔐 Session conflict check
        if (
          currentSessionId.current &&
          firestoreSessionId &&
          firestoreSessionId !== currentSessionId.current
        ) {
          console.warn(
            "Session conflict detected:",
            firestoreSessionId,
            "vs local:",
            currentSessionId.current
          );
          handleSessionConflict();
          return;
        }

        // ✅ Real-time profile sync — XP-safe version
        setUser((prev) => {
          if (!prev) return { id: user.id, ...latestUserData };

          const IGNORE_KEYS = ["xp", "lastLogin", "updatedAt"];
          let hasChanged = false;

          // Check if any *non-XP* field changed
          for (const key of Object.keys(latestUserData)) {
            if (IGNORE_KEYS.includes(key)) continue;
            if (JSON.stringify(latestUserData[key]) !== JSON.stringify(prev[key])) {
              hasChanged = true;
              break;
            }
          }

          if (!hasChanged) {
            // ✅ XP changed? Update just that field — no full re-render.
            if (latestUserData.xp !== prev.xp) {
              const updatedUser = { ...prev, xp: latestUserData.xp };
              localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
              return updatedUser;
            }
            return prev;
          }

          // ✅ Something else changed (e.g., name, role, strand)
          const newUser = { ...prev, ...latestUserData };
          localStorage.setItem("loggedInUser", JSON.stringify(newUser));
          return newUser;
        });
      },
      (error) => {
        console.error("Error listening to user document:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.id, handleSessionConflict]);


  // 🔹 Automatic Level-Up Watcher
  useEffect(() => {
    if (!user?.id || typeof user.xp !== "number") return;

    const currentXP = user.xp;
    const currentLevel = user.level || 1;
    const nextLevelXP = getXpForLevel(currentLevel + 1);

    // ✅ Check if XP exceeds threshold for level up
    if (currentXP >= nextLevelXP) {
      const newLevel = currentLevel + 1;
      console.log(`🎉 Level Up! ${currentLevel} → ${newLevel}`);

      const userRef = doc(db, "users", user.id);
      updateDoc(userRef, { level: newLevel })
        .then(() => {
          setUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, level: newLevel };
            localStorage.setItem("loggedInUser", JSON.stringify(updated));
            return updated;
          });
        })
        .catch((err) => console.error("Error updating level:", err));
    }
  }, [user?.xp]);


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

      // ✅ Modified setter: ensures XP or level updates trigger re-renders
      setUserProfile: (updater) => {
        setUser(prev => {
          const updated = typeof updater === 'function' ? updater(prev) : updater;
          const newUser = { ...updated };
          localStorage.setItem('loggedInUser', JSON.stringify(newUser));
          return newUser;
        });
      },

      loading,
      login,
      logout,
      refreshUserProfile,
      firestoreService,
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
