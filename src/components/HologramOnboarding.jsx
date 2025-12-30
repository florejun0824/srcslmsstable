// src/components/onboarding/HologramOnboarding.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useTheme } from '../contexts/ThemeContext'; 

// --- CUSTOM HOOKS ---
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize(); 
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
};

// Fallback data if file fetch fails
const FALLBACK_DATA = {
    version: "2.0",
    notes: ["System optimization complete", "UI Refresh applied"]
};

export default function HologramOnboarding({ versionInfo, onClose }) {
  // --- STATE ---
  const [visible, setVisible] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState([]); // Store parsed notes
  
  // Steps: 'welcome' -> 'whatsNew' -> 'refresh' -> (RELOAD) -> 'enter'
  const [currentStep, setCurrentStep] = useState("welcome"); 
  const [isLoading, setIsLoading] = useState(true);

  const isMobile = useIsMobile();
  const { activeOverlay } = useTheme();

  // --- 1. INITIALIZATION & DATA FETCHING ---
  useEffect(() => {
    const isPendingReload = localStorage.getItem("hologram_update_pending");

    // Load Release Notes from Text File
    fetch('/release-notes.txt')
        .then(res => {
            if (!res.ok) throw new Error("No release notes found");
            return res.text();
        })
        .then(text => {
            // Parser: Splits by new line, removes empty lines, strips markdown bullets (- or *)
            const notes = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith("#")) // Ignore comments/headers
                .map(line => line.replace(/^[-*]\s+/, '')); // Remove bullets
            
            setReleaseNotes(notes);
            if (!isPendingReload) setIsLoading(false);
        })
        .catch(() => {
            // Fallback to props or default
            const notes = versionInfo?.whatsNew 
                ? versionInfo.whatsNew.split('\n').filter(l => l.trim()) 
                : FALLBACK_DATA.notes;
            setReleaseNotes(notes);
            if (!isPendingReload) setIsLoading(false);
        });

    // Step Logic
    if (isPendingReload === "true") {
        setCurrentStep("enter"); 
        localStorage.removeItem("hologram_update_pending"); 
        setIsLoading(false); 
        setVisible(true);
    } else {
        setVisible(true);
    }
  }, [versionInfo]);

  // --- MONET SUPPORT ---
  const themeStyles = useMemo(() => {
    switch (activeOverlay) {
        case 'christmas':
            return {
                glow: 'bg-red-600/30',
                accentText: 'text-red-500',
                listIcon: 'text-green-500',
                btnGradient: 'from-red-700 to-green-800',
                toggleActive: 'bg-red-600'
            };
        case 'valentines':
            return {
                glow: 'bg-pink-500/30',
                accentText: 'text-pink-500',
                listIcon: 'text-rose-500',
                btnGradient: 'from-pink-600 to-rose-600',
                toggleActive: 'bg-pink-600'
            };
        default: 
            return {
                glow: 'bg-blue-500/30',
                accentText: 'text-blue-500',
                listIcon: 'text-indigo-500',
                btnGradient: 'from-blue-600 to-indigo-600',
                toggleActive: 'bg-blue-500'
            };
    }
  }, [activeOverlay]);

  // --- TERMINAL MESSAGES ---
  const getTerminalMessage = () => {
      if (isLoading) return `// Establishing Connection...`;
      if (currentStep === 'welcome') return `// System Update Detected...\n// Initializing Guide Protocol\n\nconsole.log("Welcome to the new version.");\nconsole.log("Ready to view changes?");`;
      if (currentStep === 'refresh') return `// FINAL CONFIGURATION\n\nconsole.warn("CACHE CLEAR REQUIRED");\n\n// To ensure stability:\n// Please confirm system restart.`;
      if (currentStep === 'enter') return `// UPDATE SUCCESSFUL\n\nconsole.log("Patch applied.");\nconsole.log("Welcome back, Admin.");`;
      return "";
  };

  // --- TYPING EFFECT ---
  useEffect(() => {
    if (currentStep === 'whatsNew') return; 

    setTypedText("");
    let i = 0;
    const msg = getTerminalMessage(); 

    const interval = setInterval(() => {
      setTypedText(msg.slice(0, i));
      i++;
      if (i > msg.length) clearInterval(interval);
    }, 15); 
    return () => clearInterval(interval);
  }, [currentStep, isLoading]);

  // --- NAVIGATION ---
  const handleNextOrClose = () => {
    if (isLoading) return; 
    if (currentStep === "welcome") setCurrentStep("whatsNew");
    else if (currentStep === "whatsNew") setCurrentStep("refresh");
    else if (currentStep === "refresh") {
      localStorage.setItem("hologram_update_pending", "true");
      window.location.reload();
    } else if (currentStep === "enter") handleManualClose();
  };

  const handleManualClose = () => {
    setVisible(false);
    localStorage.setItem("hologram_onboarding_seen", "true");
    setTimeout(() => { if (onClose) onClose({ dontShowAgain }); }, 300);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 transition-opacity duration-500 ease-out font-sans">
      
      {/* 1. BACKDROP */}
      <div className="absolute inset-0 bg-slate-200/40 dark:bg-black/60 backdrop-blur-[20px]" />
      
      {/* Container: Centered on Mobile (No Character Space) vs Offset on Desktop */}
      <div className={`relative z-10 flex items-center gap-8 max-w-6xl w-full ${isMobile ? 'justify-center h-full' : 'justify-center items-end'}`}>
        
        {/* 2. CHARACTER (Desktop Only) */}
        {!isMobile && (
            <div className="relative group">
                <div className={`absolute inset-0 rounded-full blur-[60px] animate-pulse pointer-events-none ${themeStyles.glow}`} />
                <img 
                    src="/characters/guide.png" 
                    alt="Guide" 
                    className="relative z-10 object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-transform duration-700 ease-in-out hover:scale-105 h-[550px]"
                />
            </div>
        )}

        {/* 3. THE "GLASS" WINDOW */}
        <div className={`relative w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700 ${isMobile ? 'w-[95%]' : ''}`}>
            
            {/* One UI 8.5 Panel */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/40 dark:border-white/10 bg-white/70 dark:bg-[#121216]/70 backdrop-blur-3xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.6)]">
                
                {/* Header / Traffic Lights */}
                <div className="flex-shrink-0 flex items-center gap-2 px-6 py-5 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-white/5 backdrop-blur-md">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FF5F57] shadow-inner"></div>
                        <div className="w-3 h-3 rounded-full bg-[#FEBC2E] shadow-inner"></div>
                        <div className="w-3 h-3 rounded-full bg-[#28C840] shadow-inner"></div>
                    </div>
                    <div className="ml-auto text-[11px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase opacity-70">
                        {currentStep === 'whatsNew' ? 'Release_Notes_v2.0' : 'Terminal_Active'}
                    </div>
                </div>

                {/* Content Area */}
                <div className={`p-6 md:p-8 flex flex-col transition-all duration-500 ${isMobile ? 'h-auto max-h-[60vh]' : 'h-[380px] md:h-[500px] max-h-[80vh]'}`}>
                    
                    {/* CONDITIONAL CONTENT RENDERING */}
                    <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar pr-2 relative">
                        
                        {/* A. Terminal View */}
                        {currentStep !== 'whatsNew' && (
                             <div className="font-mono text-[13px] md:text-[14px] leading-relaxed text-slate-700 dark:text-slate-200">
                                <span className={`${themeStyles.accentText} select-none mr-2`}>➜</span>
                                <span className="text-purple-500 select-none mr-2">~</span>
                                <span className="whitespace-pre-wrap">{typedText}</span>
                                <span className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400 animate-pulse"></span>
                             </div>
                        )}

                        {/* B. What's New List */}
                        {currentStep === 'whatsNew' && (
                            <div className="animate-in fade-in zoom-in-95 duration-500">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">What's New</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Latest Build Changes</p>
                                
                                <ul className="space-y-3">
                                    {releaseNotes.map((note, index) => (
                                        <li 
                                            key={index} 
                                            className="group flex gap-4 p-4 rounded-[1.5rem] bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-[#1a1b26] shadow-sm ${themeStyles.listIcon}`}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 leading-snug">
                                                    {note}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Footer / Controls */}
                    <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-4 flex-shrink-0">
                        
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                            <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400 uppercase group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                Don't show again
                            </span>
                            <div className={`relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out ${dontShowAgain ? themeStyles.toggleActive : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${dontShowAgain ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleNextOrClose}
                                disabled={isLoading}
                                className={`w-full py-4 rounded-[1.5rem] font-black text-[15px] text-white shadow-xl shadow-blue-500/20
                                        bg-gradient-to-r ${themeStyles.btnGradient}
                                        hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] 
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all duration-300 ease-out flex items-center justify-center gap-2`}
                            >
                                {isLoading && "Connecting..."}
                                {!isLoading && currentStep === "welcome" && "Show Updates"}
                                {!isLoading && currentStep === "whatsNew" && "Continue"}
                                {!isLoading && currentStep === "refresh" && "Restart System"}
                                {!isLoading && currentStep === "enter" && "Enter Dashboard"}
                                
                                <svg className={`w-5 h-5 transition-transform ${currentStep === 'refresh' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>

                            {currentStep === 'refresh' && (
                                <button 
                                    onClick={handleManualClose}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-2"
                                >
                                    Dismiss (Risk of cache errors)
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* 4. THE GLASS ARROW (Left of box - Desktop Only) */}
            {!isMobile && (
                 <div className="absolute top-[120px] -left-4 w-4 h-4 bg-white/60 dark:bg-[#121216]/60 border-l border-b border-white/40 dark:border-white/10 backdrop-blur-2xl rotate-45 transform origin-center"></div>
            )}
        </div>
      </div>
    </div>
  );
}