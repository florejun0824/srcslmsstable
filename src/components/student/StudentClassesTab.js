import React from 'react';
import { Text } from '@tremor/react';
import { AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon, InboxIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const classVisuals = [
    { icon: AcademicCapIcon, color: 'text-orange-500', glow: 'hover:shadow-orange-500/20', bg: 'bg-orange-100' },
    { icon: UserGroupIcon, color: 'text-blue-500', glow: 'hover:shadow-blue-500/20', bg: 'bg-blue-100' },
    { icon: ClipboardDocumentListIcon, color: 'text-yellow-500', glow: 'hover:shadow-yellow-500/20', bg: 'bg-yellow-100' },
    { icon: ShieldCheckIcon, color: 'text-green-500', glow: 'hover:shadow-green-500/20', bg: 'bg-green-100' },
];

const StudentClassCard = ({ classData, onSelect, visual }) => {
    const { icon: Icon, color, glow, bg } = visual;

    return (
        <div
            onClick={() => onSelect(classData)}
            // NOTE: Styling for individual cards is excellent. The floating effect on hover is perfect. No major changes needed here.
            className={`group bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm ${glow} hover:border-red-400/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between`}
        >
            <div>
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg mb-4 ${bg}`}>
                    <Icon className={`w-7 h-7 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 truncate">{classData.name}</h3>
                <Text className="text-sm text-slate-500">{classData.gradeLevel} - {classData.section}</Text>
            </div>
            <Text className="mt-4 text-xs text-slate-400">Teacher: {classData.teacherName}</Text>
        </div>
    );
};

const StudentClassesTab = ({ classes, onClassSelect }) => {
    // Renders if the user has no classes
    if (!classes || classes.length === 0) {
        return (
            <div className="text-center py-20 px-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <InboxIcon className="h-16 w-16 mx-auto text-slate-300" />
                <p className="mt-5 text-lg font-semibold text-slate-600">No classes found.</p>
                <p className="mt-1 text-sm text-slate-400">You are not enrolled in any classes yet.</p>
            </div>
        );
    }

    // Renders the grid of classes. The container and title are now handled by the parent component (StudentDashboardUI).
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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