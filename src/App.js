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
        setWaitingWorker(registration);
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
          if (data.status !== prevStatus) {
            if (data.status === 'building') {
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
              return 'complete';
            }
            return data.status;
          }
          return prevStatus;
        });

      } catch (err) {
        console.error('Failed to fetch build status, assuming ready.', err);
        setBuildStatus('ready');
        if (pollInterval) clearInterval(pollInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      }
    };

    checkBuildStatus();
    pollInterval = setInterval(checkBuildStatus, 5000);

    return () => {
      clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  const handleEnter = () => {
    if (waitingWorker) {
      waitingWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
      // The 'controllerchange' event will fire when the new service worker has taken control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Hard refresh the page to ensure all assets are updated
        window.location.reload(true);
      }, { once: true });
    } else {
      // Fallback to a hard refresh if there's no waiting worker
      window.location.reload(true);
    }
  };

  if (buildStatus === 'building' || buildStatus === 'complete' || waitingWorker) {
    const status = waitingWorker ? 'complete' : buildStatus;
    return <UpdateOverlay status={status} timeLeft={timeLeft} onEnter={handleEnter} />;
  }

  return (
      <div className="bg-gray-100 min-h-screen">
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </div>
    );
}