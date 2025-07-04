import React from 'react';
import { Card, Text } from '@tremor/react';
import { AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

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
            className="group relative p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all duration-300`}></div>
            <div className="relative z-10">
                <div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4 shadow-md`}>
                    <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 truncate mb-1">{classData.name}</h3>
                <Text>{classData.gradeLevel} - {classData.section}</Text>
                 <Text className="mt-4">Teacher: {classData.teacherName}</Text>
            </div>
        </Card>
    );
};


const StudentClassesTab = ({ classes, onClassSelect }) => {
    if (!classes || classes.length === 0) {
        return (
            <div className="text-center py-10">
                <Text>You are not enrolled in any classes yet.</Text>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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