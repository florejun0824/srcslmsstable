// src/components/teacher/dashboard/views/courses/SubjectDetail.jsx
import React, { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
        <div className="p-2 sm:p-4 md:p-6 min-h-[calc(100vh-6rem)] flex flex-col selection:bg-indigo-500/30">
            
            {/* === PREMIUM ROUNDED APP WINDOW === */}
            <div className="relative flex-1 w-full bg-slate-50 dark:bg-slate-950 font-sans rounded-[32px] sm:rounded-[40px] lg:rounded-[48px] border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] pb-24 md:pb-12 flex flex-col">
                
                {/* Dedicated Background Layer (Clips aurora lights to rounded corners) */}
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/10 dark:bg-indigo-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-400/10 dark:bg-teal-900/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen md:animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
                </div>

                <div className="relative z-10 w-full mx-auto pt-2 md:pt-4 flex-1 flex flex-col h-full">
                    
                    {/* === ULTRA PREMIUM COMMAND BAR (Sticky) === */}
                    <header className="sticky top-2 md:top-4 z-50 px-2 md:px-6 mb-4 md:mb-8 transition-all duration-300">
                        <div className="bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-2xl border border-white/80 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[32px] md:rounded-[40px] p-2 md:p-3 transition-all duration-300 flex flex-col xl:flex-row items-center justify-between gap-3 md:gap-4">
                            
                            {/* LEFT SIDE: Breadcrumbs & Title */}
                            <div className="flex flex-col gap-1 w-full xl:w-auto min-w-0 px-2 md:px-4 py-1">
                                <Breadcrumbs
                                    contentGroup={contentGroup}
                                    categoryName={categoryName}
                                    subjectTitle={activeSubject.title}
                                    unitTitle={activeUnit?.title}
                                    subjectId={subjectId}
                                />
                            </div>

                            {/* RIGHT SIDE: Search & Actions */}
                            <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto justify-end flex-wrap md:flex-nowrap">
                                {!activeUnit && (
                                    <div className="hidden lg:flex items-center bg-slate-100/80 dark:bg-slate-800/80 rounded-[20px] p-1 shadow-inner border border-white/50 dark:border-slate-700/50 shrink-0">
                                        <button onClick={() => handleOpenEditSubject(activeSubject)} className="p-2.5 rounded-[16px] hover:bg-white dark:hover:bg-slate-700 transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shadow-sm hover:shadow-md border border-transparent hover:border-slate-200 dark:hover:border-slate-600 active:scale-95" title="Edit">
                                            <PencilSquareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                        </button>
                                        <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className="p-2.5 rounded-[16px] hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 shadow-sm hover:shadow-md border border-transparent hover:border-red-200 dark:hover:border-red-500/30 active:scale-95" title="Delete">
                                            <TrashIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                        </button>
                                    </div>
                                )}

                                <button onClick={() => { if (setShareContentModalOpen) setShareContentModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:py-3.5 bg-gradient-to-b from-blue-500 to-cyan-500 text-white rounded-[20px] md:rounded-[24px] font-bold text-sm shadow-[0_8px_20px_rgba(59,130,246,0.3)] border-t border-white/20 active:scale-95 transition-all shrink-0">
                                    <ShareIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                    <span>Share</span>
                                </button>

                                {!activeUnit ? (
                                    <button onClick={() => setAddUnitModalOpen(true)} className="flex-1 md:flex-none hidden md:flex items-center justify-center gap-2 px-5 py-3 md:py-3.5 bg-gradient-to-b from-indigo-500 to-purple-600 text-white rounded-[20px] md:rounded-[24px] font-bold text-sm shadow-[0_8px_20px_rgba(99,102,241,0.3)] border-t border-white/20 active:scale-95 transition-all shrink-0">
                                        <PlusCircleIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                        <span className="hidden sm:inline">Add Unit</span>
                                    </button>
                                ) : (
                                    <button onClick={() => setIsAiHubOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 md:py-3.5 bg-gradient-to-b from-emerald-500 to-teal-500 text-white rounded-[20px] md:rounded-[24px] font-bold text-sm shadow-[0_8px_20px_rgba(16,185,129,0.3)] border-t border-white/20 active:scale-95 transition-all shrink-0">
                                        <SparklesIcon className="w-4 h-4 md:w-5 md:h-5 stroke-[2.5]" />
                                        <span>AI Tools</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* MAIN CONTENT - Accordion Wrapper */}
                    <main className="flex-1 overflow-visible px-3 pt-2 md:px-8 md:pb-12 md:pt-4 w-full h-full">
                        <div className="max-w-6xl mx-auto pb-20">
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
                                        className="group px-5 py-3 md:px-6 md:py-3.5 rounded-[24px] text-xs md:text-sm font-bold gap-2 md:gap-3 flex items-center bg-gradient-to-b from-rose-500 to-pink-600 text-white shadow-[0_8px_20px_rgba(244,63,94,0.3)] border-t border-white/20 hover:scale-[1.02] transition-transform duration-200 active:scale-[0.97] flex-shrink-0"
                                        disabled={isAiGenerating}
                                    >
                                        {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin stroke-[2.5]" /> : <PresentationChartBarIcon className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform stroke-[2.5]" />}
                                        Generate Slides
                                    </button>
                                )}
                            />
                        </div>
                    </main>

                </div>
            </div>

            {/* --- GPU-LITE, ULTRA-PREMIUM LESSON PICKER MODAL --- */}
            {showLessonPicker && activeUnitForPicker && createPortal(
                // Uses items-end on mobile for a native bottom-sheet feel, items-center on desktop
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 pointer-events-auto">
                    
                    {/* GPU-Lite Overlay: Solid color with opacity, NO backdrop-blur */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 transition-opacity"
                        onClick={() => setShowLessonPicker(false)}
                    />

                    {/* Modal Container: Native slide-up animation, sharp shadows, flat colors */}
                    <div className="relative w-full max-w-3xl bg-white dark:bg-slate-950 rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 z-10">
                        
                        {/* Header: Clean, Linear-style */}
                        <div className="flex-none px-6 pt-6 pb-5 sm:px-8 sm:pt-8 flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 z-10">
                            <div className="flex gap-4 sm:gap-5 items-center">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[18px] bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/30 shrink-0">
                                    <PresentationChartBarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 stroke-[2]" />
                                </div>
                                <div className="min-w-0 pr-2">
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        Select Lessons
                                    </h2>
                                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 truncate max-w-[200px] sm:max-w-md">
                                        {activeUnitForPicker.title}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLessonPicker(false)}
                                className="p-2 sm:p-2.5 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 border border-slate-200/50 dark:border-slate-800 shrink-0 active:scale-95"
                            >
                                <XMarkIcon className="w-6 h-6 stroke-[2]" />
                            </button>
                        </div>

                        {/* Body: Solid lite background, native scrolling */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6 hide-scrollbar relative z-10 bg-slate-50/50 dark:bg-slate-900/30">
                            {(() => {
                                const lessons = allLessonsForSubject
                                    .filter(l => l.unitId === activeUnitForPicker.id)
                                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

                                if (lessons.length === 0) {
                                    return (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                            <div className="w-16 h-16 rounded-[20px] bg-white dark:bg-slate-900 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                                <BookOpenIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 stroke-[1.5]" />
                                            </div>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">No lessons found</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Add lessons to this unit first.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
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
                                                    // Hardware accelerated transform, minimal box-shadows
                                                    className={`group relative flex items-center gap-4 p-4 rounded-[20px] cursor-pointer transition-transform duration-200 active:scale-[0.98] border ${
                                                        isSelected
                                                            ? 'bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-400 dark:border-indigo-500/50'
                                                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                                                        isSelected
                                                            ? 'bg-indigo-600 border-indigo-600'
                                                            : 'border-slate-300 dark:border-slate-600 bg-transparent group-hover:border-indigo-400'
                                                    }`}>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white stroke-[3]" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <span className={`block font-semibold text-[15px] leading-snug tracking-tight truncate transition-colors duration-200 ${
                                                            isSelected
                                                                ? 'text-indigo-900 dark:text-indigo-100'
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

                        {/* Footer Actions: Clean separation, standard shadows */}
                        <div className="flex-none px-5 py-4 sm:px-8 sm:py-5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 z-10">
                            <div className="flex flex-row items-center justify-between gap-4">
                                
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="px-3 py-1 rounded-[10px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                        {selectedLessons.size}
                                    </div>
                                    <span className="hidden sm:inline text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                        Selected
                                    </span>
                                </div>

                                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                                    <button
                                        onClick={() => setShowLessonPicker(false)}
                                        className="px-5 py-3 rounded-full text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }}
                                        disabled={selectedLessons.size === 0}
                                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-200 active:scale-95 ${
                                            selectedLessons.size === 0
                                                ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800'
                                                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700'
                                        }`}
                                    >
                                        <SparklesIcon className="w-5 h-5 stroke-[2]" />
                                        <span className="tracking-wide">Generate</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>,
                document.body
            )}
        </div>
    );
});

export default SubjectDetail;