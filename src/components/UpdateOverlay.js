import React, { useEffect, useState } from "react";

// Adjust this based on your site's typical build time in Netlify.
const AVERAGE_BUILD_SECONDS = 300; // 5 minutes

export default function UpdateOverlay({ onEnter }) {
  const [status, setStatus] = useState("building"); // Assume building initially
  const [timeLeft, setTimeLeft] = useState(AVERAGE_BUILD_SECONDS);
  const [showEnterButton, setShowEnterButton] = useState(false);

  useEffect(() => {
    let pollInterval;
    let countdownInterval;

    const checkBuildStatus = async () => {
      try {
        const res = await fetch("/.netlify/functions/build-status", { cache: "no-store" });
        const data = await res.json();
        
        if (data.status === "building" && data.startTime) {
          const elapsedSeconds = Math.floor((Date.now() - data.startTime) / 1000);
          const remaining = Math.max(0, AVERAGE_BUILD_SECONDS - elapsedSeconds);
          setTimeLeft(remaining);

          if (!countdownInterval) {
            countdownInterval = setInterval(() => {
              setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
          }
        }
        
        if (data.status === "ready") {
          setTimeLeft(0); // <-- ADD THIS LINE
          setStatus("ready");
          setShowEnterButton(true);
          if (pollInterval) clearInterval(pollInterval);
          if (countdownInterval) clearInterval(countdownInterval);
        }

      } catch (err) {
        console.error("Failed to fetch build status, assuming ready.", err);
        setStatus("ready");
        setShowEnterButton(true);
        if (pollInterval) clearInterval(pollInterval);
        if (countdownInterval) clearInterval(countdownInterval);
      }
    };

    checkBuildStatus();
    pollInterval = setInterval(checkBuildStatus, 5000);

    return () => {
      clearInterval(pollInterval);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        zIndex: 20000,
        fontFamily: `"Fira Code", monospace`,
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
            width: "520px",
            minHeight: "300px",
            fontSize: "14px",
            color: "#d4d4d4",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", flexGrow: 1 }}>
            {status === 'ready' 
              ? `// System Update Complete
("All modules have been synchronized.");
("The system is now online.");`
              : `// System Update In Progress
("A new version is being deployed...");
("Estimated time remaining: ${formatTime(timeLeft)}");`
            }
          </pre>
          
          <div>
            <button
              disabled={!showEnterButton}
              onClick={onEnter}
              style={{
                marginTop: "16px",
                background: showEnterButton ? "#007acc" : "#555",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                color: "#fff",
                fontWeight: "600",
                cursor: showEnterButton ? "pointer" : "not-allowed",
                fontFamily: `"Fira Code", monospace`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                width: "100%",
                transition: "background-color 0.3s ease",
              }}
            >
              {showEnterButton ? "Enter System" : "Please Wait…"}
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