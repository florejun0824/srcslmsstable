// src/components/PostLoginExperience.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";

import HologramOnboarding from "./HologramOnboarding";
import BiometricPrompt from "./common/BiometricPrompt";
import PrivacyAgreementModal from "./common/PrivacyAgreementModal";

// --- REDESIGNED SPLASH SCREEN ---
const InitializingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(12px)" }}
      transition={{ duration: 0.8, ease: [0.3, 0, 0.8, 0.15] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
        background: '#ffffff'
      }}
    >
      {/* Subtle pattern grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.06) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: ['-2%', '2%', '-2%']
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(129, 140, 248, 0.04) 40%, transparent 70%)',
          top: '-10%', left: '-10%', filter: 'blur(60px)'
        }}
      />
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          x: ['2%', '-2%', '2%']
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.06) 0%, rgba(196, 181, 253, 0.03) 50%, transparent 70%)',
          bottom: '-5%', right: '-5%', filter: 'blur(60px)'
        }}
      />

      {/* Central content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Logo with ring spinner */}
        <div className="relative flex items-center justify-center w-36 h-36 mb-12">
          {/* Progress ring */}
          <svg className="absolute w-full h-full" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(99, 102, 241, 0.08)" strokeWidth="1.5" />
            <motion.circle
              cx="60" cy="60" r="54"
              fill="none" stroke="#6366F1" strokeWidth="2"
              strokeDasharray="340" strokeLinecap="round"
              animate={{
                strokeDashoffset: [340, 0],
                rotate: [0, 720]
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: '60px 60px', opacity: 0.6 }}
            />
          </svg>

          {/* Glass logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.15 }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center z-10"
            style={{
              background: 'linear-gradient(145deg, #f8fafc, #eef2ff)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid rgba(99, 102, 241, 0.1)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </motion.div>
        </div>

        {/* Brand name */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0, 0, 1] }}
          className="text-[2rem] md:text-[2.5rem] font-[800] text-slate-900 tracking-[-0.03em] mb-2"
        >
          SRCS Digital
        </motion.h1>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center gap-2.5"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                className="w-1.5 h-1.5 rounded-full bg-indigo-500"
              />
            ))}
          </div>
          <span className="text-[13px] font-[600] text-slate-400 tracking-wide">
            Preparing your workspace
          </span>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="absolute bottom-8 text-[11px] font-medium text-slate-400 tracking-[0.1em] uppercase"
      >
        Powered by Gemini 3.1 Pro
      </motion.p>
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
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 1800));

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