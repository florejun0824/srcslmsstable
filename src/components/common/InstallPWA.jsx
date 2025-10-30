// src/components/common/InstallPWA.jsx
import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, ShareIcon } from '@heroicons/react/24/solid';

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if this is an iOS device
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // 2. Check if the app is already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // 3. Listen for the 'beforeinstallprompt' event (for Chrome/Android)
    // The service worker registration in index.html makes this possible
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('beforeinstallprompt event fired');
    });

  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // On iOS, we just show the instructions modal
      setShowIOSModal(true);
    } else if (installPrompt) {
      // Show the native browser install prompt
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setInstallPrompt(null);
    }
  };

  const handleCloseModal = () => {
    setShowIOSModal(false);
  };

  // Don't show anything if:
  // 1. The app is already installed (standalone)
  // 2. It's not iOS AND the install prompt hasn't fired yet
  if (isStandalone || (!isIOS && !installPrompt)) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Install App"
        className="flex items-center justify-center gap-2 bg-neumorphic-base text-sky-600 font-semibold border-none rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 ease-in-out transform hover:scale-[1.03] py-2.5 px-4"
      >
        <ArrowDownTrayIcon className="h-5 w-5" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* This is the instruction modal for iOS users */}
      {showIOSModal && (
        <div 
          // --- CHANGE HERE ---
          // Changed `items-end sm:items-center` to just `items-center`
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            // --- AND CHANGE HERE ---
            // Changed `rounded-t-2xl sm:rounded-2xl` to just `rounded-2xl`
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900">Install App on your iPhone</h3>
            <p className="text-slate-600 mt-2 text-sm">To install this app on your device, please follow these steps:</p>
            <ol className="list-decimal list-inside text-slate-700 mt-4 space-y-2">
              <li>Tap the "Share" icon <ShareIcon className="h-5 w-5 inline-block mx-1" /> at the bottom or top of your screen.</li>
              <li>Scroll down and tap More and <span className="font-semibold">"Add to Home Screen"</span>.</li>
              <li>Tap <span className="font-semibold">"Add"</span> in the top-right corner.</li>
            </ol>
            <button
              onClick={handleCloseModal}
              className="w-full mt-6 py-2.5 px-4 rounded-xl font-semibold text-red-600 bg-neumorphic-base shadow-neumorphic hover:shadow-neumorphic-inset transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;