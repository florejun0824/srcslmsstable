import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
// --- MODIFICATION 1: Add doc, getDoc, and where ---
import { collection, getDocs, query, orderBy, doc, getDoc, where } from 'firebase/firestore';
import { CheckIcon, MagnifyingGlassIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

// ... (Button styles and NeumorphicCheckbox component are unchanged) ...
const primaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-full shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 disabled:opacity-50 active:scale-95";
const secondaryButtonStyles = "w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-900 bg-neumorphic-base rounded-full shadow-neumorphic hover:text-blue-600 transition-all disabled:opacity-50 active:scale-95";

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
            <span className="w-full h-full bg-neumorphic-base rounded-md shadow-neumorphic-inset flex items-center justify-center transition-all peer-checked:bg-blue-500 peer-checked:shadow-neumorphic">
                <CheckIcon className={`w-4 h-4 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`} />
            </span>
        </div>
    );
});

const StudentListMessage = ({ icon, title, message }) => {
    // ... (This helper component is unchanged) ...
    const IconComponent = icon;
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
            {IconComponent && <IconComponent className="w-12 h-12 mb-4 text-gray-400" />}
            <h3 className="font-semibold text-gray-700">{title}</h3>
            <p className="text-sm">{message}</p>
        </div>
    );
};


const ClassStudentSelectionModal = ({ isOpen, onClose, onConfirm, allClasses, currentSelectionMap, db }) => {
    
    const [tempSelectionMap, setTempSelectionMap] = useState(new Map());
    const [activeClassId, setActiveClassId] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingClassStudents, setLoadingClassStudents] = useState(null);

    // ... (useEffect for isOpen is unchanged) ...
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

    // --- MODIFICATION 2: Replace the entire useEffect for fetching students ---
    useEffect(() => {
        if (!activeClassId || !db) {
            setStudents([]);
            return;
        }

        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                // 1. Get the class document to find the studentIds array
                const classRef = doc(db, 'classes', activeClassId);
                const classSnap = await getDoc(classRef);

                if (!classSnap.exists()) {
                    throw new Error("Class document not found.");
                }

                const studentIds = classSnap.data().studentIds;
                if (!studentIds || studentIds.length === 0) {
                    // This is the correct "No Students" condition
                    setStudents([]);
                    setLoadingStudents(false);
                    return;
                }

                // 2. Fetch student documents from the top-level 'users' collection
                //    (Change 'users' if your collection is named differently)
                const usersRef = collection(db, 'users');
                const studentList = [];

                // Chunk the studentIds array into groups of 30 (Firestore 'in' query limit)
                const chunks = [];
                for (let i = 0; i < studentIds.length; i += 30) {
                    chunks.push(studentIds.slice(i, i + 30));
                }

                // Execute a query for each chunk
                for (const chunk of chunks) {
                    if (chunk.length === 0) continue;
                    // Query where the document ID is in our chunk array
                    const q = query(usersRef, where('__name__', 'in', chunk));
                    const snapshot = await getDocs(q);
                    
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        // Create a displayName consistent with StudentManagementView.jsx
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
                
                // Sort the final list alphabetically
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
    // --- END MODIFICATION 2 ---

    // ... (handleToggleStudent and handleToggleAllStudents are unchanged) ...
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


    // --- MODIFICATION 3: Update 'handleToggleClass' to fetch IDs from the class doc ---
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
                    // This is the corrected logic:
                    // Get the class doc and read its 'studentIds' array
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
    // --- END MODIFICATION 3 ---

    // ... (handleDone is unchanged) ...
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

    // ... (filteredClasses useMemo is unchanged) ...
    const filteredClasses = useMemo(() => {
        return allClasses.filter(c => 
            c.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allClasses, searchTerm]);

    // ... (classListContent useMemo is unchanged) ...
    const classListContent = useMemo(() => {
        if (filteredClasses.length === 0) {
            return <div className="p-4 text-center text-gray-500">No classes match search.</div>
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
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeClassId === cls.value ? 'bg-blue-500/10 shadow-neumorphic' : 'hover:bg-black/5'}`}
                >
                    <div className="flex-shrink-0">
                        {isLoading ? (
                            <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
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
                        className="flex-grow select-none"
                        onClick={() => setActiveClassId(cls.value)}
                    >
                        <div className="font-medium text-gray-900">{cls.label}</div>
                        <div className="text-sm text-gray-500">
                            {selection.size} / {totalCount} selected
                        </div>
                    </div>
                </div>
            );
        });
    }, [filteredClasses, activeClassId, tempSelectionMap, loadingClassStudents]);

    // ... (studentListContent useMemo is unchanged) ...
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
                <header className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-black/10">
                    <NeumorphicCheckbox
                        checked={allVisibleSelected}
                        indeterminate={isIndeterminate}
                        onChange={handleToggleAllStudents}
                        aria-label="Select all students in this class"
                    />
                    <label
                        onClick={handleToggleAllStudents}
                        className="font-semibold text-gray-900 cursor-pointer select-none flex-grow"
                    >
                        Select all students
                        <span className="text-gray-500 font-normal ml-2">
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
                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/10' : 'hover:bg-black/5'} border-t border-black/5`}
                            >
                                <NeumorphicCheckbox checked={isSelected} readOnly className="pointer-events-none" />
                                <span className="text-gray-800 select-none">{student.displayName}</span>
                            </li>
                        );
                    })}
                </ul>
            </>
        );
    }, [students, loadingStudents, activeClassId, tempSelectionMap]);


    // ... (The main modal return statement is unchanged) ...
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Select Classes & Students"
            description="Select classes and the specific students you want to share with."
            size="6xl"
            contentClassName="bg-neumorphic-base"
        >
            <div className="flex flex-col h-[70vh]">
                <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
                    
                    <div className="md:col-span-1 p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic flex flex-col">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Search</h3>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search class name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-3 pl-10 bg-neumorphic-base shadow-neumorphic-inset rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-1 p-4 bg-neumorphic-base rounded-2xl shadow-neumorphic flex flex-col">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900">Class list</h3>
                        <div className="flex-grow overflow-y-auto space-y-2 -m-1 p-1">
                            {classListContent}
                        </div>
                    </div>

                    <div className="md:col-span-1 bg-neumorphic-base rounded-2xl shadow-neumorphic flex flex-col overflow-hidden">
                        {studentListContent}
                    </div>

                </main>
                
                <footer className="flex-shrink-0 pt-5 mt-5 border-t border-black/10">
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