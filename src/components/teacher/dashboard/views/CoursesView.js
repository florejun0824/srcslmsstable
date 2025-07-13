import React, { useState } from 'react';
import UnitAccordion from '../../UnitAccordion';
import {
    PencilSquareIcon, TrashIcon, PlusCircleIcon, ArrowUturnLeftIcon, SparklesIcon,
    BookOpenIcon, CalculatorIcon, BeakerIcon, GlobeAltIcon, ComputerDesktopIcon,
    PaintBrushIcon, UserGroupIcon, CodeBracketIcon, MusicalNoteIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const CoursesView = (props) => {
    const {
        selectedCategory, courses, activeSubject, setActiveSubject, handleBackToCategoryList,
        handleOpenEditSubject, handleOpenDeleteSubject, setShareContentModalOpen,
        setAddUnitModalOpen, setIsAiHubOpen, handleInitiateDelete, userProfile,
        handleGenerateQuizForLesson, isAiGenerating, setIsAiGenerating, courseCategories,
        handleCategoryClick, handleEditCategory, setCreateCategoryModalOpen, setCreateCourseModalOpen
    } = props;

    // State for the new search functionality
    const [searchTerm, setSearchTerm] = useState('');

    const wrapper = "bg-white/70 backdrop-blur-md border border-white/30 p-4 sm:p-6 rounded-xl shadow";
    const subjectVisuals = [
        { icon: BookOpenIcon, color: 'from-sky-500 to-indigo-500' }, { icon: CalculatorIcon, color: 'from-green-500 to-emerald-500' },
        { icon: BeakerIcon, color: 'from-violet-500 to-purple-500' }, { icon: GlobeAltIcon, color: 'from-rose-500 to-pink-500' },
        { icon: ComputerDesktopIcon, color: 'from-slate-600 to-slate-800' }, { icon: PaintBrushIcon, color: 'from-amber-500 to-orange-500' },
        { icon: UserGroupIcon, color: 'from-teal-500 to-cyan-500' }, { icon: CodeBracketIcon, color: 'from-gray-700 to-gray-900' },
        { icon: MusicalNoteIcon, color: 'from-fuchsia-500 to-purple-600' },
    ];

    // --- VIEW 1: A Subject is selected. Show its details and UnitAccordion ---
    if (activeSubject) {
        return (
            <div className="w-full">
                {/* Back button to return to the Subject Card grid */}
                <button onClick={() => setActiveSubject(null)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 font-semibold">
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    Back to Subjects
                </button>
                <div className={wrapper}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-800">{activeSubject.title}</h1>
                            <button onClick={() => handleOpenEditSubject(activeSubject)} className="text-gray-400 hover:text-blue-600" title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
                            <button onClick={() => handleOpenDeleteSubject(activeSubject)} className="text-gray-400 hover:text-red-600" title="Delete Subject"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                             <button onClick={() => setShareContentModalOpen(true)} className="btn-primary">Share Content</button>
                             <button onClick={() => setAddUnitModalOpen(true)} className="btn-gradient-green">Add Unit</button>
                             <button onClick={() => setIsAiHubOpen(true)} className="btn-gradient-purple gap-2">
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
                            onGenerateQuiz={handleGenerateQuizForLesson}
                            isAiGenerating={isAiGenerating}
                            setIsAiGenerating={setIsAiGenerating}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW 2: A Category is selected. Show the new searchable Subject Card grid ---
    if (selectedCategory) {
        const categoryCourses = courses.filter(c => c.category === selectedCategory);
        const filteredCourses = categoryCourses.filter(course =>
            course.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="w-full">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={handleBackToCategoryList} className="flex-shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <ArrowUturnLeftIcon className="w-5 h-5 text-gray-700" />
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 truncate">{selectedCategory}</h1>
                </div>

                <div className="mb-6 sticky top-0 bg-slate-100 py-3 z-20">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={`Search in ${selectedCategory}...`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.length > 0 ? (
                        filteredCourses.map((course, index) => {
                            const { icon: Icon, color } = subjectVisuals[index % subjectVisuals.length];
                            return (
		
							<div
							    key={course.id}
							    onClick={() => setActiveSubject(course)}
							    // 1. Removed bg-white and added the gradient color directly to the card
							    className={`group relative p-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full bg-gradient-to-br ${color}`}
							>
							    {/* The decorative circle div has been removed */}
							    <div className="relative z-10">
							        {/* 2. Icon background is now semi-transparent */}
							        <div className="mb-4 p-3 bg-white/20 rounded-lg inline-block">
							            <Icon className="w-8 h-8 text-white" />
							        </div>
							        {/* 3. Text color is now white */}
							        <h2 className="text-xl font-bold text-white truncate">{course.title}</h2>
							    </div>
							    <p className="relative z-10 text-white/80 text-sm mt-2">Select to view units</p>
							</div>
                            );
                        })
                    ) : (
                        <p className="col-span-full text-center text-gray-500 py-10">No subjects found matching your search.</p>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW 3: Default view. Show the Category grid ---
    return (
        <div>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div><h1 className="text-3xl font-bold text-gray-800">Subjects</h1><p className="text-gray-500 mt-1">Manage subject categories and create new subjects.</p></div>
                <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => setCreateCategoryModalOpen(true)} className="btn-primary gap-2"><PlusCircleIcon className="w-5 h-5" />New Category</button>
                    <button onClick={() => setCreateCourseModalOpen(true)} className="btn-primary flex items-center"><PlusCircleIcon className="w-5 h-5 mr-2" />New Subject</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseCategories.map((cat, index) => {
                    const courseCount = courses.filter(c => c.category === cat.name).length;
                    const { icon: Icon, color } = subjectVisuals[index % subjectVisuals.length];
                    return (
                        <div key={cat.id} onClick={() => handleCategoryClick(cat.name)} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden">
                            <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-20 group-hover:opacity-30 transition-all duration-300`}></div>
                            <div className="relative z-10">
                                <div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div>
                                <h2 className="text-xl font-bold text-gray-800 truncate mb-1">{cat.name}</h2>
                                <p className="text-gray-500">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p>
                                <button onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 bg-transparent opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-opacity" aria-label={`Edit category ${cat.name}`}>
                                    <PencilSquareIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CoursesView;