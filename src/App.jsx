// src/App.jsx

if (typeof window !== "undefined") {
  if (typeof window.QUOTE === "undefined") {
    window.QUOTE = '"';
  }
  if (typeof window.Buffer === "undefined") {
    try {
      const { Buffer } = require("buffer");
      window.Buffer = Buffer;
    } catch (e) {
      console.warn("Buffer polyfill failed:", e);
    }
  }
}

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from './contexts/AuthContext'; 
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSignup from './pages/AdminSignup';
import TestPage from './pages/TestPage';
import { handleAuthRedirect, createPresentationFromData } from './services/googleSlidesService';
import PostLoginExperience from "./components/PostLoginExperience";
import UpdateOverlay from './components/UpdateOverlay';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import './index.css';

const AVERAGE_BUILD_SECONDS = 300;

// --- SKELETONS ---

// 1. Teacher Dashboard Skeleton (Matches Screenshot Layout)
const TeacherSkeleton = () => (
  <div className="min-h-screen w-full bg-[#dae0f2] dark:bg-[#0a0c10] font-sans overflow-y-auto custom-scrollbar relative">
     {/* Background Mesh (Matching Theme) */}
     <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-300/30 dark:bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-sky-300/30 dark:bg-sky-900/20 rounded-full blur-[120px]" />
     </div>

     <div className="relative z-10 p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto">
        
        {/* 1. Navigation Bar Skeleton */}
        <div className="h-20 w-full rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm flex items-center justify-between px-6 sm:px-8 animate-pulse">
           {/* Logo Area */}
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-300 dark:bg-white/10" />
              <div className="h-5 w-24 bg-slate-300 dark:bg-white/10 rounded-full hidden sm:block" />
           </div>
           {/* Centered Pills (Nav) */}
           <div className="hidden lg:flex gap-3">
              {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-9 w-20 bg-slate-300 dark:bg-white/10 rounded-full" />
              ))}
           </div>
           {/* Right Actions */}
           <div className="flex items-center gap-3">
              <div className="h-10 w-28 bg-slate-300 dark:bg-white/10 rounded-full hidden sm:block" />
              <div className="h-10 w-10 rounded-full bg-slate-300 dark:bg-white/10" />
           </div>
        </div>

        {/* 2. Hero Row (Welcome + Schedule) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           {/* Welcome Card (Spans 8 cols) */}
           <div className="lg:col-span-8 h-[300px] rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm p-8 flex flex-col justify-center animate-pulse relative overflow-hidden">
              <div className="space-y-4 relative z-10 max-w-md">
                 <div className="h-5 w-24 bg-slate-300 dark:bg-white/10 rounded-full mb-6" />
                 <div className="h-12 w-full bg-slate-300 dark:bg-white/10 rounded-2xl" />
                 <div className="h-12 w-2/3 bg-slate-300 dark:bg-white/10 rounded-2xl" />
                 <div className="h-4 w-3/4 bg-slate-300 dark:bg-white/10 rounded-full mt-4" />
              </div>
              {/* Image Placeholder Overlay */}
              <div className="absolute top-1/2 -translate-y-1/2 right-12 w-64 h-48 bg-slate-300/50 dark:bg-white/5 rounded-3xl rotate-3 hidden xl:block" />
           </div>

           {/* Schedule Card (Spans 4 cols) */}
           <div className="lg:col-span-4 h-[300px] rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm p-8 flex flex-col justify-center items-center animate-pulse">
              <div className="h-12 w-12 bg-slate-300 dark:bg-white/10 rounded-2xl mb-4" />
              <div className="space-y-2 text-center w-full">
                 <div className="h-6 w-1/2 bg-slate-300 dark:bg-white/10 rounded-full mx-auto" />
                 <div className="h-4 w-1/3 bg-slate-300 dark:bg-white/10 rounded-full mx-auto" />
              </div>
              <div className="h-2 w-3/4 bg-slate-300 dark:bg-white/10 rounded-full mt-8" />
           </div>
        </div>

        {/* 3. Widgets Grid (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm p-8 flex flex-col justify-between animate-pulse">
                 {i === 1 ? (
                    // Clock style (First item)
                    <>
                       <div className="h-4 w-32 bg-slate-300 dark:bg-white/10 rounded-full" />
                       <div className="space-y-2">
                           <div className="h-16 w-3/4 bg-slate-300 dark:bg-white/10 rounded-2xl" />
                           <div className="h-8 w-1/2 bg-slate-300 dark:bg-white/10 rounded-xl" />
                       </div>
                    </>
                 ) : (
                    // Generic icon style (Others)
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                       <div className="h-16 w-16 bg-slate-300 dark:bg-white/10 rounded-full" />
                       <div className="space-y-2 w-full flex flex-col items-center">
                          <div className="h-5 w-1/2 bg-slate-300 dark:bg-white/10 rounded-full" />
                          <div className="h-3 w-2/3 bg-slate-300 dark:bg-white/10 rounded-full" />
                       </div>
                    </div>
                 )}
              </div>
           ))}
        </div>

        {/* 4. Activity Feed */}
        <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4 px-2">
                <div className="h-10 w-10 bg-slate-300 dark:bg-white/10 rounded-xl animate-pulse" />
                <div className="h-6 w-48 bg-slate-300 dark:bg-white/10 rounded-xl animate-pulse" />
            </div>
            <div className="h-24 w-full rounded-[2rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm animate-pulse p-4 flex items-center gap-6">
                <div className="h-12 w-12 rounded-full bg-slate-300 dark:bg-white/10 ml-2" />
                <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/4 bg-slate-300 dark:bg-white/10 rounded-full" />
                    <div className="h-3 w-1/2 bg-slate-300 dark:bg-white/10 rounded-full" />
                </div>
            </div>
        </div>
     </div>
  </div>
);

