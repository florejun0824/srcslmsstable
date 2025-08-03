import React, { useState, useEffect } from 'react';
import UnitAccordion from '../../UnitAccordion';
import {
    PencilSquareIcon, TrashIcon, PlusCircleIcon, ArrowUturnLeftIcon, SparklesIcon,
    BookOpenIcon, CalculatorIcon, BeakerIcon, GlobeAltIcon, ComputerDesktopIcon,
    PaintBrushIcon, UserGroupIcon, CodeBracketIcon, MusicalNoteIcon, WrenchScrewdriverIcon,
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
        handleCategoryClick, handleEditCategory, setCreateCategoryModalOpen, setCreateCourseModalOpen,
        activeView,
        activeUnit,
        onSetActiveUnit,
        onAddSubjectClick,
        onGeneratePresentationPreview
    } = props;

    const [searchTerm, setSearchTerm] = useState('');
    const [activeContentGroup, setActiveContentGroup] = useState(null);

    // This state has been simplified for the new UI to rely on a different interaction model.
    const [selectedLessons, setSelectedLessons] = useState(new Set());

    useEffect(() => {
        // This effect was causing the view to reset unexpectedly.
    }, [activeView]);

    useEffect(() => {
        setSelectedLessons(new Set());
    }, [activeSubject]);

    const handleLessonSelect = (lessonId) => {
        setSelectedLessons(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(lessonId)) {
                newSelection.delete(lessonId);
            } else {
                newSelection.add(lessonId);
            }
            return newSelection;
        });
    };

    const availableGradients = [
        'from-sky-500 to-indigo-500', 'from-green-500 to-emerald-500', 'from-violet-500 to-purple-500',
        'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500', 'from-teal-500 to-cyan-500',
        'from-red-500 to-orange-500', 'from-blue-500 to-purple-600', 'from-fuchsia-500 to-pink-600',
        'from-lime-500 to-green-600', 'from-indigo-500 to-blue-600', 'from-yellow-500 to-amber-500',
        'from-slate-600 to-gray-800',
    ];

    const getSubjectIconAndColor = (subjectTitle, itemIdentifier) => {
        const lowerCaseTitle = subjectTitle.toLowerCase();
        let IconComponent = BookOpenIcon;

        if (lowerCaseTitle.includes('math') || lowerCaseTitle.includes('mathematics') || lowerCaseTitle.includes('algebra') || lowerCaseTitle.includes('geometry') || lowerCaseTitle.includes('calculus')) {
            IconComponent = CalculatorIcon;
        } else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino') || lowerCaseTitle.includes('literature') || lowerCaseTitle.includes('language')) {
            IconComponent = BookOpenIcon;
        } else if (lowerCaseTitle.includes('religious education') || lowerCaseTitle.includes('christian social living') || lowerCaseTitle.includes('religion') || lowerCaseTitle.includes('values')) {
            IconComponent = BookOpenIcon;
        } else if (lowerCaseTitle.includes('science') || lowerCaseTitle.includes('biology') || lowerCaseTitle.includes('chemistry') || lowerCaseTitle.includes('physics')) {
            IconComponent = BeakerIcon;
        } else if (lowerCaseTitle.includes('araling panlipunan') || lowerCaseTitle.includes('history') || lowerCaseTitle.includes('geography') || lowerCaseTitle.includes('social studies')) {
            IconComponent = GlobeAltIcon;
        } else if (lowerCaseTitle.includes('mapeh') || lowerCaseTitle.includes('music') || lowerCaseTitle.includes('arts') || lowerCaseTitle.includes('pe') || lowerCaseTitle.includes('health')) {
            IconComponent = MusicalNoteIcon;
        } else if (lowerCaseTitle.includes('tle') || lowerCaseTitle.includes('technology') || lowerCaseTitle.includes('livelihood') || lowerCaseTitle.includes('tools') || lowerCaseTitle.includes('home economics')) {
            IconComponent = WrenchScrewdriverIcon;
        } else {
            IconComponent = BookOpenIcon;
        }

        let hash = 0;
        if (itemIdentifier) {
            for (let i = 0; i < itemIdentifier.length; i++) {
                hash = itemIdentifier.charCodeAt(i) + ((hash << 5) - hash);
            }
        }
        const colorIndex = Math.abs(hash) % availableGradients.length;
        const gradientColor = availableGradients[colorIndex];

        return { icon: IconComponent, color: gradientColor };
    };


    if (activeSubject) {
        return (
            <div className="bg-gray-100 min-h-screen p-6 sm:p-10">
                <div className="max-w-7xl mx-auto">
                    <button onClick={() => {
                        setActiveSubject(null);
                        if (onSetActiveUnit) {
                            onSetActiveUnit(null);
                        }
                    }} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200 text-sm font-medium mb-6 gap-2">
                        <ArrowUturnLeftIcon className="w-5 h-5" />
                        Back to Subjects
                    </button>
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-800">{activeSubject.title}</h1>
                                <button onClick={() => handleOpenEditSubject(activeSubject)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors duration-200" title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleOpenDeleteSubject(activeSubject)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-200" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={() => onGeneratePresentationPreview(Array.from(selectedLessons))}
                                    className={`flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg shadow-md transition-all duration-200 text-sm font-medium gap-2 ${selectedLessons.size === 0 || isAiGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}
                                    disabled={selectedLessons.size === 0 || isAiGenerating}
                                >
                                    <PresentationChartBarIcon className="w-5 h-5" />
                                    <span>Generate PPT</span>
                                    <span className="bg-white text-orange-900 text-xs font-bold px-2 py-0.5 rounded-full">BETA</span>
                                    {selectedLessons.size > 0 && <span>({selectedLessons.size})</span>}
                                </button>
                                <button onClick={() => setShareContentModalOpen(true)} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium gap-2">
                                    <ShareIcon className="w-5 h-5" />
                                    Send Lesson
                                </button>
                                <button onClick={() => setAddUnitModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium gap-2">
                                    <PlusCircleIcon className="w-5 h-5" />
                                    Add Unit
                                </button>
                                <button onClick={() => setIsAiHubOpen(true)} className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-bold gap-2">
                                    <SparklesIcon className="w-5 h-5" />
                                    AI Tools
                                </button>
                            </div>
                        </div>
                        <div>
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
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedCategory) {
        const categoryCourses = courses.filter(c => c.category === selectedCategory);

        categoryCourses.sort((a, b) =>
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        );

        const filteredCourses = categoryCourses.filter(course =>
            course.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="bg-gray-100 min-h-screen p-6 sm:p-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBackToCategoryList} className="flex-shrink-0 p-2 rounded-full text-gray-700 hover:bg-gray-200 transition-colors">
                                <ArrowUturnLeftIcon className="w-6 h-6" />
                            </button>
                            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight truncate">{selectedCategory}</h1>
                        </div>
                        <button
                            onClick={() => {
                                if (onAddSubjectClick) {
                                    onAddSubjectClick(selectedCategory);
                                }
                            }}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium gap-2"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Add Subject
                        </button>
                    </div>

                    <div className="mb-6 sticky top-0 bg-gray-100 py-3 z-20">
                        <div className="relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder={`Search in ${selectedCategory}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map((course, index) => {
                                const { icon: Icon, color } = getSubjectIconAndColor(course.title, course.id);
                                return (
                                    <div key={course.id} onClick={() => setActiveSubject(course)} className={`group relative p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full text-white bg-gradient-to-br ${color}`}>
                                        <div className="relative z-10">
                                            <div className="mb-4 p-3 bg-white/20 rounded-xl inline-block"><Icon className="w-8 h-8 text-white" /></div>
                                            <h2 className="text-xl font-bold">{course.title}</h2>
                                        </div>
                                        <p className="relative z-10 text-white/80 text-sm mt-2">Select to view units</p>
                                        <div className="absolute top-0 right-0 h-24 w-24 p-4 z-20 flex items-start justify-end">
                                            <div className="p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-white/20 backdrop-blur-md rounded-full shadow-lg">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenEditSubject(course);
                                                    }}
                                                    className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                                    title="Edit Subject Name"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleInitiateDelete('subject', course.id, course.title);
                                                    }}
                                                    className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                                    title="Delete Subject"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : ( <p className="col-span-full text-center text-gray-500 py-10">No subjects found matching your search.</p> )}
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
            <div className="bg-gray-100 min-h-screen p-6 sm:p-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveContentGroup(null)} className="flex-shrink-0 p-2 rounded-full text-gray-700 hover:bg-gray-200 transition-colors" title="Back to Content Types">
                                <ArrowUturnLeftIcon className="w-6 h-6" />
                            </button>
                            <h1 className="text-4xl font-extrabold text-gray-900 leading-tight truncate">{activeContentGroup}'s Content</h1>
                        </div>
                        <button
                            onClick={() => setCreateCategoryModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium gap-2"
                        >
                            <PlusCircleIcon className="w-5 h-5" />
                            Add Category
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categoriesToShow.map((cat, index) => {
                            const courseCount = courses.filter(c => c.category === cat.name).length;
                            const { icon: Icon, color } = getSubjectIconAndColor(cat.name, cat.id);
                            return (
                                <div
                                    key={cat.id}
                                    onClick={() => handleCategoryClick(cat.name)}
                                    className={`group relative p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full text-white bg-gradient-to-br ${color}`}
                                >
                                    <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div>
                                    <div className="relative z-10 flex-grow">
                                        <div className={`p-4 inline-block bg-white/20 text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div>
                                        <h2 className="text-xl font-bold text-white mb-1">{cat.name}</h2>
                                        <p className="text-white/80">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p>
                                    </div>
                                    <div className="absolute top-0 right-0 h-24 w-24 p-4 z-20 flex items-start justify-end">
                                        <div className="p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-white/20 backdrop-blur-md rounded-full shadow-lg">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                                                className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                                title={`Edit category ${cat.name}`}
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleInitiateDelete('category', cat.id, cat.name);
                                                }}
                                                className="p-2 rounded-full text-white hover:bg-white/30 transition-colors duration-500"
                                                title={`Delete category ${cat.name}`}
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gray-100 min-h-screen p-6 sm:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">Content Type</h1>
                    <p className="text-gray-500 mt-2 text-lg font-light">Select a content type to view its categories.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div onClick={() => setActiveContentGroup('Learner')} className="group relative p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex items-center bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                        <LearnerIcon className="w-24 h-24 absolute -right-6 -bottom-6 opacity-10" />
                        <div>
                            <div className="p-4 bg-white/20 rounded-xl inline-block mb-4"><LearnerIcon className="w-10 h-10" /></div>
                            <h2 className="text-3xl font-bold">Learner's Content</h2>
                            <p className="text-white/80">Access all student-facing materials and subjects.</p>
                        </div>
                    </div>
                    <div onClick={() => setActiveContentGroup('Teacher')} className="group relative p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex items-center bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                        <TeacherIcon className="w-24 h-24 absolute -right-6 -bottom-6 opacity-10" />
                        <div>
                            <div className="p-4 bg-white/20 rounded-xl inline-block mb-4"><TeacherIcon className="w-10 h-10" /></div>
                            <h2 className="text-3xl font-bold">Teacher's Content</h2>
                            <p className="text-white/80">Access all teacher guides and resources.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursesView;