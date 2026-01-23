import React, { lazy, Suspense, memo, useMemo, useCallback, useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { CalendarDays, Clock, ArrowUpRight, Sparkles, Megaphone, X, PenTool, Plus } from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

const DashboardHeader = ({ userProfile, showToast, onOpenScheduleModal, activeClasses, handleCreateAnnouncement }) => {
    const { bannerSettings, isBannerEditModalOpen, openBannerEditModal, closeBannerEditModal } = useBanner(showToast);
    const { currentActivity } = useSchedule(showToast, userProfile?.schoolId || 'srcs_main');
    
    // --- LOCAL STATE ---
    const [imageError, setImageError] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const h = new Date().getHours();
        setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
    }, []);

    const handleBannerClick = useCallback(() => { 
        if (userProfile?.role === 'admin') openBannerEditModal(); 
    }, [userProfile?.role, openBannerEditModal]);

    const handleLinkClick = useCallback((e) => {
        e.stopPropagation();
        if (bannerSettings.linkUrl) window.open(bannerSettings.linkUrl, '_blank', 'noopener,noreferrer');
    }, [bannerSettings.linkUrl]);

    const handlePostAndClose = useCallback((postData) => {
        handleCreateAnnouncement(postData);
        setIsCreateModalOpen(false);
    }, [handleCreateAnnouncement]);

    // --- STYLES ---
    const styles = useMemo(() => ({
        // Layout: Flex on mobile, Grid on Desktop
        container: `flex flex-col lg:grid lg:grid-cols-3 gap-6 w-full`,
        
        // 1. HERO CARD (Left - 2/3 width)
        heroCard: `relative w-full lg:col-span-2 min-h-[320px] lg:h-[380px] rounded-[2.5rem] lg:rounded-[3rem] overflow-hidden group cursor-pointer border border-white/10 shadow-2xl`,
        heroBackground: `absolute inset-0 bg-slate-900 transition-transform duration-700 group-hover:scale-105`,
        heroContent: `relative z-20 h-full flex flex-col justify-between p-8 sm:p-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent`,
        
        // 2. DESKTOP STACK (Hidden on Mobile)
        desktopStack: `hidden lg:flex col-span-1 flex-col gap-6 h-full`,
        
        // 3. MOBILE ACTION ROW (Hidden on Desktop)
        mobileRow: `flex lg:hidden w-full gap-4`,
        
        // Desktop Cards
        // UPDATED: Removed hardcoded indigo bg, added hover brightness for gradient compatibility
        actionCard: `relative flex-1 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-lg overflow-hidden group/action cursor-pointer transition-all duration-300 hover:brightness-110 border border-white/10`,
        scheduleCard: `relative flex-1 min-h-[160px] rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden shadow-lg border border-white/10 cursor-pointer transition-transform active:scale-[0.98] group/sched`,
        
        // Mobile Buttons (Widget Style)
        mobileWidget: `relative flex-1 h-24 rounded-[2rem] flex items-center justify-between px-6 overflow-hidden shadow-lg border border-white/10 active:scale-95 transition-all`,
        
        accentGradient: `linear-gradient(135deg, var(--monet-accent) 0%, var(--monet-accent-dark) 100%)`,
    }), []);

    const hasBannerImage = bannerSettings.imageUrl && !imageError;

    return (
        <>
            <header className={styles.container}>
                
                {/* --- 1. HERO PORTAL (Always Visible) --- */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className={styles.heroCard}
                    onClick={handleBannerClick}
                >
                    {/* Background Layer */}
                    <div className={styles.heroBackground}>
                        {hasBannerImage ? (
                            <img 
                                src={bannerSettings.imageUrl} 
                                alt="Banner" 
                                className="w-full h-full object-cover opacity-90"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 animate-gradient-xy" />
                        )}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                    </div>

                    {/* Content Layer */}
                    <div className={styles.heroContent}>
                        <div className="flex items-start justify-between">
                            {bannerSettings.title ? (
                                <div className="bg-black/30 backdrop-blur-md rounded-[1.5rem] p-4 border border-white/10 max-w-md animate-in slide-in-from-top-4 fade-in duration-700">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Sparkles className="w-4 h-4 text-yellow-300" fill="currentColor" />
                                        <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-widest">Featured</span>
                                    </div>
                                    <h3 className="text-white font-bold text-lg leading-tight">{bannerSettings.title}</h3>
                                    {bannerSettings.message && <p className="text-white/80 text-xs mt-1 line-clamp-2">{bannerSettings.message}</p>}
                                    {bannerSettings.linkUrl && (
                                        <button onClick={handleLinkClick} className="mt-3 flex items-center gap-1 text-[10px] font-bold bg-white text-black px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors">
                                            {bannerSettings.linkLabel || "View"} <ArrowUpRight className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ) : <div></div>}
                            
                             {userProfile?.role === 'admin' && (
                                <div className="p-3 bg-white/10 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md w-fit">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Online</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter drop-shadow-lg leading-[0.9]">
                                {greeting}, <br />
                                <span className="text-white/80">{userProfile?.firstName}</span>
                            </h1>
                        </div>
                    </div>
                </motion.div>

                {/* --- 2. MOBILE WIDGET ROW (Visible ONLY on Mobile) --- */}
                <div className={styles.mobileRow}>
                    {/* Mobile Post Button - UPDATED to Monet */}
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className={`${styles.mobileWidget} text-white`}
                        style={{ background: styles.accentGradient }}
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                         <div className="flex flex-col items-start gap-1 relative z-10">
                             <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Compose</span>
                             <span className="text-lg font-black tracking-tight">Post</span>
                         </div>
                         <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10 relative z-10">
                            <PenTool className="w-5 h-5 text-white" />
                         </div>
                    </motion.button>

                    {/* Mobile Schedule Button */}
                    <motion.button
                         whileTap={{ scale: 0.95 }}
                         className={`${styles.mobileWidget} text-white`}
                         style={{ background: styles.accentGradient }}
                         onClick={onOpenScheduleModal}
                    >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                         <div className="flex flex-col items-start gap-1 relative z-10">
                             <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">View</span>
                             <span className="text-lg font-black tracking-tight">Schedule</span>
                         </div>
                         <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/10 relative z-10">
                            <CalendarDays className="w-5 h-5 text-white" />
                         </div>
                    </motion.button>
                </div>

                {/* --- 3. DESKTOP STACK (Visible ONLY on Large Screens) --- */}
                <div className={styles.desktopStack}>
                    
                    {/* Desktop Post Card - UPDATED to Monet */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={styles.actionCard}
                        style={{ background: styles.accentGradient }}
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                         <div className="flex justify-between items-start relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 group-hover/action:scale-110 transition-transform duration-300">
                                <PenTool className="w-6 h-6 text-white" />
                            </div>
                            <div className="bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Create</span>
                            </div>
                         </div>
                         <div className="relative z-10">
                            <h2 className="text-2xl font-black text-white tracking-tight leading-none mb-1">New Post</h2>
                            <p className="text-xs font-medium text-white/80">Share an update with your classes.</p>
                         </div>
                         <Megaphone className="absolute -bottom-4 -right-4 w-24 h-24 text-white opacity-10 -rotate-12 group-hover/action:rotate-0 group-hover/action:scale-110 transition-all duration-500" />
                    </motion.div>

                    {/* Desktop Schedule Card */}
                    <motion.div 
                        onClick={onOpenScheduleModal}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={styles.scheduleCard}
                        style={{ background: styles.accentGradient }}
                    >
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                        <div className="flex justify-between items-start relative z-10">
                            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                                <CalendarDays className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <div className="bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Schedule</span>
                            </div>
                        </div>
                        <div className="relative z-10 mt-4">
                            <AnimatePresence mode="wait">
                                {currentActivity ? (
                                    <motion.div
                                        key="activity"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <p className="text-xs font-bold text-white/70 uppercase tracking-wide mb-1">Up Next</p>
                                        <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">{currentActivity.title}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock className="w-3.5 h-3.5 text-white/80" />
                                            <span className="text-xs font-bold text-white/90">{currentActivity.time}</span>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-3"
                                    >
                                        
                                        <div>
                                            <h3 className="text-xl font-bold text-white">All Clear</h3>
                                            <p className="text-xs text-white/70 font-medium">No pending classes</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <ArrowUpRight className="absolute bottom-6 right-6 w-6 h-6 text-white/30 group-hover/sched:text-white group-hover/sched:translate-x-1 group-hover/sched:-translate-y-1 transition-all" />
                    </motion.div>
                </div>
            </header>

            {/* --- MODALS --- */}
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
                    />
                )}
            </Suspense>

            {/* Create Announcement Modal */}
            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[3rem] bg-white dark:bg-[#1E1E1E] p-8 shadow-2xl transition-all border border-slate-200 dark:border-white/10">
                                <div className="flex items-center justify-between mb-8">
                                    <Dialog.Title as="h3" className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                                        <div className="p-3.5 rounded-[1.2rem] text-white shadow-lg" style={{ background: 'var(--monet-accent)' }}><Megaphone className="w-6 h-6" strokeWidth={3} /></div>
                                        New Post
                                    </Dialog.Title>
                                    <button onClick={() => setIsCreateModalOpen(false)} className="h-11 w-11 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center hover:bg-slate-200"><X size={22} strokeWidth={2.5} /></button>
                                </div>
                                <CreateAnnouncement classes={activeClasses} onPost={handlePostAndClose} />
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default memo(DashboardHeader);