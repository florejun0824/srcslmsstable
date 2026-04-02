// src/services/firestoreService.js

import { db } from './firebase';
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
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import localforage from "localforage";

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
        const { status, ...cleanSub } = sub;
        batch.set(docRef, { ...cleanSub, syncedAt: serverTimestamp() });
      } catch (err) {
        stillPending.push(sub);
      }
    } else {
      stillPending.push(sub);
    }
  }

  await batch.commit();
  await localforage.setItem("quizSubmissions", stillPending);
};

export const submitQuizAnswers = async (submission) => {
  try {
    if (!navigator.onLine) {
      await saveOfflineSubmission({ ...submission, status: "pending_sync" });
      return { offline: true };
    }
    const docRef = await addDoc(collection(db, "quizSubmissions"), {
      ...submission,
      submittedAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (err) {
    console.error("❌ submitQuizAnswers failed", err);
    throw err;
  }
};

// ==============================
// 🔹 SUBJECT FUNCTIONS
// ==============================

export const getAllSubjects = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'courses'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("❌ getAllSubjects failed", err);
    throw err;
  }
};

// ==============================
// 🔹 USER MANAGEMENT
// ==============================

export const getUserProfile = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (err) {
    console.error(`❌ getUserProfile failed for uid=${uid}`, err);
    throw err;
  }
};

export const getUsersPaginated = async (schoolId = DEFAULT_SCHOOL_ID, lastDoc = null, pageSize = 20) => {
  try {
    let q = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      orderBy('lastName', 'asc'),
      limit(pageSize)
    );
    if (lastDoc) q = query(q, startAfter(lastDoc));
    const snap = await getDocs(q);
    return {
      users: snap.docs.map(d => ({ id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1]
    };
  } catch (err) {
    console.error("❌ getUsersPaginated failed", err);
    throw err;
  }
};

export const fixOrphanUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach((doc) => {
      if (!doc.data().schoolId) {
        batch.update(doc.ref, { schoolId: DEFAULT_SCHOOL_ID });
        count++;
      }
    });
    if (count > 0) await batch.commit();
    return count;
  } catch (err) {
    throw err;
  }
};

export const addUser = async (userData) => {
  try {
    const payload = { ...userData, schoolId: userData.schoolId || DEFAULT_SCHOOL_ID };
    await addDoc(collection(db, 'users'), payload);
  } catch (err) {
    throw err;
  }
};

export const deleteUser = async (userId) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    throw err;
  }
};

export const addMultipleUsers = async (users) => {
  try {
    const batch = writeBatch(db);
    users.forEach((user) => {
      const newUserRef = doc(collection(db, "users"));
      batch.set(newUserRef, { ...user, schoolId: user.schoolId || DEFAULT_SCHOOL_ID });
    });
    await batch.commit();
  } catch (err) {
    throw err;
  }
};

export const deleteMultipleUsers = async (userIds) => {
  try {
    const batch = writeBatch(db);
    userIds.forEach(id => batch.delete(doc(db, 'users', id)));
    await batch.commit();
  } catch (err) {
    throw err;
  }
};

export const updateUserPassword = async (userId, newPassword) => {
  try {
    await updateDoc(doc(db, 'users', userId), { password: newPassword });
  } catch (err) {
    throw err;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, "users", userId), data);
  } catch (err) {
    throw err;
  }
};

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
          schoolId: oldUser.schoolId || DEFAULT_SCHOOL_ID
        });
      }
    }

    if (oldUser.role === 'student' || role === 'student') {
      if (Object.keys(nameUpdates).length > 0) await updateStudentDetailsInClasses(batch, userId, nameUpdates);
    }
    if (oldUser.role === 'teacher' || role === 'teacher') {
      if (Object.keys(nameUpdates).length > 0) {
        await updateTeacherDetailsInDocuments(batch, userId, nameUpdates);
        await updateTeacherInPool(batch, userId, nameUpdates);
      }
    }
    await batch.commit();
  } catch (err) {
    throw err;
  }
};

