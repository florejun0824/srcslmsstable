import React, { useState, useEffect, useRef } from "react";
// Import the new combined component
import HologramOnboarding from "./HologramOnboarding"; 
// --- ADDED: Import the new BiometricPrompt component ---
import BiometricPrompt from "./common/BiometricPrompt"; // <-- Adjust path if you save it elsewhere

// --- 1. IMPORT YOUR NEW PRIVACY MODAL ---
import PrivacyAgreementModal from "./common/PrivacyAgreementModal";

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
      {/* --- 2. ADD THE PRIVACY MODAL HERE ---
        It will render first and appear on top of everything
        (including the HologramOnboarding) because its `z-index`
        is set higher. It must be accepted before the user
        can interact with anything else.
      */}
      <PrivacyAgreementModal />

      {showOnboarding && (
        <HologramOnboarding
          versionInfo={versionInfo}
          onClose={handleOnboardingClose}
        />
      )}
      
      {/* --- MODIFIED SECTION ---
        Once onboarding is hidden, we render the children (the dashboard)
        AND our new BiometricPrompt. It will handle its own logic
        and show a modal *on top* of the dashboard if needed.
      */}
      {!showOnboarding && (
        <>
          <BiometricPrompt />
          {children}
        </>
      )}
    </>
  );
}