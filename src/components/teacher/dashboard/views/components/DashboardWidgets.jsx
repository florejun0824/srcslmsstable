import React, { useState, useEffect, Fragment, memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { 
    CalendarDays, 
    X, 
    Megaphone,
    Sparkles 
} from 'lucide-react';

import ClockWidget from '../../widgets/ClockWidget';
import InspirationCard from '../../widgets/InspirationCard';
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 
import { useTheme } from '../../../../../contexts/ThemeContext';

// --- CUSTOM HOOK: Responsive Check ---
// Optimization: Ensures we don't render hidden timers in the background
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.matchMedia("(max-width: 639px)").matches);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);
    return isMobile;
};

// --- STYLES ---
const styles = {
    mobileIcon: `relative w-full aspect-square rounded-[1.8rem] flex flex-col items-center justify-center gap-1 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-xl active:scale-90 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] border border-white/20 overflow-hidden isolate`,
    desktopCard: `relative overflow-hidden transition-all duration-300 h-full rounded-[2.8rem] border border-white/20 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 hover:shadow-2xl hover:-translate-y-1`,
    glassIconBox: `w-16 h-16 rounded-[1.2rem] flex items-center justify-center mb-5 bg-white/20 backdrop-blur-xl shadow-inner border border-white/20`
};

// --- COMPONENTS ---

// 1. Live Clock Button for Mobile
const MobileClockButton = memo(({ onClick, style }) => {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateString = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onClick}
            className={styles.mobileIcon}
            style={style}
        >
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
             <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />
             <div className="relative z-10 flex flex-col items-center justify-center">
                 <span className="text-[17px] font-black text-white leading-none drop-shadow-md mb-1">{timeString}</span>
                 <span className="text-[9px] font-bold text-white/90 uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{dateString}</span>
             </div>
        </motion.button>
    );
});

// 2. Inspiration Quote Button for Mobile
const shortQuotes = ["Dream Big", "Be Kind", "Stay True", "Focus", "Shine On", "Create", "Inspire"];
const MobileInspirationButton = memo(({ onClick, style }) => {
    const [quote, setQuote] = useState("");
    useEffect(() => { setQuote(shortQuotes[Math.floor(Math.random() * shortQuotes.length)]); }, []);

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onClick}
            className={styles.mobileIcon}
            style={style}
        >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-1 text-center">
                <Sparkles size={14} className="text-white/80 mb-1" />
                <span className="text-[10px] font-black text-white leading-tight uppercase tracking-wide">"{quote}"</span>
            </div>
        </motion.button>
    );
});

const IconLink = memo(({ icon: Icon, text, onClick, style }) => (
    <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onClick}
        className={styles.mobileIcon}
        style={style}
    >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />
        <Icon size={28} strokeWidth={2.5} className="text-white drop-shadow-md relative z-10" />
        <span className="text-[10px] font-bold text-white/95 relative z-10 tracking-widest uppercase">{text}</span>
    </motion.button>
));

const WidgetModal = ({ isOpen, onClose, children }) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={onClose}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-scroll">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-90 translate-y-20" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-90 translate-y-20">
                        <Dialog.Panel className="relative w-full max-w-sm transform overflow-hidden rounded-[2.5rem] bg-[#F8F9FA] dark:bg-[#121212] p-2 shadow-2xl transition-all border border-white/50 dark:border-white/10">
                            {children}
                            <button type="button" onClick={onClose} className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/60 dark:bg-black/40 text-slate-500 hover:bg-white dark:hover:bg-slate-700 transition-colors backdrop-blur-md shadow-sm">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
);

