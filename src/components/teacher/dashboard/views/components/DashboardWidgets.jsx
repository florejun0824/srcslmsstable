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

// --- IconLink component ---
const IconLink = ({ icon: Icon, text, onClick, delay, colorClass = "bg-slate-100 text-slate-700" }) => (
    // Kept motion here as it's a small interaction element, but removed delay if desired or kept for stagger
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center justify-center cursor-pointer group w-full"
    >
        <div className={`flex items-center justify-center w-full h-14 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-200 group-hover:shadow-md ${colorClass}`}>
            <Icon size={24} strokeWidth={2} className="opacity-90 group-hover:scale-110 transition-transform duration-200" />
        </div>
        <span className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-400 text-center leading-tight">
            {text}
        </span>
    </motion.div>
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
                <div className="fixed inset-0 bg-black/50" />
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
                        <Dialog.Panel className="relative w-full max-w-sm transform overflow-hidden rounded-[28px] bg-white dark:bg-slate-900 p-1 shadow-xl transition-all border border-slate-200 dark:border-slate-700">
                            {children}
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
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
            {/* --- Mobile-Only Action Bar --- */}
            <div className="grid grid-cols-4 gap-3 sm:hidden px-1">
                <IconLink
                    icon={Clock}
                    text="Clock"
                    colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                    onClick={() => setOpenModal('clock')}
                />
                <IconLink
                    icon={Lightbulb}
                    text="Inspo"
                    colorClass="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
                    onClick={() => setOpenModal('inspo')}
                />
                <IconLink
                    icon={CalendarDays}
                    text="Schedule"
                    onClick={onOpenScheduleModal}
                    colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                />
                <IconLink
                    icon={Megaphone}
                    text="Post"
                    onClick={() => setIsCreateModalOpen(true)}
                    colorClass="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300"
                />
            </div>

            {/* --- Desktop Grid (Solid Tiles, No Entrance Animation) --- */}
            <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* 1. Clock Widget Container */}
                {/* CHANGED: motion.div -> div, removed fadeProps */}
                <div className="h-full">
                    <div className="h-full bg-white dark:bg-slate-900 rounded-[28px] shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden hover:scale-[1.01] transition-all duration-200">
                        <ClockWidget className="h-full w-full bg-transparent" />
                    </div>
                </div>

                {/* 2. Inspiration Widget Container */}
                <div className="h-full">
                    <div className="h-full bg-white dark:bg-slate-900 rounded-[28px] shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden hover:scale-[1.01] transition-all duration-200">
                        <InspirationCard className="h-full w-full bg-transparent" />
                    </div>
                </div>

                {/* 3. Activities Card (Interactive) */}
                <div
                    className="bg-white dark:bg-slate-900 p-6 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-col text-center cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md group h-full min-h-[180px]"
                    onClick={onOpenScheduleModal}
                >
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 shadow-sm group-hover:rotate-6 transition-transform duration-200">
                        <CalendarDays className="h-8 w-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">Activities</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium px-4 leading-relaxed">
                        View upcoming events
                    </p>
                </div>

                {/* 4. Announcement Card (Interactive) */}
                <div
                    className="bg-white dark:bg-slate-900 p-6 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-col text-center cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md group h-full min-h-[180px]"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4 shadow-sm group-hover:-rotate-6 transition-transform duration-200">
                        <Megaphone className="h-8 w-8 text-orange-600 dark:text-orange-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">Announce</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium px-4 leading-relaxed">
                        Post class updates
                    </p>
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
                        <div className="fixed inset-0 bg-black/50" />
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
                                <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-[32px] bg-white dark:bg-slate-900 p-8 text-left align-middle shadow-2xl transition-all border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-8">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight"
                                        >
                                            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                                <Megaphone className="w-5 h-5 text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
                                            </div>
                                            New Announcement
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                            aria-label="Close"
                                        >
                                            <X size={20} strokeWidth={2} />
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