import React, { useState, useEffect, memo } from 'react';
import { 
    getDocs, 
    query, 
    collection, 
    where, 
    documentId 
} from 'firebase/firestore';
import { db } from '../../../services/firebase'; 
import UserInitialsAvatar from '../../common/UserInitialsAvatar'; // Adjust path
import { 
    UserGroupIcon, 
    TrashIcon 
} from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

// --- HELPERS ---

// Helper to fetch students in chunks of 30 (Firestore limit for 'in' queries)
const fetchDocsInBatches = async (collectionName, ids) => {
    if (!ids || ids.length === 0) return [];
    const chunks = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
    const snapshots = await Promise.all(
        chunks.map(chunk => getDocs(query(collection(db, collectionName), where(documentId(), 'in', chunk))))
    );
    return snapshots.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })));
};

const EmptyState = ({ icon: Icon, text, subtext }) => (
    <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 bg-white/40 dark:bg-[#1A1D24]/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-700"
    >
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-sm">
            <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{text}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">{subtext}</p>
    </motion.div>
);

// --- MAIN COMPONENT ---

const StudentsTab = ({ classData, isActive, onRemoveStudent }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        // Optimization: Only fetch if tab is active and we haven't loaded data yet
        if (!isActive || hasLoaded || !classData?.students) return;

        const loadStudents = async () => {
            setLoading(true);
            try {
                if (classData.students.length > 0) {
                    const studentIds = classData.students.map(s => s.id);
                    const fetchedData = await fetchDocsInBatches('users', studentIds);
                    
                    // Sort by Last Name
                    const sorted = fetchedData.sort((a, b) => 
                        (a.lastName || '').localeCompare(b.lastName || '')
                    );
                    setStudents(sorted);
                }
            } catch (error) {
                console.error("Error loading students:", error);
            } finally {
                setLoading(false);
                setHasLoaded(true);
            }
        };

        loadStudents();
    }, [isActive, hasLoaded, classData?.students]);

    // Handle updates if the parent's student list changes (e.g., after removal)
    useEffect(() => {
        if (!classData?.students || !hasLoaded) return;
        
        // If the classData students list is smaller than our local list, sync them
        // This handles the UI update immediately after a removal without re-fetching everything
        if (classData.students.length < students.length) {
            const currentIds = new Set(classData.students.map(s => s.id));
            setStudents(prev => prev.filter(s => currentIds.has(s.id)));
        }
    }, [classData.students, hasLoaded, students.length]);

    if (!isActive && !hasLoaded) return null;

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <EmptyState 
                icon={UserGroupIcon} 
                text="No students enrolled" 
                subtext="Share the class code with your students to get them enrolled." 
            />
        );
    }

    return (
        <div className="bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-sm rounded-3xl border border-white/5 shadow-sm overflow-hidden animate-fadeIn">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                        <div className="flex items-center gap-4">
                            <UserInitialsAvatar user={student} size="w-10 h-10" />
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                    {student.lastName}, {student.firstName}
                                </p>
                                <p className="text-xs text-slate-500">ID: {student.id}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onRemoveStudent(classData.id, student)} 
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            title="Remove Student"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-black/20 text-center text-xs text-slate-400">
                Total Students: {students.length}
            </div>
        </div>
    );
};

export default StudentsTab;