import React from 'react';
import { Text } from '@tremor/react';
import { 
    AcademicCapIcon, 
    UserGroupIcon, 
    ClipboardDocumentListIcon, 
    ShieldCheckIcon, 
    InboxIcon, 
    ArrowRightIcon,
} from '@heroicons/react/24/solid';

const classVisuals = [
    { icon: AcademicCapIcon, color: 'text-orange-500' },
    { icon: UserGroupIcon, color: 'text-blue-500' },
    { icon: ClipboardDocumentListIcon, color: 'text-yellow-500' },
    { icon: ShieldCheckIcon, color: 'text-green-500' },
];

const StudentClassCard = ({ classData, onSelect, visual }) => {
    const { icon: Icon, color } = visual;

    return (
        <div
            className="group bg-neumorphic-base p-3 rounded-lg shadow-neumorphic hover:shadow-neumorphic-inset 
                       hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
        >
            <div className="flex items-center gap-3">
                {/* Small icon */}
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-neumorphic-base shadow-neumorphic-inset">
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                {/* Class name on same row */}
                <h3 className="text-sm font-bold text-slate-800 truncate flex-1">
                    {classData.name}
                </h3>
            </div>

            {/* Details */}
            <Text className="mt-2 text-xs text-slate-500 truncate">
                {classData.gradeLevel} - {classData.section}
            </Text>
            <Text className="text-[11px] text-slate-400 truncate">
                Teacher: {classData.teacherName}
            </Text>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between">
                <button
                    onClick={() => onSelect(classData)}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                    <span>View</span>
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </button>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neumorphic-base shadow-neumorphic-inset text-slate-600">
                    {classData.lessonsCount || classData.lessons?.length || 0} Lessons
                </span>
            </div>
        </div>
    );
};

const StudentClassesTab = ({ classes, onClassSelect }) => {
    if (!classes || classes.length === 0) {
        return (
            <div className="text-center py-12 px-4 bg-neumorphic-base rounded-lg shadow-neumorphic">
                <InboxIcon className="h-12 w-12 mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-600">No classes found.</p>
                <p className="mt-1 text-xs text-slate-400">You are not enrolled in any classes yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
