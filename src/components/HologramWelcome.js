import React, { useEffect, useState } from "react";

export default function HologramWelcome({ version, onClose }) {
  const [visible, setVisible] = useState(true);
  const [typedText, setTypedText] = useState("");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const message = `// Welcome to the new update
("You are now running Version ${version}");
("May your journey be filled with wisdom");
("Have a Blessed Day!");`;

  // typing effect
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(message.slice(0, i));
      i++;
      if (i > message.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [message]);

  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose({ dontShowAgain });
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
        {/* Left: 2D character illustration */}
        <img
          src="/characters/guide.png"
          alt="Guide"
          style={{
            height: "500px",
            objectFit: "contain",
            filter: "drop-shadow(0 0 15px rgba(0,255,200,0.6))",
          }}
        />

        {/* Right: Code-style Dialogue box */}
        <div
          style={{
            position: "relative",
            background: "#1e1e1e",
            border: "2px solid #3c3c3c",
            borderRadius: "8px",
            padding: "20px",
            maxWidth: "520px",
            fontFamily: `"Fira Code", monospace`,
            fontSize: "14px",
            color: "#d4d4d4",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{typedText}</pre>

          {/* iOS-style toggle */}
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
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: dontShowAgain ? "#34c759" : "#555",
                  borderRadius: "14px",
                  transition: "background-color 0.25s",
                }}
              />
              <span
                style={{
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
                }}
              />
            </div>
          </div>

          <button
            onClick={handleClose}
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
            Continue
          </button>

          {/* Speech bubble tail */}
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
