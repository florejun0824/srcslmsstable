import React, { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock } from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

const DashboardHeader = ({ userProfile, showToast, onOpenScheduleModal }) => {
    const { 
        bannerSettings, 
        isSpecialBannerActive, 
        isBannerEditModalOpen, 
        openBannerEditModal, 
        closeBannerEditModal 
    } = useBanner(showToast);
    
    const { currentActivity } = useSchedule(showToast);

    const handleBannerClick = () => {
        if (userProfile?.role === 'admin') {
            openBannerEditModal();
        }
    };

    const fadeProps = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, ease: "easeInOut" }
    };

    return (
        <>
            <motion.header
                {...fadeProps}
                // --- MODIFIED: bg-base, shadow-neumorphic ---
                className="relative p-4 md:p-6 bg-base rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark overflow-hidden"
            >
                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full items-center">
                        <div className="col-span-1 text-center md:text-left">
                             {/* --- MODIFIED: text-primary, text-secondary --- */}
                             <h1 className="text-2xl sm:text-3xl font-bold text-primary leading-tight">
                                Welcome, {userProfile?.firstName}!
                            </h1>
                            <p className="text-sm text-secondary mt-1">Here's your dashboard at a glance.</p>
                        </div>
                         <div
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                            onClick={handleBannerClick}
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            {/* --- MODIFIED: bg-base, shadow-neumorphic-inset --- */}
                            <div className="bg-base shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark rounded-3xl p-2 transition-shadow hover:shadow-none">
                                <motion.img
                                    src={bannerSettings.imageUrl}
                                    alt="Promotional Banner"
                                    className="block h-24 md:h-36 w-auto object-contain rounded-2xl"
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png'; }}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 120, damping: 15 }}
                                />
                            </div>
                        </div>
                        {/* --- THIS BLOCK IS NOW HIDDEN ON MOBILE --- */}
                        <div 
                            className="hidden md:flex col-span-1 items-center justify-center h-full"
                            onClick={onOpenScheduleModal}
                        >
                            {/* --- MODIFIED: bg-base, text-primary, shadow-neumorphic-inset --- */}
                            <div className="bg-base text-primary rounded-2xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark w-full h-full p-4 flex flex-col justify-between cursor-pointer transition-shadow duration-300 hover:shadow-none">
                                {/* --- MODIFIED: text-brand-text --- */}
                                <p className="font-bold text-brand-text flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5" />
                                    <span className="text-lg">Today's Schedule</span>
                                </p>
                                
                                <div className="flex-grow flex items-center justify-center text-center min-h-[60px]">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <motion.div
                                                key={currentActivity.id}
                                                className="flex flex-col items-center justify-center"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {/* --- MODIFIED: text-primary, text-secondary --- */}
                                                <span className="font-bold text-xl text-primary leading-tight block">{currentActivity.title}</span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <span className="flex items-center text-md justify-center mt-1 text-secondary font-light">
                                                        <Clock className="w-4 h-4 mr-2 opacity-70" /> {currentActivity.time}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="no-activities" className="text-center" {...fadeProps}>
                                               {/* --- MODIFIED: text-secondary, text-subtle --- */}
                                               <p className="text-lg font-semibold text-secondary">All Clear!</p>
                                               <p className="text-sm text-subtle">No more activities today.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {/* --- MODIFIED: text-secondary, border-border --- */}
                                <p className="text-xs text-center pt-2 text-secondary border-t border-border">Stay on top of your day!</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full py-4">
                        <div className="flex-1 text-center md:text-left">
                            {/* --- MODIFIED: text-primary, text-secondary --- */}
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary leading-tight">
                                 Welcome, {userProfile?.firstName}!
                            </h1>
                            <p className="text-base md:text-lg text-secondary mt-2">Here's your dashboard at a glance.</p>
                        </div>
                        {/* --- THIS BLOCK IS NOW HIDDEN ON MOBILE --- */}
                        <div 
                            // --- MODIFIED: bg-base, text-primary, shadow-neumorphic-inset ---
                            className="hidden md:flex mt-6 md:mt-0 md:ml-6 p-4 bg-base text-primary rounded-2xl shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark w-full max-w-sm flex-shrink-0 flex flex-col justify-between cursor-pointer transition-shadow duration-300 hover:shadow-none"
                            onClick={onOpenScheduleModal}
                        >
                            {/* --- MODIFIED: text-brand-text --- */}
                            <p className="font-bold text-brand-text flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                <span className="text-lg">Today's Schedule</span>
                            </p>
                            <div className="flex-grow flex items-center justify-center text-center py-4 min-h-[60px]">
                                <AnimatePresence mode="wait">
                                    {currentActivity ? (
                                        <motion.div key={currentActivity.id} className="flex flex-col items-center justify-center" {...fadeProps}>
                                            {/* --- MODIFIED: text-primary, text-secondary --- */}
                                            <span className="font-bold text-2xl text-primary leading-tight block">{currentActivity.title}</span>
                                            {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                <span className="flex items-center text-xl justify-center mt-1 text-secondary font-light">
                                                    <Clock className="w-4 h-4 mr-2 opacity-70" /> {currentActivity.time}
                                                </span>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div key="no-activities" className="text-center" {...fadeProps}>
                                           {/* --- MODIFIED: text-secondary, text-subtle --- */}
                                           <p className="text-lg font-semibold text-secondary">All Clear!</p>
                                           <p className="text-sm text-subtle">No more activities today.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            {/* --- MODIFIED: text-secondary, border-border --- */}
                            <p className="text-xs text-center pt-2 text-secondary border-t border-border">Stay on top of your day!</p>
                        </div>
                    </div>
                )}
            </motion.header>

            {/* --- MODIFIED: text-primary --- */}
            <Suspense fallback={<div className="text-primary">Loading Editor...</div>}>
                {isBannerEditModalOpen && (
                    <AdminBannerEditModal
                        isOpen={isBannerEditModalOpen}
                        onClose={closeBannerEditModal}
                        currentImageUrl={bannerSettings.imageUrl}
                        currentEndDate={bannerSettings.endDate}
                        onSaveSuccess={() => { /* onSnapshot will handle re-fetch automatically */ }}
                    />
                )}
            </Suspense>
        </>
    );
};

export default DashboardHeader;