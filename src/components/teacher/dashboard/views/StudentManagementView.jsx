import React from 'react';
import Spinner from '../../../common/Spinner';
import UserInitialsAvatar from '../../../common/UserInitialsAvatar';
import {
    AcademicCapIcon, UserGroupIcon, ClipboardDocumentListIcon, ShieldCheckIcon,
    MagnifyingGlassIcon, ArrowUturnLeftIcon, UserPlusIcon, MegaphoneIcon, CalendarDaysIcon, ChevronUpDownIcon
} from '@heroicons/react/24/outline';
import { CSSTransition } from 'react-transition-group';

const StudentManagementView = (props) => {
    const {
        selectedClassForImport, handleBackToClassSelection, activeClasses, importTargetClassId, setImportTargetClassId,
        handleImportStudents, isImporting, studentsToImport, handleSelectAllStudents, handleToggleStudentForImport,
        importClassSearchTerm, setImportClassSearchTerm, allLmsClasses, filteredLmsClasses, isImportViewLoading,
        setSelectedClassForImport
    } = props;

    // --- iOS-style Visuals ---
    // Using solid, vibrant background colors for icons instead of gradients.
    const classVisuals = [
        { icon: AcademicCapIcon, color: 'bg-orange-500' },
        { icon: UserGroupIcon, color: 'bg-blue-500' },
        { icon: ClipboardDocumentListIcon, color: 'bg-amber-500' },
        { icon: ShieldCheckIcon, color: 'bg-green-500' },
        { icon: MegaphoneIcon, color: 'bg-purple-500' },
        { icon: CalendarDaysIcon, color: 'bg-teal-500' },
    ];
    // A solid, vibrant blue button style, typical of iOS call-to-actions.
    const iosButtonStyle = "flex items-center justify-center px-6 py-3 font-semibold text-white bg-blue-500 rounded-full shadow-md hover:bg-blue-600 transition-all duration-300 transform active:scale-95 disabled:bg-blue-300 disabled:cursor-not-allowed disabled:transform-none";

    const renderImportView = () => (
        <CSSTransition in={true} appear={true} timeout={500} classNames="fade-in-up">
            <div className="space-y-6 animate-fade-in-up">
                {/* --- Navigation & Header --- */}
                <div className="space-y-2">
                    <button onClick={handleBackToClassSelection} className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 font-semibold transition-colors duration-300">
                        <ArrowUturnLeftIcon className="w-5 h-5" />
                        Back to Classes
                    </button>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Import Students</h1>
                    <p className="text-lg text-gray-600">From class: <span className="font-semibold text-gray-800">"{selectedClassForImport.name}"</span>.</p>
                </div>
                
                {/* --- Main Content Card --- */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg space-y-8">
                    {/* --- Step 1: Destination Class --- */}
                    <div className="border-b border-gray-200 pb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">1. Choose a destination class</h2>
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                            <div className="relative flex-grow">
                                <select
                                    value={importTargetClassId}
                                    onChange={e => setImportTargetClassId(e.target.value)}
                                    className="w-full p-3 pl-4 pr-10 border border-gray-300 rounded-xl bg-gray-50 text-gray-800 font-medium appearance-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition duration-200 cursor-pointer"
                                >
                                    <option value="" disabled>Select one of your classes</option>
                                    {activeClasses.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.gradeLevel} - {c.section})</option>))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                    <ChevronUpDownIcon className="h-5 w-5" />
                                </div>
                            </div>
                            <button onClick={handleImportStudents} disabled={!importTargetClassId || isImporting || studentsToImport.size === 0} className={`${iosButtonStyle} w-full md:w-auto gap-2`}>
                                <UserPlusIcon className="w-6 h-6" />
                                {isImporting ? 'Importing...' : `Import ${studentsToImport.size} Student(s)`}
                            </button>
                        </div>
                    </div>
                    
                    {/* --- Step 2: Student Selection List --- */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-4">2. Select students to import</h2>
                        <div className="border border-gray-200 rounded-xl max-h-[28rem] overflow-y-auto custom-scrollbar bg-white">
                            {/* --- List Header: Select All --- */}
                            <div className="flex items-center gap-4 p-4 border-b bg-gray-50 sticky top-0 z-10 rounded-t-xl">
                                <input type="checkbox" onChange={handleSelectAllStudents} checked={(selectedClassForImport.students?.length || 0) > 0 && studentsToImport.size === selectedClassForImport.students.length} id="select-all-students" className="h-5 w-5 rounded-full border-gray-400 text-blue-500 focus:ring-blue-400 accent-blue-500" />
                                <label htmlFor="select-all-students" className="text-md font-semibold text-gray-700">Select All ({selectedClassForImport.students?.length || 0})</label>
                            </div>
                            
                            {/* --- Student List --- */}
                            {(selectedClassForImport.students && selectedClassForImport.students.length > 0) ? selectedClassForImport.students.map(student => (
                                <div key={student.id} onClick={() => handleToggleStudentForImport(student.id)} className={`flex items-center gap-4 p-3 pl-4 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors duration-200 ${studentsToImport.has(student.id) ? 'bg-blue-50' : 'hover:bg-gray-100'}`}>
                                    <input type="checkbox" readOnly checked={studentsToImport.has(student.id)} className="h-5 w-5 rounded-full border-gray-400 text-blue-500 accent-blue-500 pointer-events-none" />
                                    <UserInitialsAvatar firstName={student.firstName} lastName={student.lastName} size="md" />
                                    <div>
                                        <p className="font-semibold text-gray-800">{student.firstName} {student.lastName}</p>
                                        <p className="text-sm text-gray-500">{student.gradeLevel || 'N/A'}</p>
                                    </div>
                                </div>
                            )) : (<p className="p-8 text-center text-gray-500">This class has no students to import.</p>)}
                        </div>
                    </div>
                </div>
            </div>
        </CSSTransition>
    );

    const renderBrowseView = () => (
        <CSSTransition in={true} appear={true} timeout={500} classNames="fade-in-up">
            <div className="animate-fade-in-up">
                 {/* --- Header --- */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold text-gray-900 tracking-tight">Browse Classes</h1>
                    <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">Select a class from your learning management system to import students.</p>
                </div>
                
                {/* --- Sticky Search Bar --- */}
                <div className="mb-8 sticky top-4 bg-slate-50/80 backdrop-blur-md py-2 z-20">
                    <div className="relative max-w-xl mx-auto">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={`Search through ${allLmsClasses.length} classes...`}
                            value={importClassSearchTerm}
                            onChange={e => setImportClassSearchTerm(e.target.value)}
                            className="w-full p-3 pl-12 bg-white border border-gray-300 rounded-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all duration-300"
                        />
                    </div>
                </div>

                {isImportViewLoading ? <Spinner /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLmsClasses.length > 0 ? filteredLmsClasses.map((c, index) => {
                            const { icon: Icon, color } = classVisuals[index % classVisuals.length];
                            return (
                                // --- iOS-style Class Cards ---
                                <div key={c.id} onClick={() => setSelectedClassForImport(c)} className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
                                    <div className="flex flex-col h-full">
                                        <div className={`p-3 inline-block ${color} text-white rounded-xl shadow-md mb-4 self-start`}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 truncate mb-1">{c.name}</h2>
                                        <p className="text-gray-500 text-md">{c.gradeLevel} - {c.section}</p>
                                        <div className="mt-auto pt-4 border-t border-gray-100 mt-4">
                                            <p className="text-sm font-medium text-gray-500">{c.students?.length || 0} student(s)</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (<p className="col-span-full text-center text-gray-500 py-16 text-lg">No classes found matching your search.</p>)}
                    </div>
                )}
            </div>
        </CSSTransition>
    );

    return (
        // --- Main Container with iOS-style background ---
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
            <style jsx>{`
                /* --- Animation and Scrollbar styles (unchanged) --- */
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
                    background: #f1f5f9; /* slate-100 */
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1; /* slate-300 */
                    border-radius: 10px;
                    border: 2px solid #f1f5f9;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8; /* slate-400 */
                }
            `}</style>
            {selectedClassForImport ? renderImportView() : renderBrowseView()}
        </div>
    );
};

export default StudentManagementView;