import React, { useEffect } from 'react';
// --- 1. Import both the hook AND the provider from your AuthContext ---
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSignup from './pages/AdminSignup';

const AppRouter = () => {
    // This component now correctly gets its context from the AuthProvider wrapper.
    const { userProfile, loading } = useAuth();

    useEffect(() => {
        // This effect for loading external scripts is fine.
        const typographyLink = document.createElement('link');
        typographyLink.rel = 'stylesheet';
        typographyLink.href = 'https://cdn.jsdelivr.net/npm/@tailwindcss/typography@0.5.x/dist/typography.min.css';
        document.head.appendChild(typographyLink);

        const xlsxScript = document.createElement('script');
        xlsxScript.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
        xlsxScript.async = true;
        document.body.appendChild(xlsxScript);

        return () => {
            if (document.head.contains(typographyLink)) {
                document.head.removeChild(typographyLink);
            }
        };
    }, []);
    
    // This routing logic is correct.
    if (window.location.pathname === '/create-admin-xyz') {
        return <AdminSignup />;
    }

    if (loading) return <Spinner />;
    if (!userProfile) return <LoginPage />;
    if (userProfile?.role === 'student') return <StudentDashboard />;
    if (userProfile?.role === 'teacher' || userProfile?.role === 'admin') return <TeacherDashboard />;
    
    // Fallback while waiting for profile, though 'loading' should handle this.
    return <Spinner />;
};


export default function App() {
  return (
    // --- 2. Wrap your entire AppRouter with the AuthProvider ---
    // This makes the authentication data available to all components.
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}