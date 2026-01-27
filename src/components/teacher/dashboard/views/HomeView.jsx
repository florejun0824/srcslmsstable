import React, { useState, lazy, Suspense, memo, useEffect, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ShieldCheck, Share2, Check, ArrowRight, School, Lock } from 'lucide-react'; 
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

            {/* --- RESTORED & OVERHAULED WELCOME NOTICE MODAL --- */}
            <Transition appear show={isWelcomeModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
                    
                    {/* Backdrop */}
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-500"
                                enterFrom="opacity-0 scale-90 translate-y-8"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-8"
                            >
                                <Dialog.Panel className="w-full max-w-sm sm:max-w-md transform overflow-hidden rounded-[2.5rem] bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-2xl p-0 text-left align-middle shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all border border-white/40 dark:border-white/10 ring-1 ring-black/5 relative">
                                    
                                    {/* --- DECORATIVE HEADER BACKGROUND --- */}
                                    <div className="absolute top-0 left-0 right-0 h-32 bg-slate-50 dark:bg-white/5 overflow-hidden pointer-events-none">
                                        <div 
                                            className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20"
                                            style={{ background: primaryColor }}
                                        />
                                        <div 
                                            className="absolute top-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-20"
                                            style={{ background: 'var(--monet-primary-container, #818cf8)' }}
                                        />
                                    </div>

                                    {/* --- MAIN CONTENT --- */}
                                    <div className="relative px-8 pt-10 pb-8">
                                        
                                        {/* 1. School Logo (Floating Badge) */}
                                        <div className="relative mx-auto w-24 h-24 mb-6">
                                            <div className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none flex items-center justify-center p-4 border border-white/50 dark:border-white/10 z-10">
                                                 {schoolLogo ? (
                                                    <img 
                                                        src={schoolLogo} 
                                                        alt="School Logo" 
                                                        className="w-full h-full object-contain" 
                                                    />
                                                 ) : (
                                                    <School className="w-10 h-10 text-slate-400" />
                                                 )}
                                            </div>
                                            {/* Glow behind logo */}
                                            <div className="absolute -inset-4 bg-gradient-to-b from-white/0 to-white/80 dark:to-[#1A1D24] z-20 blur-md rounded-full mt-10" />
                                        </div>

                                        {/* 2. Welcome Titles */}
                                        <div className="text-center mb-8 relative z-30">
                                            <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-1">
                                                Welcome back,
                                            </h3>
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-4">
                                                {userProfile?.firstName}
                                            </h2>
                                            
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                                                    {schoolName}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 3. Trust Indicators (Redesigned as 'Cards') */}
                                        <div className="grid grid-cols-1 gap-3 mb-8">
                                            {/* Card 1: Shared Resources */}
                                            <div className="group flex items-start gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-colors">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Share2 size={20} strokeWidth={2} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Collaborative Network</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                                                        Access shared resources across our sister schools.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Card 2: Privacy */}
                                            <div className="group flex items-start gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-black/20 border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5 transition-colors">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <Lock size={20} strokeWidth={2} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Encrypted Workspace</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                                                        Your data is strictly isolated and private.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. Footer Actions */}
                                        <div className="space-y-4">
                                            {/* Don't Show Again Toggle */}
                                            <div 
                                                className="flex items-center justify-center gap-3 cursor-pointer group select-none py-2"
                                                onClick={() => setDontShowAgain(!dontShowAgain)}
                                            >
                                                <div className={`
                                                    w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200
                                                    ${dontShowAgain 
                                                        ? 'bg-slate-800 border-slate-800 dark:bg-white dark:border-white' 
                                                        : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'}
                                                `}>
                                                    <Check size={12} className={`text-white dark:text-slate-900 transition-transform ${dontShowAgain ? 'scale-100' : 'scale-0'}`} strokeWidth={4} />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                                                    Don't show this again
                                                </span>
                                            </div>

                                            {/* Hero Button */}
                                            <button
                                                type="button"
                                                onClick={handleCloseWelcome}
                                                className="group relative w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all overflow-hidden"
                                            >
                                                <div 
                                                    className="absolute inset-0 transition-all duration-300"
                                                    style={{ background: primaryColor }}
                                                />
                                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                
                                                <div className="relative flex items-center justify-center gap-2">
                                                    <span>Enter Dashboard</span>
                                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </button>
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