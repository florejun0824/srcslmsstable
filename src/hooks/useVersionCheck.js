import { useEffect, useState } from "react";

// Store the version the app booted with
let initialVersion = null;

export function useVersionCheck(interval = 60000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        const data = await res.json();

        if (!initialVersion) {
          // First time we load → remember it
          initialVersion = data.version;
        } else if (data.version !== initialVersion) {
          // If it changes later → show update banner
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error("Version check failed:", err);
      }
    };

    checkVersion(); // initial load
    const id = setInterval(checkVersion, interval);

    return () => clearInterval(id);
  }, [interval]);

  return updateAvailable;
}
