import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { PrivacyScreen } from '@capacitor-community/privacy-screen'; // [NEW] Required to fix black screen
import { AnimatePresence, motion } from 'framer-motion';
import { SignalSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { handleAuthRedirect, createPresentationFromData } from './services/googleSlidesService';
import PostLoginExperience from "./components/PostLoginExperience";
import UpdateOverlay from './components/UpdateOverlay';
import LogoLoadingScreen from './components/common/LogoLoadingScreen';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import AntiCheatPlugin from './plugins/AntiCheatPlugin';
import './index.css';

// --- GLOBAL DEFINITIONS ---
if (typeof window !== "undefined") {
  // Legacy support for some libraries that expect QUOTE
  if (typeof window.QUOTE === "undefined") {
    window.QUOTE = '"';
  }
  // NOTE: Buffer polyfill is now handled automatically by vite.config.js
}

const LoginPage = lazy(() => import('./pages/LoginPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const AdminSignup = lazy(() => import('./pages/AdminSignup'));
const TestPage = lazy(() => import('./pages/TestPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

const AVERAGE_BUILD_SECONDS = 300;

// --- GLOBAL SAFETY NET: WATCHER COMPONENT ---
// This ensures that if you navigate ANYWHERE (e.g. back to dashboard), 
// all anti-cheat restrictions (Black Screen & Plugin) are KILLED immediately.
const AntiCheatRouteWatcher = () => {
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // 1. Kill the Native Anti-Cheat Plugin (Status Bar / Toasts)
      AntiCheatPlugin.disableAntiCheat().catch(err =>
        console.warn("Safety Net: Failed to disable AC plugin", err)
      );

      // 2. [FIX] Kill the Privacy Screen (The Black Cover)
      // This restores the ability to take screenshots and copy-paste when leaving the quiz.
      PrivacyScreen.disable().catch(err =>
        console.warn("Safety Net: Failed to disable Privacy Screen", err)
      );
    }
  }, [location]);

  return null;
};

// --- SYSTEM STATUS LISTENER (Version + Connectivity) ---
const SystemStatusListener = () => {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const checkVersion = async () => {
      if (!navigator.onLine) return;

      try {
        const res = await fetch('/version.json?t=' + new Date().getTime());
        if (!res.ok) return;

        const data = await res.json();
        const serverVersion = data.version;
        const localVersion = localStorage.getItem('app_version');

        if (localVersion && localVersion !== serverVersion) {
          console.log(`New version detected: ${serverVersion}. Updating from ${localVersion}`);

          localStorage.setItem('app_version', serverVersion);
          localStorage.setItem("hologram_update_pending", "true");

          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }

          window.location.reload(true);
        } else {
          localStorage.setItem('app_version', serverVersion);
        }
      } catch (err) {
        console.error('Failed to check version:', err);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      showToast("Connection restored. You are back online.", "success", 4000);
      checkVersion();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("Connection lost. Let's switch to offline mode.", "warning", 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
        checkVersion();
    }

    const interval = setInterval(() => {
        if (navigator.onLine) checkVersion();
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [showToast]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0, scaleY: 0.9 }}
          animate={{ opacity: 1, height: 'auto', scaleY: 1 }}
          exit={{ opacity: 0, height: 0, scaleY: 0.9, transition: { duration: 0.2 } }}
          className="bg-amber-50 dark:bg-amber-900/40 border-b border-amber-200/50 dark:border-amber-500/20 overflow-hidden relative z-[10000] origin-top"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10" />
          <div className="max-w-[1920px] mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-center gap-2.5 relative">
            <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <SignalSlashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
            </div>
            <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100/90 whitespace-nowrap">
              You are working offline
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- SKELETONS ---
const TeacherSkeleton = () => (
  <div className="min-h-screen w-full bg-[#dae0f2] dark:bg-[#0a0c10] font-sans overflow-hidden flex relative z-10">
    {/* Ambient Loading Background */}
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-300/30 dark:bg-indigo-900/20 rounded-full blur-[120px]" />
      <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-sky-300/30 dark:bg-sky-900/20 rounded-full blur-[120px]" />
    </div>

    {/* Sidebar Skeleton (Matching AestheticSidebar) */}
    <div className="hidden lg:block relative h-[calc(100vh-32px)] my-4 ml-4 w-[88px] shrink-0 z-50">
      <div className="absolute top-0 left-0 bottom-0 flex flex-col w-full rounded-[32px] overflow-hidden bg-white/65 dark:bg-[#121215]/65 backdrop-blur-[24px] border border-white/50 dark:border-white/10 shadow-lg">
        {/* Logo Area */}
        <div className="h-28 flex items-center px-6 overflow-hidden shrink-0">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700/50 flex-shrink-0 animate-pulse" />
        </div>
        {/* Nav Items */}
        <div className="flex-1 flex flex-col gap-3 px-4 py-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center h-14 rounded-2xl">
              <div className="min-w-[3.5rem] h-full flex justify-center items-center">
                <div className="w-6 h-6 rounded-md bg-slate-300 dark:bg-slate-700/50 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        {/* Bottom Action Area */}
        <div className="p-4 shrink-0 pb-6">
          <div className="flex items-center w-full h-14 rounded-2xl">
            <div className="min-w-[3.5rem] flex justify-center items-center">
              <div className="w-10 h-10 rounded-xl bg-slate-300 dark:bg-slate-700/50 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Main Content Area */}
    <div className="flex-1 flex flex-col h-screen overflow-y-auto custom-scrollbar relative z-10">
      {/* Global Toolbar Skeleton (Mocking TopNav) */}
      <div className="w-full px-4 pt-4 sm:px-6 sm:pt-6 max-w-[1920px] mx-auto mb-4 shrink-0">
        <div className="h-28 w-full flex items-center justify-between pointer-events-none">
          <div className="flex flex-col justify-center">
            <div className="w-24 h-3 bg-slate-300 dark:bg-slate-700/50 rounded-full mb-1.5 animate-pulse" />
            <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800/50 rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-6">
            <div className="w-64 h-12 rounded-full bg-white/30 dark:bg-black/45 shadow-sm animate-pulse" />
            <div className="w-32 h-[52px] rounded-full bg-slate-300 dark:bg-slate-700/50 animate-pulse" />
            <div className="w-px h-8 bg-slate-200 dark:bg-black/40 mx-2" />
            <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700/50 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-6 w-full max-w-[1920px] mx-auto flex flex-col gap-4 pb-32 lg:pb-8 flex-1">

        {/* --- TOP GRID: HERO BANNER & ACTIONS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-[14px]">

          {/* 1. Hero Banner (Right side on desktop) */}
          <div className="col-span-1 lg:col-span-7 lg:order-2 h-[280px] sm:h-[320px] lg:h-[374px] rounded-[2rem] sm:rounded-[3rem] bg-indigo-900/40 dark:bg-indigo-900/20 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden relative animate-pulse flex flex-col justify-end p-5 sm:p-12 lg:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-800/20 to-transparent" />
            {/* Desktop Draggable Card Mock */}
            <div className="hidden lg:flex flex-col gap-2 w-full max-w-[360px] bg-white/10 backdrop-blur-md rounded-[2rem] p-5 shadow-inner border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-white/20" />
                <div className="w-16 h-3 rounded-full bg-white/20" />
              </div>
              <div className="w-3/4 h-6 rounded-md bg-white/30 mb-2" />
              <div className="w-full h-3 rounded-sm bg-white/20 mb-1" />
              <div className="w-5/6 h-3 rounded-sm bg-white/20 mb-3" />
              <div className="w-full h-8 rounded-xl bg-white/30 mt-2" />
            </div>
          </div>

          {/* 2. Left Column (Greeting & Action Buttons) */}
          <div className="col-span-1 lg:col-span-5 lg:order-1 flex flex-col gap-4 lg:gap-[14px] h-full">

            {/* Desktop Greeting Block */}
            <div className="hidden lg:flex h-[220px] p-6 rounded-[2.5rem] bg-white/40 dark:bg-[#121212]/40 backdrop-blur-2xl border border-slate-200/50 dark:border-white/5 flex-col justify-between shadow-lg animate-pulse">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2 w-32">
                  <div className="h-12 w-full bg-slate-200 dark:bg-white/10 rounded-lg" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
                </div>
                <div className="h-10 w-10 bg-slate-200 dark:bg-white/10 rounded-full" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="h-10 w-48 bg-slate-200 dark:bg-white/10 rounded-lg" />
              </div>
            </div>

            {/* Action Buttons Grid (Post / Schedule) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-[14px] flex-1">

              {/* Post Button */}
              <div className="col-span-1 lg:col-span-2 h-[150px] sm:h-auto lg:h-[140px] rounded-[2rem] sm:rounded-[2.5rem] bg-indigo-100/50 dark:bg-indigo-900/20 backdrop-blur-md p-5 lg:p-4 flex flex-col justify-between border border-indigo-200/50 dark:border-indigo-500/20 animate-pulse relative overflow-hidden">
                <div className="h-9 w-9 lg:h-8 lg:w-8 rounded-full bg-indigo-200/50 dark:bg-indigo-400/20" />
                <div className="flex flex-col gap-1 mt-auto">
                  <div className="h-3 w-10 bg-indigo-200/50 dark:bg-indigo-400/20 rounded-full" />
                  <div className="h-5 w-16 bg-indigo-300/50 dark:bg-indigo-400/40 rounded-full" />
                </div>
              </div>

              {/* Schedule Widget */}
              <div className="col-span-1 lg:col-span-3 h-[150px] sm:h-auto lg:h-[140px] rounded-[2rem] sm:rounded-[2.5rem] bg-white/40 dark:bg-[#181818]/40 backdrop-blur-md p-5 lg:p-4 flex flex-col justify-between border border-slate-200/50 dark:border-white/5 animate-pulse relative">
                <div className="flex justify-between items-start">
                  <div className="h-9 w-9 lg:h-8 lg:w-8 rounded-full bg-slate-200 dark:bg-white/10" />
                  <div className="h-3 w-16 bg-slate-200 dark:bg-white/10 rounded-full mt-1" />
                </div>
                <div className="flex flex-col gap-1.5 mt-auto">
                  <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div className="h-3 w-1/3 bg-slate-200 dark:bg-white/10 rounded-full" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- ACTIVITY FEED AREA --- */}
        <div className="flex flex-col mt-4 gap-6">
          {/* Feed Header */}
          <div className="px-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 sm:w-2 h-6 sm:h-8 rounded-full bg-indigo-300 dark:bg-indigo-500/30 animate-pulse" />
              <div className="h-8 w-32 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
            </div>
            <div className="h-4 w-48 bg-slate-200 dark:bg-white/10 rounded-full ml-5 animate-pulse" />
          </div>

          {/* Prism Cards (Pinned) Row */}
          <div className="flex gap-4 sm:gap-6 overflow-hidden px-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-[85vw] sm:w-96 min-h-[200px] p-6 rounded-[2rem] bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 animate-pulse flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-5 w-20 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
                </div>
                <div className="flex flex-col gap-2 mb-6">
                  <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200/40 dark:border-white/10">
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-white/10 ml-auto" />
                </div>
              </div>
            ))}
          </div>

          {/* Frosted Slabs (Timeline) */}
          <div className="px-3 sm:px-4 flex flex-col gap-6">
            {[1, 2, 3].map(i => (
              <div key={`slab-${i}`} className="flex gap-3 sm:gap-6">
                {/* Date Column */}
                <div className="flex-none flex flex-col items-center pt-2 w-12 sm:w-14 animate-pulse">
                  <div className="h-3 w-8 bg-slate-200 dark:bg-white/10 rounded-sm mb-1" />
                  <div className="h-6 w-10 bg-slate-200 dark:bg-white/10 rounded-md mb-1" />
                  <div className="h-3 w-8 bg-slate-200 dark:bg-white/10 rounded-sm" />
                  <div className="w-[2px] flex-1 mt-3 bg-slate-200/50 dark:bg-white/10 rounded-full" />
                </div>
                {/* Content Slab */}
                <div className="flex-1 p-4 sm:p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-100/50 dark:border-white/5 animate-pulse min-h-[140px]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-white/10" />
                    <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="h-4 w-4/5 bg-slate-200 dark:bg-white/10 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StudentSkeleton = () => (
  <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col">
    <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
      <div className="mx-auto max-w-[1920px] h-16 rounded-[1.5rem] bg-white/50 dark:bg-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between px-4 animate-pulse">
        <div className="w-24 h-6 bg-slate-300 dark:bg-white/20 rounded-md"></div>
        <div className="hidden lg:block w-96 h-10 bg-slate-300 dark:bg-white/20 rounded-full"></div>
        <div className="w-10 h-10 bg-slate-300 dark:bg-white/20 rounded-full"></div>
      </div>
    </div>

    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto w-full space-y-8">
      <div className="w-full h-48 rounded-[2.5rem] bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/5 shadow-sm animate-pulse" />

      <div className="space-y-3">
        <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-20 h-20 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 w-40 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 w-full rounded-[2rem] bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/5 shadow-sm animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// --- AppRouter Component ---
const AppRouter = () => {
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    const checkAuthAndContinue = async () => {
      try {
        const isAuthenticated = await handleAuthRedirect();
        if (isAuthenticated) {
          const savedData = sessionStorage.getItem('googleSlidesData');
          if (savedData) {
            console.log("Redirect successful. Resuming presentation creation...");
            const { slideData, presentationTitle, subjectName, unitName } = JSON.parse(savedData);
            const url = await createPresentationFromData(
              slideData,
              presentationTitle,
              subjectName,
              unitName
            );
            if (url) {
              console.log("Presentation created successfully:", url);
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }
        }
      } catch (error) {
        if (error.message !== "REDIRECTING_FOR_AUTH") {
          console.error("Error handling auth redirect:", error);
        }
      }
    };
    checkAuthAndContinue();
  }, []);

  // [MODIFIED] Hybrid Loading Logic
  if (loading) {
    // 1. If Native App (APK) -> Show Logo Screen (smooth transition from splash)
    if (Capacitor.isNativePlatform()) {
      return <LogoLoadingScreen />;
    }

    // 2. If Browser/Web -> Show Skeletons (faster perceived load)
    const storedRole = localStorage.getItem('userRole');
    const role = userProfile?.role || storedRole;

    if (role === 'student') {
      return <StudentSkeleton />;
    } else {
      return <TeacherSkeleton />;
    }
  }

  // Helper to choose fallback during LAZY LOADING (Chunk download)
  const getSuspenseFallback = () => {
    const role = userProfile?.role || localStorage.getItem('userRole');
    // Using StudentSkeleton for parent as well for now
    return (role === 'student' || role === 'parent') ? <StudentSkeleton /> : <TeacherSkeleton />;
  };

  return (
    <Suspense fallback={getSuspenseFallback()}>
      {/* [UPDATED] Global Route Watcher: Disables Anti-Cheat & Privacy Screen on route change */}
      <AntiCheatRouteWatcher />

      <Routes>
        <Route path="/test" element={<TestPage />} />
        <Route path="/create-admin-xyz" element={<AdminSignup />} />

        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        <Route
          path="/login"
          element={
            !userProfile ? (
              <LoginPage />
            ) : (
              <Navigate
                to={userProfile.role === 'student' ? "/student" : userProfile.role === 'parent' ? "/parent" : "/dashboard"}
                replace
              />
            )
          }
        />

        <Route
          path="/student/*"
          element={
            !userProfile ? (
              <Navigate to="/login" replace />
            ) : userProfile.role === 'student' ? (
              <PostLoginExperience>
                <StudentDashboard />
              </PostLoginExperience>
            ) : (
              <Navigate to={userProfile.role === 'parent' ? "/parent" : "/dashboard"} replace />
            )
          }
        />

        <Route
          path="/parent/*"
          element={
            !userProfile ? (
              <Navigate to="/login" replace />
            ) : userProfile.role === 'parent' ? (
              <PostLoginExperience>
                <ParentDashboard />
              </PostLoginExperience>
            ) : (
              <Navigate to={userProfile.role === 'student' ? "/student" : "/dashboard"} replace />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            !userProfile ? (
              <Navigate to="/login" replace />
            ) : (userProfile.role === 'teacher' || userProfile.role === 'admin') ? (
              <PostLoginExperience>
                <TeacherDashboard />
              </PostLoginExperience>
            ) : (
              <Navigate to={userProfile.role === 'parent' ? "/parent" : "/student"} replace />
            )
          }
        />

        <Route
          path="/"
          element={
            !userProfile ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate
                to={userProfile.role === 'student' ? "/student" : userProfile.role === 'parent' ? "/parent" : "/dashboard"}
                replace
              />
            )
          }
        />
      </Routes>
    </Suspense>
  );
};

export default function App() {
  const [buildStatus, setBuildStatus] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(AVERAGE_BUILD_SECONDS);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // [NEW] Handle Native Splash Screen Fade Out
  // Only runs on Native Platform
  useEffect(() => {
    const handleSplash = async () => {
      if (Capacitor.isNativePlatform()) {
        // Keep native splash visible for 1.5s to allow React to paint the LogoLoadingScreen
        await new Promise(resolve => setTimeout(resolve, 1500));
        await SplashScreen.hide();
      }
    };
    handleSplash();
  }, []);

  // --- Capacitor/Status Bar Effect ---
  useEffect(() => {
    const hideStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.hide();
        } catch (e) {
          console.error("Failed to hide status bar", e);
        }
      }
    };
    hideStatusBar();
  }, []);

  // --- Push Notification Effect ---
  useEffect(() => {
    const registerPush = async () => {
      if (!Capacitor.isNativePlatform()) return;

      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied notification permissions.');
        return;
      }

      console.log('Notification permission granted. Registering for push...');
      await PushNotifications.register();
    };

    registerPush();
  }, []);

  // --- Service Worker Effect ---
  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: registration => {
        setWaitingWorker(registration.waiting);
      },
    });
  }, []);

  // --- Build Status Effect ---
  useEffect(() => {
    let pollInterval;
    let countdownInterval;
    const checkBuildStatus = async () => {
      try {
        const res = await fetch('/api/build-status', { cache: 'no-store' });
        const data = await res.json();
        setBuildStatus(prevStatus => {
          if (prevStatus !== 'building' && data.status === 'building') {
            setTimeLeft(AVERAGE_BUILD_SECONDS);
            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = setInterval(() => {
              setTimeLeft(prevTime => Math.max(0, prevTime - 1));
            }, 1000);
            return 'building';
          }
          if (prevStatus === 'building' && data.status === 'ready') {
            if (countdownInterval) clearInterval(countdownInterval);
            if (pollInterval) clearInterval(pollInterval);
            return 'ready';
          }
          return data.status;
        });
      } catch (err) {
        console.error('Failed to fetch build status, assuming ready.', err);
        setBuildStatus('ready');
        if (pollInterval) clearInterval(pollInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      }
    };
    if (buildStatus !== 'building') {
      checkBuildStatus();
      pollInterval = setInterval(checkBuildStatus, 1800000);
    }
    return () => {
      clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  const handleEnter = () => {
    localStorage.setItem("hologram_update_pending", "true");
    if (waitingWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (buildStatus === 'building') {
    return <UpdateOverlay status="building" timeLeft={timeLeft} />;
  }
  if (waitingWorker) {
    return <UpdateOverlay status="complete" onEnter={handleEnter} />;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-900 dark:text-slate-100 min-h-screen">

        <SystemStatusListener />

        <AppRouter />
      </div>
    </BrowserRouter>
  );
}