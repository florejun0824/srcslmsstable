import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, orderBy, where, documentId } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import ViewLessonModal from '../student/ViewLessonModal';
import ViewQuizModal from '../teacher/ViewQuizModal';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import { useAuth } from '../../contexts/AuthContext';
import { MegaphoneIcon, BookOpenIcon, ArrowLeftIcon, SparklesIcon, ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

// --- Reusable Pill Header (Unchanged) ---
const UnitPillHeader = ({ title, isCollapsed, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex justify-between items-center py-2 group"
    >
        <span className="bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
            {title}
        </span>
        {isCollapsed ? (
            <ChevronDownIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
        ) : (
            <ChevronUpIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
        )}
    </button>
);


const StudentClassDetailView = ({ selectedClass, onBack }) => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('announcements');
    const [announcements, setAnnouncements] = useState([]);
    const [lessonsByUnit, setLessonsByUnit] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) {
                newSet.delete(unitTitle);
            } else {
                newSet.add(unitTitle);
            }
            return newSet;
        });
    };

    const fetchData = useCallback(async () => {
        // ... (The data fetching logic remains the same)
        if (!selectedClass?.id) { setLoading(false); return; }
        setLoading(true);
        try {
            const annQuery = query(collection(db, "studentAnnouncements"), where("classId", "==", selectedClass.id), orderBy("createdAt", "desc"));
            const annSnap = await getDocs(annQuery);
            setAnnouncements(annSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const postsQuery = query(collection(db, `classes/${selectedClass.id}/posts`), orderBy('createdAt', 'desc'));
            const postsSnap = await getDocs(postsQuery);
            const lessonIdSet = new Set();
            postsSnap.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                if (Array.isArray(post.lessonIds)) post.lessonIds.forEach(id => lessonIdSet.add(id));
            });
            let fetchedLessons = [];
            if (lessonIdSet.size > 0) {
                const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', Array.from(lessonIdSet)));
                const lessonsSnap = await getDocs(lessonsQuery);
                fetchedLessons = lessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                fetchedLessons.sort((a, b) => {
                    const orderA = a.order ?? Infinity;
                    const orderB = b.order ?? Infinity;
                    if (orderA !== orderB) return orderA - orderB;
                    const numA = parseInt(a.title.match(/\d+/)?.[0] || 0, 10);
                    const numB = parseInt(b.title.match(/\d+/)?.[0] || 0, 10);
                    return numA - numB;
                });
            }
            const uniqueUnitIds = new Set([...fetchedLessons.map(lesson => lesson.unitId).filter(Boolean)]);
            const unitsMap = new Map();
            if (uniqueUnitIds.size > 0) {
                const unitsQuery = query(collection(db, 'units'), where(documentId(), 'in', Array.from(uniqueUnitIds)));
                const unitsSnap = await getDocs(unitsQuery);
                unitsSnap.forEach(doc => unitsMap.set(doc.id, doc.data().title));
            }
            const groupedLessons = {};
            fetchedLessons.forEach(lesson => {
                const unitTitle = unitsMap.get(lesson.unitId) || 'Uncategorized';
                if (!groupedLessons[unitTitle]) { groupedLessons[unitTitle] = []; }
                groupedLessons[unitTitle].push(lesson);
            });
            setLessonsByUnit(groupedLessons);
            const allUnitTitles = new Set(Object.keys(groupedLessons));
            setCollapsedUnits(allUnitTitles);
        } catch (error) {
            console.error("Failed to fetch class details:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedClass]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // --- MODIFICATION: iOS-style segmented control ---
    const getTabClasses = (tabName) => `
        flex items-center justify-center flex-1 gap-2 px-4 py-2 font-medium text-sm rounded-lg transition-all duration-200 ease-in-out
        ${activeTab === tabName ? 'bg-white text-red-600 shadow-sm' : 'text-slate-700 hover:text-red-600'}
    `;
    
    const renderContent = () => {
        if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;
        
        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <div className="text-center py-16 px-4 bg-slate-100/50 rounded-2xl shadow-inner border border-slate-200/80">
                <Icon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
                <p className="text-xl font-semibold text-slate-600">{text}</p>
                <p className="mt-2 text-md text-slate-400">{subtext}</p>
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
                                    <div className="mt-1 bg-white/60 backdrop-blur-3xl rounded-2xl shadow-lg-floating-md border border-slate-200/50 overflow-hidden">
                                        {lessonsByUnit[unitTitle].map(lesson => (
                                            <LessonListItemForStudent key={lesson.id} lesson={lesson} onClick={() => setViewLessonData(lesson)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : <EmptyState icon={BookOpenIcon} text="No lessons are available yet." subtext="Your teacher will post lessons here." />;
            case 'announcements':
            default:
                return announcements.length > 0 ? (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar bg-white/60 backdrop-blur-3xl rounded-2xl shadow-lg-floating-md border border-slate-200/50 overflow-hidden">
                        {announcements.map(announcement => (
                            <AnnouncementListItemForStudent key={announcement.id} announcement={announcement} onClick={() => setSelectedAnnouncement(announcement)} />
                        ))}
                    </div>
                ) : <EmptyState icon={MegaphoneIcon} text="No announcements for this class." subtext="Important updates will appear here." />;
        }
    };

    return (
        <>
            <div className="bg-white/70 backdrop-blur-3xl p-6 sm:p-8 rounded-3xl shadow-lg-floating-md border border-slate-200/50 max-w-4xl mx-auto animate-scale-in">
                <button
                    onClick={onBack}
                    className="flex items-center text-red-600 hover:text-red-700 transition-colors mb-5 font-semibold text-sm group"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" /> Back to All Classes
                </button>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{selectedClass.name}</h1>
                <p className="text-base sm:text-lg text-slate-500 mb-8">{selectedClass.gradeLevel} - {selectedClass.section}</p>
                
                <div className="bg-slate-200/70 rounded-xl flex items-center mb-6 p-1">
                    <nav className="flex flex-1 space-x-1">
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

            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
            <ViewQuizModal isOpen={!!viewQuizData} onClose={() => setViewQuizData(null)} quiz={viewQuizData} userProfile={userProfile} classId={selectedClass.id} />
            <AnnouncementViewModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} />
        </>
    );
};

// --- Sub-components adapted for glassmorphism ---

// --- MODIFICATION: More compact lesson list item ---
const LessonListItemForStudent = ({ lesson, onClick }) => (
    <div className="group p-3 bg-transparent hover:bg-black/5 transition-colors duration-200 cursor-pointer flex items-center space-x-3 border-b border-slate-900/10 last:border-b-0" onClick={onClick}>
        <div className="flex-shrink-0 p-2 rounded-full bg-sky-100 group-hover:bg-sky-200 transition-colors">
            <SparklesIcon className="h-5 w-5 text-sky-600" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-sky-700 transition-colors line-clamp-2">{lesson.title}</h3>
            {lesson.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{lesson.description}</p>}
        </div>
        <div className="flex-shrink-0 text-slate-400 group-hover:text-sky-500 transition-colors">
            <ArrowRightIcon className="h-5 w-5" />
        </div>
    </div>
);

const AnnouncementListItemForStudent = ({ announcement, onClick }) => {
    const formattedDate = announcement.createdAt?.toDate ? announcement.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    return (
        <div className="group p-4 bg-transparent hover:bg-black/5 transition-colors duration-200 cursor-pointer flex items-center space-x-4 border-b border-slate-900/10 last:border-b-0" onClick={onClick}>
            <div className="flex-shrink-0 p-2.5 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <MegaphoneIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-800 transition-colors line-clamp-2">{announcement.content}</h3>
                <p className="text-sm text-slate-500 mt-1">Posted on {formattedDate}</p>
            </div>
            <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors">
                <ArrowRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default StudentClassDetailView;