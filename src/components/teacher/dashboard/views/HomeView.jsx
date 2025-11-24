// src/components/teacher/dashboard/views/HomeView.jsx
import React, { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion'; 
import DashboardHeader from './components/DashboardHeader';
import DashboardWidgets from './components/DashboardWidgets';
import ActivityFeed from './components/ActivityFeed';
import { useSchedule } from './hooks/useSchedule';

const ScheduleModal = lazy(() => import('../widgets/ScheduleModal'));

const auroraStyles = `
  @keyframes aurora-move {
    0% { transform: translate3d(0px, 0px, 0px) scale(1); }
    33% { transform: translate3d(30px, -50px, 0px) scale(1.1); }
    66% { transform: translate3d(-20px, 20px, 0px) scale(0.9); }
    100% { transform: translate3d(0px, 0px, 0px) scale(1); }
  }
  .animate-aurora {
    animation: aurora-move 15s infinite ease-in-out; /* Slowed down animation */
    will-change: transform;
  }
  .animation-delay-2000 { animation-delay: 2s; }
  .animation-delay-4000 { animation-delay: 4s; }
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
            <style>{auroraStyles}</style>

            {/* OPTIMIZED BACKGROUND: Removed mix-blend-mode, reduced blur, used opacity for blending */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 transform-gpu translate-z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-300/30 dark:bg-indigo-600/10 rounded-full blur-[60px] animate-aurora" />
                <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-500/30 dark:bg-blue-600/10 rounded-full blur-[60px] animate-aurora animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[10%] w-[60vw] h-[60vw] bg-sky-300/30 dark:bg-cyan-600/10 rounded-full blur-[60px] animate-aurora animation-delay-4000" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full space-y-8 font-sans pb-32 lg:pb-8 relative z-10"
                // PERF: content-visibility allows browser to skip rendering off-screen content
                style={{ contentVisibility: 'auto' }} 
            >
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
                
                <Suspense fallback={null}>
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

export default React.memo(HomeView);