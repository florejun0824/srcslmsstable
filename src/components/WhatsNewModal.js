import React, { useEffect, useState } from "react";

export default function WhatsNewModal() {
  const [show, setShow] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();
        setVersionInfo(data);

        const lastSeenVersion = localStorage.getItem("lastSeenVersion");
        const skipVersion = localStorage.getItem("skipVersion");

        if (data.version !== lastSeenVersion && data.version !== skipVersion) {
          setShow(true);
        }
      } catch (err) {
        console.error("Failed to fetch version.json:", err);
      }
    };

    checkVersion();
  }, []);

  const handleClose = () => {
    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipVersion", versionInfo.version);
    } else if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
    setShow(false);
  };

  if (!show || !versionInfo) return null;

  const notes = versionInfo.whatsNew
    ? versionInfo.whatsNew.split("\n").filter(line => line.trim() !== "")
    : ["No details provided."];

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          borderRadius: "24px",
          padding: "28px",
          width: "90%",
          maxWidth: "460px",
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
          animation: "fadeIn 0.35s ease",
        }}
      >
        <h2
          style={{
            marginTop: 0,
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
            color: "#555",
            marginBottom: "20px",
          }}
        >
          Version {versionInfo.version}
        </p>

        <ul style={{ paddingLeft: "22px", lineHeight: "1.6", marginBottom: "20px" }}>
          {notes.map((line, i) => (
            <li key={i} style={{ marginBottom: "8px" }}>
              {line}
            </li>
          ))}
        </ul>

        {/* iOS-style toggle */}
	<div style={{ marginBottom: "20px" }}>
	  <label
	    style={{
	      display: "flex",
	      alignItems: "center",
	      justifyContent: "space-between",
	      padding: "10px 0",
	      borderTop: "1px solid #e5e5ea",
	      borderBottom: "1px solid #e5e5ea",
	      cursor: "pointer",
	    }}
	  >
	    <span style={{ fontSize: "14px", color: "#111" }}>
	      Do not show again for this version
	    </span>

	    <div
	      style={{
	        position: "relative",
	        width: "50px",
	        height: "28px",
	      }}
	    >
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
