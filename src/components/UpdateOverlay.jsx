import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Hook to detect mobile screens
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
};

export default function UpdateOverlay({ status, timeLeft, onEnter }) {
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [message, setMessage] = useState('');
  const isMobile = useIsMobile();

  const files = [
    "Initializing update protocol...",
    "Downloading core modules (1/5)...",
    "Downloading UI assets (2/5)...",
    "Downloading content data (3/5)...",
    "Downloading security patches (4/5)...",
    "Downloading dependencies (5/5)...",
    "Verifying integrity...",
    "Installing updates...",
    "Cleaning up temporary files...",
    "Restarting services...",
    "Update complete. Launching new version..."
  ];

  useEffect(() => {
    let progressInterval, fileInterval, messageInterval;

    if (status === 'building') {
      setProgress(0);
      setCurrentFile(files[0]);
      setMessage("Preparing update...");

      progressInterval = setInterval(() => setProgress(prev => Math.min(prev + 1, 99)), 2700);

      let fileIndex = 0;
      fileInterval = setInterval(() => {
        if (fileIndex < files.length - 1) {
          fileIndex++;
          setCurrentFile(files[fileIndex]);
          setMessage(files[fileIndex]);
        }
      }, 27000);

      messageInterval = setInterval(() => setMessage("Applying final configurations..."), 240000);

    } else if (status === 'complete') {
      setProgress(100);
      setCurrentFile("All modules updated.");
      setMessage("System update successful! Please click 'Enter' to proceed.");
    }

    return () => {
      clearInterval(progressInterval);
      clearInterval(fileInterval);
      clearInterval(messageInterval);
    };
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const systemStatusText =
    "SYSTEM STATUS: ONLINE\n" +
    "INITIATING CRITICAL UPDATE...\n" +
    "[" + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString() + "]";

  const processingText = `> Processing: ${currentFile}\n> Estimated completion: ${formatTime(timeLeft)}`;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[20000] font-mono text-slate-700 overflow-hidden text-sm">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 150 }}
            className="flex flex-col items-center gap-6 max-w-2xl w-[90%] p-6 md:p-10 bg-neumorphic-base rounded-2xl shadow-neumorphic relative"
        >
            <img src="/characters/guide 2.png" alt="Update Assistant" className="h-36 md:h-44 object-contain drop-shadow-[0_0_10px_rgba(0,255,192,0.8)] mb-4" />

            <div className="w-full text-left">
                {status === 'building' ? (
                    <>
                        <pre className="m-0 mb-2.5 whitespace-pre-wrap text-sky-600 text-xs">
                            {systemStatusText}
                        </pre>

                        <div className="bg-neumorphic-base shadow-neumorphic-inset p-4 rounded-lg mb-4 min-h-[80px] flex items-center">
                            <pre className="m-0 whitespace-pre-wrap leading-snug text-slate-600 text-xs md:text-sm">
                                {processingText}
                            </pre>
                        </div>

                        <div className="w-full bg-neumorphic-base shadow-neumorphic-inset rounded-full h-3 overflow-hidden">
                            <div
                                style={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-sky-200 to-blue-300 rounded-full shadow-neumorphic transition-all duration-1000 ease-linear"
                            />
                        </div>

                        <p className="mt-2.5 text-center text-slate-500 text-xs">
                            {`${progress}% Complete - ${message}`}
                        </p>
                    </>
                ) : (
                    <div className="text-center">
                        <pre className="m-0 mb-5 whitespace-pre-wrap text-green-600 font-semibold text-base md:text-lg">
                            {"UPDATE COMPLETE.\nNEW SYSTEM VERSION DEPLOYED."}
                        </pre>
                        <p className="m-0 mb-8 text-slate-600 text-sm md:text-base">
                            Ready for launch. Press 'Enter' to experience the latest features.
                        </p>
                        <button
                            onClick={onEnter}
                            className="w-full p-4 font-bold text-lg rounded-xl transition-shadow bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
                        >
                            Enter
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    </div>
  );
}