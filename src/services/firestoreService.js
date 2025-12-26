// src/services/firestoreService.js

import { db } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  setDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import localforage from "localforage";

const functions = getFunctions();

const DEFAULT_SCHOOL_ID = 'srcs_main';

localforage.config({
  name: "LMSApp",
  storeName: "offlineSubmissions",
});

// ==============================
// 🔹 OFFLINE SYNC HELPERS
// ==============================
const saveOfflineSubmission = async (submission) => {
  const existing = (await localforage.getItem("quizSubmissions")) || [];
  existing.push(submission);
  await localforage.setItem("quizSubmissions", existing);
};

export const syncOfflineSubmissions = async (studentId) => {
  const submissions = (await localforage.getItem("quizSubmissions")) || [];
  const stillPending = [];
  const batch = writeBatch(db);

  for (let sub of submissions) {
    if (sub.status === "pending_sync" && sub.studentId === studentId) {
      try {
        const docRef = doc(collection(db, "quizSubmissions"));
        batch.set(docRef, {
          ...sub,
          status: "synced",
          syncedAt: new Date(),
        });
      } catch (err) {
        console.error("❌ syncOfflineSubmissions failed", err);
        stillPending.push(sub);
      }
    } else {
      stillPending.push(sub);
    }
  }

  await batch.commit();
  await localforage.setItem("quizSubmissions", stillPending);
  return stillPending;
};

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

export const getAllSubjects = async () => {
  try {
    // 🌍 SHARED CONTENT: No schoolId filter here. Everyone sees the same courses.
    const snapshot = await getDocs(collection(db, 'courses'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ getAllSubjects failed", err);
    throw err;
  }
};

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
// 🔹 USER MANAGEMENT
// ==============================
export const getUserProfile = async (uid) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
  } catch (err) {
    console.error(`❌ getUserProfile failed for uid=${uid}`, err);
    throw err;
  }
};

// 🔒 UPDATED: Handle "Legacy" users (missing schoolId) for the Main School
export const getAllUsers = async (schoolId) => {
  try {
    const targetSchool = schoolId || DEFAULT_SCHOOL_ID;
    const usersRef = collection(db, 'users');
    
    // 1. If we are the MAIN SCHOOL, fetch ALL users first
    // This allows us to "adopt" users who have no schoolId yet.
    if (targetSchool === DEFAULT_SCHOOL_ID) {
      const snapshot = await getDocs(usersRef);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(user => 
          // Keep if they belong to Main School OR have no school assigned (legacy)
          user.schoolId === DEFAULT_SCHOOL_ID || !user.schoolId
        );
    }

    // 2. If we are a SISTER SCHOOL, use strict filtering
    // They should NEVER see "unassigned" users.
    const q = query(usersRef, where("schoolId", "==", targetSchool));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  } catch (err) {
    console.error("❌ getAllUsers failed", err);
    throw err;
  }
};

export const addUser = async (userData) => {
  try {
    // Ensure schoolId is present (default to main if missing)
    const payload = {
      ...userData,
      schoolId: userData.schoolId || DEFAULT_SCHOOL_ID
    };
    await addDoc(collection(db, 'users'), payload);
  } catch (err) {
    console.error("❌ addUser failed", err);
    throw err;
  }
};

export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.error(`❌ deleteUser failed for userId=${userId}`, err);
    throw err;
  }
};

// 🔒 UPDATED: Ensure batch added users have schoolId
export const addMultipleUsers = async (users) => {
  if (!Array.isArray(users)) {
    const error = new TypeError("Failed to add multiple users: The input must be an array.");
    console.error(error.message, { received: users });
    throw error;
  }
  try {
    const batch = writeBatch(db);
    const usersCollectionRef = collection(db, "users");
    
    users.forEach((user) => {
      const newUserRef = doc(usersCollectionRef);
      // Attach schoolId to every user in the batch
      batch.set(newUserRef, {
        ...user,
        schoolId: user.schoolId || DEFAULT_SCHOOL_ID
      });
    });
    await batch.commit();
  } catch (err) {
    console.error("❌ addMultipleUsers failed", err);
    throw err;
  }
};

