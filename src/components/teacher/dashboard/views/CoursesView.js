import React, { useState, useEffect } from 'react';
import UnitAccordion from '../../UnitAccordion';
import {
    PencilSquareIcon, TrashIcon, PlusCircleIcon, ArrowUturnLeftIcon, SparklesIcon,
    BookOpenIcon, CalculatorIcon, BeakerIcon, GlobeAltIcon, ComputerDesktopIcon,
    PaintBrushIcon, UserGroupIcon, CodeBracketIcon, MusicalNoteIcon, WrenchScrewdriverIcon, 
    MagnifyingGlassIcon,
    UsersIcon as LearnerIcon,
    AcademicCapIcon as TeacherIcon
} from '@heroicons/react/24/outline';

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
        onAddSubjectClick
    } = props;

    const [searchTerm, setSearchTerm] = useState('');
    const [activeContentGroup, setActiveContentGroup] = useState(null);

    useEffect(() => {
        setActiveContentGroup(null);
        handleBackToCategoryList();
        setActiveSubject(null);
        if (onSetActiveUnit) {
            onSetActiveUnit(null);
        }
    }, [activeView]);

    const wrapper = "bg-white/70 backdrop-blur-md border border-white/30 p-4 sm:p-6 rounded-xl shadow";
    
    // Original defaultSubjectVisuals (kept for fallback/reference if needed, but colors now separate)
    const defaultSubjectVisuals = [
        { icon: BookOpenIcon, color: 'from-sky-500 to-indigo-500' }, 
        { icon: CalculatorIcon, color: 'from-green-500 to-emerald-500' },
        { icon: BeakerIcon, color: 'from-violet-500 to-purple-500' }, 
        { icon: GlobeAltIcon, color: 'from-rose-500 to-pink-500' },
        { icon: ComputerDesktopIcon, color: 'from-slate-600 to-slate-800' }, 
        { icon: PaintBrushIcon, color: 'from-amber-500 to-orange-500' },
        { icon: UserGroupIcon, color: 'from-teal-500 to-cyan-500' }, 
        { icon: CodeBracketIcon, color: 'from-gray-700 to-gray-900' },
        { icon: MusicalNoteIcon, color: 'from-fuchsia-500 to-purple-600' },
        { icon: SparklesIcon, color: 'from-yellow-400 to-orange-500' } 
    ];

    // ✅ NEW: Expanded set of gradient colors for more variation
    const availableGradients = [
        'from-sky-500 to-indigo-500', // Blue-Indigo
        'from-green-500 to-emerald-500', // Green-Emerald
        'from-violet-500 to-purple-500', // Violet-Purple
        'from-rose-500 to-pink-500', // Rose-Pink
        'from-amber-500 to-orange-500', // Amber-Orange
        'from-teal-500 to-cyan-500', // Teal-Cyan
        'from-red-500 to-orange-500', // Red-Orange
        'from-blue-500 to-purple-600', // Blue-Purple
        'from-fuchsia-500 to-pink-600', // Fuchsia-Pink
        'from-lime-500 to-green-600', // Lime-Green
        'from-indigo-500 to-blue-600', // Indigo-Blue
        'from-yellow-500 to-amber-500', // Yellow-Amber
        'from-slate-600 to-gray-800', // Dark Slate-Gray
    ];

    // MODIFIED: Dynamically get icon and color based on subject title AND unique ID
    const getSubjectIconAndColor = (subjectTitle, itemIdentifier) => {
        const lowerCaseTitle = subjectTitle.toLowerCase();
        let IconComponent = BookOpenIcon; // Default icon

        // Determine Icon based on title content
        if (lowerCaseTitle.includes('math') || lowerCaseTitle.includes('mathematics') || lowerCaseTitle.includes('algebra') || lowerCaseTitle.includes('geometry') || lowerCaseTitle.includes('calculus')) {
            IconComponent = CalculatorIcon;
        } else if (lowerCaseTitle.includes('english') || lowerCaseTitle.includes('filipino') || lowerCaseTitle.includes('literature') || lowerCaseTitle.includes('language')) {
            IconComponent = BookOpenIcon;
        } else if (lowerCaseTitle.includes('religious education') || lowerCaseTitle.includes('christian social living') || lowerCaseTitle.includes('religion') || lowerCaseTitle.includes('values')) {
            IconComponent = BookOpenIcon; // Using BookOpenIcon as a general learning icon for religious studies
        } else if (lowerCaseTitle.includes('science') || lowerCaseTitle.includes('biology') || lowerCaseTitle.includes('chemistry') || lowerCaseTitle.includes('physics')) {
            IconComponent = BeakerIcon;
        } else if (lowerCaseTitle.includes('araling panlipunan') || lowerCaseTitle.includes('history') || lowerCaseTitle.includes('geography') || lowerCaseTitle.includes('social studies')) {
            IconComponent = GlobeAltIcon;
        } else if (lowerCaseTitle.includes('mapeh') || lowerCaseTitle.includes('music') || lowerCaseTitle.includes('arts') || lowerCaseTitle.includes('pe') || lowerCaseTitle.includes('health')) {
            IconComponent = MusicalNoteIcon;
        } else if (lowerCaseTitle.includes('tle') || lowerCaseTitle.includes('technology') || lowerCaseTitle.includes('livelihood') || lowerCaseTitle.includes('tools') || lowerCaseTitle.includes('home economics')) {
            IconComponent = WrenchScrewdriverIcon;
        } else {
            // If no specific match, use a generic icon (e.g., SparklesIcon from default visuals)
            IconComponent = defaultSubjectVisuals[0].icon; // Or you can cycle for generic too
        }
        
        // Always determine color based on itemIdentifier for variation
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
            <div className="w-full">
                <button onClick={() => {
                    setActiveSubject(null);
                    if (onSetActiveUnit) {
                       onSetActiveUnit(null);
                    }
                }} className="btn-secondary mb-4 gap-2">
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                    Back to Subjects
                </button>
                 <div className={wrapper}>
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                         <div className="flex items-center gap-3">
                             <h1 className="text-2xl font-bold text-gray-800">{activeSubject.title}</h1>
                             {/* The edit button for activeSubject is already here */}
                             <button onClick={() => handleOpenEditSubject(activeSubject)} className="text-gray-400 hover:text-primary-600" title="Edit Subject Name"><PencilSquareIcon className="w-5 h-5" /></button>
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
                             activeUnit={activeUnit}
                             onSetActiveUnit={onSetActiveUnit}
                         />
                     </div>
                 </div>
            </div>
        );
    }

    if (selectedCategory) {
        const categoryCourses = courses.filter(c => c.category === selectedCategory);
        
        // Use localeCompare with numeric: true for natural sorting
        categoryCourses.sort((a, b) => 
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
        ); 
        
        const filteredCourses = categoryCourses.filter(course =>
            course.title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBackToCategoryList} className="flex-shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors">
                            <ArrowUturnLeftIcon className="w-5 h-5 text-gray-700" />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800 truncate">{selectedCategory}</h1>
                    </div>
                    {/* Call onAddSubjectClick with the selectedCategory.name */}
                    <button 
                        onClick={() => {
                            if (onAddSubjectClick) {
                                onAddSubjectClick(selectedCategory);
                            }
                        }} 
                        className="btn-primary gap-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Subject
                    </button>
                </div>

                <div className="mb-6 sticky top-0 bg-slate-100 py-3 z-20">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder={`Search in ${selectedCategory}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.length > 0 ? (
                        filteredCourses.map((course, index) => {
                            // MODIFIED: Get icon and color dynamically based on title and ID
                            const { icon: Icon, color } = getSubjectIconAndColor(course.title, course.id); 
                            return (
                                <div key={course.id} onClick={() => setActiveSubject(course)} className={`group relative p-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-full bg-gradient-to-br ${color}`}>
                                    <div className="relative z-10">
                                        <div className="mb-4 p-3 bg-white/20 rounded-lg inline-block"><Icon className="w-8 h-8 text-white" /></div>
                                        <h2 className="text-lg font-bold text-white">{course.title}</h2>
                                    </div>
                                    <p className="relative z-10 text-white/80 text-sm mt-2">Select to view units</p>
                                    
                                    {/* Pencil icon on each subject card */}
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); // Prevent card click from propagating
                                            handleOpenEditSubject(course); 
                                        }} 
                                        className="absolute top-3 right-3 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20" 
                                        title="Edit Subject Name"
                                    >
                                        <PencilSquareIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })
                    ) : ( <p className="col-span-full text-center text-gray-500 py-10">No subjects found matching your search.</p> )}
                </div>
            </div>
        );
    }

    if (activeContentGroup) {
        const teacherCategories = courseCategories.filter(cat => cat.name.toLowerCase().includes("teach"));
        const learnerCategories = courseCategories.filter(cat => !cat.name.toLowerCase().includes("teach"));
        const categoriesToShow = activeContentGroup === 'Learner' ? learnerCategories : teacherCategories;
        
        // Sort categories alphabetically by name
        categoriesToShow.sort((a, b) => a.name.localeCompare(b.name));

        return (
            <div>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveContentGroup(null)} className="flex-shrink-0 p-2 rounded-full hover:bg-gray-200 transition-colors" title="Back to Content Types">
                            <ArrowUturnLeftIcon className="w-5 h-5 text-gray-700" />
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800 truncate">{activeContentGroup}'s Content</h1>
                    </div>
                    <button
                        onClick={() => setCreateCategoryModalOpen(true)}
                        className="btn-primary gap-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Add Category
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoriesToShow.map((cat, index) => {
                        const courseCount = courses.filter(c => c.category === cat.name).length;
                        // MODIFIED: Get icon and color dynamically for category cards too
                        const { icon: Icon, color } = getSubjectIconAndColor(cat.name, cat.id); 
                        return (
                            <div key={cat.id} onClick={() => handleCategoryClick(cat.name)} className="group relative p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden">
                                <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-20 group-hover:opacity-30 transition-all`}></div>
                                <div className="relative z-10">
                                    <div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4`}><Icon className="w-8 h-8" /></div>
                                    <h2 className="text-lg font-bold text-gray-800 mb-1">{cat.name}</h2>
                                    <p className="text-gray-500">{courseCount} {courseCount === 1 ? 'Subject' : 'Subjects'}</p>
                                    
                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} 
                                            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800" 
                                            title={`Edit category ${cat.name}`}
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                handleInitiateDelete('category', cat.id, cat.name); 
                                            }} 
                                            className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600" 
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
        )
    }

    return (
        <div>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div><h1 className="text-3xl font-bold text-gray-800">Content Type</h1><p className="text-gray-500 mt-1">Select a content type to view its categories.</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div onClick={() => setActiveContentGroup('Learner')} className="group relative p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex items-center bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                    <LearnerIcon className="w-24 h-24 absolute -right-6 -bottom-6 opacity-10" />
                    {/* Removed the extra wrapper `div` to fix the layout */}
                    <div>
                        <div className="p-4 bg-white/20 rounded-lg inline-block mb-4"><LearnerIcon className="w-10 h-10" /></div>
                        <h2 className="text-3xl font-bold">Learner's Content</h2>
                        <p className="text-white/80">Access all student-facing materials and subjects.</p>
                    </div>
                </div>
                <div onClick={() => setActiveContentGroup('Teacher')} className="group relative p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden flex items-center bg-gradient-to-br from-purple-500 to-violet-600 text-white">
                    <TeacherIcon className="w-24 h-24 absolute -right-6 -bottom-6 opacity-10" />
                    {/* Removed the extra wrapper `div` to fix the layout */}
                    <div>
                        <div className="p-4 bg-white/20 rounded-lg inline-block mb-4"><TeacherIcon className="w-10 h-10" /></div>
                        <h2 className="text-3xl font-bold">Teacher's Content</h2>
                        <p className="text-white/80">Access all teacher guides and resources.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoursesView;
