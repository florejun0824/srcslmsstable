// src/components/HomeView.jsx

import React, { useState, lazy, Suspense, memo, useEffect, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ShieldCheck, Share2, Check, ArrowRight, School, Lock, Sparkles } from 'lucide-react'; 
import DashboardHeader from './components/DashboardHeader';
import ActivityFeed from './components/ActivityFeed';
import { useSchedule } from './hooks/useSchedule';
import SchoolBrandingHandler from '../../../common/SchoolBrandingHandler';

const ScheduleModal = lazy(() => import('../widgets/ScheduleModal'));

// Helpers
const getSchoolName = (schoolId) => {
    const schools = {
        'srcs_main': 'San Ramon Catholic School',
        'hras_sipalay': 'Holy Rosary Academy',
        'kcc_kabankalan': 'Kabankalan Catholic College',
        'icad_dancalan': 'Immaculate Conception Academy',
        'mchs_magballo': 'Magballo Catholic High School',
        'ichs_ilog': 'Ilog Catholic High School'
    };
    return schools[schoolId || 'srcs_main'] || 'Your School';
};

const getSchoolLogo = (schoolId) => {
    const logos = {
        'srcs_main': '/logo.png',
        'hras_sipalay': '/logos/hra.png',
        'kcc_kabankalan': '/logos/kcc.png',
        'icad_dancalan': '/logos/ica.png',
        'mchs_magballo': '/logos/mchs.png',
        'ichs_ilog': '/logos/ichs.png'
    };
    return logos[schoolId || 'srcs_main'] || '/logo.png';
};

