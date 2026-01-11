// src/components/teacher/ClassOverviewModal.jsx

import React, { useState, useEffect, useCallback, memo, forwardRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../common/Modal';
import { db } from '../../services/firebase';
import {
    collection, query, where, orderBy, documentId,
    doc, deleteDoc, onSnapshot, getDocs,
    serverTimestamp, writeBatch
} from 'firebase/firestore';
import {
    ChatBubbleBottomCenterTextIcon,
    PlayCircleIcon,
    ClipboardDocumentListIcon,
    PresentationChartLineIcon,
    UserGroupIcon,
    XMarkIcon,
    TrashIcon
} from '@heroicons/react/24/solid';

// --- CONTEXTS ---
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

// --- SUB-COMPONENTS ---
import AnnouncementsTab from './class-overview/AnnouncementsTab';
import StudentsTab from './class-overview/StudentsTab';
import ContentLibraryTab from './class-overview/ContentLibraryTab';
import ScoresTab from './ScoresTab';

// --- MODALS ---
import ViewLessonModal from './ViewLessonModal';
import ViewQuizModal from './ViewQuizModal';
import GenerateReportModal from './GenerateReportModal';
import EditAvailabilityModal from './EditAvailabilityModal';
import QuizScoresModal from './QuizScoresModal';

// --- HELPERS ---
const AuroraBackground = memo(() => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-[#0f1115]">
        <div className="absolute inset-0 opacity-60 dark:opacity-30"
             style={{
                 backgroundImage: `
                    radial-gradient(at 0% 0%, rgba(147, 197, 253, 0.4) 0px, transparent 50%),
                    radial-gradient(at 100% 100%, rgba(192, 132, 252, 0.3) 0px, transparent 50%)
                 `
             }}
        />
    </div>
));

const fetchDocsInBatches = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
    const snapshots = await Promise.all(chunks.map(chunk => getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk)))));
    return snapshots.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};

// --- MAIN COMPONENT ---

