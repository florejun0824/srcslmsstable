// src/components/teacher/dashboard/components/DashboardHeader.jsx
import React, { lazy, Suspense, memo, useMemo, useCallback } from 'react';
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

    const handleBannerClick = useCallback(() => {
        if (userProfile?.role === 'admin') {
            openBannerEditModal();
        }
    }, [userProfile?.role, openBannerEditModal]);

    const handleImageError = useCallback((e) => {
        e.target.onerror = null; 
        e.target.src = 'https://i.ibb.co/FqJPnT1J/buwan-ng-wika.png'; 
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    return (
        <>
            <header
                className="relative p-6 md:p-8 rounded-[3rem] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden font-sans border border-white/60 dark:border-white/10 isolate transform-gpu bg-white dark:bg-[#1e293b] transition-colors duration-300"
                style={{
                    // Only apply specific gradient variable if special banner active, otherwise let Tailwind handle bg
                    ...( (userProfile?.role === 'admin' || isSpecialBannerActive) 
                        ? { background: 'var(--header-bg-special)' } 
                        : {} 
                    )
                }}
            >
                {/* Background Decoration Pattern */}
                <div className="absolute inset-0 z-[-1] opacity-40 pointer-events-none"
                     style={{
                         backgroundImage: `
                            radial-gradient(circle at 100% 0%, rgba(219, 234, 254, 0.5) 0%, transparent 50%),
                            radial-gradient(circle at 0% 100%, rgba(233, 213, 255, 0.5) 0%, transparent 50%)
                         `
                     }}
                />

                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 h-full items-center relative z-10">
                        {/* 1. Welcome Text */}
                        <div className="col-span-1 text-center md:text-left space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-sm">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    Dashboard
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                {greeting}, <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400">
                                    {userProfile?.firstName}
                                </span>
                            </h1>
                            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed tracking-wide max-w-xs mx-auto md:mx-0">
                                Here is today's overview. You have complete control over your classes.
                            </p>
                        </div>

                         {/* 2. Center Banner Image */}
                         <div
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                            onClick={handleBannerClick}
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <div className="relative group w-full max-w-xs aspect-[3/2] transition-transform duration-300 hover:scale-[1.02]">
                                <div className="absolute inset-0 bg-slate-100 dark:bg-white/5 border border-white/40 dark:border-white/10 rounded-[2.5rem] shadow-md transform rotate-3 transition-transform group-hover:rotate-6 duration-300" />
                                <div className="absolute inset-0 bg-white dark:bg-slate-800 border border-white/60 dark:border-white/10 rounded-[2.5rem] p-2 shadow-xl overflow-hidden">
                                    <img
                                        src={bannerSettings.imageUrl}
                                        alt="Promotional Banner"
                                        className="w-full h-full object-cover rounded-[2rem] shadow-inner bg-slate-100 dark:bg-slate-900"
                                        onError={handleImageError}
                                        loading="eager"
                                        decoding="sync"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Schedule Widget */}
                        <div 
                            className="hidden md:flex col-span-1 items-center justify-center h-full"
                            onClick={onOpenScheduleModal}
                        >
                            <motion.div 
                                whileHover={{ y: -2 }} 
                                whileTap={{ scale: 0.98 }}
                                className="relative overflow-hidden bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-lg w-full h-full min-h-[180px] p-6 flex flex-col justify-between cursor-pointer group backdrop-blur-sm"
                            >
                                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-50/80 to-transparent dark:from-blue-900/20 pointer-events-none" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-10 h-10 rounded-[1rem] bg-blue-600 shadow-md flex items-center justify-center text-white">
                                        <CalendarDays className="w-5 h-5" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </div>
                                </div>
                                
                                <div className="flex-grow flex items-center justify-center text-center pt-2 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <div key={currentActivity.id} className="flex flex-col items-center justify-center w-full">
                                                <span className="font-black text-xl text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        <Clock className="w-3 h-3 text-blue-500" /> 
                                                        {currentActivity.time}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div key="no-activities" className="text-center">
                                               <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">All Clear</p>
                                               <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 tracking-wide uppercase">No events scheduled</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full mt-4 overflow-hidden relative z-10">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 w-2/3 rounded-full" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    // Standard Layout (No Banner)
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full py-2 relative z-10">
                        <div className="flex-1 text-center md:text-left">
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                                <span className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    Instructor Portal
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-4">
                                 {greeting}, <span className="text-slate-800 dark:text-slate-200">{userProfile?.firstName}!</span>
                            </h1>
                            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-xl tracking-wide leading-relaxed">
                                Ready to shape young minds today? Here's your dashboard at a glance.
                            </p>
                        </div>

                        <div 
                            className="hidden md:flex mt-6 md:mt-0 md:ml-8 relative overflow-hidden bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-sm flex-shrink-0 flex-col justify-between cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                            onClick={onOpenScheduleModal}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-transparent dark:from-orange-900/10 pointer-events-none" />

                            <div className="p-6 flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 relative z-10">
                                <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center text-white flex-shrink-0">
                                    <CalendarDays className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Today's Schedule</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Check your upcoming classes</p>
                                </div>
                            </div>

                            <div className="flex-grow flex items-center justify-center text-center py-8 min-h-[100px] relative z-10">
                                <AnimatePresence mode="wait">
                                    {currentActivity ? (
                                        <div key={currentActivity.id} className="flex flex-col items-center justify-center px-4">
                                            <span className="font-black text-2xl text-slate-900 dark:text-white leading-none mb-3 tracking-tight line-clamp-2">
                                                {currentActivity.title}
                                            </span>
                                            {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                <span className="flex items-center text-sm font-bold text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-900/80 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 tracking-wide shadow-sm">
                                                    <Clock className="w-4 h-4 mr-2 opacity-80 text-blue-500" /> {currentActivity.time}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div key="no-activities" className="text-center">
                                           <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">All Clear!</p>
                                           <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 tracking-wide">No more activities today.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            <Suspense fallback={null}>
                {isBannerEditModalOpen && (
                    <AdminBannerEditModal
                        isOpen={isBannerEditModalOpen}
                        onClose={closeBannerEditModal}
                        currentImageUrl={bannerSettings.imageUrl}
                        currentEndDate={bannerSettings.endDate}
                        onSaveSuccess={() => { }}
                    />
                )}
            </Suspense>
        </>
    );
};

export default memo(DashboardHeader);