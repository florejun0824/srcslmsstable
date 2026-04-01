import React, { useState, lazy, Suspense, memo, useCallback, useMemo, useEffect } from 'react';
import { Megaphone, Activity, Sparkles, ArrowRight, ExternalLink, Pin, PinOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { useReactions } from '../hooks/useReactions';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { db } from '../../../../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import UserInitialsAvatar from '../../../../../components/common/UserInitialsAvatar';
import ReactMarkdown from 'react-markdown';
import { getWorker } from '../../../../../workers/workerApi';

const AnnouncementModal = lazy(() => import('../../widgets/AnnouncementModal'));
const ReactionsBreakdownModal = lazy(() => import('../../widgets/ReactionsBreakdownModal'));

// --- UTILITY: DATE FORMATTER ---
const formatDateDetails = (createdAt) => {
    try {
        if (!createdAt) return { day: '00', month: 'ABC', time: '00:00' };
        const dateObj = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return {
            day: new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(dateObj),
            month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj).toUpperCase(),
            time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(dateObj),
            full: new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(dateObj)
        };
    } catch (e) {
        return { day: '--', month: 'NOW', time: '--:--' };
    }
};

// --- UTILITY: FULL MARKDOWN RENDERER ---
const MarkdownRenderer = memo(({ content }) => {
    if (!content) return null;
    return (
        <ReactMarkdown
            components={{
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline break-all transition-colors z-20 relative font-semibold" onClick={(e) => e.stopPropagation()} />,
                p: ({node, ...props}) => <p {...props} className="mb-3 last:mb-0 leading-relaxed" />,
                h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-black mt-5 mb-3 text-slate-900 dark:text-white tracking-tight" />,
                h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold mt-4 mb-3 text-slate-800 dark:text-slate-100" />,
                h3: ({node, ...props}) => <h3 {...props} className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100" />,
                ul: ({node, ...props}) => <ul {...props} className="list-disc pl-6 mb-3 space-y-1.5 marker:text-indigo-400" />,
                ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-6 mb-3 space-y-1.5 marker:text-indigo-400 font-medium" />,
                li: ({node, ...props}) => <li {...props} className="" />,
                strong: ({node, ...props}) => <strong {...props} className="font-extrabold text-slate-900 dark:text-white" />,
                em: ({node, ...props}) => <em {...props} className="italic text-slate-700 dark:text-slate-300" />,
                hr: ({node, ...props}) => <hr {...props} className="my-5 border-t-2 border-slate-200/60 dark:border-white/10" />,
                blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-indigo-300 dark:border-indigo-500/30 pl-4 py-1 italic my-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r-lg" />,
                code: ({node, inline, ...props}) => inline 
                    ? <code {...props} className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-pink-600 dark:text-pink-400" /> 
                    : <pre className="bg-slate-900 dark:bg-black/50 p-4 rounded-xl overflow-x-auto text-[13px] font-mono text-slate-300 my-4 shadow-inner ring-1 ring-white/10"><code {...props} /></pre>
            }}
        >
            {content}
        </ReactMarkdown>
    );
});

// --- UTILITY: TIMELINE MARKDOWN RENDERER ---
const CompactMarkdownRenderer = memo(({ content }) => {
    if (!content) return null;
    return (
        <ReactMarkdown
            components={{
                a: ({node, ...props}) => <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{props.children}</span>,
                p: ({node, ...props}) => <span className="inline mr-2" {...props} />,
                h1: ({node, ...props}) => <span className="inline font-bold mr-2 w-full truncate" {...props}>{props.children}</span>,
                h2: ({node, ...props}) => <span className="inline font-bold mr-2 w-full truncate" {...props}>{props.children}</span>,
                h3: ({node, ...props}) => <span className="inline font-bold mr-2 w-full truncate" {...props}>{props.children}</span>,
                ul: ({node, ...props}) => <span className="inline line-clamp-1" {...props}>{props.children}</span>,
                ol: ({node, ...props}) => <span className="inline line-clamp-1" {...props}>{props.children}</span>,
                li: ({node, ...props}) => <span className="inline mr-2" {...props}>• {props.children}</span>,
                strong: ({node, ...props}) => <strong className="font-extrabold text-slate-900 dark:text-white" {...props} />,
                em: ({node, ...props}) => <em className="italic text-slate-700 dark:text-slate-300" {...props} />,
                hr: () => <span className="mx-2 text-slate-400">|</span>,
                blockquote: ({node, ...props}) => <span className="inline italic text-slate-500" {...props}>&quot;{props.children}&quot;</span>,
                code: ({node, inline, ...props}) => <span className="font-mono text-pink-600 dark:text-pink-400" {...props} />
            }}
        >
            {content}
        </ReactMarkdown>
    );
});

