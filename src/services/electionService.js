// src/services/electionService.js
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, orderBy, getDoc, setDoc, limit, getDocs, or,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

// Helper to reliably extract votes handling BOTH new flat Cloud Functions and old nested tally
const getCandidateVotes = (election, posTitle, candId, candName) => {
  if (!election) return 0;
  // 1. New Cloud Function format
  if (election.finalResults && election.finalResults[candId] !== undefined) {
      return election.finalResults[candId];
  }
  // 2. Old Client-Side format
  const legacy = election.results || election.tally || election.liveResults || {};
  if (legacy[posTitle] && legacy[posTitle][candName] !== undefined) {
      return legacy[posTitle][candName];
  }
  return 0;
};

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

      // Safely carry over Cloud Function data if it exists, fallback to live data
      const finalTotalVotes = election.totalVotesCast || election.totalVotes || 0;

      // Build the payload dynamically to prevent overwriting cloud function data
      const updatePayload = {
        resultsPending: false,
        resultsPosted: true,
        status: 'completed', // Push to completed so UI shows "View Results"
        totalVotes: finalTotalVotes,
        totalVotesCast: finalTotalVotes // Keep naming aligned with Cloud Function
      };

      if (election.finalResults) {
          updatePayload.finalResults = election.finalResults;
      } else {
          // Fallback if cloud function hasn't run or is legacy
          updatePayload.results = election.results || election.tally || election.liveResults || {};
      }

      await updateDoc(electionRef, updatePayload);

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
        totalVotesCast: 0,
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
      selections: votes, // Added selections to ensure Cloud Function compatibility
      votedAt: serverTimestamp()
    });

    // 2. Atomically increment the tally counters on the election doc
    const tallyUpdates = { totalVotes: increment(1), totalVotesCast: increment(1) };
    Object.entries(votes).forEach(([positionTitle, candidateName]) => {
      // Firestore dot-notation to update nested fields atomically
      tallyUpdates[`tally.${positionTitle}.${candidateName}`] = increment(1);
    });

    const electionRef = doc(db, 'elections', electionId);
    await updateDoc(electionRef, tallyUpdates);
  },

  // [OPTIMIZED] getLiveResults now listens to ONE election doc instead of all vote docs
  getLiveResults: (electionId, callback) => {
    const electionRef = doc(db, 'elections', electionId);
    return onSnapshot(electionRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      // Pass down Cloud Function data if it resolves while watching Live Canvassing
      const tally = data.tally || data.liveResults || {};
      const finalResults = data.finalResults || null;
      const totalVotes = data.totalVotesCast || data.totalVotes || 0;
      callback({ tally, finalResults, totalVotes });
    });
  },

  // --- TIE-BREAKER LOGIC ---

  /**
   * Scans the tally for each position and detects ties among the top candidates.
   */
  detectTies: (election) => {
    const tiedPositions = [];

    if (!election.positions) return { hasTie: false, tiedPositions: [] };

    election.positions.forEach(pos => {
      // Use the helper so ties are correctly detected even if finalized by Cloud Function
      const sorted = pos.candidates
        .map(c => ({ name: c.name, id: c.id, votes: getCandidateVotes(election, pos.title, c.id, c.name) }))
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
   * Creates a tie-breaker election for the tied positions.
   */
  createTieBreakerElection: async (parentElection, tiedPositions) => {
      const now = new Date();
      const endTime = new Date(now.getTime() + 30 * 60 * 1000); 

      // Build positions array and PRESERVE individual position targeting
      const tbPositions = tiedPositions.map(tp => {
        const originalPos = parentElection.positions.find(p => p.title === tp.title);
        return {
          title: tp.title,
          candidates: tp.candidates.map(name => {
            const orig = originalPos?.candidates?.find(c => c.name === name);
            return orig ? { ...orig } : { name };
          }),
          // Carry over the custom targeting for this specific position
          targetType: originalPos?.targetType || 'school',
          targetGrade: originalPos?.targetGrade || null
        };
      });

      const tieBreakerId = await electionService.createElection({
        title: `${parentElection.title} — Tie-Breaker`,
        organization: parentElection.organization,
        startDate: now.toISOString(),
        endDate: endTime.toISOString(),
        positions: tbPositions,
        targetType: 'school', 
        schoolId: parentElection.schoolId,
        createdBy: parentElection.createdBy,
        visibility: parentElection.visibility || 'public',
        status: 'active',
        isTieBreaker: true,
        // Embed the parent's resolved Cloud Function data so the modal history renders correctly
        parentData: {
          positions: parentElection.positions,
          finalResults: parentElection.finalResults || null,
          tally: parentElection.tally || parentElection.results || parentElection.liveResults || {},
          totalVotesCast: parentElection.totalVotesCast || parentElection.totalVotes || 0
        },
        tiedPositions: tiedPositions.map(tp => tp.title),
      });

      const parentRef = doc(db, 'elections', parentElection.id);
      await deleteDoc(parentRef);

      return tieBreakerId;
    }
};