// src/components/teacher/dashboard/components/DashboardHeader.jsx
import React, { lazy, Suspense, memo, useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';
import { useTheme } from '../../../../../contexts/ThemeContext';

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

// --- HELPER: MONET HEADER STYLES (Background / Darker / Glassy) ---
const getMonetHeaderStyle = (activeOverlay) => {
    if (!activeOverlay) return null;

    const base = {
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(16px)',
        color: 'white' 
    };

    if (activeOverlay === 'christmas') return { ...base, background: 'linear-gradient(135deg, rgba(15, 23, 66, 0.85) 0%, rgba(10, 15, 40, 0.9) 100%)', borderColor: 'rgba(100, 116, 139, 0.2)' }; 
    if (activeOverlay === 'valentines') return { ...base, background: 'linear-gradient(135deg, rgba(80, 10, 30, 0.85) 0%, rgba(50, 5, 15, 0.9) 100%)', borderColor: 'rgba(255, 100, 100, 0.2)' }; 
    if (activeOverlay === 'graduation') return { ...base, background: 'linear-gradient(135deg, rgba(40, 35, 10, 0.85) 0%, rgba(20, 15, 5, 0.9) 100%)', borderColor: 'rgba(255, 215, 0, 0.2)' }; 
    if (activeOverlay === 'rainy') return { ...base, background: 'linear-gradient(135deg, rgba(20, 35, 25, 0.85) 0%, rgba(10, 20, 15, 0.9) 100%)', borderColor: 'rgba(100, 150, 100, 0.2)' };
    if (activeOverlay === 'cyberpunk') return { ...base, background: 'linear-gradient(135deg, rgba(45, 10, 60, 0.85) 0%, rgba(20, 5, 30, 0.9) 100%)', borderColor: 'rgba(180, 0, 255, 0.2)' };
    if (activeOverlay === 'spring') return { ...base, background: 'linear-gradient(135deg, rgba(60, 20, 30, 0.85) 0%, rgba(30, 10, 15, 0.9) 100%)', borderColor: 'rgba(255, 150, 180, 0.2)' };
    if (activeOverlay === 'space') return { ...base, background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.85) 0%, rgba(5, 5, 15, 0.9) 100%)', borderColor: 'rgba(100, 100, 255, 0.2)' };
    
    return null;
};

