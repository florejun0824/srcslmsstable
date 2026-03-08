// src/components/teacher/dashboard/views/CoursesView.jsx
import React, { useState, useEffect, useMemo, memo, Fragment, useCallback, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import UnitAccordion from '../../UnitAccordion';
import Spinner from '../../../../components/common/Spinner';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Menu, Transition } from '@headlessui/react';
import {
    PencilSquareIcon, TrashIcon, PlusCircleIcon, ArrowUturnLeftIcon, SparklesIcon,
    BookOpenIcon, CalculatorIcon, BeakerIcon, GlobeAltIcon, MusicalNoteIcon, WrenchScrewdriverIcon,
    MagnifyingGlassIcon,
    UsersIcon as LearnerIcon,
    AcademicCapIcon as TeacherIcon,
    PresentationChartBarIcon,
    ShareIcon,
    ArrowPathIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    XMarkIcon,
    ArrowLeftIcon,
    HomeIcon,
    FolderIcon,
    Squares2X2Icon,
    ListBulletIcon,
    EllipsisHorizontalIcon,
    ComputerDesktopIcon,
    PaintBrushIcon,
    PencilIcon,
    HeartIcon,
    GlobeAsiaAustraliaIcon
} from '@heroicons/react/24/outline';
import {
    FolderIcon as FolderSolid,
    StarIcon as StarSolid,
    SwatchIcon,
    PlayCircleIcon
} from '@heroicons/react/24/solid';

const GLOBAL_CSS = `
  .courses-system-font { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  .animate-spring-up { animation: springUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  @keyframes springUp { 
      0% { opacity: 0; transform: translateY(30px) scale(0.98); } 
      100% { opacity: 1; transform: translateY(0) scale(1); } 
  }
`;

// --- OPTIMIZED MATERIAL YOU STYLES (No Blur for Max Performance) ---
const MATERIAL_STYLES = {
    bgScaffold: "courses-system-font bg-white/60 dark:bg-slate-950 m-0 sm:m-4 rounded-[24px] sm:rounded-[32px] border border-zinc-200/50 dark:border-white/10 shadow-xl flex-1 flex flex-col min-h-[calc(100vh-6rem)] relative selection:bg-indigo-200 selection:text-indigo-900 overflow-visible",
    bgSurface: "bg-white dark:bg-slate-900 shadow-sm border border-zinc-200/50 dark:border-white/10 rounded-[24px] sm:rounded-[32px]",
    navPill: "bg-white dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm",
    textOnSurface: "text-zinc-900 dark:text-white tracking-tight",
    textVariant: "text-zinc-500 dark:text-slate-400 font-medium",
    btnFilled: "flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold text-xs md:text-sm transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md flex-shrink-0",
    btnTonal: "flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold text-xs md:text-sm transition-all duration-200 active:scale-95 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-400 hover:bg-indigo-200 flex-shrink-0",
    btnIcon: "p-2.5 rounded-full hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors text-zinc-600 dark:text-slate-300 active:scale-95 flex-shrink-0",
    searchBar: "w-full pl-10 pr-4 py-2.5 rounded-full bg-zinc-100/80 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm"
};

const SCHOOL_BRANDING = {
    'srcs_main': { logo: '/logo.png' },
    'hras_sipalay': { logo: '/logos/hra.png' },
    'kcc_kabankalan': { logo: '/logos/kcc.png' },
    'icad_dancalan': { logo: '/logos/ica.png' },
    'mchs_magballo': { logo: '/logos/mchs.png' },
    'ichs_ilog': { logo: '/logos/ichs.png' }
};

const getSchoolLogo = (schoolId) => SCHOOL_BRANDING[schoolId]?.logo || '/logo.png';

const SkeletonGrid = memo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-56 rounded-[32px] bg-zinc-200/40"></div>
        ))}
    </div>
));

