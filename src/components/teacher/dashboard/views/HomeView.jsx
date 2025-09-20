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
        // MODIFIED: Changed the background to a subtle gradient for an "aurora" feel.
        // The text color is slightly darkened for better contrast.
        <div className="relative min-h-screen p-3 sm:p-4 md:p-6 bg-gradient-to-br from-gray-50 to-sky-100 text-slate-900 font-sans overflow-hidden rounded-3xl">
            
            {/* MODIFIED: Enhanced decorative elements for a more dynamic background */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                {/* Made this blob larger, more transparent, and with slightly richer colors */}
                <div className="absolute -top-1/3 -left-1/4 w-3/4 h-3/4 bg-gradient-to-br from-cyan-200 to-violet-300 rounded-full filter blur-3xl opacity-30 animate-pulse-slow"></div>
                
                {/* Made this blob larger and more transparent */}
                <div className="absolute -bottom-1/4 -right-1/3 w-3/4 h-3/4 bg-gradient-to-tl from-rose-200 to-sky-300 rounded-full filter blur-3xl opacity-20 animate-pulse-slow animation-delay-4000"></div>

                {/* ADDED: A third blob for more color variation and depth */}
                <div className="absolute top-1/4 right-1/4 w-1/2 h-1/2 bg-gradient-to-tr from-emerald-200 to-lime-200 rounded-full filter blur-3xl opacity-15 animate-pulse-slow animation-delay-2000"></div>
            </div>

            <div className="relative z-10 space-y-4 md:space-y-6">
                <DashboardHeader
                    userProfile={userProfile}
                    showToast={showToast}
                    onOpenScheduleModal={openScheduleModal}
                />
                
                <DashboardWidgets
                    activeClassesCount={activeClasses.length}
                    onViewClasses={() => handleViewChange('classes')}
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