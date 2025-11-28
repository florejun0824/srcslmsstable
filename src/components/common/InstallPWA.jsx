// src/components/common/InstallPWA.jsx
import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, ShareIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Switched to outline for cleaner look
import { Dialog, Transition } from '@headlessui/react'; // Added Headless UI for smooth transitions if available, but staying simple for this file as originally provided, just styling.

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
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log('beforeinstallprompt event fired');
    });

  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setInstallPrompt(null);
    }
  };

  const handleCloseModal = () => {
    setShowIOSModal(false);
  };

  if (isStandalone || (!isIOS && !installPrompt)) {
    return null;
  }

  return (
    <>
      {/* --- macOS 26 Trigger Button --- */}
      <button
        onClick={handleInstallClick}
        title="Install App"
        className="group flex items-center justify-center gap-2 px-4 py-2 rounded-full 
                   bg-white/80 dark:bg-white/10 
                   border border-slate-200/60 dark:border-white/10
                   text-sm font-semibold text-blue-600 dark:text-blue-400
                   shadow-sm hover:shadow-md hover:bg-blue-50 dark:hover:bg-blue-500/10
                   backdrop-blur-md transition-all duration-200 active:scale-95"
      >
        <ArrowDownTrayIcon className="h-4 w-4 stroke-[2.5]" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* --- iOS Instructions Modal --- */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity" />

          {/* Modal Panel */}
          <div 
            className="relative w-full max-w-sm overflow-hidden rounded-[24px] 
                       bg-white/95 dark:bg-[#1c1c1e]/95 
                       backdrop-blur-xl 
                       border border-white/20 dark:border-white/10
                       shadow-2xl shadow-black/20 
                       transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 mb-4">
                    <ArrowDownTrayIcon className="h-6 w-6 text-slate-900 dark:text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Install on iPhone
                </h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Install this app on your home screen for quick and easy access.
                </p>
            </div>

            {/* Steps */}
            <div className="px-6 py-4 space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-[16px] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-xs">
                        1
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        Tap the <span className="font-bold">Share</span> icon <ShareIcon className="h-4 w-4 inline-block mx-1 -mt-1 text-blue-500" /> in the menu bar.
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[16px] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs">
                        2
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        Scroll down and select <span className="font-bold">Add to Home Screen</span>.
                    </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-[16px] bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs">
                        3
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                        Tap <span className="font-bold text-blue-500">Add</span> in the top-right corner.
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
              <button
                onClick={handleCloseModal}
                className="w-full py-3 px-4 rounded-[14px] text-[13px] font-bold 
                           text-slate-700 dark:text-white
                           bg-white dark:bg-white/10 
                           border border-slate-200 dark:border-white/5
                           hover:bg-slate-50 dark:hover:bg-white/15 
                           active:scale-[0.98] transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWA;