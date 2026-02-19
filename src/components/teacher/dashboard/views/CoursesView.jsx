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

// --- MATERIAL YOU / ANDROID 14 DESIGN TOKENS ---
const MATERIAL_STYLES = {
    // Scaffold: TRANSPARENT GLASS (60% Opacity)
    bgScaffold: "bg-[#FDFCF4]/60 dark:bg-[#121212]/60 backdrop-blur-[60px] rounded-[32px] m-0 sm:m-4 border border-white/20 dark:border-white/5 shadow-2xl overflow-hidden", 
    
    // Surfaces
    bgSurface: "bg-[#F3F4EB]/80 dark:bg-[#1E1E1E]/80 backdrop-blur-md",
    bgSurfaceVariant: "bg-[#E2E2D9]/80 dark:bg-[#444746]/80 backdrop-blur-md",
    
    // Navigation Pill
    navPill: "bg-[#E2E2D9]/40 dark:bg-[#444746]/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm",

    // Typography
    textOnSurface: "text-[#1B1C17] dark:text-[#E3E2E6]",
    textVariant: "text-[#444746] dark:text-[#C4C7C5]",
    
    // Buttons (UPDATED: SLIMMER PROFILE)
    btnFilled: "flex items-center justify-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md",
    btnTonal: "flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 active:scale-95 bg-[#C3E7DD] dark:bg-[#334B4F] text-[#002022] dark:text-[#CCE8E0] hover:brightness-95",
    btnIcon: "p-3 rounded-full hover:bg-[#1B1C17]/10 dark:hover:bg-[#E3E2E6]/10 active:scale-90 transition-all text-[#444746] dark:text-[#C4C7C5]",
    
    // Inputs
    searchBar: "w-full pl-12 pr-4 py-3 rounded-full bg-[#E2E2D9]/50 dark:bg-[#444746]/50 text-[#1B1C17] dark:text-[#E3E2E6] placeholder-[#444746] focus:outline-none focus:ring-2 focus:ring-[#006A60]/50 transition-all backdrop-blur-md"
};

// --- CSS INJECTION ---
const GLOBAL_CSS = `
  .material-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .material-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .material-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 10px; }
  .dark .material-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); }
  
  .animate-enter { animation: enter 0.4s cubic-bezier(0.2, 0.0, 0, 1.0); }
  @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

// --- HELPER: School Branding ---
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS Digital', logo: '/logo.png' },
};
const getSchoolLogo = (schoolId) => SCHOOL_BRANDING[schoolId]?.logo || '/logo.png';

// --- COMPONENTS ---

// 1. SKELETON LOADER
const SkeletonGrid = memo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className={`h-48 rounded-[24px] bg-black/5 dark:bg-white/5`}></div>
        ))}
    </div>
));

// 2. SCOPE SWITCHER
const ContentScopeSwitcher = memo(({ activeGroup, onSwitch }) => {
    const isLearner = activeGroup === 'learner';
    return (
        <div className="flex p-1 bg-[#E2E2D9]/60 dark:bg-[#444746]/60 rounded-full border border-black/5 dark:border-white/5 h-12 items-center backdrop-blur-md">
            <button onClick={() => onSwitch('learner')} className={`px-5 h-full rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 ${isLearner ? 'bg-[#006A60] text-white shadow-md' : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5'}`}>
                <LearnerIcon className="w-4 h-4" /> Learner
            </button>
            <button onClick={() => onSwitch('teacher')} className={`px-5 h-full rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-2 ${!isLearner ? 'bg-[#984061] text-white shadow-md' : 'text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5'}`}>
                <TeacherIcon className="w-4 h-4" /> Teacher
            </button>
        </div>
    );
});

