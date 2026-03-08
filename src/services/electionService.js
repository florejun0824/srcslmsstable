// src/services/electionService.js
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, orderBy, getDoc, setDoc, limit, getDocs, or,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

export const electionService = {

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

      const electionRef = doc(db, 'elections', election.id);

      // Copy the tally into results so student result cards can display them
      const finalResults = election.results || election.tally || election.liveResults || {};
      const finalTotalVotes = election.totalVotes || 0;

      await updateDoc(electionRef, {
        resultsPending: false,
        resultsPosted: true,
        status: 'completed',
        results: finalResults,
        totalVotes: finalTotalVotes,
      });

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

  createElection: async (electionData) => {
    try {
      const docRef = await addDoc(collection(db, 'elections'), {
        status: 'scheduled',  // Default fallback
        resultsPosted: false,
        totalVotes: 0,
        tally: {},
        ...electionData,      // Spread this AFTER the default so it can override the status
        createdAt: serverTimestamp()
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

  // [UPDATED] Now accepts the full user object to check roles and visibility
  getTeacherElections: (user, callback) => {
    let q;

    // Check if user is an admin (Adjust 'user.role' to match your actual auth structure)
    if (user?.role === 'admin') {
      // Admins see EVERYTHING
      q = query(
        collection(db, 'elections'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      // Teachers see elections they created OR elections marked as public
      q = query(
        collection(db, 'elections'),
        or(
          where('createdBy', '==', user.id),
          where('visibility', '==', 'public')
        ),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
  },

  getStudentElections: (callback) => {
    const q = query(
      collection(db, 'elections'),
      orderBy('endDate', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      const fallbackQ = query(collection(db, 'elections'), orderBy('endDate', 'desc'), limit(10));
      onSnapshot(fallbackQ, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
  },

  checkIfVoted: async (electionId, studentId) => {
    const docRef = doc(db, 'elections', electionId, 'votes', studentId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  },

  // [OPTIMIZED] submitVote now also atomically increments tally counters on the election doc
  submitVote: async (electionId, studentId, votes) => {
    // 1. Write the individual vote document (for audit trail)
    const voteRef = doc(db, 'elections', electionId, 'votes', studentId);
    await setDoc(voteRef, {
      studentId,
      votes,
      votedAt: serverTimestamp()
    });

    // 2. Atomically increment the tally counters on the election doc
    // This builds a map like: { 'tally.President.Alice': increment(1), totalVotes: increment(1) }
    const tallyUpdates = { totalVotes: increment(1) };
    Object.entries(votes).forEach(([positionTitle, candidateName]) => {
      // Firestore dot-notation to update nested fields atomically
      tallyUpdates[`tally.${positionTitle}.${candidateName}`] = increment(1);
    });

    const electionRef = doc(db, 'elections', electionId);
    await updateDoc(electionRef, tallyUpdates);
  },

  // [OPTIMIZED] getLiveResults now listens to ONE election doc instead of all vote docs
  // Callback receives { tally, totalVotes } from the election document
  getLiveResults: (electionId, callback) => {
    const electionRef = doc(db, 'elections', electionId);
    return onSnapshot(electionRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      // Prefer tally (increment-based), fall back to liveResults (legacy periodic scan)
      const tally = data.tally || data.liveResults || {};
      const totalVotes = data.totalVotes || 0;
      callback({ tally, totalVotes });
    });
  },

  // --- TIE-BREAKER LOGIC ---

  /**
   * Scans the tally for each position and detects ties among the top candidates.
   * @param {Object} election - The election document (must have .positions and .tally/.results)
   * @returns {{ hasTie: boolean, tiedPositions: Array<{ title: string, candidates: string[], votes: number }> }}
   */
  detectTies: (election) => {
    const tally = election.tally || election.results || election.liveResults || {};
    const tiedPositions = [];

    if (!election.positions) return { hasTie: false, tiedPositions: [] };

    election.positions.forEach(pos => {
      const posTally = tally[pos.title] || {};
      const sorted = pos.candidates
        .map(c => ({ name: c.name, votes: posTally[c.name] || 0 }))
        .sort((a, b) => b.votes - a.votes);

      if (sorted.length < 2) return;

      const topVotes = sorted[0].votes;
      if (topVotes === 0) return; // No votes cast, no tie

      const tiedCandidates = sorted.filter(c => c.votes === topVotes);
      if (tiedCandidates.length > 1) {
        tiedPositions.push({
          title: pos.title,
          candidates: tiedCandidates.map(c => c.name),
          votes: topVotes
        });
      }
    });

    return { hasTie: tiedPositions.length > 0, tiedPositions };
  },

  /**
   * Creates a tie-breaker election for the tied positions with a 30-minute voting window.
   * Links the child election to the parent and updates the parent with the tie-breaker reference.
   * @param {Object} parentElection - The parent election document
   * @param {Array} tiedPositions - Array from detectTies().tiedPositions
   * @returns {string} The ID of the newly created tie-breaker election
   */
  createTieBreakerElection: async (parentElection, tiedPositions) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 30 * 60 * 1000); // 30-minute window

    // Build positions array with only the tied candidates
    const tbPositions = tiedPositions.map(tp => {
      const originalPos = parentElection.positions.find(p => p.title === tp.title);
      return {
        title: tp.title,
        candidates: tp.candidates.map(name => {
          const orig = originalPos?.candidates?.find(c => c.name === name);
          return orig ? { ...orig } : { name };
        })
      };
    });

    const tieBreakerId = await electionService.createElection({
      title: `${parentElection.title} — Tie-Breaker`,
      organization: parentElection.organization,
      startDate: now.toISOString(),
      endDate: endTime.toISOString(),
      positions: tbPositions,
      targetType: parentElection.targetType,
      targetGrade: parentElection.targetGrade || null,
      schoolId: parentElection.schoolId,
      createdBy: parentElection.createdBy,
      visibility: parentElection.visibility || 'public',
      status: 'active',
      isTieBreaker: true,
      parentData: {
        positions: parentElection.positions,
        tally: parentElection.tally || parentElection.results || parentElection.liveResults || {},
        totalVotes: parentElection.totalVotes || 0
      },
      tiedPositions: tiedPositions.map(tp => tp.title),
    });

    // Delete the parent election entirely instead of updating it
    const parentRef = doc(db, 'elections', parentElection.id);
    await deleteDoc(parentRef);

    return tieBreakerId;
  }
};