const ContentScopeSwitcher = memo(({ activeGroup, onSwitch }) => {
    const isLearner = activeGroup === 'learner';
    return (
        <div className="flex p-1 bg-zinc-200/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-full h-10 md:h-12 items-center">
            <button onClick={() => onSwitch('learner')} className={`px-4 md:px-5 h-full rounded-full text-xs md:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 flex-1 md:flex-none ${isLearner ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-600 dark:text-slate-400 hover:bg-zinc-300/30 dark:hover:bg-white/10'}`}>
                <LearnerIcon className="w-4 h-4" /> Learner
            </button>
            <button onClick={() => onSwitch('teacher')} className={`px-4 md:px-5 h-full rounded-full text-xs md:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 flex-1 md:flex-none ${!isLearner ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-600 dark:text-slate-400 hover:bg-zinc-300/30 dark:hover:bg-white/10'}`}>
                <TeacherIcon className="w-4 h-4" /> Teacher
            </button>
        </div>
    );
});

const Breadcrumbs = ({ contentGroup, categoryName, subjectTitle, unitTitle, subjectId }) => (
    <nav className="inline-flex items-center gap-1.5 md:gap-2 max-w-full overflow-x-auto hide-scrollbar pb-2 md:pb-0">
        <Link to="/dashboard/courses" className="p-2 rounded-full bg-white dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors flex-shrink-0">
            <HomeIcon className="w-4 h-4 text-zinc-600 dark:text-slate-400" />
        </Link>
        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-600 flex-shrink-0" />

        <Link to={`/dashboard/courses/${contentGroup}`} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 text-xs md:text-sm font-bold text-zinc-700 dark:text-slate-300 capitalize transition-colors whitespace-nowrap flex-shrink-0">
            {contentGroup}
        </Link>
        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-600 flex-shrink-0" />

        <Link to={`/dashboard/courses/${contentGroup}/${categoryName}`} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 text-xs md:text-sm font-bold text-zinc-700 dark:text-slate-300 whitespace-nowrap max-w-[120px] md:max-w-[150px] truncate transition-colors flex-shrink-0">
            {decodeURIComponent(categoryName).replace(/\(.*\)/, '')}
        </Link>

        {subjectTitle && (
            <>
                <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-600 flex-shrink-0" />
                {unitTitle && subjectId ? (
                    <Link to={`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`} className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0">
                        {subjectTitle}
                    </Link>
                ) : (
                    <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold ${!unitTitle ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-400' : 'bg-white dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 text-zinc-700 dark:text-slate-300'} whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0`}>
                        {subjectTitle}
                    </span>
                )}
            </>
        )}

        {unitTitle && (
            <>
                <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-slate-600 flex-shrink-0" />
                <span className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-900 dark:text-rose-400 whitespace-nowrap max-w-[120px] md:max-w-[200px] truncate flex-shrink-0">
                    {unitTitle}
                </span>
            </>
        )}
    </nav>
);

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
            setActiveSubject(activeSubject);
            prevActiveSubjectIdRef.current = activeSubject.id;
        }
        const decodedName = decodeURIComponent(categoryName);
        handleCategoryClick(decodedName);
    }, [activeSubject, categoryName, setActiveSubject, handleCategoryClick]);

    useEffect(() => {
        if (loadingUnits) return;
        if (unitId) {
            const foundUnit = units.find(u => u.id === unitId);
            if (foundUnit && activeUnit?.id !== foundUnit.id) {
                onSetActiveUnit(foundUnit);
            }
        } else if (activeUnit) {
            onSetActiveUnit(null);
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
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] ${MATERIAL_STYLES.bgScaffold}`}>
            {/* ADDED: sticky top-0 and z-50 to keep header docked. Reduced py to shrink the height slightly. */}
            <header className="sticky top-0 z-50 flex-none px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-zinc-200/50 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md rounded-t-[24px] sm:rounded-t-[32px]">
                <div className="flex flex-col gap-1 w-full min-w-0">
                    <Breadcrumbs
                        contentGroup={contentGroup}
                        categoryName={categoryName}
                        subjectTitle={activeSubject.title}
                        unitTitle={activeUnit?.title}
                        subjectId={subjectId}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {!activeUnit && (
                        <div className="hidden md:flex items-center bg-zinc-50 dark:bg-white/5 rounded-full p-1 border border-zinc-200/50 dark:border-white/10">
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className="p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors text-zinc-600 dark:text-slate-400" title="Edit"><PencilSquareIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors text-zinc-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    )}

                    {!activeUnit ? (
                        <button onClick={() => setAddUnitModalOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-indigo-600 text-white hover:bg-indigo-700 w-full md:w-auto hidden md:flex`}>
                            <PlusCircleIcon className="w-5 h-5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Add Unit</span>
                            <span className="sm:hidden">Add</span>
                        </button>
                    ) : (
                        <button onClick={() => setIsAiHubOpen(true)} className={`${MATERIAL_STYLES.btnTonal} w-full md:w-auto`}>
                            <SparklesIcon className="w-5 h-5 md:w-4 md:h-4" />
                            <span>AI Tools</span>
                        </button>
                    )}
                </div>
            </header>

            {/* ADDED: Adjusted pt-2 md:pt-3 to pull the UnitAccordion header closer to the top sticky header */}
            <main className="flex-1 overflow-y-auto hide-scrollbar p-3 pt-2 md:px-6 md:pb-6 md:pt-3">
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
                                className="group px-4 py-2.5 md:px-5 md:py-3 rounded-2xl text-xs md:text-sm font-bold gap-2 flex items-center bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-lg hover:shadow-rose-500/25 transition-all duration-300 shadow-md shadow-rose-500/20 active:scale-[0.97] flex-shrink-0"
                                disabled={isAiGenerating}
                            >
                                {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PresentationChartBarIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                                Generate Slides
                            </button>
                        )}
                    />
                </div>
            </main>

            {/* Material 3 Bottom Sheet Modal for Lesson Picker */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center sm:p-6 pointer-events-auto">
                    <div
                        className="absolute inset-0 bg-black/60 transition-opacity"
                        onClick={() => setShowLessonPicker(false)}
                    />

                    <div className={`relative w-full sm:max-w-xl bg-white dark:bg-[#1e1e2d] rounded-t-[32px] sm:rounded-[36px] shadow-2xl flex flex-col h-[85vh] sm:max-h-[80vh] overflow-hidden animate-spring-up border border-zinc-200/50 dark:border-white/10 z-10`}>

                        <div className="w-full flex justify-center pt-4 pb-2 sm:hidden">
                            <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-slate-700"></div>
                        </div>

                        <div className="flex-none px-6 sm:px-8 pt-4 sm:pt-8 pb-4 flex items-center justify-between border-b border-zinc-100 dark:border-white/10">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                                    Select Lessons
                                </h2>
                                <p className="text-sm font-medium text-zinc-500 dark:text-slate-400 mt-1 truncate max-w-[250px] sm:max-w-sm">
                                    {activeUnitForPicker.title}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowLessonPicker(false)}
                                className="p-2.5 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors text-zinc-600 dark:text-slate-400"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 hide-scrollbar">
                            {(() => {
                                const lessons = allLessonsForSubject
                                    .filter(l => l.unitId === activeUnitForPicker.id)
                                    .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

                                if (lessons.length === 0) {
                                    return (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-4">
                                                <BookOpenIcon className="w-8 h-8 text-zinc-400 dark:text-slate-600" />
                                            </div>
                                            <p className="text-base font-bold text-zinc-900 dark:text-white">No lessons found</p>
                                            <p className="text-sm font-medium text-zinc-500 dark:text-slate-400 mt-1">Add lessons to this unit first.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3 pb-8">
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
                                                    className={`group flex items-center gap-4 p-4 rounded-[20px] cursor-pointer transition-all duration-200 border ${isSelected
                                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/50'
                                                        : 'bg-white dark:bg-white/5 border-zinc-200/50 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className={`flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-200 ${isSelected
                                                        ? 'bg-indigo-600 border-indigo-600'
                                                        : 'border-zinc-400 dark:border-slate-600 bg-transparent'
                                                        }`}>
                                                        {isSelected && <CheckCircleIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />}
                                                    </div>

                                                    <span className={`flex-1 font-bold text-sm md:text-base transition-colors ${isSelected
                                                        ? 'text-indigo-900 dark:text-indigo-400'
                                                        : 'text-zinc-700 dark:text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                                                        }`}>
                                                        {lesson.title}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex-none p-4 sm:p-6 border-t border-zinc-200/50 dark:border-white/10 bg-white dark:bg-[#1e1e2d]">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <p className="text-sm font-bold text-zinc-500 dark:text-slate-400 w-full sm:w-auto text-center sm:text-left">
                                    <span className="text-indigo-600 dark:text-indigo-400 text-lg mr-1">{selectedLessons.size}</span>
                                    Selected
                                </p>

                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={() => setShowLessonPicker(false)}
                                        className="flex-1 sm:flex-none px-5 py-3 rounded-full text-sm font-bold text-zinc-700 dark:text-slate-300 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }}
                                        disabled={selectedLessons.size === 0}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all active:scale-95 ${selectedLessons.size === 0
                                            ? 'bg-zinc-200 dark:bg-white/5 text-zinc-400 dark:text-slate-600 cursor-not-allowed border border-transparent'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                                            }`}
                                    >
                                        <SparklesIcon className="w-4 h-4" />
                                        <span>Generate</span>
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

const SubjectList = memo((props) => {
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick, loading, userProfile, handleOpenEditSubject } = props;
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const decodedCategoryName = useMemo(() => decodeURIComponent(categoryName), [categoryName]);

    useEffect(() => { setActiveSubject(null); handleCategoryClick(decodedCategoryName); }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        const userSchoolId = userProfile?.schoolId || 'srcs_main';
        const lowerSearch = searchTerm.toLowerCase();

        return courses.filter(c =>
            c.category === decodedCategoryName &&
            (c.schoolId === 'global' || !c.schoolId || c.schoolId === userSchoolId) &&
            c.title.toLowerCase().includes(lowerSearch)
        ).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    }, [courses, decodedCategoryName, searchTerm, userProfile?.schoolId]);

    const getMaterialTheme = (title) => {
        const t = title.toLowerCase();

        if (t.includes('english') || t.includes('filipino')) return {
            bg: "bg-rose-100 dark:bg-rose-500/10",
            onBg: "text-rose-700 dark:text-rose-400",
            icon: PencilIcon,
            surface: "bg-rose-50/80 dark:bg-slate-900",
            border: "border-rose-200/60 dark:border-rose-500/20"
        };

        if (t.includes('math')) return {
            bg: "bg-indigo-100 dark:bg-indigo-500/10",
            onBg: "text-indigo-700 dark:text-indigo-400",
            icon: CalculatorIcon,
            surface: "bg-indigo-50/80 dark:bg-slate-900",
            border: "border-indigo-200/60 dark:border-indigo-500/20"
        };

        if (t.includes('science')) return {
            bg: "bg-emerald-100 dark:bg-emerald-500/10",
            onBg: "text-emerald-700 dark:text-emerald-400",
            icon: BeakerIcon,
            surface: "bg-emerald-50/80 dark:bg-slate-900",
            border: "border-emerald-200/60 dark:border-emerald-500/20"
        };

        if (t.includes('mapeh') || t.includes('music') || t.includes('art') || t.includes('pe')) return {
            bg: "bg-sky-100 dark:bg-sky-500/10",
            onBg: "text-sky-700 dark:text-sky-400",
            icon: MusicalNoteIcon,
            surface: "bg-sky-50/80 dark:bg-slate-900",
            border: "border-sky-200/60 dark:border-sky-500/20"
        };

        if (t.includes('csl') || t.includes('religious') || t.includes('values') || t.includes('esp')) return {
            bg: "bg-amber-100 dark:bg-amber-500/10",
            onBg: "text-amber-700 dark:text-amber-400",
            icon: HeartIcon,
            surface: "bg-amber-50/80 dark:bg-slate-900",
            border: "border-amber-200/60 dark:border-amber-500/20"
        };

        if (t.includes('araling') || t.includes('history') || t.includes('social') || t.includes('ap')) return {
            bg: "bg-sky-100 dark:bg-sky-500/10",
            onBg: "text-sky-700 dark:text-sky-400",
            icon: GlobeAsiaAustraliaIcon,
            surface: "bg-sky-50/80 dark:bg-slate-900",
            border: "border-sky-200/60 dark:border-sky-500/20"
        };

        if (t.includes('tech') || t.includes('computer')) return {
            bg: "bg-slate-200 dark:bg-slate-500/10",
            onBg: "text-slate-700 dark:text-slate-400",
            icon: ComputerDesktopIcon,
            surface: "bg-slate-50/80 dark:bg-slate-900",
            border: "border-slate-200/60 dark:border-white/10"
        };

        return {
            bg: "bg-zinc-100 dark:bg-white/5",
            onBg: "text-zinc-700 dark:text-slate-400",
            icon: BookOpenIcon,
            surface: "bg-white dark:bg-slate-900",
            border: "border-zinc-200/50 dark:border-white/10"
        };
    };

    return (
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] ${MATERIAL_STYLES.bgScaffold}`}>
            {/* ADDED: sticky top-0 and z-50 for consistency */}
            <header className="sticky top-0 z-50 flex-none px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-white/10 bg-zinc-50/80 dark:bg-slate-950/80 backdrop-blur-md rounded-t-[24px] sm:rounded-t-[32px]">
                <div className="flex flex-col gap-1.5 w-full md:w-auto min-w-0">
                    <Breadcrumbs contentGroup={contentGroup} categoryName={categoryName} />
                    <h1 className={`text-2xl md:text-3xl font-bold ${MATERIAL_STYLES.textOnSurface} ml-1 md:ml-2`}>
                        {decodedCategoryName.replace(/\(.*\)/, '')}
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto justify-end">
                    <div className="relative w-full sm:w-60">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input type="text" placeholder="Search subjects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={MATERIAL_STYLES.searchBar} />
                    </div>
                    {onAddSubjectClick && (
                        <button onClick={() => onAddSubjectClick(decodedCategoryName)} className={`${MATERIAL_STYLES.btnFilled} bg-indigo-600 text-white hover:bg-indigo-700 w-full sm:w-auto`}>
                            <PlusCircleIcon className="w-5 h-5 md:w-4 md:h-4" />
                            <span>New Subject</span>
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-3 md:px-6 pb-20 md:pb-6">
                {loading ? <SkeletonGrid /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 animate-spring-up">
                        {filteredCourses.map((course) => {
                            const { bg, onBg, icon: Icon, surface, border } = getMaterialTheme(course.title);
                            return (
                                <Link
                                    key={course.id}
                                    to={course.id}
                                    className={`group relative flex flex-col justify-between p-5 md:p-6 h-52 md:h-56 rounded-[24px] md:rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${surface} border ${border}`}
                                >
                                    {/* Decorative accent blob */}
                                    <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full ${bg} opacity-40 group-hover:opacity-60 group-hover:scale-125 transition-all duration-500 blur-sm`} />

                                    <div className="relative z-10">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${bg} ${onBg} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                                            <Icon className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>

                                        <h3 className={`text-[17px] md:text-lg font-bold leading-snug ${MATERIAL_STYLES.textOnSurface} line-clamp-3`}>
                                            {course.title}
                                        </h3>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/[0.04] relative z-10">
                                        <div className={`px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider ${bg} ${onBg} flex items-center gap-1.5 transition-all group-hover:shadow-sm`}>
                                            Open <ChevronRightIcon className="w-3 h-3" />
                                        </div>

                                        <div className="flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEditSubject(course); }}
                                                className="p-2 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-zinc-500 dark:text-slate-400 hover:text-zinc-700 dark:hover:text-white transition-all shadow-sm"
                                                title="Edit Subject"
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInitiateDelete('subject', course.id, course.title); }}
                                                className="p-2 rounded-xl bg-red-50/60 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all shadow-sm"
                                                title="Delete Subject"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

const CategoryList = memo((props) => {
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject, loading, userProfile } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();
    const isLearner = contentGroup === 'learner';

    useEffect(() => { setActiveSubject(null); handleCategoryClick(null); }, [setActiveSubject, handleCategoryClick]);

    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const userSchoolId = userProfile?.schoolId || "srcs_main";
        const visibleCoursesSet = new Set();
        if (courses) {
            courses.forEach(c => {
                if (c.schoolId === "global" || !c.schoolId || c.schoolId === userSchoolId) visibleCoursesSet.add(c.category);
            });
        }
        return courseCategories.filter(cat => {
            const lowerName = cat.name.toLowerCase();
            return (isLearner ? !lowerName.includes("teacher") : lowerName.includes("teacher")) && visibleCoursesSet.has(cat.name);
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner, courses, userProfile?.schoolId]);

    const handleSwitchGroup = useCallback((newGroup) => navigate(`/dashboard/courses/${newGroup}`), [navigate]);

    return (
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] ${MATERIAL_STYLES.bgScaffold}`}>
            {/* ADDED: sticky top-0 and z-50 for consistency */}
            <header className="sticky top-0 z-50 flex-none px-4 md:px-6 py-4 md:py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-200/50 dark:border-white/10 bg-zinc-50/80 dark:bg-slate-950/80 backdrop-blur-md rounded-t-[24px] sm:rounded-t-[32px]">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate("/dashboard/courses")} className={`${MATERIAL_STYLES.btnIcon} bg-zinc-200/50`}>
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <h1 className={`text-2xl md:text-3xl font-bold ${MATERIAL_STYLES.textOnSurface}`}>
                        {isLearner ? "Learner Space" : "Teacher Space"}
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="w-full sm:w-auto">
                        <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} />
                    </div>
                    <button onClick={() => setCreateCategoryModalOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-indigo-600 text-white hover:bg-indigo-700 w-full sm:w-auto`}>
                        <PlusCircleIcon className="w-5 h-5 md:w-4 md:h-4" />
                        <span className="sm:hidden lg:inline">New Folder</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-3 md:px-6 pb-20 md:pb-6">
                {loading ? <SkeletonGrid /> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5 animate-spring-up">
                        {categoriesToShow.map((cat, idx) => {
                            const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0;
                            const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, "");

                            // Pastel card themes for visual variety
                            const cardThemes = [
                                { bg: 'bg-sky-50/80 dark:bg-sky-900/20', border: 'border-sky-200/50 dark:border-sky-500/20', hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-400', iconBg: 'bg-sky-100 dark:bg-sky-500/20', iconText: 'text-sky-700 dark:text-sky-400', badge: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400', accent: 'bg-sky-400' },
                                { bg: 'bg-rose-50/80 dark:bg-rose-900/20', border: 'border-rose-200/50 dark:border-rose-500/20', hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-400', iconBg: 'bg-rose-100 dark:bg-rose-500/20', iconText: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400', accent: 'bg-rose-400' },
                                { bg: 'bg-sky-50/80 dark:bg-sky-900/20', border: 'border-sky-200/50 dark:border-sky-500/20', hoverBorder: 'hover:border-sky-300 dark:hover:border-sky-400', iconBg: 'bg-sky-100 dark:bg-sky-500/20', iconText: 'text-sky-700 dark:text-sky-400', badge: 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400', accent: 'bg-sky-400' },
                                { bg: 'bg-emerald-50/80 dark:bg-emerald-900/20', border: 'border-emerald-200/50 dark:border-emerald-500/20', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', iconText: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-400' },
                                { bg: 'bg-amber-50/80 dark:bg-amber-900/20', border: 'border-amber-200/50 dark:border-amber-500/20', hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20', iconText: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400', accent: 'bg-amber-400' },
                            ];
                            const theme = cardThemes[idx % cardThemes.length];

                            return (
                                <Link
                                    key={cat.id}
                                    to={encodeURIComponent(cat.name)}
                                    className={`
                                        group relative flex flex-col items-center justify-center text-center p-5 md:p-6 min-h-[160px] md:min-h-[180px]
                                        rounded-[24px] md:rounded-[32px] ${theme.bg} shadow-sm
                                        border ${theme.border}
                                        transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${theme.hoverBorder}
                                        overflow-hidden
                                    `}
                                >
                                    {/* Decorative corner accent */}
                                    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full ${theme.accent} opacity-[0.06] group-hover:opacity-[0.1] group-hover:scale-125 transition-all duration-500`} />

                                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1.5 z-10">
                                        <button onClick={(e) => { e.preventDefault(); handleEditCategory(cat) }} className="p-1.5 md:p-2 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 transition-colors shadow-sm backdrop-blur-sm"><PencilSquareIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-600 dark:text-slate-300" /></button>
                                        <button onClick={(e) => { e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name) }} className="p-1.5 md:p-2 rounded-full bg-red-50/80 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors shadow-sm backdrop-blur-sm"><TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600 dark:text-red-400" /></button>
                                    </div>

                                    <div className={`w-14 h-14 md:w-16 md:h-16 mb-3 md:mb-4 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-md ${theme.iconBg} ${theme.iconText}`}>
                                        <FolderSolid className="w-7 h-7 md:w-8 md:h-8" />
                                    </div>

                                    <span className={`text-sm md:text-base font-bold ${MATERIAL_STYLES.textOnSurface} w-full break-words leading-tight`}>
                                        {cleanName}
                                    </span>

                                    <span className={`inline-block mt-2 md:mt-3 px-2.5 py-1 rounded-full ${theme.badge} text-[10px] md:text-xs font-bold`}>
                                        {courseCount} Items
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

const ContentGroupSelector = memo((props) => {
    const { userProfile } = props;
    useEffect(() => { props.setActiveSubject(null); props.handleBackToCategoryList(); }, []);

    const schoolLogoUrl = userProfile?.schoolId ? getSchoolLogo(userProfile.schoolId) : '/logo.png';

    const SelectionCard = ({ to, title, subtitle, themeClass, icon: Icon }) => (
        <Link to={to} className={`group relative overflow-hidden rounded-[32px] md:rounded-[40px] p-6 md:p-10 h-[280px] md:h-[340px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-xl shadow-md border border-black/5 ${themeClass}`}>
            <div className="absolute -right-16 -bottom-16 w-48 h-48 md:w-64 md:h-64 rounded-full bg-white/20 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

            <div className="relative z-10">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[20px] md:rounded-[28px] flex items-center justify-center mb-6 md:mb-8 bg-white/20 dark:bg-white/10 shadow-sm border border-white/20 dark:border-white/10`}>
                    <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 md:mb-3 text-white">{title}</h2>
                <p className="text-sm md:text-lg font-semibold text-white/90 max-w-sm leading-relaxed">{subtitle}</p>
            </div>

            <div className="relative z-10 flex items-center">
                <div className="px-5 py-2.5 md:px-6 md:py-3 rounded-full bg-white/20 font-bold text-white text-xs md:text-sm group-hover:bg-white/30 transition-colors flex items-center gap-2 border border-white/10">
                    Enter Portal <ArrowPathIcon className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-180 transition-transform duration-500" />
                </div>
            </div>
        </Link>
    );

    return (
        <div className={`min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center p-4 md:p-6 ${MATERIAL_STYLES.bgScaffold}`}>
            <div className="mb-8 md:mb-12 text-center animate-spring-up">
                <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-5 md:mb-6 rounded-[28px] md:rounded-[32px] bg-white dark:bg-white/10 shadow-md flex items-center justify-center p-2 border border-zinc-200/50 dark:border-white/10">
                    <img src={schoolLogoUrl} alt="Logo" className="w-full h-full object-contain rounded-[20px] md:rounded-[24px]" />
                </div>
                <h1 className={`text-3xl md:text-5xl font-bold ${MATERIAL_STYLES.textOnSurface} tracking-tight mb-2 md:mb-3`}>Welcome Back</h1>
                <p className="text-base md:text-lg text-zinc-500 font-semibold">Choose your workspace to begin</p>
            </div>
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 animate-spring-up" style={{ animationDelay: '0.1s' }}>
                <SelectionCard
                    to="learner"
                    title="Learner"
                    subtitle="Access your assignments, modules, and student resources."
                    themeClass="bg-emerald-600"
                    icon={LearnerIcon}
                />
                <SelectionCard
                    to="teacher"
                    title="Teacher"
                    subtitle="Manage curriculum, grading tools, and student tracking."
                    themeClass="bg-indigo-600"
                    icon={TeacherIcon}
                />
            </div>
        </div>
    );
});

const CoursesView = memo((props) => {
    useEffect(() => {
        const styleId = 'courses-view-material-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = GLOBAL_CSS;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <Routes>
            <Route path="courses">
                <Route index element={<ContentGroupSelector {...props} />} />
                <Route path=":contentGroup" element={<CategoryList {...props} />} />
                <Route path=":contentGroup/:categoryName" element={<SubjectList {...props} />} />
                <Route path=":contentGroup/:categoryName/:subjectId" element={<SubjectDetail {...props} />} />
                <Route path=":contentGroup/:categoryName/:subjectId/:unitId" element={<SubjectDetail {...props} />} />
            </Route>
        </Routes>
    );
});

export default CoursesView;