// --- THEME ENGINE ---
const getThemeStyles = (activeOverlay) => {
    const base = {
        glow: "shadow-indigo-500/20",
        shimmer: "from-indigo-500/20 via-white/20 to-indigo-500/20",
        badge: "bg-indigo-500",
        text: "text-indigo-500",
        hoverBorder: "hover:border-indigo-500/30"
    };
    switch (activeOverlay) {
        case 'christmas': return { ...base, glow: "shadow-emerald-500/20", shimmer: "from-emerald-500/20 via-white/20 to-emerald-500/20", badge: "bg-emerald-600", text: "text-emerald-600", hoverBorder: "hover:border-emerald-500/30" };
        case 'valentines': return { ...base, glow: "shadow-rose-500/20", shimmer: "from-rose-500/20 via-white/20 to-rose-500/20", badge: "bg-rose-500", text: "text-rose-500", hoverBorder: "hover:border-rose-500/30" };
        case 'graduation': return { ...base, glow: "shadow-amber-500/20", shimmer: "from-amber-500/20 via-white/20 to-amber-500/20", badge: "bg-amber-500", text: "text-amber-500", hoverBorder: "hover:border-amber-500/30" };
        default: return base;
    }
};

// --- COMPONENT: PRISM CARD (Pinned) ---
const PrismCard = memo(({ post, authorProfile, onClick, onTogglePin, theme }) => {
    const date = formatDateDetails(post.createdAt);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(post)}
            className={`
                relative flex-shrink-0 w-[85vw] sm:w-96 min-h-[200px] p-6 rounded-[2rem] cursor-pointer
                bg-white/80 dark:bg-white/10 backdrop-blur-xl group overflow-hidden
                border border-slate-200/60 dark:border-white/10 ${theme.glow} shadow-lg snap-center
            `}
        >
            <div className={`absolute inset-0 bg-gradient-to-tr ${theme.shimmer} opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-300/50 to-transparent dark:via-white/10 opacity-50" />

            {/* ACTION: UNPIN BUTTON */}
            <button
                onClick={(e) => onTogglePin(e, post)}
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all opacity-0 group-hover:opacity-100"
                title="Unpin Post"
            >
                <PinOff size={16} />
            </button>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white ${theme.badge} shadow-lg shadow-black/10`}>
                        <Sparkles size={10} className="animate-pulse" />
                        <span>Featured</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 opacity-60 sm:block hidden">
                        {date.full}
                    </span>
                    <span className="text-xs font-mono text-slate-400 opacity-60 sm:hidden">
                        {date.month} {date.day}
                    </span>
                </div>

                <div className="mb-6">
                    <div className="text-[14px] sm:text-[15px] font-medium text-slate-800 dark:text-slate-200 transition-colors line-clamp-3 sm:line-clamp-3 overflow-hidden leading-relaxed">
                        <CompactMarkdownRenderer content={post.content} />
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-slate-200/40 dark:border-white/5">
                    <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-br from-slate-200 dark:from-white/10 to-transparent">
                        <div className="w-full h-full rounded-full overflow-hidden">
                            <UserInitialsAvatar user={authorProfile} size="full" />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{authorProfile?.displayName || 'Instructor'}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Tap to expand</span>
                    </div>
                    <div className="ml-auto w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
                        <ArrowRight size={14} className="text-slate-500 dark:text-slate-400" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
});

