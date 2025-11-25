// src/components/teacher/dashboard/views/HomeView.jsx
import React, { useState, lazy, Suspense, memo } from 'react';
// Removed motion import since we aren't using it for entrance anymore
import DashboardHeader from './components/DashboardHeader';
import DashboardWidgets from './components/DashboardWidgets';
import ActivityFeed from './components/ActivityFeed';
import { useSchedule } from './hooks/useSchedule';

const ScheduleModal = lazy(() => import('../widgets/ScheduleModal'));

// --- OPTIMIZED BACKGROUND (STATIC & VIBRANT) ---
const AuroraBackground = memo(() => (
    <div className="fixed inset-0 pointer-events-none z-0 bg-slate-50 dark:bg-[#0f1115]">
        <div className="absolute inset-0 opacity-80 dark:opacity-40"
             style={{
                 backgroundImage: `
                    radial-gradient(at 0% 0%, rgba(165, 180, 252, 0.7) 0px, transparent 55%),
                    radial-gradient(at 100% 0%, rgba(103, 232, 249, 0.6) 0px, transparent 55%),
                    radial-gradient(at 100% 100%, rgba(147, 197, 253, 0.6) 0px, transparent 55%),
                    radial-gradient(at 0% 100%, rgba(216, 180, 254, 0.6) 0px, transparent 55%)
                 `
             }}
        />
        <div className="hidden dark:block absolute inset-0 bg-[#0f1115]/70" />
    </div>
));

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
            <AuroraBackground />

            {/* CHANGED: Replaced motion.div with standard div and removed initial/animate props */}
            <div 
                className="w-full space-y-8 font-sans pb-32 lg:pb-8 relative z-10"
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
            </div>
        </>
    );
};

export default React.memo(HomeView);