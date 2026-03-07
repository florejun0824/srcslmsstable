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
  serverTimestamp,
  orderBy,     // <-- ADDED for Pagination
  limit,       // <-- ADDED for Pagination
  startAfter   // <-- ADDED for Pagination
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
// 🔹 USER MANAGEMENT (OPTIMIZED)
// ==============================

// 🛠️ ONE-TIME FIX: Run this to assign 'srcs_main' to users with no schoolId
export const fixOrphanUsers = async () => {
  try {
    console.log("🛠️ Starting Orphan User Fix...");
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      // If schoolId is missing, assign it to Default
      if (!data.schoolId) {
        batch.update(doc.ref, { schoolId: DEFAULT_SCHOOL_ID });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Fixed ${count} orphan users. You can now use Paginated Queries safely.`);
    } else {
      console.log("✅ No orphan users found. Database is clean.");
    }
    return count;
  } catch (err) {
    console.error("❌ fixOrphanUsers failed", err);
    throw err;
  }
};

// ⚡ PAGINATED FETCH: Use this for the Admin Table to save costs
// Returns: { users: [...], lastDoc: QueryDocumentSnapshot }
export const getUsersPaginated = async (schoolId, lastVisibleDoc = null, pageSize = 20) => {
  try {
    const targetSchool = schoolId || DEFAULT_SCHOOL_ID;
    const usersRef = collection(db, 'users');

    // Base query: Filter by school and Sort by Name
    let q = query(
      usersRef,
      where("schoolId", "==", targetSchool),
      orderBy("lastName"),
      limit(pageSize)
    );

    // If we have a "Next Page" cursor, start after it
    if (lastVisibleDoc) {
      q = query(
        usersRef,
        where("schoolId", "==", targetSchool),
        orderBy("lastName"),
        startAfter(lastVisibleDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);

    return {
      users: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
    };

  } catch (err) {
    console.error("❌ getUsersPaginated failed", err);
    throw err;
  }
};

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

// ⚠️ LEGACY: Downloads ALL users. Use getUsersPaginated instead if possible.
export const getAllUsers = async (schoolId) => {
  try {
    const targetSchool = schoolId || DEFAULT_SCHOOL_ID;
    const usersRef = collection(db, 'users');

    // 1. If we are the MAIN SCHOOL, fetch ALL users first
    if (targetSchool === DEFAULT_SCHOOL_ID) {
      const snapshot = await getDocs(usersRef);
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(user =>
          user.schoolId === DEFAULT_SCHOOL_ID || !user.schoolId
        );
    }

    // 2. If we are a SISTER SCHOOL, use strict filtering
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
// 🔹 PARENT PORTAL HELPERS
// ==============================

/**
 * Generates a unique 6-character parent link code for a student.
 * Stores it on the student's user document.
 */
export const generateParentLinkCode = async (studentId) => {
  try {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const studentRef = doc(db, 'users', studentId);
    await updateDoc(studentRef, { parentLinkCode: code });
    return code;
  } catch (err) {
    console.error(`❌ generateParentLinkCode failed for studentId=${studentId}`, err);
    throw err;
  }
};

/**
 * Links a parent to a student using the student's parent link code.
 * Adds the student's ID to the parent's childStudentIds array.
 */
export const linkParentWithCode = async (parentId, linkCode) => {
  try {
    if (!linkCode || !parentId) {
      throw new Error("Parent ID and link code are required.");
    }

    const upperCode = linkCode.toUpperCase().trim();

    // 1. Find the student with this code
    const q = query(collection(db, 'users'), where('parentLinkCode', '==', upperCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error("Invalid link code. Please check the code and try again.");
    }

    const studentDoc = snapshot.docs[0];
    const studentId = studentDoc.id;
    const studentData = studentDoc.data();

    // 2. Prevent duplicate linking
    const parentRef = doc(db, 'users', parentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) throw new Error("Parent account not found.");

    const parentData = parentSnap.data();
    const existingChildren = parentData.childStudentIds || [];

    if (existingChildren.includes(studentId)) {
      throw new Error("This student is already linked to your account.");
    }

    // 3. School validation
    const parentSchool = parentData.schoolId || DEFAULT_SCHOOL_ID;
    const studentSchool = studentData.schoolId || DEFAULT_SCHOOL_ID;
    if (parentSchool !== studentSchool) {
      throw new Error("Cannot link to a student from a different school.");
    }

    // 4. Link them
    await updateDoc(parentRef, {
      childStudentIds: arrayUnion(studentId)
    });

    return {
      success: true,
      studentName: `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim(),
      studentId
    };
  } catch (err) {
    console.error(`❌ linkParentWithCode failed`, err);
    throw err;
  }
};

/**
 * Fetches all quiz submissions for a student, organized by class.
 */
export const getStudentGrades = async (studentId) => {
  try {
    const q = query(
      collection(db, 'quizSubmissions'),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`❌ getStudentGrades failed for studentId=${studentId}`, err);
    throw err;
  }
};

/**
 * Fetches recent activity for a student (classes, completed lessons from user doc).
 */
export const getStudentActivity = async (studentId) => {
  try {
    // 1. Get the student profile for completedLessons
    const studentSnap = await getDoc(doc(db, 'users', studentId));
    if (!studentSnap.exists()) throw new Error("Student not found.");
    const studentData = studentSnap.data();

    // 2. Get classes the student is enrolled in
    const classesQuery = query(
      collection(db, 'classes'),
      where('studentIds', 'array-contains', studentId)
    );
    const classesSnap = await getDocs(classesQuery);
    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2.5 Get all assigned lessons and quizzes from class posts
    let totalAssignedLessons = 0;
    let totalAssignedQuizzes = 0;

    for (const classItem of classes) {
      const postsQuery = query(collection(db, `classes/${classItem.id}/posts`));
      const postsSnap = await getDocs(postsQuery);

      postsSnap.forEach(postDoc => {
        const post = postDoc.data();

        let isRecipient = false;
        if (post.targetAudience === 'specific') {
          isRecipient = (post.targetStudentIds || []).includes(studentId);
        } else {
          isRecipient = true; // 'Global' or undefined
        }

        if (isRecipient) {
          if (post.lessons && Array.isArray(post.lessons)) {
            totalAssignedLessons += post.lessons.length;
          }
          if (post.quizzes && Array.isArray(post.quizzes)) {
            totalAssignedQuizzes += post.quizzes.length;
          }
        }
      });
    }

    // 3. Get quiz submissions
    const subsQuery = query(
      collection(db, 'quizSubmissions'),
      where('studentId', '==', studentId)
    );
    const subsSnap = await getDocs(subsQuery);
    const submissions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return {
      completedLessons: studentData.completedLessons || [],
      classes,
      quizSubmissions: submissions,
      totalAssignedLessons,
      totalAssignedQuizzes,
      xp: studentData.xp || 0,
      level: studentData.level || 1,
      gradeLevel: studentData.gradeLevel || '',
      lastLogin: studentData.lastLogin || null,
    };
  } catch (err) {
    console.error(`❌ getStudentActivity failed for studentId=${studentId}`, err);
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
  getUsersPaginated,
  fixOrphanUsers,
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
  getAllClasses,
  addStudentsToClass,

  updateAnnouncement,
  deleteAnnouncement,
  postTeacherAnnouncement,

  setUserRestrictionStatus,
  updateUserRole,

  syncOfflineSubmissions,
  submitQuizAnswers,

  // Parent Portal
  generateParentLinkCode,
  linkParentWithCode,
  getStudentGrades,
  getStudentActivity
};

export default firestoreService;