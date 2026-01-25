import React, { lazy, Suspense, memo, useCallback, useState, useEffect, Fragment, useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { 
    CalendarDays, Clock, ArrowUpRight, Sparkles, 
    X, PenTool, Zap, Layers, GripHorizontal, Activity
} from 'lucide-react';

import { useBanner } from '../hooks/useBanner';
import { useSchedule } from '../hooks/useSchedule';
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 

const AdminBannerEditModal = lazy(() => import('../../widgets/AdminBannerEditModal'));

// --- MICRO-COMPONENTS ---

const GlowSpot = ({ mouseX, mouseY }) => {
    return (
        <motion.div
            className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
            style={{
                background: useTransform(
                    [mouseX, mouseY],
                    ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(255,255,255,0.1), transparent 40%)`
                )
            }}
        />
    );
};

// "The Gemini Beacon" - Mobile Icon
const GeminiBeacon = ({ onClick }) => (
    <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className="relative w-16 h-16 flex items-center justify-center group/beacon"
    >
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 animate-ping delay-75" />
        <div className="relative w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <svg viewBox="0 0 24 24" className="w-6 h-6 animate-pulse" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }}>
                <defs>
                    <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#f472b6" />
                    </linearGradient>
                </defs>
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#geminiGradient)" stroke="none" />
            </svg>
        </div>
    </motion.button>
);

const DashboardHeader = ({ userProfile, showToast, onOpenScheduleModal, activeClasses, handleCreateAnnouncement }) => {
    const { bannerSettings, isBannerEditModalOpen, openBannerEditModal, closeBannerEditModal } = useBanner(showToast);
    // Ensuring we pull the schedule correctly
    const { currentActivity, loading: scheduleLoading } = useSchedule(showToast, userProfile?.schoolId || 'srcs_main');
    
    // --- STATE & REFS ---
    const bannerRef = useRef(null);
    const [imageError, setImageError] = useState(false);
    const [greeting, setGreeting] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isMobileFeatureOpen, setIsMobileFeatureOpen] = useState(false);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const updateGreeting = () => {
            const h = new Date().getHours();
            setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
        };
        updateGreeting();
        const timer = setInterval(() => setTime(new Date()), 1000); 
        return () => clearInterval(timer);
    }, []);

    const handleBannerClick = useCallback((e) => { 
        if (isMobileFeatureOpen) return;
        if (userProfile?.role === 'admin' && e.target === e.currentTarget) openBannerEditModal(); 
    }, [userProfile?.role, openBannerEditModal, isMobileFeatureOpen]);

    const handleLinkClick = useCallback((e) => {
        e.stopPropagation();
        if (bannerSettings.linkUrl) window.open(bannerSettings.linkUrl, '_blank', 'noopener,noreferrer');
    }, [bannerSettings.linkUrl]);

    const handlePostAndClose = useCallback((postData) => {
        handleCreateAnnouncement(postData);
        setIsCreateModalOpen(false);
    }, [handleCreateAnnouncement]);

    // --- 3D LOGIC ---
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        x.set(mouseXVal / width - 0.5);
        y.set(mouseYVal / height - 0.5);
        mouseX.set(mouseXVal);
        mouseY.set(mouseYVal);
    };

    const handleMouseLeave = () => { x.set(0); y.set(0); };

    const rotateX = useTransform(y, [-0.5, 0.5], [2, -2]);
    const rotateY = useTransform(x, [-0.5, 0.5], [-2, 2]);

    const hasBannerImage = bannerSettings.imageUrl && !imageError;

    return (
        <Fragment>
            {/* GRID LAYOUT */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-[14px] relative">
                
                {/* --- 1. HERO BANNER --- */}
                <motion.div 
                    ref={bannerRef}
                    style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleBannerClick}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    // HEIGHT: h-[374px] Desktop
                    className="col-span-1 lg:col-span-7 lg:order-2 h-[280px] sm:h-[320px] lg:h-[374px] relative rounded-[2rem] sm:rounded-[3rem] overflow-hidden group cursor-pointer perspective-1000 shadow-xl sm:shadow-2xl dark:shadow-black/80 ring-1 ring-white/10"
                >
                    <GlowSpot mouseX={mouseX} mouseY={mouseY} />
                    
                    {/* Background Image */}
                    <div className="absolute inset-0 bg-slate-900 transform transition-transform duration-700 group-hover:scale-105 pointer-events-none">
                        {hasBannerImage ? (
                            <img 
                                src={bannerSettings.imageUrl} 
                                alt="Banner" 
                                className="w-full h-full object-cover opacity-80 lg:opacity-90"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <div className="w-full h-full relative overflow-hidden bg-slate-900">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black" />
                                <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-[var(--monet-accent)] rounded-full mix-blend-overlay blur-[100px] sm:blur-[150px] opacity-40 animate-pulse" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 lg:from-black via-black/20 to-transparent" />
                    </div>

                    {/* Content Layer */}
                    <div className="absolute inset-0 p-5 sm:p-12 lg:p-8 flex flex-col justify-between z-20 pointer-events-none">
                        
                        {/* Mobile Greeting (Hidden on Desktop) */}
                        <div className="lg:hidden flex flex-col w-full mt-2">
                             <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-3 px-4 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 w-fit mb-2 shadow-lg">
                                    <Clock className="w-3 h-3 text-[var(--monet-accent)]" />
                                    <div className="h-3 w-[1px] bg-white/20" />
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-widest font-mono">
                                        <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="opacity-50">|</span>
                                        <span>{time.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col relative pl-4">
                                    <div className="absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b from-[var(--monet-accent)] to-purple-500 rounded-full shadow-[0_0_10px_var(--monet-accent)]" />
                                    <span className="text-xs font-bold text-white/80 uppercase tracking-[0.2em] mb-0.5 drop-shadow-md">{greeting},</span>
                                    <span className="text-3xl font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                        {userProfile?.firstName || 'Educator'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 w-full mt-auto relative h-full justify-end">
                            
                            {/* --- MOBILE: GEMINI BEACON --- */}
                            {bannerSettings.title && (
                                <div className="lg:hidden pointer-events-auto flex items-end justify-between px-2 pb-2">
                                    <GeminiBeacon onClick={(e) => { e.stopPropagation(); setIsMobileFeatureOpen(true); }} />
                                    {userProfile?.role === 'admin' && (
                                        <button onClick={(e) => { e.stopPropagation(); openBannerEditModal(); }} className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg">
                                            <Zap className="w-3 h-3 text-yellow-400" fill="currentColor" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Edit</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Mobile Reveal Overlay */}
                            <AnimatePresence>
                                {isMobileFeatureOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        className="lg:hidden absolute bottom-0 left-0 right-0 pointer-events-auto bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 p-6 rounded-t-[2rem] shadow-2xl z-50 flex flex-col gap-4"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-3 h-3 text-indigo-400 fill-indigo-400 animate-pulse" />
                                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Featured Highlight</span>
                                            </div>
                                            <button onClick={() => setIsMobileFeatureOpen(false)} className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20"><X className="w-5 h-5" /></button>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 leading-tight mb-3">{bannerSettings.title}</h2>
                                            {bannerSettings.message && <p className="text-sm text-white/70 leading-relaxed font-medium">{bannerSettings.message}</p>}
                                        </div>
                                        {bannerSettings.linkUrl && (
                                            <button onClick={handleLinkClick} className="mt-2 w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold text-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                                                {bannerSettings.linkLabel || "Explore Content"}
                                                <ArrowUpRight className="w-4 h-4" />
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* --- DESKTOP: DRAGGABLE CARD --- */}
                            {bannerSettings.title && (
                                <div className="hidden lg:flex w-full h-full relative">
                                    <motion.div 
                                        drag
                                        dragConstraints={bannerRef}
                                        dragElastic={0.1}
                                        dragMomentum={false}
                                        whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                                        initial={{ x: 0, y: 0 }}
                                        className="pointer-events-auto absolute bottom-0 left-0 cursor-grab active:cursor-grabbing w-full max-w-[360px]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-[2rem] shadow-2xl overflow-hidden group/card relative">
                                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-white/20 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-full bg-yellow-400/20 text-yellow-300">
                                                        <Sparkles className="w-3 h-3" fill="currentColor" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Featured</span>
                                                </div>
                                                <GripHorizontal className="w-4 h-4 text-white/30 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                            </div>
                                            <h2 className="text-xl font-bold text-white leading-tight mb-2 drop-shadow-md">{bannerSettings.title}</h2>
                                            {bannerSettings.message && (
                                                <p className="text-xs text-white/80 leading-relaxed line-clamp-2 mb-3">{bannerSettings.message}</p>
                                            )}
                                            {bannerSettings.linkUrl && (
                                                <button 
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={handleLinkClick}
                                                    className="w-full py-2 bg-white text-black rounded-xl font-bold text-[10px] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide"
                                                >
                                                    {bannerSettings.linkLabel || "Explore"}
                                                    <ArrowUpRight className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>

                                    <div className="pointer-events-none absolute bottom-0 right-0 flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                             <div className="relative flex h-2 w-2">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
                                            </div>
                                            <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">Online</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                             <Layers className="w-3 h-3 text-[var(--monet-accent)]" />
                                             <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">SRCS Main</span>
                                        </div>
                                        {userProfile?.role === 'admin' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openBannerEditModal(); }}
                                                className="pointer-events-auto px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5 hover:bg-black/60 transition-colors cursor-pointer"
                                            >
                                                <Zap className="w-3 h-3 text-yellow-400" fill="currentColor" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* --- 2. LEFT COLUMN (Action Buttons & Desktop Greeting) --- */}
                <div className="col-span-1 lg:col-span-5 lg:order-1 flex flex-col gap-4 lg:gap-[14px] h-full">
                    
                    {/* DESKTOP GREETING - HEIGHT: h-[220px] */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hidden lg:flex relative group p-6 rounded-[2.5rem] bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 overflow-hidden flex-col justify-between shadow-xl dark:shadow-black/50 h-[220px]"
                    >
                         {/* Dynamic Background Mesh */}
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay z-10" />
                         <div className="absolute top-[-50%] left-[-50%] w-[150%] h-[150%] animate-spin-slow opacity-30 pointer-events-none">
                            <div className="absolute top-[20%] left-[30%] w-[50%] h-[50%] bg-[var(--monet-accent)] rounded-full mix-blend-multiply filter blur-[80px] animate-blob" />
                            <div className="absolute top-[20%] right-[30%] w-[50%] h-[50%] bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-2000" />
                            <div className="absolute bottom-[20%] left-[40%] w-[50%] h-[50%] bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000" />
                         </div>
                         
                         <div className="relative z-20 flex flex-col h-full justify-between">
                            {/* Top: Visually Stunning Clock */}
                            <div className="flex items-start justify-between w-full">
                                <div className="flex flex-col">
                                     <h2 className="text-5xl font-thin tracking-tighter text-slate-800 dark:text-white leading-[0.9]">
                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' AM', '').replace(' PM', '')}
                                        <span className="text-lg font-bold text-[var(--monet-accent)] ml-1">
                                            {time.toLocaleTimeString([], { hour12: true }).slice(-2)}
                                        </span>
                                     </h2>
                                     <div className="flex items-center gap-2 mt-1">
                                        <div className="h-[2px] w-6 bg-[var(--monet-accent)]" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </span>
                                     </div>
                                </div>
                                <div className="p-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
                                    <Sparkles className="w-5 h-5 text-[var(--monet-accent)]" />
                                </div>
                            </div>

                            {/* Bottom: Typography Flip */}
                            <div className="flex flex-col gap-0.5 mb-1">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] opacity-80">
                                    {greeting},
                                </h3>
                                <h1 className="text-4xl xl:text-4xl font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-600 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-indigo-400 leading-[0.9] drop-shadow-sm py-1 truncate">
                                    {userProfile?.firstName || 'Educator'}
                                </h1>
                            </div>
                         </div>
                    </motion.div>

                    {/* ACTION BUTTONS - HEIGHT: h-[140px] - GRID 5 (2/3 Split) */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-[14px] flex-1">
                        
                        {/* POST BUTTON (2 Cols) */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setIsCreateModalOpen(true)}
                            className="relative col-span-1 lg:col-span-2 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-[var(--monet-accent)] to-[var(--monet-accent)]/80 border border-white/20 p-5 lg:p-4 flex flex-col justify-between group overflow-hidden h-[150px] sm:h-auto lg:h-[140px] shadow-lg"
                        >
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 blur-2xl rounded-full" />
                            <div className="h-9 w-9 lg:h-8 lg:w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-12 transition-transform duration-300">
                                <PenTool className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-left relative z-10">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/70 mb-0.5">New</span>
                                <span className="block text-lg lg:text-base font-bold text-white tracking-tight">Post</span>
                            </div>
                        </motion.button>

                        {/* SCHEDULE WIDGET (3 Cols) */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={onOpenScheduleModal}
                            className="relative col-span-1 lg:col-span-3 rounded-[2rem] sm:rounded-[2.5rem] bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-white/10 p-5 lg:p-4 flex flex-col justify-between group overflow-hidden shadow-sm hover:shadow-lg transition-all h-[150px] sm:h-auto lg:h-[140px]"
                        >
                             <div className="absolute top-5 right-5 lg:top-4 lg:right-4 flex">
                                <span className={`flex h-2 w-2 relative ${currentActivity ? 'opacity-100' : 'opacity-0'}`}>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--monet-accent)] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-full w-full bg-[var(--monet-accent)]"></span>
                                </span>
                             </div>
                             
                             <div className="flex items-start justify-between w-full">
                                <div className="h-9 w-9 lg:h-8 lg:w-8 rounded-full bg-white dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/5">
                                    <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-300" />
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1 lg:mr-6">{currentActivity ? 'Happening Now' : 'Up Next'}</span>
                             </div>

                             <div className="text-left relative z-10 w-full mt-auto">
                                {currentActivity ? (
                                    <div className="flex flex-col">
                                        <span className="text-sm lg:text-sm font-black text-slate-800 dark:text-white leading-tight line-clamp-1 mb-1">{currentActivity.title}</span>
                                        <div className="flex items-center gap-1 text-[10px] lg:text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            <span className="truncate">{currentActivity.time}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="text-sm lg:text-sm font-black text-slate-800 dark:text-white leading-tight">All Clear</span>
                                        <span className="text-[10px] lg:text-[10px] font-medium text-slate-400">No classes right now</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Decorative Wave for Schedule */}
                            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-[var(--monet-accent)] opacity-5 blur-2xl rounded-full" />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* --- MODALS (Unchanged) --- */}
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

            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#1E1E1E] p-6 sm:p-8 shadow-2xl transition-all border border-slate-200 dark:border-white/10 relative">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--monet-accent)] blur-[80px] opacity-10 pointer-events-none" />
                                    <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
                                        <Dialog.Title as="h3" className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight">
                                            Compose
                                        </Dialog.Title>
                                        <button onClick={() => setIsCreateModalOpen(false)} className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-red-500 flex items-center justify-center transition-colors">
                                            <X size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                    <CreateAnnouncement classes={activeClasses} onPost={handlePostAndClose} />
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </Fragment>
    );
};

export default memo(DashboardHeader);