import React, { useState, useEffect, useRef } from "react";
// Import the new combined component
import HologramOnboarding from "./HologramOnboarding"; 

export default function PostLoginExperience({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const fetchVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();
        setVersionInfo(data);

        const lastSeenVersion = localStorage.getItem("lastSeenVersion");
        const skipHologramVersion = localStorage.getItem("skipHologramVersion");

        // Show the onboarding flow if the version is new and not skipped
        if (data.version !== lastSeenVersion && data.version !== skipHologramVersion) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Failed to fetch version.json", err);
      }
    };

    fetchVersion();
  }, []);

  const handleOnboardingClose = ({ dontShowAgain } = {}) => {
    setShowOnboarding(false);

    if (dontShowAgain && versionInfo?.version) {
      localStorage.setItem("skipHologramVersion", versionInfo.version);
    }
    
    // Always set the lastSeenVersion when the flow is completed
    if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
  };

  return (
    <>
      {showOnboarding && (
        <HologramOnboarding
          versionInfo={versionInfo}
          onClose={handleOnboardingClose}
        />
      )}
      {!showOnboarding && children}
    </>
  );
}