// src/components/teacher/dashboard/components/DashboardHeader.jsx
import React, { lazy, Suspense, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, ChevronRight } from 'lucide-react';

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
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    };

    return (
        <>
            <motion.header
                {...fadeProps}
                className="relative p-6 md:p-8 glass-panel rounded-[3rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden font-sans border border-white/60 dark:border-white/10 transform-gpu"
            >
                {/* --- OPTIMIZED: macOS 26 "Aurora" Ambient Background --- */}
                {/* Reduced blur from 80px to 60px/40px and added transform-gpu to prevent repaint cycles */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-multiply dark:mix-blend-soft-light will-change-transform transform-gpu" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-[60px] pointer-events-none mix-blend-multiply dark:mix-blend-soft-light will-change-transform transform-gpu" />
                
                {/* Inner Shine for Glass Effect */}
                <div className="absolute inset-0 rounded-[3rem] shadow-[inset_0_0_40px_rgba(255,255,255,0.3)] dark:shadow-none pointer-events-none" />

                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full items-center relative z-10">
                        
                        {/* 1. Welcome Text */}
                        <div className="col-span-1 text-center md:text-left space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/10 backdrop-blur-sm shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    Dashboard
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                Good Morning, <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400">
                                    {userProfile?.firstName}
                                </span>
                            </h1>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed tracking-wide max-w-xs mx-auto md:mx-0">
                                Here is today's overview. You have complete control over your classes.
                            </p>
                        </div>

                         {/* 2. Center Banner Image (Squircle Frame) */}
                         <div
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                            onClick={handleBannerClick}
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <motion.div 
                                whileHover={userProfile?.role === 'admin' ? { scale: 1.03 } : {}}
                                className="relative group w-full max-w-xs aspect-[3/2]"
                            >
                                <div className="absolute inset-0 bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-lg transform rotate-3 transition-transform group-hover:rotate-6 duration-500" />
                                <motion.div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/60 dark:border-white/10 rounded-[2.5rem] p-2 shadow-xl overflow-hidden">
                                    <motion.img
                                        src={bannerSettings.imageUrl}
                                        alt="Promotional Banner"
                                        className="w-full h-full object-cover rounded-[2rem] shadow-inner"
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png'; }}
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    />
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* 3. Schedule Widget (Glass Tile) */}
                        <div 
                            className="hidden md:flex col-span-1 items-center justify-center h-full"
                            onClick={onOpenScheduleModal}
                        >
                            <motion.div 
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative overflow-hidden bg-gradient-to-br from-white/60 to-white/20 dark:from-slate-800/60 dark:to-slate-800/20 backdrop-blur-lg text-slate-800 dark:text-slate-100 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-xl w-full h-full min-h-[180px] p-6 flex flex-col justify-between cursor-pointer group"
                            >
                                {/* Widget Header */}
                                <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center text-white">
                                        <CalendarDays className="w-5 h-5" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/30 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                </div>
                                
                                {/* Widget Content */}
                                <div className="flex-grow flex items-center justify-center text-center pt-2">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <motion.div
                                                key={currentActivity.id}
                                                className="flex flex-col items-center justify-center w-full"
                                                initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                                exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <span className="font-black text-xl text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
                                                        <Clock className="w-3 h-3" /> 
                                                        {currentActivity.time}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div key="no-activities" className="text-center" {...fadeProps}>
                                               <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">All Clear</p>
                                               <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 tracking-wide uppercase">No events scheduled</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-blue-500 w-2/3 rounded-full" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    // Standard Layout (No Banner)
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full py-2 relative z-10">
                        <div className="flex-1 text-center md:text-left">
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/40 dark:bg-white/10 border border-white/50 dark:border-white/10 backdrop-blur-sm shadow-sm mb-4">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    Instructor Portal
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-4">
                                 Welcome, {userProfile?.firstName}!
                            </h1>
                            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-xl tracking-wide leading-relaxed">
                                Ready to shape young minds today? Here's your dashboard at a glance.
                            </p>
                        </div>

                        {/* Schedule Widget (Standard Layout) */}
                        <div 
                            className="hidden md:flex mt-6 md:mt-0 md:ml-8 relative overflow-hidden bg-gradient-to-br from-white/60 to-white/20 dark:from-slate-800/60 dark:to-slate-800/20 backdrop-blur-lg text-slate-800 dark:text-slate-100 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-xl w-full max-w-sm flex-shrink-0 flex-col justify-between cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                            onClick={onOpenScheduleModal}
                        >
                            <div className="p-6 flex items-center gap-4 border-b border-slate-100/50 dark:border-white/5">
                                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center text-white flex-shrink-0">
                                    <CalendarDays className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Today's Schedule</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Check your upcoming classes</p>
                                </div>
                            </div>

                            <div className="flex-grow flex items-center justify-center text-center py-8 min-h-[100px] bg-white/30 dark:bg-black/5">
                                <AnimatePresence mode="wait">
                                    {currentActivity ? (
                                        <motion.div 
                                            key={currentActivity.id} 
                                            className="flex flex-col items-center justify-center px-4"
                                            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                                        >
                                            <span className="font-black text-2xl text-slate-900 dark:text-white leading-none mb-3 tracking-tight">
                                                {currentActivity.title}
                                            </span>
                                            {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                <span className="flex items-center text-sm font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-white/5 px-4 py-2 rounded-full border border-white/50 dark:border-white/10 tracking-wide shadow-sm">
                                                    <Clock className="w-4 h-4 mr-2 opacity-80 text-blue-500" /> {currentActivity.time}
                                                </span>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div key="no-activities" className="text-center" {...fadeProps}>
                                           <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">All Clear!</p>
                                           <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 tracking-wide">No more activities today.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}
            </motion.header>

            <Suspense fallback={
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/20 backdrop-blur-sm">
                    <div className="glass-panel px-6 py-3 rounded-full text-sm font-bold">Loading Editor...</div>
                </div>
            }>
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

export default memo(DashboardHeader);