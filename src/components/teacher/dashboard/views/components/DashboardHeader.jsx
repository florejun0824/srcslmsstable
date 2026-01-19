import React, { lazy, Suspense, memo, useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Clock, ChevronRight, Image as ImageIcon, ExternalLink, Sparkles } from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';
import { useTheme } from '../../../../../contexts/ThemeContext';

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

const DashboardHeader = ({ userProfile, showToast, onOpenScheduleModal }) => {
    const { bannerSettings, isSpecialBannerActive, isBannerEditModalOpen, openBannerEditModal, closeBannerEditModal } = useBanner(showToast);
    const { currentActivity } = useSchedule(showToast, userProfile?.schoolId || 'srcs_main');
    
    const [imageError, setImageError] = useState(false);
    const { monetTheme } = useTheme();

    const handleBannerClick = useCallback(() => { 
        if (userProfile?.role === 'admin') openBannerEditModal(); 
    }, [userProfile?.role, openBannerEditModal]);

    const handleLinkClick = useCallback((e) => {
        e.stopPropagation();
        if (bannerSettings.linkUrl) {
            window.open(bannerSettings.linkUrl, '_blank', 'noopener,noreferrer');
        }
    }, [bannerSettings.linkUrl]);

    const handleImageError = useCallback(() => setImageError(true), []);

    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const updateGreeting = () => {
            const h = new Date().getHours();
            setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
        };
        updateGreeting();
        const timer = setInterval(updateGreeting, 60000); 
        return () => clearInterval(timer);
    }, []);

    // ONEUI 8.5 REFINED STYLES
    const styles = useMemo(() => ({
        headerContainer: `relative p-6 sm:p-8 md:p-10 rounded-[2.5rem] overflow-hidden isolate backdrop-blur-3xl transition-all duration-500 shadow-sm border border-white/15 group/header`,
        scheduleWidget: `relative overflow-hidden w-full h-full min-h-[160px] md:min-h-[190px] p-6 flex flex-col justify-between cursor-pointer group rounded-[2rem] shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-300 border border-white/20`,
        placeholderBanner: `w-full h-full object-cover bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 flex items-center justify-center relative overflow-hidden`,
        accent: {
            background: `linear-gradient(145deg, var(--monet-accent) 0%, var(--monet-accent-dark) 100%)`,
            boxShadow: '0 8px 25px -5px rgba(0,0,0,0.25)', 
            border: '1px solid rgba(255,255,255,0.15)',
        },
        textBannerCard: `relative h-full w-full bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-pink-500/80 border border-white/20 rounded-[2rem] shadow-lg overflow-hidden backdrop-blur-xl p-6 flex flex-col items-center justify-center text-center group active:scale-[0.98] transition-transform`,
    }), []);

    const renderBannerContent = () => {
        const { type, imageUrl, title, message, linkUrl, linkLabel } = bannerSettings;
        const isCombined = type === 'combined';
        const isTextOnly = type === 'text';

        const ImageWrapper = ({ children }) => (
            <div className="relative h-full w-full bg-white dark:bg-slate-800 border-[4px] border-white/30 dark:border-slate-700/30 rounded-[2rem] shadow-xl overflow-hidden backdrop-blur-md">
                {!imageError ? (
                    <>
                        <img 
                            src={imageUrl} 
                            alt="Banner" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                            onError={handleImageError} 
                        />
                        {isCombined ? (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                        ) : (
                            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                        )}
                    </>
                ) : (
                    <div className={styles.placeholderBanner}>
                         <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        <ImageIcon className="w-10 h-10 text-white/50" />
                    </div>
                )}
                {children}
            </div>
        );

        if (isTextOnly) {
            return (
                <div className={styles.textBannerCard}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
                    <div className="relative z-10 flex flex-col items-center gap-3">
                        {/* CHANGED: Megaphone -> Sparkles for a more 'Featured/Banner' feel */}
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-sm mb-1">
                            <Sparkles className="w-6 h-6 text-white" fill="currentColor" fillOpacity={0.2} />
                        </div>
                        <div>
                            {title && <h3 className="text-xl font-bold text-white leading-tight drop-shadow-sm line-clamp-2">{title}</h3>}
                            {message && <p className="text-white/90 text-sm font-medium leading-relaxed line-clamp-2 mt-1 max-w-[200px]">{message}</p>}
                        </div>
                        {linkUrl && (
                            <button 
                                onClick={handleLinkClick}
                                className="mt-2 flex items-center gap-2 bg-white text-indigo-600 px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wide shadow-md hover:shadow-lg active:scale-95 transition-all"
                            >
                                {linkLabel || "View"} <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        if (isCombined) {
            return (
                <ImageWrapper>
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-left z-20">
                        {title && <h3 className="text-white font-bold text-xl leading-none mb-1 drop-shadow-sm line-clamp-1">{title}</h3>}
                        {message && <p className="text-slate-200 text-xs font-medium line-clamp-2 leading-tight max-w-[95%] opacity-90">{message}</p>}
                        {linkUrl && (
                            <div className="mt-3">
                                <button 
                                    onClick={handleLinkClick}
                                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wide transition-all"
                                >
                                    {linkLabel || "Open"} <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </ImageWrapper>
            );
        }

        return <ImageWrapper />;
    };

    return (
        <>
            <header className={styles.headerContainer} style={monetTheme.glassStyle}>
                {/* Decorative background blurs */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[90px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/5 rounded-full blur-[70px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                {isSpecialBannerActive ? (
                    // --- BALANCED 3-COLUMN LAYOUT ---
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center relative z-10">
                        
                        {/* LEFT: GREETING */}
                        <div className="col-span-1 text-center md:text-left space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
                             <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/10 text-white select-none backdrop-blur-md">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Live</span>
                            </div>
                            <div>
                                <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-black tracking-tighter leading-[1] drop-shadow-sm text-white">
                                    {greeting}, <br className="hidden md:block" />
                                    <span className="text-white/80">{userProfile?.firstName}</span>
                                </h1>
                            </div>
                            <p className="text-sm md:text-base font-medium leading-relaxed max-w-xs mx-auto md:mx-0 text-slate-100/70">
                                Manage your classes easily on the <span className="font-bold text-white hover:underline cursor-pointer">Classes Tab</span>.
                            </p>
                        </div>
                        
                        {/* CENTER: BANNER */}
                        <div 
                            className="col-span-1 flex items-center justify-center w-full order-first md:order-none" 
                            onClick={handleBannerClick} 
                            style={{ cursor: userProfile?.role === 'admin' ? 'pointer' : 'default' }}
                        >
                            <div className="relative group w-full max-w-[340px] md:max-w-[400px] aspect-[16/10] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                                {renderBannerContent()}
                                {/* Admin Edit Hint */}
                                {userProfile?.role === 'admin' && (
                                    <div className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: SCHEDULE */}
                        <div className="hidden md:flex col-span-1 items-center justify-center h-full animate-in fade-in slide-in-from-right-4 duration-500" onClick={onOpenScheduleModal}>
                            <motion.div whileTap={{ scale: 0.96 }} className={styles.scheduleWidget} style={styles.accent}>
                                <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                                
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="w-12 h-12 rounded-[1.25rem] bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-inner">
                                        <CalendarDays className="w-6 h-6 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                        <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                                    </div>
                                </div>
                                <div className="flex-grow flex items-center justify-center text-center mt-2 relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <motion.div 
                                                key={currentActivity.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="w-full"
                                            >
                                                <span className="font-bold text-2xl text-white leading-tight mb-2 line-clamp-2">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && (
                                                    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/10 backdrop-blur-md border border-white/5 text-[11px] font-bold text-white">
                                                        <Clock className="w-3.5 h-3.5" strokeWidth={2.5} /> 
                                                        {currentActivity.time}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center text-white"
                                            >
                                                <p className="text-xl font-bold tracking-tight">All Clear</p>
                                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">No classes</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    // --- DEFAULT LAYOUT (Restored Size) ---
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between h-full w-full relative z-10 gap-8">
                         <div className="flex-1 text-center md:text-left space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm backdrop-blur-md bg-white/10 border-white/10 text-white select-none">
                                 <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Instructor Portal</span>
                             </div>
                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.95] drop-shadow-sm text-white">
                                {greeting}, <br className="hidden md:block"/>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                                    {userProfile?.firstName}!
                                </span>
                            </h1>
                            <p className="text-base font-medium tracking-wide text-slate-100/80 max-w-md mx-auto md:mx-0">
                                Ready to shape young minds today?
                            </p>
                        </div>
                        
                        <div className="hidden md:flex relative w-full max-w-[360px] animate-in fade-in slide-in-from-right-4 duration-500" onClick={onOpenScheduleModal}>
                            <motion.div whileTap={{ scale: 0.97 }} className={styles.scheduleWidget} style={styles.accent}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                                
                                <div className="flex items-center justify-between relative z-10 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-[1.25rem] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                                            <CalendarDays className="w-6 h-6 text-white" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-base tracking-tight">Timeline</h3>
                                            <p className="text-[10px] text-slate-200/70 font-bold uppercase tracking-wider">Today</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-white/80" strokeWidth={3} />
                                </div>
                                
                                <div className="flex-grow flex items-center justify-center text-center relative z-10">
                                    <AnimatePresence mode="wait">
                                        {currentActivity ? (
                                            <motion.div 
                                                key={currentActivity.id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="w-full"
                                            >
                                                <span className="font-black text-3xl text-white leading-none mb-2 block tracking-tight">
                                                    {currentActivity.title}
                                                </span>
                                                {currentActivity.time && (
                                                    <span className="inline-flex items-center text-xs font-bold text-white bg-white/20 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                                                        <Clock className="w-3.5 h-3.5 mr-1.5" strokeWidth={2.5} /> 
                                                        {currentActivity.time}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ) : (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-center"
                                            >
                                                <p className="text-2xl font-black text-white tracking-tight">All Clear!</p>
                                                <p className="text-[11px] font-bold text-white/60 mt-0.5 uppercase tracking-wider">Relax</p>
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
                        currentType={bannerSettings.type}
                        currentTitle={bannerSettings.title}
                        currentMessage={bannerSettings.message}
                        currentLinkUrl={bannerSettings.linkUrl}
                        currentLinkLabel={bannerSettings.linkLabel}
                        onSaveSuccess={() => { }} 
                    />
                )}
            </Suspense>
        </>
    );
};

export default memo(DashboardHeader);