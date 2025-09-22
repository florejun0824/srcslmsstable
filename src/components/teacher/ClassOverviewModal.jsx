import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from '../common/Modal';
import AnnouncementViewModal from '../common/AnnouncementViewModal';
import QuizScoresModal from './QuizScoresModal';
import ScoresTab from './ScoresTab';
import { db } from '../../services/firebase';
import {
    collection,
    query,
    where,
    orderBy,
    documentId,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp,
    arrayRemove,
    onSnapshot,
    getDocs,
    serverTimestamp,
    runTransaction,
    writeBatch
} from 'firebase/firestore';
import { Button } from '@tremor/react';
import {
    PencilSquareIcon,
    TrashIcon,
    CalendarDaysIcon,
    BookOpenIcon,
    AcademicCapIcon,
    UsersIcon,
    MegaphoneIcon,
    PlusCircleIcon,
    ChartBarIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    XMarkIcon
} from '@heroicons/react/24/solid';
import CreateClassAnnouncementForm from './CreateClassAnnouncementForm';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';
import UserInitialsAvatar from '../common/UserInitialsAvatar';

const fetchDocsInBatches = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) {
        chunks.push(ids.slice(i, i + 30));
    }
    const fetchPromises = chunks.map(chunk => 
        getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))
    );
    const snapshots = await Promise.all(fetchPromises);
    return snapshots.flatMap(snapshot => snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
};

