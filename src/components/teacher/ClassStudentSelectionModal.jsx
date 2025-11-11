import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { CheckIcon, MagnifyingGlassIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

// --- (Styles and sub-components are unchanged) ---
const primaryButtonStyles = "w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus-visible:outline-blue-500 transition-all duration-200 disabled:opacity-50 active:scale-95";
const secondaryButtonStyles = "w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-gray-900 bg-neumorphic-base rounded-full shadow-neumorphic hover:text-blue-600 dark:bg-neumorphic-base-dark dark:text-slate-200 dark:shadow-lg dark:hover:text-blue-400 dark:active:shadow-neumorphic-inset-dark transition-all disabled:opacity-50 active:scale-95";

const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input 
                type="checkbox" 
                ref={ref} 
                checked={checked} 
                {...props} 
                className="sr-only peer" 
            />
            <span className="w-full h-full bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-md shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:dark:bg-blue-400 peer-checked:shadow-neumorphic peer-checked:dark:shadow-lg">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});

const StudentListMessage = ({ icon, title, message }) => {
    const IconComponent = icon;
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500 dark:text-slate-400">
            {IconComponent && <IconComponent className="w-10 h-10 sm:w-12 h-12 mb-4 text-gray-400 dark:text-slate-500" />}
            <h3 className="font-semibold text-gray-700 dark:text-slate-200 text-base sm:text-lg">{title}</h3>
            <p className="text-sm">{message}</p>
        </div>
    );
};


