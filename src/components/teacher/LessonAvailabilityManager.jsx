import React, { useState } from 'react';
import { db } from '../../services/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import DatePicker from 'react-datepicker';
import Modal from '../common/Modal';
import { Edit } from 'lucide-react';

const LessonAvailabilityManager = ({ classData, courses, onUpdate }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null);

    const handleEditClick = (lesson) => {
        setSelectedLesson(lesson);
        setIsEditModalOpen(true);
    };

    const allSharedLessons = [];
    for (const courseId in classData.courseAccess) {
        const course = courses.find(c => c.id === courseId);
        if (!course) continue;

        for (const unitId in classData.courseAccess[courseId].units) {
            const unit = course.units.find(u => u.id === unitId);
            if (!unit) continue;

            for (const lessonId in classData.courseAccess[courseId].units[unitId].lessons) {
                const lesson = unit.lessons.find(l => l.id === lessonId);
                if (!lesson) continue;

                const accessInfo = classData.courseAccess[courseId].units[unitId].lessons[lessonId];
                allSharedLessons.push({
                    ...lesson,
                    courseId,
                    unitId,
                    availableFrom: accessInfo.availableFrom.toDate(),
                    availableUntil: accessInfo.availableUntil.toDate()
                });
            }
        }
    }

    return (
        <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Shared Lesson Deadlines</h3>
            <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
                {allSharedLessons.length > 0 ? allSharedLessons.map(lesson => (
                    <div key={lesson.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                        <div>
                            <p className="font-semibold text-gray-800">{lesson.title}</p>
                            <p className="text-sm text-gray-500">
                                Due: {lesson.availableUntil.toLocaleString()}
                            </p>
                        </div>
                        <button
                            onClick={() => handleEditClick(lesson)}
                            className="p-2 rounded-full hover:bg-blue-100 text-blue-600"
                            title="Edit Due Date"
                        >
                            <Edit size={18} />
                        </button>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">No lessons have been shared with this class yet.</p>}
            </div>

            {isEditModalOpen && (
                <EditDueDateModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    lesson={selectedLesson}
                    classId={classData.id}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
};


const EditDueDateModal = ({ isOpen, onClose, lesson, classId, onUpdate }) => {
    const [availableFrom, setAvailableFrom] = useState(lesson.availableFrom);
    const [availableUntil, setAvailableUntil] = useState(lesson.availableUntil);
    const { showToast } = useToast();

    const handleUpdate = async () => {
        try {
            const classRef = doc(db, "classes", classId);
            const pathFrom = `courseAccess.${lesson.courseId}.units.${lesson.unitId}.lessons.${lesson.id}.availableFrom`;
            const pathTo = `courseAccess.${lesson.courseId}.units.${lesson.unitId}.lessons.${lesson.id}.availableUntil`;
            
            await updateDoc(classRef, {
                [pathFrom]: Timestamp.fromDate(availableFrom),
                [pathTo]: Timestamp.fromDate(availableUntil),
            });

            showToast("Lesson availability updated successfully!", "success");
            onUpdate(); // Trigger a refresh of the parent component
            onClose();
        } catch (error) {
            showToast("Failed to update availability.", "error");
            console.error(error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Availability for: ${lesson.title}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available From</label>
                    <DatePicker
                        selected={availableFrom}
                        onChange={(date) => setAvailableFrom(date)}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available Until (Due Date)</label>
                    <DatePicker
                        selected={availableUntil}
                        onChange={(date) => setAvailableUntil(date)}
                        showTimeSelect
                        dateFormat="MMMM d, yyyy h:mm aa"
                        className="w-full p-2 border rounded-md"
                    />
                </div>
                <button
                    onClick={handleUpdate}
                    className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Save Changes
                </button>
            </div>
        </Modal>
    );
};


export default LessonAvailabilityManager;