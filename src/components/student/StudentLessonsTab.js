import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId } from 'firebase/firestore';
import ViewLessonModal from '../teacher/ViewLessonModal';
import Spinner from '../common/Spinner';

const StudentLessonsTab = ({ classes }) => {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewLessonData, setViewLessonData] = useState(null);

    useEffect(() => {
        const fetchSharedLessons = async () => {
            if (classes.length === 0) {
                setLoading(false);
                return;
            }
            setLoading(true);

            try {
                const lessonToClassesMap = new Map();

                const postPromises = classes.map(c => 
                    getDocs(query(collection(db, `classes/${c.id}/posts`))).then(snapshot => ({ snapshot, className: c.name }))
                );
                const classPostSnapshots = await Promise.all(postPromises);

                classPostSnapshots.forEach(({ snapshot, className }) => {
                    snapshot.forEach(doc => {
                        const postData = doc.data();
                        if (postData.lessonIds) {
                            postData.lessonIds.forEach(lessonId => {
                                if (!lessonToClassesMap.has(lessonId)) {
                                    lessonToClassesMap.set(lessonId, { classes: [] });
                                }
                                lessonToClassesMap.get(lessonId).classes.push(className);
                            });
                        }
                    });
                });

                const uniqueLessonIds = Array.from(lessonToClassesMap.keys());

                if (uniqueLessonIds.length > 0) {
                    const lessonsQuery = query(collection(db, 'lessons'), where(documentId(), 'in', uniqueLessonIds));
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    lessonsSnapshot.forEach(doc => {
                        lessonToClassesMap.get(doc.id).lessonData = { id: doc.id, ...doc.data() };
                    });

                    const finalLessonList = [];
                    lessonToClassesMap.forEach(value => {
                        if (value.lessonData) { // Ensure lessonData exists
                            value.classes.forEach(className => {
                                finalLessonList.push({
                                    ...value.lessonData,
                                    uniqueId: `${value.lessonData.id}-${className}`,
                                    context: `(for ${className})`
                                });
                            });
                        }
                    });
                    setLessons(finalLessonList);
                }
            } catch (error) {
                console.error("Error fetching shared lessons:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedLessons();
    }, [classes]);

    if (loading) return <Spinner />;

    return (
        <>
            <div className="bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-lg">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">My Lessons</h1>
                {lessons.length > 0 ? (
                    <ul className="space-y-3">
                        {lessons.map(lesson => (
                            <li 
                                key={lesson.uniqueId} 
                                onClick={() => setViewLessonData(lesson)}
                                className="p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                            >
                                {lesson.title} <span className="text-sm text-gray-500">{lesson.context}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center p-8 text-gray-500">No lessons have been assigned to you yet.</p>}
            </div>
            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
        </>
    );
};

export default StudentLessonsTab;