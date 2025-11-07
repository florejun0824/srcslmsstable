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
     *...
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
            let newlyUnlockedRewards = []; // Track rewards to add to unlockedRewards array (titles, badges)

            if (leveledUp) {
                updateData.level = newLevel;
                showToast(`🎉 Level Up! You've reached Level ${newLevel}!`, "success", 4000);

                // --- MODIFIED: Iterate over the new REWARDS_CONFIG ---
                for (const [rewardId, config] of Object.entries(REWARDS_CONFIG)) {
                    // If reward is in the new level range and not already unlocked
                    if (
                        config.level > currentLevel &&
                        config.level <= newLevel
                    ) {
                        // --- NEW: Check reward type ---
                        if (config.type === 'feature') {
                            // This is a feature flag, add it to updateData
                            switch (rewardId) {
                                case 'feat_profile_picture':
                                    if (!userProfile.canUploadProfilePic) updateData.canUploadProfilePic = true;
                                    break;
                                case 'feat_cover_photo':
                                    if (!userProfile.canUploadCover) updateData.canUploadCover = true;
                                    break;
                                case 'canSetBio':
                                    if (!userProfile.canSetBio) updateData.canSetBio = true;
                                    break;
                                case 'feat_update_info':
                                    if (!userProfile.canUpdateInfo) updateData.canUpdateInfo = true;
                                    break;
                                case 'feat_create_post':
                                    if (!userProfile.canCreatePost) updateData.canCreatePost = true;
                                    break;
                                case 'feat_reactions':
                                    if (!userProfile.canReact) updateData.canReact = true;
                                    break;
                                case 'feat_profile_privacy':
                                    if (!userProfile.canSetPrivacy) updateData.canSetPrivacy = true;
                                    break;
                                case 'feat_visit_profiles':
                                    if (!userProfile.canVisitProfiles) updateData.canVisitProfiles = true;
                                    break;
                                // For stackable features, we can just set a flag or count
                                case 'feat_photo_1':
                                    if (!userProfile.featuredPhotosSlots) updateData.featuredPhotosSlots = 1;
                                    break;
                                case 'feat_photo_2':
                                    if (userProfile.featuredPhotosSlots < 2) updateData.featuredPhotosSlots = 2;
                                    break;
                                case 'feat_photo_3':
                                    if (userProfile.featuredPhotosSlots < 3) updateData.featuredPhotosSlots = 3;
                                    break;
                                default:
                                    break;
                            }
                        } else if (config.type === 'title' || config.type === 'badge') {
                            // This is a cosmetic/array item, add to array
                            if (!userProfile.unlockedRewards?.includes(rewardId)) {
                                newlyUnlockedRewards.push(rewardId);
                            }
                        }
                    }
                }
                
                // --- MODIFIED: Simplified title logic (remains the same) ---
                let bestTitle = userProfile.displayTitle || null;
                if (newLevel >= 100) { bestTitle = 'title_legend'; }
                else if (newLevel >= 70 && bestTitle !== 'title_legend') { bestTitle = 'title_guru'; }
                else if (newLevel >= 35 && bestTitle !== 'title_legend' && bestTitle !== 'title_guru') { bestTitle = 'title_adept'; }

                if (bestTitle !== userProfile.displayTitle) {
                    updateData.displayTitle = bestTitle;
                }
            }

            // Add collected titles/badges to unlockedRewards array
            if (newlyUnlockedRewards.length > 0) {
                updateData.unlockedRewards = arrayUnion(...newlyUnlockedRewards);
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