const DashboardWidgets = ({ onOpenScheduleModal, activeClasses, handleCreateAnnouncement }) => {
    const [openModal, setOpenModal] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const isMobile = useIsMobile();
    
    // Use Callbacks for stable references
    const handlePostAndCloseModal = useCallback((postData) => {
        handleCreateAnnouncement(postData); 
        setIsCreateModalOpen(false); 
    }, [handleCreateAnnouncement]);

    // Memoize accent style
    const accentStyle = useMemo(() => ({
        background: `linear-gradient(145deg, var(--monet-accent) 0%, var(--monet-accent-dark) 100%)`,
        color: 'white',
        boxShadow: `0 15px 40px -10px rgba(0,0,0,0.4)`, 
        border: '1px solid rgba(255,255,255,0.2)', 
    }), []);

    return (
        <>
            {/* OPTIMIZATION: Conditionally Render based on isMobile to prevent background timers */}
            {isMobile ? (
                /* --- Mobile-Only Action Bar --- */
                <div className="grid grid-cols-4 gap-4 px-2 mb-6">
                    <MobileClockButton style={accentStyle} onClick={() => setOpenModal('clock')} />
                    <MobileInspirationButton style={accentStyle} onClick={() => setOpenModal('inspo')} />
                    <IconLink icon={CalendarDays} text="Schedule" style={accentStyle} onClick={onOpenScheduleModal} />
                    <IconLink icon={Megaphone} text="Post" style={accentStyle} onClick={() => setIsCreateModalOpen(true)} />
                </div>
            ) : (
                /* --- Desktop Grid --- */
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="h-full">
                        <div className={`${styles.desktopCard} bg-white dark:bg-slate-900`}>
                            <ClockWidget className="h-full w-full bg-transparent" />
                        </div>
                    </div>
                    <div className="h-full">
                        <div className={`${styles.desktopCard} bg-white dark:bg-slate-900`}>
                            <InspirationCard className="h-full w-full bg-transparent" />
                        </div>
                    </div>
                    <div className={`${styles.desktopCard} group cursor-pointer flex flex-col items-center justify-center text-center p-8`} style={accentStyle} onClick={onOpenScheduleModal}>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`${styles.glassIconBox} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-spring`}>
                                <CalendarDays className="h-8 w-8 text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-white text-3xl tracking-tighter drop-shadow-sm">Activities</h3>
                            <p className="text-sm text-white/80 mt-2 font-bold uppercase tracking-widest px-4">View Events</p>
                        </div>
                    </div>
                    <div className={`${styles.desktopCard} group cursor-pointer flex flex-col items-center justify-center text-center p-8`} style={accentStyle} onClick={() => setIsCreateModalOpen(true)}>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center">
                            <div className={`${styles.glassIconBox} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ease-spring`}>
                                <Megaphone className="h-8 w-8 text-white drop-shadow-md" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-white text-3xl tracking-tighter drop-shadow-sm">Announce</h3>
                            <p className="text-sm text-white/80 mt-2 font-bold uppercase tracking-widest px-4">New Post</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Modals --- */}
            <WidgetModal isOpen={openModal === 'clock'} onClose={() => setOpenModal(null)}>
                <div className="p-2"><ClockWidget className="w-full bg-transparent" /></div>
            </WidgetModal>

            <WidgetModal isOpen={openModal === 'inspo'} onClose={() => setOpenModal(null)}>
                <div className="p-2"><InspirationCard className="w-full bg-transparent" /></div>
            </WidgetModal>

            {/* --- Create Announcement Modal --- */}
            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child as={Fragment} enter="ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-500" enterFrom="opacity-0 scale-90 translate-y-10" enterTo="opacity-100 scale-100 translate-y-0" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-90 translate-y-10">
                                <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-[3rem] bg-white dark:bg-[#1E1E1E] p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-white/10">
                                    <div className="flex items-center justify-between mb-8">
                                        <Dialog.Title as="h3" className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-4 tracking-tighter">
                                            <div className="p-3.5 rounded-[1.2rem] shadow-lg shadow-black/5" style={accentStyle}><Megaphone className="w-6 h-6 text-white" strokeWidth={3} /></div>
                                            New Post
                                        </Dialog.Title>
                                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all shadow-sm active:scale-90"><X size={22} strokeWidth={2.5} /></button>
                                    </div>
                                    <CreateAnnouncement classes={activeClasses} onPost={handlePostAndCloseModal} />
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default memo(DashboardWidgets);