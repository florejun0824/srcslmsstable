import React, { useState, useEffect } from 'react'; // <-- Import useState and useEffect
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSignup from './pages/AdminSignup';
import TestPage from './pages/TestPage';
import { handleAuthRedirect, createPresentationFromData } from './services/googleSlidesService';
import VersionNotifier from "./components/VersionNotifier";
import PostLoginExperience from "./components/PostLoginExperience";
import UpdateOverlay from './components/UpdateOverlay'; // <-- 1. Import UpdateOverlay

// This value should be based on your average build time in Netlify.
const AVERAGE_BUILD_SECONDS = 180; // 3 minutes

// No changes needed for your AppRouter component
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
  // --- 2. Define build status logic inside the main App component ---
  const [buildStatus, setBuildStatus] = useState('ready'); // Default to ready
  const [timeLeft, setTimeLeft] = useState(AVERAGE_BUILD_SECONDS);

  useEffect(() => {
    let pollInterval;
    let countdownInterval;

    const checkBuildStatus = async () => {
      try {
        const res = await fetch('/.netlify/functions/build-status', { cache: 'no-store' });
        const data = await res.json();

        if (data.status !== buildStatus) {
          setBuildStatus(data.status);
        }

        if (data.status === 'building' && data.startTime) {
          const elapsedSeconds = Math.floor((Date.now() - data.startTime) / 1000);
          const remaining = Math.max(0, AVERAGE_BUILD_SECONDS - elapsedSeconds);
          setTimeLeft(remaining);

          if (!countdownInterval) {
            countdownInterval = setInterval(() => {
              setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
          }
        } else if (data.status === 'ready') {
          if (pollInterval) clearInterval(pollInterval);
          if (countdownInterval) clearInterval(countdownInterval);
        }
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
  }, [buildStatus]);

  // --- 3. Conditionally render based on build status ---
  if (buildStatus === 'building') {
    return <UpdateOverlay status={buildStatus} timeLeft={timeLeft} />;
  }

  // If the site is ready, render the normal application
  return (
    <div className="bg-gray-100 min-h-screen">
      <AuthProvider>
        <AppRouter />
        <VersionNotifier />
      </AuthProvider>
    </div>
  );
}