const ClassOverviewModal = ({ isOpen, onClose, classData, onRemoveStudent }) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('announcements');
    const [quizScores, setQuizScores] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [sharedContentPosts, setSharedContentPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [postToEdit, setPostToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [quizLocks, setQuizLocks] = useState([]);
    const [isScoresDetailModalOpen, setScoresDetailModalOpen] = useState(false);
    const [selectedQuizForScores, setSelectedQuizForScores] = useState(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [units, setUnits] = useState({});
    const [collapsedUnits, setCollapsedUnits] = useState(new Set());
    
    useEffect(() => {
        if (!isOpen || !classData?.id) {
            setShowAddForm(false); setViewLessonData(null); setViewQuizData(null); setActiveTab('announcements');
            setAnnouncements([]); setSharedContentPosts([]); setQuizScores([]); setQuizLocks([]);
            setEditingId(null); setEditContent(''); setPostToEdit(null); setIsEditModalOpen(false);
            setIsReportModalOpen(false); setScoresDetailModalOpen(false); setSelectedQuizForScores(null);
            setSelectedAnnouncement(null); setUnits({}); setCollapsedUnits(new Set());
            return;
        }

        setLoading(true);
        let active = true;
        const unsubs = [];

        const annQuery = query(collection(db, "studentAnnouncements"), where("classId", "==", classData.id), orderBy("createdAt", "desc"));
        unsubs.push(onSnapshot(annQuery, (snapshot) => {
            if (!active) return;
            setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Error listening to announcements:", error)));

        const postsQuery = query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'desc'));
        unsubs.push(onSnapshot(postsQuery, async (snapshot) => {
            if (!active) return;
            const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);
            
            const allUnitIds = new Set(allPosts.flatMap(post => [...(post.lessons || []).map(l => l.unitId), ...(post.quizzes || []).map(q => q.unitId)]).filter(Boolean));
            if (allUnitIds.size > 0) {
                const fetchedUnits = await fetchDocsInBatches('units', Array.from(allUnitIds));
                const unitsMap = {};
                fetchedUnits.forEach(unit => { unitsMap[unit.id] = unit.title; });
                if (active) setUnits(unitsMap);
            } else {
                if (active) setUnits({});
            }

            const quizIds = Array.from(new Set(allPosts.flatMap(p => (p.quizzes || []).map(q => q.id))));
            if (quizIds.length > 0) {
                const locksQuery = query(collection(db, 'quizLocks'), where("classId", "==", classData.id), where("quizId", "in", quizIds));
                const locksSnap = await getDocs(locksQuery);
                if (active) setQuizLocks(locksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                if (active) setQuizLocks([]);
            }
        }, (error) => console.error("Error listening to posts:", error)));

        const scoresQuery = query(collection(db, 'quizSubmissions'), where("classId", "==", classData.id));
        unsubs.push(onSnapshot(scoresQuery, (snapshot) => {
            if (!active) return;
            setQuizScores(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error listening to quiz scores:", error);
            setLoading(false);
        }));

        return () => {
            active = false;
            unsubs.forEach(unsub => unsub());
        };
    }, [isOpen, classData?.id]);

    const toggleUnitCollapse = (unitTitle) => {
        setCollapsedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitTitle)) newSet.delete(unitTitle);
            else newSet.add(unitTitle);
            return newSet;
        });
    };
    const onChangeEdit = (e) => setEditContent(e.target.value);
    
    useEffect(() => {
        if (isOpen && (activeTab === 'lessons' || activeTab === 'quizzes' || activeTab === 'scores')) {
            const allUnitTitles = new Set();
            sharedContentPosts.forEach(post => {
                (post.lessons || []).forEach(lesson => {
                    if (lesson && lesson.unitId) allUnitTitles.add(units[lesson.unitId] || 'Uncategorized');
                });
                (post.quizzes || []).forEach(quiz => {
                    if (quiz && quiz.unitId) allUnitTitles.add(units[quiz.unitId] || 'Uncategorized');
                    else allUnitTitles.add('Uncategorized');
                });
            });
            if (allUnitTitles.size > 0) setCollapsedUnits(allUnitTitles);
        } else {
            setCollapsedUnits(new Set());
        }
    }, [activeTab, units, sharedContentPosts, isOpen]);

    const handleTabChange = (tabName) => setActiveTab(tabName);
    const handleUnlockQuiz = async (quizId, studentId) => {
        if (!window.confirm("Are you sure you want to unlock this quiz?")) return;
        try {
            await deleteDoc(doc(db, 'quizLocks', `${quizId}_${studentId}`));
            showToast("Quiz unlocked.", "success");
        } catch (error) {
            showToast("Failed to unlock quiz.", "error");
        }
    };
    const handleEditDatesClick = (post) => {
        setPostToEdit(post);
        setIsEditModalOpen(true);
    };

    // MODIFIED: This function now also deletes quiz submissions when a quiz is unshared.
    const handleDeleteContentFromPost = async (postId, contentIdToRemove, contentType) => {
        if (!classData?.id) return;
        if (!window.confirm(`Are you sure you want to unshare this ${contentType}? This will also delete all student submissions for this quiz in this class.`)) return;
        
        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';
        
        try {
            const batch = writeBatch(db);
            const postRef = doc(db, 'classes', classData.id, 'posts', postId);
            const classRef = doc(db, "classes", classData.id);

            const postToUpdate = sharedContentPosts.find(p => p.id === postId);
            const updatedContent = postToUpdate[fieldToUpdate].filter(item => item.id !== contentIdToRemove);
            
            batch.update(postRef, { [fieldToUpdate]: updatedContent });
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });

            // ADDED: If it's a quiz, find and delete all related submissions for this class.
            if (contentType === 'quiz') {
                const submissionsQuery = query(
                    collection(db, 'quizSubmissions'), 
                    where('quizId', '==', contentIdToRemove), 
                    where('classId', '==', classData.id)
                );
                const submissionsSnapshot = await getDocs(submissionsQuery);
                submissionsSnapshot.forEach(submissionDoc => {
                    batch.delete(submissionDoc.ref);
                });
            }
            
            await batch.commit();

            showToast(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} and all its data for this class have been removed.`, "success");
        } catch (error) {
            console.error(`Error unsharing ${contentType}:`, error);
            showToast(`Failed to unshare ${contentType}.`, "error");
        }
    };

    const handlePostUpdate = (updateInfo) => {
        if (updateInfo.isDeleted) {
            setSharedContentPosts(prevPosts => prevPosts.filter(p => p.id !== updateInfo.id));
        } else {
            setSharedContentPosts(prevPosts => 
                prevPosts.map(p => p.id === updateInfo.id ? { ...p, ...updateInfo } : p)
            );
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'studentAnnouncements', id));
            showToast("Announcement deleted.", "success");
        } catch (error) {
            showToast("Failed to delete announcement.", "error");
        }
    };
    const handleEditSave = async (id) => {
        const trimmedContent = editContent.trim();
        if (!trimmedContent) return showToast("Content cannot be empty.", "error");
        try {
            await updateDoc(doc(db, 'studentAnnouncements', id), { content: trimmedContent });
            setEditingId(null);
            setEditContent('');
            showToast("Announcement updated.", "success");
        } catch (error) {
            showToast("Failed to update.", "error");
        }
    };
    
    const renderContent = () => {
        if (loading) return <div className="text-center py-10 text-slate-500 text-lg">Loading...</div>;
        
        const EmptyState = ({ icon: Icon, text, subtext }) => (
            <div className="text-center p-12 bg-neumorphic-base rounded-2xl shadow-neumorphic-inset mt-4">
                <Icon className="h-16 w-16 mb-4 text-slate-300 mx-auto" />
                <p className="text-xl font-semibold text-slate-700">{text}</p>
                <p className="mt-2 text-base text-slate-500">{subtext}</p>
            </div>
        );
        const customUnitSort = (a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0], 10);
            const numB = parseInt(b.match(/\d+/)?.[0], 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;
            return a.localeCompare(b);
        };
        const ListItem = ({ children }) => (
            <div className="flex items-center justify-between gap-4 py-3 px-4 transition-shadow rounded-xl hover:shadow-neumorphic-inset">
                {children}
            </div>
        );
        const UnitGroup = ({ title, children }) => (
            <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic">
                <button className="flex items-center justify-between w-full p-4 font-semibold text-xl text-slate-800" onClick={() => toggleUnitCollapse(title)}>
                    <span>{title}</span>
                    <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${!collapsedUnits.has(title) ? 'rotate-180' : ''}`} />
                </button>
                {!collapsedUnits.has(title) && <div className="px-2 pb-2">{children}</div>}
            </div>
        );
        
        if (activeTab === 'lessons') {
            const lessonsByUnit = sharedContentPosts.reduce((acc, post) => {
                (post.lessons || []).forEach(lessonDetails => {
                    const unitDisplayName = units[lessonDetails.unitId] || 'Uncategorized';
                    if (!acc[unitDisplayName]) acc[unitDisplayName] = [];
                    acc[unitDisplayName].push({ post, lessonDetails });
                });
                return acc;
            }, {});
            const sortedUnitKeys = Object.keys(lessonsByUnit).sort(customUnitSort);
            return (
                <div className="space-y-6">
                    {sortedUnitKeys.length > 0 ? sortedUnitKeys.map(unitDisplayName => (
                        <UnitGroup key={unitDisplayName} title={unitDisplayName}>
                            {lessonsByUnit[unitDisplayName].sort((a, b) => a.lessonDetails.title.localeCompare(b.lessonDetails.title)).map(({ post, lessonDetails }) => (
                                <ListItem key={`${post.id}-${lessonDetails.id}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 text-lg cursor-pointer hover:text-sky-600 transition-colors truncate" onClick={() => setViewLessonData(lessonDetails)}>{lessonDetails.title}</p>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-slate-400" /><span>{post.availableFrom?.toDate().toLocaleString()}</span></div>
                                    </div>
                                    <div className="flex space-x-1 flex-shrink-0">
                                        <button onClick={() => handleEditDatesClick(post)} title="Edit Availability" className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset"><PencilSquareIcon className="w-5 h-5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, lessonDetails.id, 'lesson'); }} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title="Unshare Lesson"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </ListItem>
                            ))}
                        </UnitGroup>
                    )) : <EmptyState icon={BookOpenIcon} text="No lessons shared yet" subtext="Share lessons with your class to get started." />}
                </div>
            );
        }
        if (activeTab === 'quizzes') {
             const quizzesByUnit = sharedContentPosts.reduce((acc, post) => {
                (post.quizzes || []).forEach(quizDetails => {
                    const unitDisplayName = units[quizDetails.unitId] || 'Uncategorized';
                    if (!acc[unitDisplayName]) acc[unitDisplayName] = [];
                    acc[unitDisplayName].push({ post, quizDetails });
                });
                return acc;
            }, {});
            const sortedUnitKeys = Object.keys(quizzesByUnit).sort(customUnitSort);
            return (
                <div className="space-y-6">
                    {sortedUnitKeys.length > 0 ? sortedUnitKeys.map(unitDisplayName => (
                        <UnitGroup key={unitDisplayName} title={unitDisplayName}>
                            {quizzesByUnit[unitDisplayName].sort((a, b) => a.quizDetails.title.localeCompare(b.quizDetails.title)).map(({ post, quizDetails }) => (
                                <ListItem key={`${post.id}-${quizDetails.id}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 text-lg cursor-pointer hover:text-purple-600 transition-colors truncate" onClick={() => setViewQuizData(quizDetails)}>{quizDetails.title}</p>
                                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-slate-400" /><span>{post.availableFrom?.toDate().toLocaleString()}</span></div>
                                    </div>
                                    <div className="flex space-x-1 flex-shrink-0">
                                        <button onClick={() => handleEditDatesClick(post)} title="Edit Availability" className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset"><PencilSquareIcon className="w-5 h-5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteContentFromPost(post.id, quizDetails.id, 'quiz'); }} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title="Unshare Quiz"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </ListItem>
                            ))}
                        </UnitGroup>
                    )) : <EmptyState icon={AcademicCapIcon} text="No quizzes shared yet" subtext="Share quizzes with your class to get started." />}
                </div>
            );
        }
        if (activeTab === 'scores') {
            const allQuizzesFromPosts = sharedContentPosts.flatMap(p => p.quizzes || []);
            const allLessonsFromPosts = sharedContentPosts.flatMap(p => p.lessons || []);
            return (
                <ScoresTab
                    quizzes={allQuizzesFromPosts}
                    units={units}
                    sharedContentPosts={sharedContentPosts}
                    lessons={allLessonsFromPosts}
                    quizScores={quizScores}
                    setIsReportModalOpen={setIsReportModalOpen}
                    setSelectedQuizForScores={setSelectedQuizForScores}
                    setScoresDetailModalOpen={setScoresDetailModalOpen}
                    collapsedUnits={collapsedUnits}
                    toggleUnitCollapse={toggleUnitCollapse}
                />
            );
        }
        if (activeTab === 'students') {
            return (
                 <div className="space-y-3">
                    {(classData?.students && classData.students.length > 0) ? (
                        <div className="bg-neumorphic-base rounded-2xl shadow-neumorphic-inset p-1">
                            {classData.students.map(student => (
                                <ListItem key={student.id}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex-shrink-0">
                                            <UserInitialsAvatar user={student} size="w-10 h-10" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{student.firstName} {student.lastName}</p>
                                            <p className="text-sm text-slate-500">ID: {student.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => onRemoveStudent(classData.id, student.id)} className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset" title={`Remove ${student.firstName}`}><TrashIcon className="w-5 h-5" /></button>
                                </ListItem>
                            ))}
                        </div>
                    ) : <EmptyState icon={UsersIcon} text="No students enrolled" subtext="Share the class code to get students enrolled." />}
                </div>
            );
        }
        return (
            <div className="flex-1 flex flex-col">
                {showAddForm && (<div className="mb-6"><CreateClassAnnouncementForm classId={classData.id} onAnnouncementPosted={() => setShowAddForm(false)} /></div>)}
                <div className="space-y-4">
                    {announcements.length > 0 ? announcements.map(post => (<AnnouncementListItem key={post.id} post={post} isOwn={userProfile?.id === post.teacherId} onEdit={() => { setEditingId(post.id); setEditContent(post.content); }} onDelete={() => handleDelete(post.id)} isEditing={editingId === post.id} editContent={editContent} onChangeEdit={onChangeEdit} onSaveEdit={() => handleEditSave(post.id)} onCancelEdit={() => setEditingId(null)} onClick={() => setSelectedAnnouncement(post)} />)) : <EmptyState icon={MegaphoneIcon} text="No announcements yet" subtext="Post important updates for your students here." />}
                </div>
            </div>
        );
    };

    const tabs = [
        { id: 'announcements', name: 'Announcements', icon: MegaphoneIcon },
        { id: 'lessons', name: 'Lessons', icon: BookOpenIcon },
        { id: 'quizzes', name: 'Quizzes', icon: AcademicCapIcon },
        { id: 'scores', name: 'Scores', icon: ChartBarIcon },
        { id: 'students', name: 'Students', icon: UsersIcon, count: classData?.students?.length || 0 }
    ];

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title=""
                size="screen"
                roundedClass="rounded-2xl"
                containerClassName="h-full p-4 bg-black/30 backdrop-blur-sm"
                contentClassName="p-0"
                showCloseButton={true}
            >
                <div className="flex flex-col md:flex-row bg-transparent h-full w-full gap-4">
                    <nav className="flex-shrink-0 bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic md:w-64">
                        <div className="mb-6 p-2 hidden md:block">
                             <h2 className="text-2xl font-bold text-slate-800 truncate">{classData?.name || 'Class'}</h2>
                             <p className="text-sm text-slate-600">Class Management</p>
                        </div>
                        <div className="flex flex-row md:flex-col md:space-y-2 overflow-x-auto gap-2">
                           {tabs.map(tab => (
                               <button 
                                   key={tab.id} 
                                   onClick={() => handleTabChange(tab.id)} 
                                   className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 w-full text-left flex-shrink-0 ${activeTab === tab.id ? 'shadow-neumorphic-inset text-sky-600' : 'text-slate-700 hover:shadow-neumorphic-inset'}`}
                               >
                                   <tab.icon className="h-5 w-5" /> {tab.name} {tab.count !== undefined && `(${tab.count})`}
                               </button>
                           ))}
                        </div>
                    </nav>
                    
                    <main className="flex-1 bg-neumorphic-base rounded-2xl shadow-neumorphic flex flex-col overflow-hidden">
                        <header className="px-8 pt-8 pb-4 flex-shrink-0 flex items-center justify-between">
                            <h2 className="text-3xl font-bold text-slate-900 capitalize">{activeTab}</h2>
                            {activeTab === 'announcements' && userProfile?.role === 'teacher' && (
                                <div>
                                    <Button onClick={() => setShowAddForm(prev => !prev)} icon={PlusCircleIcon} className="font-semibold text-white bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset border-none">{showAddForm ? 'Cancel' : 'New'}</Button>
                                </div>
                            )}
                        </header>
                        <div className="flex-1 px-8 pb-8 overflow-y-auto">
                           {renderContent()}
                        </div>
                    </main>
                </div>
            </Modal>
            
						 <GenerateReportModal
						   isOpen={isReportModalOpen}
						   onClose={() => setIsReportModalOpen(false)}
						   classData={classData}
						   availableQuizzes={sharedContentPosts.flatMap(p => p.quizzes || [])}
						   quizScores={quizScores}
						   units={units}
						   sharedContentPosts={sharedContentPosts}
						   className="z-[120]"
						 />
            
            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} className="z-[120]" />
            <ViewQuizModal isOpen={!!viewQuizData} onClose={() => setViewQuizData(null)} quiz={viewQuizData} userProfile={userProfile} classId={classData?.id} isTeacherView={userProfile.role === 'teacher' || userProfile.role === 'admin'} className="z-[120]" />
            <EditAvailabilityModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} post={postToEdit} classId={classData?.id} onUpdate={handlePostUpdate} className="z-[120]" />
            {selectedQuizForScores && (<QuizScoresModal isOpen={isScoresDetailModalOpen} onClose={() => setScoresDetailModalOpen(false)} quiz={selectedQuizForScores} classData={classData} quizScores={quizScores} quizLocks={quizLocks} onUnlockQuiz={handleUnlockQuiz} className="z-[120]" />)}
            <AnnouncementViewModal isOpen={!!selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} announcement={selectedAnnouncement} className="z-[120]" />
        </>
    );
};

const AnnouncementListItem = ({ post, isOwn, onEdit, onDelete, isEditing, editContent, onChangeEdit, onSaveEdit, onCancelEdit, onClick }) => {
    const formattedDate = post.createdAt?.toDate().toLocaleString() || 'N/A';
    return (
        <div className="group relative bg-neumorphic-base p-5 rounded-2xl shadow-neumorphic transition-shadow duration-300 hover:shadow-neumorphic-inset cursor-pointer" onClick={!isEditing ? onClick : undefined}>
            {isEditing ? (
                <div className="flex flex-col gap-3">
                    <textarea className="w-full border-none p-2 rounded-lg text-base text-slate-800 focus:ring-0 bg-neumorphic-base shadow-neumorphic-inset" rows={3} value={editContent} onChange={onChangeEdit} onClick={(e) => e.stopPropagation()} />
                    <div className="flex justify-end gap-2">
                        <button className="px-4 py-1.5 text-sm rounded-full font-semibold bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset" onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}>Cancel</button>
                        <button className="px-4 py-1.5 text-sm rounded-full font-semibold bg-neumorphic-base text-sky-600 shadow-neumorphic hover:shadow-neumorphic-inset" onClick={(e) => { e.stopPropagation(); onSaveEdit(); }}>Save</button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                        <p className="font-semibold text-slate-800 text-base leading-snug group-hover:text-sky-600 transition-colors">{post.content}</p>
                        <p className="text-sm text-slate-500 mt-2">Posted by <span className="font-medium">{post.teacherName}</span> on {formattedDate}</p>
                    </div>
                    {isOwn && <div className="flex space-x-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit" className="p-2 rounded-full text-slate-500 hover:shadow-neumorphic-inset"><PencilSquareIcon className="w-5 h-5" /></button><button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" className="p-2 rounded-full text-red-500 hover:shadow-neumorphic-inset"><TrashIcon className="w-5 h-5" /></button></div>}
                </div>
            )}
        </div>
    );
};

export default ClassOverviewModal;