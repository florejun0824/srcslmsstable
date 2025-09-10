import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId, Timestamp } from 'firebase/firestore';
import ViewQuizModal from '../teacher/ViewQuizModal';
import Spinner from '../common/Spinner';
// --- MODIFICATION START ---
import { AcademicCapIcon, ClockIcon, CheckCircleIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, CloudArrowUpIcon } from '@heroicons/react/24/solid';
// --- MODIFICATION END ---
import { motion, AnimatePresence } from 'framer-motion';

const StudentQuizzesTab = ({ classes, userProfile, isModule = false }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [units, setUnits] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewQuizData, setViewQuizData] = useState(null);
    const [quizFilter, setQuizFilter] = useState('active');
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());

    useEffect(() => {
        if (quizzes.length > 0 && Object.keys(units).length > 0) {
            const quizzesToDisplay = quizzes.filter(q => q.status === quizFilter);
            const allGroupKeys = new Set();
            quizzesToDisplay.forEach(quiz => {
                const className = quiz.className || 'General';
                const unitName = units[quiz.unitId] || 'Uncategorized';
                allGroupKeys.add(`${className}-${unitName}`);
            });
            setCollapsedGroups(allGroupKeys);
        }
    }, [quizFilter, quizzes, units]);


    const toggleGroupCollapse = (groupKey) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupKey)) {
                newSet.delete(groupKey);
            } else {
                newSet.add(groupKey);
            }
            return newSet;
        });
    };

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const unitsSnapshot = await getDocs(collection(db, 'units'));
                const unitsMap = {};
                unitsSnapshot.forEach(doc => {
                    unitsMap[doc.id] = doc.data().title;
                });
                setUnits(unitsMap);
            } catch (error) {
                console.error("Error fetching units:", error);
            }
        };
        fetchUnits();
    }, []);

    // --- MODIFICATION START ---
    const getQuizStatus = (quizEntry, userSubmissionsMap) => {
        const now = Timestamp.now();
        const submissions = userSubmissionsMap.get(`${quizEntry.id}-${quizEntry.classId}`) || [];

        // Check if there's a pending submission first
        if (submissions.some(sub => sub.status === 'pending_sync')) {
            return 'pending_sync';
        }

        // Then check other statuses
        if (submissions.length >= 3) {
            return 'completed';
        }
        
        const availableUntil = quizEntry.availableUntil;
        if (availableUntil && availableUntil.seconds < now.seconds) {
            return 'overdue';
        }
        
        return 'active';
    };
    // --- MODIFICATION END ---

    const fetchSharedQuizzes = useCallback(async () => {
        if (!classes || classes.length === 0 || !userProfile?.id) {
            setLoading(false);
            setQuizzes([]);
            return;
        }
        setLoading(true);
        try {
            const quizToContextMap = new Map();
            const studentQuizSubmissions = new Map();

            const submissionsQuery = query(collection(db, 'quizSubmissions'), where('studentId', '==', userProfile.id));
            const submissionsSnapshot = await getDocs(submissionsQuery);
            submissionsSnapshot.forEach(doc => {
                const subData = doc.data();
                const key = `${subData.quizId}-${subData.classId}`;
                if (!studentQuizSubmissions.has(key)) {
                    studentQuizSubmissions.set(key, []);
                }
                studentQuizSubmissions.get(key).push(subData);
            });

            const postPromises = classes.map(c =>
                getDocs(query(collection(db, `classes/${c.id}/posts`)))
                    .then(snapshot => ({ snapshot, classId: c.id, className: c.name }))
            );

            const classPostSnapshots = await Promise.all(postPromises);
            classPostSnapshots.forEach(({ snapshot, classId, className }) => {
                snapshot.forEach(doc => {
                    const postData = doc.data();
                    if (Array.isArray(postData.quizIds)) {
                        postData.quizIds.forEach(quizId => {
                            if (!quizToContextMap.has(quizId)) {
                                quizToContextMap.set(quizId, { quizData: null, posts: [] });
                            }
                            quizToContextMap.get(quizId).posts.push({
                                postId: doc.id,
                                classId: classId,
                                className: className,
                                availableFrom: postData.availableFrom,
                                availableUntil: postData.availableUntil
                            });
                        });
                    }
                });
            });

            const uniqueQuizIds = Array.from(quizToContextMap.keys());
            if (uniqueQuizIds.length > 0) {
                const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                const quizzesSnapshot = await getDocs(quizzesQuery);
                quizzesSnapshot.forEach(doc => {
                    if (quizToContextMap.has(doc.id)) {
                        quizToContextMap.get(doc.id).quizData = { id: doc.id, ...doc.data() };
                    }
                });

                const finalList = [];
                quizToContextMap.forEach((value) => {
                    if (value.quizData) {
                        value.posts.forEach(postContext => {
                            const quizWithContext = {
                                ...value.quizData,
                                uniqueId: `${value.quizData.id}-${postContext.classId}-${postContext.postId}`,
                                context: `(for ${postContext.className})`,
                                className: postContext.className,
                                classId: postContext.classId,
                                availableFrom: postContext.availableFrom,
                                availableUntil: postContext.availableUntil,
                                attemptsTaken: (studentQuizSubmissions.get(`${value.quizData.id}-${postContext.classId}`) || []).length,
                            };
                            quizWithContext.status = getQuizStatus(quizWithContext, studentQuizSubmissions);
                            finalList.push(quizWithContext);
                        });
                    }
                });
                setQuizzes(finalList.sort((a, b) => (a.availableUntil?.seconds || 0) - (b.availableUntil?.seconds || 0)));
            } else {
                setQuizzes([]);
            }
        } catch (error) {
            console.error("Error fetching shared quizzes:", error);
        } finally {
            setLoading(false);
        }
    }, [classes, userProfile]);
    
    useEffect(() => {
        fetchSharedQuizzes();
    }, [fetchSharedQuizzes]);

    const activeQuizzes = quizzes.filter(quiz => quiz.status === 'active');

    const SegmentButton = ({ label, filterName }) => (
        <button
            onClick={() => setQuizFilter(filterName)}
            className={`flex-1 capitalize py-2 px-3 text-sm font-semibold rounded-lg transition-all duration-300 focus:outline-none ${quizFilter === filterName ? 'bg-white text-red-600 shadow-sm' : 'bg-transparent text-slate-600'}`}
        >
            {label}
        </button>
    );
    
    const EmptyState = ({icon: Icon, text, subtext}) => (
        <div className="text-center py-20 px-4">
            <Icon className="h-16 w-16 mb-4 text-gray-300 mx-auto" />
            <p className="text-lg font-semibold text-gray-700">{text}</p>
            <p className="mt-1 text-sm text-gray-500">{subtext}</p>
        </div>
    );
    
    const GroupedQuizList = ({ quizzesToDisplay, onQuizClick, emptyStateProps }) => {
        if (quizzesToDisplay.length === 0) {
            return <EmptyState {...emptyStateProps} />;
        }
        
        const quizzesByClassAndUnit = quizzesToDisplay.reduce((acc, quiz) => {
            const className = quiz.className || 'General';
            const unitName = units[quiz.unitId] || 'Uncategorized';
            
            if (!acc[className]) acc[className] = {};
            if (!acc[className][unitName]) acc[className][unitName] = [];
            
            acc[className][unitName].push(quiz);
            return acc;
        }, {});

        const customUnitSort = (a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0], 10);
            const numB = parseInt(b.match(/\d+/)?.[0], 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;
            return a.localeCompare(b);
        };
        const sortedClassNames = Object.keys(quizzesByClassAndUnit).sort();

        return (
            <div className="space-y-6">
                {sortedClassNames.map(className => (
                    <div key={className}>
                        <h2 className="text-xl font-bold text-gray-800 mb-2 px-2">{className}</h2>
                        <div className="space-y-2">
                            {Object.keys(quizzesByClassAndUnit[className]).sort(customUnitSort).map(unitName => {
                                const groupKey = `${className}-${unitName}`;
                                const isCollapsed = collapsedGroups.has(groupKey);
                                return (
                                    <div key={groupKey} className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
                                        <button 
                                            className="w-full flex justify-between items-center p-2.5 hover:bg-gray-50 transition-colors"
                                            onClick={() => toggleGroupCollapse(groupKey)}
                                        >
                                            <h3 className="text-sm font-medium text-gray-600 text-left">{unitName}</h3>
                                            {isCollapsed ? <ChevronDownIcon className="h-5 w-5 text-gray-400"/> : <ChevronUpIcon className="h-5 w-5 text-gray-400"/>}
                                        </button>

                                        <AnimatePresence>
                                            {!isCollapsed && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div>
                                                        {quizzesByClassAndUnit[className][unitName].map(quiz => (
                                                            <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => onQuizClick(quiz)} />
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (isModule) {
        return (
            <div className="bg-white/80 backdrop-blur-lg p-4 rounded-2xl shadow-sm border border-gray-200/80 h-full flex flex-col">
                <h2 className="text-lg font-bold text-gray-800 px-2 pb-2">Upcoming Quizzes</h2>
                {loading ? <div className="flex-1 flex items-center justify-center"><Spinner/></div> :
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeQuizzes.length > 0 ? (
                        <div className="bg-white rounded-lg overflow-hidden border border-gray-200/80">
                            {activeQuizzes.slice(0, 3).map(quiz => (
                                <QuizListItem key={quiz.uniqueId} quiz={quiz} onClick={() => setViewQuizData(quiz)} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-gray-50 rounded-lg">
                             <CheckCircleIcon className="h-10 w-10 mx-auto text-green-500" />
                             <p className="mt-3 text-base font-semibold text-gray-700">All Caught Up</p>
                             <p className="mt-1 text-xs text-gray-500">No active quizzes.</p>
                        </div>
                    )}
                </div>
                }
            </div>
        );
    }
    
    const filteredQuizzes = quizzes.filter(q => q.status === quizFilter);
    const emptyStateProps = {
        active: { icon: ClipboardDocumentCheckIcon, text: "No Active Quizzes", subtext: "New quizzes from your teacher will appear here." },
        completed: { icon: CheckCircleIcon, text: "No Completed Quizzes", subtext: "Once you complete a quiz, it will appear here." },
        overdue: { icon: ExclamationTriangleIcon, text: "No Overdue Quizzes", subtext: "You have no quizzes past their deadline." }
    }[quizFilter];

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="p-4 space-y-6">
                <div className="px-2">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Quizzes</h1>
                    <p className="text-base text-gray-500">View your active, completed, and overdue quizzes.</p>
                </div>

                <div className="bg-gray-200/70 rounded-xl p-1">
                    <nav className="flex space-x-1">
                        <SegmentButton label="Active" filterName="active" />
                        <SegmentButton label="Completed" filterName="completed" />
                        <SegmentButton label="Overdue" filterName="overdue" />
                    </nav>
                </div>

                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center pt-16"><Spinner /></div>
                     ) : (
                        <GroupedQuizList 
                            quizzesToDisplay={filteredQuizzes}
                            onQuizClick={setViewQuizData}
                            emptyStateProps={emptyStateProps}
                        />
                     )}
                </div>
            </div>

            <ViewQuizModal 
                isOpen={!!viewQuizData} 
                onClose={() => {
                    setViewQuizData(null);
                    fetchSharedQuizzes();
                }} 
                quiz={viewQuizData} 
                userProfile={userProfile} 
                classId={viewQuizData?.classId} 
            />
        </div>
    );
};

const QuizListItem = ({ quiz, onClick }) => {
    // --- MODIFICATION START ---
    const statusInfo = {
        active: { icon: AcademicCapIcon, color: "text-blue-500", label: "Take Quiz" },
        completed: { icon: CheckCircleIcon, color: "text-green-500", label: "Review" },
        overdue: { icon: ExclamationTriangleIcon, color: "text-red-500", label: "Submit Late" },
        pending_sync: { icon: CloudArrowUpIcon, color: "text-slate-500", label: "Syncing..." }
    };
    // --- MODIFICATION END ---
    const { icon: Icon, color, label } = statusInfo[quiz.status];

    return (
        <div
            onClick={onClick}
            className="group p-4 bg-white hover:bg-gray-50 transition-colors duration-200 cursor-pointer flex items-center space-x-4 border-b border-gray-200/80 last:border-b-0"
        >
            <Icon className={`h-8 w-8 flex-shrink-0 ${color}`} />
            
            <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-800 truncate">{quiz.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    {quiz.attemptsTaken > 0 ? `Attempt ${quiz.attemptsTaken + 1} of 3` : `3 Attempts`}
                </p>
            </div>
            
            <div className="flex items-center gap-2 text-gray-400 group-hover:text-red-600 transition-colors">
                 <span className="text-sm font-semibold hidden sm:block">{label}</span>
                <ChevronRightIcon className="h-5 w-5" />
            </div>
        </div>
    );
};

export default StudentQuizzesTab;