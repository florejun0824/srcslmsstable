// src/components/teacher/dashboard/components/DashboardHeader.jsx
import React, { lazy, Suspense, memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';
import { useTheme } from '../../../../../contexts/ThemeContext';

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

const DashboardHeader = ({ userProfile, showToast, onOpenScheduleModal }) => {
    const { bannerSettings, isSpecialBannerActive, isBannerEditModalOpen, openBannerEditModal, closeBannerEditModal } = useBanner(showToast);
    const { currentActivity } = useSchedule(showToast);
    const [imageError, setImageError] = useState(false);
    const { monetTheme } = useTheme();

    const handleBannerClick = useCallback(() => { if (userProfile?.role === 'admin') openBannerEditModal(); }, [userProfile?.role, openBannerEditModal]);
    const handleImageError = useCallback(() => setImageError(true), []);
    const greeting = useMemo(() => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening'; }, []);

    const headerContainer = `relative p-4 sm:p-6 md:p-10 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden isolate backdrop-blur-2xl transition-all duration-300`;
    const scheduleWidgetClasses = `relative overflow-hidden w-full h-full min-h-[160px] md:min-h-[200px] p-4 md:p-6 flex flex-col justify-between cursor-pointer group rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 border border-white/20`;
    const placeholderBannerClass = `w-full h-full object-cover bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 dark:from-rose-600 dark:via-fuchsia-700 dark:to-indigo-800 flex items-center justify-center relative overflow-hidden`;
    
    // --- DARKER GRADIENT FOR HEADER WIDGET ---
    const accentStyle = {
        background: `linear-gradient(135deg, var(--monet-accent) 0%, var(--monet-accent-dark) 100%)`,
        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.3)',
    };

    return (
        <>
            <header className={headerContainer} style={monetTheme.glassStyle}>
                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 h-full items-center relative z-10">
                        <div className="col-span-1 text-center md:text-left space-y-2 md:space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-sm backdrop-blur-md bg-white/10 border border-white/20 text-white">
                                <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span></span>
                                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest">Live Dashboard</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] drop-shadow-sm text-white">{greeting}, <br className="hidden md:block" /><span className="text-white">{userProfile?.firstName}</span></h1>
                            <p className="text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-sm mx-auto md:mx-0 text-slate-200">You have full control today. Check your schedule or manage classes below.</p>
                        </div>
                         <div className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none" onClick={handleBannerClick} style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}>
                            <div className="relative group w-full max-w-[280px] md:max-w-xs aspect-[3/2] transition-transform duration-500 hover:scale-[1.02] perspective-1000">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-[2rem] md:rounded-[2.5rem] transform rotate-3 scale-95 opacity-70 blur-md transition-transform group-hover:rotate-6 duration-500" />
                                <div className="relative h-full w-full bg-white dark:bg-slate-800 border-[4px] md:border-[6px] border-white dark:border-slate-700/50 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden">
                                    {!imageError ? (<><img src={bannerSettings.imageUrl} alt="Banner" className="w-full h-full object-cover" onError={handleImageError} /><div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none mix-blend-overlay" /></>) : (<div className={placeholderBannerClass}><div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div><div className="flex flex-col items-center text-white/90 z-10 text-center p-4"><ImageIcon className="w-8 h-8 md:w-10 md:h-10 mb-2 opacity-80" /><span className="font-black text-base md:text-lg tracking-tight leading-tight">School Spirit</span><span className="text-[10px] md:text-xs font-medium opacity-70">Welcome to Class</span></div></div>)}
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex col-span-1 items-center justify-center h-full" onClick={onOpenScheduleModal}>
                            <motion.div whileTap={{ scale: 0.95 }} className={scheduleWidgetClasses} style={accentStyle}>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner"><CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" /></div>
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors"><ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white/80" /></div>
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center pt-2 md:pt-4 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (<div key={currentActivity.id} className="w-full"><span className="font-black text-xl md:text-2xl text-white leading-tight mb-2 md:mb-3 line-clamp-2 drop-shadow-sm">{currentActivity.title}</span>{currentActivity.time && currentActivity.time !== 'N/A' && (<div className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] md:text-xs font-bold text-white shadow-sm"><Clock className="w-3 h-3 md:w-3.5 md:h-3.5" /> {currentActivity.time}</div>)}</div>) : (<div key="no-activities" className="text-center text-white"><p className="text-lg md:text-xl font-bold tracking-tight">All Clear</p><p className="text-[10px] md:text-xs font-medium opacity-80 mt-1 uppercase tracking-widest">No events scheduled</p></div>)}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full relative z-10">
                        <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4">
                             <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full border shadow-sm backdrop-blur-sm bg-white/10 border-white/20 text-white"><span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 animate-pulse" /><span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest">Instructor Portal</span></div>
                            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-sm text-white">{greeting}, <span className="text-white">{userProfile?.firstName}!</span></h1>
                            <p className="text-sm sm:text-lg font-medium max-w-xl tracking-wide leading-relaxed text-slate-200">Ready to shape young minds today? Here's your dashboard at a glance.</p>
                        </div>
                        <div className="hidden md:flex mt-8 md:mt-0 md:ml-12 relative w-full max-w-sm" onClick={onOpenScheduleModal}>
                            <motion.div whileTap={{ scale: 0.98 }} className={scheduleWidgetClasses} style={accentStyle}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
                                <div className="flex items-center justify-between relative z-10 mb-4">
                                    <div className="flex items-center gap-4"><div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10"><CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-white" /></div><div><h3 className="font-bold text-white text-base md:text-lg">Schedule</h3><p className="text-[10px] md:text-xs text-slate-200 font-medium">Today's Timeline</p></div></div><ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center py-2 md:py-4 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (<div key={currentActivity.id} className="w-full"><span className="font-black text-2xl md:text-3xl text-white leading-none mb-2 md:mb-3 block tracking-tight">{currentActivity.title}</span>{currentActivity.time && currentActivity.time !== 'N/A' && (<span className="inline-flex items-center text-xs md:text-sm font-bold text-white/90 bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10"><Clock className="w-3 h-3 md:w-4 md:h-4 mr-2" /> {currentActivity.time}</span>)}</div>) : (<div key="no-activities" className="text-center"><p className="text-xl md:text-2xl font-bold text-white">All Clear!</p><p className="text-xs md:text-sm text-slate-300 mt-1">No pending classes.</p></div>)}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </header>
            <Suspense fallback={null}>
                {isBannerEditModalOpen && <AdminBannerEditModal isOpen={isBannerEditModalOpen} onClose={closeBannerEditModal} currentImageUrl={bannerSettings.imageUrl} currentEndDate={bannerSettings.endDate} onSaveSuccess={() => { }} />}
            </Suspense>
        </>
    );
};

export default memo(DashboardHeader);