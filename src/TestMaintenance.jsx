import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import UpdateOverlay from "./components/UpdateOverlay";
import "./index.css"; // ensure Tailwind or your styles are loaded

function TestMaintenance() {
  const [status, setStatus] = useState("building");

  useEffect(() => {
    // Simulate Netlify building for 15 seconds, then complete
    const timer = setTimeout(() => setStatus("complete"), 15000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <UpdateOverlay
      status={status}
      timeLeft={90}
      onEnter={() => alert("✅ Entering new version...")}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TestMaintenance />
  </React.StrictMode>
);
