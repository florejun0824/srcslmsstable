// src/components/teacher/dashboard/views/components/ActivityFeed.jsx
import React, { useState, lazy, Suspense, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Activity } from 'lucide-react';
import AnnouncementCard from './AnnouncementCard';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';
import { useTheme } from '../../../../../contexts/ThemeContext'; // 1. Import Theme Context

import { db } from '../../../../../services/firebase';

const AnnouncementModal = lazy(() => import('../../widgets/AnnouncementModal'));
const ReactionsBreakdownModal = lazy(() => import('../../widgets/ReactionsBreakdownModal'));

// --- HELPER: MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay) return null;

    // Common Glass Style for containers
    const glassBase = "backdrop-blur-xl border border-white/10 shadow-lg";

    switch (activeOverlay) {
        case 'christmas':
            return {
                iconBox: "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50",
                emptyState: `${glassBase} bg-slate-900/60 text-white`,
                emptyIcon: "bg-emerald-900/30 text-emerald-400",
                textColor: "text-white"
            };
        case 'valentines':
            return {
                iconBox: "bg-rose-900/60 text-rose-200 border border-rose-700/50",
                emptyState: `${glassBase} bg-rose-950/60 text-white`,
                emptyIcon: "bg-rose-900/30 text-rose-400",
                textColor: "text-white"
            };
        case 'graduation':
            return {
                iconBox: "bg-amber-900/60 text-amber-200 border border-amber-700/50",
                emptyState: `${glassBase} bg-slate-900/60 text-white`,
                emptyIcon: "bg-amber-900/30 text-amber-400",
                textColor: "text-white"
            };
        case 'rainy':
            return {
                iconBox: "bg-teal-900/60 text-teal-200 border border-teal-700/50",
                emptyState: `${glassBase} bg-slate-900/60 text-white`,
                emptyIcon: "bg-teal-900/30 text-teal-400",
                textColor: "text-white"
            };
        case 'cyberpunk':
            return {
                iconBox: "bg-purple-900/60 text-purple-200 border border-purple-700/50",
                emptyState: `${glassBase} bg-slate-900/60 text-white`,
                emptyIcon: "bg-purple-900/30 text-purple-400",
                textColor: "text-white"
            };
        case 'spring':
            return {
                iconBox: "bg-pink-900/60 text-pink-200 border border-pink-700/50",
                emptyState: `${glassBase} bg-slate-900/60 text-white`,
                emptyIcon: "bg-pink-900/30 text-pink-400",
                textColor: "text-white"
            };
        case 'space':
            return {
                iconBox: "bg-indigo-900/60 text-indigo-200 border border-indigo-700/50",
                emptyState: `${glassBase} bg-slate-950/60 text-white`,
                emptyIcon: "bg-indigo-900/30 text-indigo-400",
                textColor: "text-white"
            };
        default:
            return null;
    }
};

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

    // Theme Context
    const { activeOverlay } = useTheme();
    const monetStyles = getMonetStyles(activeOverlay);

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
            
            {/* Section Header */}
            <div className="flex items-center gap-4 px-2">
                <div className={`p-3 rounded-2xl shadow-sm ${monetStyles ? monetStyles.iconBox : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                    <Activity className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className={`text-2xl font-bold tracking-tight ${monetStyles ? monetStyles.textColor : 'text-slate-900 dark:text-white'}`}>
                        Announcements
                    </h2>
                    
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
                                // Pass monet styles down if AnnouncementCard supports it, 
                                // otherwise the card manages its own internal styling.
                                // Typically cards are white/slate-900, so we leave them standard 
                                // to pop against the colored background.
                            />
                        ))}
                    </div>
                ) : (
                    // --- Empty State with Monet Support ---
                    <div
                        className={`rounded-[32px] p-12 flex flex-col items-center justify-center text-center shadow-sm 
                        ${monetStyles 
                            ? monetStyles.emptyState 
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 
                            ${monetStyles 
                                ? monetStyles.emptyIcon 
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`}
                        >
                            <Megaphone 
                                className={`w-10 h-10 ${monetStyles ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} 
                                strokeWidth={1.5} 
                            />
                        </div>
                        <h3 className={`text-xl font-bold ${monetStyles ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            No updates yet
                        </h3>
                        <p className={`text-base mt-2 max-w-sm mx-auto ${monetStyles ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
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