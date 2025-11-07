// src/components/student/StudentClassDetailView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import { useAuth } from '../../contexts/AuthContext';
import { 
    MegaphoneIcon, 
    BookOpenIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon, 
} from '@heroicons/react/24/outline';

// --- NEW: Import the component we're using to display lessons ---
import LessonsByUnitView from './LessonsByUnitView';

// --- REMOVED: UnitPillHeader component (no longer needed) ---
// --- REMOVED: LessonListItemForStudent component (no longer needed) ---

const StudentClassDetailView = ({ 
    selectedClass, 
    onBack, 
    lessons,  // <-- NEW: Receives all lessons
    units,    // <-- NEW: Receives all units
    setLessonToView, // <-- NEW: Receives the modal setter function
    onContentUpdate  // <-- NEW: Receives the refresh function
}) => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('announcements');
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    // --- REMOVED: All lesson-related state (lessonsByUnit, collapsedUnits, lessonToView) ---

    const fetchData = useCallback(async () => {
        if (!selectedClass?.id || !userProfile?.id) { 
            setLoading(false); 
            return; 
        }
        
        setLoading(true);
        try {
            // --- MODIFIED: This function ONLY fetches announcements now ---
            const annQuery = query(
                collection(db, "studentAnnouncements"), 
                where("classId", "==", selectedClass.id), 
                orderBy("createdAt", "desc")
            );
            const annSnap = await getDocs(annQuery);
            setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // --- REMOVED: All post-fetching, filtering, and lesson-grouping logic ---
            
        } catch (err)
 {
            console.error("Failed to fetch class announcements:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedClass, userProfile?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    // ... (getTabClasses remains unchanged) ...
    const getTabClasses = (tabName) => `
        flex items-center justify-center flex-1 gap-2 px-4 py-3 font-semibold text-sm rounded-xl transition-all duration-200
        ${activeTab === tabName 
            ? 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400' // Active tab is "pressed in"
            : 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark' // Inactive tab is "popped out"
        }
    `;

    const renderContent = () => {
        if (loading && activeTab === 'announcements') {
             return <div className="flex justify-center p-10"><Spinner /></div>;
        }

        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <div className="text-center py-16 px-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic max-w-4xl mx-auto dark:shadow-neumorphic-dark">
                <Icon className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{text}</p>
                <p className="mt-2 text-md text-slate-500 dark:text-slate-400">{subtext}</p>
            </div>
        );

        switch(activeTab) {
            case 'lessons':
                // --- NEW: Filter lessons and render the unified component ---
                const lessonsForThisClass = lessons.filter(lesson => lesson.classId === selectedClass.id);
                
                return (
                    <LessonsByUnitView
                        selectedClass={selectedClass}
                        lessons={lessonsForThisClass}
                        units={units}
                        setLessonToView={setLessonToView}
                        onContentUpdate={onContentUpdate}
                        showBackButton={false} // Hide redundant back button
                        showRefreshButton={false} // Hide redundant refresh button
                    />
                );
            case 'announcements':
            default:
                return announcements.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
                        {announcements.map(announcement => (
                            <AnnouncementListItemForStudent 
                                key={announcement.id} 
                                announcement={announcement} 
                                onClick={() => setSelectedAnnouncement(announcement)} 
                            />
                        ))}
                    </div>
                ) : <EmptyState icon={MegaphoneIcon} text="No announcements for this class." subtext="Important updates will appear here." />;
        }
    };

    return (
        <>
            {/* --- MODIFIED: Removed max-w-4xl and mx-auto to let parent control sizing --- */}
            <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 sm:p-8 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark animate-scale-in">
                <button
                    onClick={onBack}
                    className="flex items-center bg-neumorphic-base dark:bg-neumorphic-base-dark text-red-600 dark:text-red-400 font-semibold text-sm px-4 py-2 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset transition-all mb-5 group hover:text-red-700 dark:hover:text-red-300"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" /> 
                    Back to All Classes
                </button>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{selectedClass.name}</h1>
                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8">{selectedClass.gradeLevel} - {selectedClass.section}</p>
                
                <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-xl flex items-center mb-6 p-1.5 shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                    <nav className="flex flex-1 space-x-2">
                        <button onClick={() => setActiveTab('announcements')} className={getTabClasses('announcements')}>
                            <MegaphoneIcon className="h-5 w-5" />
                            <span>Announcements</span>
                        </button>
                        <button onClick={() => setActiveTab('lessons')} className={getTabClasses('lessons')}>
                            <BookOpenIcon className="h-5 w-5" />
                            <span>Lessons</span>
                        </button>
                    </nav>
                </div>
                <div>{renderContent()}</div>
            </div>

            {/* Modals */}
            <AnnouncementViewModal 
                isOpen={!!selectedAnnouncement} 
                onClose={() => setSelectedAnnouncement(null)} 
                announcement={selectedAnnouncement} 
            />
            {/* --- REMOVED: ViewLessonModal (now handled by the parent component, StudentDashboard) --- */}
        </>
    );
};

// ... (AnnouncementListItemForStudent remains unchanged) ...
const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    const formattedDate = announcement.createdAt?.toDate 
        ? announcement.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : 'N/A';
    return (
        <div 
            className="group p-4 bg-transparent hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-200 cursor-pointer flex items-center space-x-4 rounded-xl"
            onClick={onClick}
        >
            <div className="flex-shrink-0 p-2.5 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                <MegaphoneIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors line-clamp-2">{announcement.content}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Posted on {formattedDate}</p>
            </div>
            <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default StudentClassDetailView;