import React from 'react';
import Spinner from '../../../common/Spinner';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import {
    AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    MagnifyingGlassIcon, ArrowUturnLeftIcon, UserPlusIcon, MegaphoneIcon, CalendarDaysIcon, ChevronUpDownIcon,
    CheckIcon 
} from '@heroicons/react/24/solid';
import { CSSTransition } from 'react-transition-group';

const StudentManagementView = (props) => {
    const {
        selectedClassForImport, handleBackToClassSelection, activeClasses, importTargetClassId, setImportTargetClassId,
        handleImportStudents, isImporting, studentsToImport, handleSelectAllStudents, handleToggleStudentForImport,
        importClassSearchTerm, setImportClassSearchTerm, allLmsClasses, filteredLmsClasses, isImportViewLoading,
        setSelectedClassForImport
    } = props;

    const classVisuals = [
        { icon: AcademicCapIcon, color: 'text-orange-500' },
        { icon: UserGroupIcon, color: 'text-blue-500' },
        { icon: ClipboardDocumentListIcon, color: 'text-amber-500' },
        { icon: ShieldCheckIcon, color: 'text-green-500' },
        { icon: MegaphoneIcon, color: 'text-purple-500' },
        { icon: CalendarDaysIcon, color: 'text-teal-500' },
    ];
    
    const primaryButton = "flex items-center justify-center px-6 py-3 font-semibold text-blue-700 bg-gradient-to-br from-sky-100 to-blue-200 rounded-full shadow-neumorphic transition-shadow hover:shadow-neumorphic-inset active:shadow-neumorphic-inset disabled:opacity-60 disabled:cursor-not-allowed";

    const renderImportView = () => (
        <CSSTransition in={true} appear={true} timeout={500} classNames="fade-in-up">
            <div className="space-y-6 animate-fade-in-up">
                <div className="space-y-2">
                    <button onClick={handleBackToClassSelection} className="flex items-center gap-2 text-sm text-sky-600 hover:underline font-semibold transition-colors duration-300 p-2 rounded-lg hover:shadow-neumorphic-inset">
                        <ArrowUturnLeftIcon className="w-5 h-5" />
                        Back to Classes
                    </button>
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Import Students</h1>
                    <p className="text-lg text-slate-600">From class: <span className="font-semibold text-slate-800">"{selectedClassForImport.name}"</span>.</p>
                </div>
                
                <div className="bg-neumorphic-base p-6 md:p-8 rounded-2xl shadow-neumorphic space-y-8">
                    <div className="border-b border-neumorphic-shadow-dark/30 pb-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Choose a destination class</h2>
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                            <div className="relative flex-grow p-2 rounded-xl bg-neumorphic-base shadow-neumorphic-inset">
                                <select
                                    value={importTargetClassId}
                                    onChange={e => setImportTargetClassId(e.target.value)}
                                    className="w-full p-2 pl-3 pr-10 bg-transparent border-none text-slate-800 font-medium appearance-none focus:ring-0 cursor-pointer"
                                >
                                    <option value="" disabled>Select one of your classes</option>
                                    {activeClasses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.gradeLevel} - {c.section})</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                    <ChevronUpDownIcon className="h-5 w-5" />
                                </div>
                            </div>
                            <button onClick={handleImportStudents} disabled={!importTargetClassId || isImporting || studentsToImport.size === 0} className={`${primaryButton} w-full md:w-auto gap-2`}>
                                <UserPlusIcon className="w-6 h-6" />
                                {isImporting ? 'Importing...' : `Import ${studentsToImport.size} Student(s)`}
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Select students to import</h2>
                        <div className="rounded-xl max-h-[28rem] overflow-y-auto bg-neumorphic-base shadow-neumorphic-inset">
                            <div className="flex items-center gap-4 p-4 border-b border-neumorphic-shadow-dark/30 bg-neumorphic-base sticky top-0 z-10 rounded-t-xl">
                                <label htmlFor="select-all-students" className="flex items-center gap-4 cursor-pointer">
                                    <input type="checkbox" onChange={handleSelectAllStudents} checked={(selectedClassForImport.students?.length || 0) > 0 && studentsToImport.size === selectedClassForImport.students.length} id="select-all-students" className="sr-only peer" />
                                    {/* MODIFIED: Added `peer-checked:bg-sky-500` to the container */}
                                    <span className="w-5 h-5 rounded-md bg-neumorphic-base flex items-center justify-center shadow-neumorphic-inset peer-checked:shadow-neumorphic peer-checked:bg-sky-500 transition-all">
                                        {/* MODIFIED: Checkmark is now `text-white` for high contrast */}
                                        <CheckIcon className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </span>
                                    <span className="text-md font-semibold text-slate-700">Select All ({selectedClassForImport.students?.length || 0})</span>
                                </label>
                            </div>
                            
                            {(selectedClassForImport.students && selectedClassForImport.students.length > 0) ? selectedClassForImport.students.map(student => (
                                <label key={student.id} htmlFor={`student-${student.id}`} className={`flex items-center gap-4 p-3 pl-4 border-b border-neumorphic-shadow-dark/20 last:border-b-0 cursor-pointer transition-colors duration-200 ${studentsToImport.has(student.id) ? 'bg-sky-100/50' : 'hover:bg-slate-200/50'}`}>
                                    <input type="checkbox" readOnly checked={studentsToImport.has(student.id)} onChange={() => handleToggleStudentForImport(student.id)} id={`student-${student.id}`} className="sr-only peer" />
                                    {/* MODIFIED: Added `peer-checked:bg-sky-500` to the container */}
                                    <span className="w-5 h-5 rounded-md bg-neumorphic-base flex items-center justify-center shadow-neumorphic-inset peer-checked:shadow-neumorphic peer-checked:bg-sky-500 transition-all">
                                        {/* MODIFIED: Checkmark is now `text-white` for high contrast */}
                                        <CheckIcon className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </span>
                                    <UserInitialsAvatar firstName={student.firstName} lastName={student.lastName} size="md" />
                                    <div>
                                        <p className="font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
                                        <p className="text-sm text-slate-500">{student.gradeLevel || 'N/A'}</p>
                                    </div>
                                </label>
                            )) : (<p className="p-8 text-center text-slate-500">This class has no students to import.</p>)}
                        </div>
                    </div>
                </div>
            </div>
        </CSSTransition>
    );

    const renderBrowseView = () => (
        <CSSTransition in={true} appear={true} timeout={500} classNames="fade-in-up">
            <div className="animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Browse Classes</h1>
                    <p className="text-lg text-slate-600 mt-2 max-w-2xl mx-auto">Select a class from your learning management system to import students.</p>
                </div>
                
                <div className="mb-8 sticky top-4 bg-neumorphic-base/80 backdrop-blur-sm py-2 z-20 rounded-full shadow-neumorphic">
                    <div className="relative max-w-xl mx-auto">
                        <MagnifyingGlassIcon className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={`Search through ${allLmsClasses.length} classes...`}
                            value={importClassSearchTerm}
                            onChange={e => setImportClassSearchTerm(e.target.value)}
                            className="w-full p-3 pl-12 bg-transparent border-none rounded-full focus:ring-0 text-slate-800 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {isImportViewLoading ? <Spinner /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLmsClasses.length > 0 ? filteredLmsClasses.map((c, index) => {
                            const { icon: Icon, color } = classVisuals[index % classVisuals.length];
                            return (
                                <div key={c.id} onClick={() => setSelectedClassForImport(c)} className="group p-6 rounded-2xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-300 cursor-pointer bg-neumorphic-base">
                                    <div className="flex flex-col h-full">
                                        <div className={`p-3 inline-block bg-neumorphic-base shadow-neumorphic-inset rounded-xl mb-4 self-start`}>
                                            <Icon className={`w-7 h-7 ${color}`} />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900 truncate mb-1">{c.name}</h2>
                                        <p className="text-slate-500 text-md">{c.gradeLevel} - {c.section}</p>
                                        <div className="mt-auto pt-4 border-t border-neumorphic-shadow-dark/20 mt-4">
                                            <p className="text-sm font-medium text-slate-500">{c.students?.length || 0} student(s)</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (<p className="col-span-full text-center text-slate-500 py-16 text-lg">No classes found matching your search.</p>)}
                    </div>
                )}
            </div>
        </CSSTransition>
    );

    return (
        <div className="p-4 md:p-8 bg-neumorphic-base min-h-screen">
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
                    background: #e2e8f0; 
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 10px;
                    border: 2px solid #e2e8f0;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
            `}</style>
            {selectedClassForImport ? renderImportView() : renderBrowseView()}
        </div>
    );
};

export default StudentManagementView;