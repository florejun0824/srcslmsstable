import { useCallback, useState } from 'react';
import { 
  addDoc, 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove, 
  writeBatch, 
  runTransaction, 
  serverTimestamp, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { callGeminiWithLimitCheck } from '../services/aiService';
import { DEFAULT_SCHOOL_ID } from '../contexts/AuthContext';

export const useTeacherActions = (userProfile, showToast, classes) => {
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // --- UNIT MANAGEMENT ---
  const handleCreateUnit = useCallback(async (unitData) => {
    if (!unitData || !unitData.subjectId) {
      showToast("Missing data to create the unit.", "error");
      return false;
    }

    const courseRef = doc(db, "courses", unitData.subjectId);
    const newUnitRef = doc(collection(db, "units"));

    try {
      await runTransaction(db, async (transaction) => {
        const courseDoc = await transaction.get(courseRef);
        if (!courseDoc.exists()) {
          throw new Error("Parent course document does not exist!");
        }
        // Auto-increment unit count on the course
        const newUnitCount = (courseDoc.data().unitCount || 0) + 1;
        transaction.update(courseRef, { unitCount: newUnitCount });
        transaction.set(newUnitRef, unitData);
      });
      showToast("Unit created successfully!", "success");
      return true;
    } catch (e) {
      console.error("Unit creation transaction failed: ", e);
      showToast("Failed to create unit.", "error");
      return false;
    }
  }, [showToast]);

  const handleDeleteUnit = useCallback(async (unitId, subjectId) => {
    if (!unitId || !subjectId) {
      showToast("Missing data to delete the unit.", "error");
      return false;
    }

    const courseRef = doc(db, "courses", subjectId);
    const unitRef = doc(db, "units", unitId);
    
    // Queries for cascading delete
    const lessonsQuery = query(collection(db, 'lessons'), where('unitId', '==', unitId));
    const quizzesQuery = query(collection(db, 'quizzes'), where('unitId', '==', unitId));

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Decrement Unit Count
        const courseDoc = await transaction.get(courseRef);
        if (courseDoc.exists()) {
          const newUnitCount = Math.max(0, (courseDoc.data().unitCount || 0) - 1);
          transaction.update(courseRef, { unitCount: newUnitCount });
        }

        // 2. Delete Lessons
        const lessonsSnapshot = await getDocs(lessonsQuery);
        lessonsSnapshot.forEach(lessonDoc => transaction.delete(lessonDoc.ref));

        // 3. Delete Quizzes
        const quizzesSnapshot = await getDocs(quizzesQuery);
        quizzesSnapshot.forEach(quizDoc => transaction.delete(quizDoc.ref));

        // 4. Delete Unit
        transaction.delete(unitRef);
      });
      
      // 5. Update Timestamps on related Classes (Batch)
      const batch = writeBatch(db);
      const relatedClasses = classes.filter(c => c.subjectId === subjectId);
      if (relatedClasses.length > 0) {
        relatedClasses.forEach(c => {
            const classRef = doc(db, "classes", c.id);
            batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
        });
        await batch.commit();
      }
      
      showToast("Unit and its content deleted successfully!", "success");
      return true;
    } catch (e) {
      console.error("Unit deletion transaction failed: ", e);
      showToast("Failed to delete unit.", "error");
      return false;
    }
  }, [classes, showToast]);

  // --- ANNOUNCEMENTS ---
  const handleCreateAnnouncement = useCallback(async ({ content, audience, classId, className, photoURL, caption }) => {
    if (!content.trim() && !photoURL?.trim()) { 
        showToast("Announcement must have content or a photo.", "error"); 
        return false; 
    }

    const collectionName = audience === 'teachers' ? 'teacherAnnouncements' : 'studentAnnouncements';
    const announcementData = {
        content,
        teacherId: userProfile?.id,
        teacherName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        createdAt: serverTimestamp(),
        photoURL: photoURL || null,
        caption: caption || null,
        isPinned: false,
        schoolId: userProfile?.schoolId || DEFAULT_SCHOOL_ID
    };

    if (audience === 'students') {
        if (!classId) { 
            showToast("Please select a class for the student announcement.", "error"); 
            return false; 
        }
        announcementData.classId = classId;
        announcementData.className = className;
    }

    try {
        await addDoc(collection(db, collectionName), announcementData);
        if (audience === 'students' && classId) {
            await updateDoc(doc(db, "classes", classId), {
                contentLastUpdatedAt: serverTimestamp()
            });
        }
        showToast("Announcement posted successfully!", "success");
        return true;
    } catch (error) {
        console.error("Error posting announcement:", error);
        showToast("Failed to post announcement.", "error");
        return false;
    }
  }, [userProfile, showToast]);

  // --- QUIZ GENERATION (AI) ---
  const handleGenerateQuiz = useCallback(async (lesson, unitId, subjectId) => {
    if (isAiGenerating) return;
    setIsAiGenerating(true);
    showToast("AI is generating your quiz... This may take a moment.", "info");

    try {
        const lessonContent = lesson.pages.map(page => 
            `Page Title: ${page.title}\n\n${page.content}`
        ).join('\n\n---\n\n');

        // Robust Prompting for JSON
        const prompt = `
            You are a quiz generator API. 
            Based on the following lesson content, generate a 10-question multiple-choice quiz.
            
            Return ONLY a raw JSON object (no markdown, no backticks) with this exact schema:
            {
                "title": "Quiz Title",
                "questions": [
                    {
                        "question": "Question text here?",
                        "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                        "correctAnswer": "A) Option 1"
                    }
                ]
            }

            LESSON CONTENT:
            ${lessonContent}
        `;

        const aiResponseText = await callGeminiWithLimitCheck(prompt);
        
        // Clean response if AI adds markdown
        const cleanedText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const generatedQuiz = JSON.parse(cleanedText);

        await addDoc(collection(db, 'quizzes'), {
            title: generatedQuiz.title,
            questions: generatedQuiz.questions,
            unitId: unitId,
            subjectId: subjectId,
            createdAt: serverTimestamp(),
        });

        // Update timestamps on related classes
        if (subjectId) {
            const batch = writeBatch(db);
            const relatedClasses = classes.filter(c => c.subjectId === subjectId);
            relatedClasses.forEach(c => {
                const classRef = doc(db, "classes", c.id);
                batch.update(classRef, { contentLastUpdatedAt: serverTimestamp() });
            });
            await batch.commit();
        }

        showToast("AI has successfully generated and saved the new quiz!", "success");
    } catch (error) {
        console.error("Error generating quiz:", error);
        showToast("Failed to generate quiz.", "error");
    } finally {
        setIsAiGenerating(false);
    }
  }, [isAiGenerating, classes, showToast]);

  // --- STUDENT MANAGEMENT ---
  const handleRemoveStudentFromClass = useCallback(async (classId, student) => {
    if (!window.confirm(`Are you sure you want to remove ${student.firstName} ${student.lastName} from the class?`)) { 
        return; 
    }

    try {
        const classRef = doc(db, "classes", classId);
        // We need to find the full student object to remove it from the array
        const classDoc = classes.find(c => c.id === classId);
        const studentObjectToRemove = classDoc?.students?.find(s => s.id === student.id);

        if (!studentObjectToRemove) {
            console.warn("Student object not found in 'students' array.");
            return;
        }

        await updateDoc(classRef, { 
            students: arrayRemove(studentObjectToRemove),
            studentIds: arrayRemove(student.id)
        });
    
        showToast("Student removed successfully.", "success");
    } catch (error) { 
        console.error("Error removing student:", error); 
        showToast("Failed to remove student. Please try again.", "error"); 
    }
  }, [classes, showToast]);

  const handleImportStudents = useCallback(async (targetClassId, selectedClassSource, studentIdsToImportSet) => {
    if (!targetClassId) { showToast("Please select a target class.", "error"); return false; }
    if (studentIdsToImportSet.size === 0) { showToast("Please select students to import.", "error"); return false; }
    
    setIsImporting(true);
    try {
        const studentObjectsToAdd = selectedClassSource.students.filter(s => studentIdsToImportSet.has(s.id));
        const studentIdsToAdd = studentObjectsToAdd.map(student => student.id);
        
        const targetClassRef = doc(db, "classes", targetClassId);
        await updateDoc(targetClassRef, { 
            students: arrayUnion(...studentObjectsToAdd),
            studentIds: arrayUnion(...studentIdsToAdd)
        });

        showToast(`${studentIdsToImportSet.size} student(s) imported successfully!`, 'success');
        return true;
    } catch (err) { 
        console.error("Error importing students:", err); 
        showToast("An error occurred during import.", "error"); 
        return false;
    } finally { 
        setIsImporting(false); 
    }
  }, [showToast]);

  return {
    handleCreateUnit,
    handleDeleteUnit,
    handleCreateAnnouncement,
    handleGenerateQuiz,
    handleRemoveStudentFromClass,
    handleImportStudents,
    isAiGenerating,
    setIsAiGenerating,
    isImporting
  };
};