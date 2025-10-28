import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import AntiCheatPlugin from '../plugins/AntiCheatPlugin'; // Adjust path if needed

/**
 * A custom hook to encapsulate all anti-cheat logic for the quiz.
 * @param {object} params
 * @param {boolean} params.isOpen - Whether the quiz modal is open.
 * @param {boolean} params.isTeacherView - Disables anti-cheat for teachers.
 * @param {object} params.quizSettings - The quiz.settings object.
 * @param {boolean} params.isLocked - Whether the quiz is locked.
 * @param {number|null} params.score - The current score (null if in progress).
 * @param {boolean} params.hasSubmitted - Whether the user has submitted this attempt.
 * @param {boolean} params.isInfractionActive - Whether an infraction is currently detected.
 * @param {function} params.setIsInfractionActive - Setter for infraction state.
 * @param {function} params.issueWarning - Function to call to issue a warning.
 * @param {function} params.showToast - Function to show a toast message.
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

    const lockOnLeave = quizSettings?.lockOnLeave ?? false;
    const preventScreenCapture = quizSettings?.preventScreenCapture ?? false;
    const warnOnPaste = quizSettings?.warnOnPaste ?? false;
    const detectDevTools = quizSettings?.detectDevTools ?? false;

    // App State Change Listener (Native)
    useEffect(() => {
        let listener;
        if (isOpen && Capacitor.isNativePlatform() && !isTeacherView && lockOnLeave && !isLocked && !hasSubmitted) {
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
        if (!Capacitor.isNativePlatform() || isTeacherView || !lockOnLeave) return;

        const canWarn = () => isOpen && !isLocked && !hasSubmitted && lockOnLeave;
        const handleOverlayDetected = (event) => { if (canWarn()) { console.log("Native Bridge: overlayDetected"); issueWarning('general'); setIsInfractionActive(true); } };
        
        window.addEventListener("overlayDetected", handleOverlayDetected);
        return () => { window.removeEventListener("overlayDetected", handleOverlayDetected); };
    }, [isOpen, lockOnLeave, isLocked, score, issueWarning, isTeacherView, hasSubmitted, setIsInfractionActive]);

    // Web Blur/Focus Listeners
    useEffect(() => {
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