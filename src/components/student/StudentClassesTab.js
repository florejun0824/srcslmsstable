import React from 'react';
import { Text } from '@tremor/react';
import { 
    AcademicCapIcon, 
    UserGroupIcon, 
    ClipboardDocumentListIcon, 
    ShieldCheckIcon, 
    InboxIcon, 
    ArrowRightIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/solid';

const classVisuals = [
    { icon: AcademicCapIcon, color: 'text-orange-500', glow: 'hover:shadow-orange-500/20', bg: 'bg-orange-100' },
    { icon: UserGroupIcon, color: 'text-blue-500', glow: 'hover:shadow-blue-500/20', bg: 'bg-blue-100' },
    { icon: ClipboardDocumentListIcon, color: 'text-yellow-500', glow: 'hover:shadow-yellow-500/20', bg: 'bg-yellow-100' },
    { icon: ShieldCheckIcon, color: 'text-green-500', glow: 'hover:shadow-green-500/20', bg: 'bg-green-100' },
];

const StudentClassCard = ({ classData, onSelect, visual, onDownloadPacket }) => {
    const { icon: Icon, color, glow, bg } = visual;

    return (
        <div
            className={`group bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm ${glow} hover:border-red-400/50 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between`}
        >
            <div>
                <div className={`w-12 h-12 flex items-center justify-center rounded-lg mb-4 ${bg}`}>
                    <Icon className={`w-7 h-7 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 truncate">{classData.name}</h3>
                <Text className="text-sm text-slate-500">{classData.gradeLevel} - {classData.section}</Text>
                <Text className="mt-4 text-xs text-slate-400">Teacher: {classData.teacherName}</Text>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDownloadPacket(classData.id);
                    }}
                    title="Download for Offline Use"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Offline
                </button>
                <button
                    onClick={() => onSelect(classData)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                    <span>View Class</span>
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </button>
            </div>
        </div>
    );
};

const StudentClassesTab = ({ classes, onClassSelect, onDownloadPacket }) => {
    if (!classes || classes.length === 0) {
        return (
            <div className="text-center py-20 px-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <InboxIcon className="h-16 w-16 mx-auto text-slate-300" />
                <p className="mt-5 text-lg font-semibold text-slate-600">No classes found.</p>
                <p className="mt-1 text-sm text-slate-400">You are not enrolled in any classes yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classes.map((classData, index) => (
                <StudentClassCard
                    key={classData.id}
                    classData={classData}
                    onSelect={onClassSelect}
                    onDownloadPacket={onDownloadPacket}
                    visual={classVisuals[index % classVisuals.length]}
                />
            ))}
        </div>
    );
};

export default StudentClassesTab;