import React, { useEffect, useState, useMemo } from "react";

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

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

  const welcomeMessage = useMemo(() => 
    `// Welcome to the new update\n("You are now running Version ${versionInfo.version}");\n("May your journey be filled with wisdom.");`, 
    [versionInfo.version]
  );

  const whatsNewMessage = useMemo(() => {
    const notes = versionInfo.whatsNew
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map(line => `("${line}");`)
      .join("\n");
    return `// Here is what's new in this version\n${notes}\n("Have a Blessed Day!");`;
  }, [versionInfo.whatsNew]);

  const currentMessage = currentStep === "welcome" ? welcomeMessage : whatsNewMessage;

  useEffect(() => {
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(currentMessage.slice(0, i));
      i++;
      if (i > currentMessage.length) {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [currentMessage]);

  const handleNextOrClose = () => {
    if (currentStep === "welcome") {
      setCurrentStep("whatsNew");
    } else {
      setVisible(false);
      if (onClose) {
        onClose({ dontShowAgain });
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[13000] overflow-y-auto p-4">
      <div className={`flex items-center gap-7 max-w-5xl ${isMobile ? 'flex-col justify-center' : 'flex-row justify-end'}`}>
        <img 
            src="/characters/guide.png" 
            alt="Guide" 
            className="object-contain drop-shadow-[0_0_15px_rgba(0,255,200,0.6)]"
            style={{ height: isMobile ? '250px' : '500px', marginBottom: isMobile ? '-20px' : '0' }}
        />
        <div className="relative bg-neumorphic-base rounded-2xl p-5 w-[90vw] max-w-lg min-h-[300px] font-mono text-sm text-slate-700 shadow-neumorphic flex flex-col justify-between">
          <pre className="m-0 whitespace-pre-wrap flex-grow">{typedText}</pre>
          
          <div>
            <div className="rounded-xl overflow-hidden bg-neumorphic-base shadow-neumorphic-inset mt-4 p-3 flex items-center justify-between">
              <span className="text-sm text-slate-600 font-semibold">
                Do not show again
              </span>
              <label htmlFor="dont-show-again" className="relative w-[50px] h-[28px] flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="sr-only peer"
                />
                <span className="absolute inset-0 bg-neumorphic-base shadow-neumorphic-inset rounded-full peer-checked:bg-gradient-to-br peer-checked:from-sky-100 peer-checked:to-blue-200 transition-colors" />
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-neumorphic-base shadow-neumorphic transition-transform peer-checked:translate-x-full`} />
              </label>
            </div>

            <button
              onClick={handleNextOrClose}
              className="mt-4 w-full p-3 font-semibold rounded-xl transition-shadow bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic hover:shadow-neumorphic-inset active:shadow-neumorphic-inset"
            >
              {currentStep === "welcome" ? "Next" : "Okay"}
            </button>
          </div>
          <div 
            className="absolute"
            style={isMobile ? {
                top: '-18px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0,
                borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '18px solid #F0F2F5'
            } : {
                left: '-18px', top: '50px', width: 0, height: 0,
                borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderRight: '18px solid #F0F2F5'
            }}
          />
        </div>
      </div>
    </div>
  );
}