// 3. BREADCRUMBS (UPDATED: Clickable Subject Name)
const Breadcrumbs = ({ contentGroup, categoryName, subjectTitle, unitTitle, subjectId }) => (
    <nav className={`${MATERIAL_STYLES.navPill} inline-flex items-center gap-1 max-w-full overflow-x-auto material-scrollbar`}>
        <Link to="/dashboard/courses" className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <HomeIcon className="w-4 h-4 text-[#444746] dark:text-[#C4C7C5]" />
        </Link>
        <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
        
        <Link to={`/dashboard/courses/${contentGroup}`} className="px-2 py-0.5 rounded-md text-xs font-bold text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5 dark:hover:bg-white/10 capitalize transition-colors whitespace-nowrap">
            {contentGroup}
        </Link>
        <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
        
        <Link to={`/dashboard/courses/${contentGroup}/${categoryName}`} className="px-2 py-0.5 rounded-md text-xs font-bold text-[#444746] dark:text-[#C4C7C5] hover:bg-black/5 dark:hover:bg-white/10 whitespace-nowrap max-w-[100px] truncate transition-colors">
            {decodeURIComponent(categoryName).replace(/\(.*\)/, '')}
        </Link>
        
        {subjectTitle && (
            <>
                <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                {unitTitle && subjectId ? (
                     <Link to={`/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`} className={`px-2 py-0.5 rounded-md text-xs font-bold bg-[#C3E7DD] dark:bg-[#334B4F] text-[#002022] dark:text-[#CCE8E0] hover:brightness-95 whitespace-nowrap max-w-[120px] truncate`}>
                         {subjectTitle}
                     </Link>
                ) : (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${!unitTitle ? 'bg-[#C3E7DD] dark:bg-[#334B4F] text-[#002022] dark:text-[#CCE8E0]' : 'text-[#444746] dark:text-[#C4C7C5]'} whitespace-nowrap max-w-[120px] truncate`}>
                        {subjectTitle}
                    </span>
                )}
            </>
        )}
        
        {unitTitle && (
            <>
                <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#FFD8E4] dark:bg-[#633B48] text-[#31111D] dark:text-[#FFD8E4] whitespace-nowrap max-w-[120px] truncate">
                    {unitTitle}
                </span>
            </>
        )}
    </nav>
);

// --- LEVEL 3: SUBJECT DETAIL (Clean View) ---
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
    
    // State
    const [units, setUnits] = useState([]);
    const [allLessonsForSubject, setAllLessonsForSubject] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(true);
    
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [showLessonPicker, setShowLessonPicker] = useState(false);
    const [activeUnitForPicker, setActiveUnitForPicker] = useState(null);

    const activeSubject = useMemo(() => courses?.find(c => c.id === subjectId), [courses, subjectId]);
    const prevActiveSubjectIdRef = useRef();

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
            {/* Toolbar */}
            <header className="flex-none px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-20 border-b border-black/5 dark:border-white/5">
                <div className="flex flex-col gap-2 w-full">
                    {/* BREADCRUMBS ONLY */}
                    <Breadcrumbs 
                        contentGroup={contentGroup} 
                        categoryName={categoryName} 
                        subjectTitle={activeSubject.title}
                        unitTitle={activeUnit?.title}
                        subjectId={subjectId} // PASSED ID FOR CLICKABLE LINK
                    />
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    {!activeUnit && (
                        <div className="hidden md:flex items-center bg-[#E2E2D9] dark:bg-[#444746] rounded-full px-1 py-1 mr-2">
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[#444746] dark:text-[#C4C7C5]" title="Edit"><PencilSquareIcon className="w-5 h-5"/></button>
                            <button onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[#444746] dark:text-[#C4C7C5]" title="Delete"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    )}
                    
                    {!activeUnit ? (
                        <button onClick={() => setAddUnitModalOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-[#006A60] text-white hover:bg-[#005048]`}>
                             <PlusCircleIcon className="w-5 h-5" />
                             <span className="hidden sm:inline">Add Unit</span>
                        </button>
                    ) : (
                        <button onClick={() => setIsAiHubOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-[#D0BCFF] dark:bg-[#4F378B] text-[#381E72] dark:text-[#EADDFF] hover:brightness-95`}>
                            <SparklesIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">AI Tools</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto material-scrollbar p-6">
                <div className="max-w-6xl mx-auto">
                     <UnitAccordion
                        subject={activeSubject}
                        onInitiateDelete={handleInitiateDelete}
                        userProfile={userProfile}
                        isAiGenerating={isAiGenerating}
                        setIsAiGenerating={setIsAiGenerating}
                        activeUnit={activeUnit}
                        onSetActiveUnit={(u) => navigate(u ? `/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}/${u.id}` : `/dashboard/courses/${contentGroup}/${categoryName}/${subjectId}`)}
                        selectedLessons={selectedLessons}
                        onLessonSelect={(id) => setSelectedLessons(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; })}
                        handleGenerateQuizForLesson={handleGenerateQuizForLesson}
                        renderGeneratePptButton={(unit) => (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedLessons(new Set()); setActiveUnitForPicker(unit); setShowLessonPicker(true); }} 
                                className={`px-4 py-2 rounded-full text-xs font-bold gap-2 flex items-center bg-[#E8DEF8] dark:bg-[#4A4458] text-[#1D192B] dark:text-[#E8DEF8] hover:shadow-md transition-all`}
                                disabled={isAiGenerating}
                            >
                                {isAiGenerating ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <PresentationChartBarIcon className="w-3 h-3" />}
                                Slides
                            </button>
                        )}
                    />
                </div>
            </main>

            {/* Slides Picker */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowLessonPicker(false)} />
                    <div className={`relative w-full sm:max-w-2xl ${MATERIAL_STYLES.bgSurface} sm:rounded-[28px] rounded-t-[28px] shadow-2xl flex flex-col max-h-[85vh] animate-enter overflow-hidden`}>
                         <div className="w-full flex justify-center pt-4 pb-2 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-gray-400/40"></div></div>
                        <div className="flex-none px-6 py-4 flex items-center justify-between border-b border-black/5 dark:border-white/5">
                            <div>
                                <h2 className={`text-xl font-normal ${MATERIAL_STYLES.textOnSurface}`}>Create Slides</h2>
                                <p className={`text-sm ${MATERIAL_STYLES.textVariant}`}>From: {activeUnitForPicker.title}</p>
                            </div>
                            <button onClick={() => setShowLessonPicker(false)} className={MATERIAL_STYLES.btnIcon}>
                                <XMarkIcon className="w-6 h-6"/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 material-scrollbar">
                             {allLessonsForSubject.filter(l => l.unitId === activeUnitForPicker.id).length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
                                    <BookOpenIcon className="w-12 h-12 mb-3" />
                                    <p className="font-medium">No lessons available</p>
                                </div>
                             ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {allLessonsForSubject.filter(l => l.unitId === activeUnitForPicker.id).map(lesson => {
                                        const isSelected = selectedLessons.has(lesson.id);
                                        return (
                                            <div key={lesson.id} onClick={() => setSelectedLessons(prev => { const n = new Set(prev); n.has(lesson.id)?n.delete(lesson.id):n.add(lesson.id); return n; })} 
                                                 className={`flex items-center justify-between p-4 rounded-[16px] cursor-pointer transition-all duration-200 border ${isSelected ? 'bg-[#C3E7DD] dark:bg-[#334B4F] border-transparent' : 'bg-[#E2E2D9]/30 dark:bg-[#444746]/30 border-transparent hover:bg-[#E2E2D9]'}`}>
                                                <span className={`font-medium text-sm ${isSelected ? 'text-[#002022] dark:text-[#CCE8E0]' : MATERIAL_STYLES.textOnSurface}`}>{lesson.title}</span>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#006A60] text-white' : 'border-2 border-gray-400'}`}>
                                                    {isSelected && <CheckCircleIcon className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                             )}
                        </div>
                        <div className={`flex-none p-4 flex justify-end gap-3 ${MATERIAL_STYLES.bgSurfaceVariant}`}>
                            <button onClick={() => setShowLessonPicker(false)} className="px-6 py-2 rounded-full text-sm font-bold text-[#006A60] hover:bg-[#006A60]/10">Cancel</button>
                            <button onClick={() => { setShowLessonPicker(false); handleGeneratePresentationClick(); }} disabled={selectedLessons.size === 0} className={`${MATERIAL_STYLES.btnFilled} bg-[#006A60] text-white`}>
                                <SparklesIcon className="w-5 h-5" /> Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

// --- LEVEL 2: SUBJECT LIST (Updated Icons & Colors & RESTORED BUTTONS) ---
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
        ).sort((a, b) => a.title.localeCompare(b.title));
    }, [courses, decodedCategoryName, searchTerm, userProfile?.schoolId]);

    // Updated Visual Logic
    const getMaterialTheme = (title) => {
        const t = title.toLowerCase();
        
        // English & Filipino: Pencil / Writing
        if (t.includes('english') || t.includes('filipino')) return { 
            bg: "bg-[#FFD8E4] dark:bg-[#633B48]", 
            onBg: "text-[#31111D] dark:text-[#FFD8E4]", 
            icon: PencilIcon, // or BookOpenIcon
            surface: "bg-[#FFF8F8] dark:bg-[#201A1B]"
        };

        // Math: Calculator
        if (t.includes('math')) return { 
            bg: "bg-[#FFD8E4] dark:bg-[#633B48]", // Red/Pink tone
            onBg: "text-[#31111D] dark:text-[#FFD8E4]", 
            icon: CalculatorIcon,
            surface: "bg-[#FFF8F8] dark:bg-[#201A1B]"
        };

        // Science: Lab Equipment
        if (t.includes('science')) return { 
            bg: "bg-[#C3E7DD] dark:bg-[#334B4F]", // Green/Teal tone
            onBg: "text-[#002022] dark:text-[#CCE8E0]", 
            icon: BeakerIcon,
            surface: "bg-[#F4FBF9] dark:bg-[#191C1C]"
        };

        // MAPEH: Music/Arts
        if (t.includes('mapeh') || t.includes('music') || t.includes('art') || t.includes('pe')) return { 
            bg: "bg-[#E8DEF8] dark:bg-[#4A4458]", // Purple tone
            onBg: "text-[#1D192B] dark:text-[#E8DEF8]", 
            icon: MusicalNoteIcon,
            surface: "bg-[#FFFBFE] dark:bg-[#1C1B1F]"
        };

        // CSL / Values / Religious Ed: Good Values (Heart)
        if (t.includes('csl') || t.includes('religious') || t.includes('values') || t.includes('esp')) return { 
            bg: "bg-[#F2DDA5] dark:bg-[#58440C]", // Yellow/Gold tone
            onBg: "text-[#261900] dark:text-[#F2DDA5]", 
            icon: HeartIcon,
            surface: "bg-[#FFFDF6] dark:bg-[#1E1C16]"
        };

        // Araling Panlipunan: History/Geography
        if (t.includes('araling') || t.includes('history') || t.includes('social') || t.includes('ap')) return { 
            bg: "bg-[#D0E4FF] dark:bg-[#284777]", // Blue tone
            onBg: "text-[#001D36] dark:text-[#D0E4FF]", 
            icon: GlobeAsiaAustraliaIcon, // Globe
            surface: "bg-[#FDFBFF] dark:bg-[#1A1C1E]"
        };

        // Tech / CS
        if (t.includes('tech') || t.includes('computer')) return { 
            bg: "bg-[#E0E0FF] dark:bg-[#46464F]", 
            onBg: "text-[#1B1B1F] dark:text-[#E0E0FF]", 
            icon: ComputerDesktopIcon,
            surface: "bg-[#FDFBFF] dark:bg-[#1A1A1E]"
        };

        // Default
        return { 
            bg: "bg-[#E2E2D9] dark:bg-[#444746]", 
            onBg: "text-[#1B1C17] dark:text-[#E3E2E6]", 
            icon: BookOpenIcon,
            surface: "bg-[#F3F4EB] dark:bg-[#1E1E1E]"
        };
    };

    return (
        <div className={`flex flex-col h-full min-h-[calc(100vh-6rem)] ${MATERIAL_STYLES.bgScaffold}`}>
            {/* Toolbar */}
            <header className="flex-none px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20 border-b border-black/5 dark:border-white/5">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <Breadcrumbs contentGroup={contentGroup} categoryName={categoryName} />
                    <h1 className={`text-3xl font-normal ${MATERIAL_STYLES.textOnSurface} tracking-tight ml-1`}>
                        {decodedCategoryName.replace(/\(.*\)/, '')}
                    </h1>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div className="relative flex-1 md:w-64">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444746]" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={MATERIAL_STYLES.searchBar} />
                    </div>
                    <button onClick={() => onAddSubjectClick && onAddSubjectClick(decodedCategoryName)} className={`${MATERIAL_STYLES.btnFilled} bg-[#006A60] text-white hover:bg-[#005048] !px-4 !py-3`}>
                        <PlusCircleIcon className="w-5 h-5" />
                        <span className="hidden md:inline text-sm">New</span>
                    </button>
                </div>
            </header>

            {/* CARD GRID */}
            <div className="flex-1 overflow-y-auto material-scrollbar p-6">
                {loading ? <SkeletonGrid /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCourses.map((course) => {
                            const { bg, onBg, icon: Icon, surface } = getMaterialTheme(course.title);
                            return (
                                <Link 
                                    key={course.id} 
                                    to={course.id} 
                                    className={`group relative flex flex-col justify-between p-4 h-56 rounded-[24px] overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${surface} border border-transparent hover:border-black/5`}
                                >
                                    {/* 1. Header Pill */}
                                    <div className={`w-full p-4 rounded-[20px] ${bg} ${onBg} flex items-center justify-between mb-4`}>
                                        <div className="p-2 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-md shadow-sm">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                    </div>

                                    {/* 2. Body Title */}
                                    <div className="px-2 mb-auto">
                                        <h3 className={`text-xl font-normal leading-tight ${MATERIAL_STYLES.textOnSurface} line-clamp-2`}>
                                            {course.title}
                                        </h3>
                                    </div>

                                    {/* 3. Action Chips (RESTORED EDIT/DELETE) */}
                                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/5 dark:border-white/5">
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${bg} ${onBg} bg-opacity-30 flex items-center gap-1`}>
                                            Open <ArrowUturnLeftIcon className="w-3 h-3 rotate-180" />
                                        </div>

                                        <div className="flex items-center gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEditSubject(course); }} 
                                                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#444746] dark:text-[#C4C7C5] transition-colors"
                                                title="Edit Subject"
                                            >
                                                <PencilSquareIcon className="w-5 h-5"/>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleInitiateDelete('subject', course.id, course.title); }} 
                                                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-[#444746] hover:text-red-600 dark:text-[#C4C7C5] transition-colors"
                                                title="Delete Subject"
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Ripple Overlay */}
                                    <div className="absolute inset-0 rounded-[24px] pointer-events-none group-active:bg-black/5 transition-colors" />
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
});

// --- LEVEL 1: CATEGORY LIST (Material Chips) ---
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
             {/* Toolbar */}
             <header className="flex-none px-6 py-4 flex items-center justify-between gap-4 z-20 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate("/dashboard/courses")} className={MATERIAL_STYLES.btnIcon}>
                        <ArrowLeftIcon className="w-6 h-6"/>
                    </button>
                    <h1 className={`text-2xl font-normal ${MATERIAL_STYLES.textOnSurface}`}>
                        {isLearner ? "Learner Space" : "Teacher Space"}
                    </h1>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                        <ContentScopeSwitcher activeGroup={contentGroup} onSwitch={handleSwitchGroup} />
                    </div>
                    <button onClick={() => setCreateCategoryModalOpen(true)} className={`${MATERIAL_STYLES.btnFilled} bg-[#006A60] text-white !px-4`}>
                        <PlusCircleIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto material-scrollbar p-6">
                {loading ? <SkeletonGrid /> : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {categoriesToShow.map(cat => {
                            const courseCount = courses ? courses.filter(c => c.category === cat.name).length : 0;
                            const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, "");
                            
                            return (
                                <Link 
                                    key={cat.id} 
                                    to={encodeURIComponent(cat.name)}
                                    className={`
                                        group relative flex flex-col items-center justify-center text-center p-6 min-h-[160px] h-auto
                                        rounded-[24px] bg-[#F3F4EB] dark:bg-[#1E1E1E]
                                        border border-transparent hover:border-[#747775]
                                        transition-all duration-200 hover:shadow-md
                                    `}
                                >
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                        <button onClick={(e) => {e.preventDefault(); handleEditCategory(cat)}} className="p-1.5 rounded-full bg-[#E2E2D9] dark:bg-[#444746] hover:brightness-95"><PencilSquareIcon className="w-3.5 h-3.5"/></button>
                                        <button onClick={(e) => {e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name)}} className="p-1.5 rounded-full bg-[#E2E2D9] dark:bg-[#444746] hover:brightness-95 text-red-600"><TrashIcon className="w-3.5 h-3.5"/></button>
                                    </div>

                                    <div className={`w-14 h-14 mb-3 rounded-[16px] flex items-center justify-center ${isLearner ? 'bg-[#C3E7DD] dark:bg-[#334B4F] text-[#002022] dark:text-[#CCE8E0]' : 'bg-[#FFD8E4] dark:bg-[#633B48] text-[#31111D] dark:text-[#FFD8E4]'}`}>
                                        <FolderSolid className="w-7 h-7" />
                                    </div>
                                    
                                    <span className={`text-sm font-medium ${MATERIAL_STYLES.textOnSurface} w-full break-words leading-tight`}>
                                        {cleanName}
                                    </span>
                                    
                                    <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[10px] font-bold opacity-60">
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

// --- LEVEL 0: CONTENT GROUP SELECTOR ---
const ContentGroupSelector = memo((props) => {
    const { userProfile } = props;
    useEffect(() => { props.setActiveSubject(null); props.handleBackToCategoryList(); }, []);
    
    const schoolLogoUrl = userProfile?.schoolId ? getSchoolLogo(userProfile.schoolId) : '/logo.png';

    const SelectionCard = ({ to, title, subtitle, theme, icon: Icon }) => (
        <Link to={to} className={`group relative overflow-hidden rounded-[32px] p-8 h-80 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${theme.bg} ${theme.text}`}>
            {/* Soft Blob */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/20 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="relative z-10">
                <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 bg-white/40 backdrop-blur-md`}>
                    <Icon className="w-8 h-8" />
                </div>
                <h2 className="text-4xl font-normal tracking-tight mb-2 opacity-90">{title}</h2>
                <p className="font-medium opacity-70 max-w-sm leading-relaxed">{subtitle}</p>
            </div>

            <div className="relative z-10 flex items-center gap-2">
                <div className="px-5 py-2.5 rounded-full bg-black/10 font-bold text-sm group-hover:bg-black/20 transition-colors flex items-center gap-2">
                    Enter Portal <ArrowPathIcon className="w-4 h-4" />
                </div>
            </div>
        </Link>
    );

    return (
        <div className={`min-h-[85vh] flex flex-col items-center justify-center p-6 ${MATERIAL_STYLES.bgScaffold}`}>
            <div className="mb-12 text-center animate-enter">
                 <img src={schoolLogoUrl} alt="Logo" className="w-20 h-20 mx-auto mb-6 rounded-[24px] shadow-sm" />
                 <h1 className={`text-3xl font-normal ${MATERIAL_STYLES.textOnSurface} mb-2`}>Welcome Back</h1>
                 <p className={MATERIAL_STYLES.textVariant}>Choose your workspace</p>
            </div>
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter">
                <SelectionCard 
                    to="learner" 
                    title="Learner" 
                    subtitle="Access your assignments and student resources." 
                    theme={{ bg: "bg-[#006A60]", text: "text-white" }}
                    icon={LearnerIcon} 
                />
                <SelectionCard 
                    to="teacher" 
                    title="Teacher" 
                    subtitle="Manage curriculum and grading tools." 
                    theme={{ bg: "bg-[#984061]", text: "text-white" }}
                    icon={TeacherIcon} 
                />
            </div>
        </div>
    );
});

// --- MAIN ROUTER ---
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