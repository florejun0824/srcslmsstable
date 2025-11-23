// src/components/teacher/dashboard/views/components/ActivityFeed.jsx
import React, { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Activity } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';

import { db } from '../../../../../services/firebase';

// Lazy load modals for better initial performance
const AnnouncementModal = lazy(() => import('../../widgets/AnnouncementModal'));
const ReactionsBreakdownModal = lazy(() => import('../../widgets/ReactionsBreakdownModal'));

const ActivityFeed = ({ userProfile, teacherAnnouncements, showToast }) => {
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
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -20, scale: 0.98 },
        transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }
    };

    return (
        <div className="space-y-6 w-full relative z-10">
            
            {/* Section Header */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-center gap-3 px-2"
            >
                <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-white/10 shadow-sm border border-white/50 dark:border-white/5 backdrop-blur-md">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                        Activity Feed
                    </h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
                        Latest Updates
                    </p>
                </div>
            </motion.div>

            <AnimatePresence mode="popLayout">
                {sortedAnnouncements && sortedAnnouncements.length > 0 ? (
                    sortedAnnouncements.map((post) => (
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
                    ))
                ) : (
                    // --- Empty State (Glassmorphic) ---
                    <motion.div
                        key="no-announcements"
                        {...fadeProps}
                        className="glass-panel rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center border border-white/40 dark:border-white/10 shadow-lg"
                    >
                        <div className="w-20 h-20 rounded-full bg-slate-50/50 dark:bg-white/5 flex items-center justify-center mb-5 shadow-inner">
                            <Megaphone className="w-8 h-8 text-slate-400 dark:text-slate-500 opacity-80" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">No new announcements</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
                            Your feed is currently quiet. Updates from your classes will appear here.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* --- Other Modals --- */}
            <Suspense fallback={
                <div className="fixed inset-0 flex items-center justify-center z-[100] bg-slate-900/20 backdrop-blur-sm">
                    <div className="glass-panel px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Loading...</span>
                    </div>
                </div>
            }>
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