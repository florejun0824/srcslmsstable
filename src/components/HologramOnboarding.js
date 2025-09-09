import React, { useEffect, useState, useMemo } from "react";

export default function HologramOnboarding({ versionInfo, onClose }) {
  const [visible, setVisible] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [currentStep, setCurrentStep] = useState("welcome"); // 'welcome' or 'whatsNew'

  // Memoize the messages to prevent re-creation on every render
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
      .map(line => `("${line}");`) // Format each line like the welcome message
      .join("\n");
    return `// Here is what's new in this version
${notes}
("Have a Blessed Day!");`;
  }, [versionInfo.whatsNew]);

  // Determine the current message based on the step
  const currentMessage = currentStep === "welcome" ? welcomeMessage : whatsNewMessage;

  // Typing effect - re-runs whenever the currentMessage changes
  useEffect(() => {
    setTypedText(""); // Reset typed text when message changes
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(currentMessage.slice(0, i));
      i++;
      if (i > currentMessage.length) {
        clearInterval(interval);
      }
    }, 20); // Typing speed

    return () => clearInterval(interval);
  }, [currentMessage]);

  const handleNextOrClose = () => {
    if (currentStep === "welcome") {
      // If on the welcome screen, just move to the next step
      setCurrentStep("whatsNew");
    } else {
      // If on the final screen, close the modal
      setVisible(false);
      if (onClose) {
        onClose({ dontShowAgain });
      }
    }
  };

  if (!visible) return null;

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
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "28px",
          maxWidth: "1000px",
          padding: "20px",
        }}
      >
        <img
          src="/characters/guide.png"
          alt="Guide"
          style={{
            height: "500px",
            objectFit: "contain",
            filter: "drop-shadow(0 0 15px rgba(0,255,200,0.6))",
          }}
        />
        <div
          style={{
            position: "relative",
            background: "#1e1e1e",
            border: "2px solid #3c3c3c",
            borderRadius: "8px",
            padding: "20px",
            width: "520px", // Fixed width for stability
            minHeight: "300px", // Fixed min-height
            fontFamily: `"Fira Code", monospace`,
            fontSize: "14px",
            color: "#d4d4d4",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between", // Pushes button to bottom
          }}
        >
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
              <div style={{ position: "relative", width: "50px", height: "28px" }}>
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
                padding: "8px 16px",
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
          <div
            style={{
              position: "absolute",
              left: "-18px",
              top: "50px",
              width: 0,
              height: 0,
              borderTop: "12px solid transparent",
              borderBottom: "12px solid transparent",
              borderRight: "18px solid #1e1e1e",
            }}
          />
        </div>
      </div>
    </div>
  );
}