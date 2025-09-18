import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

/**
 * A selector component for courses, fetching all courses from Firestore.
 *
 * @param {object} props - The component props.
 * @param {function} props.onCourseSelect - Callback function to be called when a course is selected.
 */
export default function CourseSelector({ onCourseSelect }) {
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState('');

    useEffect(() => {
        // Create a query to fetch all documents from the 'courses' collection
        const coursesQuery = query(collection(db, 'courses'));

        // Set up a real-time listener with onSnapshot
        const unsubscribe = onSnapshot(
            coursesQuery,
            (snapshot) => {
                const coursesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Sort courses alphabetically by title
                coursesData.sort((a, b) => {
                    if (a.title && b.title) {
                        return a.title.localeCompare(b.title);
                    }
                    return 0;
                });

                setCourses(coursesData);
                setIsLoading(false);

                // Automatically select the first course if available
                if (coursesData.length > 0) {
                    const defaultCourseId = coursesData[0].id;
                    setSelectedCourseId(defaultCourseId);
                    const selectedCourse = coursesData.find(c => c.id === defaultCourseId);
                    if (onCourseSelect) {
                        onCourseSelect(selectedCourse);
                    }
                } else {
                    setSelectedCourseId('');
                    if (onCourseSelect) {
                        onCourseSelect(null);
                    }
                }
            },
            (err) => {
                console.error("Failed to fetch courses:", err);
                setError("Failed to load courses. Please try again later.");
                setIsLoading(false);
            }
        );

        // Unsubscribe from the listener when the component unmounts
        return () => unsubscribe();
    }, [onCourseSelect]);

    const handleSelectChange = (e) => {
        const courseId = e.target.value;
        setSelectedCourseId(courseId);
        const selectedCourse = courses.find(c => c.id === courseId);
        if (onCourseSelect) {
            onCourseSelect(selectedCourse);
        }
    };

    if (isLoading) {
        return <div className="text-center p-4 text-slate-500">Loading courses...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-600">{error}</div>;
    }

    return (
        <div className="p-4 bg-white rounded-xl shadow-lg w-full">
            <h2 className="text-base font-bold text-slate-700 mb-4 border-b pb-2">Select a Subject</h2>
            {courses.length > 0 ? (
                <div>
                    <label htmlFor="course-select" className="block text-sm font-medium text-slate-600 mb-1">
                        Choose a subject:
                    </label>
                    <select
                        id="course-select"
                        value={selectedCourseId}
                        onChange={handleSelectChange}
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                    >
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <p className="text-sm text-slate-500">No subjects are currently available. Please create one first.</p>
            )}
        </div>
    );
}
