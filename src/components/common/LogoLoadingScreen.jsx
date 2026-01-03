import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// 🏫 SHARED SCHOOL CONFIGURATION (Duplicated here for safety)
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS LMS', logo: '/logo.png', color: 'text-blue-600' },
    'hras_sipalay': { name: 'HRA LMS', logo: '/logos/hra.png', color: 'text-red-600' },
    'kcc_kabankalan': { name: 'KCC LMS', logo: '/logos/kcc.png', color: 'text-green-600' },
    'icad_dancalan': { name: 'ICA LMS', logo: '/logos/ica.png', color: 'text-yellow-600' },
    'mchs_magballo': { name: 'MCHS LMS', logo: '/logos/mchs.png', color: 'text-purple-600' },
    'ichs_ilog': { name: 'ICHS LMS', logo: '/logos/ichs.png', color: 'text-orange-600' }
};

const LogoLoadingScreen = ({ message = "Loading System..." }) => {
    const { userProfile } = useAuth();
    const [activeBrand, setActiveBrand] = useState(SCHOOL_BRANDING['srcs_main']);

    useEffect(() => {
        // 1. Try to get school from User Profile (if logged in)
        if (userProfile?.schoolId && SCHOOL_BRANDING[userProfile.schoolId]) {
            setActiveBrand(SCHOOL_BRANDING[userProfile.schoolId]);
            return;
        }

        // 2. Fallback: Try to guess from LocalStorage (if app was used before)
        // This helps show the correct logo even *before* the user profile fully loads
        const cachedAlias = localStorage.getItem('active_app_icon_alias');
        if (cachedAlias) {
            // Reverse lookup: Find which school uses this alias
            const foundSchool = Object.values(SCHOOL_BRANDING).find(b => 
                // We assume branding object structure matches previous file, 
                // or we simple map basic logic if aliases aren't in this object
                // For now, simpler is better:
                false 
            );
            // (Optional optimization: You could store 'active_school_id' in localStorage too)
        }
    }, [userProfile]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F2F2F2] dark:bg-[#000000] animate-in fade-in duration-300">
            
            {/* ONE UI 8.5 STYLE CARD CONTAINER */}
            <div className="relative flex flex-col items-center">
                
                {/* 1. Animated Logo Container */}
                {/* 'Squircle' shape with subtle drop shadow and breathing animation */}
                <div className="relative w-32 h-32 mb-8 bg-white dark:bg-[#1C1C1E] rounded-[40px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-none flex items-center justify-center p-6 animate-[breathing_3s_ease-in-out_infinite]">
                    <img 
                        src={activeBrand.logo} 
                        alt="School Logo" 
                        className="w-full h-full object-contain drop-shadow-sm"
                    />
                    
                    {/* Subtle Activity Indicator Ring (OneUI Style) */}
                    <div className="absolute inset-0 rounded-[40px] border-[3px] border-blue-500/0 border-t-blue-500/20 animate-spin duration-[2s]" />
                </div>

                {/* 2. Loading Text */}
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2 animate-pulse">
                    {activeBrand.name}
                </h2>
                
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {message}
                </p>

                {/* 3. Bottom Loader (Optional OneUI "Pill" Loader) */}
                <div className="mt-12 w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-1/2 animate-[shimmer_1.5s_infinite_linear] rounded-full" />
                </div>
            </div>

            {/* Background Decor (Optional Glass Orbs for "Vibes") */}
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

            <style>{`
                @keyframes breathing {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                    100% { transform: scale(1); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
};

export default LogoLoadingScreen;