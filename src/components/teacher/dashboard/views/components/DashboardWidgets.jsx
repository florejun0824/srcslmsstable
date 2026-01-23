import React, { useState, Fragment, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { 
    CalendarDays, 
    X, 
    Megaphone,
    Clock,
    Sparkles
} from 'lucide-react';

import ClockWidget from '../../widgets/ClockWidget';
import InspirationCard from '../../widgets/InspirationCard';
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 

// --- KINETIC ACTION RAIL ITEM ---
const RailItem = ({ icon: Icon, label, onClick, colorClass, delay }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.button
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: delay }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative h-16 rounded-[1.5rem] flex items-center justify-center overflow-hidden border border-white/10 shadow-lg backdrop-blur-xl transition-all duration-300 ${isHovered ? 'px-6 bg-white/20 dark:bg-white/10' : 'w-16 bg-white/10 dark:bg-black/20'}`}
        >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            
            <motion.div layout className={`relative z-10 flex items-center gap-3 ${colorClass}`}>
                <Icon size={24} strokeWidth={2.5} />
                <AnimatePresence>
                    {isHovered && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="font-bold text-sm whitespace-nowrap overflow-hidden"
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.button>
    );
};

// --- MODAL WRAPPER (Resuable) ---
const WidgetModal = ({ isOpen, onClose, children }) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={onClose}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md" aria-hidden="true" />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-[2.5rem] bg-[#F8F9FA] dark:bg-[#121212] p-2 shadow-2xl transition-all border border-white/10">
                        {children}
                        <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-slate-500 hover:bg-black/20 transition-colors backdrop-blur-md">
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </Dialog.Panel>
                </div>
            </div>
        </Dialog>
    </Transition>
);

const DashboardWidgets = ({ onOpenScheduleModal, activeClasses, handleCreateAnnouncement }) => {
    const [openModal, setOpenModal] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const handlePostAndCloseModal = useCallback((postData) => {
        handleCreateAnnouncement(postData); 
        setIsCreateModalOpen(false); 
    }, [handleCreateAnnouncement]);

    return (
        <>
            {/* --- KINETIC ACTION RAIL --- */}
            <div className="w-full flex items-center justify-between sm:justify-start gap-3 sm:gap-4 py-2 overflow-x-auto no-scrollbar">
                
                {/* 1. Global Clock */}
                <RailItem 
                    icon={Clock} 
                    label="World Clock" 
                    onClick={() => setOpenModal('clock')} 
                    colorClass="text-blue-500 dark:text-blue-400"
                    delay={0.3}
                />

                {/* 2. Inspiration */}
                <RailItem 
                    icon={Sparkles} 
                    label="Daily Inspo" 
                    onClick={() => setOpenModal('inspo')} 
                    colorClass="text-amber-500 dark:text-amber-400"
                    delay={0.4}
                />

                {/* 3. Full Schedule */}
                <RailItem 
                    icon={CalendarDays} 
                    label="Full Schedule" 
                    onClick={onOpenScheduleModal} 
                    colorClass="text-emerald-500 dark:text-emerald-400"
                    delay={0.5}
                />

                {/* 4. Announcement (Highlighted) */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    onClick={() => setIsCreateModalOpen(true)}
                    className="ml-auto sm:ml-0 h-16 px-8 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-3 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <Megaphone size={20} strokeWidth={2.5} />
                    <span className="font-bold text-sm hidden sm:block">New Post</span>
                </motion.button>
            </div>

            {/* --- MODALS --- */}
            <WidgetModal isOpen={openModal === 'clock'} onClose={() => setOpenModal(null)}>
                <div className="p-2"><ClockWidget className="w-full bg-transparent" /></div>
            </WidgetModal>

            <WidgetModal isOpen={openModal === 'inspo'} onClose={() => setOpenModal(null)}>
                <div className="p-2"><InspirationCard className="w-full bg-transparent" /></div>
            </WidgetModal>

            {/* Create Post Modal */}
            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[3rem] bg-white dark:bg-[#1E1E1E] p-8 shadow-2xl transition-all border border-slate-200 dark:border-white/10">
                                <div className="flex items-center justify-between mb-8">
                                    <Dialog.Title as="h3" className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                                        <div className="p-3.5 rounded-[1.2rem] bg-indigo-600 text-white shadow-lg"><Megaphone className="w-6 h-6" strokeWidth={3} /></div>
                                        New Post
                                    </Dialog.Title>
                                    <button onClick={() => setIsCreateModalOpen(false)} className="h-11 w-11 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 flex items-center justify-center hover:bg-slate-200"><X size={22} strokeWidth={2.5} /></button>
                                </div>
                                <CreateAnnouncement classes={activeClasses} onPost={handlePostAndCloseModal} />
                            </Dialog.Panel>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default memo(DashboardWidgets);