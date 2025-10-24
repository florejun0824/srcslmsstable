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
import { Capacitor } from '@capacitor/core'; // <-- MODIFICATION: ADDED THIS LINE
import { StatusBar } from '@capacitor/status-bar'; // <-- MODIFICATION: ADDED THIS LINE
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
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
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

  if (window.location.pathname === '/test') return <TestPage />;
  if (window.location.pathname === '/create-admin-xyz') return <AdminSignup />;
  if (loading) return <Spinner />;
  if (!userProfile) return <LoginPage />;

  if (userProfile?.role === 'student') {
    return (
      <PostLoginExperience>
        <StudentDashboard />
      </PostLoginExperience>
    );
  }

  if (userProfile?.role === 'teacher' || userProfile?.role === 'admin') {
    return (
      <PostLoginExperience>
        <TeacherDashboard />
      </PostLoginExperience>
    );
  }

  return <Spinner />;
};

export default function App() {
  const [buildStatus, setBuildStatus] = useState('ready');
  const [timeLeft, setTimeLeft] = useState(AVERAGE_BUILD_SECONDS);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // --- MODIFICATION START ---
  // This hook will run once when the App component loads
  // to hide the status bar on native mobile devices.
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
  // --- MODIFICATION END ---

  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: registration => {
        setWaitingWorker(registration.waiting);
      },
    });
  }, []);

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
  }, []); // Note: You had an empty dependency array, which is correct.

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
  
  if (buildStatus === 'building') {
    return <UpdateOverlay status="building" timeLeft={timeLeft} />;
  }

  if (waitingWorker) {
    return <UpdateOverlay status="complete" onEnter={handleEnter} />;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <AppRouter />
    </div>
  );
}