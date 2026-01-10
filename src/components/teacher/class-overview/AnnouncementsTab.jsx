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
import { db } from '../../../services/firebase'; // Adjust path based on your structure
import { useAuth } from '../../../contexts/AuthContext'; // Adjust path
import { useToast } from '../../../contexts/ToastContext'; // Adjust path
import CreateClassAnnouncementForm from '../CreateClassAnnouncementForm'; // Adjust path
import AnnouncementViewModal from '../../common/AnnouncementViewModal'; // Adjust path
import { 
    ChatBubbleBottomCenterTextIcon, 
    TrashIcon, 
    Cog6ToothIcon 
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

// --- LOCAL UI HELPERS ---

const SkeletonAnnouncement = memo(() => (
    <div className="bg-white/60 dark:bg-[#1A1D24]/60 backdrop-blur-sm p-6 rounded-[24px] border border-white/20 dark:border-white/5 shadow-sm animate-pulse mb-4">
        <div className="space-y-3 w-full">
            <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-3/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/2"></div>
        </div>
    </div>
));

const AnnouncementListItem = memo(({ post, isOwn, onEdit, onDelete, isEditing, editContent, onChangeEdit, onSaveEdit, onCancelEdit, onClick }) => {
    return (
        <div onClick={!isEditing ? onClick : undefined} className="group relative bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm p-5 rounded-3xl border border-white/5 shadow-sm hover:shadow-md transition-all cursor-pointer">
            {isEditing ? (
                <div className="space-y-3">
                    <textarea 
                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-black/20 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 dark:text-white" 
                        rows={3} 
                        value={editContent} 
                        onChange={onChangeEdit} 
                        onClick={e => e.stopPropagation()} 
                        autoFocus 
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={(e) => {e.stopPropagation(); onCancelEdit()}} className="px-4 py-2 rounded-full text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">Cancel</button>
                        <button onClick={(e) => {e.stopPropagation(); onSaveEdit()}} className="px-4 py-2 rounded-full text-sm font-bold bg-[#007AFF] text-white">Save</button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <p className="text-slate-800 dark:text-white leading-relaxed whitespace-pre-wrap line-clamp-3">{post.content}</p>
                        <p className="text-xs font-bold text-slate-400 mt-3">{post.teacherName} • {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                    </div>
                    {isOwn && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {e.stopPropagation(); onEdit()}} className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100"><Cog6ToothIcon className="w-4 h-4"/></button>
                            <button onClick={(e) => {e.stopPropagation(); onDelete()}} className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

const EmptyState = ({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 bg-white/40 dark:bg-[#1A1D24]/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700"
    >
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-sm">
            <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{text}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">{subtext}</p>
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
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Fetch Logic - Only runs when tab is active (Optimization)
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
        // Simple window confirm for now, or pass a handler up if you want the custom modal
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

    if (!isActive && announcements.length === 0) return null; // Prevent flash

    return (
        <div className="flex flex-col h-full animate-fadeIn">
            {/* Add Form */}
            {showAddForm ? (
                <div className="mb-6">
                    <CreateClassAnnouncementForm 
                        classId={classData.id} 
                        onAnnouncementPosted={() => setShowAddForm(false)} 
                    />
                    <button 
                        onClick={() => setShowAddForm(false)}
                        className="mt-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium px-4"
                    >
                        Cancel
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowAddForm(true)}
                    className="mb-6 w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:border-[#007AFF] hover:text-[#007AFF] transition-all bg-white/50 dark:bg-white/5"
                >
                    + Write an Announcement
                </button>
            )}

            {/* List */}
            <div className="space-y-4 pb-20">
                {loading ? (
                    <>
                        <SkeletonAnnouncement />
                        <SkeletonAnnouncement />
                    </>
                ) : announcements.length > 0 ? (
                    announcements.map(post => (
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
                    ))
                ) : (
                    <EmptyState 
                        icon={ChatBubbleBottomCenterTextIcon} 
                        text="No announcements yet" 
                        subtext="Post important updates for your students here." 
                    />
                )}
            </div>

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