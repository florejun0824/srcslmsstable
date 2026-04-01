// src/components/PostLoginExperience.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";

import HologramOnboarding from "./HologramOnboarding";
import BiometricPrompt from "./common/BiometricPrompt";
import PrivacyAgreementModal from "./common/PrivacyAgreementModal";

// --- REDESIGNED SPLASH SCREEN ---
// --- HIGH-PERFORMANCE ANDROID SPLASH (Zero SVG Animations) ---
const AndroidLiteSplash = ({ statuses, statusIdx }) => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none bg-slate-900/95 dark:bg-[#02040a]">
    {/* Simple solid color gradient, NO animations running in background */}
    <div
      className="absolute inset-0 opacity-[0.15] pointer-events-none"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #6366f1 0%, transparent 60%)',
      }}
    />

    <div className="relative z-10 flex flex-col items-center">
      {/* Static Glow Rings - CSS only pulse */}
      <div className="relative mb-16 w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse scale-125" />
        <div className="absolute inset-4 rounded-full bg-fuchsia-500/20 animate-ping" style={{ animationDuration: '3s' }} />
        
        {/* Simple Static Logo */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-indigo-400 relative z-10">
          <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" />
          <path d="M2 17l10 5 10-5" stroke="currentColor" />
          <path d="M2 12l10 5 10-5" stroke="currentColor" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white mb-2">
            SRCS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Digital</span>
          </h1>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        </div>

        {/* Lightweight Status Pill (Solid BG) */}
        <div className="bg-slate-800/80 border border-slate-700/50 px-6 py-2.5 rounded-2xl shadow-lg mt-2">
          <p className="text-[11px] sm:text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] min-w-[200px] text-center">
            {statuses[statusIdx]}
          </p>
        </div>
      </div>
    </div>
  </div>
);

// --- PREMIUM DESKTOP SPLASH (Minimal Elegance) ---
const PremiumDesktopSplash = ({ statuses, statusIdx }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none bg-slate-50 dark:bg-[#02040a]"
  >
    {/* --- COSMIC NEBULA BACKDROP (Simplified) --- */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.15, 0.2, 0.15]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[0%] left-[0%] w-[100%] h-[100%]"
        style={{
          background: 'radial-gradient(circle at 40% 40%, #6366f1 0%, transparent 40%), radial-gradient(circle at 60% 60%, #ec4899 0%, transparent 40%)',
          filter: 'blur(80px)'
        }}
      />
      <div className="absolute inset-0 dark:bg-black/40 backdrop-blur-[30px]" />
    </div>

    {/* --- ELEGANT LOGO CORE --- */}
    <div className="relative z-10 flex flex-col items-center">
      <motion.div 
         initial={{ scale: 0.9, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
         className="relative mb-16 w-32 h-32 flex flex-col items-center justify-center"
      >
        {/* Soft Glowing Orbs */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-pulse scale-[1.8] blur-xl" />
        <div className="absolute inset-4 rounded-full bg-fuchsia-500/10 animate-pulse scale-[1.5] blur-lg" style={{ animationDirection: 'reverse', animationDuration: '4s' }} />

        {/* Clean Static Logo with subtle hover/breath */}
        <motion.div
            animate={{ filter: ["drop-shadow(0 0 0px rgba(99, 102, 241, 0))", "drop-shadow(0 0 15px rgba(99, 102, 241, 0.3))", "drop-shadow(0 0 0px rgba(99, 102, 241, 0))"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 text-indigo-600 dark:text-indigo-400 relative z-10">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" />
            <path d="M2 17l10 5 10-5" stroke="currentColor" />
            <path d="M2 12l10 5 10-5" stroke="currentColor" />
          </svg>
        </motion.div>
      </motion.div>

      {/* --- SYSTEM GENESIS TEXT --- */}
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-2">
            SRCS <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">Digital</span>
          </h1>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
        </motion.div>

        {/* Typewriter Status */}
        <div className="bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 px-6 py-2.5 rounded-2xl backdrop-blur-xl">
           <AnimatePresence mode="wait">
             <motion.p
               key={statusIdx}
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -5 }}
               className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] min-w-[200px] text-center"
             >
               {statuses[statusIdx]}
             </motion.p>
           </AnimatePresence>
        </div>
      </div>
    </div>

    {/* --- VERSION & ATTRIBUTION --- */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      transition={{ delay: 1 }}
      className="absolute bottom-12 flex flex-col items-center gap-1.5"
    >
      <p className="text-[9px] font-black tracking-[0.4em] text-slate-400 dark:text-slate-600 uppercase">
        Neural-Link Protocol v3.2 LITE
      </p>
    </motion.div>
  </motion.div>
);

// --- MAIN WRAPPER COMPONENT ---
const InitializingScreen = () => {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Initializing System Genesis...",
    "Establishing Neural Uplink...",
    "Materializing Workspace...",
    "Syncing Digital Assets...",
    "Link Stable. Finalizing..."
  ];

  const isAndroid = useRef(false);
  try { isAndroid.current = typeof window !== 'undefined' && document.documentElement.classList.contains('is-android'); } catch(e) {}

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return isAndroid.current 
    ? <AndroidLiteSplash statuses={statuses} statusIdx={statusIdx} /> 
    : <PremiumDesktopSplash statuses={statuses} statusIdx={statusIdx} />;
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
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 3000));

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
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
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