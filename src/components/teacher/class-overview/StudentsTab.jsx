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
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4, type: "spring" }}
        className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center p-8 bg-zinc-100/50 dark:bg-zinc-800/30 rounded-[32px]"
    >
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
            <Icon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{text}</h3>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">{subtext}</p>
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
            <div className="space-y-3 p-2 md:p-0">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800/60 rounded-[24px] animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="p-2 md:p-0">
                <EmptyState 
                    icon={UserGroupIcon} 
                    text="No students enrolled" 
                    subtext="Share the class code with your students to get them enrolled." 
                />
            </div>
        );
    }

    return (
        <div className="pb-24 p-2 md:p-0">
            <div className="bg-zinc-100 dark:bg-zinc-800/40 rounded-[32px] overflow-hidden flex flex-col shadow-sm">
                <div className="flex-1">
                    {students.map((student, index) => (
                        <motion.div 
                            key={student.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className="flex items-center justify-between p-4 md:p-5 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors group border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-0"
                        >
                            <div className="flex items-center gap-4">
                                {/* Adjusted size to match MD3 avatar proportions slightly better */}
                                <UserInitialsAvatar user={student} size="w-12 h-12" />
                                <div>
                                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-base md:text-lg tracking-tight">
                                        {student.lastName}, {student.firstName}
                                    </p>
                                    <p className="text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        ID: <span className="font-mono tracking-wide">{student.id}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onRemoveStudent(classData.id, student)} 
                                className="p-3 text-zinc-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors active:scale-95 flex-shrink-0"
                                title="Remove Student"
                            >
                                <TrashIcon className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </motion.div>
                    ))}
                </div>
                {/* Footer Status Bar */}
                <div className="px-6 py-4 bg-zinc-200/50 dark:bg-zinc-900/50 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Total Students: {students.length}
                </div>
            </div>
        </div>
    );
};

export default StudentsTab;