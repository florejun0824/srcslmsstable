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

// Adjust import paths for these widgets as needed
import ClockWidget from '../../widgets/ClockWidget';
import InspirationCard from '../../widgets/InspirationCard';
// --- NEW: Import CreateAnnouncement ---
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 

// --- IconLink component (Refactored for Glass Pill Aesthetic) ---
const IconLink = ({ icon: Icon, text, onClick, delay }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: delay, ease: [0.2, 0.8, 0.2, 1] }}
        onClick={onClick}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center justify-center p-2 cursor-pointer group"
    >
        <div className="flex items-center justify-center w-14 h-14 bg-white/40 dark:bg-white/10 rounded-2xl backdrop-blur-sm border border-white/40 dark:border-white/5 shadow-lg group-active:scale-95 transition-all duration-300 group-hover:bg-white/60 dark:group-hover:bg-white/20">
            <Icon size={24} className="text-slate-700 dark:text-slate-200 opacity-90 group-hover:opacity-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        </div>
        <span className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center leading-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {text}
        </span>
    </motion.div>
);

// --- WidgetModal component (Glassmorphic) ---
const WidgetModal = ({ isOpen, onClose, children }) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={onClose}>
            {/* Backdrop */}
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" />
            </Transition.Child>

            {/* Modal Content */}
            <div className="fixed inset-0 overflow-y-scroll">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-[cubic-bezier(0.2,0.8,0.2,1)] duration-300"
                        enterFrom="opacity-0 scale-95 translate-y-4"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-4"
                    >
                        <Dialog.Panel className="relative w-full max-w-sm transform overflow-hidden rounded-[2rem] transition-all glass-panel p-1 shadow-2xl border border-white/40 dark:border-white/10">
                            {children}
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-300 backdrop-blur-md transition-all hover:bg-black/10 dark:hover:bg-white/20 hover:scale-105"
                                aria-label="Close"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
);


// --- MODIFIED: DashboardWidgets ---
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

    const fadeProps = (delay) => ({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.5, delay: delay, ease: [0.2, 0.8, 0.2, 1] }
    });

    return (
        <>
            {/* --- MODIFIED: Mobile-Only Icon Bar (Glass Icons) --- */}
            <div className="grid grid-cols-4 gap-2 sm:hidden px-1">
                <IconLink
                    icon={Clock}
                    text="Clock"
                    delay={0.1}
                    onClick={() => setOpenModal('clock')}
                />
                <IconLink
                    icon={Lightbulb}
                    text="Inspiration"
                    delay={0.2}
                    onClick={() => setOpenModal('inspo')}
                />
                <IconLink
                    icon={CalendarDays}
                    text="Schedule"
                    onClick={onOpenScheduleModal}
                    delay={0.3}
                />
                <IconLink
                    icon={Megaphone}
                    text="Announce"
                    onClick={() => setIsCreateModalOpen(true)}
                    delay={0.4}
                />
            </div>

            {/* --- MODIFIED: Desktop Grid (Glass Tiles) --- */}
            <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
                <motion.div {...fadeProps(0.1)} className="h-full">
                    <div className="h-full bg-white/60 dark:bg-white/5 rounded-[2rem] shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300 border border-white/40 dark:border-white/10">
                        <ClockWidget className="h-full w-full bg-transparent" />
                    </div>
                </motion.div>

                <motion.div {...fadeProps(0.2)} className="h-full">
                    <div className="h-full bg-white/60 dark:bg-white/5 rounded-[2rem] shadow-lg overflow-hidden hover:scale-[1.02] transition-transform duration-300 border border-white/40 dark:border-white/10">
                        <InspirationCard className="h-full w-full bg-transparent" />
                    </div>
                </motion.div>

                <motion.div
                    {...fadeProps(0.3)}
                    className="glass-panel p-6 rounded-[2rem] shadow-lg border border-white/40 dark:border-white/10 flex items-center justify-center flex-col text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group h-full min-h-[180px]"
                    onClick={onOpenScheduleModal}
                >
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <CalendarDays className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">Activities</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium px-4 leading-relaxed">
                        View upcoming events & schedule
                    </p>
                </motion.div>

                <motion.div
                    {...fadeProps(0.4)}
                    className="glass-panel p-6 rounded-[2rem] shadow-lg border border-white/40 dark:border-white/10 flex items-center justify-center flex-col text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group h-full min-h-[180px]"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <Megaphone className="h-7 w-7 text-orange-500 dark:text-orange-400" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg tracking-tight">Announce</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium px-4 leading-relaxed">
                        Post updates to your classes
                    </p>
                </motion.div>
            </div>

            {/* --- Clock/Inspo Modals (Using updated WidgetModal) --- */}
            <WidgetModal isOpen={openModal === 'clock'} onClose={() => setOpenModal(null)}>
                <div className="p-4">
                    <ClockWidget className="w-full bg-transparent" />
                </div>
            </WidgetModal>

            <WidgetModal isOpen={openModal === 'inspo'} onClose={() => setOpenModal(null)}>
                <div className="p-4">
                    <InspirationCard className="w-full bg-transparent" />
                </div>
            </WidgetModal>

            {/* --- NEW: Create Announcement Modal (Glassmorphic) --- */}
            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-[cubic-bezier(0.2,0.8,0.2,1)] duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-8"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-8"
                            >
                                <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-[2.5rem] glass-panel p-8 text-left align-middle shadow-2xl border border-white/40 dark:border-white/10">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tight"
                                        >
                                            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                                <Megaphone className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                                            </div>
                                            New Announcement
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-200 dark:hover:bg-white/20 hover:scale-105 active:scale-95"
                                            aria-label="Close"
                                        >
                                            <X size={18} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* The Form Itself */}
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