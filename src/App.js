import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminSignup from './pages/AdminSignup';
import TestPage from './pages/TestPage';
// Import the Google Slides service functions
import { handleAuthRedirect, createPresentationFromData } from './services/googleSlidesService';

const AppRouter = () => {
    const { userProfile, loading } = useAuth();

    // This useEffect handles the Google Slides redirect flow.
    useEffect(() => {
        const checkAuthAndContinue = async () => {
            try {
                // Check if the user is returning from the Google auth page.
                const isAuthenticated = await handleAuthRedirect();
                
                // If authenticated, check for pending presentation data.
                if (isAuthenticated) {
                    const savedData = sessionStorage.getItem('googleSlidesData');
                    if (savedData) {
                        console.log("Redirect successful. Resuming presentation creation...");
                        // You might want to show a loading indicator to the user here.
                        
                        const { slideData, presentationTitle, subjectName, unitName } = JSON.parse(savedData);
                        
                        // Re-run the creation process now that we are authenticated.
                        const url = await createPresentationFromData(slideData, presentationTitle, subjectName, unitName);
                        
                        if (url) {
                            console.log("Presentation created successfully:", url);
                            // Open the new presentation in a new tab.
                            window.open(url, '_blank', 'noopener,noreferrer');
                        }
                    }
                }
            } catch (error) {
                // Avoid showing an error for the expected redirect signal.
                if (error.message !== "REDIRECTING_FOR_AUTH") {
                    console.error("Error handling auth redirect and presentation creation:", error);
                    // Here you would typically show an error toast to the user.
                }
            }
        };

        checkAuthAndContinue();
    }, []); // The empty dependency array ensures this runs only once when the component mounts.

    // This useEffect loads the SheetJS script.
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
    <div className="bg-gray-100 min-h-screen">
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </div>
  );
}
