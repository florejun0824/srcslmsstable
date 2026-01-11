import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import { collection, getDocs, query, doc, getDoc, where } from 'firebase/firestore';
import { CheckIcon, MagnifyingGlassIcon, XMarkIcon, ArrowPathIcon, UsersIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

// --- DESIGN SYSTEM CONSTANTS ---
const glassPanel = "bg-white dark:bg-[#1a1d24] border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl transition-all p-5 h-full flex flex-col";
const glassInput = "w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pl-11 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";

const primaryBtn = "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/30 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-blue-400/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn = "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50";

// --- SUB-COMPONENTS (Memoized) ---

const NeumorphicCheckbox = React.memo(({ checked, indeterminate, ...props }) => {
    const ref = React.useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);
    
    return (
        <div className="relative w-5 h-5 flex-shrink-0">
            <input type="checkbox" ref={ref} checked={checked} {...props} className="sr-only peer" />
            <span className={`w-full h-full rounded-md border flex items-center justify-center transition-all duration-200 ${
                checked 
                ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30' 
                : 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-slate-600 hover:border-blue-400'
            }`}>
                <CheckIcon className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`} />
            </span>
        </div>
    );
});

const StudentListMessage = React.memo(({ icon, title, message }) => {
    const IconComponent = icon;
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            {IconComponent ? (
                <IconComponent className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
            ) : (
                <UsersIcon className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
            )}
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
    );
});

const ClassListItem = React.memo(({ cls, isActive, isChecked, isIndeterminate, isLoading, onSelect, onToggle }) => (
    <div 
        onClick={onSelect}
        className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent ${
            isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30 shadow-sm' 
            : 'hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
    >
        <div className="flex-shrink-0" onClick={onToggle}>
            {isLoading ? (
                <ArrowPathIcon className="w-5 h-5 text-slate-400 animate-spin" />
            ) : (
                <NeumorphicCheckbox 
                    checked={isChecked}
                    indeterminate={isIndeterminate}
                    onChange={() => {}} 
                    aria-label={`Select all in ${cls.label}`}
                />
            )}
        </div>
        <div className="flex-grow select-none min-w-0">
            <div className={`font-bold text-sm truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                {cls.label}
            </div>
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                {cls.selectionSize} / {cls.studentCount} selected
            </div>
        </div>
    </div>
));

const StudentListItem = React.memo(({ student, isSelected, onToggle }) => (
    <li 
        onClick={() => onToggle(student.id)}
        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${
            isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/20' 
            : 'hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
    >
        <NeumorphicCheckbox checked={isSelected} readOnly className="pointer-events-none" />
        <span className={`text-sm font-medium select-none ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {student.displayName}
        </span>
    </li>
));

// --- MAIN COMPONENT ---

const ClassStudentSelectionModal = ({ isOpen, onClose, onConfirm, allClasses = [], currentSelectionMap, db }) => {
    
    const [tempSelectionMap, setTempSelectionMap] = useState(new Map());
    const [activeClassId, setActiveClassId] = useState(null);
    const [students, setStudents] = useState([]);
    
    // Cache for fetched students: { classId: [StudentObjects] }
    const [studentsCache, setStudentsCache] = useState({}); 
    
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClassStudents, setLoadingClassStudents] = useState(null);
    const [mobileView, setMobileView] = useState('classes');

    // Reset state when modal opens
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
            setMobileView('classes');
            // We do NOT clear studentsCache here so data persists if user re-opens modal (optional, but better UX)
        }
    }, [isOpen, currentSelectionMap]);

    // Fetch Students with Caching
    useEffect(() => {
        if (!activeClassId || !db) {
            setStudents([]);
            return;
        }

        // 1. Check Cache
        if (studentsCache[activeClassId]) {
            setStudents(studentsCache[activeClassId]);
            return;
        }

        // 2. Fetch if not in cache
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                const classRef = doc(db, 'classes', activeClassId);
                const classSnap = await getDoc(classRef);

                if (!classSnap.exists()) throw new Error("Class document not found.");

                const studentIds = classSnap.data().studentIds;
                if (!studentIds || studentIds.length === 0) {
                    const emptyList = [];
                    setStudents(emptyList);
                    setStudentsCache(prev => ({ ...prev, [activeClassId]: emptyList }));
                    setLoadingStudents(false);
                    return;
                }

                const usersRef = collection(db, 'users');
                const studentList = [];
                const chunks = [];
                
                // Firestore 'in' limit is 10 (Safest limit)
                for (let i = 0; i < studentIds.length; i += 10) {
                    chunks.push(studentIds.slice(i, i + 10));
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
                setStudentsCache(prev => ({ ...prev, [activeClassId]: studentList }));

            } catch (e) {
                console.error("Failed to fetch students:", e);
                setStudents([]);
            }
            setLoadingStudents(false);
        };

        fetchStudents();
    }, [activeClassId, db, studentsCache]);

    const handleToggleStudent = useCallback((studentId) => {
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
    }, [activeClassId]);
    
    const handleToggleAllStudents = useCallback(() => {
        if (students.length === 0) return;

        const allStudentIds = students.map(s => s.id);
        
        setTempSelectionMap(prevMap => {
            const currentSet = prevMap.get(activeClassId) || new Set();
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
    }, [students, activeClassId]);

    const handleClassClick = useCallback((classId) => {
        setActiveClassId(classId);
        setMobileView('students');
    }, []);

    const handleToggleClass = useCallback(async (classId, e) => {
        e?.stopPropagation();
        if (loadingClassStudents === classId) return;

        const classInfo = allClasses.find(c => c.value === classId);
        if (!classInfo) return;

        // Optimistic update check
        setTempSelectionMap(prevMap => {
            const currentSet = prevMap.get(classId) || new Set();
            const isAllSelected = classInfo.studentCount > 0 && currentSet.size === classInfo.studentCount;
            
            // If selecting all, we need to fetch. If deselecting, we can do it instantly.
            if (!isAllSelected) {
                setLoadingClassStudents(classId); // Trigger loading state
            }
            
            // Return logic handled in next step or async effect? 
            // We return prevMap here to not break flow, actual update happens below or after fetch
            return prevMap;
        });

        // Determine current selection status again safely
        const currentSet = tempSelectionMap.get(classId) || new Set();
        const isAllSelected = classInfo.studentCount > 0 && currentSet.size === classInfo.studentCount;

        if (isAllSelected) {
            // DESELECT ALL - Instant
            setTempSelectionMap(prev => {
                const newMap = new Map(prev);
                newMap.set(classId, new Set());
                return newMap;
            });
            setLoadingClassStudents(null);
        } else {
            // SELECT ALL - May need fetch
            try {
                let allStudentIds = [];
                // Check if we have them cached
                if (studentsCache[classId]) {
                    allStudentIds = studentsCache[classId].map(s => s.id);
                } else {
                    // Fetch
                    const classRef = doc(db, 'classes', classId);
                    const classSnap = await getDoc(classRef);
                    if (classSnap.exists()) {
                        allStudentIds = classSnap.data().studentIds || [];
                    }
                }
                
                setTempSelectionMap(prev => {
                    const newMap = new Map(prev);
                    newMap.set(classId, new Set(allStudentIds));
                    return newMap;
                });
            } catch (e) {
                console.error("Failed to select all students:", e);
            } finally {
                setLoadingClassStudents(null);
            }
        }
    }, [allClasses, tempSelectionMap, studentsCache, db, loadingClassStudents]);

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
            .filter(c => c.label.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    }, [allClasses, searchTerm]);

    // Memoize Class List Rendering
    const classListContent = useMemo(() => {
        if (filteredClasses.length === 0) {
            return <div className="p-8 text-center text-slate-400 dark:text-slate-500">No classes match your search.</div>
        }
        
        return filteredClasses.map(cls => {
            const selection = tempSelectionMap.get(cls.value) || new Set();
            const totalCount = cls.studentCount || 0;
            const isChecked = totalCount > 0 && selection.size === totalCount;
            const isIndeterminate = selection.size > 0 && !isChecked;
            
            // Pass simple props to memoized item
            return (
                <ClassListItem 
                    key={cls.value}
                    cls={{ ...cls, selectionSize: selection.size }}
                    isActive={activeClassId === cls.value}
                    isChecked={isChecked}
                    isIndeterminate={isIndeterminate}
                    isLoading={loadingClassStudents === cls.value}
                    onSelect={() => handleClassClick(cls.value)}
                    onToggle={(e) => handleToggleClass(cls.value, e)}
                />
            );
        });
    }, [filteredClasses, activeClassId, tempSelectionMap, loadingClassStudents, handleClassClick, handleToggleClass]);

    // Memoize Student List Rendering
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
                <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                    <button 
                        onClick={() => setMobileView('classes')}
                        className="lg:hidden p-1 -ml-1 mr-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>

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
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                            {students.filter(s => currentSet.has(s.id)).length} / {students.length}
                        </span>
                    </label>
                </header>
                
                <ul className="flex-grow overflow-y-auto custom-scrollbar p-2">
                    {students.map(student => (
                        <StudentListItem 
                            key={student.id}
                            student={student}
                            isSelected={currentSet.has(student.id)}
                            onToggle={handleToggleStudent}
                        />
                    ))}
                </ul>
            </>
        );
    }, [students, loadingStudents, activeClassId, tempSelectionMap, handleToggleStudent, handleToggleAllStudents]);


    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Select Recipients"
            description="Choose classes and specific students."
            size="screen"
            roundedClass="rounded-[2rem] !bg-white dark:!bg-[#18181b] !border !border-slate-200 dark:!border-slate-800 !shadow-2xl"
            containerClassName="h-full p-2 sm:p-6 bg-slate-900/30"
            contentClassName="!p-0"
        >
            <div className="relative h-[85vh] flex flex-col bg-transparent rounded-b-[2rem]">
                
                <main className="flex-grow flex flex-col lg:flex-row gap-6 min-h-0 p-6 sm:p-8 overflow-hidden">
                    
                    {/* Column 1: Search */}
                    <div className={`w-full lg:w-1/3 flex-col gap-4 lg:flex ${mobileView === 'students' ? 'hidden' : 'flex'}`}>
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
                        
                        <div className={`${glassPanel} justify-center items-center text-center p-8 hidden lg:flex`}>
                            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                                <UsersIcon className="w-8 h-8 text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                Select a class from the list to manage individual student access.
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Class list */}
                    <div className={`w-full lg:w-1/3 flex-col min-h-0 lg:flex ${mobileView === 'students' ? 'hidden' : 'flex h-full'}`}>
                        <div className={glassPanel}>
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Class List</h3>
                            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1 -mx-2 px-2">
                                {classListContent}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Student list */}
                    <div className={`w-full lg:w-1/3 flex-col min-h-0 lg:flex ${mobileView === 'classes' ? 'hidden' : 'flex h-full'}`}>
                        <div className={`${glassPanel} !p-0 overflow-hidden`}>
                            {studentListContent}
                        </div>
                    </div>

                </main>
                
                <footer className="flex-shrink-0 pt-6 pb-8 px-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#18181b] rounded-b-[2rem]">
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