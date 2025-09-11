// src/services/firestoreService.js

import { db } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
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

// ✅ Local storage for offline
import localforage from "localforage";

// --- Initialize Firebase Functions ---
const functions = getFunctions();

// --- LocalForage setup ---
localforage.config({
    name: "LMSApp",
    storeName: "offlineSubmissions",
});

// ==============================
// 🔹 OFFLINE SYNC HELPERS
// ==============================

// Save submission locally
const saveOfflineSubmission = async (submission) => {
    const existing = (await localforage.getItem("quizSubmissions")) || [];
    existing.push(submission);
    await localforage.setItem("quizSubmissions", existing);
};

// Try to sync all pending submissions
export const syncOfflineSubmissions = async (studentId) => {
    const submissions = (await localforage.getItem("quizSubmissions")) || [];
    const stillPending = [];

    for (let sub of submissions) {
        if (sub.status === "pending_sync" && sub.studentId === studentId) {
            try {
                await addDoc(collection(db, "quizSubmissions"), {
                    ...sub,
                    status: "synced",
                    syncedAt: new Date(),
                });
            } catch (err) {
                console.error("❌ Sync failed, keeping offline", err);
                stillPending.push(sub); // keep it
            }
        } else {
            stillPending.push(sub); // already synced or belongs to another user
        }
    }

    await localforage.setItem("quizSubmissions", stillPending);
    return stillPending;
};

// Main entry: submit quiz answers
export const submitQuizAnswers = async (quizId, classId, answers, studentId) => {
    const submission = {
        quizId,
        classId,
        studentId,
        answers,
        createdAt: new Date(),
        status: navigator.onLine ? "synced" : "pending_sync",
    };

    if (navigator.onLine) {
        return addDoc(collection(db, "quizSubmissions"), submission);
    } else {
        await saveOfflineSubmission(submission);
        return { offline: true, ...submission };
    }
};

// Attach event listener once
if (typeof window !== "undefined") {
    window.addEventListener("online", async () => {
        const studentId = JSON.parse(localStorage.getItem("userProfile") || "{}").id;
        if (studentId) {
            console.log("🌐 Back online, syncing submissions...");
            await syncOfflineSubmissions(studentId);
        }
    });
}

// ==============================
// 🔹 Existing functions unchanged
// ==============================

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

// --- Admin Dashboard Cloud Functions ---
export const setUserRestrictionStatus = async (userId, shouldRestrict) => {
    const setUserRestriction = httpsCallable(functions, 'setUserRestrictionStatus');
    return setUserRestriction({ userId, shouldRestrict });
};

export const updateUserRole = async (userId, newRole) => {
    const updateUserRole = httpsCallable(functions, 'updateUserRole');
    return updateUserRole({ userId, newRole });
};