const HomeView = ({
    showToast,
    userProfile,
    teacherAnnouncements,
    handleCreateAnnouncement,
    activeClasses,
}) => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    
    // --- DIALOG STATES ---
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // --- RACE CONDITION FIX ---
    const [readyForBranding, setReadyForBranding] = useState(false);

    const effectiveSchoolId = userProfile?.schoolId || 'srcs_main';
    const schoolName = getSchoolName(effectiveSchoolId);
    const schoolLogo = getSchoolLogo(effectiveSchoolId);
    
    // Dynamic Theme (Simulated)
    const primaryColor = 'var(--monet-primary, #4f46e5)'; 

    const {
        scheduleActivities,
        onAddActivity,
        onUpdateActivity,
        onDeleteActivity,
    } = useSchedule(showToast, effectiveSchoolId);

    const openScheduleModal = useCallback(() => setIsScheduleModalOpen(true), []);
    const closeScheduleModal = useCallback(() => setIsScheduleModalOpen(false), []);

    // 2. CHECK IF WELCOME MODAL IS NEEDED
    useEffect(() => {
        if (!userProfile?.id) return;

        const hasOptedOut = localStorage.getItem(`welcome_opt_out_${userProfile.id}`);
        const hasSeenSession = sessionStorage.getItem(`welcome_seen_session_${userProfile.id}`);
        
        if (!hasOptedOut && !hasSeenSession) {
            setIsWelcomeModalOpen(true);
            setReadyForBranding(false); 
        } else {
            setReadyForBranding(true); 
        }
    }, [userProfile?.id]);

    // 3. WHEN WELCOME MODAL CLOSES
    const handleCloseWelcome = useCallback(() => {
        if (userProfile?.id) {
            sessionStorage.setItem(`welcome_seen_session_${userProfile.id}`, 'true');
            if (dontShowAgain) {
                localStorage.setItem(`welcome_opt_out_${userProfile.id}`, 'true');
            }
        }
        setIsWelcomeModalOpen(false);

        setTimeout(() => {
            setReadyForBranding(true);
        }, 300);
    }, [userProfile?.id, dontShowAgain]);

    return (
        <div className="w-full font-sans pb-32 lg:pb-8 relative z-10" style={{ contentVisibility: 'auto' }}>
            {/* --- PASSIVE BRANDING HANDLER --- */}
            <SchoolBrandingHandler shouldCheck={readyForBranding} />

            {/* REDUCED GAP: gap-8 -> gap-4 */}
            <div className="flex flex-col gap-4">
                {/* 1. Bento Grid Header (Includes Create Post) */}
                <DashboardHeader
                    userProfile={userProfile}
                    showToast={showToast}
                    onOpenScheduleModal={openScheduleModal}
                    activeClasses={activeClasses}
                    handleCreateAnnouncement={handleCreateAnnouncement}
                />
                
                {/* 2. Connected Feed */}
                <ActivityFeed
                    userProfile={userProfile}
                    teacherAnnouncements={teacherAnnouncements}
                    activeClasses={activeClasses}
                    handleCreateAnnouncement={handleCreateAnnouncement}
                    showToast={showToast}
                />
            </div>
            
            <Suspense fallback={null}>
                {isScheduleModalOpen && (
                    <ScheduleModal
                        isOpen={isScheduleModalOpen}
                        onClose={closeScheduleModal}
                        userRole={userProfile?.role}
                        scheduleActivities={scheduleActivities}
                        onAddActivity={onAddActivity}
                        onUpdateActivity={onUpdateActivity}
                        onDeleteActivity={onDeleteActivity}
                    />
                )}
            </Suspense>

				{/* --- REDESIGNED RESPONSIVE WELCOME GATE --- */}
				            <Transition appear show={isWelcomeModalOpen} as={Fragment}>
				                <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
                    
				                    {/* 1. Backdrop */}
				                    <Transition.Child
				                        as={Fragment}
				                        enter="ease-out duration-500"
				                        enterFrom="opacity-0 backdrop-blur-none"
				                        enterTo="opacity-100 backdrop-blur-md"
				                        leave="ease-in duration-300"
				                        leaveFrom="opacity-100 backdrop-blur-md"
				                        leaveTo="opacity-0 backdrop-blur-none"
				                    >
				                        <div className="fixed inset-0 bg-[#020617]/80 transition-all" />
				                    </Transition.Child>

				                    <div className="fixed inset-0 overflow-y-auto">
				                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            
				                            <Transition.Child
				                                as={Fragment}
				                                enter="ease-out duration-500"
				                                enterFrom="opacity-0 scale-95 translate-y-8"
				                                enterTo="opacity-100 scale-100 translate-y-0"
				                                leave="ease-in duration-300"
				                                leaveFrom="opacity-100 scale-100 translate-y-0"
				                                leaveTo="opacity-0 scale-95 translate-y-8"
				                            >
				                                <Dialog.Panel className="relative w-full max-w-sm sm:max-w-4xl transform overflow-hidden rounded-[24px] md:rounded-[32px] bg-white dark:bg-[#0f1014] shadow-2xl transition-all flex flex-col md:flex-row ring-1 ring-white/10">
                                    
				                                    {/* -----------------------
				                                        TOP BANNER (Mobile) / LEFT PANE (Desktop)
				                                    ------------------------ */}
				                                    <div className="relative w-full md:w-5/12 bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-6 md:p-8 h-56 md:h-auto min-h-[14rem] md:min-h-[32rem]">
                                        
				                                        {/* Background Visuals */}
				                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-[#0f1014] to-slate-900" />
				                                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/10 to-transparent opacity-50" />
				                                        <div className="absolute inset-0 opacity-20 mix-blend-overlay" 
				                                             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
				                                        />

				                                        {/* Animated Sonar Logo Container */}
				                                        <div className="relative z-10 flex flex-col items-center">
                                            
				                                            {/* Sonar Rings (Scaled for mobile) */}
				                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
				                                                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border border-indigo-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
				                                                <div className="absolute w-24 h-24 md:w-32 md:h-32 rounded-full border border-blue-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
				                                            </div>

				                                            {/* Glass Logo Box (Adaptive Size) */}
				                                            <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center p-4 md:p-5 mb-4 md:mb-6 group">
				                                                {/* Inner Glow */}
				                                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-2xl md:rounded-3xl opacity-50" />
                                                
				                                                {schoolLogo ? (
				                                                    <img 
				                                                        src={schoolLogo} 
				                                                        alt="School Logo" 
				                                                        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
				                                                    />
				                                                ) : (
				                                                    <School className="w-8 h-8 md:w-12 md:h-12 text-indigo-200" />
				                                                )}
				                                            </div>

				                                            {/* System Status Pill */}
				                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
				                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
				                                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
				                                                    System Online
				                                                </span>
				                                            </div>
				                                        </div>
				                                    </div>

				                                    {/* -----------------------
				                                        BOTTOM CONTENT (Mobile) / RIGHT PANE (Desktop)
				                                    ------------------------ */}
				                                    <div className="relative w-full md:w-7/12 bg-white dark:bg-[#0f1014] p-6 md:p-10 flex flex-col justify-center">
                                        
				                                        {/* 1. Header Greeting */}
				                                        <div className="mb-6 md:mb-8 text-center md:text-left">
				                                            <h4 className="text-xs md:text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 md:mb-2 uppercase tracking-wide">
				                                                Welcome Back
				                                            </h4>
				                                            <h2 className="text-3xl md:text-4xl font-[800] text-slate-900 dark:text-white tracking-tight mb-2">
				                                                {userProfile?.firstName}
				                                            </h2>
				                                            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
				                                                Connected to <span className="font-semibold text-slate-700 dark:text-slate-300">{schoolName}</span>.
				                                            </p>
				                                        </div>

				                                        {/* 2. Feature Grid (Tiles) */}
				                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10 text-left">
				                                            {/* Tile 1 */}
				                                            <div className="group p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
				                                                <div className="flex items-center gap-3 md:block">
				                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300 md:mb-3 group-hover:scale-110 transition-transform flex-shrink-0">
				                                                        <Share2 size={16} className="md:w-5 md:h-5" strokeWidth={2.5} />
				                                                    </div>
				                                                    <div>
				                                                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">Shared Resources</h5>
				                                                        <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed md:mt-1">
				                                                            Access materials from sister schools.
				                                                        </p>
				                                                    </div>
				                                                </div>
				                                            </div>

				                                            {/* Tile 2 */}
				                                            <div className="group p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all">
				                                                <div className="flex items-center gap-3 md:block">
				                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300 md:mb-3 group-hover:scale-110 transition-transform flex-shrink-0">
				                                                        <ShieldCheck size={16} className="md:w-5 md:h-5" strokeWidth={2.5} />
				                                                    </div>
				                                                    <div>
				                                                        <h5 className="font-bold text-slate-900 dark:text-white text-sm">Encrypted Space</h5>
				                                                        <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed md:mt-1">
				                                                            Your data is strictly isolated.
				                                                        </p>
				                                                    </div>
				                                                </div>
				                                            </div>
				                                        </div>

				                                        {/* 3. Footer Actions */}
				                                        <div className="mt-auto space-y-4 md:space-y-5">
                                            
				                                            {/* Primary Button */}
				                                            <button
				                                                type="button"
				                                                onClick={handleCloseWelcome}
				                                                className="group relative w-full py-3.5 md:py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-600/20 dark:shadow-indigo-900/30 overflow-hidden bg-slate-900 dark:bg-indigo-600 active:scale-[0.98] transition-all"
				                                            >
				                                                {/* Shine */}
				                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
                                                
				                                                <div className="relative flex items-center justify-center gap-2 md:gap-3">
				                                                    <span className="text-sm md:text-base">Enter Dashboard</span>
				                                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-indigo-200 dark:text-indigo-100" />
				                                                </div>
				                                            </button>

				                                            {/* Discrete Checkbox */}
				                                            <div className="flex justify-center">
				                                                <label 
				                                                    className="flex items-center gap-2 md:gap-3 cursor-pointer group select-none opacity-70 hover:opacity-100 transition-opacity p-2"
				                                                    onClick={(e) => { e.preventDefault(); setDontShowAgain(!dontShowAgain); }}
				                                                >
				                                                    <div className={`
				                                                        w-4 h-4 md:w-5 md:h-5 rounded border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0
				                                                        ${dontShowAgain 
				                                                            ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500' 
				                                                            : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-500'}
				                                                    `}>
				                                                        <Check size={10} className={`md:w-3 md:h-3 text-white ${dontShowAgain ? 'scale-100' : 'scale-0'} transition-transform`} strokeWidth={4} />
				                                                    </div>
				                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
				                                                        Don't show this again
				                                                    </span>
				                                                </label>
				                                            </div>

				                                        </div>

				                                    </div>
				                                </Dialog.Panel>
				                            </Transition.Child>
				                        </div>
				                    </div>
				                </Dialog>
				            </Transition>
        </div>
    );
};

export default memo(HomeView);