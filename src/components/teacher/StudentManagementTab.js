import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { collection, query, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { Users, UploadCloud, ChevronDown, ChevronRight } from 'lucide-react';

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
                // 1. Fetch all users (students and teachers) at once for efficiency
                const usersSnap = await getDocs(collection(db, "users"));
                const usersMap = new Map(usersSnap.docs.map(d => [d.id, d.data()]));

                // 2. Fetch all classes
                const classesSnap = await getDocs(collection(db, "classes"));
                const allClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. Separate the current teacher's classes for the "import to" dropdown
                const myClasses = allClasses.filter(c => c.teacherId === user.id);
                setTeacherClasses(myClasses);

                // 4. Create detailed rosters for all *other* teachers' classes
                const otherTeachersRosters = allClasses
                    .filter(c => c.teacherId !== user.id) // Filter for classes that are NOT the current teacher's
                    .map(c => {
                        const teacherInfo = usersMap.get(c.teacherId);
                        const studentInfo = c.students
                            .map(studentId => ({ id: studentId, ...usersMap.get(studentId) }))
                            .filter(student => student.firstName); // Filter out any undefined students

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
            await updateDoc(classRef, {
                students: arrayUnion(...Array.from(selectedStudents))
            });
            showToast(`Successfully imported ${selectedStudents.size} students!`, "success");
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
        <div>
            <div className="bg-white/60 backdrop-blur-md p-4 rounded-lg shadow-md mb-6 sticky top-0 z-10 border">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Import Students to Your Class</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        className="w-full sm:w-1/2 p-2 border border-gray-300 rounded-md bg-white"
                    >
                        <option value="">-- Select your class --</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={handleImportStudents}
                        disabled={!targetClassId || selectedStudents.size === 0}
                        className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        <UploadCloud size={18} className="mr-2" />
                        Import {selectedStudents.size} Selected
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Browse Other Classes</h3>
                {classRosters.map(roster => {
                    const allInClassSelected = roster.studentDetails.length > 0 && roster.studentDetails.every(s => selectedStudents.has(s.id));
                    return (
                        <div key={roster.id} className="bg-white/60 backdrop-blur-md rounded-lg shadow-md border overflow-hidden">
                            <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50/50" onClick={() => toggleRoster(roster.id)}>
                                <div>
                                    <h4 className="font-semibold text-gray-800">{roster.name}</h4>
                                    <p className="text-sm text-gray-500">Teacher: {roster.teacherName}</p>
                                </div>
                                {openRosters[roster.id] ? <ChevronDown /> : <ChevronRight />}
                            </div>
                            
                            {openRosters[roster.id] && (
                                <div className="p-3 border-t">
                                    <div className="flex justify-end items-center mb-2">
                                        <label className="flex items-center text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded mr-2"
                                                checked={allInClassSelected}
                                                onChange={(e) => handleSelectAllInClass(roster.studentDetails, e.target.checked)}
                                            />
                                            Select All in this Class
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {roster.studentDetails.map(student => (
                                            <label key={student.id} className="flex items-center p-2 rounded-md hover:bg-blue-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded mr-3"
                                                    checked={selectedStudents.has(student.id)}
                                                    onChange={() => handleStudentSelect(student.id)}
                                                />
                                                <span>{student.lastName}, {student.firstName}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {roster.studentDetails.length === 0 && <p className="text-sm text-gray-500 italic text-center py-2">This class has no students.</p>}
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