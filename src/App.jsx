// src/App.jsx

// ✅ Double-safety fallback (in case index.jsx missed it)
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
// --- MODIFICATION START ---
// Import routing components
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// --- MODIFICATION END ---

import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { useAuth } from './contexts/AuthContext'; 
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSignup from './pages/AdminSignup';
import TestPage from './pages/TestPage';
import { handleAuthRedirect, createPresentationFromData } from './services/googleSlidesService';
import PostLoginExperience from "./components/PostLoginExperience";
import UpdateOverlay from './components/UpdateOverlay';
// --- MODIFICATION START ---
// Fixed the typo from '*s' to '* as'
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// --- MODIFICATION END ---
import './index.css';

const AVERAGE_BUILD_SECONDS = 300; // 5 minutes

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

  useEffect(() => {
    const xlsxScript = document.createElement('script');
    xlsxScript.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
    xlsxScript.async = true;
    document.body.appendChild(xlsxScript);
    return () => {
      if (document.body.contains(xlsxScript)) {
        document.body.removeChild(xlsxScript);
      }
    };
  }, []);

  // Show a top-level spinner while auth is loading
  if (loading) return <Spinner />;

  // --- MODIFICATION START ---
  // Replace all conditional logic with <Routes>
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
            // If user is already logged in, redirect them from /login
            // to their correct dashboard.
            <Navigate 
              to={userProfile.role === 'student' ? "/student" : "/dashboard"} 
              replace 
            />
          )
        } 
      />

      {/* Student Dashboard Routes (Protected) */}
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
            // Wrong role, redirect to teacher dash
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Teacher/Admin Dashboard Routes (Protected) */}
      {/* This "/*" is the key. It allows TeacherDashboard to handle
          all nested routes like /dashboard/home, /dashboard/classes, etc.
      */}
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
            // Wrong role, redirect to student dash
            <Navigate to="/student" replace />
          )
        }
      />
      
      {/* Default Fallback Route */}
      {/* Redirects "/" to the correct starting page */}
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
  // --- MODIFICATION END ---
};

export default function App() {
  const [buildStatus, setBuildStatus] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(AVERAGE_BUILD_SECONDS);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // --- Capacitor/Status Bar Effect (Unchanged) ---
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

  // --- Service Worker Effect (Unchanged) ---
  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: registration => {
        setWaitingWorker(registration.waiting);
      },
    });
  }, []);

  // --- Build Status Effect (Unchanged) ---
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

  // --- handleEnter Function (Unchanged) ---
  const handleEnter = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      window.location.reload();
    }
  };
  
  // --- Update Overlays (Unchanged) ---
  if (buildStatus === 'building') {
    return <UpdateOverlay status="building" timeLeft={timeLeft} />;
  }
  if (waitingWorker) {
    return <UpdateOverlay status="complete" onEnter={handleEnter} />;
  }

  // --- MODIFICATION START ---
  // Wrap the app in <BrowserRouter>
  return (
    <BrowserRouter>
      <div className="bg-gray-100 min-h-screen">
        <AppRouter />
      </div>
    </BrowserRouter>
  );
  // --- MODIFICATION END ---
}