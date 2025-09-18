import React, { useEffect, useState } from "react";

export default function WhatsNewModal({ versionInfo, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!versionInfo) return null;

  const handleClose = () => {
    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipVersion", versionInfo.version);
    } else if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
    onClose();
  };

  const notes = versionInfo.whatsNew
    ? versionInfo.whatsNew.split("\n").filter((line) => line.trim() !== "")
    : ["No details provided."];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          borderRadius: "24px",
          padding: "20px",
          width: "100%",
          maxWidth: "500px",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
          animation: "fadeIn 0.35s ease",
        }}
      >
        <h2
          style={{
            margin: "0 0 6px 0",
            textAlign: "center",
            fontSize: "20px",
            fontWeight: 700,
            color: "#111",
          }}
        >
          What’s New
        </h2>
        <p
          style={{
            textAlign: "center",
            fontWeight: 500,
            fontSize: "14px",
            color: "#666",
            marginBottom: "16px",
          }}
        >
          Version {versionInfo.version}
        </p>

        {/* iOS Settings-style list for notes */}
        <div
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #e5e5ea",
            background: "#fff",
            marginBottom: "20px",
          }}
        >
          {notes.map((line, i) => (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                borderBottom:
                  i !== notes.length - 1 ? "1px solid #e5e5ea" : "none",
                fontSize: "15px",
                color: "#111",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* iOS Settings-style toggle */}
        <div
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #e5e5ea",
            background: "#fff",
            marginBottom: "20px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "14px", color: "#111" }}>
              Do not show again
            </span>

            {/* iOS-style toggle */}
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
                  backgroundColor: dontShowAgain ? "#34c759" : "#e5e5ea",
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
          </label>
        </div>

        {/* Okay Button */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleClose}
            style={{
              background: "#007aff",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "10px 28px",
              fontWeight: 600,
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,122,255,0.3)",
              transition: "all 0.2s ease",
              width: "100%",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