export const deleteMultipleUsers = async (userIds) => {
  try {
    const batch = writeBatch(db);
    userIds.forEach(userId => {
      batch.delete(doc(db, 'users', userId));
    });
    await batch.commit();
  } catch (err) {
    console.error("❌ deleteMultipleUsers failed", err);
    throw err;
  }
};

export const updateUserPassword = async (userId, newPassword) => {
  try {
    await updateDoc(doc(db, 'users', userId), { password: newPassword });
  } catch (err) {
    console.error(`❌ updateUserPassword failed for userId=${userId}`, err);
    throw err;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, "users", userId), data);
  } catch (err) {
    console.error(`❌ updateUserProfile failed for userId=${userId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 updateUserDetails with Cascade
// ==============================
export const updateUserDetails = async (userId, updates) => {
  const batch = writeBatch(db);
  try {
    const userDocRef = doc(db, 'users', userId);

    const oldUserSnap = await getDoc(userDocRef);
    if (!oldUserSnap.exists()) throw new Error("User not found.");
    const oldUser = { id: userId, ...oldUserSnap.data() };

    batch.update(userDocRef, updates);

    const { firstName, lastName, role, email } = updates;
    const nameUpdates = {};
    if (firstName !== undefined) nameUpdates.firstName = firstName;
    if (lastName !== undefined) nameUpdates.lastName = lastName;

    if (role && role !== oldUser.role) {
      if (oldUser.role === 'teacher' && role !== 'teacher') {
        await removeTeacherFromDocuments(batch, userId);
        await removeTeacherFromPool(batch, userId);
      }
      if (oldUser.role === 'student' && role !== 'student') {
        await removeStudentFromClasses(batch, userId);
      }
      if (role === 'teacher' && oldUser.role !== 'teacher') {
        await addTeacherToUnassignedPool(batch, {
          id: userId,
          firstName: firstName || oldUser.firstName || "",
          lastName: lastName || oldUser.lastName || "",
          email: email || oldUser.email || "",
          schoolId: oldUser.schoolId || DEFAULT_SCHOOL_ID // Preserve school ID
        });
      }
    }

    if (oldUser.role === 'student' || role === 'student') {
      if (Object.keys(nameUpdates).length > 0) {
        await updateStudentDetailsInClasses(batch, userId, nameUpdates);
      }
    }
    if (oldUser.role === 'teacher' || role === 'teacher') {
      if (Object.keys(nameUpdates).length > 0) {
        await updateTeacherDetailsInDocuments(batch, userId, nameUpdates);
        await updateTeacherInPool(batch, userId, nameUpdates);
      }
    }
    await batch.commit();
  } catch (err) {
    console.error(`❌ updateUserDetails failed for userId=${userId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Student / Teacher Relations
// ==============================
export const updateStudentDetailsInClasses = async (batch, studentId, newData) => {
  try {
    if (!studentId || !newData) return;

    const q = query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId));
    const classesSnapshot = await getDocs(q);

    classesSnapshot.forEach(docSnap => {
      const classData = docSnap.data();
      if (!classData.students || !Array.isArray(classData.students)) return;

      const updatedStudents = classData.students.map(student =>
        student.id === studentId ? { ...student, ...newData } : student
      );

      batch.update(docSnap.ref, { students: updatedStudents });
    });
  } catch (err) {
    console.error(`❌ updateStudentDetailsInClasses failed for studentId=${studentId}`, err);
    throw err;
  }
};

export const removeStudentFromClasses = async (batch, studentId) => {
  try {
    const q = query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId));
    const classesSnapshot = await getDocs(q);

    classesSnapshot.forEach(docSnap => {
      const classData = docSnap.data();
      const filteredStudents = (classData.students || []).filter(s => s.id !== studentId);
      const filteredIds = (classData.studentIds || []).filter(id => id !== studentId);

      batch.update(docSnap.ref, {
        students: filteredStudents,
        studentIds: filteredIds
      });
    });
  } catch (err) {
    console.error(`❌ removeStudentFromClasses failed for studentId=${studentId}`, err);
    throw err;
  }
};

