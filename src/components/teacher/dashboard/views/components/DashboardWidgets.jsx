import React, { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { Dialog, Transition } from '@headlessui/react';
import { 
    CalendarDays, 
    Clock, 
    Lightbulb,
    X,
    Megaphone // <-- Added Megaphone icon
} from 'lucide-react';

// Adjust import paths for these widgets as needed
import ClockWidget from '../../widgets/ClockWidget';
import InspirationCard from '../../widgets/InspirationCard';
// --- NEW: Import CreateAnnouncement ---
import CreateAnnouncement from '../../widgets/CreateAnnouncement'; 

// --- IconLink component (unchanged) ---
const IconLink = ({ icon: Icon, text, onClick, delay }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: delay }}
        onClick={onClick}
        className="flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
    >
        <div className="flex items-center justify-center w-14 h-14 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all">
            <Icon size={26} />
        </div>
        <span className="mt-2 text-xs font-medium text-center h-8 flex items-center justify-center leading-tight">
            {text}
        </span>
    </motion.div>
);

// --- WidgetModal component (unchanged) ---
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            </Transition.Child>

            {/* Modal Content */}
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
                        <Dialog.Panel className="relative w-full max-w-sm transform overflow-hidden rounded-3xl transition-all">
                            {children}
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white/80 backdrop-blur-sm transition-all hover:bg-black/40 hover:text-white"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
);


// --- MODIFIED: Added new props for creating announcements ---
const DashboardWidgets = ({ 
    onOpenScheduleModal,
    activeClasses,
    handleCreateAnnouncement 
}) => {
    // State for Clock/Inspo modals
    const [openModal, setOpenModal] = useState(null);
    // --- NEW: State for Create Announcement modal ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // --- NEW: Wrapper function to close modal after posting ---
    const handlePostAndCloseModal = (postData) => {
        handleCreateAnnouncement(postData); // Call original function
        setIsCreateModalOpen(false); // Close the modal
    };

    const fadeProps = (delay) => ({
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, delay: delay }
    });

    return (
        <>
            {/* --- MODIFIED: Mobile-Only Icon Bar --- */}
            <div className="grid grid-cols-4 gap-1 sm:hidden">
                <IconLink
                    icon={Clock}
                    text="Clock"
                    delay={0.1}
                    onClick={() => setOpenModal('clock')}
                />
                <IconLink
                    icon={Lightbulb}
                    text="Today's Inspiration"
                    delay={0.2}
                    onClick={() => setOpenModal('inspo')}
                />
                <IconLink
                    icon={CalendarDays}
                    text="Schedule"
                    onClick={onOpenScheduleModal}
                    delay={0.3}
                />
                {/* --- REPLACED 'Classes' with 'Create Post' --- */}
                <IconLink
                    icon={Megaphone}
                    text="Create Announcement"
                    onClick={() => setIsCreateModalOpen(true)}
                    delay={0.4}
                />
            </div>

            {/* --- MODIFIED: Original Grid --- */}
            <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                <motion.div {...fadeProps(0.1)}>
                    <ClockWidget className="h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" />
                </motion.div>

                <motion.div {...fadeProps(0.2)}>
                    <InspirationCard className="h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark" />
                </motion.div>

                <motion.div
                    {...fadeProps(0.3)}
                    className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-center flex-col text-center cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                    onClick={onOpenScheduleModal}
                >
                    <CalendarDays className="h-10 w-10 text-sky-500 dark:text-sky-400 mb-2" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Schedule of Activities</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Click to view what's coming up.</p>
                </motion.div>

                {/* --- REPLACED 'Active Classes' with 'Create Announcement' card --- */}
                <motion.div
                    {...fadeProps(0.4)}
                    className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark flex items-center justify-center flex-col text-center cursor-pointer transition-shadow duration-300 hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Megaphone className="h-10 w-10 text-sky-500 dark:text-sky-400 mb-2" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Create Announcement</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Share an update with teachers or students.</p>
                </motion.div>
            </div>

            {/* --- Clock/Inspo Modals (unchanged) --- */}
            <WidgetModal isOpen={openModal === 'clock'} onClose={() => setOpenModal(null)}>
                <ClockWidget className="h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark" />
            </WidgetModal>

            <WidgetModal isOpen={openModal === 'inspo'} onClose={() => setOpenModal(null)}>
                <InspirationCard className="h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark" />
            </WidgetModal>

            {/* --- NEW: Create Announcement Modal (Moved from ActivityFeed) --- */}
            <Transition appear show={isCreateModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => setIsCreateModalOpen(false)}>
                    {/* Backdrop */}
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    {/* Modal Content */}
                    <div className="fixed inset-0 overflow-y-auto">
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
                                <Dialog.Panel className="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 text-left align-middle shadow-xl transition-all">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3"
                                        >
                                            <Megaphone className="w-6 h-6 text-sky-500" />
                                            Create Announcement
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="flex h-9 w-9 items-center justify-center rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark text-slate-600 dark:text-slate-300 transition-all hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark"
                                            aria-label="Close"
                                        >
                                            <X size={20} />
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

export default DashboardWidgets;