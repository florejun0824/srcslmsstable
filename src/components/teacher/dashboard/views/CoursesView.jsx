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
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar-light::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 999px; }
  .custom-scrollbar-dark::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.15); border-radius: 999px; }
  .custom-scrollbar-monet::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 999px; }
`;

// --- ONE UI 8.0 MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;
    // ... (Keep existing switch case logic)
    switch (activeOverlay) {
        case 'christmas':
            return {
                iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
                btnPrimary: "bg-emerald-600 text-white hover:bg-emerald-700",
                btnTonal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30",
                badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                themeText: "text-emerald-700 dark:text-emerald-400"
            };
        case 'valentines':
            return {
                iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
                btnPrimary: "bg-rose-600 text-white hover:bg-rose-700",
                btnTonal: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-500/30",
                badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
                themeText: "text-rose-700 dark:text-rose-400"
            };
        case 'graduation':
            return {
                iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                btnPrimary: "bg-amber-600 text-white hover:bg-amber-700",
                btnTonal: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30",
                badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                themeText: "text-amber-700 dark:text-amber-400"
            };
        case 'rainy':
            return {
                iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
                btnPrimary: "bg-teal-600 text-white hover:bg-teal-700",
                btnTonal: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-500/30",
                badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
                themeText: "text-teal-700 dark:text-teal-400"
            };
        case 'cyberpunk':
            return {
                iconBg: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
                btnPrimary: "bg-fuchsia-600 text-white hover:bg-fuchsia-700",
                btnTonal: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-500/30",
                badge: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
                themeText: "text-fuchsia-700 dark:text-fuchsia-400"
            };
        case 'spring':
            return {
                iconBg: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300",
                btnPrimary: "bg-pink-600 text-white hover:bg-pink-700",
                btnTonal: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-500/30",
                badge: "bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400",
                themeText: "text-pink-700 dark:text-pink-400"
            };
        case 'space':
            return {
                iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
                btnPrimary: "bg-indigo-600 text-white hover:bg-indigo-700",
                btnTonal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-500/30",
                badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
                themeText: "text-indigo-700 dark:text-indigo-400"
            };
        default:
            return null;
    }
};

const commonContainerClasses = "relative h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] w-full px-4 py-2 font-sans selection:bg-slate-200 dark:selection:bg-slate-700";

// --- ONE UI CARD STYLES ---
const elevatedCardBase = `
    group relative flex flex-col p-5 rounded-[26px]
    transition-all duration-300 ease-out cursor-pointer overflow-hidden
    bg-white dark:bg-[#1C1C1E] border border-transparent dark:border-[#2C2C2E]
    shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] 
    hover:-translate-y-1 active:scale-[0.98]
`;

const elevatedIconBox = `
    w-14 h-14 rounded-[20px] flex items-center justify-center mb-4
    transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3
`;

// --- COMPACT PILL BUTTONS ---
const getButtonClass = (type, monet) => {
    // ... (Keep existing button class logic)
    const base = "flex items-center justify-center gap-1.5 rounded-full font-bold tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    
    if (monet) {
        if (type === 'primary') return `${base} px-5 py-2.5 text-xs ${monet.btnPrimary} shadow-sm`;
        if (type === 'secondary') return `${base} px-4 py-2 text-xs ${monet.btnTonal}`;
        if (type === 'icon') return `${base} p-2 aspect-square ${monet.btnTonal} rounded-full`;
        if (type === 'destructive') return `${base} p-2 aspect-square text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full`;
    }

    if (type === 'primary') return `${base} px-5 py-2.5 text-xs text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm`;
    if (type === 'secondary') return `${base} px-4 py-2 text-xs text-slate-700 dark:text-slate-200 bg-[#F2F4F7] dark:bg-[#2C2C2E] hover:bg-[#E5E7EB] dark:hover:bg-[#3A3A3C]`;
    if (type === 'icon') return `${base} p-2 aspect-square text-slate-500 dark:text-slate-400 bg-transparent hover:bg-slate-100 dark:hover:bg-[#2C2C2E] rounded-full`;
    if (type === 'destructive') return `${base} p-2 aspect-square text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full`;
    
    return base;
};

