import React, { useState, useEffect, useRef } from "react";
// Import the new combined component
import HologramOnboarding from "./HologramOnboarding"; 
// --- ADDED: Import the new BiometricPrompt component ---
import BiometricPrompt from "./common/BiometricPrompt"; 

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

        // --- NEW CHECK: PREVENT OVERLAP ---
        // We check if the "SchoolBrandingHandler" has flagged that a theme restart is pending.
        // If it is 'true', we DO NOT show onboarding, because the Restart Dialog is already visible.
        const isThemePending = sessionStorage.getItem("theme_update_pending");

        // Show the onboarding flow ONLY if:
        // 1. Version is new
        // 2. User hasn't skipped this version
        // 3. We are NOT waiting for a theme restart
        if (data.version !== lastSeenVersion && 
            data.version !== skipHologramVersion && 
            !isThemePending) { 
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
      {/* --- 2. PRIVACY MODAL --- */}
      <PrivacyAgreementModal />

      {showOnboarding && (
        <HologramOnboarding
          versionInfo={versionInfo}
          onClose={handleOnboardingClose}
        />
      )}
      
      {/* --- DASHBOARD & BIOMETRICS --- */}
      {!showOnboarding && (
        <>
          <BiometricPrompt />
          {children}
        </>
      )}
    </>
  );
}