import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { UploadCloud, ChevronDown, ChevronRight, Check } from 'lucide-react';

// --- OPTIMIZATION ENGINE (Reused from Admin Dashboard) ---

// 1. Native AutoSizer (No external dependencies, high performance)
const SimpleAutoSizer = ({ children }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };
    measure();
    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {dimensions.width > 0 && dimensions.height > 0 ? children(dimensions) : null}
    </div>
  );
};

// 2. Lazy Virtual List Loader (Robust Import Pattern)
const LazyFixedSizeList = lazy(async () => {
  try {
    const mod = await import('react-window');
    const Component = mod.FixedSizeList || mod.default?.FixedSizeList;
    if (Component) return { default: Component };
    throw new Error('FixedSizeList not found');
  } catch (error) {
    console.warn("Virtualization failed, using fallback list:", error);
    return {
      default: ({ children, itemCount, itemSize, height, width, itemData }) => (
        <div style={{ height, width, overflow: 'auto' }}>
            <div style={{ height: itemCount * itemSize, position: 'relative' }}>
                {Array.from({ length: itemCount }).map((_, index) => 
                    children({ index, style: { position: 'absolute', top: index * itemSize, left: 0, width: '100%', height: itemSize }, data: itemData })
                )}
            </div>
        </div>
      )
    };
  }
});

// 3. Row Component for the Virtual List
const StudentRow = ({ index, style, data }) => {
    const { students, selectedStudents, handleStudentSelect } = data;
    const student = students[index];
    const isSelected = selectedStudents.has(student.id);

    return (
        <div style={style} className="px-2 py-1">
            <label 
                className={`flex items-center h-full px-3 rounded-lg cursor-pointer transition-colors border border-transparent ${
                    isSelected ? 'bg-blue-100/60 border-blue-200' : 'hover:bg-zinc-200/40 border-zinc-100'
                }`}
            >
                <div className="relative flex items-center justify-center mr-3">
                    <input
                        type="checkbox"
                        className="peer h-4 w-4 rounded-sm border-zinc-300 text-blue-600 focus:ring-blue-500 appearance-none border checked:bg-blue-600 checked:border-blue-600 transition-all"
                        checked={isSelected}
                        onChange={() => handleStudentSelect(student.id)}
                    />
                    <Check size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                </div>
                <span className="text-zinc-800 text-sm font-medium truncate">
                    {student.lastName}, {student.firstName}
                </span>
            </label>
        </div>
    );
};

// --- MAIN COMPONENT ---

