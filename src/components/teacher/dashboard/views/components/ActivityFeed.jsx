// src/components/teacher/dashboard/views/components/ActivityFeed.jsx
import React, { useState, lazy, Suspense, memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { Megaphone, Activity, Pin, Calendar, Sparkles } from 'lucide-react';
import { motion, useMotionValue } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore'; 

import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';
import { useTheme } from '../../../../../contexts/ThemeContext'; 
import { db } from '../../../../../services/firebase';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar'; 

const AnnouncementModal = lazy(() => import('../../widgets/AnnouncementModal'));
const ReactionsBreakdownModal = lazy(() => import('../../widgets/ReactionsBreakdownModal'));

// --- OPTIMIZATION 1: Extract Date Logic outside component to prevent recreation ---
const formatDate = (createdAt) => {
    try {
        if (!createdAt) return '';
        const dateObj = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return new Intl.DateTimeFormat('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric' 
        }).format(dateObj);
    } catch (e) {
        return 'Recent';
    }
};

// --- OPTIMIZATION 2: Memoize the Bubble Component ---
// This prevents the entire list from re-rendering when one item changes
const AnnouncementBubble = memo(({ post, authorProfile, onClick, containerRef, onPositionChange }) => {
    // Refs
    const isDragging = useRef(false);

    // Generate fallback random positions ONCE
    const randomOffsets = useRef({
        x: Math.random() * 40 - 20,
        y: Math.random() * 30 - 15
    });

    // Initialize Motion Values
    const x = useMotionValue(post.position?.x ?? randomOffsets.current.x);
    const y = useMotionValue(post.position?.y ?? randomOffsets.current.y);

    // Sync only if position differs significantly to avoid layout thrashing
    useEffect(() => {
        if (post.position?.x !== undefined && post.position?.y !== undefined && !isDragging.current) {
            x.set(post.position.x);
            y.set(post.position.y);
        }
    }, [post.position, x, y]);

    // Compute Date Label
    const dateLabel = useMemo(() => formatDate(post.createdAt), [post.createdAt]);

    // Randomize animation timings once
    const floatDuration = useMemo(() => 5 + Math.random() * 3, []); 
    const swayDuration = useMemo(() => 3 + Math.random() * 2, []);  

    const handleDragStart = () => { isDragging.current = true; };
    
    const handleDragEnd = () => { 
        setTimeout(() => { isDragging.current = false; }, 100);
        if (onPositionChange) {
            onPositionChange(post.id, { x: x.get(), y: y.get() });
        }
    };

    const handleTap = () => { if (!isDragging.current) onClick(post); };

    return (
        <motion.div
            drag
            dragConstraints={containerRef}
            dragElastic={0.2}
            dragMomentum={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{ x, y, touchAction: "none" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ type: "spring", duration: 0.6 }}
            whileHover={{ zIndex: 100 }}
            whileDrag={{ scale: 1.1, cursor: "grabbing", zIndex: 100 }}
            // OPTIMIZATION 3: will-change-transform helps browser GPU rendering
            className="relative cursor-grab active:cursor-grabbing m-8 sm:m-12 select-none will-change-transform"
        >
            <motion.div
                animate={{ y: [-8, 8, -8] }} 
                transition={{ 
                    duration: floatDuration, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                className="relative flex flex-col items-center"
            >
                {/* 1. THE LIQUID ORB */}
                <div 
                    onClick={handleTap}
                    // OPTIMIZATION 4: Added 'transform-gpu' to force hardware acceleration
                    className={`
                        relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all duration-500 z-20 group
                        shadow-[inset_0_-8px_12px_rgba(0,0,0,0.2),_0_15px_35px_-5px_rgba(0,0,0,0.3)] 
                        dark:shadow-[inset_0_-8px_12px_rgba(0,0,0,0.5),_0_15px_35px_-5px_rgba(255,255,255,0.05)]
                        backdrop-blur-2xl transform-gpu
                        ${post.isPinned 
                            ? 'bg-amber-100/20 ring-2 ring-amber-300/40' 
                            : 'bg-white/20 dark:bg-white/5 ring-1 ring-white/30 dark:ring-white/10'
                        }
                    `}
                >
                    {/* Specular Highlights (Optimized opacity) */}
                    <div className="absolute top-4 left-6 w-10 h-6 bg-gradient-to-br from-white/90 to-transparent rounded-[100%] rotate-[-45deg] opacity-70 blur-[2px] z-30 pointer-events-none" />
                    <div className="absolute bottom-3 right-5 w-12 h-8 bg-gradient-to-tl from-white/40 to-transparent rounded-[100%] rotate-[-45deg] opacity-40 blur-[4px] z-30 pointer-events-none" />

                    {/* Content (Avatar) */}
                    <div className="relative z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden p-1 bg-gradient-to-b from-white/10 to-transparent shadow-inner pointer-events-none group-hover:scale-105 transition-transform duration-500">
                        <div className="w-full h-full rounded-full overflow-hidden shadow-2xl">
                            <UserInitialsAvatar user={authorProfile} size="full" />
                        </div>
                    </div>

                    {/* Pinned Badge */}
                    {post.isPinned && (
                        <div className="absolute -top-1 -right-1 z-40 bg-gradient-to-br from-amber-300 to-yellow-600 text-white p-1.5 rounded-full shadow-[0_4px_12px_rgba(245,158,11,0.5)] ring-2 ring-white/50 animate-pulse">
                            <Pin size={12} fill="currentColor" />
                        </div>
                    )}
                </div>

                {/* 2. THE TAG (With Full Date) */}
                <motion.div
                    animate={{ rotate: [2, -2, 2] }}
                    transition={{ duration: swayDuration, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[95%] flex flex-col items-center z-10 origin-top pointer-events-none will-change-transform"
                >
                    <div className="w-[1.5px] h-4 bg-gradient-to-b from-white/50 to-transparent dark:from-white/30" />

                    <motion.button 
                        onClick={handleTap}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                            pointer-events-auto relative group
                            flex items-center gap-2 px-4 py-2 rounded-full 
                            backdrop-blur-md shadow-[0_8px_16px_-6px_rgba(0,0,0,0.3)]
                            border border-white/40 dark:border-white/10
                            transition-all duration-300 overflow-hidden transform-gpu
                            ${post.isPinned
                                ? 'bg-gradient-to-r from-amber-500/90 to-orange-600/90 text-white shadow-amber-500/20'
                                : 'bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 shadow-indigo-500/10'
                            }
                        `}
                    >
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />

                        <div className="relative z-10 flex items-center gap-2">
                            {post.isPinned ? (
                                <>
                                    <Sparkles size={12} className="text-yellow-200 animate-pulse" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Important</span>
                                </>
                            ) : (
                                <>
                                    <Calendar size={12} strokeWidth={2.5} className="opacity-60 group-hover:opacity-100 transition-opacity text-indigo-500 dark:text-indigo-400" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                                        {dateLabel}
                                    </span>
                                </>
                            )}
                        </div>
                        
                        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ring-2 ring-indigo-500/30 dark:ring-white/20" />
                    </motion.button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
    // Comparison function for memo to ensure deep equality check avoids unnecessary renders
}, (prevProps, nextProps) => {
    return (
        prevProps.post.id === nextProps.post.id &&
        prevProps.post.position?.x === nextProps.post.position?.x &&
        prevProps.post.position?.y === nextProps.post.position?.y &&
        prevProps.post.isPinned === nextProps.post.isPinned &&
        prevProps.post.createdAt === nextProps.post.createdAt &&
        prevProps.authorProfile === nextProps.authorProfile
    );
});

const ActivityFeed = ({ userProfile, teacherAnnouncements, showToast }) => {
    const containerRef = useRef(null); 

    const { 
        sortedAnnouncements, 
        handleStartEditAnn,
        handleDeleteTeacherAnn,
        editingAnnId, 
        editingAnnText, 
        setEditingAnnText, 
        handleUpdateTeacherAnn,
        handleCancelEdit,
    } = useAnnouncements(teacherAnnouncements, showToast);
    
    const { postReactions, usersMap, handleTogglePostReaction } = useReactions(teacherAnnouncements, userProfile?.id, showToast);
    const { activeOverlay } = useTheme();

    const monetStyles = useMemo(() => {
        if (!activeOverlay) return null;
        const glassBase = "backdrop-blur-none border border-white/10 shadow-lg"; 
        switch (activeOverlay) {
            case 'christmas': return { iconBox: "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50", emptyState: `${glassBase} bg-slate-900/60 text-white`, emptyIcon: "bg-emerald-900/30 text-emerald-400", textColor: "text-white" };
            case 'valentines': return { iconBox: "bg-rose-900/60 text-rose-200 border border-rose-700/50", emptyState: `${glassBase} bg-rose-950/60 text-white`, emptyIcon: "bg-rose-900/30 text-rose-400", textColor: "text-white" };
            case 'graduation': return { iconBox: "bg-amber-900/60 text-amber-200 border border-amber-700/50", emptyState: `${glassBase} bg-slate-900/60 text-white`, emptyIcon: "bg-amber-900/30 text-amber-400", textColor: "text-white" };
            case 'rainy': return { iconBox: "bg-teal-900/60 text-teal-200 border border-teal-700/50", emptyState: `${glassBase} bg-slate-900/60 text-white`, emptyIcon: "bg-teal-900/30 text-teal-400", textColor: "text-white" };
            case 'cyberpunk': return { iconBox: "bg-purple-900/60 text-purple-200 border border-purple-700/50", emptyState: `${glassBase} bg-slate-900/60 text-white`, emptyIcon: "bg-purple-900/30 text-purple-400", textColor: "text-white" };
            case 'spring': return { iconBox: "bg-pink-900/60 text-pink-200 border border-pink-700/50", emptyState: `${glassBase} bg-slate-900/60 text-white`, emptyIcon: "bg-pink-900/30 text-pink-400", textColor: "text-white" };
            case 'space': return { iconBox: "bg-indigo-900/60 text-indigo-200 border border-indigo-700/50", emptyState: `${glassBase} bg-slate-950/60 text-white`, emptyIcon: "bg-indigo-900/30 text-indigo-400", textColor: "text-white" };
            default: return null;
        }
    }, [activeOverlay]);

    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isReactionsBreakdownModalOpen, setIsReactionsBreakdownModalOpen] = useState(false);
    const [reactionsForBreakdownModal, setReactionsForBreakdownModal] = useState(null);

    const openAnnouncementModal = useCallback((announcement) => { 
        setSelectedAnnouncement(announcement); 
        setIsAnnouncementModalOpen(true); 
    }, []);
    
    const closeAnnouncementModal = useCallback(() => { 
        setIsAnnouncementModalOpen(false); 
        setSelectedAnnouncement(null); 
    }, []);
    
    const closeReactionsBreakdownModal = useCallback(() => { 
        setIsReactionsBreakdownModalOpen(false); 
        setReactionsForBreakdownModal(null); 
    }, []);

    const handlePositionChange = useCallback(async (id, newPos) => {
        const COLLECTION_NAME = 'teacherAnnouncements'; 
        try {
            const annRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(annRef, {
                position: newPos
            });
        } catch (error) {
            console.error("FAILED TO SAVE POSITION:", error);
        }
    }, []);

    return (
        <div className="space-y-6 w-full relative z-10 pb-8 min-h-[400px]">
            <div className="flex items-center gap-4 px-2">
                <div className={`p-3 rounded-2xl shadow-sm ${monetStyles ? monetStyles.iconBox : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                    <Activity className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className={`text-2xl font-bold tracking-tight ${monetStyles ? monetStyles.textColor : 'text-slate-900 dark:text-white'}`}>
                        Activity Stream
                    </h2>
                    <p className={`text-xs ${monetStyles ? 'text-white/70' : 'text-slate-500'}`}>Interactive • Drag to float</p>
                </div>
            </div>

            {sortedAnnouncements && sortedAnnouncements.length > 0 ? (
                <div 
                    ref={containerRef}
                    className="w-full min-h-[600px] rounded-[3rem] bg-slate-50/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 relative flex flex-wrap content-start p-8 overflow-visible"
                >
                    <div className="absolute inset-0 opacity-10 pointer-events-none rounded-[3rem] overflow-hidden" style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                    {sortedAnnouncements.map((post) => (
                        <AnnouncementBubble
                            key={post.id}
                            post={post}
                            authorProfile={usersMap[post.teacherId]}
                            onClick={openAnnouncementModal}
                            containerRef={containerRef}
                            onPositionChange={handlePositionChange}
                        />
                    ))}
                </div>
            ) : (
                <div className={`rounded-[32px] p-12 flex flex-col items-center justify-center text-center shadow-sm ${monetStyles ? monetStyles.emptyState : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'}`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${monetStyles ? monetStyles.emptyIcon : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Megaphone className={`w-10 h-10 ${monetStyles ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={1.5} />
                    </div>
                    <h3 className={`text-xl font-bold ${monetStyles ? 'text-white' : 'text-slate-900 dark:text-white'}`}>No updates yet</h3>
                    <p className={`text-base mt-2 max-w-sm mx-auto ${monetStyles ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>It looks quiet here. Post an announcement to get things started!</p>
                </div>
            )}
            
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
                        isEditing={editingAnnId === selectedAnnouncement?.id}
                        editingText={editingAnnText}
                        onTextChange={setEditingAnnText}
                        onSave={handleUpdateTeacherAnn}
                        onCancelEdit={handleCancelEdit}
                        onStartEdit={handleStartEditAnn}
                        onDelete={handleDeleteTeacherAnn}
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