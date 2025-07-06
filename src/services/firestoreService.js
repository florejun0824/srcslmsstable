// src/services/firestoreService.js

import { db } from './firebase'; // This is imported from your firebase.js file
import { getFunctions, httpsCallable } from 'firebase/functions'; // <-- NEW: Import for Cloud Functions

import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    writeBatch,
    query,
    where
} from 'firebase/firestore';

// --- NEW: Initialize Firebase Functions ---
const functions = getFunctions();

// --- Your Existing Functions ---

export const getAllUsers = async () => {
    const usersCollectionRef = collection(db, 'users');
    const snapshot = await getDocs(usersCollectionRef);
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return users;
};

export const addUser = async (userData) => {
    const usersCollectionRef = collection(db, 'users');
    await addDoc(usersCollectionRef, userData);
};

export const deleteUser = async (userId) => {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
};

export const updateUserPassword = async (userId, newPassword) => {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { password: newPassword });
};

export const updateStudentDetailsInClasses = async (studentId, newData) => {
    if (!studentId || !newData) {
        throw new Error("Student ID and new data must be provided.");
    }
    const batch = writeBatch(db);
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    classesSnapshot.forEach(docSnap => {
        const classData = docSnap.data();
        if (!classData.students || !Array.isArray(classData.students)) {
            return;
        }
        let studentFound = false;
        const updatedStudents = classData.students.map(student => {
            if (student.id === studentId) {
                studentFound = true;
                return { ...student, ...newData };
            }
            return student;
        });
        if (studentFound) {
            batch.update(docSnap.ref, { students: updatedStudents });
        }
    });
    await batch.commit();
};

export const updateTeacherDetailsInDocuments = async (teacherId, newData) => {
    if (!teacherId || !newData) {
        throw new Error("Teacher ID and new data must be provided.");
    }
    const batch = writeBatch(db);
    const collectionsToUpdate = ['classes', 'courses', 'teacherAnnouncements'];

    for (const coll of collectionsToUpdate) {
        const q = query(collection(db, coll), where("teacherId", "==", teacherId));
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
            batch.update(docSnap.ref, newData);
        });
    }
    await batch.commit();
};


// --- NEW FUNCTIONS FOR ADMIN DASHBOARD ---

/**
 * Calls the backend Cloud Function to restrict or unrestrict a user.
 * @param {string} userId - The ID of the user to update.
 * @param {boolean} shouldRestrict - True to restrict, false to unrestrict.
 */
export const setUserRestrictionStatus = async (userId, shouldRestrict) => {
    // Get a reference to our Cloud Function
    const setUserRestriction = httpsCallable(functions, 'setUserRestrictionStatus');
    // Call the function with the required data
    return setUserRestriction({ userId, shouldRestrict });
};

/**
 * Calls the backend Cloud Function to change a user's role.
 * @param {string} userId - The ID of the user to update.
 * @param {string} newRole - The new role to assign ('admin', 'teacher', 'student').
 */
export const updateUserRole = async (userId, newRole) => {
    // Get a reference to our Cloud Function
    const updateUserRole = httpsCallable(functions, 'updateUserRole');
    // Call the function with the required data
    return updateUserRole({ userId, newRole });
};