const ClassStudentSelectionModal = ({ isOpen, onClose, onConfirm, allClasses = [], currentSelectionMap, db }) => {
    
    // ... (All state and logic is unchanged) ...
    const [tempSelectionMap, setTempSelectionMap] = useState(new Map());
    const [activeClassId, setActiveClassId] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClassStudents, setLoadingClassStudents] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const newMap = new Map();
            if (currentSelectionMap) {
                currentSelectionMap.forEach((studentSet, classId) => {
                    newMap.set(classId, new Set(studentSet));
                });
            }
            setTempSelectionMap(newMap);
            setActiveClassId(null);
            setStudents([]);
            setSearchTerm('');
        }
    }, [isOpen, currentSelectionMap]);

    useEffect(() => {
        if (!activeClassId || !db) {
            setStudents([]);
            return;
        }

        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const classRef = doc(db, 'classes', activeClassId);
                const classSnap = await getDoc(classRef);

                if (!classSnap.exists()) {
                    throw new Error("Class document not found.");
                }

                const studentIds = classSnap.data().studentIds;
                if (!studentIds || studentIds.length === 0) {
                    setStudents([]);
                    setLoadingStudents(false);
                    return;
                }

                const usersRef = collection(db, 'users');
                const studentList = [];
                const chunks = [];
                for (let i = 0; i < studentIds.length; i += 30) {
                    chunks.push(studentIds.slice(i, i + 30));
                }

                for (const chunk of chunks) {
                    if (chunk.length === 0) continue;
                    const q = query(usersRef, where('__name__', 'in', chunk));
                    const snapshot = await getDocs(q);
                    
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const displayName = (data.firstName && data.lastName) 
                                            ? `${data.firstName} ${data.lastName}` 
                                            : (data.displayName || data.email || 'Unknown Student');
                        
                        studentList.push({
                            id: doc.id,
                            displayName: displayName,
                            ...data
                        });
                    });
                }
                
                studentList.sort((a, b) => a.displayName.localeCompare(b.displayName));
                setStudents(studentList);

            } catch (e) {
                console.error("Failed to fetch students:", e);
                setStudents([]);
            }
            setLoadingStudents(false);
        };

        fetchStudents();
    }, [activeClassId, db]);

    const handleToggleStudent = (studentId) => {
        setTempSelectionMap(prevMap => {
            const newMap = new Map(prevMap);
            const studentSet = new Set(newMap.get(activeClassId) || []);
            
            if (studentSet.has(studentId)) {
                studentSet.delete(studentId);
            } else {
                studentSet.add(studentId);
            }
            
            newMap.set(activeClassId, studentSet);
            return newMap;
        });
    };
    
    const handleToggleAllStudents = () => {
        if (students.length === 0) return;

        const allStudentIds = students.map(s => s.id);
        const currentSet = tempSelectionMap.get(activeClassId) || new Set();

        setTempSelectionMap(prevMap => {
            const newMap = new Map(prevMap);
            const allVisibleSelected = allStudentIds.every(id => currentSet.has(id));

            if (allVisibleSelected) {
                const newSet = new Set(currentSet);
                allStudentIds.forEach(id => newSet.delete(id));
                newMap.set(activeClassId, newSet);
            } else {
                const newSet = new Set(currentSet);
                allStudentIds.forEach(id => newSet.add(id));
                newMap.set(activeClassId, newSet);
            }
            return newMap;
        });
    };

    const handleToggleClass = async (classId) => {
        if (loadingClassStudents === classId) return;

        const classInfo = allClasses.find(c => c.value === classId);
        if (!classInfo) return;

        const currentSet = tempSelectionMap.get(classId) || new Set();
        const isAllSelected = classInfo.studentCount > 0 && currentSet.size === classInfo.studentCount;

        setTempSelectionMap(prevMap => {
            const newMap = new Map(prevMap);
            if (isAllSelected) {
                newMap.set(classId, new Set());
            } else {
                setLoadingClassStudents(classId);
            }
            return newMap;
        });

        if (!isAllSelected) {
            try {
                if (activeClassId === classId && students.length > 0) {
                    const allStudentIds = students.map(s => s.id);
                    setTempSelectionMap(prev => new Map(prev).set(classId, new Set(allStudentIds)));
                } else {
                    const classRef = doc(db, 'classes', classId);
                    const classSnap = await getDoc(classRef);
                    if (!classSnap.exists()) throw new Error("Class not found");
                    
                    const allStudentIds = classSnap.data().studentIds || [];
                    setTempSelectionMap(prev => new Map(prev).set(classId, new Set(allStudentIds)));
                }
            } catch (e) {
                console.error("Failed to fetch students for 'select all':", e);
            } finally {
                setLoadingClassStudents(null);
            }
        }
    };

    const handleDone = () => {
        const cleanedMap = new Map();
        for (const [classId, studentSet] of tempSelectionMap.entries()) {
            if (studentSet.size > 0) {
                cleanedMap.set(classId, studentSet);
            }
        }
        onConfirm(cleanedMap);
        onClose();
    };

    const filteredClasses = useMemo(() => {
        return allClasses
            .filter(c => 
                c.label.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    }, [allClasses, searchTerm]);

    const classListContent = useMemo(() => {
        if (filteredClasses.length === 0) {
            return <div className="p-4 text-center text-gray-500 dark:text-slate-400">No classes match search.</div>
        }
        
        return filteredClasses.map(cls => {
            const selection = tempSelectionMap.get(cls.value) || new Set();
            const totalCount = cls.studentCount || 0;
            
            const isChecked = totalCount > 0 && selection.size === totalCount;
            const isIndeterminate = selection.size > 0 && !isChecked;
            const isLoading = loadingClassStudents === cls.value;

            return (
                <div 
                    key={cls.value} 
                    className={`flex items-center gap-3 p-2 sm:p-3 rounded-xl cursor-pointer transition-all ${activeClassId === cls.value ? 'bg-blue-500/10 dark:bg-blue-500/20 shadow-neumorphic dark:shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    <div className="flex-shrink-0">
                        {isLoading ? (
                            <ArrowPathIcon className="w-5 h-5 text-gray-400 dark:text-slate-400 animate-spin" />
                        ) : (
                            <NeumorphicCheckbox 
                                checked={isChecked}
                                indeterminate={isIndeterminate}
                                onChange={() => handleToggleClass(cls.value)}
                                aria-label={`Select all in ${cls.label}`}
                            />
                        )}
                    </div>
                    <div 
                        className="flex-grow select-none min-w-0" // Added min-w-0 for truncation
                        onClick={() => setActiveClassId(cls.value)}
                    >
                        <div className="font-medium text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">{cls.label}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                            {selection.size} / {totalCount} selected
                        </div>
                    </div>
                </div>
            );
        });
    }, [filteredClasses, activeClassId, tempSelectionMap, loadingClassStudents]);

    const studentListContent = useMemo(() => {
        if (loadingStudents) {
            return <StudentListMessage icon={ArrowPathIcon} title="Loading Students..." message="Please wait..." />;
        }
        if (!activeClassId) {
            return <StudentListMessage title="No Class Selected" message="Select a class from the list to see its students." />;
        }
        if (students.length === 0) {
            return <StudentListMessage title="No Students" message="This class doesn't have any students enrolled." />;
        }
        
        const currentSet = tempSelectionMap.get(activeClassId) || new Set();
        const allVisibleSelected = students.length > 0 && students.every(s => currentSet.has(s.id));
        const isIndeterminate = !allVisibleSelected && students.some(s => currentSet.has(s.id));

        return (
            <>
                <header className="flex-shrink-0 flex items-center gap-3 p-3 sm:p-4 border-b border-black/10 dark:border-slate-700">
                    <NeumorphicCheckbox
                        checked={allVisibleSelected}
                        indeterminate={isIndeterminate}
                        onChange={handleToggleAllStudents}
                        aria-label="Select all students in this class"
                    />
                    <label
                        onClick={handleToggleAllStudents}
                        className="font-semibold text-gray-900 dark:text-slate-100 cursor-pointer select-none flex-grow text-sm sm:text-base"
                    >
                        Select all students
                        <span className="text-gray-500 dark:text-slate-400 font-normal ml-2">
                            ({students.filter(s => currentSet.has(s.id)).length}/{students.length})
                        </span>
                    </label>
                </header>
                
                <ul className="flex-grow overflow-y-auto">
                    {students.map(student => {
                        const isSelected = currentSet.has(student.id);
                        return (
                            <li 
                                key={student.id} 
                                onClick={() => handleToggleStudent(student.id)}
                                className={`flex items-center gap-3 p-3 sm:p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10 dark:bg-blue-500/20' : 'hover:bg-black/5 dark:hover:bg-white/5'} border-t border-black/5 dark:border-slate-700/50`}
                            >
                                <NeumorphicCheckbox checked={isSelected} readOnly className="pointer-events-none" />
                                <span className="text-gray-800 dark:text-slate-200 select-none text-sm sm:text-base">{student.displayName}</span>
                            </li>
                        );
                    })}
                </ul>
            </>
        );
    }, [students, loadingStudents, activeClassId, tempSelectionMap]);


    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Select Classes & Students"
            description="Select classes and the specific students you want to share with."
            size="3xl"
            contentClassName="bg-neumorphic-base dark:bg-neumorphic-base-dark"
        >
            <div className="flex flex-col h-[80vh] md:h-[70vh]">
                
                <main className="flex-grow flex flex-col md:flex-row gap-2 sm:gap-4 min-h-0">
                    
                    {/* Column 1: Search */}
                    <div className="w-full md:w-1/3 p-3 sm:p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-lg flex flex-col">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900 dark:text-slate-100">Search</h3>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search class name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2.5 sm:p-3 pl-10 bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all text-sm sm:text-base text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-500"
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                                    <XMarkIcon className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Class list */}
                    {/* --- MODIFIED: Fixed typo md:w-1D/3 to md:w-1/3 --- */}
                    <div className="w-full md:w-1/3 p-3 sm:p-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-lg flex flex-col flex-grow min-h-0">
                        <h3 className="text-base sm:text-lg font-semibold mb-3 text-gray-900 dark:text-slate-100">Class list</h3>
                        <div className="flex-grow overflow-y-auto space-y-2 -m-1 p-1">
                            {classListContent}
                        </div>
                    </div>

                    {/* Column 3: Student list */}
                    <div className="w-full md:w-1/3 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-lg flex flex-col flex-grow min-h-0 overflow-hidden">
                        {studentListContent}
                    </div>

                </main>
                
                <footer className="flex-shrink-0 pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-black/10 dark:border-slate-700">
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" onClick={onClose} className={secondaryButtonStyles}>Cancel</button>
                        <button onClick={handleDone} className={primaryButtonStyles}>
                            Done
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default ClassStudentSelectionModal;