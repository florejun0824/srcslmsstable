// src/components/PostLoginExperience.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";

import HologramOnboarding from "./HologramOnboarding";
import BiometricPrompt from "./common/BiometricPrompt";
import PrivacyAgreementModal from "./common/PrivacyAgreementModal";

// --- REDESIGNED SPLASH SCREEN ---
// --- REDESIGNED SPLASH SCREEN (Galactic Neural Pulse) ---
const InitializingScreen = () => {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Initializing System Genesis...",
    "Establishing Neural Uplink...",
    "Materializing Workspace...",
    "Syncing Digital Assets...",
    "Link Stable. Finalizing..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % statuses.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  // --- Neural Nodes ---
  const nodes = useState(() => 
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      delay: i * 0.1
    }))
  )[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(40px)" }}
      transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none bg-slate-50 dark:bg-[#02040a]"
    >
      {/* --- COSMIC NEBULA BACKDROP --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 5, 0],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%]"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #6366f1 0%, transparent 50%), radial-gradient(circle at 70% 70%, #ec4899 0%, transparent 50%)',
            filter: 'blur(120px)'
          }}
        />
        <div className="absolute inset-0 dark:bg-black/40 backdrop-blur-[60px]" />
      </div>

      {/* --- NEURAL SYNAPSES (SVG Network) --- */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.4] dark:opacity-[0.25]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Connection Lines */}
        {nodes.map((node, i) => {
          const nextNode = nodes[(i + 1) % nodes.length];
          return (
            <motion.path
              key={`path-${i}`}
              d={`M ${node.x} ${node.y} Q ${(node.x+nextNode.x)/2 + 5} ${(node.y+nextNode.y)/2 - 5} ${nextNode.x} ${nextNode.y}`}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="0.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, delay: node.delay, repeat: Infinity, repeatType: "reverse" }}
              className="text-indigo-500/50"
            />
          );
        })}
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>

        {/* Pulsing Nodes */}
        {nodes.map((node) => (
          <motion.circle
            key={`node-${node.id}`}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r="1.5"
            className="fill-indigo-500"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.8, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{ duration: 4, delay: node.delay, repeat: Infinity }}
            filter="url(#glow)"
          />
        ))}
      </svg>

      {/* --- SINGULARITY CORE (The Manifestation) --- */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div 
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ type: "spring", stiffness: 50, damping: 20, delay: 0.5 }}
           className="relative mb-16"
        >
          {/* Singularity Pulse Orbs */}
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -inset-24 rounded-full bg-indigo-600/10 blur-[80px]" 
          />
          <motion.div 
            animate={{ scale: [1, 2, 1], opacity: [0.1, 0.05, 0.1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute -inset-32 rounded-full bg-fuchsia-600/10 blur-[100px]" 
          />

          {/* The Manifesting Logo */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Draw Laser Ring */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <motion.circle
                cx="50" cy="50" r="45"
                fill="none" stroke="currentColor" strokeWidth="2"
                className="text-indigo-600 dark:text-indigo-400"
                strokeDasharray="283"
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: [283, 0, 283] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>

            {/* Glowing Logo Path */}
            <motion.div
              animate={{ 
                filter: ["drop-shadow(0 0 0px #6366f1)", "drop-shadow(0 0 20px #6366f1)", "drop-shadow(0 0 0px #6366f1)"],
                scale: [1, 1.02, 1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 text-indigo-600 dark:text-indigo-400">
                <motion.path 
                  d="M12 2L2 7l10 5 10-5-10-5z" 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 0.8 }}
                  stroke="currentColor" 
                />
                <motion.path 
                  d="M2 17l10 5 10-5" 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 1.2 }}
                  stroke="currentColor" 
                />
                <motion.path 
                  d="M2 12l10 5 10-5" 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 1.6 }}
                  stroke="currentColor" 
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* --- SYSTEM GENESIS TEXT --- */}
        <div className="flex flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
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

      {/* --- FULL SCREEN SCANNER --- */}
      <motion.div
        animate={{ y: ['-100%', '200%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[30vh] bg-gradient-to-b from-transparent via-indigo-500/[0.03] to-transparent pointer-events-none z-50"
      />

      {/* --- VERSION & ATTRIBUTION --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2 }}
        className="absolute bottom-12 flex flex-col items-center gap-1.5"
      >
        <p className="text-[9px] font-black tracking-[0.4em] text-slate-400 dark:text-slate-600 uppercase">
          Neural-Link Protocol v3.1 PRO
        </p>
      </motion.div>
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