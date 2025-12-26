import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { AppIcon } from '@capacitor-community/app-icon';

// 🏫 SHARED SCHOOL CONFIGURATION
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS Learning Management System', logo: '/logo.png' },
    'hras_sipalay': { name: 'HRA Learning Management System', logo: '/logos/hra.png' },
    'kcc_kabankalan': { name: 'KCC Learning Management System', logo: '/logos/kcc.png' },
    'icad_dancalan': { name: 'ICA Learning Management System', logo: '/logos/ica.png' },
    'mchs_magballo': { name: 'MCHS Learning Management System', logo: '/logos/mchs.png' },
    'ichs_ilog': { name: 'ICHS Learning Management System', logo: '/logos/ichs.png' }
};

const SchoolBrandingHandler = () => {
    const { userProfile } = useAuth();

    useEffect(() => {
        const schoolId = userProfile?.schoolId || 'default';
        const brand = SCHOOL_BRANDING[schoolId] || { name: 'LMS Portal', logo: '/logo.png' };

        // 1. Update the Document Title (Browser Tab Name)
        document.title = brand.name;

        // 2. Update the Favicon (Browser Tab Icon)
        const link = document.querySelector("link[rel~='icon']");
        if (link) {
            link.href = brand.logo;
        } else {
            // Create if it doesn't exist
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = brand.logo;
            document.head.appendChild(newLink);
        }

        // 3. Update Native App Icon (Android Only)
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && userProfile?.schoolId) {
            const changeNativeIcon = async () => {
                let targetAlias = 'MainActivitySRCS'; // Default

                switch (userProfile.schoolId) {
                    case 'kcc_kabankalan': targetAlias = 'MainActivityKCC'; break;
                    case 'hras_sipalay': targetAlias = 'MainActivityHRA'; break;
                    case 'icad_dancalan': targetAlias = 'MainActivityICA'; break;
                    case 'mchs_magballo': targetAlias = 'MainActivityMCHS'; break;
                    case 'ichs_ilog': targetAlias = 'MainActivityICHS'; break;
                    default: targetAlias = 'MainActivitySRCS'; break;
                }

                try {
                    const isSupported = await AppIcon.isSupported();
                    if (isSupported.value) {
                        // This will enable the target alias and disable the others
                        await AppIcon.change({ name: targetAlias });
                    }
                } catch (error) {
                    console.error("Failed to update native app icon:", error);
                }
            };

            changeNativeIcon();
        }

    }, [userProfile?.schoolId]); 

    return null; 
};

export default SchoolBrandingHandler;