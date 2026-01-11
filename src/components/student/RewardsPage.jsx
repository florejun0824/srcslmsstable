import React, { useState, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import {
    AcademicCapIcon,
    UserCircleIcon,
    LockClosedIcon,
    CheckCircleIcon,
    GiftIcon,
    TrophyIcon,
    StarIcon,
    BoltIcon,
    ChevronRightIcon
} from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { REWARDS_CONFIG } from '../../config/gameConfig';

// =====================================================================
// 🎨 ONEUI 8.5 PHYSICS & ANIMATION
// =====================================================================
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { 
        opacity: 1, 
        y: 0, 
        scale: 1, 
        transition: { type: "spring", stiffness: 350, damping: 25 } 
    }
};

// =====================================================================
// 🧱 ONEUI CARD COMPONENT
// =====================================================================
const OneUICard = memo(({ children, className = "", onClick }) => (
    <motion.div 
        variants={itemVariants}
        onClick={onClick}
        whileTap={onClick ? { scale: 0.97 } : {}}
        className={`
            relative overflow-hidden
            bg-white dark:bg-slate-900 
            border border-slate-100 dark:border-slate-800
            shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] dark:shadow-none
            transition-all duration-300
            rounded-[2.2rem]
            ${className}
        `}
    >
        {children}
    </motion.div>
));
OneUICard.displayName = 'OneUICard';

// =====================================================================
// 🎨 STATIC STYLE CONFIGURATION
// =====================================================================
const STATUS_THEMES = {
    claimable: {
        iconBg: 'bg-orange-500 text-white',
        border: 'border-orange-200 dark:border-orange-500/30',
        badge: 'bg-orange-500 text-white',
        badgeText: 'Ready',
        BadgeIcon: BoltIcon,
        button: 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30',
        buttonIcon: GiftIcon,
        buttonText: 'Claim Reward',
        opacity: 'opacity-100'
    },
    claimed: {
        iconBg: 'bg-emerald-500 text-white',
        border: 'border-slate-100 dark:border-slate-800',
        badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        badgeText: 'Active',
        BadgeIcon: CheckCircleIcon,
        button: 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400',
        buttonIcon: CheckCircleIcon,
        buttonText: 'Unlocked',
        opacity: 'opacity-100'
    },
    locked: {
        iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
        border: 'border-slate-100 dark:border-slate-800',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
        badgeText: 'Locked',
        BadgeIcon: LockClosedIcon,
        button: 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600',
        buttonIcon: LockClosedIcon,
        buttonText: 'Locked',
        opacity: 'opacity-70 grayscale-[0.5]'
    }
};

