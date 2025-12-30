// src/components/teacher/dashboard/views/HomeView.jsx
import React, { useState, lazy, Suspense, memo, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ShieldCheck, Share2, CheckCircle2, Check } from 'lucide-react'; 
import DashboardHeader from './components/DashboardHeader';
import DashboardWidgets from './components/DashboardWidgets';
import ActivityFeed from './components/ActivityFeed';
import { useSchedule } from './hooks/useSchedule';

const ScheduleModal = lazy(() => import('../widgets/ScheduleModal'));

// 🏫 School Name Helper
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

// 🏫 School Logo Helper
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
    handleViewChange
}) => {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // ✅ FIXED: Pass schoolId to hook so specific schedules load
    const {
        scheduleActivities,
        onAddActivity,
        onUpdateActivity,
        onDeleteActivity,
    } = useSchedule(showToast, userProfile?.schoolId || 'srcs_main');

    // 🚀 EFFECT: Check Storage Logic
    useEffect(() => {
        if (userProfile?.id) {
            const hasOptedOut = localStorage.getItem(`welcome_opt_out_${userProfile.id}`);
            const hasSeenSession = sessionStorage.getItem(`welcome_seen_session_${userProfile.id}`);

            if (!hasOptedOut && !hasSeenSession) {
                setIsWelcomeModalOpen(true);
            }
        }
    }, [userProfile?.id]);

    const handleCloseWelcome = () => {
        if (userProfile?.id) {
            sessionStorage.setItem(`welcome_seen_session_${userProfile.id}`, 'true');
            if (dontShowAgain) {
                localStorage.setItem(`welcome_opt_out_${userProfile.id}`, 'true');
            }
        }
        setIsWelcomeModalOpen(false);
    };

    const openScheduleModal = () => setIsScheduleModalOpen(true);
    const closeScheduleModal = () => setIsScheduleModalOpen(false);
    
    const effectiveSchoolId = userProfile?.schoolId || 'srcs_main';

    return (
        <div 
            className="w-full space-y-6 md:space-y-8 font-sans pb-32 lg:pb-8 relative z-10"
            style={{ contentVisibility: 'auto' }} 
        >
            <div className="flex flex-col gap-4 sm:gap-8">
                <DashboardHeader
                    userProfile={userProfile}
                    showToast={showToast}
                    onOpenScheduleModal={openScheduleModal}
                />
                
                {/* Note: Ensure DashboardWidgets also uses One UI styling internally */}
                <DashboardWidgets
                    activeClasses={activeClasses}
                    handleCreateAnnouncement={handleCreateAnnouncement}
                    onOpenScheduleModal={openScheduleModal}
                />
                
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

            {/* 👋 WELCOME NOTICE MODAL */}
            <Transition appear show={isWelcomeModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-4"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-4"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[32px] bg-white dark:bg-[#1c1c1e] p-8 text-left align-middle shadow-2xl transition-all border border-white/20 ring-1 ring-black/5 relative">
                                    
                                    {/* 🏫 School Logo */}
                                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] bg-slate-50 dark:bg-slate-800/50 mb-6 border border-slate-100 dark:border-slate-700 shadow-sm p-4">
                                        <img 
                                            src={getSchoolLogo(effectiveSchoolId)} 
                                            alt="School Logo" 
                                            className="w-full h-full object-contain drop-shadow-sm" 
                                        />
                                    </div>

                                    <Dialog.Title
                                        as="h3"
                                        className="text-2xl font-black leading-tight text-slate-900 dark:text-white text-center mb-2 tracking-tight"
                                    >
                                        Welcome back,<br/>
                                        <span className="text-blue-600 dark:text-blue-400">{userProfile?.firstName}!</span>
                                    </Dialog.Title>
                                    
                                    <div className="mt-2 text-center mb-8">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                            You are securely logged into
                                        </p>
                                        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">
                                            {getSchoolName(effectiveSchoolId)}
                                        </p>
                                    </div>

                                    {/* Privacy Info Box */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[24px] p-5 border border-slate-100 dark:border-slate-700/50 space-y-5">
                                        
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                                    <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Shared Resources</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                                                    Subject content is shared across our sister schools to foster collaboration.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50" />

                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Private & Secure</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                                                    Your <strong>Student Data, Classes, and Records</strong> are strictly isolated and visible only to your school.
                                                </p>
                                            </div>
                                        </div>

                                    </div>

                                    <div className="mt-8">
                                        <div 
                                            className="flex items-center justify-center gap-2.5 mb-5 cursor-pointer group"
                                            onClick={() => setDontShowAgain(!dontShowAgain)}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                                ${dontShowAgain 
                                                    ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                                                    : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-blue-400'}
                                            `}>
                                                <Check className={`w-3.5 h-3.5 text-white transition-opacity duration-200 ${dontShowAgain ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 select-none group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                                Don't show this message again
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center items-center gap-2 rounded-2xl border border-transparent bg-blue-600 px-4 py-4 text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all active:scale-95 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30"
                                            onClick={handleCloseWelcome}
                                        >
                                            <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
                                            Continue to Dashboard
                                        </button>
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

export default React.memo(HomeView);