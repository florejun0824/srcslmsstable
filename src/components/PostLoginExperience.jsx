// src/components/PostLoginExperience.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers } from "lucide-react"; 
import { useTheme } from "../contexts/ThemeContext";

import HologramOnboarding from "./HologramOnboarding";
import BiometricPrompt from "./common/BiometricPrompt";
import PrivacyAgreementModal from "./common/PrivacyAgreementModal";

// --- SPLASH SCREEN: "THE LAUNCH PAD" ---
const InitializingScreen = () => {
  const { monetTheme } = useTheme();
  const primaryColor = 'var(--monet-primary, #6366f1)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(12px)" }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F0F11] font-sans overflow-hidden"
    >
      {/* Background Ambience - Drifting Aurora */}
      <motion.div 
         animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
         transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
         className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-20 pointer-events-none"
         style={{ background: `conic-gradient(from 0deg at 50% 50%, ${primaryColor} 0deg, transparent 60deg, transparent 300deg, ${primaryColor} 360deg)` }}
      />

      <div className="relative z-10 flex flex-col items-center">
        
        {/* LOGO ASSEMBLY ANIMATION */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
            {/* Spinning Dashed Ring */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-slate-300 dark:border-white/10 border-dashed"
                style={{ borderTopColor: primaryColor, borderWidth: '2px' }}
            />
            
            {/* Center Logo */}
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1A1D24] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] flex items-center justify-center relative z-10"
            >
               <Layers className="w-10 h-10" style={{ color: primaryColor }} strokeWidth={1.5} />
            </motion.div>
        </div>

        {/* Text Reveal */}
        <div className="overflow-hidden h-8 mb-2">
            <motion.h2 
                initial={{ y: 30 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                className="text-xl font-bold text-slate-800 dark:text-white tracking-tight"
            >
                Welcome Back
            </motion.h2>
        </div>
        
        {/* Loading Bar */}
        <motion.div 
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 60, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="h-1 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden relative"
        >
           <motion.div 
             animate={{ x: [-60, 60] }}
             transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
             className="absolute inset-0 bg-current opacity-50"
             style={{ color: primaryColor }}
           />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function PostLoginExperience({ children }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const fetchVersion = async () => {
      // 1.5s delay to let the "Launch Pad" animation breathe
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 1500));
      
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();
        setVersionInfo(data);

        const lastSeenVersion = localStorage.getItem("lastSeenVersion");
        const skipHologramVersion = localStorage.getItem("skipHologramVersion");
        const isThemePending = sessionStorage.getItem("theme_update_pending");

        if (data.version !== lastSeenVersion && 
            data.version !== skipHologramVersion && 
            !isThemePending) { 
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Failed to fetch version.json", err);
      } finally {
        await minDelayPromise;
        setIsInitializing(false);
      }
    };

    fetchVersion();
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  return (
    <>
      <PrivacyAgreementModal />

      <AnimatePresence mode="wait">
        
        {isInitializing && (
          <InitializingScreen key="splash" />
        )}

        {!isInitializing && showOnboarding && (
          <motion.div
            key="onboarding"
            className="fixed inset-0 z-[50]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HologramOnboarding
              versionInfo={versionInfo}
              onClose={handleOnboardingClose}
            />
          </motion.div>
        )}

        {!isInitializing && !showOnboarding && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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