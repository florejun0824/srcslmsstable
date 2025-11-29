// src/components/teacher/dashboard/components/DashboardWidgets.jsx
import React, { useState, Fragment, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { 
    CalendarDays, 
    Clock, 
    Lightbulb,
    X,
    Megaphone 
} from 'lucide-react';

import ClockWidget from '../../widgets/ClockWidget';
import InspirationCard from '../../widgets/InspirationCard';
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 

// --- CANDY STYLES ---

// Base style for cards and buttons (Rounded, Shadow, Inset Highlight)
const candyBase = `
    relative overflow-hidden transition-all duration-300 
    shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]
    after:absolute after:inset-0 after:pointer-events-none 
    after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]
`;

// 1. Mobile App Icon Style
const mobileIconStyle = `
    ${candyBase}
    w-full aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-1
    border border-white/20 dark:border-white/5
`;

// 2. Desktop Card Style
const desktopCardStyle = `
    ${candyBase}
    h-full rounded-[2.5rem] border border-white/40 dark:border-white/5
    shadow-xl shadow-slate-200/50 dark:shadow-black/50
`;

// 3. Glassy Icon Box (Inside cards)
const glassIconBox = `
    w-16 h-16 rounded-2xl flex items-center justify-center mb-4
    bg-white/30 dark:bg-black/20 backdrop-blur-md
    shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]
    border border-white/30 dark:border-white/10
`;

// --- COMPONENTS ---

// Updated IconLink for Mobile (Looks like an App Icon)
const IconLink = ({ icon: Icon, text, onClick, gradient }) => (
    <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`${mobileIconStyle} ${gradient}`}
    >
        {/* Gloss Shine */}
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />
        
        <Icon size={26} strokeWidth={2.5} className="text-white drop-shadow-sm relative z-10" />
        <span className="text-[11px] font-bold text-white/90 relative z-10 tracking-wide">
            {text}
        </span>
    </motion.button>
);

const WidgetModal = ({ isOpen, onClose, children }) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={onClose}>
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterTo="opacity-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-scroll">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="relative w-full max-w-sm transform overflow-hidden rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 p-1 shadow-2xl transition-all border border-white/50 dark:border-white/10">
                            {children}
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/50 dark:bg-black/30 text-slate-500 hover:bg-white dark:hover:bg-slate-700 transition-colors backdrop-blur-md"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
);

const DashboardWidgets = ({ 
    onOpenScheduleModal,
    activeClasses,
    handleCreateAnnouncement 
}) => {
    const [openModal, setOpenModal] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const handlePostAndCloseModal = (postData) => {
        handleCreateAnnouncement(postData); 
        setIsCreateModalOpen(false); 
    };

    return (
        <>
            {/* --- Mobile-Only Action Bar (Candy Icons) --- */}
            <div className="grid grid-cols-4 gap-3 sm:hidden px-1 mb-4">
                <IconLink
                    icon={Clock}
                    text="Clock"
                    gradient="bg-gradient-to-br from-indigo-400 to-violet-600 shadow-indigo-500/30"
                    onClick={() => setOpenModal('clock')}
                />
                <IconLink
                    icon={Lightbulb}
                    text="Inspo"
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/30"
                    onClick={() => setOpenModal('inspo')}
                />
                <IconLink
                    icon={CalendarDays}
                    text="Schedule"
                    gradient="bg-gradient-to-br from-blue-400 to-cyan-500 shadow-blue-500/30"
                    onClick={onOpenScheduleModal}
                />
                <IconLink
                    icon={Megaphone}
                    text="Post"
                    gradient="bg-gradient-to-br from-rose-400 to-pink-600 shadow-rose-500/30"
                    onClick={() => setIsCreateModalOpen(true)}
                />
            </div>

            {/* --- Desktop Grid (Candy Tiles) --- */}
            <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* 1. Clock Widget Container (Ceramic/Glass Look) */}
                <div className="h-full">
                    <div className={`${desktopCardStyle} bg-white dark:bg-slate-900`}>
                        <ClockWidget className="h-full w-full bg-transparent" />
                    </div>
                </div>

                {/* 2. Inspiration Widget Container (Ceramic/Glass Look) */}
                <div className="h-full">
                    <div className={`${desktopCardStyle} bg-white dark:bg-slate-900`}>
                        <InspirationCard className="h-full w-full bg-transparent" />
                    </div>
                </div>

                {/* 3. Activities Card (Vibrant Blue Candy) */}
                <div
                    className={`${desktopCardStyle} bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 group cursor-pointer flex flex-col items-center justify-center text-center p-6`}
                    onClick={onOpenScheduleModal}
                >
                    {/* Gloss Shine */}
                    <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className={`${glassIconBox} group-hover:rotate-6 transition-transform duration-300`}>
                            <CalendarDays className="h-8 w-8 text-white drop-shadow-md" strokeWidth={2} />
                        </div>
                        <h3 className="font-black text-white text-2xl tracking-tight drop-shadow-sm">Activities</h3>
                        <p className="text-sm text-blue-100 mt-2 font-medium px-4 leading-relaxed opacity-90">
                            View upcoming events
                        </p>
                    </div>
                </div>

                {/* 4. Announcement Card (Vibrant Orange/Pink Candy) */}
                <div
                    className={`${desktopCardStyle} bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 group cursor-pointer flex flex-col items-center justify-center text-center p-6`}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    {/* Gloss Shine */}
                    <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/20 to-transparent rotate-45 pointer-events-none" />

                    <div className="relative z-10">
                        <div className={`${glassIconBox} group-hover:-rotate-6 transition-transform duration-300`}>
                            <Megaphone className="h-8 w-8 text-white drop-shadow-md" strokeWidth={2} />
                        </div>
                        <h3 className="font-black text-white text-2xl tracking-tight drop-shadow-sm">Announce</h3>
                        <p className="text-sm text-orange-100 mt-2 font-medium px-4 leading-relaxed opacity-90">
                            Post class updates
                        </p>
                    </div>
                </div>
            </div>

            {/* --- Clock/Inspo Modals --- */}
            <WidgetModal isOpen={openModal === 'clock'} onClose={() => setOpenModal(null)}>
                <div className="p-2">
                    <ClockWidget className="w-full bg-transparent" />
                </div>
            </WidgetModal>

            <WidgetModal isOpen={openModal === 'inspo'} onClose={() => setOpenModal(null)}>
                <div className="p-2">
                    <InspirationCard className="w-full bg-transparent" />
                </div>
            </WidgetModal>

            {/* --- Create Announcement Modal --- */}
            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-4"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-4"
                            >
                                <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-8">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight"
                                        >
                                            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 shadow-md">
                                                <Megaphone className="w-6 h-6 text-white" strokeWidth={2.5} />
                                            </div>
                                            New Announcement
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm"
                                            aria-label="Close"
                                        >
                                            <X size={20} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    <CreateAnnouncement 
                                        classes={activeClasses} 
                                        onPost={handlePostAndCloseModal} 
                                    />
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