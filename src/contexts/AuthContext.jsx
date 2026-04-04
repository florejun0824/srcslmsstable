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
import { app, db } from '../services/firebase'; // ✅ Added 'app' for Firebase Auth
import { getAuth, signInWithCustomToken } from 'firebase/auth'; // ✅ Added Auth methods
import {
  collection,
  query,
  where,
  getDocs,
  getDoc, // ✅ Added getDoc
  doc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';

// ✅ Import the unified firestoreService
import firestoreService from '../services/firestoreService';
import { recordLogin, flushSessionTime, clearSession, startHeartbeat, stopHeartbeat } from '../services/sessionTrackingService';

// 🏫 SCHOOL CONFIGURATION (Multi-Tenancy)
export const SCHOOLS = {
  srcs_main: { id: 'srcs_main', name: 'San Ramon Catholic School, Inc.' },
  hras_sipalay: { id: 'hras_sipalay', name: 'Holy Rosary Academy of Sipalay, Inc.' },
  kcc_kabankalan: { id: 'kcc_kabankalan', name: 'Kabankalan Catholic College, Inc.' },
  icad_dancalan: { id: 'icad_dancalan', name: 'Immaculate Conception Academy of Dancalan, Inc.' },
  mchs_magballo: { id: 'mchs_magballo', name: 'Magballo Catholic High School, Inc.' },
  ichs_ilog: { id: 'ichs_ilog', name: 'Ilog Catholic High School, Inc.' }
};

export const DEFAULT_SCHOOL_ID = 'srcs_main';

const AuthContext = createContext(null);

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

  // 🔹 MODIFIED: Accept redirectPath, defaulting to '/login'
  const performLogout = useCallback((redirectPath = '/login') => {
    console.log('Performing full logout.');
    setUser(null);
    localStorage.removeItem('loggedInUser');
    if (user && user.id) {
      localStorage.removeItem(`currentSessionId_${user.id}`);
    }
    currentSessionId.current = null;
    setIsSessionConflictModalOpen(false);
    window.location.href = redirectPath; // ✅ Uses the passed path
  }, [user]);

  // 🔹 Restore logged in user from localStorage
  useEffect(() => {
    try {
      const loggedInUser = localStorage.getItem('loggedInUser');
      if (loggedInUser && loggedInUser !== 'null' && loggedInUser !== 'undefined') {
        const parsedUser = JSON.parse(loggedInUser);

        // 🛡️ SAFETY NET: Default to Main School if missing
        if (!parsedUser.schoolId) {
          parsedUser.schoolId = DEFAULT_SCHOOL_ID;
        }

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

  // 📊 Flush session time on page close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionUserId = sessionStorage.getItem('srcs_session_user');
      if (sessionUserId) {
        // Use sendBeacon-style sync approach: navigator.sendBeacon isn't great for Firestore
        // Instead we rely on the heartbeat having saved recent data
        flushSessionTime(sessionUserId).catch(() => { });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

        // 🛡️ SAFETY NET: Default to Main School if missing
        if (!latestUserData.schoolId) {
          latestUserData.schoolId = DEFAULT_SCHOOL_ID;
        }

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

          // ✅ Something else changed (e.g., name, role, strand, schoolId)
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


  // 🔹 Login — Now Bridged with Vercel and Firebase Auth
  const login = useCallback(async (email, password, selectedRole = null) => {
    setLoading(true);
    try {
      // 1. Send credentials to your secure Vercel API to check the password
      // Note: Make sure the Vercel backend expects 'email' or 'username' depending on how you programmed it.
      const response = await fetch('https://srcslms.vercel.app/api/get-firebase-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }) 
      });

      const tokenData = await response.json();

      if (!response.ok) {
        throw new Error(tokenData.error || 'Invalid username or password.');
      }

      // 2. Officially log into Firebase using the returned custom token
      const auth = getAuth(app);
      const userCredential = await signInWithCustomToken(auth, tokenData.token);
      
      // The UID generated by Vercel is now officially attached to the Firebase session
      const userId = userCredential.user.uid;

      // 3. NOW we can securely fetch the user's data from Firestore
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
         throw new Error('User profile not found in database.');
      }

      const rawData = userDocSnap.data();

      // 🛡️ SAFETY NET: Default to Main School if missing
      const userData = {
        id: userId,
        ...rawData,
        schoolId: rawData.schoolId || DEFAULT_SCHOOL_ID
      };

      if (userData.isRestricted) {
        throw new Error('This account has been restricted. Please contact an administrator.');
      }

      // Role validation — only if selectedRole is explicitly provided (legacy/biometric)
      if (selectedRole) {
        const designatedRole = userData.role;
        if (
          selectedRole === 'teacher' &&
          designatedRole !== 'admin' &&
          designatedRole !== 'teacher'
        ) {
          throw new Error(`You are not registered as a teacher.`);
        } else if (
          selectedRole === 'student' &&
          designatedRole !== 'student' &&
          designatedRole !== 'parent' &&
          designatedRole !== 'admin'
        ) {
          throw new Error(`You are not registered as a student.`);
        }
      }

      const newSessionId =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      currentSessionId.current = newSessionId;
      localStorage.setItem(`currentSessionId_${userData.id}`, newSessionId);

      await updateDoc(userDocRef, {
        lastSessionId: newSessionId,
        lastLogin: new Date() // Javascript Date object is completely fine here
      });

      setUser(userData);
      localStorage.setItem('loggedInUser', JSON.stringify(userData));

      // Auto-generate parentLinkCode for student accounts that don't have one
      if (userData.role === 'student' && !userData.parentLinkCode) {
        firestoreService.generateParentLinkCode(userData.id).catch(err => {
          console.warn('Failed to auto-generate parentLinkCode:', err);
        });
      }

      // 📊 Track login for students, teachers, and admins
      if (['student', 'teacher', 'admin'].includes(userData.role)) {
        recordLogin(userData.id).catch(err => {
          console.warn('Failed to record login:', err);
        });
        startHeartbeat(userData.id);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔹 Logout - Modified to accept redirectPath
  const logout = useCallback(async (redirectPath = '/login') => {
    if (user && user.id) {
      try {
        // 📊 Flush session time before logout
        if (['student', 'teacher', 'admin'].includes(user.role)) {
          await flushSessionTime(user.id).catch(() => { });
          stopHeartbeat();
          clearSession();
        }
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, { lastSessionId: null });
        
        // Ensure Firebase Auth is signed out locally
        const auth = getAuth(app);
        await auth.signOut();
      } catch (error) {
        console.error('Error during logout cleanup:', error);
      }
    }
    performLogout(redirectPath);
  }, [user, performLogout]);

  // 🔹 Refresh user profile
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      const profile = await firestoreService.getUserProfile(user.id);
      if (profile) {
        // 🛡️ SAFETY NET: Default to Main School if missing
        if (!profile.schoolId) {
          profile.schoolId = DEFAULT_SCHOOL_ID;
        }

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