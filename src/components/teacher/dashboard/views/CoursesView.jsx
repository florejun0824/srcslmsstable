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
        // ... (Other cases can follow similar pattern, using default for brevity if needed)
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
    return base; // Fallback
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

    // Always use Monet if available, or fallback to a generic neon style
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
                <Menu.Button
                    className={`
                        group relative flex items-center gap-3 pl-1 pr-4 py-1 rounded-full 
                        text-xs font-bold transition-all outline-none shadow-lg backdrop-blur-xl
                        bg-black/20 hover:bg-black/30 border border-white/10
                    `}
                >
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center 
                        ${isLearner ? 'bg-sky-500 text-white' : 'bg-emerald-500 text-white'}
                        shadow-[0_0_15px_-3px_currentColor]
                    `}>
                        {isLearner ? <LearnerIcon className="w-4 h-4"/> : <TeacherIcon className="w-4 h-4"/>}
                    </div>
                    <span className="text-slate-200 group-hover:text-white transition-colors">
                        {isLearner ? "Learner Space" : "Teacher Space"}
                    </span>
                    <ArrowsUpDownIcon className="w-3 h-3 text-slate-400 group-hover:text-white" />
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
                    <Menu.Items className="absolute left-0 mt-3 w-60 origin-top-left rounded-[2rem] bg-[#0f1012]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] p-2 z-[60] focus:outline-none">
                        <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Select Portal
                        </div>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => onSwitch('learner')}
                                    className={`
                                        flex w-full items-center gap-3 rounded-[1.5rem] px-4 py-3 text-xs font-bold transition-all mb-1
                                        ${active ? 'bg-white/10 text-white' : 'text-slate-400'}
                                    `}
                                >
                                    <div className="p-2 rounded-full bg-sky-500/20 text-sky-400">
                                        <LearnerIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-white">Learner's Space</div>
                                        <div className="text-[10px] font-normal opacity-60">Student View</div>
                                    </div>
                                    {activeGroup === 'learner' && <div className="ml-auto w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />}
                                </button>
                            )}
                        </Menu.Item>
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => onSwitch('teacher')}
                                    className={`
                                        flex w-full items-center gap-3 rounded-[1.5rem] px-4 py-3 text-xs font-bold transition-all
                                        ${active ? 'bg-white/10 text-white' : 'text-slate-400'}
                                    `}
                                >
                                    <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                                        <TeacherIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-white">Teacher's Space</div>
                                        <div className="text-[10px] font-normal opacity-60">Admin View</div>
                                    </div>
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

            {/* --- GLASS LESSON PICKER MODAL --- */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[5000] p-4 transition-all duration-300">
                    <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in-95 bg-[#0f1012]/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)]">
                        
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-white">Generate Presentation</h2>
                                <p className="text-xs font-bold mt-1 text-slate-400">
                                    Select lessons from <span className="text-white">"{activeUnitForPicker.title}"</span>
                                </p>
                            </div>
                            <button onClick={() => setShowLessonPicker(false)} className={`${getButtonClass('icon', monet)} bg-white/5`}>
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List */}
                        <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2 bg-transparent ${scrollbarClass}`}>
                            {(() => {
                                const lessonsInUnit = allLessonsForSubject
                                    .filter((lesson) => lesson.unitId === activeUnitForPicker.id)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0));
            
                                if (lessonsInUnit.length === 0) return <div className="p-8 text-center text-slate-500">No content found.</div>;

                                return lessonsInUnit.map((lesson) => {
                                    const isSelected = selectedLessons.has(lesson.id);
                                    return (
                                        <label 
                                            key={lesson.id} 
                                            className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all duration-200 ${
                                                isSelected 
                                                ? `bg-indigo-500/20 border-indigo-500/40` 
                                                : `bg-white/5 border-transparent hover:bg-white/10`
                                            }`}
                                        >
                                            <div className="min-w-0 pr-4">
                                                <div className={`font-bold text-sm ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                    {lesson.title}
                                                </div>
                                            </div>
                                            <div className="relative flex items-center justify-center w-5 h-5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => handleLessonSelect(lesson.id)} 
                                                    className="peer appearance-none w-5 h-5 rounded-full border-2 border-slate-600 checked:bg-indigo-500 checked:border-indigo-500 transition-all cursor-pointer" 
                                                />
                                                <CheckCircleIcon className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-all" />
                                            </div>
                                        </label>
                                    );
                                });
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-6 border-t border-white/5 flex justify-between items-center bg-white/5">
                            <span className="text-xs font-bold text-slate-400 tracking-wider">
                                {selectedLessons.size} SELECTED
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
                                    {isAiGenerating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                                    <span>Create</span>
                                </button>
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

// --- LEVEL 1: CATEGORY LIST VIEW (TRANSPARENT GLASS) ---
const CategoryList = memo((props) => {
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject, loading, userProfile } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();
    const { activeOverlay } = useTheme();
    const monet = useMemo(() => getMonetStyles(activeOverlay), [activeOverlay]);

    useEffect(() => {
        setActiveSubject(null);
        handleCategoryClick(null);
    }, [setActiveSubject, handleCategoryClick]);

    const isLearner = contentGroup.toLowerCase() === 'learner';
    const categoriesToShow = useMemo(() => {
        if (!courseCategories) return [];
        const userSchoolId = userProfile?.schoolId || 'srcs_main';
        const visibleCoursesSet = new Set();
        if (courses) {
            courses.forEach(c => {
                if (c.schoolId === 'global' || !c.schoolId || c.schoolId === userSchoolId) visibleCoursesSet.add(c.category);
            });
        }
        return courseCategories.filter(cat => {
            const lowerName = cat.name.toLowerCase();
            return (isLearner ? !lowerName.includes("teacher") : lowerName.includes("teacher")) && visibleCoursesSet.has(cat.name);
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [courseCategories, isLearner, courses, userProfile?.schoolId]);

    const handleSwitchGroup = useCallback((newGroup) => {
        navigate(`/dashboard/courses/${newGroup}`);
    }, [navigate]);

    return (
        <div className={commonContainerClasses}>
             <div className="h-full flex flex-col">
                
                {/* --- FLOATING HEADER --- */}
                <div className="relative z-30 flex-none flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 mb-6 rounded-[2rem] bg-white/60 dark:bg-[#121212]/60 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-sm">
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => navigate('/dashboard/courses')} 
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10 text-slate-400 hover:text-white"
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                        </button>
                        <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} monet={monet} />
                        
                        <div className="hidden md:block w-px h-8 bg-white/10"></div>
                        <div className="hidden md:flex flex-col justify-center">
                            <h1 className="text-lg font-black tracking-tight text-slate-800 dark:text-white leading-none mb-0.5">
                                {isLearner ? "Learner's Space" : "Teacher's Space"}
                            </h1>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {isLearner ? "Your learning journey" : "Curriculum Management"}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setCreateCategoryModalOpen(true)} 
                        className={`${getButtonClass('primary', monet)} shadow-lg w-full md:w-auto`}
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        <span>New Category</span>
                    </button>
                </div>
                
                {/* --- CONTENT GRID --- */}
                <div className="relative z-10 flex-1 overflow-y-auto pb-20 mac-scrollbar">
                    {loading ? <SkeletonGrid /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {categoriesToShow.map((cat) => {
                                const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0; 
                                const { icon: Icon, styleClass } = getSubjectStyling(cat.name, monet);
                                const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, '');

                                return (
                                    <Link 
                                        key={cat.id} 
                                        to={encodeURIComponent(cat.name)} 
                                        className="neural-card group relative h-64 flex flex-col p-6 rounded-[2.5rem] bg-white/80 dark:bg-[#1C1C1E]/80 border border-white/20 dark:border-white/5 backdrop-blur-md overflow-hidden"
                                    >
                                        {/* Background Watermark */}
                                        <div className="absolute -bottom-8 -right-8 w-40 h-40 opacity-[0.03] dark:opacity-[0.05] transform rotate-[-15deg] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-0">
                                            <Icon className="w-full h-full text-current" />
                                        </div>

                                        <div className="relative z-10 flex justify-between items-start">
                                            <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center shadow-sm backdrop-blur-md ${styleClass}`}>
                                                <Icon className="w-8 h-8" />
                                            </div>
                                            
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0">
                                                <button onClick={(e) => {e.preventDefault(); handleEditCategory(cat)}} className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"><PencilSquareIcon className="w-4 h-4 text-slate-500 dark:text-slate-300"/></button> 
                                                <button onClick={(e)=>{e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name)}} className="p-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 transition-colors"><TrashIcon className="w-4 h-4 text-red-400"/></button>
                                            </div>
                                        </div>

                                        <div className="relative z-10 mt-auto">
                                            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white mb-2 leading-tight line-clamp-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                                {cleanName}
                                            </h2>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${monet.badge}`}>
                                                    {courseCount} Subjects
                                                </span>
                                                {cat.isSchoolSpecific && <LockClosedIcon className="w-4 h-4 text-slate-400" />}
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

// --- LEVEL 0: CONTENT GROUP SELECTOR (CINEMATIC PORTALS) ---
const ContentGroupSelector = memo((props) => {
    useEffect(() => {
        props.setActiveSubject(null);
        props.handleBackToCategoryList();
    }, []); 

    return (
        <div className="relative h-full flex flex-col justify-center items-center p-4 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                
                {/* LEARNER PORTAL */}
                <Link 
                    to="learner" 
                    className="group relative h-[400px] lg:h-[500px] flex flex-col justify-between overflow-hidden rounded-[3rem] p-10 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-2xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-sky-500/30 rounded-full blur-[100px] opacity-50 group-hover:opacity-100 transition-all duration-700"></div>

                    <div className="relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-sky-500/20 shadow-sm flex items-center justify-center mb-8 text-sky-500 transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <LearnerIcon className="w-10 h-10 stroke-2" />
                        </div>
                        <h2 className="text-5xl lg:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-4">
                            Learner<span className="text-sky-500">.</span>
                        </h2>
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-300 max-w-xs">
                            Access your lessons, track progress, and view assignments.
                        </p>
                    </div>
                    
                    <div className="relative z-10 mt-auto flex items-center gap-4">
                        <span className="h-12 px-8 flex items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm tracking-widest uppercase shadow-lg group-hover:bg-sky-500 group-hover:text-white transition-colors">
                            Enter
                        </span>
                        <div className="w-12 h-12 rounded-full border-2 border-slate-900/10 dark:border-white/10 flex items-center justify-center group-hover:border-sky-500 group-hover:text-sky-500 transition-colors">
                            <ArrowPathIcon className="w-5 h-5 -rotate-45" />
                        </div>
                    </div>
                </Link>

                {/* TEACHER PORTAL */}
                <Link 
                    to="teacher" 
                    className="group relative h-[400px] lg:h-[500px] flex flex-col justify-between overflow-hidden rounded-[3rem] p-10 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border border-white/20 bg-white/40 dark:bg-black/35 backdrop-blur-2xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/30 rounded-full blur-[100px] opacity-50 group-hover:opacity-100 transition-all duration-700"></div>

                    <div className="relative z-10">
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-emerald-500/20 shadow-sm flex items-center justify-center mb-8 text-emerald-500 transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                            <TeacherIcon className="w-10 h-10 stroke-2" />
                        </div>
                        <h2 className="text-5xl lg:text-6xl font-black text-slate-800 dark:text-white tracking-tighter mb-4">
                            Teacher<span className="text-emerald-500">.</span>
                        </h2>
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-300 max-w-xs">
                            Manage curriculum, create content, and monitor analytics.
                        </p>
                    </div>
                    
                    <div className="relative z-10 mt-auto flex items-center gap-4">
                        <span className="h-12 px-8 flex items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm tracking-widest uppercase shadow-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            Manage
                        </span>
                        <div className="w-12 h-12 rounded-full border-2 border-slate-900/10 dark:border-white/10 flex items-center justify-center group-hover:border-emerald-500 group-hover:text-emerald-500 transition-colors">
                            <ArrowPathIcon className="w-5 h-5 -rotate-45" />
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