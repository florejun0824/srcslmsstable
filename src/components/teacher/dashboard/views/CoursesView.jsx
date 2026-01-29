// src/components/teacher/dashboard/views/CoursesView.jsx
import React, { useState, useEffect, useMemo, memo, Fragment, useCallback, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, Link, useLocation } from 'react-router-dom';
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
    Squares2X2Icon,
    CheckCircleIcon,
    ArrowsUpDownIcon,
    LockClosedIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import AuroraBackground from '../../../../components/layout/AuroraBackground';

// --- OPTIMIZATION: STATIC STYLES ---
const CUSTOM_SCROLLBAR_STYLES = `
  .custom-scrollbar::-webkit-scrollbar { width: 0px; height: 0px; }
  .mac-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
  .mac-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .mac-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 100px; }
  .dark .mac-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); }
  
  /* Neural Glass Card Hover Effect */
  .neural-card {
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  .neural-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 20px 40px -10px rgba(var(--monet-primary-rgb), 0.15);
  }
`;

// --- NEURAL MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    // Default fallback (Neural Blue) if no overlay active
    const defaultStyle = {
        iconBg: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
        btnPrimary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)]",
        btnTonal: "bg-white/5 text-indigo-300 hover:bg-white/10 border border-white/10",
        badge: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
        themeText: "text-indigo-400",
        glow: "shadow-[0_0_30px_-10px_rgba(79,70,229,0.3)]"
    };

    if (!activeOverlay || activeOverlay === 'none') return defaultStyle;

    switch (activeOverlay) {
        case 'christmas':
            return {
                iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                btnPrimary: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]",
                btnTonal: "bg-white/5 text-emerald-300 hover:bg-white/10 border border-white/10",
                badge: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
                themeText: "text-emerald-400",
                glow: "shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]"
            };
        case 'valentines':
            return {
                iconBg: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                btnPrimary: "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_-5px_rgba(244,63,94,0.5)]",
                btnTonal: "bg-white/5 text-rose-300 hover:bg-white/10 border border-white/10",
                badge: "bg-rose-500/10 text-rose-300 border border-rose-500/20",
                themeText: "text-rose-400",
                glow: "shadow-[0_0_30px_-10px_rgba(244,63,94,0.3)]"
            };
        default:
            return defaultStyle;
    }
};

const commonContainerClasses = "relative h-[calc(100vh-6rem)] w-full px-4 lg:px-8 py-2 font-sans overflow-hidden";

// --- COMPACT PILL BUTTONS (NEURAL) ---
const getButtonClass = (type, monet) => {
    const base = "relative flex items-center justify-center gap-2 rounded-full font-bold tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
    
    if (monet) {
        if (type === 'primary') return `${base} px-5 py-2.5 text-xs ${monet.btnPrimary}`;
        if (type === 'secondary') return `${base} px-4 py-2 text-xs ${monet.btnTonal} backdrop-blur-md`;
        if (type === 'icon') return `${base} p-2.5 aspect-square text-slate-400 hover:text-white hover:bg-white/10 rounded-full`;
        if (type === 'destructive') return `${base} p-2.5 aspect-square text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full`;
    }
    return base;
};

// --- SKELETONS ---
const SkeletonGrid = memo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-[2rem] bg-slate-200/20 dark:bg-white/5 border border-white/5"></div>
        ))}
    </div>
));

const SkeletonList = memo(() => (
    <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-white/10 rounded-xl w-1/3 mb-8"></div>
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-20 bg-white/5 rounded-2xl"></div>
        ))}
    </div>
));

// --- SUBJECT ICONS & COLORS ---
const getSubjectStyling = (subjectTitle, monet) => {
    const lowerCaseTitle = subjectTitle.toLowerCase();
    let IconComponent = BookOpenIcon;

    if (lowerCaseTitle.includes('math')) IconComponent = CalculatorIcon; 
    else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino')) IconComponent = BookOpenIcon; 
    else if (lowerCaseTitle.includes('science')) IconComponent = BeakerIcon; 
    else if (lowerCaseTitle.includes('araling')) IconComponent = GlobeAltIcon; 
    else if (lowerCaseTitle.includes('music') || lowerCaseTitle.includes('art')) IconComponent = MusicalNoteIcon; 
    else if (lowerCaseTitle.includes('tech')) IconComponent = WrenchScrewdriverIcon; 

    return { 
        icon: IconComponent, 
        styleClass: monet ? monet.iconBg : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
    };
};

