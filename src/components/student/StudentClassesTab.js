import React from 'react';
import { Card, Text } from '@tremor/react';
import { AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon, InboxIcon } from '@heroicons/react/24/solid';

const classVisuals = [
    { icon: AcademicCapIcon, color: 'from-orange-500 to-red-500' },
    { icon: UserGroupIcon, color: 'from-blue-500 to-sky-500' },
    { icon: ClipboardDocumentListIcon, color: 'from-yellow-500 to-amber-500' },
    { icon: ShieldCheckIcon, color: 'from-green-500 to-lime-500' },
];

const StudentClassCard = ({ classData, onSelect, visual }) => {
    const { icon: Icon, color } = visual;

    return (
        <Card
            onClick={() => onSelect(classData)}
            // ✅ UPDATED: Further reduced padding for a more compact card
            className="group relative p-3 sm:p-4 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className={`absolute -top-8 -right-8 w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all duration-300`}></div>
            <div className="relative z-10">
                {/* ✅ UPDATED: Smaller icon and container */}
                <div className={`p-2 inline-block bg-gradient-to-br ${color} text-white rounded-lg mb-2 shadow-sm`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                {/* ✅ UPDATED: Significantly smaller font size for the title */}
                <h3 className="text-sm sm:text-base font-bold text-gray-800 truncate">{classData.name}</h3>
                {/* ✅ UPDATED: Extra small text for details */}
                <Text className="text-xs text-gray-600">{classData.gradeLevel} - {classData.section}</Text>
                 <Text className="mt-2 text-xs text-gray-500">Teacher: {classData.teacherName}</Text>
            </div>
        </Card>
    );
};


const StudentClassesTab = ({ classes, onClassSelect }) => {
    if (!classes || classes.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <InboxIcon className="h-14 w-14 mx-auto text-gray-300" />
                <p className="mt-4 text-base font-medium text-gray-600">No classes found.</p>
                <p className="mt-1 text-xs text-gray-400">You are not enrolled in any classes yet.</p>
            </div>
        );
    }

    return (
        // ✅ UPDATED: Tighter grid spacing
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {classes.map((classData, index) => (
                <StudentClassCard
                    key={classData.id}
                    classData={classData}
                    onSelect={onClassSelect}
                    visual={classVisuals[index % classVisuals.length]}
                />
            ))}
        </div>
    );
};

export default StudentClassesTab;