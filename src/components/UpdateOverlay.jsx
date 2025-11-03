// src/components/UpdateOverlay.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import maintenanceAnimation from "../assets/systemmaintenance.json"; // adjust path if needed

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

  // Progress + text simulation
  useEffect(() => {
    let progressInterval, fileInterval;

    if (status === "building") {
      setProgress(0);
      setMessage("Preparing update...");
      let fileIndex = 0;

      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 99));
      }, 2000);

      fileInterval = setInterval(() => {
        if (fileIndex < files.length - 1) {
          fileIndex++;
          setCurrentFile(files[fileIndex]);
          setMessage(files[fileIndex]);
        }
      }, 12000);
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

  const estimatedTime = timeLeft ? formatTime(timeLeft) : "Rebuilding...";

  return (
    <div className="fixed inset-0 bg-neumorphic-base dark:bg-neumorphic-base-dark flex items-center justify-center z-[9999] font-[Inter] text-slate-600 dark:text-slate-300 select-none overflow-hidden">
      <AnimatePresence mode="wait">
        {status === "building" && (
          <motion.div
            key="building"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-8 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark px-10 py-12 max-w-md w-[90%]"
          >
            {/* Circular progress ring */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  // Note: conic-gradient in inline styles can't easily read Tailwind's dark mode.
                  // We'll keep the light-mode track color (#d9dee6), which is neutral enough.
                  // The progress color (#86c8ff) is vibrant on both backgrounds.
                  background: `conic-gradient(#86c8ff ${progress * 3.6}deg, #d9dee6 0deg)`,
                }}
              ></motion.div>
              <div className="w-40 h-40 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex items-center justify-center relative overflow-hidden">
                <motion.img
                  src="https://i.ibb.co/XfJ8scGX/1.png"
                  alt="LMS Logo"
                  className="w-20 h-20 object-contain"
                  animate={{ scale: [1, 1.05, 1], opacity: [1, 0.95, 1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>

            {/* Lottie animation */}
            <div className="w-40 h-40 md:w-48 md:h-48">
              <Lottie animationData={maintenanceAnimation} loop autoplay />
            </div>

            {/* Status text */}
            <div className="text-center text-sm bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl px-6 py-4 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark w-full">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 tracking-wide">
                SYSTEM STATUS: UPDATING
              </p>
              <p className="font-medium text-slate-700 dark:text-slate-200">{message}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                {progress}% Complete • Est. time {estimatedTime}
              </p>
            </div>
          </motion.div>
        )}

        {status === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark px-10 py-12 max-w-md w-[90%]"
          >
            <motion.img
              src="https://i.ibb.co/XfJ8scGX/1.png"
              alt="LMS Logo"
              className="w-20 h-20 object-contain"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: 1,
                rotate: [0, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <h2 className="text-slate-700 dark:text-slate-200 font-semibold text-lg text-center">
              Update Complete
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs">
              All systems are now up to date. You can safely enter the new
              version of the LMS.
            </p>
            <motion.button
              onClick={onEnter}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3 rounded-xl font-semibold text-blue-600 dark:text-blue-400 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark transition-all hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark"
            >
              Enter
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}