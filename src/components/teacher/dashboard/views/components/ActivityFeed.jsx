// src/components/teacher/dashboard/views/components/ActivityFeed.jsx
import React, { useState, lazy, Suspense, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Activity } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';

import { db } from '../../../../../services/firebase';

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

    return (
        <div className="space-y-6 w-full relative z-10 pb-8">
            
            {/* Section Header - Removed entrance animation */}
            <div className="flex items-center gap-4 px-2">
                <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm">
                    <Activity className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Activity Feed
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Latest updates from your classes
                    </p>
                </div>
            </div>

            <AnimatePresence mode="popLayout">
                {sortedAnnouncements && sortedAnnouncements.length > 0 ? (
                    <div className="flex flex-col gap-6">
                         {sortedAnnouncements.map((post) => (
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
                        ))}
                    </div>
                ) : (
                    // --- Empty State - Removed entrance animation ---
                    <div
                        className="bg-white dark:bg-slate-900 rounded-[32px] p-12 flex flex-col items-center justify-center text-center border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                            <Megaphone className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No updates yet</h3>
                        <p className="text-base text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
                            It looks quiet here. Post an announcement to get things started!
                        </p>
                    </div>
                )}
            </AnimatePresence>
            
            <Suspense fallback={null}>
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

export default memo(ActivityFeed);