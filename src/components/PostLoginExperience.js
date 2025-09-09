import React, { useState, useEffect } from "react";
import HologramWelcome from "./HologramWelcome";
import WhatsNewModal from "./WhatsNewModal";

export default function PostLoginExperience({ children }) {
  const [showHologram, setShowHologram] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();
        setVersionInfo(data);

        const lastSeenVersion = localStorage.getItem("lastSeenVersion");
        const alwaysShowGreeting =
          localStorage.getItem("alwaysShowGreeting") === "true";
        const alreadyShownThisSession =
          sessionStorage.getItem("postLoginShown") === "true";

        if (!alreadyShownThisSession) {
          if (data.version !== lastSeenVersion) {
            // 👆 New version → run full flow
            setShowHologram(true);
          } else if (alwaysShowGreeting) {
            // 👆 User preference → show hologram every login
            setShowHologram(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch version.json", err);
      }
    };

    fetchVersion();
  }, []);

  const handleHologramClose = () => {
    setShowHologram(false);

    // If it was a new version, chain into WhatsNew
    const lastSeenVersion = localStorage.getItem("lastSeenVersion");
    if (versionInfo?.version && versionInfo.version !== lastSeenVersion) {
      setShowWhatsNew(true);
    } else {
      sessionStorage.setItem("postLoginShown", "true");
    }
  };

  const handleWhatsNewClose = () => {
    setShowWhatsNew(false);
    if (versionInfo?.version) {
      localStorage.setItem("lastSeenVersion", versionInfo.version);
    }
    sessionStorage.setItem("postLoginShown", "true");
  };

  return (
    <>
      {showHologram && (
        <HologramWelcome
          version={versionInfo?.version}
          onClose={handleHologramClose}
        />
      )}
      {showWhatsNew && (
        <WhatsNewModal versionInfo={versionInfo} onClose={handleWhatsNewClose} />
      )}
      {!showHologram && !showWhatsNew && children}
    </>
  );
}