// --- COMPONENT: FROSTED SLAB (Timeline) ---
const FrostedSlab = memo(({ post, authorProfile, onClick, onTogglePin, theme, index }) => {
    const date = formatDateDetails(post.createdAt);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onClick(post)}
            className="group relative flex gap-3 sm:gap-6 cursor-pointer"
        >
            <div className="flex-none flex flex-col items-center pt-2 w-12 sm:w-14">
                <span className={`text-[10px] sm:text-xs font-black tracking-tighter ${theme.text}`}>{date.month}</span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-none my-0.5">{date.day}</span>
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 dark:text-slate-500">{date.time}</span>
                <div className="w-[2px] flex-1 mt-3 bg-gradient-to-b from-slate-200 dark:from-white/10 to-transparent rounded-full group-last:hidden" />
            </div>

            <div className={`
                flex-1 relative p-4 sm:p-5 mb-6 sm:mb-8 rounded-2xl transition-all duration-300
                bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10
                active:scale-[0.98] hover:border-transparent hover:ring-1 hover:ring-slate-200 dark:hover:ring-white/20
                ${theme.hoverBorder} shadow-sm hover:shadow-xl hover:-translate-y-1
            `}>
                {/* ACTION: PIN BUTTON */}
                <button
                    onClick={(e) => onTogglePin(e, post)}
                    className={`
                        absolute top-4 right-4 z-20 p-2 rounded-full 
                        bg-slate-50 text-slate-400 hover:text-white 
                        ${theme.badge.replace('bg-', 'hover:bg-')} 
                        transition-all opacity-0 group-hover:opacity-100 sm:opacity-0 opacity-100
                    `}
                    title="Pin Post"
                >
                    <Pin size={14} className="fill-current" />
                </button>

                <div className="flex justify-between items-start mb-2 pr-8">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity">
                            <UserInitialsAvatar user={authorProfile} size="full" />
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                            {authorProfile?.displayName}
                        </span>
                    </div>
                </div>

                <div className="text-[13px] sm:text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 sm:line-clamp-3 overflow-hidden font-medium">
                    <CompactMarkdownRenderer content={post.content} />
                </div>

                {post.imageUrls && post.imageUrls.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                        {post.imageUrls.slice(0, 3).map((url, i) => (
                            <div key={i} className="flex-none h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                                <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
});

const ActivityFeed = ({ userProfile, teacherAnnouncements, showToast }) => {
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
    const theme = useMemo(() => getThemeStyles(activeOverlay), [activeOverlay]);

    // --- LOGIC: PINNING FUNCTION ---
    const handleTogglePin = useCallback(async (e, post) => {
        e.stopPropagation();
        if (!post?.id) return;

        try {
            // FIX: Pointing to 'teacherAnnouncements' collection
            const annRef = doc(db, 'teacherAnnouncements', post.id);
            await updateDoc(annRef, {
                isPinned: !post.isPinned
            });
            showToast(post.isPinned ? "Post unpinned" : "Post pinned to top", 'success');
        } catch (error) {
            console.error("Error toggling pin:", error);
            showToast("Failed to update pin status", 'error');
        }
    }, [showToast]);

    const [{ pinnedPosts, timelinePosts }, setSplitPosts] = useState({ pinnedPosts: [], timelinePosts: [] });

    useEffect(() => {
        const processFeed = async () => {
            if (!sortedAnnouncements || sortedAnnouncements.length === 0) {
                setSplitPosts({ pinnedPosts: [], timelinePosts: [] });
                return;
            }
            try {
                const worker = await getWorker();
                const result = await worker.splitActivityFeed(sortedAnnouncements);
                setSplitPosts(result);
            } catch (error) {
                console.error("Error splitting feed in worker:", error);
                // Fallback logic
                const pinned = [];
                const timeline = [];
                sortedAnnouncements.forEach(post => {
                    if (post.isPinned) pinned.push(post);
                    else timeline.push(post);
                });
                setSplitPosts({ pinnedPosts: pinned, timelinePosts: timeline });
            }
        };
        processFeed();
    }, [sortedAnnouncements]);

    // Modals
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

    return (
        <div className="w-full relative z-10 pb-8 min-h-[400px]" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
            {/* Header Area */}
            <div className="flex flex-col mb-6 sm:mb-8 px-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className={`w-1.5 sm:w-2 h-6 sm:h-8 rounded-full ${theme.badge}`} />
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
                        The Feed
                    </h2>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 pl-4 sm:pl-5">
                    Latest class updates & highlights
                </p>
            </div>

            {!sortedAnnouncements || sortedAnnouncements.length === 0 ? (
                <div className="rounded-[2rem] p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 mx-2">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white dark:bg-white/5 rounded-full flex items-center justify-center shadow-lg dark:shadow-none mb-4">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">All caught up</h3>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">No announcements to display right now.</p>
                </div>
            ) : (
                <div className="space-y-8 sm:space-y-12">
                    {/* SECTION: PRISM CARDS (Pinned) */}
                    {pinnedPosts.length > 0 && (
                        <div className="relative">
                            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 px-4 pt-2 snap-x snap-mandatory no-scrollbar mask-fade-right">
                                {pinnedPosts.map(post => (
                                    <PrismCard
                                        key={post.id}
                                        post={post}
                                        authorProfile={usersMap[post.teacherId]}
                                        onClick={openAnnouncementModal}
                                        onTogglePin={handleTogglePin}
                                        theme={theme}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION: FROSTED SLABS (Recent) */}
                    {timelinePosts.length > 0 && (
                        <div className="px-3 sm:px-4">
                            {timelinePosts.map((post, idx) => (
                                <FrostedSlab
                                    key={post.id}
                                    post={post}
                                    index={idx}
                                    authorProfile={usersMap[post.teacherId]}
                                    onClick={openAnnouncementModal}
                                    onTogglePin={handleTogglePin}
                                    theme={theme}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
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