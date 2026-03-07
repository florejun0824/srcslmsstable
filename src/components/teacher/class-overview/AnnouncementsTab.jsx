import React, { useState, useEffect, memo } from 'react';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    deleteDoc, 
    doc, 
    updateDoc 
} from 'firebase/firestore';
import { db } from '../../../services/firebase'; 
import { useAuth } from '../../../contexts/AuthContext'; 
import { useToast } from '../../../contexts/ToastContext'; 
import CreateClassAnnouncementForm from '../CreateClassAnnouncementForm'; 
import AnnouncementViewModal from '../../common/AnnouncementViewModal'; 
import { 
    ChatBubbleBottomCenterTextIcon, 
    TrashIcon, 
    PencilIcon,
    PlusIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

// --- MATERIAL YOU UI HELPERS ---

const SkeletonAnnouncement = memo(() => (
    <div className="bg-zinc-100 dark:bg-zinc-800/60 p-6 rounded-[28px] animate-pulse mb-4">
        <div className="flex gap-4 items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700/50 shrink-0"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-1/3"></div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-1/4"></div>
            </div>
        </div>
        <div className="space-y-3 w-full pl-[56px]">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-full"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700/50 rounded-full w-5/6"></div>
        </div>
    </div>
));

const AnnouncementListItem = memo(({ post, isOwn, onEdit, onDelete, isEditing, editContent, onChangeEdit, onSaveEdit, onCancelEdit, onClick }) => {
    // Generate a simple initial for the avatar
    const initial = post.teacherName ? post.teacherName.charAt(0).toUpperCase() : '?';

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={!isEditing ? onClick : undefined} 
            className="group relative bg-zinc-100 hover:bg-zinc-200/50 dark:bg-zinc-800/60 dark:hover:bg-zinc-800/80 transition-colors p-5 md:p-6 rounded-[28px] cursor-pointer"
        >
            {isEditing ? (
                <div className="space-y-4">
                    <div className="bg-zinc-200/50 dark:bg-zinc-900/50 rounded-[20px] p-2">
                        <textarea 
                            className="w-full p-4 bg-transparent focus:ring-0 outline-none resize-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 min-h-[100px]" 
                            value={editContent} 
                            onChange={onChangeEdit} 
                            onClick={e => e.stopPropagation()} 
                            autoFocus 
                            placeholder="Edit your announcement..."
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={(e) => {e.stopPropagation(); onCancelEdit()}} className="px-5 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors">
                            Cancel
                        </button>
                        <button onClick={(e) => {e.stopPropagation(); onSaveEdit()}} className="px-5 py-2.5 rounded-full text-sm font-medium bg-indigo-200 dark:bg-indigo-600 text-indigo-900 dark:text-indigo-50 hover:bg-indigo-300 dark:hover:bg-indigo-500 transition-colors">
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {/* Header: Avatar & Meta */}
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                                {initial}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{post.teacherName}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now'}
                                </p>
                            </div>
                        </div>
                        
                        {/* Actions for owner */}
                        {isOwn && (
                            <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => {e.stopPropagation(); onEdit()}} className="p-2.5 rounded-full text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={(e) => {e.stopPropagation(); onDelete()}} className="p-2.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors active:scale-95">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Content */}
                    <div className="pl-[52px]">
                        <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap line-clamp-3 text-base">
                            {post.content}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
});

const EmptyState = ({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4, type: "spring" }}
        className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center p-8 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-[32px]"
    >
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
            <Icon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{text}</h3>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">{subtext}</p>
    </motion.div>
);

// --- MAIN COMPONENT ---

const AnnouncementsTab = ({ classData, isActive }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    
    // Local State
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Edit/View State
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // Fetch Logic
    useEffect(() => {
        if (!classData?.id || !isActive) return;

        setLoading(true);
        const q = query(
            collection(db, "studentAnnouncements"), 
            where("classId", "==", classData.id), 
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching announcements:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [classData?.id, isActive]);

    // Handlers
    const handleEditSave = async (id) => {
        const trimmed = editContent.trim();
        if (!trimmed) return showToast("Content cannot be empty.", "error");
        
        try {
            await updateDoc(doc(db, 'studentAnnouncements', id), { content: trimmed });
            setEditingId(null);
            setEditContent('');
            showToast("Announcement updated.", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to update announcement.", "error");
        }
    };

    const handleDeleteClick = (id) => {
        if (window.confirm("Are you sure you want to delete this announcement?")) {
             deleteAnnouncement(id);
        }
    };

    const deleteAnnouncement = async (id) => {
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id));
            showToast("Announcement deleted.", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to delete.", "error");
        }
    };

    if (!isActive && announcements.length === 0) return null;

    return (
        // Added padding on mobile (p-2 md:p-0) so the rounded corners are visible against the app background
        <div className="flex flex-col h-full relative min-h-screen pb-24 p-2 md:p-0">
            {/* The actual Material Surface wrapper for mobile */}
            <div className="flex-1 bg-white dark:bg-[#1A1D24] md:bg-transparent md:dark:bg-transparent rounded-[32px] md:rounded-none p-4 md:p-0 shadow-sm md:shadow-none">
                
                {/* Inline Add Form wrapped in an AnimatePresence */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-zinc-100 dark:bg-zinc-800/80 p-5 md:p-6 rounded-[32px]">
                                <CreateClassAnnouncementForm 
                                    classId={classData.id} 
                                    onAnnouncementPosted={() => setShowAddForm(false)} 
                                />
                                <div className="mt-4 flex justify-end">
                                    <button 
                                        onClick={() => setShowAddForm(false)}
                                        className="px-5 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Announcements List */}
                <div className="space-y-4">
                    {loading ? (
                        <>
                            <SkeletonAnnouncement />
                            <SkeletonAnnouncement />
                            <SkeletonAnnouncement />
                        </>
                    ) : announcements.length > 0 ? (
                        <AnimatePresence>
                            {announcements.map(post => (
                                <AnnouncementListItem 
                                    key={post.id} 
                                    post={post} 
                                    isOwn={userProfile?.id === post.teacherId}
                                    onEdit={() => { setEditingId(post.id); setEditContent(post.content); }}
                                    onDelete={() => handleDeleteClick(post.id)}
                                    isEditing={editingId === post.id} 
                                    editContent={editContent}
                                    onChangeEdit={(e) => setEditContent(e.target.value)}
                                    onSaveEdit={() => handleEditSave(post.id)}
                                    onCancelEdit={() => setEditingId(null)}
                                    onClick={() => setSelectedAnnouncement(post)}
                                />
                            ))}
                        </AnimatePresence>
                    ) : (
                        <EmptyState 
                            icon={ChatBubbleBottomCenterTextIcon} 
                            text="No announcements yet" 
                            subtext="Keep your class in the loop by posting important updates here." 
                        />
                    )}
                </div>
            </div> {/* End of Mobile Surface Wrapper */}

            {/* Material 3 Extended Floating Action Button (FAB) */}
            <AnimatePresence>
                {!showAddForm && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddForm(true)}
                        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 flex items-center gap-2 bg-indigo-200 dark:bg-indigo-600 text-indigo-900 dark:text-indigo-50 px-5 py-4 rounded-[20px] shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <PlusIcon className="w-6 h-6" />
                        <span className="font-medium pr-1">Announce</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Detailed View Modal */}
            <AnnouncementViewModal 
                isOpen={!!selectedAnnouncement} 
                onClose={() => setSelectedAnnouncement(null)} 
                announcement={selectedAnnouncement} 
                className="z-[150]" 
            />
        </div>
    );
};

export default AnnouncementsTab;