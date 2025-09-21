import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../../../services/firebase'; // Adjust path if needed
import { doc, onSnapshot } from 'firebase/firestore';

// A default banner image, often used as a fallback.
const DEFAULT_BANNER_IMAGE = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png';

/**
 * Custom hook to manage the application's main banner settings.
 * This hook listens to real-time changes in Firestore and provides
 * the necessary data and controls for displaying and editing the banner.
 *
 * While this hook itself doesn't render UI, the data it provides is
 * intended to be used within neumorphic components. For example, the banner
 * image could be displayed within a container with a `shadow-neumorphic` class.
 *
 * @param {function} showToast - A function to display toast notifications.
 * @returns {object} An object containing banner settings, activity status,
 * and handlers for the edit modal.
 */
export const useBanner = (showToast) => {
    const [bannerSettings, setBannerSettings] = useState({
        imageUrl: DEFAULT_BANNER_IMAGE,
        endDate: null,
    });

    // State to manage the visibility of the BannerEditModal.
    // A neumorphic button would call `openBannerEditModal` to show it.
    const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);

    // Sets up a real-time listener for banner settings from Firestore.
    useEffect(() => {
        const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
        
        const unsubscribe = onSnapshot(bannerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setBannerSettings(docSnap.data());
            } else {
                // Revert to default settings if the document is not found.
                setBannerSettings({
                    imageUrl: DEFAULT_BANNER_IMAGE,
                    endDate: null
                });
            }
        }, (error) => {
            console.error("Error listening to banner settings:", error);
            if (showToast) {
                showToast("Real-time banner updates failed.", "error");
            }
        });

        // Cleanup the listener on component unmount.
        return () => unsubscribe();
    }, [showToast]);

    // Memoized value to determine if the banner is currently active.
    const isSpecialBannerActive = useMemo(() => {
        if (!bannerSettings.imageUrl) {
            return false;
        }
        // If no end date is set, the banner is considered permanently active.
        if (!bannerSettings.endDate) {
            return true;
        }
        // Check if the end date is in the future.
        const now = new Date();
        const endDate = bannerSettings.endDate.toDate ? bannerSettings.endDate.toDate() : new Date(bannerSettings.endDate);
        return endDate > now;
    }, [bannerSettings]);

    // Modal control handlers wrapped in useCallback for performance.
    const openBannerEditModal = useCallback(() => {
        setIsBannerEditModalOpen(true);
    }, []);

    const closeBannerEditModal = useCallback(() => {
        setIsBannerEditModalOpen(false);
    }, []);

    return {
        bannerSettings,
        isSpecialBannerActive,
        isBannerEditModalOpen,
        openBannerEditModal,
        closeBannerEditModal,
    };
};