import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Dialog } from '@headlessui/react';

const AppIcon = registerPlugin('SchoolIcon');

const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS Learning Management System', logo: '/logo.png', alias: 'MainActivitySRCS' },
    'hras_sipalay': { name: 'HRA Learning Management System', logo: '/logos/hra.png', alias: 'MainActivityHRA' },
    'kcc_kabankalan': { name: 'KCC Learning Management System', logo: '/logos/kcc.png', alias: 'MainActivityKCC' },
    'icad_dancalan': { name: 'ICA Learning Management System', logo: '/logos/ica.png', alias: 'MainActivityICA' },
    'mchs_magballo': { name: 'MCHS Learning Management System', logo: '/logos/mchs.png', alias: 'MainActivityMCHS' },
    'ichs_ilog': { name: 'ICHS Learning Management System', logo: '/logos/ichs.png', alias: 'MainActivityICHS' }
};

// [FIX] Added 'shouldCheck' prop
const SchoolBrandingHandler = ({ shouldCheck }) => {
    const { userProfile } = useAuth();
    
    // UI States
    const [targetBrand, setTargetBrand] = useState(null);
    const [showInfoDialog, setShowInfoDialog] = useState(false);
    const [showRestartDialog, setShowRestartDialog] = useState(false);

    useEffect(() => {
        // [CRITICAL GATEKEEPER]
        // If shouldCheck is false, we STOP here. We don't even look at the icon.
        if (!userProfile?.schoolId || !shouldCheck) return;

        checkBranding();
        
    }, [userProfile?.schoolId, shouldCheck]); // Runs only when 'shouldCheck' flips to TRUE

    const checkBranding = () => {
        const schoolId = userProfile.schoolId;
        const brand = SCHOOL_BRANDING[schoolId] || SCHOOL_BRANDING['srcs_main'];

        // Web Updates
        document.title = brand.name;
        const link = document.querySelector("link[rel~='icon']");
        if (link) link.href = brand.logo;

        // Native Check
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            const currentStoredAlias = localStorage.getItem('active_app_icon_alias') || 'MainActivitySRCS';
            
            if (brand.alias !== currentStoredAlias) {
                setTargetBrand(brand);
                setShowInfoDialog(true);
            }
        }
    };

    const handleStartUpdate = async () => {
        setShowInfoDialog(false);
        if (!targetBrand) return;

        try {
            // 1. Update Storage
            localStorage.setItem('active_app_icon_alias', targetBrand.alias);
            
            // 2. Run Background Update (Silent)
            await AppIcon.change({ name: targetBrand.alias });
            
            // 3. Show Success
            setShowRestartDialog(true);

        } catch (error) {
            console.error("Failed to update icon:", error);
            const previousAlias = SCHOOL_BRANDING[userProfile?.schoolId || 'srcs_main'].alias;
            localStorage.setItem('active_app_icon_alias', previousAlias);
        }
    };

    const handleForceClose = async () => {
        await AppIcon.killApp();
    };

    // --- DIALOG 1: Update Confirmation ---
    if (showInfoDialog && targetBrand) {
        return (
            <Dialog open={true} onClose={() => {}} className="relative z-[9999]">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[32px] p-8 shadow-2xl border border-white/10 text-center animate-in zoom-in-95">
                        <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Update School Theme
                        </Dialog.Title>
                        <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                            We need to update the app icon and colors for <strong>{targetBrand.name}</strong>.
                        </p>
                        <button 
                            onClick={handleStartUpdate}
                            className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                        >
                            OK, Update Now
                        </button>
                    </Dialog.Panel>
                </div>
            </Dialog>
        );
    }

    // --- DIALOG 2: Restart Required ---
    if (showRestartDialog) {
        return (
            <Dialog open={true} onClose={() => {}} className="relative z-[9999]">
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[32px] p-8 shadow-2xl border border-white/10 text-center animate-in zoom-in-95">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-5">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            Update Complete
                        </Dialog.Title>
                        <p className="text-slate-600 dark:text-slate-300 mb-8 text-sm">
                            Please close and reopen the app to apply the changes.
                        </p>
                        <button 
                            onClick={handleForceClose}
                            className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl active:scale-95 transition-transform"
                        >
                            Close App
                        </button>
                    </Dialog.Panel>
                </div>
            </Dialog>
        );
    }

    return null;
};

export default SchoolBrandingHandler;