// --- SKELETONS ---
const SkeletonGrid = memo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-[26px] bg-white dark:bg-[#1C1C1E] shadow-sm relative p-5 border border-slate-100 dark:border-[#2C2C2E]">
                <div className="w-12 h-12 rounded-[20px] bg-slate-100 dark:bg-[#2c2c2e] mb-4"></div>
                <div className="h-5 bg-slate-100 dark:bg-[#2c2c2e] rounded-full w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-100 dark:bg-[#2c2c2e] rounded-full w-1/3"></div>
            </div>
        ))}
    </div>
));

const SkeletonList = memo(() => (
    <div className="space-y-3 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-[#1c1c1e] rounded-xl w-1/4 mb-6"></div>
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-16 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm"></div>
        ))}
    </div>
));

// --- SUBJECT ICONS & COLORS ---
const getSubjectStyling = (subjectTitle, monet) => {
    // ... (Keep existing styling logic)
    const lowerCaseTitle = subjectTitle.toLowerCase();
    let IconComponent = BookOpenIcon;
    let styleClass = "bg-slate-100 text-slate-600 dark:bg-[#2C2C2E] dark:text-slate-300";

    if (monet) {
        return { 
            icon: IconComponent, 
            styleClass: monet.iconBg
        };
    }

    if (lowerCaseTitle.includes('math')) { 
        IconComponent = CalculatorIcon; 
        styleClass = "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
    }
    else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino')) { 
        IconComponent = BookOpenIcon; 
        styleClass = "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
    }
    else if (lowerCaseTitle.includes('science')) { 
        IconComponent = BeakerIcon; 
        styleClass = "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400";
    }
    else if (lowerCaseTitle.includes('araling')) { 
        IconComponent = GlobeAltIcon; 
        styleClass = "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400";
    }
    else if (lowerCaseTitle.includes('music') || lowerCaseTitle.includes('art')) { 
        IconComponent = MusicalNoteIcon; 
        styleClass = "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400";
    }
    else if (lowerCaseTitle.includes('tech')) { 
        IconComponent = WrenchScrewdriverIcon; 
        styleClass = "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400";
    }

    return { icon: IconComponent, styleClass };
};

