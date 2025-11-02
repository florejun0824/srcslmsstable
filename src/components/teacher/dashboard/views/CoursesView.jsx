// src/components/.../CoursesView.jsx
import React, { useState, useEffect } from 'react';
// --- MODIFICATION START ---
// Import React Router components
import { Routes, Route, useParams, useNavigate, Link } from 'react-router-dom';
// --- MODIFICATION END ---
import { db } from '../../../../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import UnitAccordion from '../../UnitAccordion';
import Spinner from '../../../../components/common/Spinner';
import {
    PencilSquareIcon, TrashIcon, PlusCircleIcon, ArrowUturnLeftIcon, SparklesIcon,
    BookOpenIcon, CalculatorIcon, BeakerIcon, GlobeAltIcon, MusicalNoteIcon, WrenchScrewdriverIcon,
    MagnifyingGlassIcon,
    UsersIcon as LearnerIcon,
    AcademicCapIcon as TeacherIcon,
    PresentationChartBarIcon,
    ShareIcon,
} from '@heroicons/react/24/solid';

// --- MODIFIED STYLE CONSTANTS (Theme-Aware) ---
const commonContainerClasses = "min-h-screen p-4 sm:p-6 bg-neumorphic-base dark:bg-neumorphic-base-dark";
const windowContainerClasses = "bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl p-4 sm:p-8 shadow-neumorphic dark:shadow-neumorphic-dark w-full max-w-7xl mx-auto my-6 sm:my-12 transition-all duration-500";

const neumorphicHoverActiveClasses = "hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark active:shadow-neumorphic-inset dark:active:shadow-neumorphic-inset-dark";
const baseButtonStyles = `font-semibold rounded-xl transition-shadow duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-neumorphic-inset dark:disabled:shadow-neumorphic-inset-dark flex items-center gap-2`;

const primaryButton = `${baseButtonStyles} px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base bg-gradient-to-br from-sky-100 to-blue-200 dark:from-sky-800 dark:to-blue-900 text-blue-700 dark:text-blue-200 shadow-neumorphic dark:shadow-neumorphic-dark ${neumorphicHoverActiveClasses}`;

const secondaryButton = `${baseButtonStyles} px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-700 dark:text-slate-200 shadow-neumorphic dark:shadow-neumorphic-dark ${neumorphicHoverActiveClasses}`;

const iconButton = `${baseButtonStyles} p-2 sm:p-2.5 bg-neumorphic-base dark:bg-neumorphic-base-dark text-slate-600 dark:text-slate-300 shadow-neumorphic dark:shadow-neumorphic-dark ${neumorphicHoverActiveClasses} rounded-full`;

const destructiveIconButton = `${baseButtonStyles} p-2 sm:p-2.5 bg-neumorphic-base dark:bg-neumorphic-base-dark text-red-600 dark:text-red-400 shadow-neumorphic dark:shadow-neumorphic-dark ${neumorphicHoverActiveClasses} rounded-full`;
// --- END MODIFIED STYLE CONSTANTS ---

