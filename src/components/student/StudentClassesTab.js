import React from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';

const StudentClassesTab = ({ classes, onClassSelect }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">My Classes</h2>
            {classes && classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((classItem) => (
                        <button
                            key={classItem.id}
                            onClick={() => onClassSelect(classItem)}
                            className="bg-white/80 p-6 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all text-left"
                        >
                            <div className="flex items-center mb-3">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4">
                                    <AcademicCapIcon className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 truncate">{classItem.name}</h3>
                                    <p className="text-sm text-gray-500">{classItem.gradeLevel} - {classItem.section}</p>
                                </div>
                            </div>
                            {classItem.classCode && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">Code: </span>
                                    <span className="font-mono text-sm text-gray-600">{classItem.classCode}</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">You haven't joined any classes yet.</p>
                    <p className="text-sm text-gray-400 mt-2">Use the "Join a Class" button to get started.</p>
                </div>
            )}
        </div>
    );
};

export default StudentClassesTab;