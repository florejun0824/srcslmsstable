// src/components/student/StudentPerformanceTab.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import { Card, Title, Subtitle, Text, Metric, Button } from '@tremor/react';
import { ChartBarIcon, AcademicCapIcon, CheckCircleIcon, TrophyIcon } from '@heroicons/react/24/outline';

const StudentPerformanceTab = ({ userProfile, classes }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState(null); // State to hold the last document for pagination
    const [hasMore, setHasMore] = useState(true); // State to track if more submissions are available

    const SUBMISSIONS_PER_PAGE = 25; // Define page size

    // Initial data fetch
    useEffect(() => {
        if (!userProfile?.id || !Array.isArray(classes) || classes.length === 0) {
            setLoading(false);
            return;
        }
        
        const classIds = classes.map(c => c.id);

        const q = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", classIds),
            orderBy("submittedAt", "desc"),
            limit(SUBMISSIONS_PER_PAGE)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const subsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubmissions(subsData);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]); // Save the last document
            setHasMore(snapshot.docs.length === SUBMISSIONS_PER_PAGE); // Check if there might be more
            setLoading(false);
        }, (error) => {
            console.error("Error fetching submissions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userProfile, classes]);

    // Function to load more submissions
    const loadMoreSubmissions = useCallback(async () => {
        if (!lastVisible || !userProfile?.id || !classes.length) return;

        const classIds = classes.map(c => c.id);
        const nextQuery = query(
            collection(db, "quizSubmissions"),
            where("studentId", "==", userProfile.id),
            where("classId", "in", classIds),
            orderBy("submittedAt", "desc"),
            startAfter(lastVisible), // Start fetching after the last visible document
            limit(SUBMISSIONS_PER_PAGE)
        );

        const snapshot = await getDocs(nextQuery);
        const newSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setSubmissions(prev => [...prev, ...newSubs]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === SUBMISSIONS_PER_PAGE);

    }, [lastVisible, userProfile, classes]);
    
    // The useMemo hook remains the same, which is great!
    const { totalQuizzes, averagePercentage, bestScorePercentage } = useMemo(() => {
        if (submissions.length === 0) {
            return { totalQuizzes: 0, averagePercentage: '0.0', bestScorePercentage: '0.0' };
        }
        const totalScore = submissions.reduce((sum, sub) => sum + sub.score, 0);
        const totalPossible = submissions.reduce((sum, sub) => sum + sub.totalItems, 0);
        const avg = totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : '0.0';
        const best = Math.max(...submissions.map(s => s.totalItems > 0 ? (s.score / s.totalItems) * 100 : 0)).toFixed(1);
        return { totalQuizzes: submissions.length, averagePercentage: avg, bestScorePercentage: best };
    }, [submissions]);

    // --- Render logic remains largely the same ---
    // ... (rest of the component JSX) ...
    // You would just add a "Load More" button at the end of the submissions list:
    
    // ... inside the return statement, after the submissions list/table ...
    {hasMore && (
        <div className="mt-6 flex justify-center">
            <Button onClick={loadMoreSubmissions} disabled={loading}>
                Load More
            </Button>
        </div>
    )}

};

export default StudentPerformanceTab;