const getSubjectStyling = (subjectTitle) => {
    const lowerCaseTitle = subjectTitle.toLowerCase();
    let IconComponent = BookOpenIcon;
    // --- MODIFIED: Added dark mode icon colors ---
    let iconColor = 'text-gray-500 dark:text-gray-400';
    let gradient = 'from-white to-slate-100 dark:from-slate-800 dark:to-slate-700'; // Neutral dark gradient
    
    if (lowerCaseTitle.includes('math')) { IconComponent = CalculatorIcon; iconColor = 'text-blue-500 dark:text-blue-400'; gradient = 'from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/50'; }
    else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino')) { IconComponent = BookOpenIcon; iconColor = 'text-teal-500 dark:text-teal-400'; gradient = 'from-white to-teal-50 dark:from-slate-800 dark:to-teal-900/50'; }
    else if (lowerCaseTitle.includes('religious education')) { IconComponent = BookOpenIcon; iconColor = 'text-amber-500 dark:text-amber-400'; gradient = 'from-white to-amber-50 dark:from-slate-800 dark:to-amber-900/50'; }
    else if (lowerCaseTitle.includes('science')) { IconComponent = BeakerIcon; iconColor = 'text-green-500 dark:text-green-400'; gradient = 'from-white to-green-50 dark:from-slate-800 dark:to-green-900/50'; }
    else if (lowerCaseTitle.includes('araling panlipunan')) { IconComponent = GlobeAltIcon; iconColor = 'text-red-500 dark:text-red-400'; gradient = 'from-white to-red-50 dark:from-slate-800 dark:to-red-900/50'; }
    else if (lowerCaseTitle.includes('mapeh')) { IconComponent = MusicalNoteIcon; iconColor = 'text-pink-500 dark:text-pink-400'; gradient = 'from-white to-pink-50 dark:from-slate-800 dark:to-pink-900/50'; }
    else if (lowerCaseTitle.includes('tle')) { IconComponent = WrenchScrewdriverIcon; iconColor = 'text-purple-500 dark:text-purple-400'; gradient = 'from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/50'; }
    return { icon: IconComponent, iconColor, gradient };
};

