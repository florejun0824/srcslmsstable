import React, { useEffect, useState, useMemo } from "react";

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
  const [currentStep, setCurrentStep] = useState("welcome");
  const isMobile = useIsMobile();

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
    return `const newFeatures = [\n${notes}\n];\n\nreturn "Have a productive day!";`;
  }, [versionInfo.whatsNew]);

  const currentMessage = currentStep === "welcome" ? welcomeMessage : whatsNewMessage;

  // --- TYPING EFFECT ---
  useEffect(() => {
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(currentMessage.slice(0, i));
      i++;
      if (i > currentMessage.length) clearInterval(interval);
    }, 15); // Slightly faster typing for modern feel
    return () => clearInterval(interval);
  }, [currentMessage]);

  const handleNextOrClose = () => {
    if (currentStep === "welcome") {
      setCurrentStep("whatsNew");
    } else {
      setVisible(false);
      setTimeout(() => {
         if (onClose) onClose({ dontShowAgain });
      }, 300); // Wait for exit animation
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[13000] flex items-center justify-center p-4 transition-opacity duration-500 ease-out">
      
      {/* 1. BACKDROP: Deep blur with a subtle gradient wash */}
      <div className="absolute inset-0 bg-slate-100/40 dark:bg-black/40 backdrop-blur-[20px]" />
      
      <div className={`relative z-10 flex items-center gap-8 max-w-6xl w-full ${isMobile ? 'flex-col justify-center mt-10' : 'flex-row justify-center items-end'}`}>
        
        {/* 2. CHARACTER: Added a 'breathing' glow effect behind */}
        <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-[60px] animate-pulse pointer-events-none" />
            <img 
                src="/characters/guide.png" 
                alt="Guide" 
                className={`relative z-10 object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-transform duration-700 ease-in-out hover:scale-105 ${isMobile ? 'h-[280px]' : 'h-[550px]'}`}
            />
        </div>

        {/* 3. THE "GLASS" WINDOW */}
        <div className="relative w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* The Glass Container */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/70 dark:bg-[#1a1b26]/70 backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                
                {/* Window Header (Traffic Lights) */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-white/5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/10"></div>
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-black/10"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28C840] border border-black/10"></div>
                    <div className="ml-auto text-[10px] font-bold tracking-widest text-slate-400 uppercase opacity-60">Term_v2.0</div>
                </div>

                <div className="p-6 md:p-8 flex flex-col min-h-[320px]">
                    
                    {/* Code Area */}
                    <div className="flex-grow font-mono text-[13px] md:text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <span className="text-blue-500 dark:text-blue-400 select-none mr-2">➜</span>
                        <span className="text-purple-500 dark:text-purple-400 select-none mr-2">~</span>
                        <span className="whitespace-pre-wrap">{typedText}</span>
                        <span className="inline-block w-2 h-4 ml-1 align-middle bg-slate-400 animate-pulse"></span>
                    </div>

                    {/* Footer Controls */}
                    <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-5">
                        
                        {/* Toggle Switch (iOS Style) */}
                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                Don't show this again
                            </span>
                            <div className={`relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out ${dontShowAgain ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${dontShowAgain ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </div>

                        {/* Action Button (Glass/Gradient Pill) */}
                        <button
                            onClick={handleNextOrClose}
                            className="w-full py-3.5 rounded-2xl font-semibold text-white shadow-lg 
                                       bg-gradient-to-r from-blue-500 to-indigo-600 
                                       hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] 
                                       transition-all duration-300 ease-out flex items-center justify-center gap-2"
                        >
                            {currentStep === "welcome" ? "See Updates" : "Start Exploring"}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. THE GLASS ARROW (SVG for perfect blending) */}
            {/* Conditional rendering based on mobile to position the arrow correctly */}
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