// --- COMPONENT: CONTENT SCOPE SWITCHER ---
const ContentScopeSwitcher = memo(({ activeGroup, onSwitch, monet }) => {
    const isLearner = activeGroup === 'learner';
    
    return (
        <div className="relative z-20">
            <Menu as="div" className="relative inline-block text-left">
                <Menu.Button
                    className={`
                        group relative flex items-center justify-between gap-3 pl-4 pr-3 py-2.5 rounded-full 
                        text-xs font-bold transition-all outline-none min-w-[170px] shadow-sm
                        ${monet 
                            ? `${monet.btnTonal} ring-1 ring-inset ring-black/5 dark:ring-white/5` 
                            : 'bg-[#F2F4F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-[#E5E7EB] dark:hover:bg-[#3A3A3C]'
                        }
                    `}
                >
                    <div className="flex items-center gap-2.5">
                        {isLearner ? <LearnerIcon className="w-4 h-4"/> : <TeacherIcon className="w-4 h-4"/>}
                        <span className="capitalize">{activeGroup}'s Space</span>
                    </div>
                    <ArrowsUpDownIcon className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity`} />
                </Menu.Button>

                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95 translate-y-2"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 translate-y-2"
                >
                    <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left rounded-[24px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] dark:shadow-black/50 border border-white/40 dark:border-white/10 ring-1 ring-black/5 focus:outline-none p-1.5 z-50">
                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Switch Portal
                        </div>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => onSwitch('learner')}
                                    className={`
                                        flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-xs font-bold transition-all
                                        ${active ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}
                                        ${activeGroup === 'learner' ? (monet ? monet.themeText : 'text-blue-600 dark:text-blue-400') : ''}
                                    `}
                                >
                                    <div className={`p-1.5 rounded-full ${activeGroup === 'learner' ? (monet ? monet.badge : 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400') : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                                        <LearnerIcon className="w-4 h-4" />
                                    </div>
                                    Learner's Space
                                    {activeGroup === 'learner' && <CheckCircleIcon className="w-4 h-4 ml-auto" />}
                                </button>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => onSwitch('teacher')}
                                    className={`
                                        flex w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-xs font-bold transition-all
                                        ${active ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}
                                        ${activeGroup === 'teacher' ? (monet ? monet.themeText : 'text-emerald-600 dark:text-emerald-400') : ''}
                                    `}
                                >
                                    <div className={`p-1.5 rounded-full ${activeGroup === 'teacher' ? (monet ? monet.badge : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400') : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                                        <TeacherIcon className="w-4 h-4" />
                                    </div>
                                    Teacher's Space
                                    {activeGroup === 'teacher' && <CheckCircleIcon className="w-4 h-4 ml-auto" />}
                                </button>
                            )}
                        </Menu.Item>
                    </Menu.Items>
                </Transition>
            </Menu>
        </div>
    );
});

// --- LEVEL 3: SUBJECT DETAIL VIEW (THE WORKSPACE OVERHAUL) ---
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
    
    // Inject Custom Scrollbar
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
    const scrollbarClass = useMemo(() => {
        if (monet) return 'custom-scrollbar custom-scrollbar-monet';
        return 'custom-scrollbar custom-scrollbar-light dark:custom-scrollbar-dark';
    }, [monet]);

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

    // Deep Linking
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

    // Data Fetching
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

    // --- COMPACT BREADCRUMB COMPONENT ---
    const BreadcrumbSeparator = () => (
        <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
    );

    // New "Glass Navbar" Style for Header
    const glassHeaderClasses = `
        flex-none flex flex-col md:flex-row justify-between items-center px-6 py-4 gap-4 
        bg-white/60 dark:bg-[#1C1C1E]/60 backdrop-blur-xl border-b border-white/20 dark:border-white/5 
        z-20 shadow-sm
    `;

    return (
        <div className={commonContainerClasses}>
            {/* Main Glass Container */}
            <div className={`h-full flex flex-col rounded-[32px] overflow-hidden bg-white/30 dark:bg-[#1c1c1e]/40 border border-white/40 dark:border-white/10 shadow-xl backdrop-blur-md`}>
                
                {/* --- COMPACT GLASS HEADER --- */}
                <div className={glassHeaderClasses}>
                    <div className="flex items-center flex-wrap w-full md:w-auto overflow-hidden">
                        
                        {/* Mobile Back Button */}
                        <button 
                            onClick={() => {
                                if(activeUnit) handleUnitNavigation(null);
                                else navigate(`/dashboard/courses/${contentGroup}/${categoryName}`);
                            }} 
                            className={`mr-3 md:hidden ${getButtonClass('icon', monet)}`}
                        >
                             <ArrowUturnLeftIcon className="w-4 h-4" />
                        </button>

                        {/* --- COMPACT BREADCRUMBS --- */}
                        <nav className="flex items-center text-sm font-bold whitespace-nowrap overflow-x-auto no-scrollbar mask-fade-right">
                            
                            {/* 1. Category (Truncated) */}
                            <Link 
                                to={`/dashboard/courses/${contentGroup}/${categoryName}`}
                                className={`transition-colors hover:underline decoration-2 underline-offset-4 decoration-slate-300 truncate max-w-[120px] sm:max-w-[150px] ${monet ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200' : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                title={decodeURIComponent(categoryName)}
                            >
                                {decodeURIComponent(categoryName).replace(/\(.*\)/, '')}
                            </Link>

                            <BreadcrumbSeparator />

                            {/* 2. Subject Name */}
                            {activeUnit ? (
                                <Link
                                    to={`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`}
                                    onClick={() => onSetActiveUnit(null)} 
                                    className={`transition-colors hover:underline decoration-2 underline-offset-4 decoration-slate-300 truncate max-w-[150px] ${monet ? 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200' : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                >
                                    {activeSubject.title}
                                </Link>
                            ) : (
                                <span className={`text-base sm:text-lg font-black tracking-tight truncate ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>
                                    {activeSubject.title}
                                </span>
                            )}

                            {/* 3. Unit Name */}
                            {activeUnit && (
                                <>
                                    <BreadcrumbSeparator />
                                    <span className={`text-base sm:text-lg font-black tracking-tight truncate max-w-[150px] sm:max-w-xs ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>
                                        {activeUnit.title}
                                    </span>
                                </>
                            )}
                        </nav>

                        {/* Edit Actions (Small & Discrete) */}
                        {!activeUnit && (
                            <div className="flex items-center ml-3 pl-3 border-l border-slate-200/50 dark:border-white/10 space-x-1">
                                <button onClick={() => handleOpenEditSubject(activeSubject)} className={getButtonClass('icon', monet)} title="Edit"><PencilSquareIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className={getButtonClass('destructive', monet)} title="Delete"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setShareContentModalOpen(true)} className={`${getButtonClass('icon', monet)}`} title="Share">
                            <ShareIcon className="w-4 h-4" />
                        </button>
                        
                        {!activeUnit && (
                            <button onClick={() => setAddUnitModalOpen(true)} className={`${getButtonClass('secondary', monet)} h-9 px-4 rounded-full text-xs shadow-sm`}>
                                <PlusCircleIcon className={`w-4 h-4 ${monet ? monet.themeText : 'text-emerald-500'}`} />
                                <span className="hidden sm:inline">Add Unit</span>
                            </button>
                        )}

                        {activeUnit && (
                            <button onClick={() => setIsAiHubOpen(true)} className={`${getButtonClass('primary', monet)} h-9 px-4 rounded-full text-xs shadow-md shadow-indigo-500/20`}>
                                <SparklesIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">AI Tools</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* --- TRANSPARENT CONTENT AREA --- */}
                {/* Removed bg-[#F8F9FA] to let Aurora show through */}
                <div className={`flex-1 overflow-y-auto min-h-0 pt-0 bg-transparent ${scrollbarClass}`}>
                    {isLoading ? (
                        <div className="p-6"><SkeletonList /></div>
                    ) : (
                        // Passing transparent=true (implied) to UnitAccordion by not wrapping it in a color
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
                                    className={`${getButtonClass('secondary', monet)} !px-3 !py-1.5 text-[10px] shadow-sm border border-slate-200/50 bg-white/50 backdrop-blur-sm`}
                                    disabled={isAiGenerating}
                                >
                                    {isAiGenerating ? <ArrowPathIcon className="w-3 h-3 animate-spin text-blue-500" /> : <PresentationChartBarIcon className={`w-3 h-3 ${monet ? monet.themeText : 'text-blue-500'}`} />}
                                    <span>{isAiGenerating ? 'Wait...' : 'PPT'}</span>
                                </button>
                            )}
                        />
                    )}
                </div>
            </div>

            {/* --- GLASS LESSON PICKER MODAL --- */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[5000] p-4 sm:p-6 transition-all duration-300">
                    {/* Glass Modal Container */}
                    <div className={`relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/20 shadow-2xl`}>
                        
                        {/* Modal Header */}
                        <div className={`px-8 py-6 border-b border-slate-100/50 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-black/20 flex-shrink-0`}>
                            <div>
                                <h2 className={`text-xl font-black tracking-tight ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>Select Content</h2>
                                <p className={`text-xs font-bold mt-1 ${monet ? 'text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                    From <span className="font-extrabold text-slate-700 dark:text-slate-300">"{activeUnitForPicker.title}"</span>
                                </p>
                            </div>
                            <button onClick={() => setShowLessonPicker(false)} className={`${getButtonClass('icon', monet)} bg-slate-100/50 dark:bg-white/10`}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal List */}
                        <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2 bg-transparent ${scrollbarClass}`}>
                            {(() => {
                                const lessonsInUnit = allLessonsForSubject
                                    .filter((lesson) => lesson.unitId === activeUnitForPicker.id)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0));
            
                                if (lessonsInUnit.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                                            <BookOpenIcon className={`w-12 h-12 mb-3 ${monet ? monet.themeText : 'text-slate-300'}`} />
                                            <p className={`text-sm font-bold ${monet ? 'text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>No lessons found.</p>
                                        </div>
                                    );
                                }

                                return lessonsInUnit.map((lesson) => {
                                    const isSelected = selectedLessons.has(lesson.id);
                                    return (
                                        <label 
                                            key={lesson.id} 
                                            className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all duration-200 ${
                                                isSelected 
                                                ? (monet ? `${monet.btnTonal} border-transparent shadow-sm` : 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800') 
                                                : (monet ? `hover:bg-slate-50/50 dark:hover:bg-white/5 border-transparent` : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-slate-50 dark:hover:bg-white/10')
                                            }`}
                                        >
                                            <div className="min-w-0 pr-4">
                                                <div className={`font-bold text-sm ${isSelected ? (monet ? monet.themeText : 'text-blue-700 dark:text-blue-200') : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {lesson.title}
                                                </div>
                                            </div>
                                            <div className="relative flex items-center justify-center w-5 h-5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => handleLessonSelect(lesson.id)} 
                                                    className={`peer appearance-none w-5 h-5 rounded-full border-[2.5px] transition-all cursor-pointer ${monet ? `border-slate-300 dark:border-slate-600 checked:bg-current` : 'border-slate-300 dark:border-slate-600 checked:bg-blue-600 checked:border-blue-600'}`} 
                                                />
                                                <CheckCircleIcon className={`absolute w-5 h-5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-75 peer-checked:scale-100 text-white`} />
                                            </div>
                                        </label>
                                    );
                                });
                            })()}
                        </div>

                        {/* Modal Footer */}
                        <div className={`px-8 py-6 border-t border-slate-100/50 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-black/20 flex-shrink-0`}>
                            <span className={`text-xs font-black uppercase tracking-wider ${monet ? monet.themeText : 'text-slate-500'}`}>
                                {selectedLessons.size} Selected
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowLessonPicker(false)} className={`${getButtonClass('secondary', monet)} bg-white/50 dark:bg-white/5`}>
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }} 
                                    className={`${getButtonClass('primary', monet)} shadow-lg shadow-blue-500/20`}
                                    disabled={selectedLessons.size === 0 || isAiGenerating}
                                >
                                    {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PresentationChartBarIcon className="w-4 h-4" />}
                                    <span>Generate</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
// --- LEVEL 2: SUBJECT LIST VIEW (SINGLE LINE HEADER + TRANSPARENT GLASS) ---
const SubjectList = memo((props) => {
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick, loading, userProfile } = props;
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const decodedCategoryName = useMemo(() => decodeURIComponent(categoryName), [categoryName]);
    
    const { activeOverlay } = useTheme();

    // Fallback "Rose" Theme
    const monet = useMemo(() => {
        const styles = getMonetStyles(activeOverlay);
        if (styles) return styles;
        return {
            iconBg: "bg-rose-500/10 text-rose-400",
            btnPrimary: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-900/20",
            btnTonal: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
            badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            themeText: "text-rose-500"
        };
    }, [activeOverlay]);

    const scrollbarClass = 'custom-scrollbar custom-scrollbar-dark';

    // SEARCH BAR (Compact Pill)
    const searchInputClass = `
        w-full py-2 pl-9 pr-4 rounded-full 
        bg-black/20 backdrop-blur-md 
        border border-white/5
        text-slate-200 placeholder:text-slate-400/60 font-medium text-xs
        focus:outline-none focus:bg-black/40 focus:border-white/10
        transition-all
    `;

    // Prevent loop update
    const prevCategoryRef = useRef();
    useEffect(() => {
        if (decodedCategoryName && decodedCategoryName !== prevCategoryRef.current) {
            handleCategoryClick(decodedCategoryName);
            setActiveSubject(null);
            prevCategoryRef.current = decodedCategoryName;
        }
    }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

    // Filtering
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
            
            {/* --- MAIN CONTAINER --- */}
            {/* bg-black/40 + backdrop-blur-md: Performance-friendly dark glass */}
            <div className="w-full max-w-7xl mx-auto h-full flex flex-col rounded-[32px] border border-white/5 bg-black/40 shadow-2xl overflow-hidden relative backdrop-blur-md transform-gpu">
                
                {/* --- SINGLE LINE HEADER --- */}
                <div className="relative z-10 flex-none flex items-center justify-between gap-4 px-6 py-4 md:px-8 border-b border-white/5 bg-transparent">
                    
                    {/* LEFT: Nav & Title Grouped */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Nav Controls (Always Visible) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button 
                                onClick={() => navigate(`/dashboard/courses/${contentGroup}`)} 
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 text-slate-400 hover:text-white" 
                                title="Back to Categories"
                            >
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                            <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={(val) => navigate(`/dashboard/courses/${val}`)} monet={monet} />
                        </div>

                        {/* Divider (Hidden on Mobile) */}
                        <div className="hidden md:block w-px h-6 bg-white/10 flex-shrink-0"></div>

                        {/* Title (Hidden on Mobile) */}
                        <h1 className="hidden md:block text-lg sm:text-xl font-black tracking-tight text-white truncate drop-shadow-md leading-none mb-0.5">
                            {decodedCategoryName.replace(/\s\((Teacher|Learner)'s Content\)/i, '')}
                        </h1>
                    </div>
                    
                    {/* RIGHT: Search & Action */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        
                        {/* Search Bar (Hidden on mobile via 'hidden sm:block' in existing code) */}
                        <div className="relative w-48 lg:w-60 hidden sm:block">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            <input 
                                type="text" 
                                id="search-subjects"
                                name="search_subjects_query"
                                placeholder="Filter subjects..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className={searchInputClass} 
                                autoComplete="off"
                                data-lpignore="true"
                            />
                        </div>

                        {/* New Subject Button (Always Visible) */}
                        <button 
                            onClick={() => onAddSubjectClick && onAddSubjectClick(decodedCategoryName)} 
                            className={`
                                ${monet.btnPrimary} 
                                px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-rose-900/20 
                                flex items-center gap-2 transition-transform hover:scale-105 active:scale-95
                            `}
                        >
                            <PlusCircleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">New Subject</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`flex-1 overflow-y-auto p-6 relative z-10 ${scrollbarClass}`}>
                    {loading || (!courses && filteredCourses.length === 0) ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filteredCourses.map((course) => {
                                const { icon: Icon, styleClass } = getSubjectStyling(course.title, monet);
                                const unitCount = course.unitCount || 0;
                                return (
                                    <Link 
                                        key={course.id} 
                                        to={course.id} 
                                        className="group relative flex flex-col p-5 rounded-[24px] transition-all duration-300 ease-out cursor-pointer overflow-hidden border border-white/5 bg-black/20 hover:bg-black/40 hover:border-white/10 hover:-translate-y-1"
                                    >
                                        {/* Hover Shine */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start">
                                                {/* Icon Box */}
                                                <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 shadow-inner backdrop-blur-sm ${monet.iconBg.includes('bg-') ? monet.iconBg : 'bg-rose-500/20 text-rose-300'}`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-4 sm:group-hover:translate-x-0">
                                                    <button onClick={(e) => {e.preventDefault(); props.handleOpenEditSubject(course)}} className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/5" title="Edit"><PencilSquareIcon className="w-4 h-4"/></button> 
                                                    <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('subject', course.id, course.title)}} className="p-2 rounded-full bg-white/5 hover:bg-rose-900/40 text-rose-500/80 hover:text-rose-500 transition-colors border border-white/5" title="Delete"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-1">
                                                <h2 className="text-base font-bold mb-2 leading-tight tracking-tight text-white group-hover:text-rose-100 transition-colors">
                                                    {course.title}
                                                </h2>
                                                
                                                {course.isSchoolSpecific && (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 bg-white/5 text-slate-400 border border-white/5">
                                                        <LockClosedIcon className="w-3 h-3" />
                                                        {course.schoolId === 'srcs_main' ? 'SRCS Only' : 'School Only'}
                                                    </div>
                                                )}

                                                <div className="flex items-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border border-white/5 ${monet.badge ? monet.badge : 'bg-white/5 text-slate-300'}`}>
                                                        {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
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
// --- LEVEL 1: CATEGORY LIST VIEW (TRANSPARENT GLASS + SINGLE LINE HEADER) ---
const CategoryList = memo((props) => {
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject, loading, userProfile } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();
    
    const { activeOverlay } = useTheme();

    // Proper Monet Implementation with Rose Fallback
    const monet = useMemo(() => {
        const styles = getMonetStyles(activeOverlay);
        if (styles) return styles;
        return {
            iconBg: "bg-rose-500/10 text-rose-400",
            btnPrimary: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-900/20",
            btnTonal: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
            badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            themeText: "text-rose-500"
        };
    }, [activeOverlay]);

    useEffect(() => {
        setActiveSubject(null);
        handleCategoryClick(null);
    }, [setActiveSubject, handleCategoryClick]);

    const isLearner = contentGroup.toLowerCase() === 'learner';
    const title = isLearner ? "Learner's Space" : "Teacher's Space";
    const subtitle = isLearner ? "Curated learning materials" : "Curriculum & Resources";
    
    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const userSchoolId = userProfile?.schoolId || 'srcs_main';
        const visibleCoursesSet = new Set();
        if (courses) {
            courses.forEach(c => {
                const isVisible = c.schoolId === 'global' || !c.schoolId || c.schoolId === userSchoolId;
                if (isVisible && c.category) visibleCoursesSet.add(c.category);
            });
        }
        const filtered = courseCategories.filter(cat => {
            const lowerName = cat.name.toLowerCase();
            const matchesGroup = isLearner ? !lowerName.includes("(teacher's content)") : lowerName.includes("teacher's content");
            const hasVisibleContent = visibleCoursesSet.has(cat.name);
            return matchesGroup && hasVisibleContent;
        });
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner, courses, userProfile?.schoolId]);

    const handleSwitchGroup = useCallback((newGroup) => {
        navigate(`/dashboard/courses/${newGroup}`);
    }, [navigate]);

    return (
        <div className={commonContainerClasses}>
            
            {/* --- MAIN CONTAINER --- */}
            <div className="w-full max-w-7xl mx-auto h-full flex flex-col rounded-[32px] border border-white/5 bg-black/40 shadow-2xl overflow-hidden relative backdrop-blur-md transform-gpu">
                
                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                </div>

                {/* --- SUPER COMPACT HEADER (SINGLE LINE) --- */}
                <div className="relative z-10 flex-none flex items-center justify-between gap-4 px-6 py-4 md:px-8 border-b border-white/5 bg-transparent">
                    
                    {/* LEFT SIDE: Controls & Title Grouped */}
                    <div className="flex items-center gap-4 md:gap-6 overflow-hidden">
                        
                        {/* Navigation Controls (Always Visible) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button 
                                onClick={() => navigate('/dashboard/courses')} 
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all shadow-sm border border-white/5 text-slate-400 hover:text-white"
                                title="Back to Selection"
                            >
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                            <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} monet={monet} />
                        </div>

                        {/* Divider (Hidden on Mobile) */}
                        <div className="hidden md:block w-px h-8 bg-white/10"></div>

                        {/* Title & Subtitle (Hidden on Mobile, Visible on MD+) */}
                        <div className="hidden md:flex flex-col justify-center min-w-0">
                            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-none mb-0.5 truncate drop-shadow-sm">
                                {title}
                            </h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 leading-none truncate">
                                {subtitle}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT SIDE: Action Button (Always Visible) */}
                    <button 
                        onClick={() => setCreateCategoryModalOpen(true)} 
                        className={`
                            ${monet.btnPrimary} 
                            flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 
                            transition-all hover:scale-105 active:scale-95 shadow-lg
                        `}
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">New Category</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </div>
                
                {/* --- CONTENT GRID --- */}
                <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 custom-scrollbar custom-scrollbar-dark">
                    {loading || (!courseCategories && categoriesToShow.length === 0) ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {categoriesToShow.map((cat, index) => {
                                const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0; 
                                const { icon: Icon, styleClass } = getSubjectStyling(cat.name, monet);
                                const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, '');
                                const delayStyle = { animationDelay: `${index * 50}ms` };

                                return (
                                    <Link 
                                        key={cat.id} 
                                        to={encodeURIComponent(cat.name)} 
                                        style={delayStyle}
                                        className="group relative h-64 flex flex-col p-6 rounded-[32px] overflow-hidden transition-all duration-300 ease-out cursor-pointer border border-white/5 bg-black/20 hover:bg-black/40 hover:border-white/10 hover:-translate-y-1 shadow-lg animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
                                    >
                                        {/* Hover Shine Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                        {/* Background Watermark Icon */}
                                        <div className={`absolute -bottom-8 -right-8 w-48 h-48 opacity-[0.03] transform rotate-[-15deg] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0 ${monet.themeText}`}>
                                            <Icon className="w-full h-full" />
                                        </div>

                                        <div className="relative z-10 flex justify-between items-start">
                                            {/* Icon Box */}
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-md ${monet.iconBg.includes('bg-') ? monet.iconBg : 'bg-rose-500/20 text-rose-300'}`}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            
                                            {/* Edit Actions */}
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0">
                                                <button onClick={(e) => {e.preventDefault(); handleEditCategory(cat)}} className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors border border-white/5"><PencilSquareIcon className="w-4 h-4"/></button> 
                                                <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name)}} className="p-2.5 rounded-full bg-white/5 hover:bg-rose-900/40 text-rose-500/80 hover:text-rose-500 transition-colors border border-white/5"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-auto">
                                            <h2 className="text-2xl font-black tracking-tight text-white mb-3 leading-tight line-clamp-2 group-hover:text-rose-100 transition-colors" title={cleanName}>
                                                {cleanName}
                                            </h2>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border border-white/5 ${monet.badge ? monet.badge : 'bg-white/5 text-slate-300'}`}>
                                                    {courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}
                                                </span>
                                                {cat.isSchoolSpecific && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold border border-white/5 bg-white/5 text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        <LockClosedIcon className="w-3 h-3" /> Private
                                                    </span>
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
// --- LEVEL 0: CONTENT GROUP SELECTOR (CINEMATIC OVERHAUL) ---
const ContentGroupSelector = memo((props) => {
    const { activeOverlay } = useTheme();
    // We retain the existing reset logic
    useEffect(() => {
        props.setActiveSubject(null);
        props.handleBackToCategoryList();
    }, []); 

    return (
        <div className="relative min-h-[85vh] flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-stretch h-full lg:h-[600px]">
                
                {/* LEARNER PORTAL */}
                <Link 
                    to="learner" 
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[40px] p-8 lg:p-12 transition-all duration-500 hover:grow-[1.1] hover:shadow-2xl"
                >
                    {/* Card Background - Optimized Glass */}
                    {/* Note: 'backdrop-blur-xl' creates the frosted effect */}
                    <div className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 transition-colors duration-500 group-hover:bg-sky-100/50 dark:group-hover:bg-sky-900/20"></div>
                    
                    {/* Hover Glow Effect - Pure CSS */}
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-sky-400/30 rounded-full blur-[80px] transition-all duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-150"></div>

                    <div className="relative z-10">
                        {/* Icon Box */}
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-sky-500/20 shadow-sm flex items-center justify-center mb-8 text-sky-600 dark:text-sky-300 transform transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                            <LearnerIcon className="w-10 h-10 stroke-2" />
                        </div>
                        
                        {/* Typography: Massive & Bold */}
                        <h2 className="text-4xl lg:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-4 leading-[0.9]">
                            Learner<br/><span className="text-sky-600 dark:text-sky-400">Portal.</span>
                        </h2>
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
                            Access assignments, view lessons, and track your progress.
                        </p>
                    </div>

                    {/* Action Button */}
                    <div className="relative z-10 mt-12 flex items-center gap-4">
                        <span className="h-14 px-8 flex items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm tracking-widest uppercase transition-transform group-hover:scale-105 shadow-lg">
                            Enter Space
                        </span>
                        <div className="w-14 h-14 rounded-full border-2 border-slate-900/10 dark:border-white/10 flex items-center justify-center transition-all group-hover:bg-sky-500 group-hover:border-sky-500 group-hover:text-white dark:text-white">
                            <ArrowPathIcon className="w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                        </div>
                    </div>
                </Link>

                {/* TEACHER PORTAL */}
                <Link 
                    to="teacher" 
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[40px] p-8 lg:p-12 transition-all duration-500 hover:grow-[1.1] hover:shadow-2xl"
                >
                     {/* Card Background - Optimized Glass */}
                     <div className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 transition-colors duration-500 group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/20"></div>
                    
                    {/* Hover Glow Effect */}
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-400/30 rounded-full blur-[80px] transition-all duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-150"></div>

                    <div className="relative z-10">
                        {/* Icon Box */}
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-emerald-500/20 shadow-sm flex items-center justify-center mb-8 text-emerald-600 dark:text-emerald-300 transform transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                            <TeacherIcon className="w-10 h-10 stroke-2" />
                        </div>

                        {/* Typography */}
                        <h2 className="text-4xl lg:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-4 leading-[0.9]">
                            Teacher<br/><span className="text-emerald-600 dark:text-emerald-400">Hub.</span>
                        </h2>
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
                            Manage curriculum, create content, and monitor student analytics.
                        </p>
                    </div>

                    {/* Action Button */}
                    <div className="relative z-10 mt-12 flex items-center gap-4">
                        <span className="h-14 px-8 flex items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm tracking-widest uppercase transition-transform group-hover:scale-105 shadow-lg">
                            Manage
                        </span>
                        <div className="w-14 h-14 rounded-full border-2 border-slate-900/10 dark:border-white/10 flex items-center justify-center transition-all group-hover:bg-emerald-500 group-hover:border-emerald-500 group-hover:text-white dark:text-white">
                            <ArrowPathIcon className="w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
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
                {/* [NEW] Route for specific Unit ID */}
                <Route path=":contentGroup/:categoryName/:subjectId/:unitId" element={<SubjectDetail {...props} />} />
            </Route>
        </Routes>
    );
});

export default CoursesView;