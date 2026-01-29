// src/services/electionService.js
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, 
  query, where, onSnapshot, serverTimestamp, orderBy, getDoc, setDoc, limit, getDocs 
} from 'firebase/firestore';
import { db } from './firebase';

export const electionService = {
  // ... (keep all your existing create/update/delete/get functions) ...
  
  // [NEW] Shared function to mark election as Official
  publishOfficialResults: async (election) => {
    try {
        const notificationHTML = `
            <div style="text-align: center; padding: 20px; font-family: 'Inter', sans-serif;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🏆</div>
                <h2 style="margin: 0; color: #1e293b; font-weight: 900;">Official Results Declared</h2>
                <p style="color: #64748b; margin: 5px 0 15px 0;">The official winners for <strong>${election.title}</strong> have been proclaimed.</p>
                <div style="background: #f1f5f9; padding: 10px; border-radius: 12px; display: inline-block; font-weight: 600; font-size: 0.9rem; color: #334155;">
                    View final tally in Elections tab.
                </div>
            </div>
        `;

        // 1. Mark Election as Completed
        const electionRef = doc(db, 'elections', election.id);
        await updateDoc(electionRef, {
            resultsPending: false,
            resultsPosted: true,
            status: 'completed',
        });

        // 2. Update the Lounge Post (if it exists)
        if (election.resultsPostId) {
            const postRef = doc(db, 'studentPosts', election.resultsPostId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                await updateDoc(postRef, {
                    content: notificationHTML,
                    type: 'election_result',
                    updatedAt: serverTimestamp()
                });
            }
        }
        return true;
    } catch (error) {
        console.error("Error publishing official results:", error);
        throw error;
    }
  },

  // ... (keep checkIfVoted, submitVote, etc.) ...
  
  // Make sure to include the previous functions you had!
  // (createElection, updateElection, deleteElection, getTeacherElections, getStudentElections, getLiveResults, etc.)
  createElection: async (electionData) => {
    try {
      const docRef = await addDoc(collection(db, 'elections'), {
        ...electionData,
        createdAt: serverTimestamp(),
        status: 'scheduled', 
        resultsPosted: false
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating election:", error);
      throw error;
    }
  },

  updateElection: async (electionId, updatedData) => {
    try {
      const docRef = doc(db, 'elections', electionId);
      await updateDoc(docRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating election:", error);
      throw error;
    }
  },

  deleteElection: async (electionId) => {
    try {
      const docRef = doc(db, 'elections', electionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting election:", error);
      throw error;
    }
  },

  getTeacherElections: (teacherId, callback) => {
    const q = query(
      collection(db, 'elections'), 
      where('createdBy', '==', teacherId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  },

  getStudentElections: (callback) => {
    const now = new Date().toISOString();
    const q = query(
        collection(db, 'elections'), 
        // We fetch slightly older ones too to handle the "calculating" transition visually
        orderBy('endDate', 'asc') 
    );
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
         // Fallback logic
         const fallbackQ = query(collection(db, 'elections'), orderBy('endDate', 'desc'), limit(10));
         onSnapshot(fallbackQ, (snap) => callback(snap.docs.map(d => ({id:d.id, ...d.data()}))));
    });
  },

  checkIfVoted: async (electionId, studentId) => {
    const docRef = doc(db, 'elections', electionId, 'votes', studentId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  },

  submitVote: async (electionId, studentId, votes) => {
    const voteRef = doc(db, 'elections', electionId, 'votes', studentId);
    await setDoc(voteRef, {
      studentId,
      votes,
      votedAt: serverTimestamp()
    });
  },

  getLiveResults: (electionId, callback) => {
    const votesCol = collection(db, 'elections', electionId, 'votes');
    return onSnapshot(votesCol, (snapshot) => {
      const allVotes = snapshot.docs.map(d => d.data().votes);
      callback(allVotes);
    });
  }
};