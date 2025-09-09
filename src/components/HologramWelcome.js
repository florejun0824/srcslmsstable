import React, { useEffect, useState } from "react";

export default function HologramWelcome({ version, onClose }) {
  const [visible, setVisible] = useState(true);
  const [typedText, setTypedText] = useState("");

  const message = `// Welcome to the new update
("Your are now Running Version ${version}");
("May your journey be filled with wisdom ");
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
    if (onClose) onClose();
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
