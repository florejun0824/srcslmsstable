// src/components/admin/ElectionScheduler.jsx
import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { electionService } from '../../services/electionService';

export default function ElectionScheduler() {
  const { userProfile } = useAuth();
  const electionsRef = useRef([]);

  useEffect(() => {
    if (!userProfile || (userProfile.role !== 'teacher' && userProfile.role !== 'admin')) return;

    const q = query(collection(db, 'elections'), where('status', 'in', ['active', 'calculating']));
    const unsub = onSnapshot(q, (snapshot) => {
      electionsRef.current = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    });

    const interval = setInterval(() => {
      checkElections(electionsRef.current);
    }, 5000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [userProfile]);

  // --- 1. CORE TALLY CALCULATOR (Legacy fallback for elections without increment-based tally) ---
  const calculateTally = async (election) => {
    const votesRef = collection(db, 'elections', election.id, 'votes');
    const votesSnap = await getDocs(votesRef);
    const tally = {};
    let totalVotesCast = 0;

    if (election.positions) {
      election.positions.forEach(pos => {
        tally[pos.title] = {};
        pos.candidates.forEach(cand => tally[pos.title][cand.name] = 0);
      });
    }

    votesSnap.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const ballot = data.votes || data;
      if (ballot && typeof ballot === 'object') {
        let hasVote = false;
        Object.entries(ballot).forEach(([posTitle, candName]) => {
          if (['studentId', 'votedAt', 'votes'].includes(posTitle)) return;
          if (!tally[posTitle]) tally[posTitle] = {};
          if (tally[posTitle][candName] === undefined) tally[posTitle][candName] = 0;
          tally[posTitle][candName]++;
          hasVote = true;
        });
        if (hasVote) totalVotesCast++;
      }
    });
    return { tally, totalVotesCast };
  };

  // --- 2. LIVE UPDATE HELPER ---
  // [OPTIMIZED] Now reads tally from the election doc (maintained by increment()) instead of scanning all vote docs
  const runLiveUpdate = async (election, nowMs) => {
    console.log(`[Scheduler] Updating live results summary for ${election.title}`);
    try {
      // Read the latest tally from the election doc (maintained by increment() on each vote)
      const electionSnap = await getDoc(doc(db, 'elections', election.id));
      const electionData = electionSnap.data();
      let tally = electionData?.tally;
      let totalVotesCast = electionData?.totalVotes || 0;

      // Legacy fallback: if no tally exists yet, calculate from vote docs
      if (!tally || Object.keys(tally).length === 0) {
        const result = await calculateTally(election);
        tally = result.tally;
        totalVotesCast = result.totalVotesCast;
      }

      await updateDoc(doc(db, 'elections', election.id), {
        liveResults: tally,
        totalVotes: totalVotesCast,
        lastLiveUpdate: nowMs
      });
    } catch (error) {
      console.error("Live update failed:", error);
    }
  };

  // --- 3. MAIN SCHEDULER LOOP ---
  const checkElections = (elections) => {
    const nowMs = Date.now();

    elections.forEach(async (election) => {
      if (!election.endDate) return;
      const endMs = new Date(election.endDate).getTime();

      // [PHASE A] Periodic Live Update (Every 60s)
      if (election.status === 'active' &&
        (!election.lastLiveUpdate || nowMs - election.lastLiveUpdate > 60000)) {
        await runLiveUpdate(election, nowMs);
      }

      // [PHASE B] Poll Closing Logic
      if (nowMs >= endMs && election.status === 'active') {
        await handleStartCountdown(election);
      }

      // [PHASE C] Final Reveal Logic
      if (election.status === 'calculating' && election.revealTime) {
        const revealMs = election.revealTime.toMillis ?
          election.revealTime.toMillis() :
          new Date(election.revealTime).getTime();

        if (nowMs >= revealMs) {
          // Re-read the election doc to get the latest tally before publishing
          const electionSnap = await getDoc(doc(db, 'elections', election.id));
          const freshElection = { id: election.id, ...electionSnap.data() };
          await electionService.publishOfficialResults(freshElection);

          // --- TIE DETECTION after auto-finalization ---
          const { hasTie, tiedPositions } = electionService.detectTies(freshElection);
          if (hasTie) {
            console.log(`[Scheduler] Tie detected in ${election.title}: ${tiedPositions.map(tp => tp.title).join(', ')}`);
            await electionService.createTieBreakerElection(freshElection, tiedPositions);
          }
        }
      }
    });
  };

  // --- 4. FINAL TALLY TRIGGER ---
  // [OPTIMIZED] Now reads tally from the election doc instead of scanning all vote docs
  const handleStartCountdown = async (election) => {
    const revealTime = new Date(Date.now() + 5 * 60 * 1000);
    console.log(`[Scheduler] Closing polls for ${election.title}...`);

    try {
      // Read the latest tally from the election doc
      const electionSnap = await getDoc(doc(db, 'elections', election.id));
      const electionData = electionSnap.data();
      let tally = electionData?.tally;
      let totalVotesCast = electionData?.totalVotes || 0;

      // Legacy fallback
      if (!tally || Object.keys(tally).length === 0) {
        const result = await calculateTally(election);
        tally = result.tally;
        totalVotesCast = result.totalVotesCast;
      }

      const electionRef = doc(db, 'elections', election.id);
      await updateDoc(electionRef, {
        resultsPending: true,
        revealTime: revealTime,
        status: 'calculating',
        results: tally,
        totalVotes: totalVotesCast,
        liveResults: tally
      });

      console.log(`[Scheduler] Tally complete: ${totalVotesCast} votes.`);
    } catch (err) {
      console.error("[Scheduler] Final tally failed:", err);
    }
  };

  return null;
}