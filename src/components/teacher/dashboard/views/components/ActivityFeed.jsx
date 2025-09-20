import React, { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';

// Adjust these import paths to match your project structure
import CreateAnnouncement from '../../widgets/CreateAnnouncement';
import { db } from '../../../../../services/firebase';

// Lazy load modals for better initial performance
const AnnouncementModal = lazy(() => import('../../widgets/AnnouncementModal'));
const ReactionsBreakdownModal = lazy(() => import('../../widgets/ReactionsBreakdownModal'));

const ActivityFeed = ({ userProfile, teacherAnnouncements, activeClasses, handleCreateAnnouncement, showToast }) => {
    // State and handlers for all announcements, fetched from our custom hook
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
    
    // State and handlers for all reactions, fetched from our custom hook
    const { postReactions, usersMap, handleTogglePostReaction } = useReactions(teacherAnnouncements, userProfile?.id, showToast);

    // State for managing the visibility of modals
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
                {...fadeProps}
                // MODIFIED: Replaced bg-white/60 with a subtle gradient and a colored shadow for the aurora effect.
                className="lg:col-span-1 p-6 bg-gradient-to-br from-white/70 to-sky-100/50 backdrop-blur-xl rounded-3xl shadow-xl shadow-sky-300/20 hover:shadow-2xl hover:shadow-sky-300/30 transition-all duration-300 border border-white/70 transform hover:-translate-y-2 hover:scale-[1.01]"
            >
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-sky-100 p-3 rounded-2xl">
                        <Megaphone className="w-6 h-6 text-sky-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Create Announcement</h2>
                    </div>
                </div>
                <CreateAnnouncement classes={activeClasses} onPost={handleCreateAnnouncement} />
            </motion.div>

            <div className="lg:col-span-2 space-y-6">
                <motion.div {...fadeProps} className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800">Activity Feed</h2>
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
                            // MODIFIED: Updated the placeholder to have a gradient background and improved text contrast.
                            className="text-center text-slate-500 py-12 border-2 border-dashed border-sky-200/80 rounded-3xl bg-gradient-to-br from-sky-50/50 to-violet-50/50"
                        >
                            <Megaphone className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-lg font-semibold">No new announcements.</p>
                            <p className="text-sm">Be the first to post an update!</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <Suspense fallback={<div>Loading...</div>}>
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
        </div>
    );
};

export default ActivityFeed;