const StudentManagementTab = () => {
    const { showToast } = useToast();
    const [classRosters, setClassRosters] = useState([]);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [targetClassId, setTargetClassId] = useState('');
    const [loading, setLoading] = useState(true);
    const [openRosters, setOpenRosters] = useState({});
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const usersMap = new Map(usersSnap.docs.map(d => [d.id, d.data()]));

                const classesSnap = await getDocs(collection(db, "classes"));
                const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                const myClasses = allClasses.filter(c => c.teacherId === user.id);
                setTeacherClasses(myClasses);

                const otherTeachersRosters = allClasses
                    .filter(c => c.teacherId !== user.id)
                    .map(c => {
                        const teacherInfo = usersMap.get(c.teacherId);
                        const studentInfo = (c.students || [])
                            .map(studentId => ({ id: studentId, ...usersMap.get(studentId) }))
                            .filter(student => student.firstName && student.lastName);

                        return {
                            ...c,
                            teacherName: teacherInfo ? `${teacherInfo.firstName} ${teacherInfo.lastName}` : 'Unknown Teacher',
                            studentDetails: studentInfo.sort((a, b) => a.lastName.localeCompare(b.lastName))
                        };
                    });
                
                setClassRosters(otherTeachersRosters.sort((a,b) => a.name.localeCompare(b.name)));

            } catch (error) {
                console.error("Error fetching student/class data:", error);
                showToast("Failed to load student directory.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id, showToast]);

    // Optimize selection handler with useCallback
    const handleStudentSelect = useCallback((studentId) => {
        setSelectedStudents(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(studentId)) {
                newSelection.delete(studentId);
            } else {
                newSelection.add(studentId);
            }
            return newSelection;
        });
    }, []);
    
    const handleSelectAllInClass = (students, isSelected) => {
        setSelectedStudents(prev => {
            const newSelection = new Set(prev);
            students.forEach(student => {
                if (isSelected) newSelection.add(student.id);
                else newSelection.delete(student.id);
            });
            return newSelection;
        });
    };

    const handleImportStudents = async () => {
        if (!targetClassId) {
            showToast("Please select one of your classes to import students into.", "error");
            return;
        }
        if (selectedStudents.size === 0) {
            showToast("Please select at least one student to import.", "error");
            return;
        }

        try {
            const classRef = doc(db, "classes", targetClassId);
            const targetClass = teacherClasses.find(c => c.id === targetClassId);
            const existingStudentIds = new Set((targetClass.students || []));
            const newStudents = Array.from(selectedStudents).filter(id => !existingStudentIds.has(id));

            if (newStudents.length === 0) {
                showToast("All selected students are already in the target class.", "info");
                setSelectedStudents(new Set());
                return;
            }

            await updateDoc(classRef, {
                students: arrayUnion(...newStudents)
            });
            showToast(`Successfully imported ${newStudents.length} new students!`, "success");
            setSelectedStudents(new Set());
        } catch (error) {
            console.error("Error importing students:", error);
            showToast("An error occurred during the import.", "error");
        }
    };

    const toggleRoster = (classId) => {
        setOpenRosters(prev => ({ ...prev, [classId]: !prev[classId] }));
    };

    if (loading) return <Spinner />;

    return (
        <div className="p-4">
            <div className="bg-zinc-100/80 backdrop-blur-md p-5 rounded-2xl shadow-sm mb-8 sticky top-4 z-10 border border-zinc-200/50">
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Import Students to Your Class</h2>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="form-input-ios w-full sm:flex-1"
                    >
                        <option value="">-- Select your class --</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={handleImportStudents}
                        disabled={!targetClassId || selectedStudents.size === 0}
                        className="btn-primary-ios w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                        <UploadCloud size={18} />
                        Import {selectedStudents.size > 0 ? `(${selectedStudents.size})` : ''} Selected
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-zinc-800 px-2">Browse Other Classes</h3>
                {classRosters.map(roster => {
                    const allInClassSelected = roster.studentDetails.length > 0 && roster.studentDetails.every(s => selectedStudents.has(s.id));
                    const isOpen = openRosters[roster.id];

                    return (
                        <div key={roster.id} className="bg-white/70 backdrop-blur-md rounded-2xl border border-zinc-200/50 overflow-hidden transition-all duration-300">
                            <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-zinc-50/50" onClick={() => toggleRoster(roster.id)}>
                                <div>
                                    <h4 className="font-semibold text-zinc-900">{roster.name}</h4>
                                    <p className="text-sm text-zinc-500">Teacher: {roster.teacherName}</p>
                                </div>
                                {isOpen ? <ChevronDown className="text-zinc-500" /> : <ChevronRight className="text-zinc-500" />}
                            </div>
                            
                            {isOpen && (
                                <div className="border-t border-zinc-200/80 bg-zinc-50/70">
                                    <div className="p-4 border-b border-zinc-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
                                                {roster.studentDetails.length} Students
                                            </span>
                                            <label className="flex items-center text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded-sm mr-2 border-zinc-300 text-blue-600 focus:ring-blue-500"
                                                    checked={allInClassSelected}
                                                    onChange={(e) => handleSelectAllInClass(roster.studentDetails, e.target.checked)}
                                                    disabled={roster.studentDetails.length === 0}
                                                />
                                                Select All
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {/* VIRTUALIZED LIST CONTAINER */}
                                    <div className="w-full h-[350px] relative">
                                        {roster.studentDetails.length > 0 ? (
                                            <SimpleAutoSizer>
                                                {({ height, width }) => (
                                                    <Suspense fallback={<div className="w-full h-full animate-pulse bg-zinc-100" />}>
                                                        <LazyFixedSizeList
                                                            height={height}
                                                            width={width}
                                                            itemCount={roster.studentDetails.length}
                                                            itemSize={46} // Height of each row in pixels
                                                            itemData={{
                                                                students: roster.studentDetails,
                                                                selectedStudents,
                                                                handleStudentSelect
                                                            }}
                                                        >
                                                            {StudentRow}
                                                        </LazyFixedSizeList>
                                                    </Suspense>
                                                )}
                                            </SimpleAutoSizer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-400 italic text-sm">
                                                No students found in this class.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentManagementTab;