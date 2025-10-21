import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust this path to your firebase config

export const useCourseData = (subjectId) => {
  const [allSubjects, setAllSubjects] = useState([]);
  const [unitsForSubject, setUnitsForSubject] = useState([]);
  const [lessonsForUnit, setLessonsForUnit] = useState([]);

  // ✅ 1. CREATE SEPARATE LOADING STATES
  // This is for the initial list of all subjects.
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  // This is for when we are fetching units/lessons for a specific subject.
  const [contentLoading, setContentLoading] = useState(false);

  // This useEffect fetches the list of all subjects ONCE and only affects its own loading state.
  useEffect(() => {
    const subjectsQuery = query(collection(db, "courses"), orderBy("title"));
    const unsub = onSnapshot(subjectsQuery, (snapshot) => {
      setAllSubjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubjectsLoading(false); // Finish loading subjects
    }, (error) => {
      console.error("Error fetching subjects:", error);
      setSubjectsLoading(false);
    });
    return () => unsub();
  }, []); // Runs only once on mount.

  // This useEffect ONLY reacts to changes in the selected subjectId.
  useEffect(() => {
    // If no subject is selected, clear the dependent data and ensure content isn't loading.
    if (!subjectId) {
      setUnitsForSubject([]);
      setLessonsForUnit([]);
      setContentLoading(false);
      return;
    }

    // A subject IS selected, so show the content loading state.
    setContentLoading(true);

    const unitsQuery = query(collection(db, 'units'), where('subjectId', '==', subjectId), orderBy('order'));
    const unitsUnsub = onSnapshot(unitsQuery, (snapshot) => {
      setUnitsForSubject(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error fetching units:", error);
      setContentLoading(false);
    });

    const lessonsQuery = query(collection(db, 'lessons'), where('subjectId', '==', subjectId), orderBy('order'));
    const lessonsUnsub = onSnapshot(lessonsQuery, (snapshot) => {
      setLessonsForUnit(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setContentLoading(false); // Finish loading content
    }, (error) => {
      console.error("Error fetching lessons:", error);
      setContentLoading(false);
    });
    
    return () => {
      unitsUnsub();
      lessonsUnsub();
    };
  }, [subjectId]); // Correctly depends ONLY on subjectId.

  // ✅ 2. RETURN A COMBINED LOADING STATE
  // The component is "loading" if either the main subject list OR the specific content is loading.
  return { 
    allSubjects, 
    unitsForSubject, 
    lessonsForUnit, 
    loading: subjectsLoading || contentLoading 
  };
};