import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import AntiCheatPlugin from '../plugins/AntiCheatPlugin'; // Adjust path if needed

/**
 * A custom hook to encapsulate all anti-cheat logic for the quiz.
 * @param {object} params
// ... (rest of JSDoc comments remain the same)
 */
export default function useQuizAntiCheat({
    isOpen,
    isTeacherView,
    quizSettings,
    isLocked,
    score,
    hasSubmitted,
    isInfractionActive,
    setIsInfractionActive,
    issueWarning,
    showToast
}) {

    // --- ⬇⬇⬇ START OF FIX ⬇⬇⬇ ---

    // 1. Determine if anti-cheat is globally enabled for this quiz.
    const isAntiCheatEnabled = quizSettings?.enabled ?? false;

    // 2. Gate ALL feature flags by this main setting.
    // If isAntiCheatEnabled is false, all these consts will also be false.
    const lockOnLeave = isAntiCheatEnabled && (quizSettings?.lockOnLeave ?? false);
    const preventScreenCapture = isAntiCheatEnabled && (quizSettings?.preventScreenCapture ?? false);
    const warnOnPaste = isAntiCheatEnabled && (quizSettings?.warnOnPaste ?? false);
    const detectDevTools = isAntiCheatEnabled && (quizSettings?.detectDevTools ?? false);

    // --- ⬆⬆⬆ END OF FIX ⬆⬆⬆ ---

    // 🟢 NEW: Native Plugin Enable/Disable Control (Fixes the recurring toast)
    useEffect(() => {
        // Only run on native Android/iOS and when not in teacher view
        if (!Capacitor.isNativePlatform() || isTeacherView) return;

        const toggleNativeAntiCheat = async () => {
            
            // --- ⬇⬇⬇ MODIFIED LINE ⬇⬇⬇ ---
            // 3. This check must also respect the global flag.
            const shouldBeActive = isOpen && !isLocked && score === null && !hasSubmitted && isAntiCheatEnabled;
            // --- ⬆⬆⬆ MODIFIED LINE ⬆⬆⬆ ---
            
            try {
                if (shouldBeActive) {
                    // This calls the enableAntiCheat method added to your AntiCheatPlugin.java
                    await AntiCheatPlugin.enableAntiCheat();
                    console.log("Native AntiCheat: ENABLED");
                } else {
                    // This calls the disableAntiCheat method added to your AntiCheatPlugin.java
                    await AntiCheatPlugin.disableAntiCheat();
                    console.log("Native AntiCheat: DISABLED");
                }
            } catch (e) {
                // Ignore if the plugin is not found or not built correctly
                console.error("Failed to toggle native anti-cheat plugin:", e);
            }
        };

        toggleNativeAntiCheat();

        // Cleanup: Ensure it is disabled when the component unmounts
        return () => {
            if (Capacitor.isNativePlatform() && !isTeacherView) {
                AntiCheatPlugin.disableAntiCheat().catch(e => console.error("Error disabling native anti-cheat on unmount", e));
            }
        };
    // --- ⬇⬇⬇ MODIFIED DEPENDENCY ⬇⬇⬇ ---
    }, [isOpen, isTeacherView, isLocked, score, hasSubmitted, isAntiCheatEnabled]); // 4. Add isAntiCheatEnabled
    // --- ⬆⬆⬆ MODIFIED DEPENDENCY ⬆⬆⬆ ---
    // -----------------------------------------------------------------------

    // App State Change Listener (Native)
    useEffect(() => {
        let listener;
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        if (isOpen && Capacitor.isNativePlatform() && !isTeacherView && lockOnLeave && !isLocked && !hasSubmitted) {
// ... (rest of App State Change Listener remains the same)
            listener = App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive) {
                    setIsInfractionActive(true);
                    issueWarning('general');
                } else {
                    setIsInfractionActive(false);
                }
            });
        }
        return () => { listener?.remove(); };
    }, [isOpen, issueWarning, isTeacherView, lockOnLeave, isLocked, hasSubmitted, setIsInfractionActive]);

    // Unified Anti-Cheat (Plugin, AppState, Native Bridge Fallback)
    useEffect(() => {
// ... (rest of Unified Anti-Cheat remains the same)
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        if (!Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave;

        const leaveListener = AntiCheatPlugin.addListener("userLeftHint", () => { if (canWarn()) { console.log("Plugin: userLeftHint"); issueWarning('general'); } });
        const pauseListener = AntiCheatPlugin.addListener("appPaused", () => { if (canWarn()) { console.log("Plugin: appPaused"); issueWarning('general'); } });
        const resumeListener = AntiCheatPlugin.addListener("appResumed", () => { console.log("Plugin: appResumed"); setIsInfractionActive(false); });

        const appListener = App.addListener("appStateChange", ({ isActive }) => {
            if (!isActive && canWarn()) { console.log("App Listener: Inactive"); issueWarning('general'); setIsInfractionActive(true); }
            else if (isActive) { setIsInfractionActive(false); }
        });

        const handleNativeFocusChange = (event) => {
            const data = event.detail || event.data || "";
            if (typeof data === "string" && data.includes('"hasFocus": false') && canWarn()) {
                console.log("Native Bridge: hasFocus false");
                issueWarning('general');
                setIsInfractionActive(true);
            } else if (typeof data === "string" && data.includes('"hasFocus": true')) {
                setIsInfractionActive(false);
            }
        };

        const handleNativeUserLeft = (event) => {
            const data = event.detail || event.data || "";
            if (typeof data === "string" && data.includes('"reason": "userLeftHint"') && canWarn()) {
                console.log("Native Bridge: userLeftHint");
                issueWarning('general');
                setIsInfractionActive(true);
            }
        }

        window.addEventListener("windowFocusChanged", handleNativeFocusChange);
        window.addEventListener("userLeftHint", handleNativeUserLeft);

        return () => {
            leaveListener.remove();
            pauseListener.remove();
            resumeListener.remove();
            appListener.remove();
            window.removeEventListener("windowFocusChanged", handleNativeFocusChange);
            window.removeEventListener("userLeftHint", handleNativeUserLeft);
        };
    }, [isOpen, lockOnLeave, isLocked, score, issueWarning, isTeacherView, hasSubmitted, setIsInfractionActive]);

    // Strict Overlay Detection (Native Bridge)
    useEffect(() => {
// ... (rest of Strict Overlay Detection remains the same)
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        if (!Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave;
        const handleOverlayDetected = (event) => { if (canWarn()) { console.log("Native Bridge: overlayDetected"); issueWarning('general'); setIsInfractionActive(true); } };
        
        window.addEventListener("overlayDetected", handleOverlayDetected);
        return () => { window.removeEventListener("overlayDetected", handleOverlayDetected); };
    }, [isOpen, lockOnLeave, isLocked, score, issueWarning, isTeacherView, hasSubmitted, setIsInfractionActive]);

    // Web Blur/Focus Listeners
    useEffect(() => {
// ... (rest of Web Blur/Focus Listeners remains the same)
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        if (Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave;
        const handleFocusLoss = () => { if (canWarn()) { console.log("Web: blur"); issueWarning('general'); setIsInfractionActive(true); } };
        const handleFocusGain = () => { setIsInfractionActive(false); };

        window.addEventListener('blur', handleFocusLoss);
        window.addEventListener('focus', handleFocusGain);
        
        return () => {
            window.removeEventListener('blur', handleFocusLoss);
            window.removeEventListener('focus', handleFocusGain);
        };
    }, [isOpen, isLocked, score, issueWarning, isTeacherView, lockOnLeave, hasSubmitted, setIsInfractionActive]);

    // Visibility Change Listener (Web/Mobile Web)
    useEffect(() => {
// ... (rest of Visibility Change Listener remains the same)
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        if (Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave;
        const handleVisibilityChange = () => {
            if (document.hidden && canWarn()) { console.log("Web: visibilitychange hidden"); issueWarning('general'); setIsInfractionActive(true); }
            else if (!document.hidden) { setIsInfractionActive(false); }
        };
        
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); };
    }, [isOpen, isLocked, score, issueWarning, isTeacherView, lockOnLeave, hasSubmitted, setIsInfractionActive]);

    // Continuous Warning Timer (When Infraction Active)
    useEffect(() => {
// ... (rest of Continuous Warning Timer remains the same)
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        let warningInterval = null;
        const canIssueWarning = isOpen && !isTeacherView && !isLocked && !hasSubmitted && lockOnLeave;
        
        if (isInfractionActive && canIssueWarning) {
            console.log("Starting continuous warning interval...");
            warningInterval = setInterval(() => {
                console.log("Continuous warning timer fired...");
                issueWarning('general');
            }, 7000);
        } else {
            if (warningInterval) console.log("Clearing continuous warning interval.");
        }
        
        return () => { if (warningInterval) clearInterval(warningInterval); };
    }, [isInfractionActive, isOpen, isTeacherView, isLocked, score, hasSubmitted, lockOnLeave, issueWarning]);

    // Before Unload Listener (Web)
    useEffect(() => {
// ... (rest of Before Unload Listener remains the same)
        // This hook is now correct because `lockOnLeave` will be false if `isAntiCheatEnabled` is false.
        if (Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const handleBeforeUnload = (event) => {
            if (isOpen && !isLocked && score === null && !hasSubmitted && lockOnLeave) {
                issueWarning('general');
                event.preventDefault();
                event.returnValue = 'Leaving the quiz will result in a warning and may lock your quiz. Are you sure?';
                return event.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isOpen, isLocked, score, issueWarning, isTeacherView, lockOnLeave, hasSubmitted]);

    // Privacy Screen
    useEffect(() => {
// ... (rest of Privacy Screen remains the same)
        // This hook is now correct because `preventScreenCapture` will be false if `isAntiCheatEnabled` is false.
        const setPrivacyScreen = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    if (isOpen && preventScreenCapture && !isTeacherView && !hasSubmitted) {
                        await PrivacyScreen.enable();
                        console.log("Privacy screen enabled.");
                    } else {
                        await PrivacyScreen.disable();
                        console.log("Privacy screen disabled.");
                    }
                } catch (e) { console.error("Error toggling privacy screen", e); }
            }
        };
        
        setPrivacyScreen();
        
        return () => {
            if (Capacitor.isNativePlatform()) {
                PrivacyScreen.disable().catch(e => console.error("Error disabling privacy screen on unmount", e));
            }
        };
    }, [isOpen, preventScreenCapture, isTeacherView, hasSubmitted]);

    // Clipboard/DevTools Listeners
    useEffect(() => {
// ... (rest of Clipboard/DevTools Listeners remains the same)
        // This hook is now correct because `warnOnPaste` and `detectDevTools` will be false if `isAntiCheatEnabled` is false.
        if (isTeacherView || !isOpen || score !== null || isLocked || hasSubmitted) return;

        const handleClipboardAction = (e) => {
            e.preventDefault();
            if (e.type === 'paste' && warnOnPaste) {
                showToast("Pasting is disabled during the quiz.", "warning");
                issueWarning('paste');
            } else if (e.type === 'copy' || e.type === 'cut') {
                showToast("Copying/Cutting is disabled during the quiz.", "warning");
            }
        };

        let intervalId = null;
        const isMobile = Capacitor.isNativePlatform() || /Mobi|Android/i.test(navigator.userAgent);
        
        if (!isMobile && detectDevTools) {
            const devToolsCheck = () => {
                const widthThreshold = window.outerWidth - window.innerWidth > 160;
                const heightThreshold = window.outerHeight - window.innerHeight > 160;
                if ((widthThreshold || heightThreshold) && !isLocked && score === null && !hasSubmitted) {
                    issueWarning('devTools');
                }
            };
            intervalId = setInterval(devToolsCheck, 1500);
        }

        const quizPanel = document.querySelector('.quiz-container');
        if (quizPanel) {
            quizPanel.addEventListener('copy', handleClipboardAction);
            quizPanel.addEventListener('paste', handleClipboardAction);
            quizPanel.addEventListener('cut', handleClipboardAction);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
            if (quizPanel) {
                quizPanel.removeEventListener('copy', handleClipboardAction);
                quizPanel.removeEventListener('paste', handleClipboardAction);
                quizPanel.removeEventListener('cut', handleClipboardAction);
            }
        };
    }, [isOpen, isTeacherView, score, isLocked, hasSubmitted, issueWarning, showToast, detectDevTools, warnOnPaste]);
}