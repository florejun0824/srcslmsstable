// src/components/teacher/dashboard/views/CoursesView.jsx
import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import UnitAccordion from '../../UnitAccordion';
import Spinner from '../../../../components/common/Spinner';
import { useTheme } from '../../../../contexts/ThemeContext'; // 1. Import Theme Context
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
    ArrowsUpDownIcon 
} from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';

// --- MONET STYLE HELPER ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay) return null;

    const baseGlass = "backdrop-blur-xl border shadow-xl transition-all duration-300";
    
    switch (activeOverlay) {
        case 'christmas':
            return {
                container: `${baseGlass} bg-[#0f172a]/80 border-emerald-500/20 shadow-emerald-900/10`,
                text: "text-white",
                subText: "text-emerald-100/70",
                accent: "text-emerald-400",
                buttonPrimary: "bg-gradient-to-r from-emerald-600 to-green-600 text-white border-emerald-700 shadow-emerald-900/20",
                buttonSecondary: "bg-emerald-900/40 text-emerald-100 border-emerald-500/30 hover:bg-emerald-800/50",
                cardGradient: "bg-gradient-to-br from-emerald-900/80 to-slate-900/80 border-emerald-500/20",
                iconBox: "bg-emerald-500/20 border-emerald-400/20 text-emerald-300"
            };
        case 'valentines':
            return {
                container: `${baseGlass} bg-[#2c0b0e]/80 border-rose-500/20 shadow-rose-900/10`,
                text: "text-white",
                subText: "text-rose-100/70",
                accent: "text-rose-400",
                buttonPrimary: "bg-gradient-to-r from-rose-600 to-pink-600 text-white border-rose-700 shadow-rose-900/20",
                buttonSecondary: "bg-rose-900/40 text-rose-100 border-rose-500/30 hover:bg-rose-800/50",
                cardGradient: "bg-gradient-to-br from-rose-900/80 to-slate-900/80 border-rose-500/20",
                iconBox: "bg-rose-500/20 border-rose-400/20 text-rose-300"
            };
        case 'graduation':
            return {
                container: `${baseGlass} bg-[#1a1400]/80 border-amber-500/20 shadow-amber-900/10`,
                text: "text-white",
                subText: "text-amber-100/70",
                accent: "text-amber-400",
                buttonPrimary: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-600 shadow-amber-900/20",
                buttonSecondary: "bg-amber-900/40 text-amber-100 border-amber-500/30 hover:bg-amber-800/50",
                cardGradient: "bg-gradient-to-br from-amber-900/80 to-slate-900/80 border-amber-500/20",
                iconBox: "bg-amber-500/20 border-amber-400/20 text-amber-300"
            };
        case 'rainy':
            return {
                container: `${baseGlass} bg-[#061816]/80 border-teal-500/20 shadow-teal-900/10`,
                text: "text-white",
                subText: "text-teal-100/70",
                accent: "text-teal-400",
                buttonPrimary: "bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-teal-700 shadow-teal-900/20",
                buttonSecondary: "bg-teal-900/40 text-teal-100 border-teal-500/30 hover:bg-teal-800/50",
                cardGradient: "bg-gradient-to-br from-teal-900/80 to-slate-900/80 border-teal-500/20",
                iconBox: "bg-teal-500/20 border-teal-400/20 text-teal-300"
            };
        case 'cyberpunk':
            return {
                container: `${baseGlass} bg-[#180a20]/80 border-fuchsia-500/20 shadow-fuchsia-900/10`,
                text: "text-white",
                subText: "text-fuchsia-100/70",
                accent: "text-fuchsia-400",
                buttonPrimary: "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-fuchsia-700 shadow-fuchsia-900/20",
                buttonSecondary: "bg-fuchsia-900/40 text-fuchsia-100 border-fuchsia-500/30 hover:bg-fuchsia-800/50",
                cardGradient: "bg-gradient-to-br from-fuchsia-900/80 to-slate-900/80 border-fuchsia-500/20",
                iconBox: "bg-fuchsia-500/20 border-fuchsia-400/20 text-fuchsia-300"
            };
        case 'spring':
            return {
                container: `${baseGlass} bg-[#1f0f15]/80 border-pink-500/20 shadow-pink-900/10`,
                text: "text-white",
                subText: "text-pink-100/70",
                accent: "text-pink-400",
                buttonPrimary: "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-600 shadow-pink-900/20",
                buttonSecondary: "bg-pink-900/40 text-pink-100 border-pink-500/30 hover:bg-pink-800/50",
                cardGradient: "bg-gradient-to-br from-pink-900/80 to-slate-900/80 border-pink-500/20",
                iconBox: "bg-pink-500/20 border-pink-400/20 text-pink-300"
            };
        case 'space':
            return {
                container: `${baseGlass} bg-[#020617]/80 border-indigo-500/20 shadow-indigo-900/10`,
                text: "text-white",
                subText: "text-indigo-100/70",
                accent: "text-indigo-400",
                buttonPrimary: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-700 shadow-indigo-900/20",
                buttonSecondary: "bg-indigo-900/40 text-indigo-100 border-indigo-500/30 hover:bg-indigo-800/50",
                cardGradient: "bg-gradient-to-br from-indigo-900/80 to-slate-900/80 border-indigo-500/20",
                iconBox: "bg-indigo-500/20 border-indigo-400/20 text-indigo-300"
            };
        default:
            return null;
    }
};

