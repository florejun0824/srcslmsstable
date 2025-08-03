import React from 'react';
import Spinner from '../../../common/Spinner';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import {
    AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    MagnifyingGlassIcon, ArrowUturnLeftIcon, UserPlusIcon, MegaphoneIcon, CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { CSSTransition } from 'react-transition-group';

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
        { icon: MegaphoneIcon, color: 'from-purple-500 to-fuchsia-500' },
        { icon: CalendarDaysIcon, color: 'from-teal-500 to-cyan-500' },
    ];
    const gradientButtonStyle = "flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

    const renderImportView = () => (
        <CSSTransition in={true} appear={true} timeout={500} classNames="fade-in-up">
            <div className="space-y-8 animate-fade-in-up">
                <div className="relative mb-8">
                    <button onClick={handleBackToClassSelection} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 mb-4 font-semibold transition-colors duration-300 transform hover:scale-105 active:scale-95"><ArrowUturnLeftIcon className="w-5 h-5" />Back to Class Selection</button>
                    <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">Import Students</h1>
                    <p className="text-lg text-gray-500 mt-2">Importing students from the glorious class: <span className="font-bold text-indigo-600">"{selectedClassForImport.name}"</span>.</p>
                </div>
                <div className="bg-white p-8 rounded-3xl shadow-2xl space-y-8">
                    <div className="border-b border-gray-200 pb-6">
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">1. Import to Your Class</h2>
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-6">
                            <div className="relative flex-grow">
                                <select
                                    value={importTargetClassId}
                                    onChange={e => setImportTargetClassId(e.target.value)}
                                    className="w-full p-4 pl-6 pr-12 border-2 border-gray-300 rounded-xl bg-white shadow-inner text-gray-700 font-medium appearance-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 cursor-pointer"
                                >
                                    <option value="" disabled>-- Choose one of your classes --</option>
                                    {activeClasses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.gradeLevel} - {c.section})</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                            </div>
                            <button onClick={handleImportStudents} disabled={!importTargetClassId || isImporting || studentsToImport.size === 0} className={`${gradientButtonStyle} w-full md:w-auto gap-2`}>
                                <UserPlusIcon className="w-6 h-6" />
                                {isImporting ? 'Importing...' : `Import ${studentsToImport.size} Student(s)`}
                            </button>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-4">2. Select Students</h2>
                        <div className="border border-gray-200 rounded-2xl max-h-96 overflow-y-auto shadow-inner custom-scrollbar">
                            <div className="flex items-center gap-4 p-4 border-b bg-gray-50 sticky top-0 z-10 rounded-t-2xl">
                                <input type="checkbox" onChange={handleSelectAllStudents} checked={(selectedClassForImport.students?.length || 0) > 0 && studentsToImport.size === selectedClassForImport.students.length} id="select-all-students" className="h-6 w-6 rounded-md border-gray-400 text-blue-600 focus:ring-blue-500" />
                                <label htmlFor="select-all-students" className="text-lg font-semibold text-gray-800">Select All ({selectedClassForImport.students?.length || 0})</label>
                            </div>
                            {(selectedClassForImport.students && selectedClassForImport.students.length > 0) ? selectedClassForImport.students.map(student => (
                                <div key={student.id} onClick={() => handleToggleStudentForImport(student.id)} className={`flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0 cursor-pointer transition-all duration-200 ${studentsToImport.has(student.id) ? 'bg-indigo-50 shadow-md' : 'hover:bg-gray-50'}`}>
                                    <input type="checkbox" readOnly checked={studentsToImport.has(student.id)} className="h-6 w-6 rounded-md border-gray-400 text-blue-600 focus:ring-blue-500 pointer-events-none" />
                                    <UserInitialsAvatar firstName={student.firstName} lastName={student.lastName} size="md" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{student.firstName} {student.lastName}</p>
                                        <p className="text-sm text-gray-500">{student.gradeLevel || 'N/A'}</p>
                                    </div>
                                </div>
                            )) : (<p className="p-8 text-center text-gray-500">This class has no students.</p>)}
                        </div>
                    </div>
                </div>
            </div>
        </CSSTransition>
    );

    const renderBrowseView = () => (
        <CSSTransition in={true} appear={true} timeout={500} classNames="fade-in-up">
            <div className="animate-fade-in-up">
                <div className="relative mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-800 drop-shadow-sm leading-tight">Browse Classes</h1>
                    <p className="text-lg text-gray-500 mt-2">Select a class below to import students from it.</p>
                </div>
                <div className="mb-8 sticky top-0 bg-slate-100/80 backdrop-blur-md py-4 z-20 rounded-b-xl">
                    <div className="relative max-w-xl mx-auto">
                        <MagnifyingGlassIcon className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={`Filter from ${allLmsClasses.length} classes...`}
                            value={importClassSearchTerm}
                            onChange={e => setImportClassSearchTerm(e.target.value)}
                            className="w-full p-4 pl-12 border-2 border-gray-300 rounded-full shadow-inner focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300"
                        />
                    </div>
                </div>
                {isImportViewLoading ? <Spinner /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredLmsClasses.length > 0 ? filteredLmsClasses.map((c, index) => {
                            const { icon: Icon, color } = classVisuals[index % classVisuals.length];
                            return (
                                <div key={c.id} onClick={() => setSelectedClassForImport(c)} className="group relative bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden">
                                    <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${color} rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500`}></div>
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className={`p-4 inline-block bg-gradient-to-br ${color} text-white rounded-xl shadow-lg mb-6 self-start`}><Icon className="w-8 h-8" /></div>
                                        <h2 className="text-2xl font-extrabold text-gray-800 truncate mb-2">{c.name}</h2>
                                        <p className="text-gray-500 text-lg">{c.gradeLevel} - {c.section}</p>
                                        <div className="mt-auto pt-6 border-t border-gray-100 mt-6"><p className="text-sm font-medium text-gray-500">{c.students?.length || 0} student(s)</p></div>
                                    </div>
                                </div>
                            );
                        }) : (<p className="col-span-full text-center text-gray-500 py-16 text-lg">No classes match your search.</p>)}
                    </div>
                )}
            </div>
        </CSSTransition>
    );

    return (
        <div className="p-4 md:p-8">
            <style jsx>{`
                .fade-in-up-appear, .fade-in-up-enter {
                    opacity: 0;
                    transform: translateY(20px);
                }
                .fade-in-up-appear-active, .fade-in-up-enter-active {
                    opacity: 1;
                    transform: translateY(0);
                    transition: opacity 500ms ease-out, transform 500ms ease-out;
                }
                .fade-in-up-exit {
                    opacity: 1;
                }
                .fade-in-up-exit-active {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 500ms ease-in, transform 500ms ease-in;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #d1d5db;
                    border-radius: 10px;
                    border: 2px solid #e5e7eb;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #9ca3af;
                }
            `}</style>
            {selectedClassForImport ? renderImportView() : renderBrowseView()}
        </div>
    );
};

export default StudentManagementView;