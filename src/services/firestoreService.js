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

export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ getAllUsers failed", err);
    throw err;
  }
};

export const addUser = async (userData) => {
  try {
    await addDoc(collection(db, 'users'), userData);
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

export const addMultipleUsers = async (users) => {
  try {
    const batch = writeBatch(db);
    const usersCollectionRef = collection(db, "users");
    users.forEach((user) => {
      const newUserRef = doc(usersCollectionRef);
      batch.set(newUserRef, user);
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
  try {
    const userDocRef = doc(db, 'users', userId);

    const oldUserSnap = await getDoc(userDocRef);
    if (!oldUserSnap.exists()) throw new Error("User not found.");
    const oldUser = { id: userId, ...oldUserSnap.data() };

    await updateDoc(userDocRef, updates);

    const { firstName, lastName, role, email } = updates;
    const nameUpdates = {};
    if (firstName !== undefined) nameUpdates.firstName = firstName;
    if (lastName !== undefined) nameUpdates.lastName = lastName;

    if (role && role !== oldUser.role) {
      if (oldUser.role === 'teacher' && role !== 'teacher') {
        await removeTeacherFromDocuments(userId);
        await removeTeacherFromPool(userId);
      }
      if (oldUser.role === 'student' && role !== 'student') {
        await removeStudentFromClasses(userId);
      }
      if (role === 'teacher' && oldUser.role !== 'teacher') {
        await addTeacherToUnassignedPool({
          id: userId,
          firstName: firstName || oldUser.firstName || "",
          lastName: lastName || oldUser.lastName || "",
          email: email || oldUser.email || ""
        });
      }
    }

    if (oldUser.role === 'student' || role === 'student') {
      if (Object.keys(nameUpdates).length > 0) {
        await updateStudentDetailsInClasses(userId, nameUpdates);
      }
    }
    if (oldUser.role === 'teacher' || role === 'teacher') {
      if (Object.keys(nameUpdates).length > 0) {
        await updateTeacherDetailsInDocuments(userId, nameUpdates);
        await updateTeacherInPool(userId, nameUpdates);
      }
    }
  } catch (err) {
    console.error(`❌ updateUserDetails failed for userId=${userId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Student / Teacher Relations
// ==============================
export const updateStudentDetailsInClasses = async (studentId, newData) => {
  try {
    if (!studentId || !newData) return;

    const batch = writeBatch(db);
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

    await batch.commit();
  } catch (err) {
    console.error(`❌ updateStudentDetailsInClasses failed for studentId=${studentId}`, err);
    throw err;
  }
};

export const removeStudentFromClasses = async (studentId) => {
  try {
    const batch = writeBatch(db);
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

    await batch.commit();
  } catch (err) {
    console.error(`❌ removeStudentFromClasses failed for studentId=${studentId}`, err);
    throw err;
  }
};

export const updateTeacherDetailsInDocuments = async (teacherId, newData) => {
  try {
    if (!teacherId || !newData) return;

    const batch = writeBatch(db);
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

    await batch.commit();
  } catch (err) {
    console.error(`❌ updateTeacherDetailsInDocuments failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

export const removeTeacherFromDocuments = async (teacherId) => {
  try {
    const batch = writeBatch(db);
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

    await batch.commit();
  } catch (err) {
    console.error(`❌ removeTeacherFromDocuments failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

// ==============================
// 🔹 Teacher Pool Helpers
// ==============================
export const addTeacherToUnassignedPool = async (teacherData) => {
  try {
    await setDoc(doc(db, "teachersPool", teacherData.id), {
      ...teacherData,
      assigned: false,
      createdAt: new Date()
    });
  } catch (err) {
    console.error(`❌ addTeacherToUnassignedPool failed for teacherId=${teacherData.id}`, err);
    throw err;
  }
};

export const updateTeacherInPool = async (teacherId, newData) => {
  try {
    const teacherRef = doc(db, "teachersPool", teacherId);
    const allowedFields = {};
    if (newData.firstName) allowedFields.firstName = newData.firstName;
    if (newData.lastName) allowedFields.lastName = newData.lastName;

    if (Object.keys(allowedFields).length > 0) {
      await updateDoc(teacherRef, allowedFields);
    }
  } catch (err) {
    console.error(`❌ updateTeacherInPool failed for teacherId=${teacherId}`, err);
    throw err;
  }
};

export const removeTeacherFromPool = async (teacherId) => {
  try {
    await deleteDoc(doc(db, "teachersPool", teacherId));
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
    const q = query(collection(db, "classes"), where("classCode", "==", upperCaseClassCode));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      throw new Error("Invalid class code. Please check the code and try again.");
    }
    const classDoc = querySnapshot.docs[0];
    const classDocRef = doc(db, "classes", classDoc.id);
    const studentObject = {
      id: studentProfile.id,
      firstName: studentProfile.firstName,
      lastName: studentProfile.lastName
    };
    await updateDoc(classDocRef, {
      students: arrayUnion(studentObject),
      studentIds: arrayUnion(studentProfile.id)
    });
    return { success: true, className: classDoc.data().name };
  } catch (err) {
    console.error(`❌ joinClassWithCode failed for code=${classCode}`, err);
    throw err;
  }
};

export const updateClassArchiveStatus = async (classId, isArchived) => {
  try {
    return updateDoc(doc(db, "classes", classId), { isArchived });
  } catch (err) {
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

export const postTeacherAnnouncement = async (teacherProfile, content) => {
  try {
    return addDoc(collection(db, "teacherAnnouncements"), {
      content,
      teacherId: teacherProfile.id,
      teacherName: `${teacherProfile.firstName} ${teacherProfile.lastName}`,
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

  updateAnnouncement,
  deleteAnnouncement,
  postTeacherAnnouncement,

  setUserRestrictionStatus,
  updateUserRole,

  syncOfflineSubmissions,
  submitQuizAnswers
};

export default firestoreService;
