// src/components/student/RewardsPage.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import {
    AcademicCapIcon,
    SparklesIcon,
    UserCircleIcon,
    LockClosedIcon,
    CheckCircleIcon,
    GiftIcon,
} from '@heroicons/react/24/solid';

import { REWARDS_CONFIG } from '../../config/gameConfig';

const RewardsPage = () => {
    const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    const userLevel = userProfile?.level || 1;
    const unlockedRewards = useMemo(() => new Set(userProfile?.unlockedRewards || []), [userProfile]);
    const claimedRewards = useMemo(() => new Set(userProfile?.claimedRewards || []), [userProfile]);
    
    // --- REMOVED: cosmeticsEnabled state ---

    const handleUpdateProfile = async (updateData) => {
        if (!user?.id || isUpdating) return false;
        setIsUpdating(true);
        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, updateData);
            await refreshUserProfile();
            showToast('Rewards updated!', 'success');
            return true;
        } catch (error) {
            console.error("Error updating rewards:", error);
            showToast(`Failed to update rewards: ${error.message}`, 'error');
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    // --- REMOVED: handleToggleCosmetics function ---

    const handleClaimReward = async (rewardId) => {
        const config = REWARDS_CONFIG[rewardId];
        if (!config) {
            showToast('Error: Unknown reward.', 'error');
            return;
        }

        const updateData = { claimedRewards: arrayUnion(rewardId) };

        if (config.type === 'feature') {
            switch (rewardId) {
                case 'feat_profile_picture':
                    updateData.canUploadProfilePic = true;
                    break;
                case 'feat_cover_photo':
                    updateData.canUploadCover = true;
                    break;
                case 'canSetBio':
                    updateData.canSetBio = true;
                    break;
                case 'feat_update_info':
                    updateData.canUpdateInfo = true;
                    break;
                case 'feat_create_post':
                    updateData.canCreatePost = true;
                    break;
                case 'feat_reactions':
                    updateData.canReact = true;
                    break;
                case 'feat_profile_privacy':
                    updateData.canSetPrivacy = true;
                    break;
                case 'feat_visit_profiles':
                    updateData.canVisitProfiles = true;
                    break;
                case 'feat_photo_1':
                    updateData.featuredPhotosSlots = Math.max(userProfile.featuredPhotosSlots || 0, 1);
                    break;
                case 'feat_photo_2':
                    updateData.featuredPhotosSlots = Math.max(userProfile.featuredPhotosSlots || 0, 2);
                    break;
                case 'feat_photo_3':
                    updateData.featuredPhotosSlots = Math.max(userProfile.featuredPhotosSlots || 0, 3);
                    break;
                default:
                    break;
            }
        }
        
        await handleUpdateProfile(updateData);
    };


    const renderRewardItem = (id, config) => {
        const { level, type, name, icon: Icon, description } = config;
        
        const isEligible = userLevel >= level;
        const isClaimed = claimedRewards.has(id);
        
        let status = 'locked';
        if (isEligible) {
            if (isClaimed) {
                status = 'claimed';
            } else {
                status = 'claimable';
            }
        }

        return (
            <div
                key={id}
                className={`relative bg-neumorphic-base rounded-xl shadow-neumorphic transition-all duration-300 ease-in-out dark:bg-neumorphic-base-dark dark:shadow-lg 
                            ${status === 'locked' ? 'opacity-60' : 'hover:-translate-y-1 hover:shadow-neumorphic-lg dark:hover:shadow-lg'}`}
            >
                <div className={`relative z-10 flex flex-col justify-between h-full bg-neumorphic-base p-4 dark:bg-neumorphic-base-dark rounded-xl`}>
                    
                    {/* Card Content... */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Icon className={`w-6 h-6 ${status === 'locked' ? 'text-slate-400 dark:text-slate-500' : 'text-red-500 dark:text-red-400'}`} />
                            <h4 className={`font-bold ${status === 'locked' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 h-10">{description}</p>
                        {status === 'locked' && <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Unlock at Level {level}</p>}
                    </div>
                    <div className="mt-3">
                        {status === 'claimable' && (
                            <button
                                onClick={() => handleClaimReward(id)}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold py-2 px-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
                            >
                                <GiftIcon className="w-4 h-4" /> Claim
                            </button>
                        )}
                        
                        {(status === 'claimed') && (
                            <div className="flex items-center justify-center gap-1 text-green-700 text-sm font-semibold py-2 px-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset dark:text-green-300 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                <CheckCircleIcon className="w-4 h-4" /> Claimed
                            </div>
                        )}
                        {status === 'locked' && (
                             <div className="flex items-center justify-center gap-1 text-slate-500 text-sm font-semibold py-2 px-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset dark:text-slate-400 dark:bg-neumorphic-base-dark dark:shadow-neumorphic-inset-dark">
                                <LockClosedIcon className="w-4 h-4" /> Locked
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const groupedRewards = useMemo(() => {
        const groups = { feature: [], title: [], badge: [] };
        Object.entries(REWARDS_CONFIG).forEach(([id, config]) => {
            if (groups[config.type]) {
                groups[config.type].push({ id, ...config });
            }
        });
        for (const type in groups) {
            groups[type].sort((a, b) => a.level - b.level);
        }
        return groups;
    }, []);

    if (authLoading || !userProfile) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2 dark:text-slate-100">
                    <SparklesIcon className="w-8 h-8 text-red-500 dark:text-red-400"/> Rewards Center
                </h1>
                <p className="mt-1 text-sm sm:text-base text-slate-500 max-w-xl dark:text-slate-400">
                    Claim and manage your unlocked features and rewards as you level up!
                </p>
            </div>

            {/* --- REMOVED: Master Toggle for Cosmetics --- */}

            {/* Reward Sections */}
            {Object.entries(groupedRewards).map(([type, rewards]) => {
                if (rewards.length === 0) return null;
                let title = '';
                let Icon = GiftIcon; // Default icon
                switch (type) {
                    case 'feature': title = 'Profile Features'; Icon = UserCircleIcon; break;
                    case 'title': title = 'Display Titles'; Icon = AcademicCapIcon; break;
                    case 'badge': title = 'Earned Badges'; Icon = AcademicCapIcon; break;
                    default: title = 'Other Rewards';
                }

                return (
                    <div key={type}>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2 dark:text-slate-100">
                            <Icon className="h-6 w-6 text-red-500 dark:text-red-400" /> {title}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {rewards.map(reward => renderRewardItem(reward.id, reward))}
                        </div>
                    </div>
                );
            })}

        </div>
    );
};

export default RewardsPage;