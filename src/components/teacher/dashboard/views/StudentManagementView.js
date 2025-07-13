import React from 'react';
import Spinner from '../../../common/Spinner';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import {
    AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    MagnifyingGlassIcon, ArrowUturnLeftIcon, UserPlusIcon
} from '@heroicons/react/24/outline';


const StudentManagementView = (props) => {
    const {
        selectedClassForImport, handleBackToClassSelection, activeClasses, importTargetClassId, setImportTargetClassId,
        handleImportStudents, isImporting, studentsToImport, handleSelectAllStudents, handleToggleStudentForImport,
        importClassSearchTerm, setImportClassSearchTerm, allLmsClasses, filteredLmsClasses, isImportViewLoading,
        setSelectedClassForImport
    } = props;

    const classVisuals = [
        { icon: AcademicCapIcon, color: 'from-orange-500 to-red-500' },
        { icon: UserGroupIcon, color: 'from-blue-500 to-sky-500' },
        { icon: ClipboardDocumentListIcon, color: 'from-yellow-500 to-amber-500' },
        { icon: ShieldCheckIcon, color: 'from-green-500 to-lime-500' },
    ];
    const gradientButtonStyle = "flex items-center justify-center px-4 py-2 font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed";


    if (selectedClassForImport) {
        return (
            <div>
                <div className="mb-6">
                    <button onClick={handleBackToClassSelection} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 font-semibold"><ArrowUturnLeftIcon className="w-4 h-4" />Back to Class Selection</button>
                    <h1 className="text-3xl font-bold text-gray-800">Import Students</h1>
                    <p className="text-gray-500 mt-1">Import students from <span className="font-semibold text-gray-700">"{selectedClassForImport.name}"</span> into your class.</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">1. Import To Your Class</h2>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <select value={importTargetClassId} onChange={e => setImportTargetClassId(e.target.value)} className="w-full md:w-auto flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Choose one of your classes --</option>
                                {activeClasses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.gradeLevel} - {c.section})</option>))}
                            </select>
                            <button onClick={handleImportStudents} disabled={!importTargetClassId || isImporting || studentsToImport.size === 0} className={`${gradientButtonStyle} w-full md:w-auto gap-2`}>
                                <UserPlusIcon className="w-5 h-5" />
                                {isImporting ? 'Importing...' : `Import ${studentsToImport.size} Student(s)`}
                            </button>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">2. Select Students</h2>
                        <div className="border rounded-lg max-h-80 overflow-y-auto">
                            <div className="flex items-center gap-4 p-3 border-b bg-gray-50 sticky top-0 z-10">
                                <input type="checkbox" onChange={handleSelectAllStudents} checked={(selectedClassForImport.students?.length || 0) > 0 && studentsToImport.size === selectedClassForImport.students.length} id="select-all-students" className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                                <label htmlFor="select-all-students" className="font-semibold text-gray-800">Select All ({selectedClassForImport.students?.length || 0})</label>
                            </div>
                            {(selectedClassForImport.students && selectedClassForImport.students.length > 0) ? selectedClassForImport.students.map(student => (
                                <div key={student.id} onClick={() => handleToggleStudentForImport(student.id)} className={`flex items-center gap-4 p-3 border-b last:border-b-0 cursor-pointer transition-colors ${studentsToImport.has(student.id) ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                    <input type="checkbox" readOnly checked={studentsToImport.has(student.id)} className="h-5 w-5 rounded border-gray-400 text-blue-600 focus:ring-blue-500 pointer-events-none" />
                                    <UserInitialsAvatar firstName={student.firstName} lastName={student.lastName} />
                                    <div>
                                        <p className="font-semibold text-gray-800">{student.firstName} {student.lastName}</p>
                                        <p className="text-sm text-gray-500">{student.gradeLevel || 'N/A'}</p>
                                    </div>
                                </div>
                            )) : (<p className="p-4 text-center text-gray-500">This class has no students.</p>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div>
            <div className="mb-6"><h1 className="text-3xl font-bold text-gray-800">Browse Classes</h1><p className="text-gray-500 mt-1">Select a class below to import students from it.</p></div>
            <div className="mb-6 sticky top-0 bg-slate-100 py-3 z-20">
                <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder={`Filter from ${allLmsClasses.length} classes...`} value={importClassSearchTerm} onChange={e => setImportClassSearchTerm(e.target.value)} className="w-full max-w-md p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            {isImportViewLoading ? <Spinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLmsClasses.length > 0 ? filteredLmsClasses.map((c, index) => {
                        const { icon: Icon, color } = classVisuals[index % classVisuals.length];
                        return (
                            <div key={c.id} onClick={() => setSelectedClassForImport(c)} className="group relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer">
                                <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all`}></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl mb-4 self-start`}><Icon className="w-8 h-8" /></div>
                                    <h2 className="text-xl font-bold text-gray-800 truncate mb-1">{c.name}</h2>
                                    <p className="text-gray-500">{c.gradeLevel} - {c.section}</p>
                                    <div className="mt-auto pt-4 border-t border-gray-100"><p className="text-xs text-gray-500">{c.students?.length || 0} student(s)</p></div>
                                </div>
                            </div>
                        );
                    }) : (<p className="col-span-full text-center text-gray-500 py-10">No classes match your search.</p>)}
                </div>
            )}
        </div>
    );
};

export default StudentManagementView;