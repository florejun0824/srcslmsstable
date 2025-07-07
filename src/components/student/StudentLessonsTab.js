import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId } from 'firebase/firestore';
import ViewLessonModal from '../teacher/ViewLessonModal'; // Assuming this modal is suitable for students to view
import Spinner from '../common/Spinner';
import { Card, Title, Text, List, ListItem, Badge } from '@tremor/react';
import { BookOpenIcon, ChevronRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline'; // New icons!

const StudentLessonsTab = ({ classes }) => {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewLessonData, setViewLessonData] = useState(null);

    useEffect(() => {
        const fetchSharedLessons = async () => {
            if (!classes || classes.length === 0) {
                setLoading(false);
                setLessons([]);
                return;
            }
            setLoading(true);
            setLessons([]);

            try {
                const lessonToClassesMap = new Map();

                const classPostPromises = classes.map(async (c) => {
                    const snapshot = await getDocs(query(collection(db, `classes/${c.id}/posts`)));
                    return { snapshot, className: c.name };
                });

                const classPostSnapshots = await Promise.all(classPostPromises);

                classPostSnapshots.forEach(({ snapshot, className }) => {
                    snapshot.forEach(doc => {
                        const postData = doc.data();
                        if (postData.lessonIds && Array.isArray(postData.lessonIds)) {
                            postData.lessonIds.forEach(lessonId => {
                                if (!lessonToClassesMap.has(lessonId)) {
                                    lessonToClassesMap.set(lessonId, { classes: new Set() });
                                }
                                lessonToClassesMap.get(lessonId).classes.add(className);
                            });
                        }
                    });
                });

                const uniqueLessonIds = Array.from(lessonToClassesMap.keys());

                if (uniqueLessonIds.length > 0) {
                    const fetchPromises = [];
                    for (let i = 0; i < uniqueLessonIds.length; i += 10) {
                        const chunk = uniqueLessonIds.slice(i, i + 10);
                        fetchPromises.push(getDocs(query(collection(db, 'lessons'), where(documentId(), 'in', chunk))));
                    }
                    const lessonSnapshots = await Promise.all(fetchPromises);

                    lessonSnapshots.forEach(snapshot => {
                        snapshot.forEach(doc => {
                            if (lessonToClassesMap.has(doc.id)) {
                                lessonToClassesMap.get(doc.id).lessonData = { id: doc.id, ...doc.data() };
                            }
                        });
                    });

                    const finalLessonList = [];
                    lessonToClassesMap.forEach((value, lessonId) => {
                        if (value.lessonData) {
                            const classContext = Array.from(value.classes).sort().join(', ');
                            finalLessonList.push({
                                ...value.lessonData,
                                id: lessonId,
                                context: classContext ? `from: ${classContext}` : ''
                            });
                        }
                    });
                    setLessons(finalLessonList);
                } else {
                    setLessons([]);
                }
            } catch (error) {
                console.error("Error fetching shared lessons:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedLessons();
    }, [classes]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Spinner />
                <Text className="ml-2 text-gray-600">Loading your lessons...</Text>
            </div>
        );
    }

    return (
        <>
            <Card className="max-w-full mx-auto p-4 md:p-6 rounded-2xl shadow-lg border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                    <AcademicCapIcon className="h-8 w-8 text-blue-600" /> {/* New header icon */}
                    <Title className="text-xl md:text-2xl font-extrabold text-gray-800">My Assigned Lessons</Title>
                </div>
                <Text className="text-gray-600 mb-6">Explore the lessons shared by your teachers across your enrolled classes.</Text>

                {lessons.length > 0 ? (
                    <List className="space-y-4"> {/* Increased spacing */}
                        {lessons.map(lesson => (
                            <ListItem
                                key={lesson.id}
                                className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200 ease-in-out"
                                onClick={() => setViewLessonData(lesson)}
                            >
                                <div className="flex items-center gap-3 text-left mb-2 md:mb-0">
                                    <BookOpenIcon className="h-6 w-6 text-indigo-500 flex-shrink-0" /> {/* Icon for each lesson */}
                                    <div>
                                        <Text className="text-lg font-semibold text-gray-800">{lesson.title}</Text>
                                        {lesson.context && (
                                            <Badge className="mt-1 mr-auto bg-blue-100 text-blue-800 border-blue-200" size="sm">
                                                {lesson.context}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <ChevronRightIcon className="h-6 w-6 text-gray-400 ml-auto md:ml-4 flex-shrink-0" /> {/* Chevron icon */}
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                        <BookOpenIcon className="h-12 w-12 text-gray-400 mb-4" /> {/* Icon for empty state */}
                        <Text className="text-lg text-gray-500 font-medium">
                            No lessons have been assigned to you yet.
                        </Text>
                        <Text className="text-md text-gray-400 mt-2">
                            Please check with your teachers or refresh the page later.
                        </Text>
                    </div>
                )}
            </Card>

            <ViewLessonModal isOpen={!!viewLessonData} onClose={() => setViewLessonData(null)} lesson={viewLessonData} />
        </>
    );
};

export default StudentLessonsTab;