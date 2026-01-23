// src/components/PostLoginExperience.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Fingerprint } from "lucide-react"; // Aesthetic icons
import { useTheme } from "../contexts/ThemeContext";

// Import the existing components
import HologramOnboarding from "./HologramOnboarding";
import BiometricPrompt from "./common/BiometricPrompt";
import PrivacyAgreementModal from "./common/PrivacyAgreementModal";

// --- SPLASH SCREEN COMPONENT ---
const InitializingScreen = () => {
  const { monetTheme } = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F0F11] font-sans"
    >
      <div className="relative">
        {/* Pulsing Glow Background */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--monet-primary)', opacity: 0.2 }}
        />
        
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-20 h-20 rounded-[2rem] bg-white dark:bg-[#1A1D24] shadow-2xl flex items-center justify-center border border-slate-100 dark:border-white/5"
        >
           <Sparkles className="w-8 h-8" style={{ color: 'var(--monet-primary)' }} />
        </motion.div>
      </div>

      <motion.h2 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-8 text-xl font-bold text-slate-800 dark:text-white tracking-tight"
      >
        Welcome Back
      </motion.h2>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-2 text-sm text-slate-400 font-medium"
      >
        Syncing your workspace...
      </motion.p>
    </motion.div>
  );
};

export default function PostLoginExperience({ children }) {
  // We start in a "loading" state to prevent the dashboard from flashing before we know if we need onboarding
  const [isInitializing, setIsInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const fetchVersion = async () => {
      // Add a minimum delay so the splash screen doesn't just flicker for 10ms
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 800));
      
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();
        setVersionInfo(data);

        const lastSeenVersion = localStorage.getItem("lastSeenVersion");
        const skipHologramVersion = localStorage.getItem("skipHologramVersion");
        const isThemePending = sessionStorage.getItem("theme_update_pending");

        // Logic: Should we show onboarding?
        if (data.version !== lastSeenVersion && 
            data.version !== skipHologramVersion && 
            !isThemePending) { 
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Failed to fetch version.json", err);
      } finally {
        // Wait for both the fetch AND the minimum visual delay
        await minDelayPromise;
        setIsInitializing(false);
      }
    };

    fetchVersion();
  }, []);

  const handleOnboardingClose = ({ dontShowAgain } = {}) => {
    setShowOnboarding(false);

    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipHologramVersion", versionInfo.version);
    }
    
    if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
  };

  return (
    <>
      {/* 1. Global Privacy Modal (Always mounted, handles its own state) */}
      <PrivacyAgreementModal />

      <AnimatePresence mode="wait">
        {/* 2. Loading State (Splash Screen) */}
        {isInitializing && (
          <InitializingScreen key="splash" />
        )}

        {/* 3. Onboarding Experience */}
        {!isInitializing && showOnboarding && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[50]"
          >
            <HologramOnboarding
              versionInfo={versionInfo}
              onClose={handleOnboardingClose}
            />
          </motion.div>
        )}

        {/* 4. Main App Content (Dashboard + Biometrics) */}
        {!isInitializing && !showOnboarding && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full"
          >
            <BiometricPrompt />
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}