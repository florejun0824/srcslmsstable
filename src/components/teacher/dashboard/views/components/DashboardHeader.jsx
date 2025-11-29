// src/components/teacher/dashboard/components/DashboardHeader.jsx
import React, { lazy, Suspense, memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react';

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
    const [imageError, setImageError] = useState(false);

    const handleBannerClick = useCallback(() => {
        if (userProfile?.role === 'admin') {
            openBannerEditModal();
        }
    }, [userProfile?.role, openBannerEditModal]);

    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    // --- CANDY STYLES ---
    
    // Header Container: Glassy, rounded, with deep dark mode support
    const headerContainer = `
        relative p-6 md:p-10 rounded-[3.5rem] overflow-hidden isolate
        bg-white/90 dark:bg-[#0f172a]/80 backdrop-blur-2xl
        border border-white/60 dark:border-white/10
        shadow-2xl shadow-slate-200/50 dark:shadow-indigo-900/20
        transition-all duration-300
    `;

    // Schedule Widget: Vibrant gradient that pops in both modes
    const scheduleWidgetCandy = `
        relative overflow-hidden w-full h-full min-h-[200px] p-6
        flex flex-col justify-between cursor-pointer group
        rounded-[2.5rem] border border-white/20 dark:border-white/10
        bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600
        dark:from-blue-600 dark:via-indigo-700 dark:to-violet-800
        shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
        hover:-translate-y-1 active:scale-[0.98] transition-all duration-300
        after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/10 after:to-white/10 after:pointer-events-none
    `;

    // Fallback Banner: A generated "Candy" pattern instead of a broken image
    const placeholderBannerClass = `
        w-full h-full object-cover bg-gradient-to-br 
        from-rose-400 via-fuchsia-500 to-indigo-500
        dark:from-rose-600 dark:via-fuchsia-700 dark:to-indigo-800
        flex items-center justify-center relative overflow-hidden
    `;

    return (
        <>
            <header className={headerContainer}>
                {/* --- Ambient Background Effects --- */}
                
                {/* 1. Gradient Mesh (Light/Dark optimized) */}
                <div className="absolute inset-0 z-[-1] opacity-60 dark:opacity-30 pointer-events-none"
                     style={{
                         backgroundImage: `
                            radial-gradient(circle at 100% 0%, rgba(196, 181, 253, 0.4) 0%, transparent 50%),
                            radial-gradient(circle at 0% 100%, rgba(147, 197, 253, 0.4) 0%, transparent 50%)
                         `
                     }}
                />
                
                {/* 2. White/Dark Gloss Shine */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />

                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full items-center relative z-10">
                        {/* --- 1. Welcome Text --- */}
                        <div className="col-span-1 text-center md:text-left space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    Live Dashboard
                                </span>
                            </div>
                            
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1] drop-shadow-sm">
                                {greeting}, <br className="hidden md:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-300 dark:via-indigo-200 dark:to-purple-300">
                                    {userProfile?.firstName}
                                </span>
                            </h1>
                            
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto md:mx-0">
                                You have full control today. Check your schedule or manage classes below.
                            </p>
                        </div>

                         {/* --- 2. Center Banner Image (Framed) --- */}
                         <div
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                            onClick={handleBannerClick}
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <div className="relative group w-full max-w-xs aspect-[3/2] transition-transform duration-500 hover:scale-[1.02] perspective-1000">
                                {/* Shadow/Glow behind image */}
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-[2.5rem] transform rotate-3 scale-95 opacity-70 blur-md transition-transform group-hover:rotate-6 duration-500" />
                                
                                <div className="relative h-full w-full bg-white dark:bg-slate-800 border-[6px] border-white dark:border-slate-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden">
                                    {!imageError ? (
                                        <>
                                            <img
                                                src={bannerSettings.imageUrl}
                                                alt="Promotional Banner"
                                                className="w-full h-full object-cover"
                                                onError={handleImageError}
                                            />
                                            {/* Glass Shine on Image */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none mix-blend-overlay" />
                                        </>
                                    ) : (
                                        // --- CANDY PLACEHOLDER (If image fails) ---
                                        <div className={placeholderBannerClass}>
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
                                            <div className="flex flex-col items-center text-white/90 z-10 text-center p-4">
                                                <ImageIcon className="w-10 h-10 mb-2 opacity-80" />
                                                <span className="font-black text-lg tracking-tight leading-tight">School Spirit</span>
                                                <span className="text-xs font-medium opacity-70">Welcome to Class</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- 3. Candy Schedule Widget --- */}
                        <div 
                            className="hidden md:flex col-span-1 items-center justify-center h-full"
                            onClick={onOpenScheduleModal}
                        >
                            <motion.div whileTap={{ scale: 0.95 }} className={scheduleWidgetCandy}>
                                {/* Inner Gloss */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                                
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                                        <CalendarDays className="w-6 h-6 text-white drop-shadow-md" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <ChevronRight className="w-5 h-5 text-white/80" />
                                    </div>
                                </div>
                                
                                <div className="flex-grow flex items-center justify-center text-center pt-4 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <div key={currentActivity.id} className="w-full">
                                                <span className="font-black text-2xl text-white leading-tight mb-3 line-clamp-2 drop-shadow-sm">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-bold text-white shadow-sm">
                                                        <Clock className="w-3.5 h-3.5" /> 
                                                        {currentActivity.time}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div key="no-activities" className="text-center text-white">
                                               <p className="text-xl font-bold tracking-tight">All Clear</p>
                                               <p className="text-xs font-medium opacity-80 mt-1 uppercase tracking-widest">No events scheduled</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    // --- Standard Layout (No Banner) ---
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full relative z-10">
                        <div className="flex-1 text-center md:text-left space-y-4">
                             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50/80 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800 shadow-sm backdrop-blur-sm">
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">
                                    Instructor Portal
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none drop-shadow-sm">
                                 {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 dark:from-white dark:to-slate-300">{userProfile?.firstName}!</span>
                            </h1>
                            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-xl tracking-wide leading-relaxed">
                                Ready to shape young minds today? Here's your dashboard at a glance.
                            </p>
                        </div>

                        {/* Standard Layout Schedule Widget */}
                        <div 
                            className="hidden md:flex mt-8 md:mt-0 md:ml-12 relative w-full max-w-sm"
                            onClick={onOpenScheduleModal}
                        >
                            <motion.div whileTap={{ scale: 0.98 }} className={`${scheduleWidgetCandy} bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 !border-slate-700`}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                                
                                <div className="flex items-center justify-between relative z-10 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                            <CalendarDays className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">Schedule</h3>
                                            <p className="text-xs text-slate-400 font-medium">Today's Timeline</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                </div>

                                <div className="flex-grow flex items-center justify-center text-center py-4 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <div key={currentActivity.id} className="w-full">
                                                <span className="font-black text-3xl text-white leading-none mb-3 block tracking-tight">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <span className="inline-flex items-center text-sm font-bold text-white/90 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                                                        <Clock className="w-4 h-4 mr-2" /> {currentActivity.time}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div key="no-activities" className="text-center">
                                               <p className="text-2xl font-bold text-white">All Clear!</p>
                                               <p className="text-sm text-slate-400 mt-1">No pending classes.</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
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