// src/components/student/StudentClassDetailView.js
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where, documentId } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import ViewLessonModal from './StudentViewLessonModal';
import { useAuth } from '../../contexts/AuthContext';
import { 
    MegaphoneIcon, 
    BookOpenIcon, 
    ArrowLeftIcon, 
    SparklesIcon, 
    ArrowRightIcon, 
    ChevronDownIcon, 
    ChevronUpIcon 
} from '@heroicons/react/24/outline';

const UnitPillHeader = ({ title, isCollapsed, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex justify-between items-center p-2 group"
    >
        {/* --- MODIFIED: Themed pill background and text --- */}
        <span className="bg-neumorphic-base dark:bg-neumorphic-base-dark px-4 py-2 rounded-full shadow-neumorphic dark:shadow-neumorphic-dark text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 transition-transform group-hover:scale-105">
            {title}
        </span>
        <div className="p-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-full shadow-neumorphic dark:shadow-neumorphic-dark group-hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-shadow duration-200">
            {/* --- MODIFIED: Themed icons --- */}
            {isCollapsed ? (
                <ChevronDownIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            ) : (
                <ChevronUpIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            )}
        </div>
    </button>
);

const StudentClassDetailView = ({ selectedClass, onBack }) => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('announcements');
    const [announcements, setAnnouncements] = useState([]);
    const [lessonsByUnit, setLessonsByUnit] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    const [lessonToView, setLessonToView] = useState(null);

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) newSet.delete(unitTitle);
            else newSet.add(unitTitle);
            return newSet;
        });
    };

    const fetchData = useCallback(async () => {
        // --- START FIX: Check for userProfile.id and get studentId ---
        if (!selectedClass?.id || !userProfile?.id) { 
            setLoading(false); 
            return; 
        }
        
        setLoading(true);
        const studentId = userProfile.id; // The ID of the current student

        try {
            // 1. Fetch Student Announcements (separate from posts)
            const annQuery = query(
                collection(db, "studentAnnouncements"), 
                where("classId", "==", selectedClass.id), 
                orderBy("createdAt", "desc")
            );
            const annSnap = await getDocs(annQuery);
            setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            // 2. Fetch and FILTER Posts (Lessons/Quizzes)
            const postsQuery = query(collection(db, `classes/${selectedClass.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);
            let allLessonsFromPosts = [];
            
            postsSnap.forEach(doc => {
                const postData = doc.data();
                
                // --- CRITICAL FILTERING LOGIC START ---
                const targetAudience = postData.targetAudience;
                const targetStudentIds = postData.targetStudentIds || [];
                
                let isRecipient = false;
                
                if (targetAudience === 'specific') {
                    // Check if the current student's ID is explicitly listed
                    isRecipient = targetStudentIds.includes(studentId);
                } else if (targetAudience === 'all') {
                    // Targeted to all students in the class
                    isRecipient = true;
                } else if (!targetAudience && targetStudentIds.length === 0) {
                    // Fallback for older posts where targetAudience might be missing
                    isRecipient = true; 
                }

                if (isRecipient && Array.isArray(postData.lessons)) {
                    // Only add lessons from posts intended for this student
                    // Add class context to the lesson object for display/modal use
                    allLessonsFromPosts.push(...postData.lessons.map(lesson => ({
                        ...lesson,
                        classId: selectedClass.id,
                        className: selectedClass.name,
                        postId: doc.id,
                    })));
                }
                // --- CRITICAL FILTERING LOGIC END ---
            });
            
            // The rest of the logic remains the same: deduplication, sorting, and grouping.

            const uniqueLessonsMap = new Map();
            allLessonsFromPosts.forEach(lesson => {
                // Deduplicate lessons by their ID (if they appeared in multiple posts)
                // The first instance found will be the one used.
                if (!uniqueLessonsMap.has(lesson.id)) {
                    uniqueLessonsMap.set(lesson.id, lesson);
                }
            });
            const fetchedLessons = Array.from(uniqueLessonsMap.values());

            fetchedLessons.sort((a, b) => {
                const orderA = a.order ?? Infinity;
                const orderB = b.order ?? Infinity;
                if (orderA !== orderB) return orderA - orderB;
                const numA = parseInt(a.title.match(/\d+/)?.[0] || 0, 10);
                const numB = parseInt(b.title.match(/\d+/)?.[0] || 0, 10);
                return numA - numB;
            });

            const uniqueUnitIds = new Set(fetchedLessons.map(l => l.unitId).filter(Boolean));
            const unitsMap = new Map();
            if (uniqueUnitIds.size > 0) {
                const unitsQuery = query(collection(db, 'units'), where(documentId(), 'in', Array.from(uniqueUnitIds)));
                const unitsSnap = await getDocs(unitsQuery);
                unitsSnap.forEach(doc => unitsMap.set(doc.id, doc.data().title));
            }

            const groupedLessons = {};
            fetchedLessons.forEach(lesson => {
                const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized';
                if (!groupedLessons[unitTitle]) groupedLessons[unitTitle] = [];
                groupedLessons[unitTitle].push(lesson);
            });

            setLessonsByUnit(groupedLessons);
            setCollapsedUnits(new Set(Object.keys(groupedLessons)));
        } catch (err) {
            console.error("Failed to fetch class details:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedClass, userProfile?.id]); // --- FIX: Added userProfile?.id to dependencies ---

    useEffect(() => { fetchData(); }, [fetchData]);
    
    // Updated tab styling logic
    const getTabClasses = (tabName) => `
        flex items-center justify-center flex-1 gap-2 px-4 py-3 font-semibold text-sm rounded-xl transition-all duration-200
        ${activeTab === tabName 
            ? 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-red-600 dark:text-red-400' // Active tab is "pressed in"
            : 'bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark' // Inactive tab is "popped out"
        }
    `;

    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

        const EmptyState = ({ icon: Icon, text, subtext }) => (
            // --- MODIFIED: Themed EmptyState ---
            <div className="text-center py-16 px-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic max-w-4xl mx-auto dark:shadow-neumorphic-dark">
                <Icon className="h-16 w-16 mb-4 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{text}</p>
                <p className="mt-2 text-md text-slate-500 dark:text-slate-400">{subtext}</p>
            </div>
        );

        switch(activeTab) {
            case 'lessons':
                const lessonUnitTitles = Object.keys(lessonsByUnit).sort();
                return lessonUnitTitles.length > 0 ? (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {lessonUnitTitles.map(unitTitle => (
                            <div key={unitTitle}>
                                <UnitPillHeader
                                    title={unitTitle}
                                    isCollapsed={collapsedUnits.has(unitTitle)}
                                    onClick={() => toggleUnitCollapse(unitTitle)}
                                />
                                {!collapsedUnits.has(unitTitle) && (
                                    // --- MODIFIED: Themed content container ---
                                    <div className="mt-2 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-neumorphic-dark">
                                        {lessonsByUnit[unitTitle].map(lesson => (
                                            <LessonListItemForStudent 
                                                key={lesson.id} 
                                                lesson={lesson} 
                                                onClick={() => setLessonToView(lesson)} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <EmptyState icon={BookOpenIcon} text="No lessons available yet." subtext="Your teacher will post lessons here." />;
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
            <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark p-6 sm:p-8 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark max-w-4xl mx-auto animate-scale-in">
                {/* Updated "Back" button with popped out style */}
                <button
                    onClick={onBack}
                    // --- MODIFIED: Themed button ---
                    className="flex items-center bg-neumorphic-base dark:bg-neumorphic-base-dark text-red-600 dark:text-red-400 font-semibold text-sm px-4 py-2 rounded-xl shadow-neumorphic dark:shadow-neumorphic-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset transition-all mb-5 group hover:text-red-700 dark:hover:text-red-300"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" /> 
                    Back to All Classes
                </button>
                {/* --- MODIFIED: Themed text --- */}
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{selectedClass.name}</h1>
                <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-8">{selectedClass.gradeLevel} - {selectedClass.section}</p>
                
                {/* --- MODIFIED: Themed Tab Navigation --- */}
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
                {/* --- MODIFIED: Themed main container --- */}
                <div>{renderContent()}</div>
            </div>

            {/* Modals */}
            <AnnouncementViewModal 
                isOpen={!!selectedAnnouncement} 
                onClose={() => setSelectedAnnouncement(null)} 
                announcement={selectedAnnouncement} 
            />
            <ViewLessonModal 
                isOpen={!!lessonToView} 
                onClose={() => setLessonToView(null)} 
                lesson={lessonToView} 
            />
        </>
    );
};

// --- Sub-components ---
const LessonListItemForStudent = ({ lesson, onClick }) => (
    <div 
        // --- MODIFIED: Themed list item ---
        className="group p-3 bg-transparent hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-200 cursor-pointer flex items-center space-x-3 rounded-xl"
        onClick={onClick}
    >
        {/* --- MODIFIED: Themed icon container --- */}
        <div className="flex-shrink-0 p-2 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
            <SparklesIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
            {/* --- MODIFIED: Themed text --- */}
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors line-clamp-2">{lesson.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{lesson.description}</p>
        </div>
        {/* --- MODIFIED: Themed icon --- */}
        <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-300 transition-colors">
            <ArrowRightIcon className="h-5 w-5" />
        </div>
    </div>
);

const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    const formattedDate = announcement.createdAt?.toDate 
        ? announcement.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : 'N/A';
    return (
        <div 
            // --- MODIFIED: Themed list item ---
            className="group p-4 bg-transparent hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark transition-all duration-200 cursor-pointer flex items-center space-x-4 rounded-xl"
            onClick={onClick}
        >
            {/* --- MODIFIED: Themed icon container --- */}
            <div className="flex-shrink-0 p-2.5 rounded-full bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                <MegaphoneIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
                {/* --- MODIFIED: Themed text --- */}
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors line-clamp-2">{announcement.content}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Posted on {formattedDate}</p>
            </div>
            {/* --- MODIFIED: Themed icon --- */}
            <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:hover:text-blue-300 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default StudentClassDetailView;