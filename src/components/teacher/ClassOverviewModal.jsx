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
import { motion, AnimatePresence } from 'framer-motion';

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
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [visible, setVisible] = useState(false);
    const [cachedClassData, setCachedClassData] = useState(classData);

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

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: () => { }, confirmText: 'Delete', confirmColor: 'red' });

    // --- OPTIMIZATION: Memoize expensive array operations ---
    const allQuizzes = useMemo(() => {
        return sharedContentPosts.flatMap(p => p.quizzes || []);
    }, [sharedContentPosts]);

    // --- 4. EFFECTS ---

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            if (classData) setCachedClassData(classData);

            requestAnimationFrame(() => requestAnimationFrame(() => {
                setVisible(true);
            }));

            const timer = setTimeout(() => setCanLoadData(true), 350);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
            setCanLoadData(false);

            const transitionTimer = setTimeout(() => {
                setShouldRender(false);
                setActiveTab('announcements');
                setSharedContentPosts([]); setQuizScores([]); setUnits({});
                setSelectedLessons(new Set()); setSelectedQuizzes(new Set());
                setPostsRequested(false); setScoresRequested(false);
                setCachedClassData(null);
            }, 400); // Wait for CSS transition
            return () => clearTimeout(transitionTimer);
        }
    }, [isOpen, classData]);

    const handleInternalClose = useCallback(() => {
        setVisible(false);
        setTimeout(() => {
            onClose();
        }, 400);
    }, [onClose]);

    useEffect(() => {
        if (isOpen && canLoadData) {
            if (['lessons', 'quizzes', 'scores'].includes(activeTab)) setPostsRequested(true);
            if (activeTab === 'scores') setScoresRequested(true);
        }
    }, [activeTab, isOpen, canLoadData]);

    const activeClassData = isOpen ? classData : cachedClassData;

    useEffect(() => {
        if (!isOpen || !canLoadData || !activeClassData?.id || !postsRequested) return;
        setLoadingPosts(true);

        const unsub = onSnapshot(query(collection(db, `classes/${activeClassData.id}/posts`), orderBy('createdAt', 'asc')), async (snap) => {
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
    }, [isOpen, canLoadData, activeClassData?.id, postsRequested]);

    useEffect(() => {
        if (!isOpen || !canLoadData || !activeClassData?.id || !scoresRequested) return;
        setLoadingScores(true);
        const unsub = onSnapshot(query(collection(db, 'quizSubmissions'), where("classId", "==", activeClassData.id)), (snap) => {
            setQuizScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingScores(false);
        });
        return () => unsub();
    }, [isOpen, canLoadData, activeClassData?.id, scoresRequested]);


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
        if (!activeClassData?.id || selectedSet.size === 0) return;
        const fieldToUpdate = contentType === 'quiz' ? 'quizzes' : 'lessons';

        try {
            const batch = writeBatch(db);
            const classRef = doc(db, 'classes', activeClassData.id);
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
                    batch.update(doc(db, 'classes', activeClassData.id, 'posts', post.id), { [fieldToUpdate]: contentToKeep });
                }
            }

            if (contentType === 'quiz' && removedQuizIds.size > 0) {
                const quizIdArray = Array.from(removedQuizIds);
                for (let i = 0; i < quizIdArray.length; i += 30) {
                    const chunk = quizIdArray.slice(i, i + 30);
                    const subQ = await getDocs(query(collection(db, 'quizSubmissions'), where('quizId', 'in', chunk), where('classId', '==', activeClassData.id)));
                    subQ.forEach(d => batch.delete(d.ref));
                    const lockQ = await getDocs(query(collection(db, 'quizLocks'), where('quizId', 'in', chunk), where('classId', '==', activeClassData.id)));
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
        if (!canLoadData && activeTab !== 'announcements') return <div className="animate-pulse h-64 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-[28px]" />;

        switch (activeTab) {
            case 'announcements':
                return <AnnouncementsTab classData={activeClassData} isActive={activeTab === 'announcements'} />;

            case 'lessons':
                return (
                    <div className="flex flex-col h-full">
                        <AnimatePresence>
                            {selectedLessons.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="flex justify-end"
                                >
                                    <button onClick={() => setConfirmModal({
                                        isOpen: true,
                                        message: `Delete ${selectedLessons.size} lessons?`,
                                        onConfirm: () => executeDeleteSelected('lesson', selectedLessons)
                                    })} className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-5 py-2.5 rounded-full transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                        Delete Selected ({selectedLessons.size})
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                    </div>
                );

            case 'quizzes':
                return (
                    <div className="flex flex-col h-full">
                        <AnimatePresence>
                            {selectedQuizzes.size > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="flex justify-end"
                                >
                                    <button onClick={() => setConfirmModal({
                                        isOpen: true,
                                        message: `Delete ${selectedQuizzes.size} quizzes?`,
                                        onConfirm: () => executeDeleteSelected('quiz', selectedQuizzes)
                                    })} className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-5 py-2.5 rounded-full transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                        Delete Selected ({selectedQuizzes.size})
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <ContentLibraryTab
                            type="quiz"
                            posts={sharedContentPosts}
                            unitsMap={units}
                            isLoading={loadingPosts}
                            selectedSet={selectedQuizzes}
                            onToggleBatch={onToggleBatch}
                            onToggleSingle={onToggleSingle}
                            onViewContent={(item, post) => setViewQuizData({ ...item, settings: post.quizSettings })}
                            onDeleteContent={handleDeleteContentFromPost}
                            onEditDates={(post) => { setPostToEdit(post); setIsEditModalOpen(true); }}
                        />
                    </div>
                );

            case 'students':
                return <StudentsTab classData={activeClassData} isActive={activeTab === 'students'} onRemoveStudent={onRemoveStudent} />;

            case 'scores':
                return (
                    <ScoresTab
                        quizzes={allQuizzes}
                        units={units}
                        sharedContentPosts={sharedContentPosts}
                        quizScores={quizScores}
                        quizLocks={quizLocks}
                        setIsReportModalOpen={setIsReportModalOpen}
                        setSelectedQuizForScores={setSelectedQuizForScores}
                        setScoresDetailModalOpen={setScoresDetailModalOpen}
                        collapsedUnits={new Set()}
                        toggleUnitCollapse={() => { }}
                    />
                );

            default: return null;
        }
    };

    if (!shouldRender) return null;

    return createPortal(
        <div ref={ref} className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center p-2 sm:p-4 md:p-6 pointer-events-auto">
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${visible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleInternalClose}
            />

            <div className={`relative w-full h-full max-h-[100vh] sm:max-h-[96vh] bg-zinc-50 dark:bg-[#111318] flex flex-col rounded-[32px] sm:rounded-[36px] shadow-2xl overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] transform-gpu ${visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-[20%] sm:translate-y-[10%] opacity-0 sm:scale-95'}`}>

                {/* Header Surface (Surface Container Lowest) */}
                <div className="relative z-20 flex-none bg-zinc-50 dark:bg-[#111318] pt-6 md:pt-8 pb-2 px-4 md:px-8">

                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{activeClassData?.name}</h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">Class Code: <span className="font-mono tracking-wide">{activeClassData?.classCode}</span></p>
                        </div>
                        <button onClick={handleInternalClose} className="p-3 rounded-full bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors active:scale-95">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation Tabs - Material 3 Tonal Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
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
                                // Added shrink-0 and removed overflow-hidden to fix truncation
                                className={`relative flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-indigo-900 dark:text-indigo-100 bg-indigo-100 dark:bg-indigo-900/40'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5 relative z-10" />
                                <span className="relative z-10">{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Surface */}
                <div className="relative z-10 flex-1 overflow-y-auto bg-white dark:bg-[#1A1D24] rounded-t-[32px] md:rounded-t-[36px] border-t border-zinc-200/50 dark:border-zinc-800/50 p-4 md:p-8 hide-scrollbar shadow-[0_-4px_24px_rgba(0,0,0,0.02)] dark:shadow-none">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
                        >
                            {renderTabContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* AUXILIARY MODALS */}
            {createPortal(
                <>
                    {isReportModalOpen && (
                        <GenerateReportModal
                            isOpen={true}
                            onClose={() => setIsReportModalOpen(false)}
                            classData={activeClassData}
                            availableQuizzes={allQuizzes}
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
                            classId={activeClassData?.id}
                            isTeacherView={true}
                            className="z-[9999]"
                        />
                    )}

                    {isEditModalOpen && (
                        <EditAvailabilityModal
                            isOpen={true}
                            onClose={() => setIsEditModalOpen(false)}
                            post={postToEdit}
                            classId={activeClassData?.id}
                            onUpdate={() => { }}
                            classData={activeClassData}
                            className="z-[9999]"
                        />
                    )}

                    {selectedQuizForScores && isScoresDetailModalOpen && (
                        <QuizScoresModal
                            isOpen={true}
                            onClose={() => setScoresDetailModalOpen(false)}
                            quiz={selectedQuizForScores}
                            classData={activeClassData}
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
                        <Modal isOpen={true} onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))} size="sm" className="z-[9999]" contentClassName="p-0" roundedClass="rounded-[32px]" containerClassName="bg-black/40 backdrop-blur-sm p-4">
                            <div className="p-8 bg-zinc-50 dark:bg-zinc-900 rounded-[32px] flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                                    <TrashIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3 tracking-tight">Are you sure?</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed max-w-[250px]">{confirmModal.message}</p>

                                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                                    <button onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))} className="px-6 py-3 rounded-full font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors w-full sm:w-auto">
                                        Cancel
                                    </button>
                                    <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(p => ({ ...p, isOpen: false })); }} className={`px-6 py-3 rounded-full font-medium transition-colors w-full sm:w-auto ${confirmModal.confirmColor === 'red'
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}>
                                        {confirmModal.confirmText}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </>,
                document.body
            )}
        </div>,
        document.body
    );
});

export default memo(ClassOverviewModal);