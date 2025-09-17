import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: registration => {
        setWaitingWorker(registration.waiting); // Directly set the waiting worker
      },
    });
  }, []);

  // ✅ FIXED: Corrected build status polling logic
  useEffect(() => {
    let pollInterval;
    let countdownInterval;

    const checkBuildStatus = async () => {
      try {
        const res = await fetch('/.netlify/functions/build-status', { cache: 'no-store' });
        const data = await res.json();

        setBuildStatus(prevStatus => {
          // If status changes from not building to 'building'
          if (prevStatus !== 'building' && data.status === 'building') {
            setTimeLeft(AVERAGE_BUILD_SECONDS);
            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = setInterval(() => {
              setTimeLeft(prevTime => Math.max(0, prevTime - 1));
            }, 1000);
            return 'building';
          }
          // If status changes from 'building' to 'ready'
          if (prevStatus === 'building' && data.status === 'ready') {
            if (countdownInterval) clearInterval(countdownInterval);
            if (pollInterval) clearInterval(pollInterval); // Stop polling
            return 'ready'; // Set status to ready, don't show overlay
          }
          // For any other case, just reflect the server status
          return data.status;
        });
      } catch (err) {
        console.error('Failed to fetch build status, assuming ready.', err);
        setBuildStatus('ready');
        if (pollInterval) clearInterval(pollInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      }
    };

    // Only start polling if the initial status isn't already building
    if (buildStatus !== 'building') {
        checkBuildStatus();
        pollInterval = setInterval(checkBuildStatus, 15000); // Poll every 15 seconds
    }

    return () => {
      clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []); // Run this effect only once on mount

  // ✅ REVISED AND MORE RELIABLE SOLUTION
  const handleEnter = () => {
    if (waitingWorker) {
      // Tell the new service worker to take over.
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      // Directly reload the page after a brief delay.
      // This forces the update without relying on the 'controllerchange' event.
      setTimeout(() => {
        window.location.reload();
      }, 100); // 100ms is enough time for the message to be processed.
    } else {
      // Fallback for safety, in case the button is shown without a waiting worker.
      window.location.reload();
    }
  };

  // ✅ FIXED: Corrected rendering logic to separate the two states
  
  // 1. Show the "building" overlay ONLY when a build is in progress.
  if (buildStatus === 'building') {
    return <UpdateOverlay status="building" timeLeft={timeLeft} />;
  }

  // 2. Show the "update ready" overlay with the Enter button ONLY when a new service worker is waiting.
  if (waitingWorker) {
    return <UpdateOverlay status="complete" onEnter={handleEnter} />;
  }

  // 3. Otherwise, render the main application.
  return (
      <div className="bg-gray-100 min-h-screen">
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </div>
    );
}