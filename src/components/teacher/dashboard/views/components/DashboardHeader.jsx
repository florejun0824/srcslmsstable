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
                className="relative p-4 md:p-6 bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-300/25 border border-white/80 overflow-hidden"
            >
                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full items-center">
                        <div className="col-span-1 text-center md:text-left">
                             <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 drop-shadow-sm leading-tight">
                                Welcome, {userProfile?.firstName}!
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">Here's your dashboard at a glance.</p>
                        </div>
                         <div
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                            onClick={handleBannerClick}
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <motion.img
                                src={bannerSettings.imageUrl}
                                alt="Promotional Banner"
                                className="block h-24 md:h-36 w-auto object-contain p-1 drop-shadow-lg"
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png'; }}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                            />
                        </div>
                        <div 
                            className="col-span-1 flex items-center justify-center h-full"
                            onClick={onOpenScheduleModal}
                        >
                            <div className="bg-white/80 text-slate-800 rounded-2xl shadow-md border border-gray-200/50 w-full h-full p-4 flex flex-col justify-between cursor-pointer hover:bg-sky-50 transition-colors duration-200">
                                <p className="font-bold text-sky-700 flex items-center gap-2">
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
                                                <span className="font-bold text-xl text-slate-900 leading-tight block">{currentActivity.title}</span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <span className="flex items-center text-md justify-center mt-1 text-slate-700 font-light">
                                                        <Clock className="w-4 h-4 mr-2 opacity-70" /> {currentActivity.time}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="no-activities" className="text-center" {...fadeProps}>
                                               <p className="text-lg font-semibold text-slate-500">All Clear!</p>
                                               <p className="text-sm text-slate-400">No more activities today.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <p className="text-xs text-center pt-2 opacity-90 border-t border-sky-200/80 text-slate-700">Stay on top of your day!</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // This is the section that was missing the onClick
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full py-4">
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 drop-shadow-sm leading-tight">
                                 Welcome, {userProfile?.firstName}!
                            </h1>
                            <p className="text-base md:text-lg text-slate-600 mt-2">Here's your dashboard at a glance.</p>
                        </div>
                        {/* **THE FIX IS HERE** vvv */}
                        <div 
                            className="mt-6 md:mt-0 md:ml-6 p-4 bg-white/90 text-slate-800 rounded-2xl shadow-lg border border-gray-200/50 w-full max-w-sm flex-shrink-0 flex flex-col justify-between cursor-pointer hover:bg-sky-50 transition-colors duration-200"
                            onClick={onOpenScheduleModal} // Added the onClick handler
                        >
                            <p className="font-bold text-sky-700 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                <span className="text-lg">Today's Schedule</span>
                            </p>
                            <div className="flex-grow flex items-center justify-center text-center py-4 min-h-[60px]">
                                <AnimatePresence mode="wait">
                                    {currentActivity ? (
                                        <motion.div key={currentActivity.id} className="flex flex-col items-center justify-center" {...fadeProps}>
                                            <span className="font-bold text-2xl text-slate-900 leading-tight block">{currentActivity.title}</span>
                                            {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                <span className="flex items-center text-xl justify-center mt-1 text-slate-700 font-light">
                                                    <Clock className="w-4 h-4 mr-2 opacity-70" /> {currentActivity.time}
                                                </span>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div key="no-activities" className="text-center" {...fadeProps}>
                                           <p className="text-lg font-semibold text-slate-500">All Clear!</p>
                                           <p className="text-sm text-slate-400">No more activities today.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <p className="text-xs text-center pt-2 opacity-90 border-t border-sky-200/80 text-slate-700">Stay on top of your day!</p>
                        </div>
                    </div>
                )}
            </motion.header>

            <Suspense fallback={<div>Loading Editor...</div>}>
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