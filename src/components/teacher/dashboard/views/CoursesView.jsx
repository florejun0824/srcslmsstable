// src/components/teacher/dashboard/views/CoursesView.jsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import UnitAccordion from '../../UnitAccordion';
import Spinner from '../../../../components/common/Spinner';
import { useTheme } from '../../../../contexts/ThemeContext';
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
    LockClosedIcon
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/outline';

// --- ONE UI 8.0 MONET STYLES ---
const getMonetStyles = (activeOverlay) => {
    if (!activeOverlay || activeOverlay === 'none') return null;

    // One UI uses solid accent colors for icons/buttons, not full card gradients
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
// Clean, solid surfaces, soft shadows, super-squircle
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

// --- SUBJECT ICONS & COLORS (Clean Tonal) ---
const getSubjectStyling = (subjectTitle, monet) => {
    const lowerCaseTitle = subjectTitle.toLowerCase();
    let IconComponent = BookOpenIcon;
    let styleClass = "bg-slate-100 text-slate-600 dark:bg-[#2C2C2E] dark:text-slate-300";

    // If Monet is active, use theme color
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

// --- COMPONENT: CONTENT SCOPE SWITCHER (Pill Style) ---
const ContentScopeSwitcher = ({ activeGroup, onSwitch, monet }) => {
    return (
        <div className="relative inline-block w-full sm:w-auto min-w-[160px]">
            <select
                value={activeGroup}
                onChange={(e) => onSwitch(e.target.value)}
                className={`
                    appearance-none pl-10 pr-8 py-2.5 rounded-full 
                    text-xs font-bold transition-all cursor-pointer outline-none w-full
                    ${monet 
                        ? `${monet.btnTonal} border-none` 
                        : 'bg-[#F2F4F7] dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200 hover:bg-[#E5E7EB] dark:hover:bg-[#3A3A3C] border-none'
                    }
                `}
            >
                <option value="learner" className="text-slate-900 bg-white dark:text-slate-200 dark:bg-[#1A1D24]">Learner's Space</option>
                <option value="teacher" className="text-slate-900 bg-white dark:text-slate-200 dark:bg-[#1A1D24]">Teacher's Space</option>
            </select>
            
            {/* Left Icon */}
            <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${monet ? monet.themeText : 'text-slate-500 dark:text-slate-400'}`}>
                {activeGroup === 'learner' ? <LearnerIcon className="w-4 h-4"/> : <TeacherIcon className="w-4 h-4"/>}
            </div>

            {/* Right Chevron */}
            <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${monet ? monet.themeText : 'text-slate-400'}`}>
                <ArrowsUpDownIcon className="w-3.5 h-3.5" />
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
            <SkeletonList />
        </div>
    );

    if (!activeSubject) return <Spinner />;

    // One UI Header: Clean, Solid Surface
    const headerClasses = monet
        ? `flex-none flex flex-col md:flex-row justify-between items-start md:items-center py-5 px-6 gap-4 border-b border-transparent z-20 bg-white dark:bg-[#1C1C1E]`
        : "flex-none flex flex-col md:flex-row justify-between items-start md:items-center py-5 px-6 gap-4 border-b border-slate-100 dark:border-[#2c2c2e] z-20 bg-white dark:bg-[#1c1c1e]";

	return (
        <div className={commonContainerClasses}>
            <div className={`h-full flex flex-col rounded-[32px] overflow-hidden bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#2c2c2e] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-black/20`}>
                
                {/* HEADER */}
                <div className={headerClasses}>
                    <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                        <button onClick={handleBackNavigation} className={getButtonClass('secondary', monet)}>
                            {activeUnit ? <Squares2X2Icon className="w-4 h-4" /> : <ArrowUturnLeftIcon className="w-4 h-4" />}
                            <span className="hidden sm:inline">{activeUnit ? 'All Units' : 'Back'}</span>
                        </button>
                    
                        <div className={`h-6 w-px mx-1 hidden sm:block ${monet ? 'bg-slate-200' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                    
                        <h2 className={`text-lg sm:text-xl font-bold tracking-tight truncate max-w-[200px] sm:max-w-md ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>
                            {activeSubject.title}
                        </h2>
                    
                        {/* Edit/Delete Icons */}
                        <div className="flex items-center ml-auto sm:ml-3 space-x-1">
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className={getButtonClass('icon', monet)} title="Edit Subject Name"><PencilSquareIcon className="w-4 h-4" /></button>
                            <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className={getButtonClass('destructive', monet)} title="Delete Subject"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap w-full md:w-auto">
                        <button onClick={() => setShareContentModalOpen(true)} className={`${getButtonClass('secondary', monet)} flex-1 sm:flex-none justify-center`}>
                            <ShareIcon className={`w-4 h-4 ${monet ? monet.themeText : 'text-slate-500'}`} />
                            <span className="hidden md:inline text-xs">Share</span>
                        </button>
                        <button onClick={() => setAddUnitModalOpen(true)} className={`${getButtonClass('secondary', monet)} flex-1 sm:flex-none justify-center`}>
                            <PlusCircleIcon className={`w-4 h-4 ${monet ? monet.themeText : 'text-emerald-500'}`} />
                            <span className="text-xs">Add Unit</span>
                        </button>
                        <button onClick={() => setIsAiHubOpen(true)} className={`${getButtonClass('primary', monet)} flex-1 sm:flex-none justify-center whitespace-nowrap`}>
                            <SparklesIcon className="w-4 h-4" />
                            <span className="text-xs">AI Tools</span>
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pt-0 bg-[#F8F9FA] dark:bg-[#151517]">
                    {isLoadingUnitsAndLessons ? (
                        <div className="p-6"><SkeletonList /></div>
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
                            monet={monet} 
                            renderGeneratePptButton={(unit) => (
                                <button
                                    onClick={() => { setSelectedLessons(new Set()); setActiveUnitForPicker(unit); setShowLessonPicker(true); }}
                                    className={`${getButtonClass('secondary', monet)} !px-3 !py-1.5 text-[10px] shadow-none border border-slate-200/50`}
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

            <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${monet ? 'rgba(0,0,0,0.1)' : '#d1d5db'}; border-radius: 999px; }
              .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.15); }
            `}</style>

            {/* --- LESSON PICKER MODAL --- */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-[5000] p-6 transition-all duration-300">
                    <div className={`relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#2c2c2e] shadow-2xl`}>
                        
                        <div className={`px-6 py-5 border-b flex justify-between items-center border-slate-100 dark:border-[#2c2c2e] bg-slate-50/50 dark:bg-[#151517]`}>
                            <div>
                                <h2 className={`text-lg font-black tracking-tight ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>Select Content</h2>
                                <p className={`text-xs font-bold ${monet ? 'text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                    From <span className="font-extrabold">"{activeUnitForPicker.title}"</span>
                                </p>
                            </div>
                            <button onClick={() => setShowLessonPicker(false)} className={`${getButtonClass('icon', monet)}`}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-2 custom-scrollbar bg-white dark:bg-[#1c1c1e]`}>
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
                                            className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all duration-200 ${
                                                isSelected 
                                                ? (monet ? `${monet.btnTonal} border-transparent` : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800') 
                                                : (monet ? `hover:bg-slate-50 dark:hover:bg-[#2c2c2e] border-slate-100 dark:border-[#2c2c2e]` : 'bg-white dark:bg-[#1c1c1e] border-slate-100 dark:border-[#2c2c2e] hover:bg-slate-50 dark:hover:bg-[#2c2c2e]')
                                            }`}
                                        >
                                            <div className="min-w-0 pr-4">
                                                <div className={`font-bold text-sm ${isSelected ? (monet ? monet.themeText : 'text-blue-700 dark:text-blue-200') : (monet ? 'text-slate-700 dark:text-slate-200' : 'text-slate-700 dark:text-slate-200')}`}>
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

                        <div className={`px-6 py-5 border-t flex justify-between items-center border-slate-100 dark:border-[#2c2c2e] bg-slate-50 dark:bg-[#151517]`}>
                            <span className={`text-xs font-black uppercase tracking-wider ${monet ? monet.themeText : 'text-slate-500'}`}>
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
                                    {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PresentationChartBarIcon className="w-4 h-4" />}
                                    <span>Generate Deck</span>
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
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick, loading, userProfile } = props;
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const decodedCategoryName = decodeURIComponent(categoryName);
    
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    const containerClasses = `bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#2c2c2e] rounded-[32px] w-full max-w-7xl mx-auto h-full flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-black/20 overflow-hidden`;

    const headerClasses = `flex-none flex flex-col md:flex-row justify-between items-start md:items-end gap-6 p-6 border-b border-transparent bg-white dark:bg-[#1c1c1e]`;

    // One UI Search Input: Deep Field
    const searchInputClass = monet 
        ? `w-full sm:max-w-xs p-3 pl-10 rounded-full focus:outline-none focus:ring-1 focus:ring-white/20 border-none ${monet.btnTonal} transition-all font-bold text-sm`
        : `w-full sm:max-w-xs p-3 pl-10 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 border-none bg-[#F2F4F7] dark:bg-[#2C2C2E] text-slate-900 dark:text-white placeholder:text-slate-400 transition-all font-bold text-sm`;

    useEffect(() => {
        handleCategoryClick(decodedCategoryName);
        setActiveSubject(null);
        return () => handleCategoryClick(null);
    }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

    // ✅ STRICT SCHOOL FILTERING
    const filteredCourses = useMemo(() => {
        if (!courses) return [];
        const userSchoolId = userProfile?.schoolId || 'srcs_main';

        const categoryCourses = courses.filter(c => 
            c.category === decodedCategoryName &&
            (c.schoolId === 'global' || !c.schoolId || c.schoolId === userSchoolId)
        );
        categoryCourses.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
        return categoryCourses.filter(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [courses, decodedCategoryName, searchTerm, userProfile]);

    return (
        <div className={commonContainerClasses}>
            <div className={containerClasses}>
                {/* Header */}
                <div className={headerClasses}>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <div className="w-full flex items-center gap-3 mb-1">
                            <button onClick={() => navigate(`/dashboard/courses/${contentGroup}`)} className={`${getButtonClass('icon', monet)} !p-1.5`} title="Back to Categories">
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                            <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={(val) => navigate(`/dashboard/courses/${val}`)} monet={monet} />
                        </div>
                        <h1 className={`text-2xl font-black tracking-tight pl-1 ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>
                            {decodedCategoryName.replace(/\s\((Teacher|Learner)'s Content\)/i, '')}
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                        <div className="relative w-full sm:w-64">
                            <MagnifyingGlassIcon className={`w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${monet ? monet.themeText : 'text-slate-400'}`} />
                            {/* ✅ FIX: autoComplete="off" and name attribute to prevent password autofill */}
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
                        <button onClick={() => onAddSubjectClick && onAddSubjectClick(decodedCategoryName)} className={getButtonClass('primary', monet)}><PlusCircleIcon className="w-4 h-4" />New Subject</button>
                    </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#F8F9FA] dark:bg-[#151517]">
                    {loading || (!courses && filteredCourses.length === 0) ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredCourses.map((course) => {
                                const { icon: Icon, styleClass } = getSubjectStyling(course.title, monet);
                                const unitCount = course.unitCount || 0;
                                return (
                                    <Link key={course.id} to={course.id} className={`${elevatedCardBase}`}>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start">
                                                <div className={`${elevatedIconBox} ${styleClass}`}>
                                                    <Icon className="w-7 h-7" />
                                                </div>
                                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-4 sm:group-hover:translate-x-0">
                                                    <button onClick={(e) => {e.preventDefault(); props.handleOpenEditSubject(course)}} className={getButtonClass('icon', monet)} title="Edit"><PencilSquareIcon className="w-4 h-4"/></button> 
                                                    <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('subject', course.id, course.title)}} className={getButtonClass('destructive', monet)} title="Delete"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <h2 className={`text-lg font-bold mb-2 leading-tight tracking-tight text-slate-900 dark:text-white`}>{course.title}</h2>
                                                
                                                {/* ✅ Privacy Badge */}
                                                {course.isSchoolSpecific && (
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${monet ? monet.badge : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#2c2c2e] dark:text-slate-300 dark:border-[#3a3a3c]'}`}>
                                                        <LockClosedIcon className="w-3 h-3" />
                                                        {course.schoolId === 'srcs_main' ? 'SRCS Only' : 'School Only'}
                                                    </div>
                                                )}

                                                <div className="flex items-center">
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-none ${monet ? monet.badge : 'bg-[#F2F4F7] text-slate-600 dark:bg-[#2c2c2e] dark:text-slate-300'}`}>
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

// --- LEVEL 1: CATEGORY LIST VIEW (MEMOIZED) ---
const CategoryList = memo((props) => {
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject, loading, userProfile } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();
    
    const { activeOverlay } = useTheme();
    const monet = getMonetStyles(activeOverlay);

    const containerClasses = `bg-white dark:bg-[#1c1c1e] border border-slate-100 dark:border-[#2c2c2e] rounded-[32px] w-full max-w-7xl mx-auto h-full flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-black/20 overflow-hidden`;

    const headerClasses = `flex-none flex flex-col sm:flex-row justify-between items-end gap-6 p-8 border-b border-transparent bg-white dark:bg-[#1c1c1e]`;

    useEffect(() => {
        setActiveSubject(null);
        handleCategoryClick(null);
    }, [setActiveSubject, handleCategoryClick]);

    const isLearner = contentGroup.toLowerCase() === 'learner';
    const title = isLearner ? "Learner's Space" : "Teacher's Space";
    const subtitle = isLearner ? "Access your curated learning materials" : "Manage your curriculum and resources";
    
    // ✅ STRICT SCHOOL FILTERING
    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const userSchoolId = userProfile?.schoolId || 'srcs_main';

        const visibleCoursesSet = new Set();
        if (courses) {
            courses.forEach(c => {
                const isVisible = c.schoolId === 'global' || !c.schoolId || c.schoolId === userSchoolId;
                if (isVisible && c.category) {
                    visibleCoursesSet.add(c.category);
                }
            });
        }

        const filtered = courseCategories.filter(cat => {
            const lowerName = cat.name.toLowerCase();
            const matchesGroup = isLearner ? !lowerName.includes("(teacher's content)") : lowerName.includes("teacher's content");
            const hasVisibleContent = visibleCoursesSet.has(cat.name);
            return matchesGroup && hasVisibleContent;
        });
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner, courses, userProfile]);

    const handleSwitchGroup = (newGroup) => {
        navigate(`/dashboard/courses/${newGroup}`);
    };

    return (
        <div className={commonContainerClasses}>
            <div className={containerClasses}>
                <div className={headerClasses}>
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => navigate('/dashboard/courses')} className={`${getButtonClass('icon', monet)} !p-1.5`} title="Back to Selection">
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                            </button>
                            <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} monet={monet} />
                        </div>
                        
                        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight leading-tight pl-1 ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>{title}</h1>
                        <p className={`text-sm mt-1 font-bold pl-1 ${monet ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{subtitle}</p>
                    </div>
                    <button onClick={() => setCreateCategoryModalOpen(true)} className={`${getButtonClass('primary', monet)} w-full sm:w-auto`}><PlusCircleIcon className="w-4 h-4" />New Category</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#F8F9FA] dark:bg-[#151517]">
                    {loading || (!courseCategories && categoriesToShow.length === 0) ? (
                        <SkeletonGrid />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categoriesToShow.map((cat) => {
                                const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0; 
                                const { icon: Icon, styleClass } = getSubjectStyling(cat.name, monet);
                                const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, '');
                                
                                return (
                                    <Link key={cat.id} to={encodeURIComponent(cat.name)} className={`${elevatedCardBase}`}>
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`${elevatedIconBox} ${styleClass}`}>
                                                    <Icon className="w-7 h-7" />
                                                </div>
                                                <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-x-4 sm:group-hover:translate-x-0">
                                                    <button onClick={(e) => {e.preventDefault(); handleEditCategory(cat)}} className={getButtonClass('icon', monet)}><PencilSquareIcon className="w-4 h-4"/></button> 
                                                    <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name)}} className={getButtonClass('destructive', monet)}><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="mt-auto">
                                                <h2 className={`text-xl font-bold mb-2 tracking-tight text-slate-900 dark:text-white`}>{cleanName}</h2>
                                                
                                                {/* ✅ Privacy Badge (One UI Style) */}
                                                {cat.isSchoolSpecific && (
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${monet ? monet.badge : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-[#2c2c2e] dark:text-slate-300 dark:border-[#3a3a3c]'}`}>
                                                        <LockClosedIcon className="w-3.5 h-3.5" />
                                                        Private
                                                    </div>
                                                )}

                                                <div className={`flex items-center gap-2 text-sm font-bold ${monet ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
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

    return (
        <div className={commonContainerClasses}>
            <div className="relative z-10 flex items-center justify-center h-full">
                <div className="w-full max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                         <h1 className={`text-3xl sm:text-4xl font-black tracking-tight mb-3 ${monet ? monet.themeText : 'text-slate-900 dark:text-white'}`}>Who is learning today?</h1>
                         <p className={`text-lg font-bold ${monet ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>Select your portal to access content.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
                        {/* Learner Card */}
                        <Link to="learner" className={`${elevatedCardBase} h-72 flex flex-col justify-center items-center text-center`}>
                            <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mb-8 bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400`}>
                                <LearnerIcon className={`w-10 h-10`} />
                            </div>
                            <h2 className={`text-2xl font-black mb-3 tracking-tight text-slate-900 dark:text-white`}>Learner</h2>
                            <p className={`text-sm max-w-sm mx-auto mb-8 font-bold text-slate-500 dark:text-slate-400`}>
                                Access student-facing materials, assignments, and public resources.
                            </p>
                            <div className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-sky-600 dark:text-sky-400`}>
                                Enter Portal <span>→</span>
                            </div>
                        </Link>

                        {/* Teacher Card */}
                        <Link to="teacher" className={`${elevatedCardBase} h-72 flex flex-col justify-center items-center text-center`}>
                            <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mb-8 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400`}>
                                <TeacherIcon className={`w-10 h-10`} />
                            </div>
                            <h2 className={`text-2xl font-black mb-3 tracking-tight text-slate-900 dark:text-white`}>Teacher</h2>
                            <p className={`text-sm max-w-sm mx-auto mb-8 font-bold text-slate-500 dark:text-slate-400`}>
                                Manage curriculum, create engaging units, and organize resources.
                            </p>
                            <div className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-emerald-600 dark:text-emerald-400`}>
                                Manage Content <span>→</span>
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