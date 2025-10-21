import React from 'react';
import { Card, Title, Text, Badge } from '@tremor/react';
import { BookOpenIcon, AcademicCapIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const LessonListItem = ({ lesson, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="group flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-sky-50 hover:border-sky-300 cursor-pointer transition-all duration-200 ease-in-out"
        >
            <div className="flex items-center gap-4 text-left min-w-0"> {/* Added min-w-0 to the parent */}
                <BookOpenIcon className="h-7 w-7 text-sky-500 flex-shrink-0" />
                <div className="flex-1 min-w-0"> {/* Added min-w-0 here as well */}
                    {/* ✅ FIXED: Added 'truncate' class to prevent title from overflowing */}
                    <p className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-sky-800 truncate">{lesson.title}</p>
                    {lesson.className && (
                        <Badge className="mt-1 bg-gray-100 text-gray-700 border-gray-200 font-medium" size="sm">
                            For: {lesson.className}
                        </Badge>
                    )}
                </div>
            </div>
            <ChevronRightIcon className="h-6 w-6 text-gray-400 ml-4 flex-shrink-0 group-hover:text-sky-600" />
        </div>
    );
};

const StudentLessonsTab = ({ lessons, onLessonSelect }) => {
    return (
        <Card className="max-w-full mx-auto p-4 sm:p-6 rounded-3xl shadow-xl border border-gray-100 bg-gradient-to-br from-white to-sky-50/50">
            <div className="flex items-center gap-3 mb-4">
                <AcademicCapIcon className="h-8 w-8 text-sky-600" />
                <Title className="text-2xl sm:text-3xl font-extrabold text-gray-800">My Lessons</Title>
            </div>
            <Text className="text-gray-600 mb-8 max-w-2xl">
                Explore all the lessons shared by your teachers across all your enrolled classes.
            </Text>

            {lessons && lessons.length > 0 ? (
                <div className="space-y-4">
                    {lessons.map(lesson => (
                        <LessonListItem
                            key={lesson.id}
                            lesson={lesson}
                            onClick={() => onLessonSelect(lesson)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center shadow-inner">
                    <BookOpenIcon className="h-16 w-16 text-gray-300 mb-6" />
                    <Text className="text-lg sm:text-xl text-gray-500 font-semibold mb-2">
                        No lessons assigned yet!
                    </Text>
                    <Text className="text-sm sm:text-base text-gray-400">
                        When your teachers assign lessons, they will appear here.
                    </Text>
                </div>
            )}
        </Card>
    );
};

export default StudentLessonsTab;