const commonContainerClasses = "relative h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] w-full p-2 sm:p-4 font-sans selection:bg-blue-500/30";

// --- CANDY UI STYLE CONSTANTS (Defaults) ---
const candyBase = `
    relative overflow-hidden font-bold rounded-full transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 
    active:scale-95 tracking-wide shrink-0 shadow-lg hover:shadow-xl
    after:absolute after:inset-0 after:rounded-full after:pointer-events-none 
    after:shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]
`;

// Helper to get button classes based on monet presence
const getButtonClass = (type, monet) => {
    if (monet) {
        if (type === 'primary') return `${candyBase} px-4 py-2 sm:px-6 sm:py-2.5 text-sm ${monet.buttonPrimary}`;
        if (type === 'secondary') return `${candyBase} px-4 py-2 sm:px-5 sm:py-2.5 text-sm ${monet.buttonSecondary}`;
        if (type === 'icon') return `${candyBase} p-2 sm:p-2.5 aspect-square rounded-full ${monet.buttonSecondary}`;
        if (type === 'destructive') return `${candyBase} p-2 sm:p-2.5 aspect-square rounded-full text-white bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 border-b-[2px] border-red-700 shadow-red-500/30`;
    }
    // Default Candy Styles
    if (type === 'primary') return `${candyBase} px-4 py-2 sm:px-6 sm:py-2.5 text-sm text-white bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-300 hover:to-blue-500 border-b-[2px] border-blue-700 shadow-blue-500/40`;
    if (type === 'secondary') return `${candyBase} px-4 py-2 sm:px-5 sm:py-2.5 text-sm text-slate-700 dark:text-white bg-gradient-to-b from-white/80 to-white/40 dark:from-slate-700/80 dark:to-slate-800/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-slate-200/50 dark:shadow-black/30 hover:bg-white/60 dark:hover:bg-slate-700/60`;
    if (type === 'icon') return `${candyBase} p-2 sm:p-2.5 aspect-square rounded-full text-slate-500 dark:text-slate-300 bg-gradient-to-b from-white/90 to-slate-100/50 dark:from-slate-700 dark:to-slate-800 border border-white/50 dark:border-white/5 hover:text-blue-600 dark:hover:text-blue-400`;
    if (type === 'destructive') return `${candyBase} p-2 sm:p-2.5 aspect-square rounded-full text-white bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 border-b-[2px] border-red-700 shadow-red-500/30`;
    
    return candyBase;
};

// 2. Candy Cards (Subjects/Categories)
const candyCardBase = `
    group relative rounded-[2.5rem] p-6 sm:p-8 
    transition-all duration-300 cursor-pointer overflow-hidden 
    border border-white/20 dark:border-white/5 
    shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]
    after:absolute after:inset-0 after:rounded-[2.5rem] after:pointer-events-none 
    after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]
    after:bg-gradient-to-t after:from-black/5 after:to-white/10
`;

// Glassy Icon Container for Cards
const candyIconBox = `
    w-14 h-14 rounded-2xl flex items-center justify-center 
    bg-white/40 dark:bg-black/20 backdrop-blur-md 
    shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] dark:shadow-none
    border border-white/40 dark:border-white/10
`;

// --- SKELETONS ---
const SkeletonGrid = memo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 relative p-8 border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 mb-6"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4 mb-3 absolute bottom-16"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2 absolute bottom-8"></div>
            </div>
        ))}
    </div>
));

const SkeletonList = memo(() => (
    <div className="space-y-4 animate-pulse p-2">
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3 mb-8 mx-2"></div>
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full flex items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-200 dark:bg-slate-700 mx-3"></div>
                <div className="flex-grow min-w-0 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
            </div>
        ))}
    </div>
));

