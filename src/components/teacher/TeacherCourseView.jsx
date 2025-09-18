import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import AddUnitModal from './AddUnitModal';
import EditUnitModal from './EditUnitModal';
import LessonFormModal from './LessonFormModal';
import LessonDetailModal from './LessonDetailModal';
import ShareMultipleLessonsModal from './ShareMultipleLessonsModal';
import DeleteLessonModal from './DeleteLessonModal';
import { Trash2 } from 'lucide-react';

const TeacherCourseView = ({ course, classes }) => {
    const [currentCourse, setCurrentCourse] = useState(course);
    const [isUnitModalOpen, setUnitModalOpen] = useState(false);
    const [isLessonModalOpen, setLessonModalOpen] = useState(false);
    const [isEditLessonModalOpen, setEditLessonModalOpen] = useState(false);
    const [isShareModalOpen, setShareModalOpen] = useState(false);
    const [isLessonDetailOpen, setLessonDetailOpen] = useState(false);
    const [isEditUnitModalOpen, setEditUnitModalOpen] = useState(false);
    const [isDeleteLessonModalOpen, setDeleteLessonModalOpen] = useState(false);
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [unitToEdit, setUnitToEdit] = useState(null);
    const [collapsedUnits, setCollapsedUnits] = useState({});
    const [lessonToEdit, setLessonToEdit] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedLessonForDetail, setSelectedLessonForDetail] = useState(null);
    const { showToast } = useToast();

    const refreshCourse = async () => {
        const courseRef = doc(db, "courses", course.id);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
            setCurrentCourse({ id: courseSnap.id, ...courseSnap.data() });
        }
    };

    const toggleUnit = (unitId) => setCollapsedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));

    const handleOpenDeleteModal = (e, lesson, unitId) => {
        e.stopPropagation();
        setLessonToDelete({ ...lesson, unitId });
        setDeleteLessonModalOpen(true);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{currentCourse.title}</h2>
                <div className="flex space-x-2">
                    <button onClick={() => setShareModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm">Share Content</button>
                    <button onClick={() => setUnitModalOpen(true)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm">Add Unit</button>
                </div>
            </div>
            
            <div className="space-y-4">
                {currentCourse.units?.length > 0 ? currentCourse.units.map(unit => (
                    <div key={unit.id} className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleUnit(unit.id)}>
                            <h4 className="font-semibold text-lg text-gray-700">{unit.title}</h4>
                            <div className="flex items-center space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); setUnitToEdit(unit); setEditUnitModalOpen(true); }} className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-400 transition-colors">Edit</button>
                                <span className="text-gray-500">{collapsedUnits[unit.id] ? '►' : '▼'}</span>
                            </div>
                        </div>
                        {!collapsedUnits[unit.id] && (
                            <div className="mt-3">
                                <button onClick={() => { setSelectedUnit(unit); setLessonModalOpen(true); }} className="text-sm bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors mb-3">Add Lesson</button>
                                <div className="space-y-2">
                                    {unit.lessons?.length > 0 ? unit.lessons.map(lesson => (
                                        <div key={lesson.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-white hover:bg-gray-100 transition-colors group">
                                            <p className="text-gray-700 cursor-pointer flex-grow" onClick={() => { setSelectedLessonForDetail({ ...lesson, unitId: unit.id, courseId: course.id }); setLessonDetailOpen(true); }}>{lesson.title}</p>
                                            <button onClick={(e) => handleOpenDeleteModal(e, lesson, unit.id)} className="p-1 rounded-full text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Lesson">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 pl-4">No lessons in this unit yet.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )) : <p className="text-gray-500 text-center py-8">No units in this subject yet. Add one to get started!</p>}
            </div>

            <AddUnitModal isOpen={isUnitModalOpen} onClose={() => setUnitModalOpen(false)} courseId={course.id} onUnitAdded={refreshCourse} />
            <EditUnitModal isOpen={isEditUnitModalOpen} onClose={() => setEditUnitModalOpen(false)} unit={unitToEdit} courseId={course.id} onUnitEdited={refreshCourse} />
            {selectedUnit && <LessonFormModal isOpen={isLessonModalOpen} onClose={() => setLessonModalOpen(false)} courseId={course.id} unitId={selectedUnit.id} onFormSubmit={refreshCourse} title="Add New Lesson" />}
            {isLessonDetailOpen && <LessonDetailModal isOpen={isLessonDetailOpen} onClose={() => setLessonDetailOpen(false)} lesson={selectedLessonForDetail} onEditRequest={(lessonData) => { setLessonToEdit(lessonData); setEditLessonModalOpen(true); }} onCourseUpdated={refreshCourse} />}
            {lessonToEdit && <LessonFormModal isOpen={isEditLessonModalOpen} onClose={() => setEditLessonModalOpen(false)} courseId={course.id} unitId={lessonToEdit.unitId} initialData={lessonToEdit} onFormSubmit={refreshCourse} title="Edit Lesson" />}
            {isShareModalOpen && <ShareMultipleLessonsModal isOpen={isShareModalOpen} onClose={() => setShareModalOpen(false)} course={currentCourse} classes={classes} />}
            <DeleteLessonModal isOpen={isDeleteLessonModalOpen} onClose={() => setDeleteLessonModalOpen(false)} lesson={lessonToDelete} courseId={course.id} onLessonDeleted={refreshCourse} />
        </div>
    );
};

export default TeacherCourseView;