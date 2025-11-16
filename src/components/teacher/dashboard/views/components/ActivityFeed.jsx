import React, { useState, lazy, Suspense, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';

// Adjust these import paths to match your project structure
// NO LONGER NEEDED: import CreateAnnouncement from '../../widgets/CreateAnnouncement';
import { db } from '../../../../../services/firebase';

// Lazy load modals for better initial performance
const AnnouncementModal = lazy(() => import('../../widgets/AnnouncementModal'));
const ReactionsBreakdownModal = lazy(() => import('../../widgets/ReactionsBreakdownModal'));

// --- MODIFIED: Removed props related to creating announcements ---
const ActivityFeed = ({ userProfile, teacherAnnouncements, showToast }) => {
    // ... (All existing hooks for announcements and reactions remain unchanged) ...
    const { 
        sortedAnnouncements, 
        editingAnnId, 
        editingAnnText, 
        setEditingAnnText, 
        expandedAnnouncements,
        handleStartEditAnn,
        handleCancelEdit,
        handleUpdateTeacherAnn,
        handleDeleteTeacherAnn,
        handleTogglePinAnnouncement,
        toggleAnnouncementExpansion,
    } = useAnnouncements(teacherAnnouncements, showToast);
    
    const { postReactions, usersMap, handleTogglePostReaction } = useReactions(teacherAnnouncements, userProfile?.id, showToast);

    // --- MODIFIED: State for modals ---
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

    // --- REMOVED: All state and handlers for Create Modal ---

    // ... (All other modal handlers remain unchanged) ...
    const openAnnouncementModal = (announcement) => {
        setSelectedAnnouncement(announcement);
        setIsAnnouncementModalOpen(true);
    };
	const closeAnnouncementModal = () => {
	    setIsAnnouncementModalOpen(false);
	    setSelectedAnnouncement(null);
	};
    const openReactionsBreakdownModal = (reactions, users) => {
        setReactionsForBreakdownModal({ reactions, users });
        setIsReactionsBreakdownModalOpen(true);
    };
    const closeReactionsBreakdownModal = () => {
        setIsReactionsBreakdownModalOpen(false);
        setReactionsForBreakdownModal(null);
    };


    const fadeProps = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.4, ease: "easeInOut" }
    };

    return (
        // --- MODIFIED: Removed the outer grid container ---
        <div className="space-y-6">
            {/* --- REMOVED: The entire 'Create Announcement' lg:col-span-1 column --- */}

            {/* --- MODIFIED: This is now the main container, removed 'lg:col-span-2' --- */}
            <motion.div {...fadeProps} className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Activity Feed</h2>
            </motion.div>
            <AnimatePresence>
                {sortedAnnouncements && sortedAnnouncements.length > 0 ? sortedAnnouncements.map((post) => (
                    <AnnouncementCard
                        key={post.id}
                        post={post}
                        userProfile={userProfile}
                        authorProfile={usersMap[post.teacherId]}
                        postReactions={postReactions[post.id] || {}}
                        usersMap={usersMap}
                        isEditing={editingAnnId === post.id}
                        editingText={editingAnnText}
                        isExpanded={!!expandedAnnouncements[post.id]}
                        onTextChange={setEditingAnnText}
                        onSave={handleUpdateTeacherAnn}
                        onCancelEdit={handleCancelEdit}
                        onStartEdit={handleStartEditAnn}
                        onDelete={handleDeleteTeacherAnn}
                        onTogglePin={handleTogglePinAnnouncement}
                        onToggleReaction={handleTogglePostReaction}
                        onToggleExpansion={toggleAnnouncementExpansion}
                        onViewComments={openAnnouncementModal}
                        onViewReactions={openReactionsBreakdownModal}
                    />
                )) : (
                    <motion.div
                        key="no-announcements"
                        {...fadeProps}
                        className="text-center text-slate-500 dark:text-slate-400 py-12 rounded-3xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark"
                    >
                        <Megaphone className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
                        <p className="text-lg font-semibold">No new announcements.</p>
                        <p className="text-sm">Be the first to post an update!</p>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* --- Other Modals (Unchanged) --- */}
            <Suspense fallback={<div className="text-slate-900 dark:text-slate-100">Loading...</div>}>
                {isAnnouncementModalOpen && (
                    <AnnouncementModal
                        isOpen={isAnnouncementModalOpen}
                        onClose={closeAnnouncementModal}
                        announcement={selectedAnnouncement}
                        userProfile={userProfile}
                        db={db}
                        postReactions={selectedAnnouncement ? postReactions[selectedAnnouncement.id] : {}}
                        onToggleReaction={handleTogglePostReaction}
                        usersMap={usersMap}
                    />
                )}
                {isReactionsBreakdownModalOpen && (
                    <ReactionsBreakdownModal
                        isOpen={isReactionsBreakdownModalOpen}
                        onClose={closeReactionsBreakdownModal}
                        reactionsData={reactionsForBreakdownModal?.reactions}
                        usersMap={reactionsForBreakdownModal?.users}
                    />
                )}
            </Suspense>

            {/* --- REMOVED: Create Announcement Modal --- */}
        </div>
    );
};

export default ActivityFeed;