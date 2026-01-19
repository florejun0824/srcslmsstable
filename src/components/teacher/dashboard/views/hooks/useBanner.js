// src/components/teacher/dashboard/hooks/useBanner.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../../../services/firebase'; 
import { doc, onSnapshot } from 'firebase/firestore';

const DEFAULT_BANNER_IMAGE = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png';

export const useBanner = (showToast) => {
    const [bannerSettings, setBannerSettings] = useState({
        // New fields for extended functionality
        type: 'image', // Options: 'image', 'text', 'combined'
        title: '',
        message: '',
        linkUrl: '',
        linkLabel: 'Learn More',
        imageUrl: DEFAULT_BANNER_IMAGE,
        endDate: null,
    });

    const [isBannerEditModalOpen, setIsBannerEditModalOpen] = useState(false);

    useEffect(() => {
        const bannerDocRef = doc(db, "bannerSettings", "mainBanner");
        
        const unsubscribe = onSnapshot(bannerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                // Merge with defaults to ensure new fields exist for old data
                setBannerSettings(prev => ({ ...prev, ...docSnap.data() }));
            } else {
                setBannerSettings({
                    type: 'image',
                    imageUrl: DEFAULT_BANNER_IMAGE,
                    endDate: null,
                    title: '',
                    message: '',
                    linkUrl: '',
                    linkLabel: 'Learn More'
                });
            }
        }, (error) => {
            console.error("Error listening to banner settings:", error);
            if (showToast) {
                showToast("Real-time banner updates failed.", "error");
            }
        });

        return () => unsubscribe();
    }, [showToast]);

    const isSpecialBannerActive = useMemo(() => {
        // 1. Check Expiry
        if (bannerSettings.endDate) {
            const now = new Date();
            const endDate = bannerSettings.endDate.toDate ? bannerSettings.endDate.toDate() : new Date(bannerSettings.endDate);
            if (endDate < now) return false;
        }

        // 2. Check Content Availability based on Type
        const { type, imageUrl, title, message } = bannerSettings;

        if (type === 'text') {
            // Text mode requires at least a title or message
            return !!(title || message);
        }
        
        if (type === 'combined') {
            // Combined mode requires image AND text
            return !!(imageUrl && (title || message));
        }

        // Default 'image' mode requires an image
        return !!imageUrl;
    }, [bannerSettings]);

    const openBannerEditModal = useCallback(() => setIsBannerEditModalOpen(true), []);
    const closeBannerEditModal = useCallback(() => setIsBannerEditModalOpen(false), []);

    return {
        bannerSettings,
        isSpecialBannerActive,
        isBannerEditModalOpen,
        openBannerEditModal,
        closeBannerEditModal,
    };
};