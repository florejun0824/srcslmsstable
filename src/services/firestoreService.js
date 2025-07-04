// src/services/firestoreService.js

import {
    db // This is imported from your firebase.js file
} from './firebase';

import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    writeBatch,
    query, // <-- Make sure query is imported
    where    // <-- Make sure where is imported
} from 'firebase/firestore';

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

// --- Function to update STUDENT data across all classes ---

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

// --- THIS IS THE MISSING FUNCTION for updating TEACHER data ---

/**
 * Finds all documents related to a teacher and updates their denormalized name.
 * @param {string} teacherId The ID of the teacher being updated.
 * @param {object} newData The new data, e.g., { teacherName: 'Jane Doe' }.
 */
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