export const updateTeacherDetailsInDocuments = async (batch, teacherId, newData) => {
  try {
    if (!teacherId || !newData) return;

    const collectionsToUpdate = ['classes', 'courses', 'teacherAnnouncements'];

    for (const coll of collectionsToUpdate) {
      const q = query(collection(db, coll), where("teacherId", "==", teacherId));
      const snapshot = await getDocs(q);

      snapshot.forEach(docSnap => {
        const allowedFields = {};
        if (newData.firstName) allowedFields.firstName = newData.firstName;
        if (newData.lastName) allowedFields.lastName = newData.lastName;

        if (Object.keys(allowedFields).length > 0) {
          batch.update(docSnap.ref, allowedFields);
        }
      });
    }
  } catch (err) {
    console.error(`❌ updateTeacherDetailsInDocuments failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

export const removeTeacherFromDocuments = async (batch, teacherId) => {
  try {
    const collectionsToUpdate = ['classes', 'courses', 'teacherAnnouncements'];

    for (const coll of collectionsToUpdate) {
      const q = query(collection(db, coll), where("teacherId", "==", teacherId));
      const snapshot = await getDocs(q);

      snapshot.forEach(docSnap => {
        batch.update(docSnap.ref, {
          teacherId: null,
          firstName: null,
          lastName: null
        });
      });
    }
  } catch (err) {
    console.error(`❌ removeTeacherFromDocuments failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Teacher Pool Helpers
// ==============================
export const addTeacherToUnassignedPool = async (batch, teacherData) => {
  try {
    batch.set(doc(db, "teachersPool", teacherData.id), {
      ...teacherData,
      assigned: false,
      createdAt: new Date()
    });
  } catch (err) {
    console.error(`❌ addTeacherToUnassignedPool failed for teacherId=${teacherData.id}`, err);
    throw err;
  }
};

export const updateTeacherInPool = async (batch, teacherId, newData) => {
  try {
    const teacherRef = doc(db, "teachersPool", teacherId);
    const allowedFields = {};
    if (newData.firstName) allowedFields.firstName = newData.firstName;
    if (newData.lastName) allowedFields.lastName = newData.lastName;

    if (Object.keys(allowedFields).length > 0) {
      batch.set(teacherRef, allowedFields, { merge: true });
    }
  } catch (err) {
    console.error(`❌ updateTeacherInPool failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

export const removeTeacherFromPool = async (batch, teacherId) => {
  try {
    batch.delete(doc(db, "teachersPool", teacherId));
  } catch (err) {
    console.error(`❌ removeTeacherFromPool failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Class Helpers
// ==============================
export const joinClassWithCode = async (classCode, studentProfile) => {
  try {
    if (!classCode || !studentProfile) {
      throw new Error("Class code and student profile are required.");
    }

    const upperCaseClassCode = classCode.toUpperCase();
    // 1. Find the class by code
    const q = query(collection(db, "classes"), where("classCode", "==", upperCaseClassCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Invalid class code. Please check the code and try again.");
    }

    const classDoc = querySnapshot.docs[0];
    const classData = classDoc.data();
    const classDocRef = doc(db, "classes", classDoc.id);

    // 🔒 SECURITY: Prevent cross-school joining
    // If class has no schoolId, assume default. If student has none, assume default.
    const classSchoolId = classData.schoolId || DEFAULT_SCHOOL_ID;
    const studentSchoolId = studentProfile.schoolId || DEFAULT_SCHOOL_ID;

    if (classSchoolId !== studentSchoolId) {
      throw new Error("You cannot join a class from a different school.");
    }

    if (classData.gradeLevel !== studentProfile.gradeLevel) {
      throw new Error(
        `Join failed: Your grade (${studentProfile.gradeLevel}) does not match the class's grade (${classData.gradeLevel}).`
      );
    }
    
    if (classData.studentIds && classData.studentIds.includes(studentProfile.id)) {
      throw new Error("You are already enrolled in this class.");
    }

    const studentObject = {
      id: studentProfile.id,
      firstName: studentProfile.firstName,
      lastName: studentProfile.lastName
    };
    await updateDoc(classDocRef, {
      students: arrayUnion(studentObject),
      studentIds: arrayUnion(studentProfile.id)
    });

    return { success: true, className: classData.name };
  } catch (err) {
    console.error(`❌ joinClassWithCode failed for code=${classCode}`, err);
    throw err;
  }
};

export const updateClassArchiveStatus = async (classId, isArchived) => {
  try {
    return updateDoc(doc(db, "classes", classId), { isArchived });
  } catch (err)
 {
    console.error(`❌ updateClassArchiveStatus failed for classId=${classId}`, err);
    throw err;
  }
};

export const deleteClass = async (classId) => {
  try {
    return await deleteDoc(doc(db, "classes", classId));
  } catch (err) {
    console.error(`❌ deleteClass failed for classId=${classId}`, err);
    throw err;
  }
};

// 🔒 UPDATED: Filter classes by School ID
export const getAllClasses = async (schoolId) => {
  try {
    const targetSchool = schoolId || DEFAULT_SCHOOL_ID;
    const classesRef = collection(db, 'classes');
    
    // Filter by school AND ensure not archived
    const q = query(
      classesRef, 
      where("isArchived", "!=", true),
      where("schoolId", "==", targetSchool)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error(`❌ getAllClasses failed`, err);
    throw err;
  }
};

export const addStudentsToClass = async (classId, studentIds, studentObjects) => {
  try {
    if (!classId || !studentIds || !studentObjects) {
      throw new Error("classId, studentIds, and studentObjects are required.");
    }
    
    const classRef = doc(db, "classes", classId);
    
    const studentsForUnion = studentObjects.map(s => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName
    }));

    await updateDoc(classRef, {
      studentIds: arrayUnion(...studentIds),
      students: arrayUnion(...studentsForUnion)
    });

  } catch (err) {
    console.error(`❌ addStudentsToClass failed for classId=${classId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Announcements
// ==============================
export const updateAnnouncement = async (classId, postId, newContent) => {
  try {
    return updateDoc(doc(db, `classes/${classId}/posts`, postId), { content: newContent });
  } catch (err) {
    console.error(`❌ updateAnnouncement failed for classId=${classId}, postId=${postId}`, err);
    throw err;
  }
};

export const deleteAnnouncement = async (classId, postId) => {
  try {
    return deleteDoc(doc(db, `classes/${classId}/posts`, postId));
  } catch (err) {
    console.error(`❌ deleteAnnouncement failed for classId=${classId}, postId=${postId}`, err);
    throw err;
  }
};

// 🔒 UPDATED: Tag announcement with schoolId
export const postTeacherAnnouncement = async (teacherProfile, content) => {
  try {
    return addDoc(collection(db, "teacherAnnouncements"), {
      content,
      teacherId: teacherProfile.id,
      teacherName: `${teacherProfile.firstName} ${teacherProfile.lastName}`,
      schoolId: teacherProfile.schoolId || DEFAULT_SCHOOL_ID,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`❌ postTeacherAnnouncement failed for teacherId=${teacherProfile.id}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Admin Functions
// ==============================
export const setUserRestrictionStatus = async (userId, shouldRestrict) => {
  try {
    const setUserRestriction = httpsCallable(functions, 'setUserRestrictionStatus');
    return setUserRestriction({ userId, shouldRestrict });
  } catch (err) {
    console.error(`❌ setUserRestrictionStatus failed for userId=${userId}`, err);
    throw err;
  }
};

export const updateUserRole = async (userId, newRole) => {
  try {
    const updateUserRole = httpsCallable(functions, 'updateUserRole');
    return updateUserRole({ userId, newRole });
  } catch (err) {
    console.error(`❌ updateUserRole failed for userId=${userId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 DEFAULT EXPORT
// ==============================
const firestoreService = {
  getAllSubjects,
  getUserProfile,
  getAllUsers,
  addUser,
  deleteUser,
  addMultipleUsers,
  deleteMultipleUsers,
  updateUserPassword,
  updateUserProfile,
  updateUserDetails,

  updateStudentDetailsInClasses,
  removeStudentFromClasses,
  updateTeacherDetailsInDocuments,
  removeTeacherFromDocuments,

  addTeacherToUnassignedPool,
  updateTeacherInPool,
  removeTeacherFromPool,

  joinClassWithCode,
  updateClassArchiveStatus,
  deleteClass,
  getAllClasses, // <-- UPDATED
  addStudentsToClass, 

  updateAnnouncement,
  deleteAnnouncement,
  postTeacherAnnouncement,

  setUserRestrictionStatus,
  updateUserRole,

  syncOfflineSubmissions,
  submitQuizAnswers
};

export default firestoreService;