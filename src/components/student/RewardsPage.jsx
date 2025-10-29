import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import Spinner from '../common/Spinner';
import {
    AcademicCapIcon,
    SparklesIcon,
    PaintBrushIcon,
    PhotoIcon,
    UserCircleIcon,
    LockClosedIcon,
    CheckCircleIcon,
    GiftIcon,
    ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid';

// Import the border logic from your Avatar component
// (Adjust path if needed)
import { getBorderClasses, isGradientPaddingBorder } from '../common/UserInitialsAvatar';


// --- Rewards Configuration ---
// (No changes)
const REWARDS_CONFIG = {
    'border_basic': { level: 5, type: 'border', name: 'Basic Border', icon: PaintBrushIcon, description: 'A simple, clean border.' },
    'border_animated': { level: 10, type: 'border', name: 'Animated Border', icon: PaintBrushIcon, description: 'A subtly pulsing border.' },
    'border_advanced_animated': { level: 30, type: 'border', name: 'Advanced Animated Border', icon: PaintBrushIcon, description: 'A spinning, eye-catching border.' },
    'border_elite_animated': { level: 50, type: 'border', name: 'Elite Animated Border', icon: PaintBrushIcon, description: 'A highly stylized border.' },
    'border_legendary_animated': { level: 80, type: 'border', name: 'Legendary Animated Border', icon: PaintBrushIcon, description: 'A border with striking visual effects.' },
    'bg_pattern_1': { level: 20, type: 'background', name: 'Subtle Pattern Background', icon: PhotoIcon, description: 'A gentle pattern for your profile.' },
    'bg_pattern_2': { level: 40, type: 'background', name: 'Intricate Pattern Background', icon: PhotoIcon, description: 'A more detailed background design.' },
    'bg_pattern_elite': { level: 60, type: 'background', name: 'Elite Background', icon: PhotoIcon, description: 'A premium background theme.' },
    'bg_pattern_legendary': { level: 90, type: 'background', name: 'Legendary Background', icon: PhotoIcon, description: 'A top-tier background.' },
    'canSetBio': { level: 15, type: 'feature', name: 'Custom Bio', icon: UserCircleIcon, description: 'Unlock the ability to set a custom bio.' },
    'title_adept': { level: 35, type: 'title', name: 'Title: Adept', icon: AcademicCapIcon, description: 'Display the "Adept" title.' },
    'title_guru': { level: 70, type: 'title', name: 'Title: Guru', icon: AcademicCapIcon, description: 'Display the "Guru" title.' },
    'title_legend': { level: 100, type: 'title', name: 'Title: Legend', icon: AcademicCapIcon, description: 'Display the ultimate "Legend" title.' },
    'badge_scholar': { level: 25, type: 'badge', name: 'Scholar Badge', icon: AcademicCapIcon, description: 'Awarded for reaching Level 25.' },
    'badge_master': { level: 45, type: 'badge', name: 'Master Badge', icon: AcademicCapIcon, description: 'Awarded for reaching Level 45.' },
    'badge_legend': { level: 100, type: 'badge', name: 'Legend Badge', icon: AcademicCapIcon, description: 'Awarded for reaching Level 100.' },
};
// --- End Rewards Configuration ---

const RewardsPage = () => {
    // ... (State and handlers remain unchanged) ...
    const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
    const { showToast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    const userLevel = userProfile?.level || 1;
    const unlockedRewards = useMemo(() => new Set(userProfile?.unlockedRewards || []), [userProfile]);
    const claimedRewards = useMemo(() => new Set(userProfile?.claimedRewards || []), [userProfile]);
    const selectedBorder = userProfile?.selectedBorder || 'none';
    const selectedBackground = userProfile?.selectedBackground || 'none';
    const cosmeticsEnabled = userProfile?.cosmeticsEnabled ?? true;

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

    const handleToggleCosmetics = async (enabled) => {
        await handleUpdateProfile({ cosmeticsEnabled: enabled });
    };

    const handleClaimReward = async (rewardId) => {
        await handleUpdateProfile({ claimedRewards: arrayUnion(rewardId) });
    };

    const handleSelectCosmetic = async (rewardId, type) => {
        if (type === 'border') {
            await handleUpdateProfile({ selectedBorder: rewardId });
        } else if (type === 'background') {
            await handleUpdateProfile({ selectedBackground: rewardId });
        }
    };


    const renderRewardItem = (id, config) => {
        const { level, type, name, icon: Icon, description } = config;
        const isEligible = userLevel >= level;
        const isUnlocked = unlockedRewards.has(id);
        const isClaimed = claimedRewards.has(id);
        const isSelected = (type === 'border' && selectedBorder === id) || (type === 'background' && selectedBackground === id);
        const isFeatureOrTitleOrBadge = type === 'feature' || type === 'title' || type === 'badge';

        let status = 'locked';
        if (isEligible && isUnlocked) {
            if (isClaimed) {
                status = isSelected ? 'active' : (isFeatureOrTitleOrBadge ? 'claimed' : 'selectable');
            } else {
                status = 'claimable';
            }
        }

        // --- MODIFIED: Dynamic Border Logic ---
        let activeBorderClasses = '';
        let isGradientBorder = false;
        let isRingBorder = false;

        if (cosmeticsEnabled && status === 'active' && (type === 'border' || type === 'background')) {
            let classes = getBorderClasses(id);

            // --- THIS IS THE FIX ---
            // If this is the 'border_basic' (Level 5), replace its spinning animation
            // with the panning animation, which looks better on rectangles.
            if (id === 'border_basic') {
                classes = classes.replace('animate-spin-fast', 'animate-gradient-pan');
            }
            // --- END FIX ---

            if (isGradientPaddingBorder(id)) {
                isGradientBorder = true;
                activeBorderClasses = classes;
            } else {
                isRingBorder = true;
                activeBorderClasses = classes;
            }
        }
        // --- END MODIFIED ---

        return (
            <div
                key={id}
                className={`relative bg-neumorphic-base rounded-xl shadow-neumorphic transition-all duration-300 ease-in-out 
                            ${status === 'locked' ? 'opacity-60' : 'hover:-translate-y-1 hover:shadow-neumorphic-lg'} 
                            ${isRingBorder ? activeBorderClasses : ''} 
                            ${isGradientBorder ? 'p-1' : ''}`} // Add padding for gradient
            >
                {/* Gradient border element (if needed) */}
                {isGradientBorder && (
                    <div className={`absolute inset-0 rounded-xl z-0 pointer-events-none ${activeBorderClasses}`}></div>
                )}

                {/* Content Wrapper - must be relative and have its own bg */}
                <div className={`relative z-10 flex flex-col justify-between h-full bg-neumorphic-base p-4 ${isGradientBorder ? 'rounded-lg' : 'rounded-xl'}`}>
                    {/* ^ If gradient, inner radius is smaller */}
                    
                    {/* Card Content... */}
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Icon className={`w-6 h-6 ${status === 'locked' ? 'text-slate-400' : 'text-red-500'}`} />
                            <h4 className={`font-bold ${status === 'locked' ? 'text-slate-500' : 'text-slate-800'}`}>{name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-3 h-10">{description}</p>
                        {status === 'locked' && <p className="text-xs font-semibold text-slate-400">Unlock at Level {level}</p>}
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
                        {status === 'selectable' && (
                            <button
                                onClick={() => handleSelectCosmetic(id, type)}
                                disabled={isUpdating}
                                className="w-full flex items-center justify-center gap-2 bg-neumorphic-base text-red-600 text-sm font-semibold py-2 px-3 rounded-xl shadow-neumorphic hover:shadow-neumorphic-inset transition-all duration-200 disabled:opacity-50"
                            >
                                <ChevronDoubleRightIcon className="w-4 h-4" /> Select
                            </button>
                        )}
                        {(status === 'active' || status === 'claimed') && (
                            <div className="flex items-center justify-center gap-1 text-green-700 text-sm font-semibold py-2 px-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset">
                                <CheckCircleIcon className="w-4 h-4" /> {status === 'active' ? 'Active' : 'Claimed'}
                            </div>
                        )}
                        {status === 'locked' && (
                             <div className="flex items-center justify-center gap-1 text-slate-500 text-sm font-semibold py-2 px-3 rounded-xl bg-neumorphic-base shadow-neumorphic-inset">
                                <LockClosedIcon className="w-4 h-4" /> Locked
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ... (groupedRewards, authLoading check, and the rest of the return function remain unchanged) ...
    const groupedRewards = useMemo(() => {
        const groups = { border: [], background: [], feature: [], title: [], badge: [] };
        Object.entries(REWARDS_CONFIG).forEach(([id, config]) => {
            if (groups[config.type]) {
                groups[config.type].push({ id, ...config });
            }
        });
        // Sort each group by level
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <SparklesIcon className="w-8 h-8 text-red-500"/> Rewards Center
                </h1>
                <p className="mt-1 text-sm sm:text-base text-slate-500 max-w-xl">
                    Claim and manage your unlocked cosmetic rewards as you level up!
                </p>
            </div>

            {/* Master Toggle */}
            <div className="bg-neumorphic-base p-4 rounded-2xl shadow-neumorphic flex items-center justify-between">
                <label htmlFor="cosmetics-toggle" className="font-semibold text-slate-800 cursor-pointer">
                    Enable Cosmetic Effects
                    <span className="block text-xs text-slate-500">Toggles borders, backgrounds, and themes.</span>
                </label>
                <button
                    type="button"
                    id="cosmetics-toggle"
                    role="switch"
                    aria-checked={cosmeticsEnabled}
                    onClick={() => handleToggleCosmetics(!cosmeticsEnabled)}
                    disabled={isUpdating}
                    className={`relative w-14 h-8 flex-shrink-0 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${cosmeticsEnabled ? 'bg-green-500 shadow-neumorphic-inset' : 'bg-neumorphic-base shadow-neumorphic'} disabled:opacity-50`}
                >
                    <span className="sr-only">Toggle Cosmetic Effects</span>
                    <span
                        aria-hidden="true"
                        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transform transition-all duration-300 ease-in-out ${cosmeticsEnabled ? 'translate-x-6 shadow-none' : 'translate-x-0'}`}
                    />
                </button>
            </div>


            {/* Reward Sections */}
            {Object.entries(groupedRewards).map(([type, rewards]) => {
                if (rewards.length === 0) return null;
                let title = '';
                let Icon = GiftIcon; // Default icon
                switch (type) {
                    case 'border': title = 'Avatar Borders'; Icon = PaintBrushIcon; break;
                    case 'background': title = 'Profile Backgrounds'; Icon = PhotoIcon; break;
                    case 'feature': title = 'Profile Features'; Icon = UserCircleIcon; break;
                    case 'title': title = 'Display Titles'; Icon = AcademicCapIcon; break;
                    case 'badge': title = 'Earned Badges'; Icon = AcademicCapIcon; break;
                    default: title = 'Other Rewards';
                }

                return (
                    <div key={type}>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Icon className="h-6 w-6 text-red-500" /> {title}
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