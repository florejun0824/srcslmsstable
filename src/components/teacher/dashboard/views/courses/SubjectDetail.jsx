// src/components/teacher/dashboard/views/courses/SubjectDetail.jsx
import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
    PencilSquareIcon, TrashIcon, PlusCircleIcon, SparklesIcon,
    PresentationChartBarIcon, ArrowPathIcon, XMarkIcon, CheckCircleIcon,
    BookOpenIcon, ShareIcon
} from '@heroicons/react/24/outline';
import UnitAccordion from '../../../UnitAccordion';
import Spinner from '../../../../../components/common/Spinner';
import { MATERIAL_STYLES } from './coursesStyles';
import Breadcrumbs from './Breadcrumbs';

const SubjectDetail = memo((props) => {
    const {
        courses, handleOpenEditSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating,
        onSetActiveUnit, onGeneratePresentationPreview, setActiveSubject,
        handleCategoryClick, activeUnit,
    } = props;

    const { contentGroup, categoryName, subjectId, unitId } = useParams();
    const navigate = useNavigate();

    const [units, setUnits] = useState([]);
    const [allLessonsForSubject, setAllLessonsForSubject] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(true);

    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [showLessonPicker, setShowLessonPicker] = useState(false);
    const [activeUnitForPicker, setActiveUnitForPicker] = useState(null);

    const activeSubject = useMemo(() => courses?.find(c => c.id === subjectId), [courses, subjectId]);
    const prevActiveSubjectIdRef = useRef();

    const pickerLessons = useMemo(() => {
        if (!activeUnitForPicker || !allLessonsForSubject) return [];
        return allLessonsForSubject
            .filter(l => l.unitId === activeUnitForPicker.id)
            .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    }, [allLessonsForSubject, activeUnitForPicker]);

    useEffect(() => {
        if (activeSubject && activeSubject.id !== prevActiveSubjectIdRef.current) {
            if (setActiveSubject) setActiveSubject(activeSubject);
            prevActiveSubjectIdRef.current = activeSubject.id;
        }
        const decodedName = decodeURIComponent(categoryName);
        if (handleCategoryClick) handleCategoryClick(decodedName);
    }, [activeSubject, categoryName, setActiveSubject, handleCategoryClick]);

    useEffect(() => {
        if (loadingUnits) return;
        if (unitId) {
            const foundUnit = units.find(u => u.id === unitId);
            if (foundUnit && activeUnit?.id !== foundUnit.id) {
                if(onSetActiveUnit) onSetActiveUnit(foundUnit);
            }
        } else if (activeUnit) {
            if(onSetActiveUnit) onSetActiveUnit(null);
        }
    }, [unitId, units, activeUnit, onSetActiveUnit, loadingUnits]);

    useEffect(() => {
        if (activeSubject?.id) {
            setLoadingUnits(true);
            const unsubUnits = onSnapshot(query(collection(db, 'units'), where('subjectId', '==', activeSubject.id)), (snap) => {
                setUnits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingUnits(false);
            });
            const unsubLessons = onSnapshot(query(collection(db, 'lessons'), where('subjectId', '==', activeSubject.id)), (snap) => {
                setAllLessonsForSubject(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => { unsubUnits(); unsubLessons(); };
        }
    }, [activeSubject?.id]);

    const handleGeneratePresentationClick = useCallback(() => {
        if (onGeneratePresentationPreview && activeSubject) {
            onGeneratePresentationPreview(Array.from(selectedLessons), allLessonsForSubject || [], units || [], activeSubject);
        }
    }, [onGeneratePresentationPreview, selectedLessons, allLessonsForSubject, units, activeSubject]);

    if (!activeSubject) return <div className="h-full flex items-center justify-center"><Spinner /></div>;

    return (
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] ${MATERIAL_STYLES.bgScaffold} bg-slate-50/50 dark:bg-slate-950/50`}>
            {/* Elegant glass top bar */}
            <header className="sticky top-0 z-50 flex-none px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-black/[0.04] dark:border-white/[0.04] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-t-[24px] sm:rounded-t-[32px] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col gap-1 w-full min-w-0">
                    <Breadcrumbs
                        contentGroup={contentGroup}
                        categoryName={categoryName}
                        subjectTitle={activeSubject.title}
                        unitTitle={activeUnit?.title}
                        subjectId={subjectId}
                    />
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end flex-wrap md:flex-nowrap">
                    {!activeUnit && (
                        <div className="hidden lg:flex items-center bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-sm border border-slate-200/50 dark:border-white/10 shrink-0">
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-all text-slate-500 dark:text-slate-400" title="Edit"><PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" /></button>
                            <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className="p-2.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400" title="Delete"><TrashIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" /></button>
                        </div>
                    )}

                    <button onClick={() => { if (setShareContentModalOpen) setShareContentModalOpen(true); }} className={`${MATERIAL_STYLES.btnFilled} bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/25 border border-blue-400/30 flex-1 md:flex-none justify-center shrink-0 px-3 md:px-5 shrink-0`}>
                        <ShareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                        <span>Share</span>
                    </button>

                    {!activeUnit ? (
                        <button onClick={() => setAddUnitModalOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25 border border-indigo-400/30 flex-1 md:flex-none hidden md:flex justify-center shrink-0 px-3 md:px-5 shrink-0`}>
                            <PlusCircleIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                            <span className="hidden sm:inline">Add Unit</span>
                        </button>
                    ) : (
                        <button onClick={() => setIsAiHubOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25 border border-emerald-400/30 flex-1 md:flex-none justify-center shrink-0 px-3 md:px-5 shrink-0`}>
                            <SparklesIcon className="w-4 h-4 md:w-5 md:h-5 stroke-2" />
                            <span>AI Tools</span>
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto hide-scrollbar p-3 pt-4 md:px-8 md:pb-12 md:pt-6">
                <div className="max-w-6xl mx-auto">
                    <UnitAccordion
                        subject={activeSubject}
                        onAddUnit={() => setAddUnitModalOpen(true)}
                        onInitiateDelete={handleInitiateDelete}
                        userProfile={userProfile}
                        isAiGenerating={isAiGenerating}
                        setIsAiGenerating={setIsAiGenerating}
                        activeUnit={activeUnit}
                        onSetActiveUnit={(u) => navigate(u ? `/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}/${u.id}` : `/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`)}
                        selectedLessons={selectedLessons}
                        onLessonSelect={(id) => setSelectedLessons(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                        handleGenerateQuizForLesson={handleGenerateQuizForLesson}
                        renderGeneratePptButton={(unit) => (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedLessons(new Set()); setActiveUnitForPicker(unit); setShowLessonPicker(true); }}
                                className="group px-4 py-2.5 md:px-6 md:py-3.5 rounded-full text-xs md:text-sm font-bold gap-2 md:gap-3 flex items-center bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.4)] hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.97] flex-shrink-0"
                                disabled={isAiGenerating}
                            >
                                {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PresentationChartBarIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform stroke-2" />}
                                Generate Slides
                            </button>
                        )}
                    />
                </div>
            </main>

            {/* Redesigned Glassmorphic Lesson Picker Modal */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-auto">
                    <div
                        className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/70 backdrop-blur-md transition-opacity"
                        onClick={() => setShowLessonPicker(false)}
                    />

                    <div className="relative w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[32px] sm:rounded-[40px] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] overflow-hidden animate-spring-up border border-white/60 dark:border-white/10 z-10">
                        {/* Decorative background glows inside modal */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 dark:bg-rose-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                        <div className="flex-none px-6 sm:px-10 pt-8 sm:pt-10 pb-6 flex items-start justify-between border-b border-black/[0.04] dark:border-white/[0.04] relative z-10">
                            <div className="flex gap-4 sm:gap-5 items-center">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[20px] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm shrink-0">
                                    <PresentationChartBarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 stroke-2" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">
                                        Select Lessons
                                    </h2>
                                    <p className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-md">
                                        {activeUnitForPicker.title}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLessonPicker(false)}
                                className="p-2.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 shrink-0"
                            >
                                <XMarkIcon className="w-6 h-6 sm:w-7 sm:h-7 stroke-2" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 hide-scrollbar relative z-10 bg-slate-50/30 dark:bg-transparent">
                            {(() => {
                                const lessons = allLessonsForSubject
                                    .filter(l => l.unitId === activeUnitForPicker.id)
                                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

                                if (lessons.length === 0) {
                                    return (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                            <div className="w-20 h-20 rounded-[28px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5 border border-slate-200 dark:border-white/5 shadow-inner">
                                                <BookOpenIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                                            </div>
                                            <p className="text-xl font-bold text-slate-900 dark:text-white mb-1">No lessons found</p>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Add lessons to this unit first.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-4">
                                        {lessons.map(lesson => {
                                            const isSelected = selectedLessons.has(lesson.id);
                                            return (
                                                <div
                                                    key={lesson.id}
                                                    onClick={() => setSelectedLessons(prev => {
                                                        const n = new Set(prev);
                                                        n.has(lesson.id) ? n.delete(lesson.id) : n.add(lesson.id);
                                                        return n;
                                                    })}
                                                    className={`group relative flex items-start gap-4 p-5 sm:p-6 rounded-[24px] cursor-pointer transition-all duration-300 border ${isSelected
                                                        ? 'bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 shadow-md shadow-indigo-100/50 dark:shadow-none -translate-y-0.5'
                                                        : 'bg-white/60 dark:bg-slate-800/50 border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1'
                                                        }`}
                                                >
                                                    <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300 ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                                                        : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-indigo-300 dark:group-hover:border-indigo-600'
                                                        }`}>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white drop-shadow-sm" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <span className={`block font-bold text-base sm:text-[17px] transition-colors leading-snug tracking-tight ${isSelected
                                                            ? 'text-indigo-900 dark:text-indigo-200'
                                                            : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                                            }`}>
                                                            {lesson.title}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex-none p-5 sm:px-10 sm:py-6 border-t border-black/[0.04] dark:border-white/[0.04] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl relative z-10">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
                                <div className="text-center sm:text-left flex items-center gap-2">
                                    <div className="px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-black text-xl shadow-inner">
                                        {selectedLessons.size}
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                        Selected
                                    </span>
                                </div>

                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowLessonPicker(false)}
                                        className="flex-1 sm:flex-none px-6 py-3.5 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-white/5"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }}
                                        disabled={selectedLessons.size === 0}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold transition-all duration-300 active:scale-95 shadow-lg ${selectedLessons.size === 0
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border-transparent shadow-none'
                                            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-600 text-white hover:shadow-indigo-500/30 hover:-translate-y-0.5 border border-indigo-400/30'
                                            }`}
                                    >
                                        <SparklesIcon className="w-5 h-5 stroke-2" />
                                        <span className="tracking-wide">Generate Presentation</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default SubjectDetail;