// --- SUBJECT STYLING (Updated for Monet) ---
const getSubjectStyling = (subjectTitle, monet) => {
    const lowerCaseTitle = subjectTitle.toLowerCase();
    let IconComponent = BookOpenIcon;
    let iconColor = 'text-slate-700 dark:text-white drop-shadow-sm';
    // Default Vibrant Candy Gradients
    let gradient = 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900';
    
    // If Monet is active, return the unified monet gradient
    if (monet) {
        return { 
            icon: IconComponent, // Icon component logic below
            iconColor: monet.text, // Use monet text color
            gradient: monet.cardGradient // Use monet card gradient
        };
    }

    if (lowerCaseTitle.includes('math')) { 
        IconComponent = CalculatorIcon; 
        gradient = 'bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-300 dark:from-blue-900/60 dark:via-blue-800/40 dark:to-indigo-900/60'; 
        iconColor = 'text-blue-600 dark:text-blue-100';
    }
    else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino')) { 
        IconComponent = BookOpenIcon; 
        gradient = 'bg-gradient-to-br from-teal-100 via-emerald-200 to-green-300 dark:from-teal-900/60 dark:via-emerald-800/40 dark:to-green-900/60'; 
        iconColor = 'text-teal-600 dark:text-teal-100';
    }
    else if (lowerCaseTitle.includes('religious education')) { 
        IconComponent = BookOpenIcon; 
        gradient = 'bg-gradient-to-br from-amber-100 via-orange-200 to-yellow-300 dark:from-amber-900/60 dark:via-orange-800/40 dark:to-yellow-900/60'; 
        iconColor = 'text-amber-700 dark:text-amber-100';
    }
    else if (lowerCaseTitle.includes('science')) { 
        IconComponent = BeakerIcon; 
        gradient = 'bg-gradient-to-br from-violet-100 via-purple-200 to-fuchsia-300 dark:from-violet-900/60 dark:via-purple-800/40 dark:to-fuchsia-900/60'; 
        iconColor = 'text-purple-600 dark:text-purple-100';
    }
    else if (lowerCaseTitle.includes('araling panlipunan')) { 
        IconComponent = GlobeAltIcon; 
        gradient = 'bg-gradient-to-br from-rose-100 via-red-200 to-orange-300 dark:from-rose-900/60 dark:via-red-800/40 dark:to-orange-900/60'; 
        iconColor = 'text-rose-600 dark:text-rose-100';
    }
    else if (lowerCaseTitle.includes('mapeh')) { 
        IconComponent = MusicalNoteIcon; 
        gradient = 'bg-gradient-to-br from-pink-100 via-rose-200 to-red-300 dark:from-pink-900/60 dark:via-rose-800/40 dark:to-red-900/60'; 
        iconColor = 'text-pink-600 dark:text-pink-100';
    }
    else if (lowerCaseTitle.includes('tle')) { 
        IconComponent = WrenchScrewdriverIcon; 
        gradient = 'bg-gradient-to-br from-orange-100 via-amber-200 to-yellow-300 dark:from-orange-900/60 dark:via-amber-800/40 dark:to-yellow-900/60'; 
        iconColor = 'text-orange-700 dark:text-orange-100';
    }
    
    // Update icon component even if monet was active (hack to fix icon reference in monet block above)
    if (monet) {
         // Re-running icon logic for monet block return
         // (Not optimized but keeps logic consistent without refactoring everything)
         return { icon: IconComponent, iconColor: monet.text, gradient: monet.cardGradient };
    }

    return { icon: IconComponent, iconColor, gradient };
};