// =====================================================================
// 🎁 REWARD CARD COMPONENT (Memoized)
// =====================================================================
const RewardCard = memo(({ id, config, userLevel, isClaimed, onClaim, isUpdating }) => {
    const { level, name, icon: Icon, description } = config;
    
    // Determine Status
    let status = 'locked';
    if (userLevel >= level) {
        status = isClaimed ? 'claimed' : 'claimable';
    }

    const theme = STATUS_THEMES[status];
    const { BadgeIcon, buttonIcon: ButtonIcon } = theme;

    const handleClaim = (e) => {
        e.stopPropagation();
        if (status === 'claimable' && !isUpdating) {
            if (navigator?.vibrate) navigator.vibrate([50, 30, 50]);
            onClaim(id);
        }
    };

    return (
        <OneUICard className={`flex flex-col p-6 min-h-[14rem] ${theme.border} ${status === 'claimable' ? 'ring-4 ring-orange-500/10' : ''}`}>
            
            {/* Header */}
            <div className={`flex justify-between items-start mb-4 ${theme.opacity}`}>
                <div className={`h-14 w-14 rounded-[1.25rem] flex items-center justify-center shadow-sm ${theme.iconBg}`}>
                    <Icon className="h-7 w-7" />
                </div>
                
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badge}`}>
                    {status === 'locked' ? (
                        <span>Lvl {level}</span>
                    ) : (
                        <>
                            <BadgeIcon className="h-3 w-3" />
                            <span>{theme.badgeText}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="mb-auto">
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mb-1">
                    {name}
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Action Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={handleClaim}
                    disabled={status !== 'claimable' || isUpdating}
                    className={`
                        w-full py-3.5 rounded-[1.2rem] flex items-center justify-center gap-2 
                        text-xs font-bold uppercase tracking-wider transition-all duration-300
                        ${theme.button}
                        ${status === 'claimable' ? 'active:scale-95 hover:scale-[1.02]' : 'cursor-default'}
                    `}
                >
                    <ButtonIcon className={`h-4 w-4 ${status === 'claimable' ? 'animate-bounce' : ''}`} />
                    <span>{theme.buttonText}</span>
                </button>
            </div>
        </OneUICard>
    );
});
RewardCard.displayName = 'RewardCard';

// =====================================================================
// 🚀 MAIN COMPONENT
// =====================================================================
const RewardsPage = () => {
    const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    // Derived State
    const userLevel = userProfile?.level || 1;
    const userXP = userProfile?.xp || 0;
    const claimedRewards = useMemo(() => new Set(userProfile?.claimedRewards || []), [userProfile]);

    // Grouping Logic (Memoized)
    const groupedRewards = useMemo(() => {
        const groups = { feature: [], title: [], badge: [] };
        Object.entries(REWARDS_CONFIG).forEach(([id, config]) => {
            if (groups[config.type]) {
                groups[config.type].push({ id, ...config });
            }
        });
        // Sort by level requirement
        for (const type in groups) {
            groups[type].sort((a, b) => a.level - b.level);
        }
        return groups;
    }, []);

    // Handlers
    const handleClaimReward = useCallback(async (rewardId) => {
        if (!user?.id || isUpdating) return;
        
        setIsUpdating(true);
        const config = REWARDS_CONFIG[rewardId];
        
        try {
            const updateData = { claimedRewards: arrayUnion(rewardId) };

            // Apply Reward Logic
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
                    case 'feat_photo_1': updateData.featuredPhotosSlots = 1; break;
                    case 'feat_photo_2': updateData.featuredPhotosSlots = 2; break;
                    case 'feat_photo_3': updateData.featuredPhotosSlots = 3; break;
                    default: break;
                }
            }

            const userDocRef = doc(db, 'users', user.id);
            await updateDoc(userDocRef, updateData);
            await refreshUserProfile();
            showToast('Reward unlocked successfully!', 'success');
        } catch (error) {
            console.error("Error claiming reward:", error);
            showToast('Failed to claim reward. Try again.', 'error');
        } finally {
            setIsUpdating(false);
        }
    }, [user, isUpdating, refreshUserProfile, showToast]);

    if (authLoading || !userProfile) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans pb-36 px-2 sm:px-4">
            
            {/* 1. HEADER & LEVEL WIDGET */}
            <div className="pt-6 pb-6 px-4">
                <div className="flex flex-col gap-6">
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Rewards</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1">Level up to unlock features</p>
                        </div>
                    </div>

                    {/* OneUI Level Widget */}
                    <div className="relative overflow-hidden bg-slate-900 dark:bg-black rounded-[2.5rem] p-6 shadow-2xl">
                        {/* Abstract Background Shapes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/30 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-wider rounded-md">
                                        Current Rank
                                    </span>
                                </div>
                                <div className="text-5xl font-black text-white tracking-tight flex items-baseline gap-2">
                                    {userLevel}
                                    <span className="text-lg font-bold text-slate-500">Lvl</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total XP</div>
                                <div className="text-2xl font-black text-white">{userXP.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Progress Bar Visual */}
                        <div className="mt-6 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 w-3/4 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. REWARD SECTIONS */}
            <div className="space-y-10 px-2 sm:px-2">
                {Object.entries(groupedRewards).map(([type, rewards]) => {
                    if (rewards.length === 0) return null;
                    
                    let title = 'Rewards';
                    let description = 'Extras';

                    switch (type) {
                        case 'feature': 
                            title = 'Features'; 
                            description = 'Unlock new capabilities';
                            break;
                        case 'title': 
                            title = 'Honor Titles'; 
                            description = 'Display on your profile';
                            break;
                        case 'badge': 
                            title = 'Badges'; 
                            description = 'Show off your achievements';
                            break;
                        default: break;
                    }

                    return (
                        <div key={type}>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{title}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{description}</p>
                                </div>
                            </div>
                            
                            <motion.div 
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                            >
                                {rewards.map(reward => (
                                    <RewardCard
                                        key={reward.id}
                                        id={reward.id}
                                        config={reward}
                                        userLevel={userLevel}
                                        isClaimed={claimedRewards.has(reward.id)}
                                        onClaim={handleClaimReward}
                                        isUpdating={isUpdating}
                                    />
                                ))}
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RewardsPage;