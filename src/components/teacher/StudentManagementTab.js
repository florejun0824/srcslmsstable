import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, query, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { UploadCloud, ChevronDown, ChevronRight } from 'lucide-react';

const StudentManagementTab = () => {
    const { showToast } = useToast();
    const [classRosters, setClassRosters] = useState([]);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [targetClassId, setTargetClassId] = useState('');
    const [loading, setLoading] = useState(true);
    const [openRosters, setOpenRosters] = useState({});
    const { user } = useAuth();

    // --- All data fetching and logic are unchanged ---
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

    const handleStudentSelect = (studentId) => {
        const newSelection = new Set(selectedStudents);
        if (newSelection.has(studentId)) {
            newSelection.delete(studentId);
        } else {
            newSelection.add(studentId);
        }
        setSelectedStudents(newSelection);
    };
    
    const handleSelectAllInClass = (students, isSelected) => {
        const newSelection = new Set(selectedStudents);
        students.forEach(student => {
            if (isSelected) {
                newSelection.add(student.id);
            } else {
                newSelection.delete(student.id);
            }
        });
        setSelectedStudents(newSelection);
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
            {/* iOS Vibe: A cleaner, more defined control panel at the top */}
            <div className="bg-zinc-100/80 backdrop-blur-md p-5 rounded-2xl shadow-sm mb-8 sticky top-4 z-10 border border-zinc-200/50">
                <h2 className="text-xl font-bold text-zinc-900 mb-4">Import Students to Your Class</h2>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="form-input-ios w-full sm:flex-1" // Uses global CSS class for iOS style
                    >
                        <option value="">-- Select your class --</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={handleImportStudents}
                        disabled={!targetClassId || selectedStudents.size === 0}
                        className="btn-primary-ios w-full sm:w-auto flex items-center justify-center gap-2" // Uses global CSS class for iOS style
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
                    return (
                        // iOS Vibe: Inset, grouped list style for each class roster
                        <div key={roster.id} className="bg-white/70 backdrop-blur-md rounded-2xl border border-zinc-200/50">
                            <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-zinc-50/50 rounded-t-2xl" onClick={() => toggleRoster(roster.id)}>
                                <div>
                                    <h4 className="font-semibold text-zinc-900">{roster.name}</h4>
                                    <p className="text-sm text-zinc-500">Teacher: {roster.teacherName}</p>
                                </div>
                                {openRosters[roster.id] ? <ChevronDown className="text-zinc-500" /> : <ChevronRight className="text-zinc-500" />}
                            </div>
                            
                            {openRosters[roster.id] && (
                                <div className="border-t border-zinc-200/80">
                                    <div className="bg-zinc-50/70 p-4">
                                        <div className="flex justify-end items-center mb-3">
                                            <label className="flex items-center text-sm font-medium text-zinc-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded-sm mr-2 border-zinc-300 text-blue-600 focus:ring-blue-500"
                                                    checked={allInClassSelected}
                                                    onChange={(e) => handleSelectAllInClass(roster.studentDetails, e.target.checked)}
                                                />
                                                Select All Students
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {roster.studentDetails.map(student => (
                                                <label key={student.id} className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-colors ${selectedStudents.has(student.id) ? 'bg-blue-100/60' : 'hover:bg-zinc-200/40'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded-sm mr-3 border-zinc-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedStudents.has(student.id)}
                                                        onChange={() => handleStudentSelect(student.id)}
                                                    />
                                                    <span className="text-zinc-800">{student.lastName}, {student.firstName}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {roster.studentDetails.length === 0 && <p className="text-sm text-zinc-500 italic text-center py-4">This class has no students.</p>}
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