// --- COMPONENT: CONTENT SCOPE SWITCHER (DROPDOWN) ---
const ContentScopeSwitcher = ({ activeGroup, onSwitch, monet }) => {
    return (
        <div className="relative inline-block w-full sm:w-auto">
            <select
                value={activeGroup}
                onChange={(e) => onSwitch(e.target.value)}
                className={`
                    appearance-none pl-10 pr-10 py-2.5 rounded-2xl 
                    text-sm font-bold shadow-sm transition-all cursor-pointer outline-none w-full
                    ${monet 
                        ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20 focus:ring-2 focus:ring-white/30' 
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 focus:ring-2 focus:ring-blue-500/20 shadow-slate-200/50 dark:shadow-none'
                    }
                `}
            >
                <option value="learner" className="text-slate-900 bg-white dark:text-slate-200 dark:bg-[#1A1D24]">Learner's Space</option>
                <option value="teacher" className="text-slate-900 bg-white dark:text-slate-200 dark:bg-[#1A1D24]">Teacher's Space</option>
            </select>
            
            {/* Left Icon */}
            <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${monet ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>
                {activeGroup === 'learner' ? <LearnerIcon className="w-4 h-4"/> : <TeacherIcon className="w-4 h-4"/>}
            </div>

            {/* Right Chevron */}
            <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${monet ? 'text-white/50' : 'text-slate-400'}`}>
                <ArrowsUpDownIcon className="w-4 h-4" />
            </div>
        </div>
    );
};

// --- LEVEL 3: SUBJECT DETAIL VIEW ---
const SubjectDetail = memo((props) => {
    const {
        courses, handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating,
        onSetActiveUnit, onGeneratePresentationPreview, setActiveSubject,
        handleCategoryClick, activeUnit,
    } = props;

    const { contentGroup, categoryName, subjectId } = useParams();
    const navigate = useNavigate();
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    const [units, setUnits] = useState([]);
    const [allLessonsForSubject, setAllLessonsForSubject] = useState([]);
    const [isLoadingUnitsAndLessons, setIsLoadingUnitsAndLessons] = useState(true); 
    
    const activeSubject = useMemo(() => courses.find(c => c.id === subjectId), [courses, subjectId]);
    
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [showLessonPicker, setShowLessonPicker] = useState(false);
    const [activeUnitForPicker, setActiveUnitForPicker] = useState(null);

    // Dynamic Classes
    const containerClasses = monet 
        ? `relative z-10 h-full flex flex-col rounded-3xl sm:rounded-[2rem] w-full max-w-7xl mx-auto overflow-hidden ${monet.container}`
        : "relative z-10 h-full flex flex-col bg-white/90 dark:bg-[#1A1D24]/95 rounded-3xl sm:rounded-[2rem] shadow-xl shadow-slate-200/60 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 w-full max-w-7xl mx-auto overflow-hidden";

    const headerClasses = monet
        ? `flex-none flex flex-col md:flex-row justify-between items-start md:items-center py-4 px-4 sm:p-6 gap-4 border-b border-white/10 z-20`
        : "flex-none flex flex-col md:flex-row justify-between items-start md:items-center py-4 px-4 sm:p-6 gap-4 border-b border-slate-200/60 dark:border-white/5 bg-white/80 dark:bg-[#1A1D24]/80 z-20";

    useEffect(() => {
        if (activeSubject) {
            setActiveSubject(activeSubject);
            handleCategoryClick(decodeURIComponent(categoryName));
        }
        return () => {
            setActiveSubject(null);
            handleCategoryClick(null);
        }
    }, [activeSubject, categoryName, setActiveSubject, handleCategoryClick]);

    useEffect(() => {
        if (activeSubject?.id) {
            setIsLoadingUnitsAndLessons(true);
            const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', activeSubject.id));
            const unsubscribeUnits = onSnapshot(unitsQuery, (unitsSnapshot) => {
                const fetchedUnits = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUnits(fetchedUnits);
                
                if (fetchedUnits.length > 0) {
                    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', activeSubject.id));
                    const unsubscribeLessons = onSnapshot(lessonsQuery, (lessonsSnapshot) => {
                        const fetchedLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setAllLessonsForSubject(fetchedLessons);
                        setIsLoadingUnitsAndLessons(false);
                    }, (err) => {
                        console.error("Error fetching lessons:", err);
                        setIsLoadingUnitsAndLessons(false);
                    });
                    return () => unsubscribeLessons();
                } else {
                    setAllLessonsForSubject([]);
                    setIsLoadingUnitsAndLessons(false);
                }
            }, (error) => {
                console.error("Error fetching units:", error);
                setIsLoadingUnitsAndLessons(false);
            });
            return () => unsubscribeUnits();
        } else {
            setUnits([]);
            setAllLessonsForSubject([]);
            if (subjectId && !activeSubject) setIsLoadingUnitsAndLessons(true); 
            else setIsLoadingUnitsAndLessons(false);
        }
    }, [activeSubject, subjectId]);
    
    const handleLessonSelect = (lessonId) => {
        setSelectedLessons(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(lessonId)) newSelection.delete(lessonId);
            else newSelection.add(lessonId);
            return newSelection;
        });
    };

    const handleGeneratePresentationClick = () => {
        if (onGeneratePresentationPreview) {
            onGeneratePresentationPreview(Array.from(selectedLessons), allLessonsForSubject, units);
        }
    };

    const handleBackNavigation = () => {
        if (activeUnit) {
            onSetActiveUnit(null);
        } else {
            navigate(`/dashboard/courses/${contentGroup}/${categoryName}`);
        }
    };

    if (subjectId && !activeSubject && isLoadingUnitsAndLessons) return (
        <div className={commonContainerClasses}>
            <div className={containerClasses}>
                <SkeletonList />
            </div>
        </div>
    );

    if (!activeSubject) return <Spinner />;

    return (
        <div className={commonContainerClasses}>
            {/* NO AuroraBackground */}

            <div className={containerClasses}>
                
                {/* HEADER */}
                <div className={headerClasses}>
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto">
                        <button onClick={handleBackNavigation} className={getButtonClass('secondary', monet)}>
                            {activeUnit ? <Squares2X2Icon className="w-4 h-4" /> : <ArrowUturnLeftIcon className="w-4 h-4" />}
                            <span className="hidden sm:inline font-bold">{activeUnit ? 'All Units' : 'Back'}</span>
                        </button>
                        <div className={`h-8 w-px mx-1 hidden sm:block ${monet ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        <h2 className={`text-lg sm:text-xl font-bold tracking-tight truncate max-w-[180px] sm:max-w-sm ${monet ? monet.text : 'text-slate-800 dark:text-slate-100'}`}>
                            {activeSubject.title}
                        </h2>
                        <div className="flex items-center ml-auto sm:ml-2 space-x-2">
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className={getButtonClass('icon', monet)} title="Edit Subject Name"><PencilSquareIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className={getButtonClass('destructive', monet)} title="Delete Subject"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3 flex-wrap w-full md:w-auto">
                        <button onClick={() => setShareContentModalOpen(true)} className={`${getButtonClass('secondary', monet)} flex-1 sm:flex-none justify-center`}>
                            <ShareIcon className={`w-4 h-4 ${monet ? monet.accent : 'text-blue-500'}`} />
                            <span className="text-xs sm:text-sm">Share</span>
                        </button>
                        <button onClick={() => setAddUnitModalOpen(true)} className={`${getButtonClass('secondary', monet)} flex-1 sm:flex-none justify-center`}>
                            <PlusCircleIcon className={`w-5 h-5 ${monet ? monet.accent : 'text-emerald-500'}`} />
                            <span className="text-xs sm:text-sm">Add Unit</span>
                        </button>
                        <button onClick={() => setIsAiHubOpen(true)} className={`${getButtonClass('primary', monet)} pl-4 pr-5 flex-1 sm:flex-none justify-center whitespace-nowrap`}>
                            <SparklesIcon className="w-5 h-5 text-yellow-300 drop-shadow-sm" />AI Tools
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2 sm:p-4">
                    {isLoadingUnitsAndLessons ? (
                        <SkeletonList />
                    ) : (
                        <UnitAccordion
                            subject={activeSubject}
                            onInitiateDelete={handleInitiateDelete}
                            userProfile={userProfile}
                            isAiGenerating={isAiGenerating}
                            setIsAiGenerating={setIsAiGenerating}
                            activeUnit={activeUnit}
                            onSetActiveUnit={onSetActiveUnit}
                            selectedLessons={selectedLessons}
                            onLessonSelect={handleLessonSelect}
                            handleGenerateQuizForLesson={handleGenerateQuizForLesson}
                            monet={monet} // Pass monet styles down
                            renderGeneratePptButton={(unit) => (
                                <button
                                    onClick={() => { setSelectedLessons(new Set()); setActiveUnitForPicker(unit); setShowLessonPicker(true); }}
                                    className={`${getButtonClass('secondary', monet)} !px-3 !py-1.5 text-xs border-slate-200 shadow-sm`}
                                    disabled={isAiGenerating}
                                >
                                    {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" /> : <PresentationChartBarIcon className={`w-4 h-4 ${monet ? monet.accent : 'text-blue-500'}`} />}
                                    <span>{isAiGenerating ? 'Wait...' : 'PPT'}</span>
                                </button>
                            )}
                        />
                    )}
                </div>
            </div>

            <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${monet ? 'rgba(255,255,255,0.2)' : '#cbd5e1'}; border-radius: 999px; }
              .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${monet ? 'rgba(255,255,255,0.2)' : '#475569'}; }
            `}</style>

            {/* --- LESSON PICKER MODAL --- */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-[5000] p-4 transition-all duration-300">
                    <div className={`relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 ${monet ? monet.container : 'bg-white dark:bg-[#1A1D24] border border-slate-200 dark:border-slate-700 shadow-2xl'}`}>
                        
                        <div className={`px-8 py-6 border-b flex justify-between items-start ${monet ? 'border-white/10 bg-transparent' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24]'}`}>
                            <div>
                                <div className={`flex items-center gap-2 mb-1 ${monet ? monet.accent : 'text-blue-600 dark:text-blue-400'}`}>
                                    <SparklesIcon className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">AI Generator</span>
                                </div>
                                <h2 className={`text-2xl font-black tracking-tight ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>Select Content</h2>
                                <p className={`text-sm mt-1 font-medium ${monet ? monet.subText : 'text-slate-500 dark:text-slate-400'}`}>
                                    Choose lessons from <span className={`font-bold ${monet ? monet.text : 'text-slate-700 dark:text-slate-200'}`}>"{activeUnitForPicker.title}"</span>
                                </p>
                            </div>
                            <button onClick={() => setShowLessonPicker(false)} className={`${getButtonClass('icon', monet)} !p-1.5`}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-3 custom-scrollbar ${monet ? 'bg-transparent' : 'bg-white dark:bg-[#1A1D24]'}`}>
                            {(() => {
                                const lessonsInUnit = allLessonsForSubject
                                    .filter((lesson) => lesson.unitId === activeUnitForPicker.id)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                                
                                if (lessonsInUnit.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${monet ? monet.iconBox : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                <BookOpenIcon className={`w-8 h-8 ${monet ? 'text-white' : 'text-slate-400'}`} />
                                            </div>
                                            <p className={`font-medium ${monet ? monet.subText : 'text-slate-500 dark:text-slate-400'}`}>No lessons found in this unit.</p>
                                        </div>
                                    );
                                }

                                return lessonsInUnit.map((lesson) => {
                                    const isSelected = selectedLessons.has(lesson.id);
                                    return (
                                        <label 
                                            key={lesson.id} 
                                            className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all duration-200 relative overflow-hidden active:scale-[0.98] ${
                                                isSelected 
                                                ? (monet ? `bg-white/20 border-white/30` : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-inner') 
                                                : (monet ? `bg-white/5 border-transparent hover:bg-white/10` : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm')
                                            }`}
                                        >
                                            <div className="min-w-0 pr-4 relative z-10">
                                                <div className={`font-bold text-sm transition-colors ${isSelected ? (monet ? monet.accent : 'text-blue-700 dark:text-blue-200') : (monet ? monet.text : 'text-slate-700 dark:text-slate-200')}`}>
                                                    {lesson.title}
                                                </div>
                                                {lesson.subtitle && (
                                                    <div className={`text-xs mt-0.5 truncate font-medium ${monet ? monet.subText : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {lesson.subtitle}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="relative flex items-center justify-center w-6 h-6 z-10">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => handleLessonSelect(lesson.id)} 
                                                    className={`peer appearance-none w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${monet ? 'border-white/40 checked:bg-white checked:border-white' : 'border-slate-300 dark:border-slate-600 checked:bg-blue-500 checked:border-blue-500'}`} 
                                                />
                                                <CheckCircleIcon className={`absolute w-6 h-6 pointer-events-none opacity-0 peer-checked:opacity-100 transition-all scale-50 peer-checked:scale-100 drop-shadow-sm ${monet ? 'text-black' : 'text-blue-500'}`} />
                                            </div>
                                        </label>
                                    );
                                });
                            })()}
                        </div>

                        <div className={`px-8 py-5 border-t flex justify-between items-center ${monet ? 'border-white/10 bg-transparent' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A1D24]'}`}>
                            <span className={`text-xs font-bold uppercase tracking-wide ${monet ? monet.subText : 'text-slate-400'}`}>
                                {selectedLessons.size} Selected
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowLessonPicker(false)} className={getButtonClass('secondary', monet)}>
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }} 
                                    className={getButtonClass('primary', monet)}
                                    disabled={selectedLessons.size === 0 || isAiGenerating}
                                >
                                    {isAiGenerating ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PresentationChartBarIcon className="w-5 h-5" />}
                                    <span>{isAiGenerating ? 'Processing...' : 'Generate Deck'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// --- LEVEL 2: SUBJECT LIST VIEW (MEMOIZED) ---
const SubjectList = memo((props) => {
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick, loading } = props;
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const decodedCategoryName = decodeURIComponent(categoryName);
    
    // Theme
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    // Classes
    const containerClasses = monet 
        ? `relative z-10 h-full flex flex-col rounded-3xl sm:rounded-[2rem] w-full max-w-7xl mx-auto overflow-hidden ${monet.container}`
        : "relative z-10 h-full flex flex-col bg-white/90 dark:bg-[#1A1D24]/95 rounded-3xl sm:rounded-[2rem] shadow-xl shadow-slate-200/60 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 w-full max-w-7xl mx-auto overflow-hidden";

    const headerClasses = monet
        ? `flex-none flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-5 sm:p-8 border-b border-white/10 z-20`
        : "flex-none flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-5 sm:p-8 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-[#1A1D24]/80 z-20";

    const searchInputClass = monet 
        ? `w-full sm:max-w-md p-2.5 pl-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/30 border border-white/10 bg-black/20 backdrop-blur-sm text-white placeholder:text-white/40 shadow-inner transition-all`
        : `w-full sm:max-w-md p-2.5 pl-10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-black/20 backdrop-blur-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 shadow-inner transition-all`;

    useEffect(() => {
        handleCategoryClick(decodedCategoryName);
        setActiveSubject(null);
        return () => handleCategoryClick(null);
    }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        const categoryCourses = courses.filter(c => c.category === decodedCategoryName);
        categoryCourses.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
        return categoryCourses.filter(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [courses, decodedCategoryName, searchTerm]);

    const handleSwitchGroup = (newGroup) => {
        navigate(`/dashboard/courses/${newGroup}`);
    };

    return (
        <div className={commonContainerClasses}>
            {/* NO AuroraBackground */}
            <div className={containerClasses}>
                {/* Header */}
                <div className={headerClasses}>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <div className="w-full flex items-center gap-3 mb-1">
                            <button onClick={() => navigate(`/dashboard/courses/${contentGroup}`)} className={`${getButtonClass('icon', monet)} !p-2`} title="Back to Categories">
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                            <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} monet={monet} />
                        </div>
                        <h1 className={`text-2xl sm:text-4xl font-black tracking-tight leading-tight ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>
                            {decodedCategoryName.replace(/\s\((Teacher|Learner)'s Content\)/i, '')}
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                            <MagnifyingGlassIcon className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${monet ? 'text-white/50' : 'text-slate-400'}`} />
                            <input type="text" placeholder="Filter subjects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={searchInputClass} />
                        </div>
                        <button onClick={() => onAddSubjectClick && onAddSubjectClick(decodedCategoryName)} className={getButtonClass('primary', monet)}><PlusCircleIcon className="w-5 h-5" />New Subject</button>
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                    {loading || (!courses && filteredCourses.length === 0) ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredCourses.map((course) => {
                                const { icon: Icon, iconColor, gradient } = getSubjectStyling(course.title, monet);
                                const unitCount = course.unitCount || 0;
                                return (
                                    <Link key={course.id} to={course.id} className={`${candyCardBase} ${gradient}`}>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start">
                                                <div className={`${candyIconBox} ${monet ? monet.iconBox : ''}`}><Icon className={`w-8 h-8 ${iconColor}`} /></div>
                                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100">
                                                    <button onClick={(e) => {e.preventDefault(); props.handleOpenEditSubject(course)}} className={getButtonClass('icon', monet)} title="Edit"><PencilSquareIcon className="w-4 h-4"/></button> 
                                                    <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('subject', course.id, course.title)}} className={getButtonClass('destructive', monet)} title="Delete"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="mt-8">
                                                <h2 className={`text-xl font-bold mb-2 leading-tight drop-shadow-sm ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>{course.title}</h2>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm shadow-sm ${monet ? 'bg-black/30 text-white border-white/20' : 'bg-white/40 dark:bg-black/20 text-slate-700 dark:text-slate-200 border-white/20'}`}>{unitCount} {unitCount === 1 ? 'Unit' : 'Units'}</span>
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

// --- LEVEL 1: CATEGORY LIST VIEW (MEMOIZED) ---
const CategoryList = memo((props) => {
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject, loading } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();
    
    // Theme
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    // Classes
    const containerClasses = monet 
        ? `relative z-10 h-full flex flex-col rounded-3xl sm:rounded-[2rem] w-full max-w-7xl mx-auto overflow-hidden ${monet.container}`
        : "relative z-10 h-full flex flex-col bg-white/90 dark:bg-[#1A1D24]/95 rounded-3xl sm:rounded-[2rem] shadow-xl shadow-slate-200/60 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 w-full max-w-7xl mx-auto overflow-hidden";

    const headerClasses = monet
        ? `flex-none flex flex-col sm:flex-row justify-between items-end gap-4 p-6 sm:p-10 border-b border-white/10 z-20`
        : "flex-none flex flex-col sm:flex-row justify-between items-end gap-4 p-6 sm:p-10 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-[#1A1D24]/80 z-20";

    useEffect(() => {
        setActiveSubject(null);
        handleCategoryClick(null);
    }, [setActiveSubject, handleCategoryClick]);

    const isLearner = contentGroup.toLowerCase() === 'learner';
    const title = isLearner ? "Learner's Space" : "Teacher's Space";
    const subtitle = isLearner ? "Access your curated learning materials" : "Manage your curriculum and resources";
    
    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const filtered = courseCategories.filter(cat => {
            const lowerName = cat.name.toLowerCase();
            return isLearner ? !lowerName.includes("(teacher's content)") : lowerName.includes("teacher's content");
        });
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner]);

    const handleSwitchGroup = (newGroup) => {
        navigate(`/dashboard/courses/${newGroup}`);
    };

    return (
        <div className={commonContainerClasses}>
            {/* NO AuroraBackground */}
            <div className={containerClasses}>
                <div className={headerClasses}>
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => navigate('/dashboard/courses')} className={`${getButtonClass('icon', monet)} !p-2`} title="Back to Selection">
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                            <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} monet={monet} />
                        </div>
                        
                        <h1 className={`text-3xl sm:text-5xl font-black tracking-tighter leading-tight ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>{title}</h1>
                        <p className={`text-base sm:text-lg mt-1 font-light ${monet ? monet.subText : 'text-slate-500 dark:text-slate-400'}`}>{subtitle}</p>
                    </div>
                    <button onClick={() => setCreateCategoryModalOpen(true)} className={`${getButtonClass('primary', monet)} w-full sm:w-auto`}><PlusCircleIcon className="w-5 h-5" />New Category</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                    {loading || (!courseCategories && categoriesToShow.length === 0) ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categoriesToShow.map((cat) => {
                                const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0; 
                                const { icon: Icon, iconColor, gradient } = getSubjectStyling(cat.name, monet);
                                const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, '');
                                
                                return (
                                    <Link key={cat.id} to={encodeURIComponent(cat.name)} className={`${candyCardBase} ${gradient}`}>
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`${candyIconBox} ${monet ? monet.iconBox : ''}`}><Icon className={`w-8 h-8 ${iconColor}`} /></div>
                                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 scale-95 group-hover:scale-100">
                                                    <button onClick={(e) => {e.preventDefault(); handleEditCategory(cat)}} className={getButtonClass('icon', monet)}><PencilSquareIcon className="w-4 h-4"/></button> 
                                                    <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name)}} className={getButtonClass('destructive', monet)}><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="mt-auto">
                                                <h2 className={`text-2xl font-bold mb-2 tracking-tight drop-shadow-sm ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>{cleanName}</h2>
                                                <div className={`flex items-center gap-2 font-medium ${monet ? monet.subText : 'text-slate-700 dark:text-slate-300'}`}>
                                                    <span className={`w-2 h-2 rounded-full shadow-sm ${monet ? 'bg-white' : 'bg-slate-500 dark:bg-slate-400'}`}></span>
                                                    {courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}
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

// --- LEVEL 0: CONTENT GROUP SELECTOR (MEMOIZED) ---
const ContentGroupSelector = memo((props) => {
    // Theme
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    useEffect(() => {
        props.setActiveSubject(null);
        props.handleBackToCategoryList();
    }, [props.setActiveSubject, props.handleBackToCategoryList]);

    // Card Gradients for Selector
    const learnerGradient = monet ? monet.cardGradient : 'bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-900/20 dark:to-blue-900/10';
    const teacherGradient = monet ? monet.cardGradient : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-900/20 dark:to-teal-900/10';
    
    // Icon Colors
    const learnerIconColor = monet ? monet.text : 'text-sky-600 dark:text-sky-300';
    const teacherIconColor = monet ? monet.text : 'text-emerald-600 dark:text-emerald-300';
    const accentText = monet ? monet.accent : 'text-sky-600 dark:text-sky-400';
    const accentText2 = monet ? monet.accent : 'text-emerald-600 dark:text-emerald-400';

    return (
        <div className={commonContainerClasses}>
            {/* NO AuroraBackground */}

            <div className="relative z-10 flex items-center justify-center h-full">
                <div className="w-full max-w-6xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                         <h1 className={`text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>Who is learning today?</h1>
                         <p className={`text-lg sm:text-xl ${monet ? monet.subText : 'text-slate-500 dark:text-slate-400'}`}>Select your portal to access content.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12 px-4">
                        {/* Learner Card */}
                        <Link to="learner" className={`${candyCardBase} ${learnerGradient}`}>
                            <div className="relative z-10 flex flex-col h-full items-start">
                                <div className={`${candyIconBox} ${monet ? monet.iconBox : ''} w-16 h-16 rounded-[1.2rem] mb-6 sm:mb-8`}>
                                    <LearnerIcon className={`w-8 h-8 sm:w-10 sm:h-10 drop-shadow-sm ${learnerIconColor}`} />
                                </div>
                                <h2 className={`text-2xl sm:text-4xl font-bold tracking-tight mb-3 ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>Learner</h2>
                                <p className={`text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 ${monet ? monet.subText : 'text-slate-700 dark:text-slate-300'}`}>
                                    Dive into your subjects, track your progress, and explore interactive lessons designed just for you.
                                </p>
                                <div className={`mt-auto flex items-center gap-2 font-bold group-hover:gap-4 transition-all text-sm sm:text-base ${accentText}`}>
                                    Enter Portal <span className="text-lg sm:text-xl">→</span>
                                </div>
                            </div>
                        </Link>

                        {/* Teacher Card */}
                        <Link to="teacher" className={`${candyCardBase} ${teacherGradient}`}>
                            <div className="relative z-10 flex flex-col h-full items-start">
                                <div className={`${candyIconBox} ${monet ? monet.iconBox : ''} w-16 h-16 rounded-[1.2rem] mb-6 sm:mb-8`}>
                                    <TeacherIcon className={`w-8 h-8 sm:w-10 sm:h-10 drop-shadow-sm ${teacherIconColor}`} />
                                </div>
                                <h2 className={`text-2xl sm:text-4xl font-bold tracking-tight mb-3 ${monet ? monet.text : 'text-slate-800 dark:text-white'}`}>Teacher</h2>
                                <p className={`text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 ${monet ? monet.subText : 'text-slate-700 dark:text-slate-300'}`}>
                                    Manage curriculum, create engaging units, and organize educational resources efficiently.
                                </p>
                                <div className={`mt-auto flex items-center gap-2 font-bold group-hover:gap-4 transition-all text-sm sm:text-base ${accentText2}`}>
                                    Manage Content <span className="text-lg sm:text-xl">→</span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
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
            </Route>
        </Routes>
    );
});

export default CoursesView;