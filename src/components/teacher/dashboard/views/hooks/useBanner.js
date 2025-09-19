import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../../../services/firebase'; // Adjust path if needed
import { doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_BANNER_IMAGE = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png';

export const useBanner = (showToast) => {
    const [bannerSettings, setBannerSettings] = useState({
        imageUrl: DEFAULT_BANNER_IMAGE,
        endDate: null,
    });

    // State to manage the visibility of the edit modal
    const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);

    // Real-time listener for banner settings from Firestore
    useEffect(() => {
        const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
        
        const unsubscribe = onSnapshot(bannerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setBannerSettings(docSnap.data());
            } else {
                // If the document doesn't exist in Firestore, revert to defaults
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

        return () => unsubscribe();
    }, [showToast]); // This effect should only run once

    // Memoized value to determine if the special banner should be displayed
    const isSpecialBannerActive = useMemo(() => {
        if (!bannerSettings.imageUrl) {
            return false;
        }
        // If there's no end date, the banner is always active
        if (!bannerSettings.endDate) {
            return true;
        }
        // If there is an end date, check if it's in the future
        const now = new Date();
        const endDate = bannerSettings.endDate.toDate ? bannerSettings.endDate.toDate() : new Date(bannerSettings.endDate);
        return endDate > now;
    }, [bannerSettings]);

    // Handlers to control the modal, wrapped in useCallback for stability
    const openBannerEditModal = useCallback(() => {
        setIsBannerEditModalOpen(true);
    }, []);

    const closeBannerEditModal = useCallback(() => {
        setIsBannerEditModalOpen(false);
    }, []);


    // The hook now returns the modal state and handlers as well
    return {
        bannerSettings,
        isSpecialBannerActive,
        isBannerEditModalOpen,
        openBannerEditModal,
        closeBannerEditModal,
    };
};