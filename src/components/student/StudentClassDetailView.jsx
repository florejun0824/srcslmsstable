import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
    MegaphoneIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon, 
    CalendarIcon,
    UserIcon,
    BellAlertIcon
} from '@heroicons/react/24/solid';

// --- HELPER: Date Formatter ---
const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- SUB-COMPONENT: Announcement Item (Memoized) ---
const AnnouncementListItemForStudent = React.memo(({ announcement, onClick }) => {
    // Memoize date to prevent recalc on re-renders
    const formattedDate = useMemo(() => formatDate(announcement.createdAt), [announcement.createdAt]);

    // Accessibility handler for keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <motion.div 
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative p-5 bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl rounded-[1.5rem] border border-white/60 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex items-start gap-4 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            onClick={onClick}
        >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:via-blue-500/5 transition-all duration-500 pointer-events-none"></div>

            {/* Icon Container */}
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200/50 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <MegaphoneIcon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 tracking-tight">
                        {announcement.title || "Class Announcement"}
                    </h3>
                    <span className="flex-shrink-0 flex items-center text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100/80 dark:bg-black/30 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-white/5">
                        <CalendarIcon className="w-3 h-3 mr-1.5 opacity-70" />
                        {formattedDate}
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed font-medium">
                    {announcement.content}
                </p>
            </div>

            {/* Arrow Indicator */}
            <div className="flex-shrink-0 self-center pl-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 transition-all duration-300">
                    <ArrowRightIcon className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                </div>
            </div>
        </motion.div>
    );
});

// --- MAIN COMPONENT ---
const StudentClassDetailView = ({ selectedClass, onBack }) => {
    const { userProfile } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // Optimized Data Fetching
    const fetchData = useCallback(async () => {
        if (!selectedClass?.id || !userProfile?.id) { 
            setLoading(false); 
            return; 
        }
        
        setLoading(true);
        try {
            // Firestore Composite Index Requirement: classId (Asc/Desc) + createdAt (Desc)
            const annQuery = query(
                collection(db, "studentAnnouncements"), 
                where("classId", "==", selectedClass.id), 
                orderBy("createdAt", "desc")
            );
            
            const annSnap = await getDocs(annQuery);
            // Map immediately to simple objects to avoid storing circular Firestore references in state
            const data = annSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAnnouncements(data);
        } catch (err) {
            console.error("Failed to fetch class announcements:", err);
            // In a real prod environment, you might want a toast error here
        } finally {
            setLoading(false);
        }
    }, [selectedClass?.id, userProfile?.id]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);
    
    // Memoize handler to keep child pure
    const handleAnnouncementClick = useCallback((announcement) => {
        setSelectedAnnouncement(announcement);
    }, []);

    const renderContent = () => {
        if (loading) {
             return (
                <div className="flex flex-col items-center justify-center py-24">
                    <Spinner />
                    <p className="mt-4 text-slate-400 text-xs font-medium animate-pulse uppercase tracking-wider">Syncing Updates...</p>
                </div>
             );
        }

        if (announcements.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center py-24 px-6 animate-fade-in-up">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-700/50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-white/50 dark:border-white/5">
                        <MegaphoneIcon className="h-10 w-10 text-slate-300 dark:text-slate-500" />
                    </div>
                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200">No announcements</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">Your teacher hasn't posted any updates yet. Check back later!</p>
                </div>
            );
        }

        return (
            <div className="space-y-4 animate-fade-in-up pb-8">
                {announcements.map(announcement => (
                    <AnnouncementListItemForStudent 
                        key={announcement.id} 
                        announcement={announcement} 
                        onClick={() => handleAnnouncementClick(announcement)} 
                    />
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Main Container - Spatial Glass Panel */}
            <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/5 shadow-xl dark:shadow-2xl overflow-hidden min-h-[600px]">
                
                {/* Ambient Light Glows */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                <div className="relative z-10 p-5 sm:p-8">
                    
                    {/* Header Section */}
                    <div className="mb-10">
                        {/* Back Button */}
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/50 border border-white/20 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                            aria-label="Back to dashboard"
                        >
                            <ArrowLeftIcon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 group-hover:-translate-x-1 transition-transform duration-300" /> 
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Back to Dashboard</span>
                        </button>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                {/* Class Title */}
                                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight drop-shadow-sm">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400">
                                        {selectedClass?.name || "Class Details"}
                                    </span>
                                </h1>
                                
                                {/* Meta Data Capsules */}
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {selectedClass?.section && (
                                        <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-500/20 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                                            {selectedClass.section}
                                        </span>
                                    )}
                                    {selectedClass?.gradeLevel && (
                                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            {selectedClass.gradeLevel}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Instructor Bubble */}
                            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/5 backdrop-blur-sm shadow-sm max-w-full sm:max-w-xs">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex-shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-inner">
                                    <UserIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Instructor</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                        {selectedClass?.teacherName || "Teacher"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Section Title */}
                    <div className="mb-6 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <div className="p-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg">
                            <BellAlertIcon className="h-5 w-5 text-orange-500" />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight">Latest Updates</h2>
                    </div>

                    {/* Content Area */}
                    <div className="min-h-[300px]">
                        {renderContent()}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AnnouncementViewModal 
                isOpen={!!selectedAnnouncement} 
                onClose={() => setSelectedAnnouncement(null)} 
                announcement={selectedAnnouncement} 
            />
        </>
    );
};

export default StudentClassDetailView;