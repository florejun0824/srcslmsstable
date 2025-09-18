import React, { useEffect, useState, useMemo } from "react";

// ✅ RESPONSIVE: A simple hook to check for screen size.
// This helps decide which layout to use.
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
  const [currentStep, setCurrentStep] = useState("welcome"); // 'welcome' or 'whatsNew'
  const isMobile = useIsMobile(); // Use the hook to get screen status

  // Memoized messages (unchanged)
  const welcomeMessage = useMemo(() => 
    `// Welcome to the new update
("You are now running Version ${versionInfo.version}");
("May your journey be filled with wisdom.");`, 
    [versionInfo.version]
  );

  const whatsNewMessage = useMemo(() => {
    const notes = versionInfo.whatsNew
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map(line => `("${line}");`)
      .join("\n");
    return `// Here is what's new in this version
${notes}
("Have a Blessed Day!");`;
  }, [versionInfo.whatsNew]);

  const currentMessage = currentStep === "welcome" ? welcomeMessage : whatsNewMessage;

  // Typing effect (unchanged)
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

  // ✅ RESPONSIVE: Define conditional styles based on screen size.
  const containerStyle = {
    display: "flex",
    alignItems: "center", // Center vertically on mobile
    gap: isMobile ? "20px" : "28px",
    maxWidth: "1000px",
    padding: "20px",
    flexDirection: isMobile ? "column" : "row", // Stack on mobile
    justifyContent: isMobile ? "center" : "flex-end", // Adjust justification
  };

  const imageStyle = {
    height: isMobile ? "250px" : "500px", // Smaller image on mobile
    objectFit: "contain",
    filter: "drop-shadow(0 0 15px rgba(0,255,200,0.6))",
    marginBottom: isMobile ? "-20px" : "0", // Pull text box up on mobile
  };

  const textBoxStyle = {
    position: "relative",
    background: "#1e1e1e",
    border: "2px solid #3c3c3c",
    borderRadius: "8px",
    padding: "20px",
    width: isMobile ? "90vw" : "520px", // Full width on mobile
    maxWidth: "520px", // Max width for larger mobile screens
    minHeight: "300px",
    fontFamily: `"Fira Code", monospace`,
    fontSize: isMobile ? "13px" : "14px", // Slightly smaller font on mobile
    color: "#d4d4d4",
    boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  };

  const speechBubbleArrowStyle = isMobile ? {
    // Arrow on top for mobile
    position: "absolute",
    top: "-18px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "12px solid transparent",
    borderRight: "12px solid transparent",
    borderBottom: "18px solid #1e1e1e",
  } : {
    // Arrow on the left for desktop
    position: "absolute",
    left: "-18px",
    top: "50px",
    width: 0,
    height: 0,
    borderTop: "12px solid transparent",
    borderBottom: "12px solid transparent",
    borderRight: "18px solid #1e1e1e",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 13000,
        overflowY: "auto", // Allow scrolling on small screens
      }}
    >
      {/* ✅ RESPONSIVE: Applied conditional styles */}
      <div style={containerStyle}>
        <img src="/characters/guide.png" alt="Guide" style={imageStyle} />
        <div style={textBoxStyle}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", flexGrow: 1 }}>{typedText}</pre>
          
          <div>
            <div
              style={{
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid #3c3c3c",
                background: "#2a2a2a",
                marginTop: "16px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "13px", color: "#bbb" }}>
                Do not show again
              </span>
              <div style={{ position: "relative", width: "50px", height: "28px", flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  style={{
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    margin: 0,
                    position: "absolute",
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                />
                <span style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: dontShowAgain ? "#34c759" : "#555",
                  borderRadius: "14px",
                  transition: "background-color 0.25s",
                }} />
                <span style={{
                  position: "absolute",
                  top: "2px",
                  left: dontShowAgain ? "26px" : "2px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  transition: "left 0.25s",
                  zIndex: 1,
                }} />
              </div>
            </div>

            <button
              onClick={handleNextOrClose}
              style={{
                marginTop: "16px",
                background: "#007acc",
                border: "none",
                borderRadius: "6px",
                padding: "10px 16px", // Slightly more padding for touch targets
                color: "#fff",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: `"Fira Code", monospace`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                width: "100%",
              }}
            >
              {currentStep === "welcome" ? "Next" : "Okay"}
            </button>
          </div>
          {/* ✅ RESPONSIVE: Applied conditional styles */}
          <div style={speechBubbleArrowStyle} />
        </div>
      </div>
    </div>
  );
}