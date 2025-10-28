import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust path if needed
import { REWARDS_BY_LEVEL, TITLE_ORDER } from '../utils/gamificationConstants'; // Adjust path if needed

/**
 * A custom hook to manage gamification logic (XP, levels, rewards).
 * @returns {object} An object containing the handleGamificationUpdate function.
 */
export default function useQuizGamification() {

    /**
     * Handles updating user XP, level, and rewards after a quiz submission.
     * @param {object} params
     * @param {number} params.xpGained - The amount of XP gained from the quiz.
     * @param {object} params.userProfile - The current user's profile object.
     * @param {function} params.refreshUserProfile - Function from useAuth to refresh profile data.
     * @param {function} params.showToast - Function to show a toast message.
     * @param {number} params.finalScore - The final score on the quiz.
     * @param {number} params.totalPoints - The total possible points for the quiz.
     * @param {number} params.attemptsTaken - The number of attempts taken (before this one).
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

            let newLevel = currentLevel;
            let leveledUp = false;
            let xpThresholdForNextLevel = (newLevel * (newLevel + 1) / 2) * 500;

            while (newTotalXP >= xpThresholdForNextLevel) {
                newLevel++;
                leveledUp = true;
                xpThresholdForNextLevel = (newLevel * (newLevel + 1) / 2) * 500;
            }

            const updateData = { xp: increment(xpGained) };
            let newlyUnlockedRewards = []; // Track rewards to add to unlockedRewards

            if (leveledUp) {
                updateData.level = newLevel;
                showToast(`🎉 Level Up! You've reached Level ${newLevel}!`, "success", 4000);

                // Collect all rewards from currentLevel + 1 up to newLevel
                for (let levelReached = currentLevel + 1; levelReached <= newLevel; levelReached++) {
                    if (REWARDS_BY_LEVEL[levelReached]) {
                        newlyUnlockedRewards.push(...REWARDS_BY_LEVEL[levelReached]);
                    }
                }

                // Handle specific boolean/string fields based on *highest* level reached
                if (newLevel >= 15) { updateData.canSetBio = true; }

                let bestTitle = userProfile.displayTitle || null;
                let bestTitleIndex = bestTitle ? TITLE_ORDER.indexOf(bestTitle) : -1;

                TITLE_ORDER.forEach((titleId, index) => {
                    // Check if this title's level is reached AND it's better than the current best
                    const levelForTitle = Object.keys(REWARDS_BY_LEVEL).find(lvl => REWARDS_BY_LEVEL[lvl].includes(titleId));
                    if (levelForTitle && newLevel >= parseInt(levelForTitle) && index > bestTitleIndex) {
                        bestTitle = titleId;
                        bestTitleIndex = index;
                    }
                });
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
            if (finalScore > 0 && finalScore === totalPoints) { newBadges.push('perfect_score'); }
            if (attemptsTaken === 0) { newBadges.push('first_quiz'); } // This was the first attempt
            // Add badges unlocked by level up
            newBadges.push(...newlyUnlockedRewards.filter(r => r.startsWith('badge_')));
            
            if (newBadges.length > 0) {
                updateData.genericBadges = arrayUnion(...newBadges);
                // Optionally show badge-specific toasts here or rely on the generic one
            }

            if (Object.keys(updateData).length > 1 || updateData.xp) { // Ensure there's something to update
                await updateDoc(userRef, updateData);
            }
            await refreshUserProfile();
            
        } catch (error) {
            console.error("Failed to update user XP/Level/Rewards:", error);
            showToast("Quiz submitted, but failed to update your profile rewards.", "warning");
        }
    };

    return { handleGamificationUpdate };
}