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
        // MODIFIED: Replaced the entire background with our new solid 'neumorphic-base' color.
        // This creates the neutral canvas for our "popped up" elements.
        <div className="min-h-screen p-3 sm:p-4 md:p-6 bg-neumorphic-base font-sans">
            
            {/* REMOVED: The decorative divs for the old "aurora" background are gone. */}

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