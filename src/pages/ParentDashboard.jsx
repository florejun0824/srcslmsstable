// src/pages/ParentDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { linkParentWithCode, getStudentGrades, getStudentActivity } from '../services/firestoreService';
import { getWeeklyStats, computeAverages, formatDuration } from '../services/sessionTrackingService';
import Spinner from '../components/common/Spinner';
import ParentGradesView from '../components/parent/ParentGradesView';
import ParentActivityView from '../components/parent/ParentActivityView';
import UserInitialsAvatar from '../components/common/UserInitialsAvatar';
import {
    AcademicCapIcon,
    ChartBarIcon,
    ClockIcon,
    LinkIcon,
    ArrowRightStartOnRectangleIcon,
    UserCircleIcon,
    PlusIcon,
    SparklesIcon,
    UserGroupIcon,
    XMarkIcon,
    ArrowTrendingUpIcon,
    ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import {
    ChartBarIcon as ChartBarSolid,
    ClockIcon as ClockSolid,
} from '@heroicons/react/24/solid';

const TAB_CONFIG = [
    { id: 'grades', label: 'Grades', icon: ChartBarIcon, activeIcon: ChartBarSolid },
    { id: 'activity', label: 'Activity', icon: ClockIcon, activeIcon: ClockSolid },
];

const ParentDashboard = () => {
    const { userProfile, logout, refreshUserProfile } = useAuth();
    const { showToast } = useToast();

    // State
    const [activeTab, setActiveTab] = useState('grades');
    const [children, setChildren] = useState([]);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [childData, setChildData] = useState(null);

    // Link code state
    const [linkCode, setLinkCode] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);

    const childStudentIds = useMemo(() => userProfile?.childStudentIds || [], [userProfile?.childStudentIds]);
    const hasChildren = childStudentIds.length > 0;

    // Fetch children profiles
    useEffect(() => {
        if (!hasChildren) {
            setIsLoading(false);
            setChildren([]);
            return;
        }

        const fetchChildren = async () => {
            setIsLoading(true);
            try {
                const childProfiles = [];
                for (const sid of childStudentIds) {
                    const snap = await getDoc(doc(db, 'users', sid));
                    if (snap.exists()) {
                        childProfiles.push({ id: snap.id, ...snap.data() });
                    }
                }
                setChildren(childProfiles);
            } catch (err) {
                console.error('Error fetching children:', err);
                showToast('Failed to load linked students.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchChildren();
    }, [childStudentIds, hasChildren, showToast]);

    // Fetch selected child's data
    useEffect(() => {
        if (children.length === 0) return;

        const selectedChild = children[selectedChildIndex];
        if (!selectedChild) return;

        const fetchChildData = async () => {
            try {
                const [grades, activity, weeklyStats] = await Promise.all([
                    getStudentGrades(selectedChild.id),
                    getStudentActivity(selectedChild.id),
                    getWeeklyStats(selectedChild.id, 4),
                ]);
                const averages = computeAverages(weeklyStats);
                setChildData({ grades, activity, weeklyStats, averages });
            } catch (err) {
                console.error('Error fetching child data:', err);
                showToast('Failed to load student data.', 'error');
            }
        };

        fetchChildData();
    }, [children, selectedChildIndex, showToast]);

    // Link parent handler
    const handleLinkStudent = useCallback(async () => {
        if (!linkCode.trim()) {
            showToast('Please enter a link code.', 'error');
            return;
        }
        setIsLinking(true);
        try {
            const result = await linkParentWithCode(userProfile.id, linkCode.trim());
            showToast(`Successfully linked to ${result.studentName}!`, 'success');
            setLinkCode('');
            setShowLinkInput(false);
            await refreshUserProfile();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsLinking(false);
        }
    }, [linkCode, userProfile?.id, showToast, refreshUserProfile]);

    const selectedChild = children[selectedChildIndex] || null;

    // =================== RENDER: LINK STUDENT FLOW ===================
    if (!isLoading && !hasChildren) {
        return (
            <div className="min-h-screen font-sans bg-[#FEF7FF] dark:bg-[#141218] flex flex-col">
                {/* MD3 Top App Bar */}
                <header className="sticky top-0 z-50 px-3 sm:px-4 pt-3 pb-2">
                    <div className="mx-auto max-w-3xl h-14 sm:h-16 rounded-full bg-[#E8DEF8]/60 dark:bg-[#4A4458]/40 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 border border-[#E8DEF8] dark:border-[#4A4458]/60">
                        <div className="flex items-center gap-2.5">
                            <UserGroupIcon className="w-5 h-5 text-[#6750A4] dark:text-[#D0BCFF]" />
                            <span className="font-semibold text-sm text-[#1D1B20] dark:text-[#E6E0E9]">Parent Portal</span>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E8DEF8] dark:bg-[#4A4458] hover:bg-[#D0BCFF] dark:hover:bg-[#625B71] text-[#6750A4] dark:text-[#D0BCFF] text-sm font-semibold transition-all active:scale-[0.97]"
                        >
                            <ArrowRightStartOnRectangleIcon className="w-4.5 h-4.5" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </header>

                {/* Link Student Card */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
                    <div className="max-w-md w-full bg-white/95 dark:bg-[#1D1B20]/95 backdrop-blur-xl rounded-[28px] p-8 sm:p-10 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.1)] text-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#EADDFF] dark:bg-[#4A4458] flex items-center justify-center mx-auto mb-6 sm:mb-8">
                            <LinkIcon className="w-10 h-10 sm:w-12 sm:h-12 text-[#6750A4] dark:text-[#D0BCFF]" />
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1B20] dark:text-[#E6E0E9] mb-2">
                            Link to Your Child
                        </h1>
                        <p className="text-sm text-[#49454F] dark:text-[#CAC4D0] mb-8 leading-relaxed">
                            Ask your child for their <span className="font-semibold text-[#6750A4] dark:text-[#D0BCFF]">Parent Link Code</span> — found in their profile settings.
                        </p>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={linkCode}
                                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                className="w-full h-14 bg-[#E7E0EC] dark:bg-[#49454F] rounded-2xl px-5 text-center text-2xl font-bold tracking-[0.4em] text-[#1D1B20] dark:text-[#E6E0E9] placeholder-[#79747E] border-2 border-transparent focus:border-[#6750A4] focus:ring-0 outline-none transition-colors uppercase"
                            />

                            <button
                                onClick={handleLinkStudent}
                                disabled={isLinking || linkCode.length < 6}
                                className="w-full h-14 rounded-full font-semibold text-white bg-[#6750A4] hover:bg-[#5B45A0] shadow-md shadow-[#6750A4]/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLinking ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LinkIcon className="w-5 h-5" />
                                        Link Student
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-[10px] text-[#79747E] mt-6 uppercase tracking-wider font-semibold">
                            Secure • Read-Only Access
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // =================== RENDER: LOADING ===================
    if (isLoading) {
        return (
            <div className="min-h-screen font-sans bg-[#FEF7FF] dark:bg-[#141218] flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    // =================== RENDER: MAIN DASHBOARD ===================
    return (
        <div className="min-h-screen font-sans bg-[#FEF7FF] dark:bg-[#141218] flex flex-col">
            {/* MD3 Top App Bar */}
            <header className="sticky top-0 z-50 px-3 sm:px-4 pt-3 pb-2">
                <div className="mx-auto max-w-5xl h-14 sm:h-16 rounded-full bg-[#E8DEF8]/60 dark:bg-[#4A4458]/40 backdrop-blur-xl flex items-center justify-between px-3 sm:px-5 border border-[#E8DEF8] dark:border-[#4A4458]/60">
                    <div className="flex items-center gap-2.5">
                        <UserGroupIcon className="w-5 h-5 text-[#6750A4] dark:text-[#D0BCFF]" />
                        <span className="font-semibold text-sm text-[#1D1B20] dark:text-[#E6E0E9]">Parent's Portal</span>
                    </div>

                    {/* Child Selector Chips */}
                    {children.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                            {children.map((child, idx) => (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-semibold whitespace-nowrap ${idx === selectedChildIndex
                                        ? 'bg-[#6750A4] text-white dark:bg-[#D0BCFF] dark:text-[#381E72] shadow-sm'
                                        : 'text-[#49454F] dark:text-[#CAC4D0] hover:bg-[#E8DEF8]/50 dark:hover:bg-[#4A4458]/50'
                                        }`}
                                >
                                    <UserCircleIcon className="w-4 h-4" />
                                    <span>{child.firstName}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setShowLinkInput(!showLinkInput)}
                            className="p-2 rounded-full hover:bg-[#E8DEF8] dark:hover:bg-[#4A4458] text-[#49454F] dark:text-[#CAC4D0] transition-colors"
                            title="Link another student"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-[#E8DEF8] dark:hover:bg-[#4A4458] text-[#49454F] dark:text-[#CAC4D0] transition-colors"
                        >
                            <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                            <span className="text-xs font-semibold hidden md:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Link Another Student Bar */}
            {showLinkInput && (
                <div className="px-3 sm:px-4 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="mx-auto max-w-5xl bg-[#EADDFF] dark:bg-[#4A4458]/50 rounded-2xl p-3 sm:p-4 border border-[#D0BCFF]/40 dark:border-[#625B71]/40 flex items-center gap-2 sm:gap-3">
                        <input
                            type="text"
                            value={linkCode}
                            onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                            placeholder="Link Code"
                            maxLength={6}
                            className="flex-1 h-10 bg-white dark:bg-[#1D1B20] rounded-xl px-4 text-sm font-semibold tracking-wider text-[#1D1B20] dark:text-[#E6E0E9] placeholder-[#79747E] border border-[#79747E]/20 focus:border-[#6750A4] focus:ring-0 outline-none uppercase"
                        />
                        <button
                            onClick={handleLinkStudent}
                            disabled={isLinking || linkCode.length < 6}
                            className="px-4 h-10 rounded-full bg-[#6750A4] text-white text-sm font-semibold hover:bg-[#5B45A0] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLinking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                            Link
                        </button>
                        <button onClick={() => { setShowLinkInput(false); setLinkCode(''); }} className="p-2 rounded-full text-[#49454F] dark:text-[#CAC4D0] hover:bg-black/5 dark:hover:bg-white/5">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Student Overview Card */}
            {selectedChild && (
                <div className="px-3 sm:px-6 pb-4 pt-3 sm:pt-4">
                    <div className="mx-auto max-w-5xl bg-gradient-to-br from-[#6750A4] via-[#7F67BE] to-[#6750A4] dark:from-[#4A4458] dark:via-[#625B71] dark:to-[#4A4458] rounded-[24px] sm:rounded-[28px] p-5 sm:p-8 text-white shadow-lg shadow-[#6750A4]/15 dark:shadow-none relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.06] rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/[0.04] rounded-full -ml-8 -mb-8" />

                        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-3 ring-white/20 shadow-xl flex-shrink-0 overflow-hidden bg-white/10">
                                <UserInitialsAvatar user={selectedChild} size="full" className="w-full h-full" />
                            </div>
                            <div className="text-center sm:text-left flex-1">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                                    {selectedChild.firstName} {selectedChild.lastName}
                                </h1>
                                {childData?.activity?.lastLogin && (
                                    <p className="text-xs text-white/80 font-medium mb-3 flex items-center gap-1.5 justify-center sm:justify-start">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        Last Login: {
                                            childData.activity.lastLogin.toDate
                                                ? childData.activity.lastLogin.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                                                : new Date(childData.activity.lastLogin).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                                        }
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                                    {selectedChild.gradeLevel && (
                                        <span className="px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                            <AcademicCapIcon className="w-3.5 h-3.5" />
                                            {selectedChild.gradeLevel}
                                        </span>
                                    )}
                                    {childData?.activity && (
                                        <span className="px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                            <SparklesIcon className="w-3.5 h-3.5" />
                                            Level {childData.activity.level || 1}
                                        </span>
                                    )}
                                    {childData?.activity && (
                                        <span className="px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wider">
                                            {childData.activity.xp || 0} XP
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Weekly Stats Cards */}
            {selectedChild && childData?.averages && (
                <div className="px-3 sm:px-6 pb-3">
                    <div className="mx-auto max-w-5xl grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-[#6750A4] dark:text-[#D0BCFF]" />
                                <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Logins/Week</span>
                            </div>
                            <p className="text-lg sm:text-xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">{childData.averages.avgLoginsPerWeek}</p>
                        </div>
                        <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ComputerDesktopIcon className="w-3.5 h-3.5 text-[#6750A4] dark:text-[#D0BCFF]" />
                                <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Screen Time</span>
                            </div>
                            <p className="text-lg sm:text-xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">{formatDuration(childData.averages.avgScreenTimePerWeek)}</p>
                            <p className="text-[9px] text-[#79747E] mt-0.5">per week avg</p>
                        </div>
                        <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ChartBarIcon className="w-3.5 h-3.5 text-[#6750A4] dark:text-[#D0BCFF]" />
                                <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Quiz Time</span>
                            </div>
                            <p className="text-lg sm:text-xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">{formatDuration(childData.averages.avgQuizTimePerWeek)}</p>
                            <p className="text-[9px] text-[#79747E] mt-0.5">per week avg</p>
                        </div>
                        <div className="bg-white/95 dark:bg-[#1D1B20]/95 rounded-2xl p-3 sm:p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ClockIcon className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] sm:text-[10px] font-semibold text-[#79747E] uppercase tracking-wider">Reading</span>
                            </div>
                            <p className="text-lg sm:text-xl font-bold text-[#1D1B20] dark:text-[#E6E0E9]">{formatDuration(childData.averages.avgLessonTimePerWeek)}</p>
                            <p className="text-[9px] text-[#79747E] mt-0.5">per week avg</p>
                        </div>
                    </div>
                </div>
            )}

            {/* MD3 Tab Bar */}
            <div className="px-3 sm:px-6 pb-3">
                <div className="mx-auto max-w-5xl flex">
                    <div className="inline-flex p-1 bg-[#E7E0EC] dark:bg-[#1D1B20] rounded-full border border-[#79747E]/15 dark:border-[#49454F]/30">
                        {TAB_CONFIG.map(tab => {
                            const isActive = activeTab === tab.id;
                            const Icon = isActive ? tab.activeIcon : tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${isActive
                                        ? 'bg-[#6750A4] text-white dark:bg-[#D0BCFF] dark:text-[#381E72] shadow-sm'
                                        : 'text-[#49454F] dark:text-[#CAC4D0] hover:text-[#1D1B20] dark:hover:text-[#E6E0E9]'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 px-3 sm:px-6 pb-8">
                <div className="mx-auto max-w-5xl">
                    {!childData ? (
                        <div className="flex justify-center py-20">
                            <Spinner size="lg" />
                        </div>
                    ) : activeTab === 'grades' ? (
                        <ParentGradesView grades={childData.grades} classes={childData.activity?.classes || []} />
                    ) : (
                        <ParentActivityView activityData={childData.activity} />
                    )}
                </div>
            </main>
        </div>
    );
};

export default ParentDashboard;