// ==============================
// 🔹 CASCADE HELPERS
// ==============================

export const updateStudentDetailsInClasses = async (batch, studentId, newData) => {
  const q = query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId));
  const snap = await getDocs(q);
  snap.forEach(d => {
    const students = d.data().students.map(s => s.id === studentId ? { ...s, ...newData } : s);
    batch.update(d.ref, { students });
  });
};

export const removeStudentFromClasses = async (batch, studentId) => {
  const q = query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId));
  const snap = await getDocs(q);
  snap.forEach(d => {
    const students = d.data().students.filter(s => s.id !== studentId);
    const studentIds = d.data().studentIds.filter(id => id !== studentId);
    batch.update(d.ref, { students, studentIds });
  });
};

export const updateTeacherDetailsInDocuments = async (batch, teacherId, newData) => {
  const colls = ['classes', 'courses', 'teacherAnnouncements'];
  for (const c of colls) {
    const q = query(collection(db, c), where("teacherId", "==", teacherId));
    const snap = await getDocs(q);
    snap.forEach(d => batch.update(d.ref, newData));
  }
};

export const removeTeacherFromDocuments = async (batch, teacherId) => {
  const colls = ['classes', 'courses', 'teacherAnnouncements'];
  for (const c of colls) {
    const q = query(collection(db, c), where("teacherId", "==", teacherId));
    const snap = await getDocs(q);
    snap.forEach(d => batch.update(d.ref, { teacherId: null, firstName: null, lastName: null }));
  }
};

export const addTeacherToUnassignedPool = async (batch, data) => {
  batch.set(doc(db, "teachersPool", data.id), { ...data, assigned: false, createdAt: new Date() });
};

export const updateTeacherInPool = async (batch, id, data) => {
  batch.set(doc(db, "teachersPool", id), data, { merge: true });
};

export const removeTeacherFromPool = async (batch, id) => {
  batch.delete(doc(db, "teachersPool", id));
};

// ==============================
// 🔹 CLASS HELPERS
// ==============================

export const joinClassWithCode = async (classCode, studentProfile) => {
  const q = query(collection(db, "classes"), where("classCode", "==", classCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid class code.");
  const classDoc = snap.docs[0];
  const classData = classDoc.data();
  if (classData.studentIds?.includes(studentProfile.id)) throw new Error("Already enrolled.");
  
  await updateDoc(classDoc.ref, {
    studentIds: arrayUnion(studentProfile.id),
    students: arrayUnion({ id: studentProfile.id, firstName: studentProfile.firstName, lastName: studentProfile.lastName })
  });
  return { success: true, className: classData.name };
};

export const updateClassArchiveStatus = async (id, isArchived) => updateDoc(doc(db, "classes", id), { isArchived });
export const deleteClass = async (id) => deleteDoc(doc(db, "classes", id));

export const getAllClasses = async (schoolId) => {
  const q = query(collection(db, 'classes'), where("schoolId", "==", schoolId || DEFAULT_SCHOOL_ID));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addStudentsToClass = async (classId, studentIds, studentObjects) => {
  const classRef = doc(db, "classes", classId);
  const objects = studentObjects.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName }));
  await updateDoc(classRef, { studentIds: arrayUnion(...studentIds), students: arrayUnion(...objects) });
};

// ==============================
// 🔹 ANNOUNCEMENTS
// ==============================

export const updateAnnouncement = async (classId, postId, content) => updateDoc(doc(db, `classes/${classId}/posts`, postId), { content });
export const deleteAnnouncement = async (classId, postId) => deleteDoc(doc(db, `classes/${classId}/posts`, postId));
export const postTeacherAnnouncement = async (profile, content) => {
  return addDoc(collection(db, "teacherAnnouncements"), {
    content,
    teacherId: profile.id,
    teacherName: `${profile.firstName} ${profile.lastName}`,
    schoolId: profile.schoolId || DEFAULT_SCHOOL_ID,
    createdAt: serverTimestamp(),
  });
};

