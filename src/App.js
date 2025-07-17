import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSignup from './pages/AdminSignup';
import TestPage from './pages/TestPage';

const AppRouter = () => {
    const { userProfile, loading } = useAuth();

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
    
    if (window.location.pathname === '/test') {
        return <TestPage />;
    }
    
    if (window.location.pathname === '/create-admin-xyz') {
        return <AdminSignup />;
    }

    if (loading) return <Spinner />;
    if (!userProfile) return <LoginPage />;
    if (userProfile?.role === 'student') return <StudentDashboard />;
    if (userProfile?.role === 'teacher' || userProfile?.role === 'admin') return <TeacherDashboard />;
    
    return <Spinner />;
};

export default function App() {
  return (
    // --- DIAGNOSTIC TEST ---
    // This wrapper div will test if any Tailwind classes are being applied.
    // It should give the entire app a light gray background.
    <div className="bg-gray-100 min-h-screen">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </div>
  );
}