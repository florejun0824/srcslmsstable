import React from "react";
import { useVersionCheck } from "../hooks/useVersionCheck";

export default function VersionNotifier() {
  const updateAvailable = useVersionCheck(60000); // check every 60s

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(245,245,245,0.4) 100%)",
        borderRadius: "20px",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        color: "#111",
        fontSize: "15px",
        fontWeight: 500,
        gap: "12px",
        animation: "fadeInUp 0.5s ease",
      }}
    >
      <span style={{ flex: 1 }}>🚀 A new version of LMS is available</span>
      <button
        onClick={() => window.location.reload(true)}
        style={{
          background: "linear-gradient(90deg, #007aff 0%, #0a84ff 100%)",
          border: "none",
          color: "white",
          fontWeight: 600,
          padding: "8px 18px",
          borderRadius: "14px",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,122,255,0.3)",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
        }}
      >
        Refresh
      </button>
    </div>
  );
}
