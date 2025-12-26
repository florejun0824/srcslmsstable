// src/components/common/SchoolBrandingHandler.jsx
import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// 🏫 SHARED SCHOOL CONFIGURATION
// You can move this to a constants file later if you want
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
        // 1. Determine which branding to use
        // If logged in, use school branding. If not, fallback to Generic/Default.
        const schoolId = userProfile?.schoolId || 'default';
        const brand = SCHOOL_BRANDING[schoolId] || { name: 'LMS Portal', logo: '/logo.png' };

        // 2. Update the Document Title (Browser Tab Name)
        document.title = brand.name;

        // 3. Update the Favicon (Browser Tab Icon)
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

    }, [userProfile?.schoolId]); // Re-run whenever the user (or school) changes

    return null; // This component doesn't render anything visible
};

export default SchoolBrandingHandler;