import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, getDocs, where, documentId } from 'firebase/firestore';
import ViewQuizModal from '../teacher/ViewQuizModal';
import Spinner from '../common/Spinner';

const StudentQuizzesTab = ({ classes, userProfile }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewQuizData, setViewQuizData] = useState(null);

    useEffect(() => {
        const fetchSharedQuizzes = async () => {
            if (classes.length === 0) {
                setLoading(false);
                return;
            }
            setLoading(true);

            try {
                const quizToClassesMap = new Map();
                
                const postPromises = classes.map(c => 
                    getDocs(query(collection(db, `classes/${c.id}/posts`))).then(snapshot => ({ snapshot, classId: c.id, className: c.name }))
                );
                const classPostSnapshots = await Promise.all(postPromises);

                classPostSnapshots.forEach(({ snapshot, classId, className }) => {
                    snapshot.forEach(doc => {
                        const postData = doc.data();
                        if (postData.quizIds) {
                            postData.quizIds.forEach(quizId => {
                                if (!quizToClassesMap.has(quizId)) {
                                    quizToClassesMap.set(quizId, { classes: [] });
                                }
                                quizToClassesMap.get(quizId).classes.push({ id: classId, name: className });
                            });
                        }
                    });
                });
                
                const uniqueQuizIds = Array.from(quizToClassesMap.keys());
                
                if (uniqueQuizIds.length > 0) {
                    const quizzesQuery = query(collection(db, 'quizzes'), where(documentId(), 'in', uniqueQuizIds));
                    const quizzesSnapshot = await getDocs(quizzesQuery);
                    quizzesSnapshot.forEach(doc => {
                        quizToClassesMap.get(doc.id).quizData = { id: doc.id, ...doc.data() };
                    });

                    const finalList = [];
                    quizToClassesMap.forEach(value => {
                        if (value.quizData) {
                            value.classes.forEach(cls => {
                                finalList.push({
                                    ...value.quizData,
                                    uniqueId: `${value.quizData.id}-${cls.id}`,
                                    context: `(for ${cls.name})`,
                                    classId: cls.id
                                });
                            });
                        }
                    });
                    setQuizzes(finalList);
                }
            } catch (error) {
                console.error("Error fetching shared quizzes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedQuizzes();
    }, [classes]);

    if (loading) return <Spinner />;

    return (
        <>
            <div className="bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-lg">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">My Quizzes</h1>
                {quizzes.length > 0 ? (
                    <ul className="space-y-3">
                        {quizzes.map(quiz => (
                            <li key={quiz.uniqueId}>
                                {/* --- FIX: Changed the clickable element to a button for reliability --- */}
                                <button
                                    onClick={() => setViewQuizData(quiz)}
                                    className="w-full text-left p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {quiz.title} <span className="text-sm text-gray-500">{quiz.context}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center p-8 text-gray-500">No quizzes have been assigned to you yet.</p>}
            </div>
            
            {/* We are still using the simple "Sanity Check" modal for this test */}
            <ViewQuizModal 
                isOpen={!!viewQuizData} 
                onClose={() => setViewQuizData(null)} 
                quiz={viewQuizData} 
                userProfile={userProfile}
                classId={viewQuizData?.classId}
            />
        </>
    );
};

export default StudentQuizzesTab;