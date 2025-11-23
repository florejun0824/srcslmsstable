import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import maintenanceAnimation from "../assets/systemmaintenance.json"; 

// --- macOS 26 Visual Constants ---
const glassCard = "bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-white/40 dark:border-white/10 shadow-2xl shadow-black/5 dark:shadow-black/50 rounded-[32px]";
const progressTrack = "bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden";
const progressBar = "h-full bg-[#007AFF] rounded-full transition-all duration-300 ease-out";

export default function UpdateOverlay({ status, timeLeft, onEnter }) {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [message, setMessage] = useState("");

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
    "Update complete. Launching new version..."
  ];

  useEffect(() => {
    let progressInterval, fileInterval;

    if (status === "building") {
      setProgress(0);
      setMessage("Preparing update...");
      let fileIndex = 0;

      // Simulate progress bar movement
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 99));
      }, 2000); // Slower, more realistic feel for "building"

      // Simulate file log updates
      fileInterval = setInterval(() => {
        if (fileIndex < files.length - 1) {
          fileIndex++;
          setCurrentFile(files[fileIndex]);
          setMessage(files[fileIndex]);
        }
      }, 8000);
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
        {/* Background Mesh (Matching App Theme) */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
             <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-blue-400/30 rounded-full blur-[150px] animate-pulse-slow" />
             <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-indigo-400/30 rounded-full blur-[150px] animate-pulse-slow delay-1000" />
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
                 <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
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
                        className={progressBar} 
                        style={{ width: `${progress}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>{progress}% Completed</span>
                    <span>Est. {estimatedTime}</span>
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
            <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center animate-bounce-slow">
                 <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="Logo" className="w-12 h-12 object-contain brightness-0 invert" />
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
              className="w-full py-3.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-semibold text-lg shadow-lg shadow-blue-500/25 transition-all"
            >
              Enter Portal
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}