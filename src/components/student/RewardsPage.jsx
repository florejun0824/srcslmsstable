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
    TrophyIcon,
    StarIcon,
    BoltIcon
} from '@heroicons/react/24/solid';

import { REWARDS_CONFIG } from '../../config/gameConfig';

// --- HELPER: Status Styles (Enhanced) ---
const getStatusStyles = (status) => {
    switch (status) {
        case 'claimable':
            return {
                container: 'bg-white/90 dark:bg-slate-800/90 ring-2 ring-orange-400/50 shadow-lg shadow-orange-500/20 scale-[1.02]',
                iconContainer: 'bg-gradient-to-br from-orange-400 to-pink-500 text-white shadow-orange-500/30',
                title: 'text-slate-900 dark:text-white',
                desc: 'text-slate-600 dark:text-slate-300',
                actionArea: 'border-orange-200 dark:border-orange-500/20',
                button: 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-95',
                badge: null
            };
        case 'claimed':
            return {
                container: 'bg-emerald-50/50 dark:bg-emerald-900/10 ring-1 ring-emerald-500/20 shadow-sm',
                iconContainer: 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-emerald-500/20',
                title: 'text-slate-800 dark:text-slate-200',
                desc: 'text-slate-500 dark:text-slate-400',
                actionArea: 'border-emerald-100 dark:border-emerald-500/10',
                button: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-default',
                badge: null
            };
        case 'locked':
        default:
            return {
                container: 'bg-slate-50/50 dark:bg-slate-900/30 backdrop-blur-sm grayscale-[0.8] opacity-80 hover:grayscale-0 hover:opacity-100 ring-1 ring-slate-200 dark:ring-slate-700',
                iconContainer: 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500',
                title: 'text-slate-500 dark:text-slate-400',
                desc: 'text-slate-400 dark:text-slate-500',
                actionArea: 'border-slate-100 dark:border-slate-700/50',
                button: 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed',
                badge: 'bg-slate-200 dark:bg-slate-700 text-slate-500 text-[9px] px-2 py-0.5 rounded-full'
            };
    }
};

