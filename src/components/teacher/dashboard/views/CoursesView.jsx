// src/components/.../CoursesView.js
import React, { useState, useEffect } from 'react';
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

const CoursesView = (props) => {
    const {
        selectedCategory, courses, activeSubject, setActiveSubject, handleBackToCategoryList,
        handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating, courseCategories,
        handleCategoryClick, handleEditCategory, setCreateCategoryModalOpen,
        activeUnit,
        onSetActiveUnit,
        onAddSubjectClick,
        onGeneratePresentationPreview
    } = props;

    const [searchTerm, setSearchTerm] = useState('');
    const [activeContentGroup, setActiveContentGroup] = useState(null);
    const [selectedLessons, setSelectedLessons] = useState(new Set());
    const [units, setUnits] = useState([]);
    const [allLessonsForSubject, setAllLessonsForSubject] = useState([]);
    const [isLoadingUnitsAndLessons, setIsLoadingUnitsAndLessons] = useState(false);
    const [showLessonPicker, setShowLessonPicker] = useState(false);

    const baseButtonStyles = "font-semibold rounded-xl transition-shadow duration-200 active:shadow-neumorphic-inset disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-neumorphic-inset flex items-center gap-2";
    const primaryButton = `${baseButtonStyles} px-5 py-2.5 bg-gradient-to-br from-sky-100 to-blue-200 text-blue-700 shadow-neumorphic hover:shadow-neumorphic-inset`;
    const secondaryButton = `${baseButtonStyles} px-5 py-2.5 bg-neumorphic-base text-slate-700 shadow-neumorphic hover:shadow-neumorphic-inset`;
    const iconButton = `${baseButtonStyles} p-2.5 bg-neumorphic-base text-slate-600 shadow-neumorphic hover:shadow-neumorphic-inset rounded-full`;
    const destructiveIconButton = `${baseButtonStyles} p-2.5 bg-neumorphic-base text-red-600 shadow-neumorphic hover:shadow-neumorphic-inset rounded-full`;

    useEffect(() => {
        setSelectedLessons(new Set());
    }, [activeSubject]);

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

    const getSubjectStyling = (subjectTitle) => {
        const lowerCaseTitle = subjectTitle.toLowerCase();
        let IconComponent = BookOpenIcon;
        let iconColor = 'text-gray-500';
        let gradient = 'from-white to-slate-100';
        if (lowerCaseTitle.includes('math')) { IconComponent = CalculatorIcon; iconColor = 'text-blue-500'; gradient = 'from-white to-blue-50'; }
        else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino')) { IconComponent = BookOpenIcon; iconColor = 'text-teal-500'; gradient = 'from-white to-teal-50'; }
        else if (lowerCaseTitle.includes('religious education')) { IconComponent = BookOpenIcon; iconColor = 'text-amber-500'; gradient = 'from-white to-amber-50'; }
        else if (lowerCaseTitle.includes('science')) { IconComponent = BeakerIcon; iconColor = 'text-green-500'; gradient = 'from-white to-green-50'; }
        else if (lowerCaseTitle.includes('araling panlipunan')) { IconComponent = GlobeAltIcon; iconColor = 'text-red-500'; gradient = 'from-white to-red-50'; }
        else if (lowerCaseTitle.includes('mapeh')) { IconComponent = MusicalNoteIcon; iconColor = 'text-pink-500'; gradient = 'from-white to-pink-50'; }
        else if (lowerCaseTitle.includes('tle')) { IconComponent = WrenchScrewdriverIcon; iconColor = 'text-purple-500'; gradient = 'from-white to-purple-50'; }
        return { icon: IconComponent, iconColor, gradient };
    };

    const commonContainerClasses = "min-h-screen p-6 bg-neumorphic-base";
    const windowContainerClasses = "bg-neumorphic-base rounded-3xl p-8 shadow-neumorphic w-full max-w-7xl mx-auto my-12 transition-all duration-500";

	if (activeSubject) {
	    return (
	        <div className={commonContainerClasses}>
	            <div className={`${windowContainerClasses} bg-gradient-to-br from-white to-slate-50`}>
	                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
	                    <div className="flex items-center gap-3">
	                        <button
	                            onClick={() => {
	                                setActiveSubject(null);
	                                if (onSetActiveUnit) {
	                                    onSetActiveUnit(null);
	                                }
	                            }}
	                            className={secondaryButton}
	                        >
	                            <ArrowUturnLeftIcon className="w-5 h-5" />
	                            Back to Subjects
	                        </button>
	                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
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
	                            onClick={() => handleOpenDeleteSubject(activeSubject)}
	                            className={destructiveIconButton}
	                            title="Delete Subject"
	                        >
	                            <TrashIcon className="w-5 h-5" />
	                        </button>
	                    </div>
	                    <div className="flex gap-3 flex-wrap">
	                        <button onClick={() => setShareContentModalOpen(true)} className={secondaryButton}>
	                            <ShareIcon className="w-5 h-5" />Send Lesson
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
	                    {isLoadingUnitsAndLessons ? (
	                        <div className="flex justify-center items-center py-10">
	                            <Spinner />
	                            <p className="ml-4 text-slate-500">Loading content...</p>
	                        </div>
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
	                            units={units}
	                            allLessonsForSubject={allLessonsForSubject}
	                            handleGenerateQuizForLesson={handleGenerateQuizForLesson}
	                            renderGeneratePptButton={(unit) => (
	                                <button
	                                    onClick={() => {
	                                        setSelectedLessons(new Set());
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

	            {/* Lesson Picker Modal */}
	            {showLessonPicker && activeUnit && (
	                <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 p-4">
	                    <div className="bg-gradient-to-br from-white to-slate-100 rounded-3xl shadow-neumorphic w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
	                        <div className="px-6 py-4 border-b border-neumorphic-shadow-dark/30 flex justify-between items-center">
	                            <div>
	                                <h2 className="text-lg font-bold text-slate-800">Select Lessons</h2>
	                                <p className="text-sm text-slate-600 mt-1">
	                                    From unit: <span className="font-medium">{activeUnit.title}</span>
	                                </p>
	                            </div>
	                            <button onClick={() => setShowLessonPicker(false)} className={iconButton}>✕</button>
	                        </div>

	                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
	                            {allLessonsForSubject
	                                .filter((lesson) => lesson.unitId === activeUnit.id)
	                                .sort((a, b) =>
	                                    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
	                                )
	                                .map((lesson) => (
	                                    <label
	                                        key={lesson.id}
	                                        className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer bg-neumorphic-base ${
	                                            selectedLessons.has(lesson.id)
	                                                ? 'shadow-neumorphic-inset'
	                                                : 'shadow-neumorphic'
	                                        }`}
	                                    >
	                                        <div className="min-w-0">
	                                            <div className="text-slate-800 font-medium truncate">{lesson.title}</div>
	                                            {lesson.subtitle && (
	                                                <div className="text-xs text-slate-500 mt-1 truncate">
	                                                    {lesson.subtitle}
	                                                </div>
	                                            )}
	                                        </div>
	                                        <input
	                                            type="checkbox"
	                                            checked={selectedLessons.has(lesson.id)}
	                                            onChange={() => handleLessonSelect(lesson.id)}
	                                            className="sr-only"
	                                        />
	                                    </label>
	                                ))}

	                            {allLessonsForSubject.filter((l) => l.unitId === activeUnit.id).length === 0 && (
	                                <p className="text-center text-slate-500 py-6">
	                                    No lessons available in this unit.
	                                </p>
	                            )}
	                        </div>

	                        <div className="px-6 py-4 border-t border-neumorphic-shadow-dark/30 flex justify-end gap-3">
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

	            {/* 🔥 AI Generating Overlay */}
	            {isAiGenerating && (
	                <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
	                    <div className="bg-neumorphic-base rounded-3xl shadow-neumorphic p-8 flex flex-col items-center space-y-4">
	                        <Spinner />
	                        <p className="text-slate-700 font-semibold mt-4">Generating your presentation...</p>
	                    </div>
	                </div>
	            )}
	        </div>
	    );
	}

    if (selectedCategory) {
        const categoryCourses = courses.filter(c => c.category === selectedCategory);
        categoryCourses.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
        const filteredCourses = categoryCourses.filter(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className={commonContainerClasses}>
                <div className={`${windowContainerClasses} bg-gradient-to-br from-white to-slate-50`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBackToCategoryList} className={secondaryButton}><ArrowUturnLeftIcon className="w-5 h-5" />Back</button>
                            <h1 className="text-4xl font-extrabold text-slate-800 leading-tight truncate">{selectedCategory}</h1>
                        </div>
                        <button onClick={() => { if (onAddSubjectClick) { onAddSubjectClick(selectedCategory); } }} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Subject</button>
                    </div>
                    <div className="mb-6">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input type="text" placeholder={`Search in ${selectedCategory}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-12 rounded-xl focus:ring-0 border-none bg-neumorphic-base shadow-neumorphic-inset text-slate-800 placeholder:text-slate-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map((course) => {
                                const { icon: Icon, iconColor, gradient } = getSubjectStyling(course.title);
                                const unitCount = course.unitCount || 0;
                                return (
                                    <div key={course.id} onClick={() => setActiveSubject(course)} className={`group relative rounded-3xl p-6 shadow-neumorphic transition-shadow duration-300 cursor-pointer bg-gradient-to-br ${gradient} hover:shadow-neumorphic-inset`}>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div>
                                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-neumorphic-base shadow-neumorphic-inset">
                                                    <Icon className={`w-7 h-7 ${iconColor}`} />
                                                </div>
                                                <h2 className="text-2xl font-bold tracking-tight text-slate-800">{course.title}</h2>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-2 font-medium">{unitCount} {unitCount === 1 ? 'Unit' : 'Units'}</p>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditSubject(course); }} className={iconButton} title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleInitiateDelete('subject', course.id, course.title); }} className={destructiveIconButton} title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="col-span-full text-center text-slate-500 py-10">No subjects found matching your search.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (activeContentGroup) {
        const teacherCategories = courseCategories.filter(cat => cat.name.toLowerCase().includes("teach"));
        const learnerCategories = courseCategories.filter(cat => !cat.name.toLowerCase().includes("teach"));
        const categoriesToShow = activeContentGroup === 'Learner' ? learnerCategories : teacherCategories;
        categoriesToShow.sort((a, b) => a.name.localeCompare(b.name));
        return (
            <div className={commonContainerClasses}>
                <div className={`${windowContainerClasses} bg-gradient-to-br from-white to-slate-50`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveContentGroup(null)} className={secondaryButton} title="Back to Content Types"><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                            <h1 className="text-4xl font-extrabold text-slate-800 leading-tight truncate">{activeContentGroup}'s Content</h1>
                        </div>
                        <button onClick={() => setCreateCategoryModalOpen(true)} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Category</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categoriesToShow.map((cat) => {
                            const courseCount = courses.filter(c => c.category === cat.name).length;
                            const { icon: Icon, iconColor, gradient } = getSubjectStyling(cat.name);
                            return (
                                <div key={cat.id} onClick={() => handleCategoryClick(cat.name)} className={`group relative p-6 rounded-3xl shadow-neumorphic transition-shadow cursor-pointer bg-gradient-to-br ${gradient} hover:shadow-neumorphic-inset h-full flex flex-col justify-between`}>
                                    <div className="relative z-10 flex-grow">
                                        <div className="p-4 inline-block bg-neumorphic-base shadow-neumorphic-inset rounded-xl mb-4"><Icon className={`w-8 h-8 ${iconColor}`} /></div>
                                        <h2 className="text-xl font-bold text-slate-800 mb-1">{cat.name}</h2>
                                        <p className="text-slate-500">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p>
                                    </div>
                                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} className={iconButton} title={`Edit category ${cat.name}`}><PencilSquareIcon className="w-5 h-5" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleInitiateDelete('category', cat.id, cat.name);}} className={destructiveIconButton} title={`Delete category ${cat.name}`}><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={commonContainerClasses}>
            <div className={windowContainerClasses}>
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 md:gap-12">
                    <div onClick={() => setActiveContentGroup('Learner')} className="group relative p-12 rounded-3xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset cursor-pointer flex-1 bg-gradient-to-br from-white to-sky-100 flex flex-col justify-between items-start">
                        <div className="relative z-10">
                            <div className="p-5 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl mb-6 inline-block"><LearnerIcon className="w-12 h-12 text-sky-600" /></div>
                            <h2 className="text-4xl font-extrabold text-slate-800">Learner's Content</h2>
                            <p className="text-slate-600 mt-2 text-lg">Access a world of knowledge and curated subjects designed for students.</p>
                        </div>
                        <div className="relative z-10 mt-8 px-6 py-3 bg-neumorphic-base shadow-neumorphic rounded-full font-semibold">Explore Now</div>
                    </div>

                    <div onClick={() => setActiveContentGroup('Teacher')} className="group relative p-12 rounded-3xl shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset cursor-pointer flex-1 bg-gradient-to-br from-white to-emerald-100 flex flex-col justify-between items-start">
                        <div className="relative z-10">
                            <div className="p-5 bg-neumorphic-base shadow-neumorphic-inset rounded-2xl mb-6 inline-block"><TeacherIcon className="w-12 h-12 text-emerald-600" /></div>
                            <h2 className="text-4xl font-extrabold text-slate-800">Teacher's Content</h2>
                            <p className="text-slate-600 mt-2 text-lg">Discover powerful tools and resources to manage subjects and lessons.</p>
                        </div>
                        <div className="relative z-10 mt-8 px-6 py-3 bg-neumorphic-base shadow-neumorphic rounded-full font-semibold">Manage Content</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursesView;