import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext'; // Import Auth to get school ID

// 🏫 SHARED SCHOOL CONFIGURATION
// Added 'shortName' specifically for the compact spinner view
const SCHOOL_BRANDING = {
    'srcs_main': { shortName: 'SRCS LMS', logo: '/logo.png' },
    'hras_sipalay': { shortName: 'HRA LMS', logo: '/logos/hra.png' },
    'kcc_kabankalan': { shortName: 'KCC LMS', logo: '/logos/kcc.png' },
    'icad_dancalan': { shortName: 'ICA LMS', logo: '/logos/ica.png' },
    'mchs_magballo': { shortName: 'MCHS LMS', logo: '/logos/mchs.png' },
    'ichs_ilog': { shortName: 'ICHS LMS', logo: '/logos/ichs.png' }
};

const loadingMessages = [
  'Assembling knowledge...',
  'Polishing the pixels...',
  'Brewing fresh data...',
  'Warming up the servers...',
  'Aligning the satellites...',
  'Unpacking brilliance...',
  'Calibrating circuits...',
  'Enhancing the experience...',
];

// 🌀 Memoized Rings Component - Now accepts 'logo' prop
const SpinningRings = memo(({ logo }) => (
  <motion.div 
    className="relative h-14 w-14 flex-shrink-0"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Center Logo Container - Glass Effect */}
    <div className="absolute inset-1 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-inner border border-white/20 dark:border-white/5 flex items-center justify-center z-10 overflow-hidden">
        <img
          src={logo} // ✅ Dynamic Logo
          alt="School Logo"
          className="h-8 w-8 object-contain opacity-90"
        />
    </div>

    {/* Outer Blue Ring */}
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-0 z-0"
      animate={{ rotate: 360 }}
      transition={{ 
        repeat: Infinity, 
        ease: "linear", 
        duration: 3 
      }}
    >
      <defs>
        <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke="url(#spinnerGradient)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="200 100" // Creates the gap
      />
    </motion.svg>
    
    {/* Inner Purple Ring (Counter-Rotating) */}
    <motion.svg
      viewBox="0 0 100 100"
      className="absolute inset-2 z-0 opacity-70"
      animate={{ rotate: -360 }}
      transition={{ 
        repeat: Infinity, 
        ease: "linear", 
        duration: 4 
      }}
    >
      <circle
        cx="50"
        cy="50"
        r="42"
        stroke="#8B5CF6" // Purple
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="100 150"
      />
    </motion.svg>
  </motion.div>
));

const Spinner = () => {
  const { userProfile } = useAuth();
  const [activeBrand, setActiveBrand] = useState(SCHOOL_BRANDING['srcs_main']);
  const [message, setMessage] = useState(loadingMessages[0]);

  // 1. Detect Active School Brand
  useEffect(() => {
    // Priority: User Profile -> LocalStorage -> Default
    if (userProfile?.schoolId && SCHOOL_BRANDING[userProfile.schoolId]) {
      setActiveBrand(SCHOOL_BRANDING[userProfile.schoolId]);
    } else {
      const cachedAlias = localStorage.getItem('active_app_icon_alias');
      // Simple reverse lookup or default
      if (cachedAlias) {
        // Map alias to ID if needed, or default to srcs_main
        // For simplicity in Spinner, we stick to default if not logged in yet
        // unless you want to map aliases back to IDs.
      }
    }
  }, [userProfile]);

  // 2. Rotate Messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessage((prev) => {
        const currentIndex = loadingMessages.indexOf(prev);
        const nextIndex = (currentIndex + 1) % loadingMessages.length;
        return loadingMessages[nextIndex];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="spinner-overlay z-[9999]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="
          flex w-[320px] max-w-[90%] items-center gap-5 
          rounded-[28px] pr-8 pl-5 py-4
          bg-white/75 dark:bg-[#1c1c1e]/80 
          backdrop-blur-2xl backdrop-saturate-150
          shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]
          border border-white/40 dark:border-white/10
          ring-1 ring-black/5 dark:ring-white/5
        "
      >
        {/* Pass the dynamic logo to the rings */}
        <SpinningRings logo={activeBrand.logo} />

        <div className="flex flex-col justify-center min-w-0">
          {/* ✅ Dynamic School Name */}
          <p className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-0.5">
            {activeBrand.shortName}
          </p>
          
          <div className="h-5 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ y: 15, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={{ y: -15, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-[13px] font-medium text-blue-600 dark:text-blue-400 truncate w-full absolute top-0 left-0"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Spinner;