// --- LEVEL 3: SUBJECT DETAIL VIEW ---
const SubjectDetail = (props) => {
    // ... (All logic, state, and effects are unchanged) ...
    const {
        courses,
        handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating,
        onSetActiveUnit,
        onGeneratePresentationPreview,
        // State sync props
        setActiveSubject,
        handleCategoryClick,
    } = props;

    const { contentGroup, categoryName, subjectId } = useParams();
    const navigate = useNavigate();

    const [units, setUnits] = useState([]);
    const [allLessonsForSubject, setAllLessonsForSubject] = useState([]);
    const [isLoadingUnitsAndLessons, setIsLoadingUnitsAndLessons] = useState(false);
    
    const activeSubject = React.useMemo(() => 
        courses.find(c => c.id === subjectId), 
    [courses, subjectId]);
    
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
                    const unitIds = fetchedUnits.map(u => u.id);
                    const lessonsQuery = query(collection(db, 'lessons'), where('unitId', 'in', unitIds));
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
        }
    }, [activeSubject]);
    
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

    if (!activeSubject) {
        return <Spinner />;
    }

    return (
        <div className={commonContainerClasses}>
            {/* --- MODIFIED: Removed inline gradient from card, using windowContainerClasses --- */}
            <div className={`${windowContainerClasses}`}>
                {/* --- MODIFIED: Made header responsive --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap"> {/* Added flex-wrap */}
                        <button
                            onClick={() => navigate(`/dashboard/courses/${contentGroup}/${categoryName}`)}
                            className={secondaryButton}
                        >
                            <ArrowUturnLeftIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        {/* --- MODIFIED: Added dark mode text --- */}
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                            {activeSubject.title}
                        </h2>
                        <button
                            onClick={() => handleOpenEditSubject(activeSubject)}
                            className={iconButton}
                            title="Edit Subject Name"
                        >
                            <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleInitiateDelete('subject', activeSubject.id, activeSubject.title)}
                            className={destructiveIconButton}
                            title="Delete Subject"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex gap-2 sm:gap-3 flex-wrap"> {/* Added flex-wrap */}
                        <button onClick={() => setShareContentModalOpen(true)} className={secondaryButton}>
                            <ShareIcon className="w-5 h-5" />Send
                        </button>
                        <button onClick={() => setAddUnitModalOpen(true)} className={primaryButton}>
                            <PlusCircleIcon className="w-5 h-5" />Add Unit
                        </button>
                        <button onClick={() => setIsAiHubOpen(true)} className={primaryButton}>
                            <SparklesIcon className="w-5 h-5" />AI Tools
                        </button>
                    </div>
                </div>
                <div>
                    {/* ... (Spinner and UnitAccordion are unchanged) ... */}
                    {isLoadingUnitsAndLessons ? (
                        <div className="flex justify-center items-center py-10">
                            <Spinner />
                            <p className="ml-4 text-slate-500 dark:text-slate-400">Loading content...</p>
                        </div>
                    ) : (
                        <UnitAccordion
                            subject={activeSubject}
                            onInitiateDelete={handleInitiateDelete}
                            userProfile={userProfile}
                            isAiGenerating={isAiGenerating}
                            setIsAiGenerating={setIsAiGenerating}
                            activeUnit={props.activeUnit}
                            onSetActiveUnit={onSetActiveUnit}
                            selectedLessons={selectedLessons}
                            onLessonSelect={handleLessonSelect}
                            units={units}
                            allLessonsForSubject={allLessonsForSubject}
                            handleGenerateQuizForLesson={handleGenerateQuizForLesson}
                            renderGeneratePptButton={(unit) => (
                                <button
                                    onClick={() => {
                                        setSelectedLessons(new Set());
                                        setActiveUnitForPicker(unit);
                                        setShowLessonPicker(true);
                                    }}
                                    className={primaryButton}
                                    disabled={isAiGenerating}
                                >
                                    <PresentationChartBarIcon className="w-5 h-5" />
                                    <span>Generate PPT</span>
                                </button>
                            )}
                        />
                    )}
                </div>
            </div>

            {/* --- MODIFIED: Lesson Picker Modal (Themed) --- */}
            {showLessonPicker && activeUnitForPicker && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-5 p-4">
                    {/* --- MODIFIED: Added dark mode classes --- */}
                    <div className="bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                        
                        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 flex justify-between items-center">
                            <div>
                                {/* --- MODIFIED: Added dark mode classes --- */}
                                <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">Select Lessons</h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    From unit: <span className="font-medium">{activeUnitForPicker.name}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowLessonPicker(false)} className={iconButton}>✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 space-y-3">
                            {allLessonsForSubject
                                .filter((lesson) => lesson.unitId === activeUnitForPicker.id)
                                .sort((a, b) =>
                                    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
                                )
                                .map((lesson) => (
                                    <label
                                        key={lesson.id}
                                        // --- MODIFIED: Added dark mode classes ---
                                        className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl transition-all cursor-pointer bg-neumorphic-base dark:bg-neumorphic-base-dark ${
                                            selectedLessons.has(lesson.id)
                                                ? 'shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark'
                                                : 'shadow-neumorphic dark:shadow-neumorphic-dark hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            {/* --- MODIFIED: Added dark mode classes --- */}
                                            <div className="text-slate-800 dark:text-slate-100 font-medium truncate text-sm sm:text-base">{lesson.title}</div>
                                            {lesson.subtitle && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                                                    {lesson.subtitle}
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedLessons.has(lesson.id)}
                                            onChange={() => handleLessonSelect(lesson.id)}
                                            // --- MODIFIED: Added dark mode classes ---
                                            className="w-5 h-5 rounded text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                                        />
                                    </label>
                                ))}

                            <p className="text-center text-slate-500 dark:text-slate-400 py-6">
                                    No lessons available in this unit.
                            </p>
                        </div>

                        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-neumorphic-shadow-dark/30 dark:border-neumorphic-shadow-light-dark/30 flex justify-end gap-3">
                            <button onClick={() => setShowLessonPicker(false)} className={secondaryButton}>
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLessonPicker(false);
                                    handleGeneratePresentationClick();
                                }}
                                className={primaryButton}
                                disabled={selectedLessons.size === 0}
                            >
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- LEVEL 2: SUBJECT LIST VIEW ---
const SubjectList = (props) => {
    // ... (All logic, state, and effects are unchanged) ...
    const { courses, handleInitiateDelete, onAddSubjectClick, setActiveSubject, handleCategoryClick } = props;
    const { contentGroup, categoryName } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const decodedCategoryName = decodeURIComponent(categoryName);

    useEffect(() => {
        handleCategoryClick(decodedCategoryName);
        setActiveSubject(null);
        return () => handleCategoryClick(null);
    }, [decodedCategoryName, handleCategoryClick, setActiveSubject]);

    const categoryCourses = courses.filter(c => c.category === decodedCategoryName);
    categoryCourses.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
    const filteredCourses = categoryCourses.filter(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={commonContainerClasses}>
            {/* --- MODIFIED: Removed gradient from card, using windowContainerClasses --- */}
            <div className={windowContainerClasses}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-start gap-2 sm:gap-4">
                        <button onClick={() => navigate(`/dashboard/courses/${contentGroup}`)} className={secondaryButton}><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">{decodedCategoryName.replace(/\s\((Teacher|Learner)'s Content\)/i, '')}</h1>
                    </div>
                    <button onClick={() => { if (onAddSubjectClick) { onAddSubjectClick(decodedCategoryName); } }} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Subject</button>
                </div>
                <div className="mb-6">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {/* --- MODIFIED: Themed search input --- */}
                        <input type="text" placeholder={`Search in ${decodedCategoryName}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 sm:pl-12 rounded-xl focus:ring-0 border-none bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark text-slate-800 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 text-sm sm:text-base" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => {
                            const { icon: Icon, iconColor, gradient } = getSubjectStyling(course.title);
                            const unitCount = course.unitCount || 0;
                            return (
                                <Link 
                                    key={course.id} 
                                    to={course.id}
                                    // --- MODIFIED: Added dark mode classes, kept light gradient ---
                                    className={`group relative rounded-3xl p-4 sm:p-6 shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow duration-300 cursor-pointer bg-gradient-to-br ${gradient} hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark`}
                                >
                                    <div className="relative z-5 flex flex-col h-full justify-between">
                                        <div>
                                            {/* --- MODIFIED: Themed icon box --- */}
                                            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark">
                                                <Icon className={`w-6 h-6 sm:w-7 h-7 ${iconColor}`} />
                                            </div>
											{/* --- MODIFIED: Themed text --- */}
											<h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
											    {course.title}
											</h2>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">{unitCount} {unitCount === 1 ? 'Unit' : 'Units'}</p>
                                    </div>
                                    <div className="absolute top-4 right-4 z-5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); props.handleOpenEditSubject(course); }} className={iconButton} title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleInitiateDelete('subject', course.id, course.title); }} className={destructiveIconButton} title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </Link>
                            );
                        })
                    ) : (
                        <p className="col-span-full text-center text-slate-500 dark:text-slate-400 py-10">No subjects found matching your search.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- LEVEL 1: CATEGORY LIST VIEW ---
const CategoryList = (props) => {
    // ... (All logic, state, and effects are unchanged) ...
    const { courseCategories, courses, setCreateCategoryModalOpen, handleEditCategory, handleInitiateDelete, handleCategoryClick, setActiveSubject } = props;
    const { contentGroup } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        setActiveSubject(null);
        handleCategoryClick(null);
    }, [setActiveSubject, handleCategoryClick]);

    const isLearner = contentGroup.toLowerCase() === 'learner';
    const title = isLearner ? "Learner's Content" : "Teacher's Content";
    
    const categoriesToShow = courseCategories.filter(cat => {
        const lowerName = cat.name.toLowerCase();
        if (isLearner) {
            return !lowerName.includes("(teacher's content)");
        } else {
            return lowerName.includes("teacher's content");
        }
    });
    
    categoriesToShow.sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className={commonContainerClasses}>
            {/* --- MODIFIED: Removed gradient from card, using windowContainerClasses --- */}
            <div className={windowContainerClasses}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={() => navigate('/dashboard/courses')} className={secondaryButton} title="Back to Content Types"><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight truncate">{title}</h1>
                    </div>
                    <button onClick={() => setCreateCategoryModalOpen(true)} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Category</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                    {categoriesToShow.map((cat) => {
                        const courseCount = courses.filter(c => c.category === cat.name).length;
                        const { icon: Icon, iconColor, gradient } = getSubjectStyling(cat.name);
                        const cleanName = cat.name.replace(/\s\((Teacher|Learner)'s Content\)/i, '');
                        return (
                            <Link 
                                key={cat.id} 
                                to={encodeURIComponent(cat.name)} // Encode the name for the URL
                                // --- MODIFIED: Added dark mode classes, kept light gradient ---
                                className={`group relative p-4 sm:p-6 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow cursor-pointer bg-gradient-to-br ${gradient} hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark h-full flex flex-col justify-between`}
                            >
                                <div className="relative z-5 flex-grow">
                                    {/* --- MODIFIED: Themed icon box --- */}
                                    <div className="p-3 sm:p-4 inline-block bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark rounded-xl mb-4"><Icon className={`w-7 h-7 sm:w-8 h-8 ${iconColor}`} /></div>
                                    {/* --- MODIFIED: Themed text --- */}
                                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                                        {cleanName}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p>
                                </div>
                                <div className="absolute top-4 right-4 z-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditCategory(cat); }} className={iconButton} title={`Edit category ${cat.name}`}><PencilSquareIcon className="w-5 h-5" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleInitiateDelete('category', cat.id, cat.name);}} className={destructiveIconButton} title={`Delete category ${cat.name}`}><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- LEVEL 0: CONTENT GROUP SELECTOR ---
const ContentGroupSelector = (props) => {
    // ... (All logic, state, and effects are unchanged) ...
    useEffect(() => {
        props.setActiveSubject(null);
        props.handleBackToCategoryList();
    }, [props.setActiveSubject, props.handleBackToCategoryList]);

    return (
        <div className={commonContainerClasses}>
            <div className={windowContainerClasses}>
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-12">
                    {/* --- MODIFIED: Learner Card (Themed) --- */}
                    <Link to="learner" className="group relative p-6 sm:p-12 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark cursor-pointer flex-1 bg-neumorphic-base dark:bg-neumorphic-base-dark flex flex-col justify-between items-start">
                        <div className="relative z-5">
                            <div className="p-4 sm:p-5 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark rounded-2xl mb-4 sm:mb-6 inline-block"><LearnerIcon className="w-10 h-10 sm:w-12 h-12 text-sky-600 dark:text-sky-400" /></div>
                            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">Learner's Content</h2>
                            <p className="text-slate-600 dark:text-slate-400 mt-2 text-base sm:text-lg">Access a world of knowledge and curated subjects designed for students.</p>
                        </div>
                        <div className="relative z-10 mt-8 px-5 py-2 sm:px-6 sm:py-3 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark rounded-full font-semibold text-sm sm:text-base">Explore Now</div>
                    </Link>

                    {/* --- MODIFIED: Teacher Card (Themed) --- */}
                    <Link to="teacher" className="group relative p-6 sm:p-12 rounded-3xl shadow-neumorphic dark:shadow-neumorphic-dark transition-shadow hover:shadow-neumorphic-inset dark:hover:shadow-neumorphic-inset-dark cursor-pointer flex-1 bg-neumorphic-base dark:bg-neumorphic-base-dark flex flex-col justify-between items-start">
                        <div className="relative z-5">
                            <div className="p-4 sm:p-5 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark rounded-2xl mb-4 sm:mb-6 inline-block"><TeacherIcon className="w-10 h-10 sm:w-12 h-12 text-emerald-600 dark:text-emerald-400" /></div>
                            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-800 dark:text-slate-100">Teacher's Content</h2>
                            <p className="text-slate-600 dark:text-slate-400 mt-2 text-base sm:text-lg">Discover powerful tools and resources to manage subjects and lessons.</p>
                        </div>
                        <div className="relative z-5 mt-8 px-5 py-2 sm:px-6 sm:py-3 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic dark:shadow-neumorphic-dark rounded-full font-semibold text-sm sm:text-base">Manage Content</div>
                    </Link>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COURSES VIEW COMPONENT ---
const CoursesView = (props) => {
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
};

export default CoursesView;