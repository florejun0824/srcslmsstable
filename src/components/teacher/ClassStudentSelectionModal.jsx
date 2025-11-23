import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { CheckIcon, MagnifyingGlassIcon, XMarkIcon, ArrowPathIcon, UsersIcon } from '@heroicons/react/24/solid';

// --- DESIGN SYSTEM CONSTANTS ---
const glassPanel = "bg-white/60 dark:bg-[#1a1d24]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-lg rounded-2xl transition-all p-5 h-full flex flex-col";
const glassInput = "w-full bg-white/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-3 pl-11 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";

const primaryBtn = "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/30 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-blue-400/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn = "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/20 dark:border-white/5 active:scale-[0.98] transition-all duration-200 disabled:opacity-50";

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
            <span className={`w-full h-full rounded-md border flex items-center justify-center transition-all duration-200 ${
                checked 
                ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30' 
                : 'bg-white/50 dark:bg-white/5 border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }`}>
                <CheckIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
            </span>
        </div>
    );
});

const StudentListMessage = ({ icon, title, message }) => {
    const IconComponent = icon;
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            {IconComponent ? (
                <IconComponent className="w-12 h-12 mb-3 text-slate-400 dark:text-slate-500" />
            ) : (
                <UsersIcon className="w-12 h-12 mb-3 text-slate-400 dark:text-slate-500" />
            )}
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
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
            return <div className="p-8 text-center text-slate-400 dark:text-slate-500">No classes match your search.</div>
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
                    onClick={() => setActiveClassId(cls.value)}
                    className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent ${
                        activeClassId === cls.value 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-500/30 shadow-sm' 
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                >
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isLoading ? (
                            <ArrowPathIcon className="w-5 h-5 text-slate-400 animate-spin" />
                        ) : (
                            <div onClick={() => handleToggleClass(cls.value)}>
                                <NeumorphicCheckbox 
                                    checked={isChecked}
                                    indeterminate={isIndeterminate}
                                    onChange={() => {}} 
                                    aria-label={`Select all in ${cls.label}`}
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex-grow select-none min-w-0">
                        <div className={`font-bold text-sm truncate ${activeClassId === cls.value ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                            {cls.label}
                        </div>
                        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                            {selection.size} / {totalCount} selected
                        </div>
                    </div>
                </div>
            );
        });
    }, [filteredClasses, activeClassId, tempSelectionMap, loadingClassStudents]);

    const studentListContent = useMemo(() => {
        if (loadingStudents) {
            return <StudentListMessage icon={ArrowPathIcon} title="Loading..." message="Fetching students..." />;
        }
        if (!activeClassId) {
            return <StudentListMessage title="Select a Class" message="Choose a class from the list to view students." />;
        }
        if (students.length === 0) {
            return <StudentListMessage title="Empty Class" message="This class has no students enrolled." />;
        }
        
        const currentSet = tempSelectionMap.get(activeClassId) || new Set();
        const allVisibleSelected = students.length > 0 && students.every(s => currentSet.has(s.id));
        const isIndeterminate = !allVisibleSelected && students.some(s => currentSet.has(s.id));

        return (
            <>
                <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <div onClick={handleToggleAllStudents} className="cursor-pointer">
                        <NeumorphicCheckbox
                            checked={allVisibleSelected}
                            indeterminate={isIndeterminate}
                            onChange={() => {}}
                            aria-label="Select all students"
                        />
                    </div>
                    <label
                        onClick={handleToggleAllStudents}
                        className="font-bold text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none flex-grow"
                    >
                        Select All
                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-2 bg-white dark:bg-black/20 px-2 py-0.5 rounded">
                            {students.filter(s => currentSet.has(s.id)).length} / {students.length}
                        </span>
                    </label>
                </header>
                
                <ul className="flex-grow overflow-y-auto custom-scrollbar p-2">
                    {students.map(student => {
                        const isSelected = currentSet.has(student.id);
                        return (
                            <li 
                                key={student.id} 
                                onClick={() => handleToggleStudent(student.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${
                                    isSelected 
                                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                <NeumorphicCheckbox checked={isSelected} readOnly className="pointer-events-none" />
                                <span className={`text-sm font-medium select-none ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {student.displayName}
                                </span>
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
            title="Select Recipients"
            description="Choose classes and specific students."
            
            // [MODIFIED] Desktop width override
            size="screen"
            roundedClass="rounded-[2.5rem] !bg-white/90 dark:!bg-[#18181b]/95 !backdrop-blur-3xl !border !border-white/20 dark:!border-white/5 !shadow-2xl"
            containerClassName="h-full p-2 sm:p-6 bg-slate-900/40 backdrop-blur-md"
            contentClassName="!p-0"
        >
            <div className="relative h-[85vh] flex flex-col bg-white/50 dark:bg-transparent rounded-b-[2.5rem]">
                
                <main className="flex-grow flex flex-col lg:flex-row gap-6 min-h-0 p-6 sm:p-8 overflow-hidden">
                    
                    {/* Column 1: Search */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-4 min-h-[200px] lg:min-h-0">
                        <div className={glassPanel + " h-auto flex-shrink-0"}>
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Filter Classes</h3>
                            <div className="relative">
                                <input 
                                    type="text"
                                    placeholder="Search class..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={glassInput}
                                />
                                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 transition-colors">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Instructions / Summary Box */}
                        <div className={`${glassPanel} justify-center items-center text-center p-8 opacity-70 hidden lg:flex`}>
                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                                <UsersIcon className="w-8 h-8 text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Select a class from the list to manage individual student access.
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Class list */}
                    <div className="w-full lg:w-1/3 flex flex-col min-h-[300px] lg:min-h-0">
                        <div className={glassPanel}>
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Class List</h3>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1 -mx-2 px-2">
                                {classListContent}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Student list */}
                    <div className="w-full lg:w-1/3 flex flex-col min-h-[300px] lg:min-h-0">
                        <div className={`${glassPanel} !p-0 overflow-hidden`}>
                            {studentListContent}
                        </div>
                    </div>

                </main>
                
                <footer className="flex-shrink-0 pt-6 pb-8 px-8 border-t border-slate-200/60 dark:border-white/5 bg-white/40 dark:bg-[#121212]/40 backdrop-blur-md rounded-b-[2.5rem]">
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4">
                        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
                        <button onClick={handleDone} className={primaryBtn}>
                            Confirm Selection
                        </button>
                    </div>
                </footer>
            </div>
        </Modal>
    );
};

export default ClassStudentSelectionModal;