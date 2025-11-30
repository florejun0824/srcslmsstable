import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import maintenanceAnimation from "../assets/systemmaintenance.json"; 
import { useTheme } from '../../contexts/ThemeContext'; // Import Theme Context

// --- macOS 26 Visual Constants (Updated) ---
// Changed backdrop-blur-3xl to backdrop-blur-md for lighter effect
const glassCard = "bg-white/70 dark:bg-[#1a1b26]/80 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-2xl shadow-black/5 dark:shadow-black/50 rounded-[32px]";
const progressTrack = "bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden";

export default function UpdateOverlay({ status, timeLeft, onEnter }) {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [message, setMessage] = useState("");
  
  // --- MONET SUPPORT ---
  const { activeOverlay } = useTheme();

  // Define dynamic styles based on active overlay
  const themeStyles = useMemo(() => {
    switch (activeOverlay) {
        case 'christmas':
            return {
                blob1: 'bg-red-500/30',
                blob2: 'bg-green-500/30',
                accent: 'bg-red-600',
                iconGradient: 'from-red-500 to-green-600',
                btnGradient: 'bg-gradient-to-r from-red-600 to-green-700 hover:from-red-500 hover:to-green-600',
                glow: 'bg-red-500/20'
            };
        case 'valentines':
            return {
                blob1: 'bg-pink-500/30',
                blob2: 'bg-rose-500/30',
                accent: 'bg-pink-500',
                iconGradient: 'from-pink-500 to-rose-600',
                btnGradient: 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500',
                glow: 'bg-pink-500/20'
            };
        case 'cyberpunk':
            return {
                blob1: 'bg-fuchsia-500/40',
                blob2: 'bg-cyan-500/40',
                accent: 'bg-fuchsia-500',
                iconGradient: 'from-fuchsia-600 to-cyan-600',
                btnGradient: 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500',
                glow: 'bg-cyan-500/20'
            };
        case 'space':
            return {
                blob1: 'bg-indigo-500/40',
                blob2: 'bg-violet-500/40',
                accent: 'bg-indigo-500',
                iconGradient: 'from-indigo-600 to-violet-600',
                btnGradient: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500',
                glow: 'bg-indigo-500/20'
            };
        case 'graduation':
             return {
                blob1: 'bg-yellow-500/30',
                blob2: 'bg-amber-500/30',
                accent: 'bg-amber-500',
                iconGradient: 'from-yellow-500 to-amber-600',
                btnGradient: 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500',
                glow: 'bg-yellow-500/20'
            };
        case 'rainy':
             return {
                blob1: 'bg-teal-500/30',
                blob2: 'bg-slate-500/30',
                accent: 'bg-teal-600',
                iconGradient: 'from-teal-600 to-slate-600',
                btnGradient: 'bg-gradient-to-r from-teal-600 to-slate-600 hover:from-teal-500 hover:to-slate-500',
                glow: 'bg-teal-500/20'
            };
        default: // Standard / Spring
            return {
                blob1: 'bg-blue-400/30',
                blob2: 'bg-indigo-400/30',
                accent: 'bg-[#007AFF]',
                iconGradient: 'from-blue-500 to-indigo-600',
                btnGradient: 'bg-[#007AFF] hover:bg-[#0062CC]',
                glow: 'bg-blue-500/20'
            };
    }
  }, [activeOverlay]);

  const files = [
    "Initializing update protocol...",
    "Downloading core modules...",
    "Updating interface assets...",
    "Synchronizing content data...",
    "Applying patches...",
    "Rebuilding dependencies...",
    "Verifying integrity...",
    "Installing components...",
    "Finalizing setup...",
    "Cleaning temporary files...",
    "Restarting services...",
    "Update complete. Please wait while launching the new version..."
  ];

  useEffect(() => {
    let progressInterval, fileInterval;

    if (status === "building") {
      setProgress(0);
      setMessage("Preparing update...");
      
      // --- LOGIC UPDATE: 1.5 Minutes (90 Seconds) ---
      const totalDuration = 90000; // 90,000ms = 1.5 minutes
      const updateFrequency = 100; // Update every 100ms for smoothness
      const totalSteps = totalDuration / updateFrequency;
      const incrementPerStep = 99 / totalSteps; // Target 99%
      
      let currentProgress = 0;

      progressInterval = setInterval(() => {
        currentProgress += incrementPerStep;
        if (currentProgress >= 99) {
             currentProgress = 99;
             clearInterval(progressInterval);
        }
        setProgress(currentProgress);
      }, updateFrequency);

      // --- LOGIC UPDATE: Sync File Messages to 1.5 Minutes ---
      let fileIndex = 0;
      // Distribute files evenly across the 90 seconds
      const fileSwitchSpeed = totalDuration / (files.length + 1); 

      fileInterval = setInterval(() => {
        if (fileIndex < files.length - 1) {
          fileIndex++;
          setCurrentFile(files[fileIndex]);
          setMessage(files[fileIndex]);
        }
      }, fileSwitchSpeed);

    } else if (status === "complete") {
      setProgress(100);
      setMessage("System update successful!");
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(fileInterval);
    };
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const estimatedTime = timeLeft ? formatTime(timeLeft) : "--:--";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f5f5f7] dark:bg-black font-sans overflow-hidden">
        
        {/* Background Mesh (Dynamic Colors) */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
             <div className={`absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[150px] animate-pulse-slow ${themeStyles.blob1}`} />
             <div className={`absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full blur-[150px] animate-pulse-slow delay-1000 ${themeStyles.blob2}`} />
        </div>

      <AnimatePresence mode="wait">
        {status === "building" && (
          <motion.div
            key="building"
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            className={`relative w-full max-w-md p-8 sm:p-10 flex flex-col items-center text-center ${glassCard}`}
          >
            {/* Icon / Animation */}
            <div className="w-32 h-32 mb-6 relative">
                 <div className={`absolute inset-0 blur-xl rounded-full animate-pulse ${themeStyles.glow}`}></div>
                 <Lottie animationData={maintenanceAnimation} loop autoplay className="relative z-10" />
            </div>

            {/* Main Text */}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                Updating System
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 h-5 overflow-hidden">
                 <span className="inline-block animate-fade-in-up key={currentFile}">{message}</span>
            </p>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
                <div className={progressTrack}>
                    <motion.div 
                        className={`h-full rounded-full transition-all duration-300 ease-out ${themeStyles.accent}`}
                        style={{ width: `${progress}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>{Math.floor(progress)}% Completed</span>
                    {/* Optional: Show static text or dynamic time if passed */}
                    <span>Est. 1m 30s</span>
                </div>
            </div>
          </motion.div>
        )}

        {status === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            className={`relative w-full max-w-md p-10 flex flex-col items-center text-center ${glassCard}`}
          >
            {/* Dynamic Gradient Icon Background */}
            <div className={`w-24 h-24 mb-6 rounded-full bg-gradient-to-br shadow-lg flex items-center justify-center animate-bounce-slow ${themeStyles.iconGradient} ${themeStyles.glow.replace('bg-', 'shadow-').replace('/20', '/30')}`}>
                 <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain brightness-0 invert" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
              Update Complete
            </h2>
            <p className="text-base text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed">
              The system has been successfully updated to the latest version.
            </p>

            <motion.button
              onClick={onEnter}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3.5 rounded-full text-white font-semibold text-lg shadow-lg transition-all ${themeStyles.btnGradient}`}
            >
              Enter Portal
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}