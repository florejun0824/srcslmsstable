import { useEffect, useRef } from 'react'; // [UPDATED] Added useRef
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import AntiCheatPlugin from '../plugins/AntiCheatPlugin'; 

/**
 * A custom hook to encapsulate all anti-cheat logic for the quiz.
 * Handles Native (Android/iOS) and Web-based detection.
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

    // 1. Determine if anti-cheat is globally enabled for this quiz.
    const isAntiCheatEnabled = quizSettings?.enabled ?? false;

    // 2. Gate ALL feature flags by this main setting.
    const lockOnLeave = isAntiCheatEnabled && (quizSettings?.lockOnLeave ?? false);
    const preventScreenCapture = isAntiCheatEnabled && (quizSettings?.preventScreenCapture ?? false);
    const warnOnPaste = isAntiCheatEnabled && (quizSettings?.warnOnPaste ?? false);
    const detectDevTools = isAntiCheatEnabled && (quizSettings?.detectDevTools ?? false);

    // [NEW] Keep track of the last known native state to prevent spamming the bridge
    const wasActiveRef = useRef(false);

    // 🟢 CRITICAL FIX: Native Plugin Enable/Disable Control
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const toggleNativeAntiCheat = async () => {
            // STRICT SAFETY: The Native Plugin should only be active if:
            // 1. Quiz is open
            // 2. User is NOT a teacher
            // 3. Quiz is not locked/submitted
            // 4. Global AntiCheat setting is ON
            const shouldBeActive = isOpen && !isTeacherView && !isLocked && score === null && !hasSubmitted && isAntiCheatEnabled;
            
            try {
                if (shouldBeActive) {
                    // Only enable if we aren't already active (prevents redundant calls)
                    if (!wasActiveRef.current) {
                        await AntiCheatPlugin.enableAntiCheat();
                        console.log("Native AntiCheat: ENABLED");
                        wasActiveRef.current = true;
                    }
                } else {
                    // Force disable. We do this even if we think it's off, just to be safe (syncs Java state).
                    await AntiCheatPlugin.disableAntiCheat();
                    if (wasActiveRef.current) {
                        console.log("Native AntiCheat: DISABLED");
                        wasActiveRef.current = false;
                    }
                }
            } catch (e) {
                console.error("Failed to toggle native anti-cheat plugin:", e);
            }
        };

        toggleNativeAntiCheat();

        // Cleanup: Ensure it is disabled when the component unmounts
        return () => {
            if (Capacitor.isNativePlatform()) {
                AntiCheatPlugin.disableAntiCheat().catch(e => console.error("Error disabling native anti-cheat on unmount", e));
                wasActiveRef.current = false;
            }
        };
    }, [isOpen, isTeacherView, isLocked, score, hasSubmitted, isAntiCheatEnabled]);


    // -----------------------------------------------------------------------
    // The following hooks handle JS-side listeners. 
    // [FIXED] Added "!isTeacherView" to all "canWarn" checks below.
    // -----------------------------------------------------------------------

    // App State Change Listener (Native)
    useEffect(() => {
        let listener;
        // [FIXED] Added check for !isTeacherView
        const shouldWatch = isOpen && Capacitor.isNativePlatform() && !isTeacherView && lockOnLeave && !isLocked && !hasSubmitted;

        if (shouldWatch) {
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
        if (!Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        // [FIXED] Added !isTeacherView to ensure teachers never trigger warnings
        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave && !isTeacherView;

        const leaveListener = AntiCheatPlugin.addListener("userLeftHint", () => { if (canWarn()) { console.log("Plugin: userLeftHint"); issueWarning('general'); } });
        const pauseListener = AntiCheatPlugin.addListener("appPaused", () => { if (canWarn()) { console.log("Plugin: appPaused"); issueWarning('general'); } });
        const resumeListener = AntiCheatPlugin.addListener("appResumed", () => { console.log("Plugin: appResumed"); setIsInfractionActive(false); });

        const appListener = App.addListener("appStateChange", ({ isActive }) => {
            if (!isActive && canWarn()) { console.log("App Listener: Inactive"); issueWarning('general'); setIsInfractionActive(true); }
            else if (isActive) { setIsInfractionActive(false); }
        });

        // Backup Listeners (Bridge)
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
        if (!Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        // [FIXED] Added !isTeacherView
        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave && !isTeacherView;
        
        const handleOverlayDetected = (event) => { 
            if (canWarn()) { 
                console.log("Native Bridge: overlayDetected"); 
                issueWarning('general'); 
                setIsInfractionActive(true); 
            } 
        };
        
        window.addEventListener("overlayDetected", handleOverlayDetected);
        return () => { window.removeEventListener("overlayDetected", handleOverlayDetected); };
    }, [isOpen, lockOnLeave, isLocked, score, issueWarning, isTeacherView, hasSubmitted, setIsInfractionActive]);

    // Web Blur/Focus Listeners
    useEffect(() => {
        if (Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        // [FIXED] Added !isTeacherView
        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave && !isTeacherView;
        
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
        if (Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        // [FIXED] Added !isTeacherView
        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave && !isTeacherView;
        
        const handleVisibilityChange = () => {
            if (document.hidden && canWarn()) { console.log("Web: visibilitychange hidden"); issueWarning('general'); setIsInfractionActive(true); }
            else if (!document.hidden) { setIsInfractionActive(false); }
        };
        
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); };
    }, [isOpen, isLocked, score, issueWarning, isTeacherView, lockOnLeave, hasSubmitted, setIsInfractionActive]);

    // Continuous Warning Timer (When Infraction Active)
    useEffect(() => {
        let warningInterval = null;
        // [FIXED] Added check for !isTeacherView
        const canIssueWarning = isOpen && !isTeacherView && !isLocked && !hasSubmitted && lockOnLeave;
        
        if (isInfractionActive && canIssueWarning) {
            console.log("Starting continuous warning interval...");
            warningInterval = setInterval(() => {
                console.log("Continuous warning timer fired...");
                issueWarning('general');
            }, 7000);
        }
        
        return () => { if (warningInterval) clearInterval(warningInterval); };
    }, [isInfractionActive, isOpen, isTeacherView, isLocked, score, hasSubmitted, lockOnLeave, issueWarning]);

    // Before Unload Listener (Web)
    useEffect(() => {
        if (Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const handleBeforeUnload = (event) => {
            // [FIXED] Added check for !isTeacherView
            if (isOpen && !isLocked && score === null && !hasSubmitted && lockOnLeave && !isTeacherView) {
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
        const setPrivacyScreen = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    // Privacy Screen logic is correct: It must disable itself if isTeacherView is true
                    if (isOpen && preventScreenCapture && !isTeacherView && !hasSubmitted && score === null) {
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
    }, [isOpen, preventScreenCapture, isTeacherView, hasSubmitted, score]);

    // Clipboard/DevTools Listeners
    useEffect(() => {
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