// --- COMPONENT: CONTENT SCOPE SWITCHER (FLOATING) ---
const ContentScopeSwitcher = memo(({ activeGroup, onSwitch, monet }) => {
    const isLearner = activeGroup === 'learner';
    return (
        <div className="relative z-20">
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="group relative flex items-center gap-3 pl-1 pr-4 py-1 rounded-full text-xs font-bold transition-all outline-none shadow-lg backdrop-blur-xl bg-black/20 hover:bg-black/30 border border-white/10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLearner ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'} shadow-[0_0_15px_-3px_currentColor]`}>
                        {isLearner ? <LearnerIcon className="w-4 h-4"/> : <TeacherIcon className="w-4 h-4"/>}
                    </div>
                    <span className="text-slate-200 group-hover:text-white transition-colors">
                        {isLearner ? "Learner Space" : "Teacher Space"}
                    </span>
                    <ArrowsUpDownIcon className="w-3 h-3 text-slate-400 group-hover:text-white" />
                </Menu.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="transform opacity-0 scale-95 translate-y-2" enterTo="transform opacity-100 scale-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="transform opacity-100 scale-100 translate-y-0" leaveTo="transform opacity-0 scale-95 translate-y-2">
                    <Menu.Items className="absolute left-0 mt-3 w-60 origin-top-left rounded-[2rem] bg-[#0f1012]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] p-2 z-[60] focus:outline-none">
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Select Portal</div>
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={() => onSwitch('learner')} className={`flex w-full items-center gap-3 rounded-[1.5rem] px-4 py-3 text-xs font-bold transition-all mb-1 ${active ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
                                    <div className="p-2 rounded-full bg-sky-500/20 text-sky-400"><LearnerIcon className="w-4 h-4" /></div>
                                    <div><div className="text-white">Learner's Space</div><div className="text-[10px] font-normal opacity-60">Student View</div></div>
                                    {activeGroup === 'learner' && <div className="ml-auto w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />}
                                </button>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <button onClick={() => onSwitch('teacher')} className={`flex w-full items-center gap-3 rounded-[1.5rem] px-4 py-3 text-xs font-bold transition-all ${active ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
                                    <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400"><TeacherIcon className="w-4 h-4" /></div>
                                    <div><div className="text-white">Teacher's Space</div><div className="text-[10px] font-normal opacity-60">Admin View</div></div>
                                    {activeGroup === 'teacher' && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                                </button>
                            )}
                        </Menu.Item>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
});

// --- LEVEL 3: SUBJECT DETAIL VIEW (THE WORKSPACE) ---
const SubjectDetail = memo((props) => {
    const {
        courses, handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating,
        onSetActiveUnit, onGeneratePresentationPreview, setActiveSubject,
        handleCategoryClick, activeUnit,
    } = props;

    const { contentGroup, categoryName, subjectId, unitId } = useParams();
    const navigate = useNavigate();
    const { activeOverlay } = useTheme();
    
    useEffect(() => {
        const styleId = 'courses-view-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = CUSTOM_SCROLLBAR_STYLES;
            document.head.appendChild(style);
        }
    }, []);

    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);
    const scrollbarClass = 'mac-scrollbar';

    const [units, setUnits] = useState([]);
    const [allLessonsForSubject, setAllLessonsForSubject] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(true);
    const [loadingLessons, setLoadingLessons] = useState(true);
    
    const activeSubject = useMemo(() => courses?.find(c => c.id === subjectId), [courses, subjectId]);
    
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [showLessonPicker, setShowLessonPicker] = useState(false);
    const [activeUnitForPicker, setActiveUnitForPicker] = useState(null);

    const prevActiveSubjectIdRef = useRef();
    const prevCategoryRef = useRef();

    useEffect(() => {
        if (activeSubject && activeSubject.id !== prevActiveSubjectIdRef.current) {
            setActiveSubject(activeSubject);
            prevActiveSubjectIdRef.current = activeSubject.id;
        }
        
        const decodedName = decodeURIComponent(categoryName);
        if (decodedName && decodedName !== prevCategoryRef.current) {
            handleCategoryClick(decodedName);
            prevCategoryRef.current = decodedName;
        }
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
    }, [unitId, units, loadingUnits, activeUnit, onSetActiveUnit]);

    const handleUnitNavigation = useCallback((unitOrNull) => {
        if (unitOrNull) {
             navigate(`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}/${unitOrNull.id}`);
        } else {
             navigate(`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`);
        }
    }, [contentGroup, categoryName, subjectId, navigate]);

    useEffect(() => {
        if (activeSubject?.id) {
            setLoadingUnits(true);
            setLoadingLessons(true);
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', activeSubject.id));
            const unsubscribeUnits = onSnapshot(unitsQuery, (snap) => {
                setUnits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingUnits(false);
            });
            const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', activeSubject.id));
            const unsubscribeLessons = onSnapshot(lessonsQuery, (snap) => {
                setAllLessonsForSubject(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoadingLessons(false);
            });
            return () => { unsubscribeUnits(); unsubscribeLessons(); };
        } else {
            setUnits([]); setAllLessonsForSubject([]); setLoadingUnits(false); setLoadingLessons(false);
        }
    }, [activeSubject?.id]);
    
    const handleLessonSelect = useCallback((lessonId) => {
        setSelectedLessons(prev => {
            const newSet = new Set(prev); 
            newSet.has(lessonId) ? newSet.delete(lessonId) : newSet.add(lessonId);
            return newSet;
        });
    }, []);

    const handleGeneratePresentationClick = useCallback(() => {
        if (onGeneratePresentationPreview && activeSubject) {
            onGeneratePresentationPreview(Array.from(selectedLessons), allLessonsForSubject || [], units || [], activeSubject);
        }
    }, [onGeneratePresentationPreview, selectedLessons, allLessonsForSubject, units, activeSubject]);

    const isLoading = loadingUnits || loadingLessons;

    if (subjectId && !activeSubject && isLoading) return (
        <div className={commonContainerClasses}><SkeletonList /></div>
    );

    if (!activeSubject) return <Spinner />;

    // --- CINEMATIC HEADER ---
    const BreadcrumbSeparator = () => (
        <span className="mx-2 text-slate-400 dark:text-slate-600">/</span>
    );

    return (
        <div className={commonContainerClasses}>
            {/* Main Glass Container - Invisible but structural */}
            <div className="h-full flex flex-col">
                
                {/* --- FLOATING HEADER --- */}
                <div className="flex-none flex flex-col md:flex-row justify-between items-center px-6 py-4 mb-6 rounded-[2rem] bg-white/60 dark:bg-[#121212]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm z-30">
                    <div className="flex items-center w-full md:w-auto overflow-hidden">
                        
                        {/* Back Button */}
                        <button 
                            onClick={() => {
                                if(activeUnit) handleUnitNavigation(null);
                                else navigate(`/dashboard/courses/${contentGroup}/${categoryName}`);
                            }} 
                            className={`mr-4 ${getButtonClass('icon', monet)} shadow-sm border border-white/5 bg-white/10`}
                        >
                             <ArrowUturnLeftIcon className="w-4 h-4" />
                        </button>

                        {/* --- BREADCRUMBS --- */}
                        <nav className="flex items-center text-sm font-bold whitespace-nowrap overflow-x-auto no-scrollbar mask-fade-right">
                            <Link 
                                to={`/dashboard/courses/${contentGroup}/${categoryName}`}
                                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                            >
                                {decodeURIComponent(categoryName).replace(/\(.*\)/, '')}
                            </Link>

                            <BreadcrumbSeparator />

                            {activeUnit ? (
                                <Link
                                    to={`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`}
                                    onClick={() => onSetActiveUnit(null)} 
                                    className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                                >
                                    {activeSubject.title}
                                </Link>
                            ) : (
                                <span className={`text-lg font-black tracking-tight ${monet.themeText} drop-shadow-md`}>
                                    {activeSubject.title}
                                </span>
                            )}

                            {activeUnit && (
                                <>
                                    <BreadcrumbSeparator />
                                    <span className={`text-lg font-black tracking-tight ${monet.themeText} drop-shadow-md`}>
                                        {activeUnit.title}
                                    </span>
                                </>
                            )}
                        </nav>

                        {/* Edit Actions */}
                        {!activeUnit && (
                            <div className="flex items-center ml-4 pl-4 border-l border-white/10 space-x-1">
                                <button onClick={() => handleOpenEditSubject(activeSubject)} className={getButtonClass('icon', monet)}><PencilSquareIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className={getButtonClass('destructive', monet)}><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex gap-3 items-center mt-3 md:mt-0 w-full md:w-auto justify-end">
                        <button onClick={() => setShareContentModalOpen(true)} className={`${getButtonClass('icon', monet)} bg-white/5 border border-white/5`} title="Share">
                            <ShareIcon className="w-4 h-4" />
                        </button>
                        
                        {!activeUnit && (
                            <button onClick={() => setAddUnitModalOpen(true)} className={`${getButtonClass('secondary', monet)} border border-white/10 shadow-lg`}>
                                <PlusCircleIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Unit</span>
                            </button>
                        )}

                        {activeUnit && (
                            <button onClick={() => setIsAiHubOpen(true)} className={`${getButtonClass('primary', monet)} shadow-lg shadow-indigo-500/20`}>
                                <SparklesIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">AI Tools</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* --- TRANSPARENT CONTENT AREA --- */}
                <div className={`flex-1 overflow-y-auto min-h-0 pt-0 bg-transparent ${scrollbarClass} pb-20`}>
                    {isLoading ? (
                        <div className="p-4"><SkeletonList /></div>
                    ) : (
                        <UnitAccordion
                            subject={activeSubject}
                            onInitiateDelete={handleInitiateDelete}
                            userProfile={userProfile}
                            isAiGenerating={isAiGenerating}
                            setIsAiGenerating={setIsAiGenerating}
                            activeUnit={activeUnit}
                            onSetActiveUnit={handleUnitNavigation}
                            selectedLessons={selectedLessons}
                            onLessonSelect={handleLessonSelect}
                            handleGenerateQuizForLesson={handleGenerateQuizForLesson}
                            monet={monet} 
                            renderGeneratePptButton={(unit) => (
                                <button
                                    onClick={() => { setSelectedLessons(new Set()); setActiveUnitForPicker(unit); setShowLessonPicker(true); }}
                                    className={`${getButtonClass('secondary', monet)} !px-3 !py-1.5 text-[10px] shadow-sm border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10`}
                                    disabled={isAiGenerating}
                                >
                                    {isAiGenerating ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <PresentationChartBarIcon className="w-3 h-3" />}
                                    <span>PPT</span>
                                </button>
                            )}
                        />
                    )}
                </div>
            </div>

            {/* --- MODERN AI DECK BUILDER MODAL (REDESIGNED) --- */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setShowLessonPicker(false)}
                    />
                    
                    {/* Modal Container */}
                    <div className="relative w-full max-w-2xl bg-[#0f1012] dark:bg-[#0f1012] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                        
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                        
                        {/* Header */}
                        <div className="relative z-10 px-8 py-6 flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                                        AI Presentation
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Curate Your Deck</h2>
                                <p className="text-sm text-slate-400 font-medium mt-1">
                                    Select lessons from <span className="text-white">"{activeUnitForPicker.title}"</span> to generate slides.
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowLessonPicker(false)}
                                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className={`relative z-10 flex-1 overflow-y-auto px-8 py-2 ${scrollbarClass}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                                {(() => {
                                    const lessonsInUnit = allLessonsForSubject
                                        .filter((lesson) => lesson.unitId === activeUnitForPicker.id)
                                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                                    if (lessonsInUnit.length === 0) {
                                        return (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-50">
                                                <BookOpenIcon className="w-12 h-12 text-slate-500 mb-3" />
                                                <p className="text-slate-400 font-medium">No lessons found in this unit.</p>
                                            </div>
                                        );
                                    }

                                    return lessonsInUnit.map((lesson) => {
                                        const isSelected = selectedLessons.has(lesson.id);
                                        return (
                                            <div
                                                key={lesson.id}
                                                onClick={() => handleLessonSelect(lesson.id)}
                                                className={`
                                                    group relative p-4 rounded-2xl border cursor-pointer transition-all duration-300
                                                    ${isSelected 
                                                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]' 
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                                    }
                                                `}
                                            >
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="min-w-0">
                                                        <h4 className={`text-sm font-bold leading-snug mb-1 transition-colors ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                            {lesson.title}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                                            Lesson {(lesson.order || 0) + 1}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className={`
                                                        w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300
                                                        ${isSelected 
                                                            ? 'bg-indigo-500 border-indigo-500 scale-110' 
                                                            : 'bg-transparent border-slate-600 group-hover:border-slate-400'
                                                        }
                                                    `}>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 p-6 bg-[#0f1012]/50 backdrop-blur-md border-t border-white/10">
                            <div className="flex items-center justify-between gap-4">
                                <div className="hidden sm:block">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {selectedLessons.size} Items Selected
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button 
                                        onClick={() => setShowLessonPicker(false)}
                                        className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }}
                                        disabled={selectedLessons.size === 0 || isAiGenerating}
                                        className={`
                                            flex-1 sm:flex-none relative overflow-hidden px-8 py-3 rounded-xl font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2 transition-all
                                            ${selectedLessons.size === 0 || isAiGenerating ? 'bg-slate-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/25 active:scale-95'}
                                        `}
                                    >
                                        {isAiGenerating ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <SparklesIcon className="w-4 h-4" />
                                                <span>Generate Deck</span>
                                            </>
                                        )}
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

// --- LEVEL 2: SUBJECT LIST VIEW (FLOATING GLASS GRID) ---
const SubjectList = memo((props) => {
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick, loading, userProfile } = props;
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const decodedCategoryName = useMemo(() => decodeURIComponent(categoryName), [categoryName]);
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);
    const scrollbarClass = 'mac-scrollbar';

    const prevCategoryRef = useRef();
    useEffect(() => {
        if (decodedCategoryName && decodedCategoryName !== prevCategoryRef.current) {
            handleCategoryClick(decodedCategoryName);
            setActiveSubject(null);
            prevCategoryRef.current = decodedCategoryName;
        }
    }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

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

    return (
        <div className={commonContainerClasses}>
            <div className="h-full flex flex-col">
                
                {/* --- FLOATING HEADER --- */}
                <div className="relative z-30 flex-none flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 mb-6 rounded-[2rem] bg-white/60 dark:bg-[#121212]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => navigate(`/dashboard/courses/${contentGroup}`)} 
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10 text-slate-400 hover:text-white"
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                        </button>
                        <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={(val) => navigate(`/dashboard/courses/${val}`)} monet={monet} />
                        
                        <div className="hidden md:block w-px h-6 bg-white/10"></div>
                        <h1 className="hidden md:block text-lg font-black tracking-tight text-slate-800 dark:text-white truncate">
                            {decodedCategoryName.replace(/\s\((Teacher|Learner)'s Content\)/i, '')}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-60 group">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--monet-primary)] transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full py-2.5 pl-10 pr-4 rounded-full bg-black/10 dark:bg-white/5 border border-transparent focus:border-white/20 text-sm font-medium focus:outline-none focus:bg-black/20 dark:focus:bg-white/10 transition-all text-slate-800 dark:text-white placeholder:text-slate-500" 
                            />
                        </div>
                        <button 
                            onClick={() => onAddSubjectClick && onAddSubjectClick(decodedCategoryName)} 
                            className={`${getButtonClass('primary', monet)} shadow-lg whitespace-nowrap`}
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">New Subject</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`flex-1 overflow-y-auto pr-2 pb-20 ${scrollbarClass}`}>
                    {loading ? <SkeletonGrid /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredCourses.map((course) => {
                                const { icon: Icon, styleClass } = getSubjectStyling(course.title, monet);
                                return (
                                    <Link 
                                        key={course.id} 
                                        to={course.id} 
                                        className="neural-card group relative flex flex-col p-6 rounded-[2rem] bg-white/80 dark:bg-[#1C1C1E]/80 border border-white/20 dark:border-white/5 backdrop-blur-md overflow-hidden"
                                    >
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm ${styleClass}`}>
                                                    <Icon className="w-7 h-7" />
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                                    <button onClick={(e) => {e.preventDefault(); props.handleOpenEditSubject(course)}} className="p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"><PencilSquareIcon className="w-4 h-4 text-slate-500 dark:text-slate-300"/></button> 
                                                    <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('subject', course.id, course.title)}} className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors"><TrashIcon className="w-4 h-4 text-red-400"/></button>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <h2 className="text-lg font-bold mb-2 leading-tight text-slate-800 dark:text-white group-hover:text-indigo-400 transition-colors">
                                                    {course.title}
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    {course.isSchoolSpecific && (
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 text-slate-500 border border-black/5 dark:border-white/5">
                                                            <LockClosedIcon className="w-3 h-3 inline mr-1" />
                                                            Private
                                                        </span>
                                                    )}
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${monet.badge}`}>
                                                        {course.unitCount || 0} Units
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

// --- LEVEL 1: CATEGORY LIST VIEW (COMMAND DECK GLASS) ---
const CategoryList = memo((props) => {
    const {
        courseCategories,
        courses,
        setCreateCategoryModalOpen,
        handleEditCategory,
        handleInitiateDelete,
        handleCategoryClick,
        setActiveSubject,
        loading,
        userProfile
    } = props;

    const { contentGroup } = useParams();
    const navigate = useNavigate();
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    useEffect(() => {
        setActiveSubject(null);
        handleCategoryClick(null);
    }, [setActiveSubject, handleCategoryClick]);

    const isLearner = contentGroup.toLowerCase() === "learner";

    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const userSchoolId = userProfile?.schoolId || "srcs_main";
        const visibleCoursesSet = new Set();

        if (courses) {
            courses.forEach(c => {
                if (
                    c.schoolId === "global" ||
                    !c.schoolId ||
                    c.schoolId === userSchoolId
                ) {
                    visibleCoursesSet.add(c.category);
                }
            });
        }

        return courseCategories
            .filter(cat => {
                const lowerName = cat.name.toLowerCase();
                return (
                    (isLearner
                        ? !lowerName.includes("teacher")
                        : lowerName.includes("teacher")) &&
                    visibleCoursesSet.has(cat.name)
                );
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner, courses, userProfile?.schoolId]);

    const handleSwitchGroup = useCallback(
        (newGroup) => navigate(`/dashboard/courses/${newGroup}`),
        [navigate]
    );

    return (
        <div className={commonContainerClasses}>
            <div className="h-full flex flex-col">

                {/* ───────────────── HEADER / COMMAND DECK ───────────────── */}
                <div className="
                    sticky top-0 z-40
                    px-5 py-4 mb-6
                    rounded-[2rem]
                    bg-white/70 dark:bg-[#111]/70
                    backdrop-blur-2xl
                    border border-white/20 dark:border-white/5
                    shadow-lg
                ">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/dashboard/courses")}
                                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:scale-105 transition flex items-center justify-center"
                            >
                                <ArrowUturnLeftIcon className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                            </button>

                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white leading-none">
                                    {isLearner ? "Learner Space" : "Teacher Control"}
                                </h1>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {isLearner
                                        ? "Browse available learning areas"
                                        : "Manage instructional categories"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <ContentScopeSwitcher
                                activeGroup={contentGroup}
                                onSwitch={handleSwitchGroup}
                                monet={monet}
                            />

                            <button
                                onClick={() => setCreateCategoryModalOpen(true)}
                                className={`${getButtonClass("primary", monet)} shadow-lg`}
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                <span>New Category</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ───────────────── CONTENT ───────────────── */}
                <div className="flex-1 overflow-y-auto pb-24 mac-scrollbar">
                    {loading ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="
                            grid
                            grid-cols-1
                            sm:grid-cols-2
                            lg:grid-cols-3
                            xl:grid-cols-4
                            gap-6
                        ">
                            {categoriesToShow.map(cat => {
                                const courseCount = courses
                                    ? courses.filter(c => c.category === cat.name).length
                                    : 0;

                                const { icon: Icon, styleClass } =
                                    getSubjectStyling(cat.name, monet);

                                const cleanName = cat.name.replace(
                                    /\s\((Teacher|Learner)'s Content\)/i,
                                    ""
                                );

                                return (
								  <Link
								    key={cat.id}
								    to={encodeURIComponent(cat.name)}
								    className="
								      group relative
								      flex flex-col justify-between
								      h-full min-h-[11rem] w-full
								      p-6
								      rounded-3xl
								      /* --- Glassmorphism Base --- */
								      bg-white/70 dark:bg-zinc-900/60
								      backdrop-blur-xl
								      border border-white/40 dark:border-white/10
								      /* --- Complex Shadow for Depth & Inner Glow --- */
								      shadow-[0_8px_24px_-6px_rgba(0,0,0,0.05),_inset_0_1px_2px_rgba(255,255,255,0.6)]
								      dark:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.08)]
								      /* --- Hover Transitions --- */
								      transition-all duration-500 ease-out
								      hover:-translate-y-1 hover:bg-white/90 dark:hover:bg-zinc-900/80
								      hover:shadow-[0_20px_32px_-8px_rgba(0,0,0,0.1),_inset_0_1px_2px_rgba(255,255,255,0.8)]
								      dark:hover:shadow-[0_20px_32px_-8px_rgba(0,0,0,0.6),_inset_0_1px_1px_rgba(255,255,255,0.1)]
								      overflow-hidden
								      isolate
								    "
								  >
								    {/* --- VISUAL DECOR 1: The Ambient 'Orb' --- */}
								    {/* A subtle, blurred gradient blob that shifts on hover.
								        Adjust colors (e.g., from-blue-100) to match your brand if needed. */}
								    <div className="
								      absolute -top-24 -right-24 -z-10
								      w-64 h-64
								      rounded-full
								      bg-gradient-to-br from-zinc-200/40 via-zinc-100/20 to-transparent
								      dark:from-zinc-700/30 dark:via-zinc-800/10
								      blur-3xl
								      opacity-70 group-hover:opacity-100
								      group-hover:scale-125 group-hover:-translate-x-10 group-hover:translate-y-10
								      transition-all duration-700 ease-in-out
								    " />

								    {/* --- VISUAL DECOR 2: Subtle Noise Texture (Optional, very premium feel) --- */}
								    {/* If you don't have a noise image, remove this div. It adds a tactile feel. */}
								    <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.08] mix-blend-overlay pointer-events-none"
								         style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27noiseFilter%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.65%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E")' }}
								    ></div>


								    {/* --- CONTENT --- */}

								    {/* Top Row: Icon & Actions */}
								    <div className="flex justify-between items-start mb-4 relative z-10">
    
								      {/* Icon Box (Slightly more distinct now) */}
								      <div className={`
								        flex items-center justify-center
								        w-12 h-12
								        rounded-2xl
								        bg-white/50 dark:bg-white/10
								        backdrop-blur-md
								        border border-white/50 dark:border-white/10
								        shadow-sm
								        ${styleClass}
								      `}>
								        <Icon className="w-6 h-6 text-zinc-700 dark:text-zinc-200" />
								      </div>

								      {/* Actions (Slide-in) */}
								      <div className="
								        flex gap-2
								        opacity-100 lg:opacity-0 lg:group-hover:opacity-100
								        lg:translate-y-[-10px] lg:group-hover:translate-y-0
								        transition-all duration-300 ease-out
								      ">
								        {/* Edit Button */}
								        <button
								          onClick={(e) => { e.preventDefault(); handleEditCategory(cat); }}
								          className="
								            p-2 rounded-xl
								            bg-white/50 dark:bg-white/5 backdrop-blur-md
								            border border-white/20 dark:border-white/5
								            text-zinc-500 dark:text-zinc-300
								            hover:bg-white dark:hover:bg-white/20
								            hover:text-zinc-900 dark:hover:text-white
								            transition-colors shadow-sm
								          "
								        >
								          <PencilSquareIcon className="w-4 h-4" />
								        </button>

								        {/* Delete Button */}
								        <button
								          onClick={(e) => { e.preventDefault(); handleInitiateDelete("category", cat.id, cat.name); }}
								          className="
								            p-2 rounded-xl
								            bg-red-50/50 dark:bg-red-500/5 backdrop-blur-md
								            border border-red-100/20 dark:border-red-500/10
								            text-red-400
								            hover:bg-red-100 dark:hover:bg-red-500/20
								            hover:text-red-600 dark:hover:text-red-400
								            transition-colors shadow-sm
								          "
								        >
								          <TrashIcon className="w-4 h-4" />
								        </button>
								      </div>
								    </div>

								    {/* Bottom Row: Text Content */}
								    <div className="relative z-10">
								      <h2 className="
								        text-xl font-extrabold tracking-tight
								        text-zinc-800 dark:text-white
								        leading-snug
								        line-clamp-2
								        mb-2
								        /* Subtle text shadow to pop off glass */
								        drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)] dark:drop-shadow-none
								      ">
								        {cleanName}
								      </h2>

								      <div className="flex items-center gap-3">
								        <span className="
								          text-sm font-semibold
								          text-zinc-500 dark:text-zinc-400
								        ">
								          {courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}
								        </span>

								        {cat.isSchoolSpecific && (
								          <div className="
								            flex items-center
								            px-2 py-0.5 rounded-full
								            bg-amber-100/80 dark:bg-amber-900/40
								            border border-amber-200/50 dark:border-amber-700/30
								          ">
								            <LockClosedIcon className="w-3 h-3 text-amber-700 dark:text-amber-400" />
								          </div>
								        )}
								      </div>
								    </div>
								  </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});


// --- LEVEL 0: CONTENT GROUP SELECTOR (DUAL REALM LAYOUT) ---
const ContentGroupSelector = memo((props) => {
    useEffect(() => {
        props.setActiveSubject(null);
        props.handleBackToCategoryList();
    }, []);

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center px-4 sm:px-6 lg:px-12 py-10">
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEARNER REALM */}
                <Link
                    to="learner"
                    className="
                        group relative lg:col-span-6
                        min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]
                        rounded-[2.5rem]
                        overflow-hidden
                        bg-white/60 dark:bg-black/40
                        backdrop-blur-2xl
                        border border-white/20
                        shadow-xl
                        transition-all duration-500
                        hover:-translate-y-1 hover:shadow-2xl
                    "
                >
                    {/* Accent rail */}
                    <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-sky-400 to-sky-600" />

                    {/* Ambient glow */}
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/30 rounded-full blur-[120px] opacity-60 group-hover:opacity-90 transition-opacity duration-700" />

                    <div className="relative z-10 h-full flex flex-col p-6 sm:p-8 lg:p-12">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                                <LearnerIcon className="w-9 h-9 stroke-2" />
                            </div>
                            <span className="uppercase tracking-widest text-xs font-bold text-sky-500">
                                Student Portal
                            </span>
                        </div>

                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-800 dark:text-white mb-4">
                            Learner
                        </h2>

                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-md">
                            Learn at your pace.  
                            Track lessons, activities, and progress.
                        </p>

                        <div className="mt-auto pt-8 flex items-center justify-between">
                            <span className="text-sm font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                                Enter workspace
                            </span>
                            <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center transition-transform duration-500 group-hover:translate-x-1">
                                <ArrowPathIcon className="w-5 h-5 -rotate-45" />
                            </div>
                        </div>
                    </div>
                </Link>

                {/* TEACHER REALM */}
                <Link
                    to="teacher"
                    className="
                        group relative lg:col-span-6
                        min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]
                        rounded-[2.5rem]
                        overflow-hidden
                        bg-white/60 dark:bg-black/40
                        backdrop-blur-2xl
                        border border-white/20
                        shadow-xl
                        transition-all duration-500
                        hover:-translate-y-1 hover:shadow-2xl
                    "
                >
                    {/* Accent rail */}
                    <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-emerald-400 to-emerald-600" />

                    {/* Ambient glow */}
                    <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/30 rounded-full blur-[120px] opacity-60 group-hover:opacity-90 transition-opacity duration-700" />

                    <div className="relative z-10 h-full flex flex-col p-6 sm:p-8 lg:p-12">
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                                <TeacherIcon className="w-9 h-9 stroke-2" />
                            </div>
                            <span className="uppercase tracking-widest text-xs font-bold text-emerald-500">
                                Instructor Portal
                            </span>
                        </div>

                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-800 dark:text-white mb-4">
                            Teacher
                        </h2>

                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-md">
                            Design lessons.  
                            Assess learners and analyze results.
                        </p>

                        <div className="mt-auto pt-8 flex items-center justify-between">
                            <span className="text-sm font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                                Manage classes
                            </span>
                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center transition-transform duration-500 group-hover:translate-x-1">
                                <ArrowPathIcon className="w-5 h-5 -rotate-45" />
                            </div>
                        </div>
                    </div>
                </Link>

            </div>
        </div>
    );
});


// --- MAIN COURSES VIEW COMPONENT (MEMOIZED) ---
const CoursesView = memo((props) => {
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