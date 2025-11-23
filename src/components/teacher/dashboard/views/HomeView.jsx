// src/components/teacher/dashboard/views/HomeView.jsx
import React, { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion'; 

// Import the new components that make up the view
import DashboardHeader from './components/DashboardHeader';
import DashboardWidgets from './components/DashboardWidgets';
import ActivityFeed from './components/ActivityFeed';

// Import the hook for schedule data, as the modal state is managed here
import { useSchedule } from './hooks/useSchedule';

// Lazy load the modal here
const ScheduleModal = lazy(() => import('../widgets/ScheduleModal'));

const auroraStyles = `
  @keyframes aurora-move {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-aurora {
    animation: aurora-move 12s infinite ease-in-out;
  }
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

const HomeView = ({
    showToast,
    userProfile,
    teacherAnnouncements,
    handleCreateAnnouncement,
    activeClasses,
    handleViewChange
}) => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    const {
        scheduleActivities,
        onAddActivity,
        onUpdateActivity,
        onDeleteActivity,
    } = useSchedule(showToast);

    const openScheduleModal = () => setIsScheduleModalOpen(true);
    const closeScheduleModal = () => setIsScheduleModalOpen(false);
    
    return (
        <>
            {/* Inject Custom Aurora Animation Styles */}
            <style>{auroraStyles}</style>

            {/* --- FIX APPLIED: MOVED BACKGROUND OUTSIDE MOTION.DIV ---
               This prevents the 'fixed' position from being clipped by the 
               Framer Motion transform context. It will now cover the entire screen
               including the top header area.
            */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 transform translate-z-0">
                {/* Orb 1: Top Left - Indigo/Blue (Cooler tone) */}
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-300/40 dark:bg-indigo-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-aurora" />
                
                {/* Orb 2: Top Right - Primary Blue (Stronger Opacity for visibility) */}
                <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-500/40 dark:bg-blue-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-aurora animation-delay-2000" />
                
                {/* Orb 3: Bottom Left - Sky/Cyan (Replaced Pink to remove redness) */}
                <div className="absolute bottom-[-20%] left-[10%] w-[60vw] h-[60vw] bg-sky-300/40 dark:bg-cyan-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-aurora animation-delay-4000" />
            </div>

            {/* Main Content - Animated Container */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                className="w-full space-y-8 font-sans pb-32 lg:pb-8 relative z-10"
            >
                {/* Main Content Container */}
                <div className="flex flex-col gap-6 sm:gap-8">
                    
                    <DashboardHeader
                        userProfile={userProfile}
                        showToast={showToast}
                        onOpenScheduleModal={openScheduleModal}
                    />
                    
                    <DashboardWidgets
                        activeClasses={activeClasses}
                        handleCreateAnnouncement={handleCreateAnnouncement}
                        onOpenScheduleModal={openScheduleModal}
                    />
                    
                    <ActivityFeed
                        userProfile={userProfile}
                        teacherAnnouncements={teacherAnnouncements}
                        activeClasses={activeClasses}
                        handleCreateAnnouncement={handleCreateAnnouncement}
                        showToast={showToast}
                    />
                </div>
                
                {/* Glassmorphic Loading State */}
                <Suspense fallback={
                    <div className="flex justify-center w-full py-8">
                        <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Loading Schedule...</span>
                        </div>
                    </div>
                }>
                    {isScheduleModalOpen && (
                         <ScheduleModal
                            isOpen={isScheduleModalOpen}
                            onClose={closeScheduleModal}
                            userRole={userProfile?.role}
                            scheduleActivities={scheduleActivities}
                            onAddActivity={onAddActivity}
                            onUpdateActivity={onUpdateActivity}
                            onDeleteActivity={onDeleteActivity}
                        />
                    )}
                </Suspense>
            </motion.div>
        </>
    );
};

export default HomeView;