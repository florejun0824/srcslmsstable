import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import TeacherCourseView from './TeacherCourseView';
import EditCourseModal from '../common/EditCourseModal';
import { MoreVertical, BookOpen } from 'lucide-react';

// --- UPDATED: It now accepts courseCategories as a prop ---
const CategoryDetailView = ({ category, courses, classes, courseCategories, onBack }) => {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isEditCourseModalOpen, setEditCourseModalOpen] = useState(false);
    const [courseToEdit, setCourseToEdit] = useState(null);
    const { showToast } = useToast();
    
    useEffect(() => {
        if (courses.length > 0 && !selectedCourse) {
            setSelectedCourse(courses[0]);
        } else if (selectedCourse) {
            const updatedSelected = courses.find(c => c.id === selectedCourse.id);
            setSelectedCourse(updatedSelected || (courses.length > 0 ? courses[0] : null));
        } else {
            setSelectedCourse(null);
        }
    }, [courses, selectedCourse]);

    const handleEditCourse = async (courseId, newTitle, newCategory) => {
        if (!courseId) return;
        try {
            await updateDoc(doc(db, "courses", courseId), { title: newTitle, category: newCategory });
            showToast("Subject updated successfully!");
            setEditCourseModalOpen(false);
            // The main dashboard will automatically show the change.
        } catch(error) {
            showToast("Failed to update subject.", 'error');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 flex overflow-hidden">
                <aside className="w-1/3 md:w-1/4 bg-white/50 backdrop-blur-lg border-r border-white/30 rounded-l-2xl p-4 overflow-y-auto hidden md:block">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-800 truncate">{category}</h2>
                        <button onClick={onBack} className="text-sm text-blue-600 hover:underline">Back</button>
                    </div>
                    {courses.length > 0 ? courses.map(course => (
                        <div key={course.id} className={`p-3 rounded-lg mb-2 cursor-pointer group relative flex justify-between items-center ${selectedCourse?.id === course.id ? 'bg-blue-500 text-white shadow' : 'hover:bg-black/5'}`} onClick={() => setSelectedCourse(course)}>
                            <p className="font-semibold text-sm truncate pr-8">{course.title}</p>
                            <button onClick={(e) => { e.stopPropagation(); setCourseToEdit(course); setEditCourseModalOpen(true)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/50 opacity-0 group-hover:opacity-100">
                                <MoreVertical size={14}/>
                            </button>
                        </div>
                    )) : <p className="text-gray-500 text-sm p-4">No subjects in this category.</p>}
                </aside>
                
                <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto">
                    {selectedCourse ? (
                        <TeacherCourseView key={selectedCourse.id} course={selectedCourse} classes={classes} />
                    ) : (
                        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 text-center text-gray-500 h-full flex flex-col justify-center items-center">
                            <BookOpen size={48} className="text-gray-400 mb-4"/>
                            <p className="font-semibold">Select a subject to manage its content.</p>
                        </div>
                    )}
                </main>
            </div>
            {/* --- UPDATED: The modal now receives the list of categories --- */}
            <EditCourseModal 
                isOpen={isEditCourseModalOpen} 
                onClose={() => setEditCourseModalOpen(false)} 
                onEditCourse={handleEditCourse} 
                course={courseToEdit}
                courseCategories={courseCategories}
            />
        </div>
    );
};

export default CategoryDetailView;