// --- HELPER: MONET WIDGET STYLES (Color Variations) ---
const getMonetWidgetStyle = (activeOverlay) => {
    if (!activeOverlay) return null;
    
    const base = {
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'white'
    };

    switch (activeOverlay) {
        // Christmas: Vibrant Royal Blue/Indigo
        case 'christmas': return { ...base, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(30, 58, 138, 0.95) 100%)' }; 
        
        // Valentines: Dark Maroon (Deep Red to Burgundy)
        case 'valentines': return { ...base, background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.9) 0%, rgba(69, 10, 10, 0.95) 100%)' }; 
        
        // Graduation: Vibrant Amber/Gold
        case 'graduation': return { ...base, background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.9) 0%, rgba(202, 138, 4, 0.95) 100%)' }; 
        
        // Rainy: Vibrant Emerald/Teal
        case 'rainy': return { ...base, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(6, 95, 70, 0.95) 100%)' }; 
        
        // Cyberpunk: Vibrant Violet/Fuchsia
        case 'cyberpunk': return { ...base, background: 'linear-gradient(135deg, rgba(192, 38, 211, 0.9) 0%, rgba(147, 51, 234, 0.95) 100%)' }; 
        
        // Spring: Dark Rose (Deep Pink/Mauve)
        case 'spring': return { ...base, background: 'linear-gradient(135deg, rgba(190, 24, 93, 0.9) 0%, rgba(131, 24, 67, 0.95) 100%)' }; 
        
        // Space: Dark Void (Deep Slate to Black)
        case 'space': return { ...base, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)' }; 
        
        default: return null;
    }
};

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
    
    // Theme Integration
    const { activeOverlay } = useTheme();
    const monetHeaderStyle = getMonetHeaderStyle(activeOverlay);
    const monetWidgetStyle = getMonetWidgetStyle(activeOverlay);

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
    const headerContainer = `
        relative p-4 sm:p-6 md:p-10 rounded-[2rem] sm:rounded-[3.5rem] overflow-hidden isolate
        ${monetHeaderStyle ? '' : 'bg-white/90 dark:bg-[#0f172a]/80'} backdrop-blur-2xl
        border ${monetHeaderStyle ? 'border-transparent' : 'border-white/60 dark:border-white/10'}
        shadow-2xl shadow-slate-200/50 dark:shadow-indigo-900/20
        transition-all duration-300
    `;

    // Schedule Widget
    const scheduleWidgetClasses = `
        relative overflow-hidden w-full h-full min-h-[160px] md:min-h-[200px] p-4 md:p-6
        flex flex-col justify-between cursor-pointer group
        rounded-[1.5rem] md:rounded-[2.5rem] border border-white/20 dark:border-white/10
        ${monetWidgetStyle ? '' : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 dark:from-blue-600 dark:via-indigo-700 dark:to-violet-800'}
        shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
        hover:-translate-y-1 active:scale-[0.98] transition-all duration-300
        after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/10 after:to-white/10 after:pointer-events-none
    `;

    const placeholderBannerClass = `
        w-full h-full object-cover bg-gradient-to-br 
        from-rose-400 via-fuchsia-500 to-indigo-500
        dark:from-rose-600 dark:via-fuchsia-700 dark:to-indigo-800
        flex items-center justify-center relative overflow-hidden
    `;
    
    // Text colors
    const textPrimary = monetHeaderStyle ? 'text-white' : 'text-slate-900 dark:text-white';
    const textSecondary = monetHeaderStyle ? 'text-slate-200' : 'text-slate-600 dark:text-slate-400';
    const badgeBg = monetHeaderStyle ? 'bg-white/10 border-white/20 text-white' : 'bg-white/60 dark:bg-white/5 border-white/50 dark:border-white/10 text-slate-600 dark:text-slate-300';
    const nameGradient = monetHeaderStyle ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-300 dark:via-indigo-200 dark:to-purple-300';


    return (
        <>
            <header className={headerContainer} style={monetHeaderStyle || {}}>
                {/* --- Ambient Background Effects (Only if no Monet) --- */}
                {!monetHeaderStyle && (
                    <>
                        <div className="absolute inset-0 z-[-1] opacity-60 dark:opacity-30 pointer-events-none"
                             style={{
                                 backgroundImage: `
                                    radial-gradient(circle at 100% 0%, rgba(196, 181, 253, 0.4) 0%, transparent 50%),
                                    radial-gradient(circle at 0% 100%, rgba(147, 197, 253, 0.4) 0%, transparent 50%)
                                 `
                             }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
                    </>
                )}

                {isSpecialBannerActive ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 h-full items-center relative z-10">
                        {/* --- 1. Welcome Text --- */}
                        <div className="col-span-1 text-center md:text-left space-y-2 md:space-y-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-sm backdrop-blur-md ${badgeBg}`}>
                                <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
                                    Live Dashboard
                                </span>
                            </div>
                            
                            <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] drop-shadow-sm ${textPrimary}`}>
                                {greeting}, <br className="hidden md:block" />
                                <span className={nameGradient}>
                                    {userProfile?.firstName}
                                </span>
                            </h1>
                            
                            <p className={`text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-sm mx-auto md:mx-0 ${textSecondary}`}>
                                You have full control today. Check your schedule or manage classes below.
                            </p>
                        </div>

                         {/* --- 2. Center Banner Image --- */}
                         <div
                            className="col-span-1 flex items-center justify-center h-full w-full order-first md:order-none"
                            onClick={handleBannerClick}
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <div className="relative group w-full max-w-[280px] md:max-w-xs aspect-[3/2] transition-transform duration-500 hover:scale-[1.02] perspective-1000">
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-[2rem] md:rounded-[2.5rem] transform rotate-3 scale-95 opacity-70 blur-md transition-transform group-hover:rotate-6 duration-500" />
                                
                                <div className="relative h-full w-full bg-white dark:bg-slate-800 border-[4px] md:border-[6px] border-white dark:border-slate-700/50 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden">
                                    {!imageError ? (
                                        <>
                                            <img
                                                src={bannerSettings.imageUrl}
                                                alt="Promotional Banner"
                                                className="w-full h-full object-cover"
                                                onError={handleImageError}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none mix-blend-overlay" />
                                        </>
                                    ) : (
                                        <div className={placeholderBannerClass}>
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
                                            <div className="flex flex-col items-center text-white/90 z-10 text-center p-4">
                                                <ImageIcon className="w-8 h-8 md:w-10 md:h-10 mb-2 opacity-80" />
                                                <span className="font-black text-base md:text-lg tracking-tight leading-tight">School Spirit</span>
                                                <span className="text-[10px] md:text-xs font-medium opacity-70">Welcome to Class</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* --- 3. Candy Schedule Widget (MONET APPLIED) --- */}
                        <div 
                            className="hidden md:flex col-span-1 items-center justify-center h-full"
                            onClick={onOpenScheduleModal}
                        >
                            <motion.div 
                                whileTap={{ scale: 0.95 }} 
                                className={scheduleWidgetClasses}
                                style={monetWidgetStyle || {}}
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                                
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                                        <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
                                    </div>
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
                                    </div>
                                </div>
                                
                                <div className="flex-grow flex items-center justify-center text-center pt-2 md:pt-4 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <div key={currentActivity.id} className="w-full">
                                                <span className="font-black text-xl md:text-2xl text-white leading-tight mb-2 md:mb-3 line-clamp-2 drop-shadow-sm">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-[10px] md:text-xs font-bold text-white shadow-sm">
                                                        <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" /> 
                                                        {currentActivity.time}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div key="no-activities" className="text-center text-white">
                                               <p className="text-lg md:text-xl font-bold tracking-tight">All Clear</p>
                                               <p className="text-[10px] md:text-xs font-medium opacity-80 mt-1 uppercase tracking-widest">No events scheduled</p>
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
                        <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4">
                             <div className={`inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full border shadow-sm backdrop-blur-sm ${monetHeaderStyle ? 'bg-white/10 border-white/20 text-white' : 'bg-orange-50/80 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800 text-orange-700 dark:text-orange-300'}`}>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
                                    Instructor Portal
                                </span>
                            </div>
                            <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-sm ${textPrimary}`}>
                                 {greeting}, <span className={monetHeaderStyle ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 dark:from-white dark:to-slate-300'}>{userProfile?.firstName}!</span>
                            </h1>
                            <p className={`text-sm sm:text-lg font-medium max-w-xl tracking-wide leading-relaxed ${textSecondary}`}>
                                Ready to shape young minds today? Here's your dashboard at a glance.
                            </p>
                        </div>

                        {/* Standard Layout Schedule Widget */}
                        <div 
                            className="hidden md:flex mt-8 md:mt-0 md:ml-12 relative w-full max-w-sm"
                            onClick={onOpenScheduleModal}
                        >
                            <motion.div 
                                whileTap={{ scale: 0.98 }} 
                                className={`${scheduleWidgetClasses} ${!monetWidgetStyle ? 'bg-gradient-to-br from-slate-900 to-slate-800 dark:from-black dark:to-slate-900 !border-slate-700' : ''}`}
                                style={monetWidgetStyle || {}}
                            >
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                                
                                <div className="flex items-center justify-between relative z-10 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                                            <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base md:text-lg">Schedule</h3>
                                            <p className="text-[10px] md:text-xs text-slate-400 font-medium">Today's Timeline</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover:text-white transition-colors" />
                                </div>

                                <div className="flex-grow flex items-center justify-center text-center py-2 md:py-4 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <div key={currentActivity.id} className="w-full">
                                                <span className="font-black text-2xl md:text-3xl text-white leading-none mb-2 md:mb-3 block tracking-tight">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && currentActivity.time !== 'N/A' && (
                                                    <span className="inline-flex items-center text-xs md:text-sm font-bold text-white/90 bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10">
                                                        <Clock className="w-3 h-3 md:w-4 md:h-4 mr-2" /> {currentActivity.time}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div key="no-activities" className="text-center">
                                               <p className="text-xl md:text-2xl font-bold text-white">All Clear!</p>
                                               <p className="text-xs md:text-sm text-slate-400 mt-1">No pending classes.</p>
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