// ==============================
// 🔹 ADMIN FUNCTIONS (HTTPS CALLERS)
// ==============================

const callCloudFunction = async (functionName, payload) => {
  const url = `https://us-central1-srcs-log-book.cloudfunctions.net/${functionName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer SRCS-Secret-2026' 
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Cloud Function Error: ${await response.text()}`);
  return response.json();
};

export const setUserRestrictionStatus = (userId, shouldRestrict) => callCloudFunction('setUserRestrictionStatus', { userId, shouldRestrict });
export const updateUserRole = (userId, newRole) => callCloudFunction('updateUserRole', { userId, newRole });

// ==============================
// 🔹 PARENT PORTAL HELPERS
// ==============================

export const generateParentLinkCode = async (studentId) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  await updateDoc(doc(db, 'users', studentId), { parentLinkCode: code });
  return code;
};

export const linkParentWithCode = async (parentId, linkCode) => {
  const q = query(collection(db, 'users'), where('parentLinkCode', '==', linkCode.toUpperCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Invalid link code.");
  const student = snap.docs[0];
  await updateDoc(doc(db, 'users', parentId), { childStudentIds: arrayUnion(student.id) });
  return { success: true, studentName: `${student.data().firstName} ${student.data().lastName}`, studentId: student.id };
};

export const getStudentGrades = async (studentId) => {
  const q = query(collection(db, 'quizSubmissions'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getStudentActivity = async (studentId) => {
  const studentSnap = await getDoc(doc(db, 'users', studentId));
  if (!studentSnap.exists()) throw new Error("Student not found.");
  const studentData = studentSnap.data();

  const qClasses = query(collection(db, 'classes'), where('studentIds', 'array-contains', studentId));
  const classes = (await getDocs(qClasses)).docs.map(d => ({ id: d.id, ...d.data() }));

  let lessonsCount = 0, quizzesCount = 0;
  for (const c of classes) {
    const posts = await getDocs(query(collection(db, `classes/${c.id}/posts`)));
    posts.forEach(p => {
      const data = p.data();
      if (data.targetAudience !== 'specific' || data.targetStudentIds?.includes(studentId)) {
        lessonsCount += (data.lessons?.length || 0);
        quizzesCount += (data.quizzes?.length || 0);
      }
    });
  }

  const submissions = (await getDocs(query(collection(db, 'quizSubmissions'), where('studentId', '==', studentId)))).docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    completedLessons: studentData.completedLessons || [],
    classes,
    quizSubmissions: submissions,
    totalAssignedLessons: lessonsCount,
    totalAssignedQuizzes: quizzesCount,
    xp: studentData.xp || 0,
    level: studentData.level || 1,
    gradeLevel: studentData.gradeLevel || '',
    lastLogin: studentData.lastLogin || null,
  };
};

// ==============================
// 🔹 DEFAULT EXPORT
// ==============================
const firestoreService = {
  getAllSubjects,
  getUserProfile,
  getUsersPaginated,
  fixOrphanUsers,
  addUser,
  deleteUser,
  addMultipleUsers,
  deleteMultipleUsers,
  updateUserPassword,
  updateUserProfile,
  updateUserDetails,
  joinClassWithCode,
  updateClassArchiveStatus,
  deleteClass,
  getAllClasses,
  addStudentsToClass,
  updateAnnouncement,
  deleteAnnouncement,
  postTeacherAnnouncement,
  setUserRestrictionStatus,
  updateUserRole,
  submitQuizAnswers,
  syncOfflineSubmissions,
  generateParentLinkCode,
  linkParentWithCode,
  getStudentGrades,
  getStudentActivity
};

export default firestoreService;