// 2. Student Dashboard Skeleton (Mimics StudentDashboardUI)
const StudentSkeleton = () => (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-50 px-4 pt-4 pb-2">
            <div className="mx-auto max-w-[1920px] h-16 rounded-[1.5rem] bg-white/50 dark:bg-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between px-4 animate-pulse">
                 <div className="w-24 h-6 bg-slate-300 dark:bg-white/20 rounded-md"></div>
                 <div className="hidden lg:block w-96 h-10 bg-slate-300 dark:bg-white/20 rounded-full"></div>
                 <div className="w-10 h-10 bg-slate-300 dark:bg-white/20 rounded-full"></div>
            </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto w-full space-y-8">
            {/* Hero Card */}
            <div className="w-full h-48 rounded-[2.5rem] bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/5 shadow-sm animate-pulse" />

            {/* Achievements Row */}
            <div className="space-y-3">
                <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded-md animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-20 h-20 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse flex-shrink-0" />
                    ))}
                </div>
            </div>

            {/* Classes Grid */}
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

  // --- LOGIC: Choose Skeleton based on role ---
  if (loading) {
     // Try to guess role from localStorage if userProfile isn't ready yet
     const storedRole = localStorage.getItem('userRole');
     const role = userProfile?.role || storedRole;

     if (role === 'student') {
         return <StudentSkeleton />;
     } else {
         // Default to Teacher skeleton for admins/teachers or unknown
         return <TeacherSkeleton />;
     }
  }

  return (
    <Routes>
      {/* Publicly accessible routes */}
      <Route path="/test" element={<TestPage />} />
      <Route path="/create-admin-xyz" element={<AdminSignup />} />

      {/* Login Route */}
      <Route 
        path="/login" 
        element={
          !userProfile ? (
            <LoginPage />
          ) : (
            <Navigate 
              to={userProfile.role === 'student' ? "/student" : "/dashboard"} 
              replace 
            />
          )
        } 
      />

      {/* Student Dashboard Routes */}
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
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Teacher/Admin Dashboard Routes */}
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
            <Navigate to="/student" replace />
          )
        }
      />

      {/* Default Fallback Route */}
      <Route 
        path="/" 
        element={
          !userProfile ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate 
              to={userProfile.role === 'student' ? "/student" : "/dashboard"} 
              replace 
            />
          )
        } 
      />
    </Routes>
  );
};

export default function App() {
  const [buildStatus, setBuildStatus] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(AVERAGE_BUILD_SECONDS);
  const [waitingWorker, setWaitingWorker] = useState(null);

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
        const res = await fetch('/.netlify/functions/build-status', { cache: 'no-store' });
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
      pollInterval = setInterval(checkBuildStatus, 15000);
    }
    return () => {
      clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  const handleEnter = () => {
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
        <AppRouter />
      </div>
    </BrowserRouter>
  );
}