const ClassOverviewModal = forwardRef(({ isOpen, onClose, classData, onRemoveStudent }, ref) => {
    const { userProfile } = useAuth();
    const { showToast } = useToast();
    
    // --- 1. CORE STATE ---
    const [activeTab, setActiveTab] = useState('announcements');
    const [canLoadData, setCanLoadData] = useState(false);

    // --- 2. SHARED DATA STATE (Posts & Scores) ---
    const [sharedContentPosts, setSharedContentPosts] = useState([]);
    const [units, setUnits] = useState({});
    const [quizScores, setQuizScores] = useState([]);
    
    // Loading Flags
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingScores, setLoadingScores] = useState(false);
    const [postsRequested, setPostsRequested] = useState(false);
    const [scoresRequested, setScoresRequested] = useState(false);

    // --- 3. SELECTION & MODAL STATE ---
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [selectedQuizzes, setSelectedQuizzes] = useState(new Set());
    
    // Auxiliary Modals
    const [viewLessonData, setViewLessonData] = useState(null);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [postToEdit, setPostToEdit] = useState(null); 
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Reporting & Scores
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isScoresDetailModalOpen, setScoresDetailModalOpen] = useState(false);
    const [selectedQuizForScores, setSelectedQuizForScores] = useState(null);
    const [quizLocks, setQuizLocks] = useState([]);

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => {}, confirmText: 'Delete', confirmColor: 'red' });

    // --- OPTIMIZATION: Memoize expensive array operations ---
    const allQuizzes = useMemo(() => {
        return sharedContentPosts.flatMap(p => p.quizzes || []);
    }, [sharedContentPosts]);

    // --- 4. EFFECTS ---

    useEffect(() => {
        let timer;
        if (isOpen) {
            timer = setTimeout(() => setCanLoadData(true), 350);
        } else {
            setCanLoadData(false);
            const resetTimer = setTimeout(() => {
                setActiveTab('announcements');
                setSharedContentPosts([]); setQuizScores([]); setUnits({});
                setSelectedLessons(new Set()); setSelectedQuizzes(new Set());
                setPostsRequested(false); setScoresRequested(false);
            }, 300);
            return () => clearTimeout(resetTimer);
        }
        return () => clearTimeout(timer);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && canLoadData) {
            if (['lessons', 'quizzes', 'scores'].includes(activeTab)) setPostsRequested(true);
            if (activeTab === 'scores') setScoresRequested(true);
        }
    }, [activeTab, isOpen, canLoadData]);

    useEffect(() => {
        if (!isOpen || !canLoadData || !classData?.id || !postsRequested) return;
        setLoadingPosts(true);
        
        const unsub = onSnapshot(query(collection(db, `classes/${classData.id}/posts`), orderBy('createdAt', 'asc')), async (snap) => {
            const allPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSharedContentPosts(allPosts);
            
            const allUnitIds = new Set(allPosts.flatMap(p => [
                ...(p.lessons || []).map(l => l.unitId), 
                ...(p.quizzes || []).map(q => q.unitId)
            ]).filter(Boolean));
            
            if (allUnitIds.size > 0) {
                const fetchedUnits = await fetchDocsInBatches('units', Array.from(allUnitIds));
                const map = {}; fetchedUnits.forEach(u => map[u.id] = u.title);
                setUnits(map);
            }
            setLoadingPosts(false);
        });
        return () => unsub();
    }, [isOpen, canLoadData, classData?.id, postsRequested]);

    useEffect(() => {
        if (!isOpen || !canLoadData || !classData?.id || !scoresRequested) return;
        setLoadingScores(true);
        const unsub = onSnapshot(query(collection(db, 'quizSubmissions'), where("classId", "==", classData.id)), (snap) => {
            setQuizScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingScores(false);
        });
        return () => unsub();
    }, [isOpen, canLoadData, classData?.id, scoresRequested]);


    // --- 5. ACTION HANDLERS ---

    const onToggleBatch = useCallback((type, ids, isAllSelected) => {
        const setFunction = type === 'lesson' ? setSelectedLessons : setSelectedQuizzes;
        setFunction(prev => {
            const newSet = new Set(prev);
            ids.forEach(id => isAllSelected ? newSet.delete(id) : newSet.add(id));
            return newSet;
        });
    }, []);

    const onToggleSingle = useCallback((type, id) => {
        const setFunction = type === 'lesson' ? setSelectedLessons : setSelectedQuizzes;
        setFunction(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    }, []);

    const executeDeleteSelected = async (contentType, selectedSet) => {
        if (!classData?.id || selectedSet.size === 0) return;
        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';

        try {
            const batch = writeBatch(db);
            const classRef = doc(db, 'classes', classData.id);
            const removedQuizIds = new Set();

            for (const post of sharedContentPosts) {
                const currentContent = post[fieldToUpdate] || [];
                if (currentContent.length === 0) continue;
                
                const contentToKeep = currentContent.filter((item) => {
                    const isSelected = selectedSet.has(item.id); 
                    if (isSelected && contentType === 'quiz') removedQuizIds.add(item.id);
                    return !isSelected;
                });

                if (contentToKeep.length < currentContent.length) {
                    batch.update(doc(db, 'classes', classData.id, 'posts', post.id), { [fieldToUpdate]: contentToKeep });
                }
            }

            if (contentType === 'quiz' && removedQuizIds.size > 0) {
                 const quizIdArray = Array.from(removedQuizIds);
                 for (let i = 0; i < quizIdArray.length; i += 30) {
                    const chunk = quizIdArray.slice(i, i + 30);
                    const subQ = await getDocs(query(collection(db, 'quizSubmissions'), where('quizId', 'in', chunk), where('classId', '==', classData.id)));
                    subQ.forEach(d => batch.delete(d.ref));
                    const lockQ = await getDocs(query(collection(db, 'quizLocks'), where('quizId', 'in', chunk), where('classId', '==', classData.id)));
                    lockQ.forEach(d => batch.delete(d.ref));
                 }
            }

            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            await batch.commit();

            if (contentType === 'lesson') {
                showToast(`${selectedSet.size} lessons unshared.`, 'success');
                setSelectedLessons(new Set());
            } else {
                showToast(`${selectedSet.size} quizzes unshared.`, 'success');
                setSelectedQuizzes(new Set());
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to delete content.", "error");
        }
    };

    const handleDeleteContentFromPost = (postId, contentId, type) => {
         const set = new Set([contentId]);
         setConfirmModal({
            isOpen: true,
            message: `Remove this ${type}?`,
            onConfirm: () => executeDeleteSelected(type, set)
        });
    };

    const handleUnlockQuiz = async (quizId, studentId) => {
        try {
            await deleteDoc(doc(db, 'quizLocks', `${quizId}_${studentId}`));
            showToast("Quiz unlocked.", "success");
        } catch (error) { showToast("Failed to unlock.", "error"); }
    };

    // --- RENDER ---

    const renderTabContent = () => {
        if (!canLoadData && activeTab !== 'announcements') return <div className="animate-pulse h-64 bg-white/10 rounded-3xl" />;

        switch (activeTab) {
            case 'announcements':
                return <AnnouncementsTab classData={classData} isActive={activeTab === 'announcements'} />;
            
            case 'lessons':
                return (
                    <>
                        <div className="flex justify-end mb-4">
                            {selectedLessons.size > 0 && (
                                <button onClick={() => setConfirmModal({
                                    isOpen: true, 
                                    message: `Delete ${selectedLessons.size} lessons?`, 
                                    onConfirm: () => executeDeleteSelected('lesson', selectedLessons) 
                                })} className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-full">
                                    Delete Selected ({selectedLessons.size})
                                </button>
                            )}
                        </div>
                        <ContentLibraryTab 
                            type="lesson"
                            posts={sharedContentPosts}
                            unitsMap={units}
                            isLoading={loadingPosts}
                            selectedSet={selectedLessons}
                            onToggleBatch={onToggleBatch}
                            onToggleSingle={onToggleSingle}
                            onViewContent={(item) => setViewLessonData(item)}
                            onDeleteContent={handleDeleteContentFromPost}
                            onEditDates={(post) => { setPostToEdit(post); setIsEditModalOpen(true); }}
                        />
                    </>
                );

            case 'quizzes':
                return (
                    <>
                        <div className="flex justify-end mb-4">
                            {selectedQuizzes.size > 0 && (
                                <button onClick={() => setConfirmModal({
                                    isOpen: true, 
                                    message: `Delete ${selectedQuizzes.size} quizzes?`, 
                                    onConfirm: () => executeDeleteSelected('quiz', selectedQuizzes) 
                                })} className="text-red-500 font-bold text-sm bg-red-50 px-4 py-2 rounded-full">
                                    Delete Selected ({selectedQuizzes.size})
                                </button>
                            )}
                        </div>
                        <ContentLibraryTab 
                            type="quiz"
                            posts={sharedContentPosts}
                            unitsMap={units}
                            isLoading={loadingPosts}
                            selectedSet={selectedQuizzes}
                            onToggleBatch={onToggleBatch}
                            onToggleSingle={onToggleSingle}
                            onViewContent={(item, post) => setViewQuizData({...item, settings: post.quizSettings})}
                            onDeleteContent={handleDeleteContentFromPost}
                            onEditDates={(post) => { setPostToEdit(post); setIsEditModalOpen(true); }}
                        />
                    </>
                );

            case 'students':
                return <StudentsTab classData={classData} isActive={activeTab === 'students'} onRemoveStudent={onRemoveStudent} />;

            case 'scores':
                return (
                    <ScoresTab 
                        quizzes={allQuizzes} // Using Memoized prop
                        units={units}
                        sharedContentPosts={sharedContentPosts}
                        quizScores={quizScores}
						quizLocks={quizLocks}
                        setIsReportModalOpen={setIsReportModalOpen}
                        setSelectedQuizForScores={setSelectedQuizForScores}
                        setScoresDetailModalOpen={setScoresDetailModalOpen}
                        collapsedUnits={new Set()} 
                        toggleUnitCollapse={() => {}}
                    />
                );

            default: return null;
        }
    };

    return (
        <div ref={ref} className="h-full w-full pointer-events-auto">
            {/* OPTIMIZATION: Removed 'backdrop-blur-sm' from container to avoid stacking blurs (lag) */}
            <Modal isOpen={isOpen} onClose={onClose} size="screen" roundedClass="rounded-none sm:rounded-3xl" containerClassName="h-full sm:p-4 bg-black/50" contentClassName="p-0 w-full h-full" showCloseButton={false}>
                <div className="relative w-full h-full sm:h-[85vh] bg-[#f8fafc] dark:bg-black overflow-hidden flex flex-col rounded-none sm:rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10">
                    <AuroraBackground />
                    
                    {/* Header */}
                    <div className="relative z-20 flex-none bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{classData?.name}</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{classData?.classCode}</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900"><XMarkIcon className="w-6 h-6" /></button>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 custom-scrollbar">
                            {[
                                { id: 'announcements', name: 'Notices', icon: ChatBubbleBottomCenterTextIcon },
                                { id: 'lessons', name: 'Lessons', icon: PlayCircleIcon },
                                { id: 'quizzes', name: 'Quizzes', icon: ClipboardDocumentListIcon },
                                { id: 'scores', name: 'Scores', icon: PresentationChartLineIcon },
                                { id: 'students', name: 'Students', icon: UserGroupIcon }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                        {renderTabContent()}
                    </div>
                </div>
                
                {/* AUXILIARY MODALS - OPTIMIZATION: Conditional Rendering applied here */}
                {createPortal(
                    <>
                        {isReportModalOpen && (
                            <GenerateReportModal 
                                isOpen={true} 
                                onClose={() => setIsReportModalOpen(false)} 
                                classData={classData} 
                                availableQuizzes={allQuizzes} // Using Memoized prop
                                quizScores={quizScores} 
                                units={units} 
                                sharedContentPosts={sharedContentPosts} 
                                className="z-[9999]"
                            />
                        )}
                        
                        {viewLessonData && (
                            <ViewLessonModal 
                                isOpen={true} 
                                onClose={() => setViewLessonData(null)} 
                                lesson={viewLessonData} 
                                className="z-[9999]" 
                            />
                        )}

                        {viewQuizData && (
                            <ViewQuizModal 
                                isOpen={true} 
                                onClose={() => setViewQuizData(null)} 
                                quiz={viewQuizData} 
                                userProfile={userProfile} 
                                classId={classData?.id} 
                                isTeacherView={true} 
                                className="z-[9999]" 
                            />
                        )}

                        {isEditModalOpen && (
                            <EditAvailabilityModal 
                                isOpen={true} 
                                onClose={() => setIsEditModalOpen(false)} 
                                post={postToEdit} 
                                classId={classData?.id} 
                                onUpdate={() => {}} 
                                classData={classData} 
                                className="z-[9999]" 
                            />
                        )}

                        {selectedQuizForScores && isScoresDetailModalOpen && (
                            <QuizScoresModal 
                                isOpen={true} 
                                onClose={() => setScoresDetailModalOpen(false)} 
                                quiz={selectedQuizForScores} 
                                classData={classData} 
                                quizScores={quizScores} 
                                setQuizScores={setQuizScores} 
                                quizLocks={quizLocks} 
                                onUnlockQuiz={handleUnlockQuiz} 
                                setIsReportModalOpen={setIsReportModalOpen} 
                                className="z-[9999]" 
                            />
                        )}
                        
                        {/* Confirmation Modal */}
                        {confirmModal.isOpen && (
                            <Modal isOpen={true} onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))} title="Confirmation" size="sm" className="z-[9999]" contentClassName="p-0" roundedClass="rounded-[28px]" containerClassName="bg-black/50 backdrop-blur-sm">
                                <div className="p-6 bg-white dark:bg-[#1A1D24] rounded-[28px]">
                                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
                                        <TrashIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">Are you sure?</h3>
                                    <p className="text-center text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">{confirmModal.message}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))} className="py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">Cancel</button>
                                        <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, isOpen: false })); }} className={`py-3 rounded-xl font-semibold text-white shadow-lg ${confirmModal.confirmColor === 'red' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500'}`}>{confirmModal.confirmText}</button>
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </>,
                    document.body
                )}
            </Modal>
        </div>
    );
});

export default memo(ClassOverviewModal);