import React, { useState, useEffect, Suspense, lazy } from 'react'; 
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'; 
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { SplashScreen } from '@capacitor/splash-screen'; 
import { PrivacyScreen } from '@capacitor-community/privacy-screen'; // [NEW] Required to fix black screen
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

// --- LAZY LOADED PAGES (Code Splitting) ---
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
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
        showToast("You are back online. Syncing data...", "success");
        checkVersion(); 
    };

    const handleOffline = () => {
        showToast("You are currently working offline. Some features may be limited.", "warning");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkVersion();
    
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
    };
  }, [showToast]);

  return null;
};

// --- SKELETONS ---
const TeacherSkeleton = () => (
  <div className="min-h-screen w-full bg-[#dae0f2] dark:bg-[#0a0c10] font-sans overflow-y-auto custom-scrollbar relative">
     <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-300/30 dark:bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50vw] h-[50vw] bg-sky-300/30 dark:bg-sky-900/20 rounded-full blur-[120px]" />
     </div>

     <div className="relative z-10 p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto">
        <div className="h-20 w-full rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm flex items-center justify-between px-6 sm:px-8 animate-pulse">
           <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-300 dark:bg-white/10" />
              <div className="h-5 w-24 bg-slate-300 dark:bg-white/10 rounded-full hidden sm:block" />
           </div>
           <div className="hidden lg:flex gap-3">
              {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-9 w-20 bg-slate-300 dark:bg-white/10 rounded-full" />
              ))}
           </div>
           <div className="flex items-center gap-3">
              <div className="h-10 w-28 bg-slate-300 dark:bg-white/10 rounded-full hidden sm:block" />
              <div className="h-10 w-10 rounded-full bg-slate-300 dark:bg-white/10" />
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           <div className="lg:col-span-8 h-[300px] rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm p-8 flex flex-col justify-center animate-pulse relative overflow-hidden">
              <div className="space-y-4 relative z-10 max-w-md">
                 <div className="h-5 w-24 bg-slate-300 dark:bg-white/10 rounded-full mb-6" />
                 <div className="h-12 w-full bg-slate-300 dark:bg-white/10 rounded-2xl" />
                 <div className="h-12 w-2/3 bg-slate-300 dark:bg-white/10 rounded-2xl" />
                 <div className="h-4 w-3/4 bg-slate-300 dark:bg-white/10 rounded-full mt-4" />
              </div>
           </div>

           <div className="lg:col-span-4 h-[300px] rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm p-8 flex flex-col justify-center items-center animate-pulse">
              <div className="h-12 w-12 bg-slate-300 dark:bg-white/10 rounded-2xl mb-4" />
              <div className="space-y-2 text-center w-full">
                 <div className="h-6 w-1/2 bg-slate-300 dark:bg-white/10 rounded-full mx-auto" />
                 <div className="h-4 w-1/3 bg-slate-300 dark:bg-white/10 rounded-full mx-auto" />
              </div>
              <div className="h-2 w-3/4 bg-slate-300 dark:bg-white/10 rounded-full mt-8" />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 rounded-[2.5rem] bg-white/40 dark:bg-black/20 backdrop-blur-2xl border border-white/40 dark:border-white/5 shadow-sm p-8 flex flex-col justify-between animate-pulse">
                 {i === 1 ? (
                    <>
                       <div className="h-4 w-32 bg-slate-300 dark:bg-white/10 rounded-full" />
                       <div className="space-y-2">
                           <div className="h-16 w-3/4 bg-slate-300 dark:bg-white/10 rounded-2xl" />
                           <div className="h-8 w-1/2 bg-slate-300 dark:bg-white/10 rounded-xl" />
                       </div>
                    </>
                 ) : (
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
      return role === 'student' ? <StudentSkeleton /> : <TeacherSkeleton />;
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
		<Route path="/" element={<LandingPage />} />

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