const RewardsPage = () => {
    const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    const userLevel = userProfile?.level || 1;
    const userXP = userProfile?.xp || 0;
    const claimedRewards = useMemo(() => new Set(userProfile?.claimedRewards || []), [userProfile]);

    const handleUpdateProfile = async (updateData) => {
        if (!user?.id || isUpdating) return false;
        setIsUpdating(true);
        try {
            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, updateData);
            await refreshUserProfile();
            showToast('Reward claimed successfully!', 'success');
            return true;
        } catch (error) {
            console.error("Error updating rewards:", error);
            showToast(`Failed: ${error.message}`, 'error');
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleClaimReward = async (rewardId) => {
        const config = REWARDS_CONFIG[rewardId];
        if (!config) return;

        const updateData = { claimedRewards: arrayUnion(rewardId) };

        if (config.type === 'feature') {
            switch (rewardId) {
                case 'feat_profile_picture': updateData.canUploadProfilePic = true; break;
                case 'feat_cover_photo': updateData.canUploadCover = true; break;
                case 'canSetBio': updateData.canSetBio = true; break;
                case 'feat_update_info': updateData.canUpdateInfo = true; break;
                case 'feat_create_post': updateData.canCreatePost = true; break;
                case 'feat_reactions': updateData.canReact = true; break;
                case 'feat_profile_privacy': updateData.canSetPrivacy = true; break;
                case 'feat_visit_profiles': updateData.canVisitProfiles = true; break;
                case 'feat_photo_1': updateData.featuredPhotosSlots = Math.max(userProfile.featuredPhotosSlots || 0, 1); break;
                case 'feat_photo_2': updateData.featuredPhotosSlots = Math.max(userProfile.featuredPhotosSlots || 0, 2); break;
                case 'feat_photo_3': updateData.featuredPhotosSlots = Math.max(userProfile.featuredPhotosSlots || 0, 3); break;
                default: break;
            }
        }
        
        await handleUpdateProfile(updateData);
    };


    const renderRewardItem = (id, config) => {
        const { level, name, icon: Icon, description } = config;
        
        const isEligible = userLevel >= level;
        const isClaimed = claimedRewards.has(id);
        
        let status = 'locked';
        if (isEligible) {
            status = isClaimed ? 'claimed' : 'claimable';
        }

        const styles = getStatusStyles(status);

        return (
            <div
                key={id}
                className={`group relative overflow-hidden rounded-[2rem] backdrop-blur-2xl transition-all duration-500 ${styles.container}`}
            >
                {/* Shimmer Effect for Claimable */}
                {status === 'claimable' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 z-0 pointer-events-none"></div>
                )}

                <div className="relative z-10 p-5 flex flex-col h-full">
                    {/* Header: Icon & Badge */}
                    <div className="flex justify-between items-start mb-4">
                        <div className={`h-14 w-14 rounded-[1.2rem] flex items-center justify-center shadow-inner transition-transform duration-300 group-hover:scale-105 ${styles.iconContainer}`}>
                            <Icon className="h-7 w-7" />
                        </div>
                        {status === 'locked' && (
                            <div className={styles.badge}>Lvl {level}</div>
                        )}
                        {status === 'claimable' && (
                            <div className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                                <BoltIcon className="h-3 w-3" /> Ready
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="mb-4 flex-1">
                        <h4 className={`text-base font-bold mb-1 leading-tight ${styles.title}`}>
                            {name}
                        </h4>
                        <p className={`text-xs font-medium leading-relaxed ${styles.desc}`}>
                            {description}
                        </p>
                    </div>

                    {/* Footer Action */}
                    <div className={`pt-4 border-t ${styles.actionArea}`}>
                        {status === 'claimable' ? (
                            <button
                                onClick={() => handleClaimReward(id)}
                                disabled={isUpdating}
                                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${styles.button}`}
                            >
                                <GiftIcon className="w-4 h-4 animate-bounce" />
                                Claim Now
                            </button>
                        ) : (
                            <button disabled className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${styles.button}`}>
                                {status === 'claimed' ? (
                                    <><CheckCircleIcon className="w-4 h-4" /> Active</>
                                ) : (
                                    <><LockClosedIcon className="w-4 h-4" /> Locked</>
                                )}
                            </button>
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
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Spinner />
                <span className="ml-3 text-sm font-bold text-slate-400 animate-pulse uppercase tracking-wider">Loading...</span>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-32 animate-fade-in-up max-w-7xl mx-auto px-4 sm:px-6">
            
            {/* --- HEADER: Aero Glass Card (Sleek & Compact) --- */}
            <div className="relative rounded-[2.5rem] p-8 overflow-hidden shadow-2xl border border-white/40 dark:border-white/5 group">
                
                {/* Glass Background with Aurora Mesh */}
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/60 backdrop-blur-3xl z-0"></div>
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-orange-500/10 blur-3xl animate-mesh-move pointer-events-none opacity-60"></div>

                {/* Content */}
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    
                    {/* Left: Title Block */}
                    <div className="text-center md:text-left">
                        
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2 drop-shadow-sm">
                            Rewards Center
                        </h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-md mx-auto md:mx-0">
                            Unlock exclusive features and customize your profile as you master your subjects.
                        </p>
                    </div>

                    {/* Right: Level Widget (Floating Glass Pill) */}
                    <div className="flex items-center gap-5 px-6 py-4 bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-[2rem] shadow-lg hover:scale-105 transition-transform duration-300">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Current Level</span>
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                                {userLevel}
                            </span>
                        </div>
                        <div className="h-12 w-[1px] bg-slate-200 dark:bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total XP</span>
                            <span className="text-xl font-bold text-slate-700 dark:text-slate-200">{userXP.toLocaleString()}</span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-md ring-4 ring-white/30 dark:ring-black/10">
                            <StarIcon className="h-6 w-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Reward Sections --- */}
            {Object.entries(groupedRewards).map(([type, rewards]) => {
                if (rewards.length === 0) return null;
                
                let title = '';
                let Icon = GiftIcon;
                let accentColor = 'text-slate-500';
                let bgAccent = 'bg-slate-100';

                switch (type) {
                    case 'feature': 
                        title = 'Unlock Features'; 
                        Icon = UserCircleIcon; 
                        accentColor = 'text-blue-600 dark:text-blue-400';
                        bgAccent = 'bg-blue-100 dark:bg-blue-900/30';
                        break;
                    case 'title': 
                        title = 'Titles & Honors'; 
                        Icon = AcademicCapIcon; 
                        accentColor = 'text-purple-600 dark:text-purple-400';
                        bgAccent = 'bg-purple-100 dark:bg-purple-900/30';
                        break;
                    case 'badge': 
                        title = 'Achievement Badges'; 
                        Icon = TrophyIcon; 
                        accentColor = 'text-amber-600 dark:text-amber-400';
                        bgAccent = 'bg-amber-100 dark:bg-amber-900/30';
                        break;
                    default: 
                        title = 'Other Rewards';
                }

                return (
                    <div key={type} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className={`p-2.5 rounded-2xl shadow-sm ${bgAccent} ${accentColor}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                                {title}
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {rewards.map(reward => renderRewardItem(reward.id, reward))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RewardsPage;