import React, { useState, lazy, Suspense } from 'react';

// Import the new components that make up the view
import DashboardHeader from './components/DashboardHeader';
import DashboardWidgets from './components/DashboardWidgets';
import ActivityFeed from './components/ActivityFeed';

// Import the hook for schedule data, as the modal state is managed here
import { useSchedule } from './hooks/useSchedule';

// Lazy load the modal here
const ScheduleModal = lazy(() => import('../widgets/ScheduleModal'));

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
        <div className="relative min-h-screen p-3 sm:p-4 md:p-6 bg-[#F7F9FF] text-slate-800 font-sans overflow-hidden rounded-3xl">
            {/* Background decorative elements remain */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-cyan-100 to-violet-200 rounded-full filter blur-3xl opacity-40 animate-pulse-slow"></div>
                <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-rose-100 to-sky-200 rounded-full filter blur-3xl opacity-40 animate-pulse-slow animation-delay-4000"></div>
            </div>

            <div className="relative z-10 space-y-4 md:space-y-6">
                <DashboardHeader
                    userProfile={userProfile}
                    showToast={showToast}
                    onOpenScheduleModal={openScheduleModal} // <-- Pass the handler here
                />
                
                <DashboardWidgets
                    activeClassesCount={activeClasses.length}
                    onViewClasses={() => handleViewChange('classes')}
                    onOpenScheduleModal={openScheduleModal} // <-- And also here
                />
                
                <ActivityFeed
                    userProfile={userProfile}
                    teacherAnnouncements={teacherAnnouncements}
                    activeClasses={activeClasses}
                    handleCreateAnnouncement={handleCreateAnnouncement}
                    showToast={showToast}
                />
            </div>
            
            {/* The ScheduleModal is now rendered here, in the common parent */}
            <Suspense fallback={<div>Loading Schedule...</div>}>
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
    );
};

export default HomeView;