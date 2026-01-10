import React, { lazy, Suspense, memo, useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, ChevronRight, Image as ImageIcon } from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';
import { useTheme } from '../../../../../contexts/ThemeContext';

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

const DashboardHeader = ({ userProfile, showToast, onOpenScheduleModal }) => {
    const { bannerSettings, isSpecialBannerActive, isBannerEditModalOpen, openBannerEditModal, closeBannerEditModal } = useBanner(showToast);
    const { currentActivity } = useSchedule(showToast, userProfile?.schoolId || 'srcs_main');
    
    const [imageError, setImageError] = useState(false);
    const { monetTheme } = useTheme();

    // Memoize handlers
    const handleBannerClick = useCallback(() => { 
        if (userProfile?.role === 'admin') openBannerEditModal(); 
    }, [userProfile?.role, openBannerEditModal]);

    const handleImageError = useCallback(() => setImageError(true), []);

    // Optimization: Greeting that updates if the session is long
    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const updateGreeting = () => {
            const h = new Date().getHours();
            setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
        };
        updateGreeting();
        // Check every minute if the hour changed (low cost)
        const timer = setInterval(updateGreeting, 60000); 
        return () => clearInterval(timer);
    }, []);

    // Memoize heavy style strings to prevent recreation on re-render
    const styles = useMemo(() => ({
        headerContainer: `relative p-5 sm:p-8 md:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden isolate backdrop-blur-3xl transition-all duration-500 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-white/20`,
        scheduleWidget: `relative overflow-hidden w-full h-full min-h-[180px] md:min-h-[220px] p-6 flex flex-col justify-between cursor-pointer group rounded-[2.8rem] shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.96] transition-all duration-300 border border-white/20`,
        placeholderBanner: `w-full h-full object-cover bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 dark:from-rose-600 dark:via-fuchsia-700 dark:to-indigo-800 flex items-center justify-center relative overflow-hidden`,
        accent: {
            background: `linear-gradient(135deg, var(--monet-accent) 0%, var(--monet-accent-dark) 100%)`,
            boxShadow: '0 15px 35px -5px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.25)',
        }
    }), []);

    return (
        <>
            <header className={styles.headerContainer} style={monetTheme.glassStyle}>
                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 h-full items-center relative z-10">
                        {/* LEFT: TEXT CONTENT */}
                        <div className="col-span-1 text-center md:text-left space-y-3 md:space-y-5 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-md bg-white/10 border border-white/20 text-white select-none">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Live Dashboard</span>
                            </div>
                            <div>
                                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] drop-shadow-sm text-white">
                                    {greeting}, <br className="hidden md:block" />
                                    <span className="text-white/90">{userProfile?.firstName}</span>
                                </h1>
                            </div>
                            <p className="text-sm md:text-[1.05rem] font-medium leading-relaxed max-w-sm mx-auto md:mx-0 text-slate-100/80">
                                You have full control today. Manage your classes easily on the <span className="font-bold text-white underline decoration-white/30 decoration-2 underline-offset-4">Classes Tab</span>.
                            </p>
                        </div>
                        
                        {/* CENTER: BANNER IMAGE */}
                        <div 
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none" 
                            onClick={handleBannerClick} 
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <div className="relative group w-full max-w-[280px] md:max-w-[340px] aspect-[16/10] transition-transform duration-500 hover:scale-[1.03] perspective-1000">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-white/5 rounded-[2.5rem] transform rotate-3 scale-95 opacity-60 blur-xl transition-transform group-hover:rotate-6 duration-500" />
                                <div className="relative h-full w-full bg-white dark:bg-slate-800 border-[6px] border-white/40 dark:border-slate-700/40 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-sm">
                                    {!imageError ? (
                                        <>
                                            <img 
                                                src={bannerSettings.imageUrl} 
                                                alt="Banner" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                onError={handleImageError} 
                                                // Optimization: Eager load LCP image
                                                loading="eager"
                                                decoding="async"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none mix-blend-overlay" />
                                        </>
                                    ) : (
                                        <div className={styles.placeholderBanner}>
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
                                            <div className="flex flex-col items-center text-white/95 z-10 text-center p-6">
                                                <ImageIcon className="w-10 h-10 mb-3 opacity-90 drop-shadow-md" />
                                                <span className="font-black text-xl tracking-tight leading-tight drop-shadow-sm">School Spirit</span>
                                                <span className="text-xs font-bold opacity-80 mt-1 uppercase tracking-wide">Welcome to Class</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: SCHEDULE WIDGET */}
                        <div className="hidden md:flex col-span-1 items-center justify-center h-full animate-in fade-in slide-in-from-right-4 duration-700" onClick={onOpenScheduleModal}>
                            <motion.div whileTap={{ scale: 0.96 }} className={styles.scheduleWidget} style={styles.accent}>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none" />
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-14 h-14 rounded-[1.2rem] bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-[inset_0_1px_4px_rgba(255,255,255,0.2)]">
                                        <CalendarDays className="w-7 h-7 text-white drop-shadow-md" strokeWidth={2.5} />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/25 transition-colors border border-white/5">
                                        <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center pt-2 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <motion.div 
                                                key={currentActivity.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="w-full"
                                            >
                                                <span className="font-black text-3xl text-white leading-[1.1] mb-3 line-clamp-2 drop-shadow-md tracking-tight">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-xs font-bold text-white shadow-sm">
                                                        <Clock className="w-3.5 h-3.5" strokeWidth={2.5} /> 
                                                        {currentActivity.time}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="no-activities"
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="text-center text-white"
                                            >
                                                <p className="text-2xl font-black tracking-tight drop-shadow-sm">All Clear</p>
                                                <p className="text-[11px] font-bold opacity-80 mt-1 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full inline-block">No events scheduled</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    // --- DEFAULT LAYOUT (No Special Banner) ---
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full relative z-10 gap-8">
                        <div className="flex-1 text-center md:text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm backdrop-blur-xl bg-white/10 border-white/20 text-white select-none">
                                 <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_10px_rgba(251,146,60,0.6)]" />
                                 <span className="text-[11px] font-bold uppercase tracking-widest">Instructor Portal</span>
                             </div>
                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.9] drop-shadow-sm text-white">
                                {greeting}, <br className="hidden md:block"/>
                                <span className="text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
                                    {userProfile?.firstName}!
                                </span>
                            </h1>
                            <p className="text-base sm:text-lg font-medium max-w-xl tracking-wide leading-relaxed text-slate-100/90 mx-auto md:mx-0">
                                Ready to shape young minds today? Here's your dashboard at a glance.
                            </p>
                        </div>
                        
                        <div className="hidden md:flex relative w-full max-w-md animate-in fade-in slide-in-from-right-4 duration-700 delay-200" onClick={onOpenScheduleModal}>
                            <motion.div whileTap={{ scale: 0.97 }} className={styles.scheduleWidget} style={styles.accent}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30 pointer-events-none" />
                                
                                <div className="flex items-center justify-between relative z-10 mb-4">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-[1.2rem] bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-inner">
                                            <CalendarDays className="w-7 h-7 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-xl tracking-tight">Schedule</h3>
                                            <p className="text-xs text-slate-200/80 font-bold uppercase tracking-wider mt-0.5">Today's Timeline</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/20 transition-colors">
                                        <ChevronRight className="w-5 h-5 text-white/90" strokeWidth={3} />
                                    </div>
                                </div>
                                
                                <div className="flex-grow flex items-center justify-center text-center py-2 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <motion.div 
                                                key={currentActivity.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="w-full"
                                            >
                                                <span className="font-black text-3xl md:text-4xl text-white leading-none mb-3 block tracking-tighter drop-shadow-md">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <span className="inline-flex items-center text-sm font-bold text-white bg-white/20 px-5 py-2 rounded-full border border-white/20 backdrop-blur-md shadow-sm">
                                                        <Clock className="w-4 h-4 mr-2" strokeWidth={2.5} /> 
                                                        {currentActivity.time}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                key="no-activities"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center"
                                            >
                                                <p className="text-3xl font-black text-white tracking-tight drop-shadow-sm">All Clear!</p>
                                                <p className="text-sm font-bold text-white/70 mt-1 uppercase tracking-wider">No pending classes</p>
                                            </motion.div>
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