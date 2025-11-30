import React, { useEffect, useState, useMemo } from "react";
import { useTheme } from '../../contexts/ThemeContext'; // Import Theme Context

// --- CUSTOM HOOKS ---
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize(); // Set initial value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
};

export default function HologramOnboarding({ versionInfo, onClose }) {
  const [visible, setVisible] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [currentStep, setCurrentStep] = useState("welcome"); // Steps: 'welcome' -> 'whatsNew' -> 'refresh'
  const isMobile = useIsMobile();
  
  // --- MONET SUPPORT: THEME CONTEXT ---
  const { activeOverlay } = useTheme();

  // Define dynamic styles based on the active overlay (Monet effect)
  const themeStyles = useMemo(() => {
    switch (activeOverlay) {
        case 'christmas':
            return {
                glow: 'bg-red-600/30',
                accentText: 'text-red-500 dark:text-red-400',
                secondaryText: 'text-green-500 dark:text-green-400',
                btnGradient: 'from-red-700 to-green-800',
                toggleActive: 'bg-red-600'
            };
        case 'valentines':
            return {
                glow: 'bg-pink-500/30',
                accentText: 'text-pink-500 dark:text-pink-400',
                secondaryText: 'text-rose-500 dark:text-rose-400',
                btnGradient: 'from-pink-600 to-rose-600',
                toggleActive: 'bg-pink-600'
            };
        case 'graduation':
            return {
                glow: 'bg-yellow-500/20',
                accentText: 'text-yellow-600 dark:text-yellow-400',
                secondaryText: 'text-amber-600 dark:text-amber-400',
                btnGradient: 'from-yellow-600 to-amber-700',
                toggleActive: 'bg-yellow-600'
            };
        case 'cyberpunk':
            return {
                glow: 'bg-fuchsia-500/40',
                accentText: 'text-cyan-400',
                secondaryText: 'text-fuchsia-400',
                btnGradient: 'from-fuchsia-600 to-cyan-600',
                toggleActive: 'bg-fuchsia-500'
            };
        case 'space':
            return {
                glow: 'bg-indigo-500/40',
                accentText: 'text-indigo-400',
                secondaryText: 'text-violet-400',
                btnGradient: 'from-indigo-600 to-violet-800',
                toggleActive: 'bg-indigo-500'
            };
        case 'rainy':
             return {
                glow: 'bg-teal-500/30',
                accentText: 'text-teal-500 dark:text-teal-400',
                secondaryText: 'text-emerald-500 dark:text-emerald-400',
                btnGradient: 'from-slate-600 to-teal-700',
                toggleActive: 'bg-teal-600'
            };
        default: // Standard / Spring
            return {
                glow: 'bg-blue-500/30',
                accentText: 'text-blue-500 dark:text-blue-400',
                secondaryText: 'text-purple-500 dark:text-purple-400',
                btnGradient: 'from-blue-500 to-indigo-600',
                toggleActive: 'bg-blue-500'
            };
    }
  }, [activeOverlay]);

  // --- CONTENT LOGIC ---
  const welcomeMessage = useMemo(() => 
    `// System Update Detected...\n// Initializing Guide Protocol\n\nconsole.log("Welcome to Version ${versionInfo.version}");\nconsole.log("Systems are fully operational.");`, 
    [versionInfo.version]
  );

  const whatsNewMessage = useMemo(() => {
    const notes = versionInfo.whatsNew
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map(line => `  "${line}",`)
      .join("\n");
    return `const newFeatures = [\n${notes}\n];\n\n// Review complete. Ready to launch?`;
  }, [versionInfo.whatsNew]);

  const refreshInstructionMessage = useMemo(() => 
    `// FINAL CONFIGURATION REQUIRED\n\nconsole.warn("CACHE CLEAR RECOMMENDED");\n\n/* \n * To ensure all new assets load correctly,\n * please perform a HARD REFRESH:\n */\n\n// Windows / Linux:\n   Press [ Ctrl + F5 ]\n\n// Mac OS:\n   Press [ Cmd + Shift + R ]\n\nreturn "System Updated.";`,
    []
  );

  // Determine which message to show based on step
  const currentMessage = useMemo(() => {
      if (currentStep === 'welcome') return welcomeMessage;
      if (currentStep === 'whatsNew') return whatsNewMessage;
      return refreshInstructionMessage;
  }, [currentStep, welcomeMessage, whatsNewMessage, refreshInstructionMessage]);

  // --- TYPING EFFECT ---
  useEffect(() => {
    setTypedText("");
    let i = 0;
    // Speed up typing slightly for the long refresh message
    const speed = currentStep === 'refresh' ? 10 : 15;
    
    const interval = setInterval(() => {
      setTypedText(currentMessage.slice(0, i));
      i++;
      if (i > currentMessage.length) clearInterval(interval);
    }, speed); 
    return () => clearInterval(interval);
  }, [currentMessage, currentStep]);

  // --- NAVIGATION HANDLER ---
  const handleNextOrClose = () => {
    if (currentStep === "welcome") {
      setCurrentStep("whatsNew");
    } else if (currentStep === "whatsNew") {
      // Go to Refresh Instruction step
      setCurrentStep("refresh");
    } else {
      // "Reload Browser" Action
      window.location.reload();
    }
  };

  const handleManualClose = () => {
    setVisible(false);
    setTimeout(() => {
        if (onClose) onClose({ dontShowAgain });
    }, 300);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 transition-opacity duration-500 ease-out">
      
      {/* 1. BACKDROP */}
      <div className="absolute inset-0 bg-slate-100/40 dark:bg-black/40 backdrop-blur-[20px]" />
      
      <div className={`relative z-10 flex items-center gap-8 max-w-6xl w-full ${isMobile ? 'flex-col justify-center mt-10' : 'flex-row justify-center items-end'}`}>
        
        {/* 2. CHARACTER */}
        <div className="relative group">
            {/* Dynamic Glow based on Monet Theme */}
            <div className={`absolute inset-0 rounded-full blur-[60px] animate-pulse pointer-events-none ${themeStyles.glow}`} />
            <img 
                src="/characters/guide.png" 
                alt="Guide" 
                className={`relative z-10 object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-transform duration-700 ease-in-out hover:scale-105 ${isMobile ? 'h-[280px]' : 'h-[550px]'}`}
            />
        </div>

        {/* 3. THE "GLASS" WINDOW */}
        <div className="relative w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Glass Container */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                
                {/* Header */}
                <div className="flex-shrink-0 flex items-center gap-2 px-5 py-4 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-white/5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10"></div>
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-black/10"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28C840] border border-black/10"></div>
                    <div className="ml-auto text-[10px] font-bold tracking-widest text-slate-400 uppercase opacity-60">Term_v2.0</div>
                </div>

                <div className="p-6 md:p-8 flex flex-col h-[360px] md:h-[500px] max-h-[80vh]">
                    
                    <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar font-mono text-[13px] md:text-[14px] leading-relaxed text-slate-600 dark:text-slate-300 pr-2">
                        {/* Dynamic Accent Colors */}
                        <span className={`${themeStyles.accentText} select-none mr-2`}>➜</span>
                        <span className={`${themeStyles.secondaryText} select-none mr-2`}>~</span>
                        
                        <span className="whitespace-pre-wrap">{typedText}</span>
                        <span className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400 animate-pulse"></span>
                    </div>

                    {/* Footer Controls */}
                    <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-4 flex-shrink-0">
                        
                        {/* Toggle Switch */}
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                Don't show this again
                            </span>
                            {/* Dynamic Toggle Color */}
                            <div className={`relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out ${dontShowAgain ? themeStyles.toggleActive : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${dontShowAgain ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {/* Buttons Container */}
                        <div className="flex flex-col gap-3">
                            {/* Primary Action Button (Dynamic Gradient) */}
                            <button
                                onClick={handleNextOrClose}
                                className={`w-full py-3.5 rounded-2xl font-semibold text-white shadow-lg 
                                        bg-gradient-to-r ${themeStyles.btnGradient}
                                        hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] 
                                        transition-all duration-300 ease-out flex items-center justify-center gap-2`}
                            >
                                {currentStep === "welcome" && "See Updates"}
                                {currentStep === "whatsNew" && "Start Exploring"}
                                {currentStep === "refresh" && "Reload Browser"}
                                
                                {currentStep !== "refresh" ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                )}
                            </button>

                            {/* Secondary Close Button (Only show on refresh step to allow manual exit) */}
                            {currentStep === 'refresh' && (
                                <button 
                                    onClick={handleManualClose}
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors py-1"
                                >
                                    No thanks, I'll refresh later
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* 4. THE GLASS ARROW (Color adaptive) */}
            {!isMobile ? (
                 <svg className="absolute top-[120px] -left-5 w-6 h-12 text-white/70 dark:text-[#1a1b26]/70 drop-shadow-[-4px_0_4px_rgba(0,0,0,0.05)]" viewBox="0 0 24 48" fill="currentColor">
                    <path d="M24 0V48L0 24L24 0Z" />
                 </svg>
            ) : (
                <svg className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-6 text-white/70 dark:text-[#1a1b26]/70 drop-shadow-[0_-4px_4px_rgba(0,0,0,0.05)]" viewBox="0 0 48 24" fill="currentColor">
                    <path d="M0 24H48L24 0L0 24Z" />
                </svg>
            )}
        </div>
      </div>
    </div>
  );
}