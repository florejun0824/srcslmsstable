// src/hooks/useQuizGamification.js
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust path if needed
// --- MODIFIED: Import from our new config file ---
import { REWARDS_CONFIG, calculateLevelFromXp } from '../config/gameConfig'; // Adjust path if needed

/**
 * A custom hook to manage gamification logic (XP, levels, rewards).
 * @returns {object} An object containing the handleGamificationUpdate function.
 */
export default function useQuizGamification() {

    /**
     * Handles updating user XP, level, and rewards after a quiz or lesson.
     * @param {object} params
     * @param {number} params.xpGained - The amount of XP gained.
     * @param {object} params.userProfile - The current user's profile object.
     * @param {function} params.refreshUserProfile - Function from useAuth to refresh profile data.
     * @param {function} params.showToast - Function to show a toast message.
     * @param {number} params.finalScore - The final score (0 for lessons).
     * @param {number} params.totalPoints - The total points (0 for lessons).
     * @param {number} params.attemptsTaken - The number of attempts taken (0 for lessons).
     */
    const handleGamificationUpdate = async ({
        xpGained,
        userProfile,
        refreshUserProfile,
        showToast,
        finalScore,
        totalPoints,
        attemptsTaken
    }) => {
        if (xpGained <= 0 || !userProfile?.id) {
            return; // No XP or no user, nothing to do.
        }

        try {
            const userRef = doc(db, 'users', userProfile.id);
            const currentLevel = userProfile.level || 1;
            const currentXP = userProfile.xp || 0;
            const newTotalXP = currentXP + xpGained;

            // --- MODIFIED: Use new calculation function ---
            const newLevel = calculateLevelFromXp(newTotalXP);
            const leveledUp = newLevel > currentLevel;

            // --- MODIFIED: Update XP with newTotalXP, not increment ---
            const updateData = { xp: newTotalXP };
            let newlyUnlockedRewards = []; // Track rewards to add to unlockedRewards

            if (leveledUp) {
                updateData.level = newLevel;
                showToast(`🎉 Level Up! You've reached Level ${newLevel}!`, "success", 4000);

                // --- MODIFIED: Iterate over the new REWARDS_CONFIG ---
                for (const [rewardId, config] of Object.entries(REWARDS_CONFIG)) {
                    // If reward is in the new level range and not already unlocked
                    if (
                        config.level > currentLevel &&
                        config.level <= newLevel &&
                        !userProfile.unlockedRewards?.includes(rewardId)
                    ) {
                        newlyUnlockedRewards.push(rewardId);
                    }
                }
                
                // --- MODIFIED: Check features from the new config ---
                if (newLevel >= 15 && !userProfile.canSetBio) { 
                    updateData.canSetBio = true; 
                }

                // --- MODIFIED: Simplified title logic ---
                let bestTitle = userProfile.displayTitle || null;
                if (newLevel >= 100) { bestTitle = 'title_legend'; }
                else if (newLevel >= 70 && bestTitle !== 'title_legend') { bestTitle = 'title_guru'; }
                else if (newLevel >= 35 && bestTitle !== 'title_legend' && bestTitle !== 'title_guru') { bestTitle = 'title_adept'; }

                if (bestTitle !== userProfile.displayTitle) {
                    updateData.displayTitle = bestTitle;
                }
            }

            // Add collected rewards to unlockedRewards array
            if (newlyUnlockedRewards.length > 0) {
                // Filter out special keys like 'canSetBio' before adding to array
                const cosmeticRewards = newlyUnlockedRewards.filter(r => r !== 'canSetBio');
                if (cosmeticRewards.length > 0) {
                    updateData.unlockedRewards = arrayUnion(...cosmeticRewards);
                }
                // Show generic notification if *any* new rewards were unlocked
                showToast("🎁 New rewards available! Check the Rewards page.", "info", 5000);
            }

            // Handle Badges specifically (add to genericBadges)
            let newBadges = [];
            // Check for perfect score (only if totalPoints > 0, meaning it's a quiz)
            if (totalPoints > 0 && finalScore > 0 && finalScore === totalPoints) { 
                newBadges.push('perfect_score'); 
            }
            // Check for first quiz attempt (only if totalPoints > 0, meaning it's a quiz)
            if (totalPoints > 0 && attemptsTaken === 0) { 
                newBadges.push('first_quiz'); 
            }
            // Add badges unlocked by level up
            newBadges.push(...newlyUnlockedRewards.filter(r => r.startsWith('badge_')));
            
            if (newBadges.length > 0) {
                updateData.genericBadges = arrayUnion(...newBadges.filter(b => !userProfile.genericBadges?.includes(b)));
            }

            // Update Firestore
            await updateDoc(userRef, updateData);
            await refreshUserProfile();
            
        } catch (error) {
            console.error("Failed to update user XP/Level/Rewards:", error);
            showToast("Quiz submitted, but failed to update your profile rewards.", "warning");
        }
    };

    return { handleGamificationUpdate };
}