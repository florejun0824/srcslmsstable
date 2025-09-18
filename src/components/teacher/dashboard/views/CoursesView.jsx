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
    CubeTransparentIcon,
} from '@heroicons/react/24/solid';

const CoursesView = (props) => {
    const {
        selectedCategory, courses, activeSubject, setActiveSubject, handleBackToCategoryList,
        handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating, courseCategories,
        handleCategoryClick, handleEditCategory, setCreateCategoryModalOpen, setCreateCourseModalOpen,
        activeView,
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

    // NEW: Modal states for Beta & Lesson picker
    const [showBetaWarning, setShowBetaWarning] = useState(false);
    const [showLessonPicker, setShowLessonPicker] = useState(false);
    const [targetUnit, setTargetUnit] = useState(null);

    // --- Button Style Constants for consistent "iOS-like" vibe ---
    const baseButtonStyles = "flex items-center gap-2 font-semibold rounded-full transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed";
    const primaryButton = `${baseButtonStyles} px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5`;
    const primaryAltButton = `${baseButtonStyles} px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5`;
    const secondaryButton = `${baseButtonStyles} px-4 py-2 bg-black/5 backdrop-blur-sm text-slate-700 ring-1 ring-black/10 hover:bg-black/10`;
    const iconButton = `${baseButtonStyles} p-2.5 bg-black/5 backdrop-blur-sm text-slate-600 ring-1 ring-black/10 hover:bg-black/10`;
    const destructiveIconButton = `${baseButtonStyles} p-2.5 bg-red-500/10 backdrop-blur-sm text-red-600 ring-1 ring-red-500/20 hover:bg-red-500/20`;

    useEffect(() => {}, [activeView]);

    // Reset lesson selection when the subject changes (so selections don't leak across subjects)
    useEffect(() => {
        setSelectedLessons(new Set());
    }, [activeSubject]);

    // Fetch units + lessons for the activeSubject
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

    const getSubjectIconAndColor = (subjectTitle) => {
        const lowerCaseTitle = subjectTitle.toLowerCase();
        let IconComponent = BookOpenIcon;
        let iconBgColor = 'bg-gray-600';
        if (lowerCaseTitle.includes('math')) { IconComponent = CalculatorIcon; iconBgColor = 'bg-blue-600'; }
        else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino')) { IconComponent = BookOpenIcon; iconBgColor = 'bg-teal-600'; }
        else if (lowerCaseTitle.includes('religious education')) { IconComponent = BookOpenIcon; iconBgColor = 'bg-amber-600'; }
        else if (lowerCaseTitle.includes('science')) { IconComponent = BeakerIcon; iconBgColor = 'bg-green-600'; }
        else if (lowerCaseTitle.includes('araling panlipunan')) { IconComponent = GlobeAltIcon; iconBgColor = 'bg-red-600'; }
        else if (lowerCaseTitle.includes('mapeh')) { IconComponent = MusicalNoteIcon; iconBgColor = 'bg-pink-600'; }
        else if (lowerCaseTitle.includes('tle')) { IconComponent = WrenchScrewdriverIcon; iconBgColor = 'bg-purple-600'; }
        return { icon: IconComponent, iconBgColor };
    };

    const commonContainerClasses = "min-h-screen flex justify-center items-center p-6 bg-gray-100";
    const windowContainerClasses = "bg-white/50 backdrop-blur-3xl rounded-3xl p-8 shadow-xl ring-1 ring-white/60 w-full max-w-7xl mx-auto my-12 transition-all duration-500";

    // --- ACTIVE SUBJECT VIEW (shows units via UnitAccordion) ---
    if (activeSubject) {
        return (
            <div className={commonContainerClasses}>
                <div className={windowContainerClasses}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setActiveSubject(null); if (onSetActiveUnit) { onSetActiveUnit(null); } }} className={secondaryButton}>
                                <ArrowUturnLeftIcon className="w-3 h-3" />
                                Back to Subjects
                            </button>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{activeSubject.title}</h2>
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className={iconButton} title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                            <button onClick={() => handleOpenDeleteSubject(activeSubject)} className={destructiveIconButton} title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button onClick={() => setShareContentModalOpen(true)} className={`${primaryButton} from-teal-500 to-cyan-500`}><ShareIcon className="w-5 h-5" />Send Lesson</button>
                            <button onClick={() => setAddUnitModalOpen(true)} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Unit</button>
                            <button onClick={() => setIsAiHubOpen(true)} className={`${primaryButton} from-purple-500 to-pink-500`}><SparklesIcon className="w-5 h-5" />AI Tools</button>
                        </div>
                    </div>

                    <div>
                        {isLoadingUnitsAndLessons ? (
                            <div className="flex justify-center items-center py-10">
                                <Spinner />
                                <p className="ml-4 text-gray-500">Loading content...</p>
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
                                // Inject per-unit Generate PPT button into UnitAccordion
                                renderGeneratePptButton={(unit) => (
                                    <button
                                        onClick={() => {
                                            // reset selection when switching units to avoid carryover
                                            setSelectedLessons(new Set());
                                            setTargetUnit(unit);
                                            setShowBetaWarning(true);
                                        }}
                                        className={`${baseButtonStyles} px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                                        disabled={isAiGenerating}
                                    >
                                        <PresentationChartBarIcon className="w-5 h-5" />
                                        <span>Generate PPT</span>
                                        <span className="bg-white text-orange-900 text-xs font-bold px-2 py-0.5 rounded-full">BETA</span>
                                    </button>
                                )}
                            />
                        )}
                    </div>
                </div>

                {/* Beta Warning Modal (iOS-like) */}
                {showBetaWarning && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                        <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md border border-white/20 p-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">⚠️ Beta Feature</h3>
                                    <p className="mt-2 text-sm text-slate-700">Generate PPT is currently in <strong>Beta</strong>. You’ll be able to pick lessons from the unit you triggered this from.</p>
                                </div>
                                <button onClick={() => { setShowBetaWarning(false); setTargetUnit(null); }} className="text-slate-500 hover:text-slate-700 ml-3">✕</button>
                            </div>
                            <div className="mt-4 flex justify-end gap-3">
                                <button onClick={() => { setShowBetaWarning(false); setTargetUnit(null); }} className="px-4 py-2 rounded-full bg-slate-100 font-semibold">Cancel</button>
                                <button onClick={() => { setShowBetaWarning(false); setShowLessonPicker(true); }} className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow">Continue</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Lesson Picker Modal (iOS 18.6-like UI) */}
                {showLessonPicker && targetUnit && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
                        <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col border border-white/20">
                          
                          {/* Header */}
                          <div className="px-6 py-4 border-b border-white/30 flex justify-between items-center">
                            <div>
                              <h2 className="text-lg font-bold text-slate-900">Select Lessons</h2>
                              <p className="text-sm text-slate-600 mt-1">From unit: <span className="font-medium">{targetUnit.title}</span></p>
                            </div>
                            <button
                              onClick={() => {
                                setShowLessonPicker(false);
                                setTargetUnit(null);
                              }}
                              className="text-slate-500 hover:text-slate-700 transition-colors text-xl leading-none"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Lessons list */}
                          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {allLessonsForSubject
                              .filter((lesson) => lesson.unitId === targetUnit.id)
                              .map((lesson) => (
                                <label
                                  key={lesson.id}
                                  className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/40 hover:shadow-md transition-all"
                                >
                                  <div className="min-w-0">
                                    <div className="text-slate-800 font-medium truncate">{lesson.title}</div>
                                    {lesson.subtitle && <div className="text-xs text-slate-500 mt-1 truncate">{lesson.subtitle}</div>}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedLessons.has(lesson.id)}
                                    onChange={() => handleLessonSelect(lesson.id)}
                                    className="h-6 w-6 rounded-full accent-blue-500 focus:ring-2 focus:ring-blue-400 transition"
                                  />
                                </label>
                              ))}

                            {allLessonsForSubject.filter((l) => l.unitId === targetUnit.id).length === 0 && (
                              <p className="text-center text-slate-500 py-6">No lessons available in this unit.</p>
                            )}
                          </div>

                          {/* Footer actions */}
                          <div className="px-6 py-4 border-t border-white/30 flex justify-end gap-3 bg-white/60 backdrop-blur-lg">
                            <button
                              onClick={() => {
                                setShowLessonPicker(false);
                                setTargetUnit(null);
                              }}
                              className="px-5 py-2 rounded-full font-semibold text-slate-700 bg-slate-200/70 hover:bg-slate-300 transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                setShowLessonPicker(false);
                                handleGeneratePresentationClick();
                                setTargetUnit(null);
                              }}
                              className={`px-5 py-2 rounded-full font-semibold text-white shadow-md transition-all ${
                                selectedLessons.size === 0
                                  ? "bg-slate-400 cursor-not-allowed"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-lg hover:-translate-y-0.5"
                              }`}
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
    }

    // --- CATEGORY VIEW & SUBJECTS (unchanged from original file) ---
    if (selectedCategory) {
        const categoryCourses = courses.filter(c => c.category === selectedCategory);
        categoryCourses.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }));
        const filteredCourses = categoryCourses.filter(course => course.title.toLowerCase().includes(searchTerm.toLowerCase()));

        return (
            <div className={commonContainerClasses}>
                <div className={windowContainerClasses}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBackToCategoryList} className={secondaryButton}><ArrowUturnLeftIcon className="w-6 h-6" />Back</button>
                            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight truncate">{selectedCategory}</h1>
                        </div>
                        <button onClick={() => { if (onAddSubjectClick) { onAddSubjectClick(selectedCategory); } }} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Subject</button>
                    </div>
                    <div className="mb-6 sticky top-0 bg-white/50 backdrop-blur-sm py-3 z-20 rounded-md">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder={`Search in ${selectedCategory}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/70" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map((course) => {
                                const { icon: Icon, iconBgColor } = getSubjectIconAndColor(course.title);
                                const unitCount = course.unitCount || 0;
                                return (
                                    <div key={course.id} onClick={() => setActiveSubject(course)} className={`group relative rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden bg-gradient-to-br ${{
                                        'bg-blue-600': 'from-blue-500/80 to-sky-600/70',
                                        'bg-green-600': 'from-green-500/80 to-emerald-600/70',
                                        'bg-teal-600': 'from-teal-500/80 to-cyan-600/70',
                                        'bg-red-600': 'from-red-500/80 to-rose-600/70',
                                        'bg-pink-600': 'from-pink-500/80 to-fuchsia-600/70',
                                        'bg-purple-600': 'from-purple-500/80 to-violet-600/70',
                                        'bg-amber-600': 'from-amber-500/80 to-yellow-600/70',
                                        'bg-gray-600': 'from-gray-500/80 to-slate-600/70'
                                    }[iconBgColor] || 'from-gray-500/80 to-slate-600/70'} text-white backdrop-blur-xl ring-1 ring-white/20`}>
                                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-lg opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div>
                                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-white/20 ring-1 ring-white/30 shadow-md">
                                                    <Icon className="w-7 h-7" />
                                                </div>
                                                <h2 className="text-2xl font-bold tracking-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{course.title}</h2>
                                            </div>
                                            <p className="text-sm text-white/80 mt-2 font-medium">{unitCount} {unitCount === 1 ? 'Unit' : 'Units'}</p>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditSubject(course); }} className="p-2 rounded-full text-white bg-black/10 hover:bg-black/30 transition-colors" title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleInitiateDelete('subject', course.id, course.title); }} className="p-2 rounded-full text-white bg-black/10 hover:bg-black/30 transition-colors" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="col-span-full text-center text-gray-500 py-10">No subjects found matching your search.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- CONTENT GROUPS (Teacher / Learner) ---
    if (activeContentGroup) {
        const teacherCategories = courseCategories.filter(cat => cat.name.toLowerCase().includes("teach"));
        const learnerCategories = courseCategories.filter(cat => !cat.name.toLowerCase().includes("teach"));
        const categoriesToShow = activeContentGroup === 'Learner' ? learnerCategories : teacherCategories;
        categoriesToShow.sort((a, b) => a.name.localeCompare(b.name));
        return (
            <div className={commonContainerClasses}>
                <div className={windowContainerClasses}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveContentGroup(null)} className={secondaryButton} title="Back to Content Types"><ArrowUturnLeftIcon className="w-6 h-6" /></button>
                            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight truncate">{activeContentGroup}'s Content</h1>
                        </div>
                        <button onClick={() => setCreateCategoryModalOpen(true)} className={primaryButton}><PlusCircleIcon className="w-5 h-5" />Add Category</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categoriesToShow.map((cat) => {
                            const courseCount = courses.filter(c => c.category === cat.name).length;
                            const { icon: Icon, iconBgColor } = getSubjectIconAndColor(cat.name);
                            return (
                                <div key={cat.id} onClick={() => handleCategoryClick(cat.name)} className={`group relative p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full text-white ${iconBgColor}`}>
                                    <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-all ${iconBgColor}`}></div>
                                    <div className="relative z-10 flex-grow">
                                        <div className={`p-4 inline-block bg-white/20 text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div>
                                        <h2 className="text-xl font-bold text-white mb-1">{cat.name}</h2>
                                        <p className="text-white/80">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p>
                                    </div>
                                    <div className="absolute top-0 right-0 h-24 w-24 p-4 z-20 flex items-start justify-end">
                                        <div className="p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-white/20 backdrop-blur-md rounded-full shadow-lg">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500" title={`Edit category ${cat.name}`}><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleInitiateDelete('category', cat.id, cat.name);}} className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500" title={`Delete category ${cat.name}`}><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // --- ROOT / DEFAULT VIEW (unchanged) ---
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100">
            <div className="bg-white/50 backdrop-blur-3xl rounded-3xl p-8 shadow-xl ring-1 ring-white/60 w-full max-w-7xl mx-auto my-12 transition-all duration-500">
                <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 md:gap-12">
                    <div onClick={() => setActiveContentGroup('Learner')} className="group relative p-12 rounded-3xl shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex-1 bg-gradient-to-br from-indigo-500 to-cyan-400 text-white flex flex-col justify-between items-start">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSI+PHBhdGggZD0iTTAgSDE2IEwxNiA1ICIvPjwvc3ZnPg==')] opacity-40"></div>
                        <div className="relative z-10">
                            <div className="p-5 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 inline-block shadow-lg ring-1 ring-white/20"><LearnerIcon className="w-12 h-12" /></div>
                            <h2 className="text-4xl font-extrabold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Learner's Content</h2>
                            <p className="text-white/80 mt-2 text-lg">Access a world of knowledge and curated subjects designed for students.</p>
                        </div>
                        <div className="relative z-10 mt-8 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full font-semibold transition-all duration-300 group-hover:bg-white group-hover:text-indigo-600 ring-1 ring-white/20">Explore Now</div>
                    </div>

                    <div onClick={() => setActiveContentGroup('Teacher')} className="group relative p-12 rounded-3xl shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex-1 bg-gradient-to-br from-emerald-500 to-teal-400 text-white flex flex-col justify-between items-start">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSI+PHBhdGggZD0iTTAgSDE2IEwxNiA1ICIvPjwvc3ZnPg==')] opacity-40"></div>
                        <div className="relative z-10">
                            <div className="p-5 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 inline-block shadow-lg ring-1 ring-white/20"><TeacherIcon className="w-12 h-12" /></div>
                            <h2 className="text-4xl font-extrabold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Teacher's Content</h2>
                            <p className="text-white/80 mt-2 text-lg">Discover powerful tools and resources to manage subjects and lessons.</p>
                        </div>
                        <div className="relative z-10 mt-8 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full font-semibold transition-all duration-300 group-hover:bg-white group-hover:text-emerald-600 ring-1 ring-white/20">Manage Content</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursesView;
