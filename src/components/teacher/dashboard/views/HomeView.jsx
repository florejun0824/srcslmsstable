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
				<Dialog as="div" className="relative z-[100]" onClose={() => { }}>

					{/* 1. Backdrop (MD3 Scrim) */}
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-500"
						enterFrom="opacity-0 backdrop-blur-none"
						enterTo="opacity-100 backdrop-blur-md"
						leave="ease-in duration-300"
						leaveFrom="opacity-100 backdrop-blur-md"
						leaveTo="opacity-0 backdrop-blur-none"
					>
						<div className="fixed inset-0 bg-black/50 transition-all" />
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
								<Dialog.Panel className="relative w-full max-w-sm sm:max-w-4xl transform overflow-hidden rounded-[28px] md:rounded-[32px] bg-white shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] transition-all flex flex-col md:flex-row ring-1 ring-slate-200/50">

									{/* -----------------------
				                                        TOP BANNER (Mobile) / LEFT PANE (Desktop)
				                                    ------------------------ */}
									<div className="relative w-full md:w-[45%] bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-8 md:p-12 h-64 md:h-auto min-h-[16rem] md:min-h-[36rem]">

										{/* Stunning Deep Spatial Gradients */}
										<div className="absolute inset-0 bg-slate-900" />
										<div className="absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.5),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.4),transparent_60%)]" />

										{/* Animated Mesh Base */}
										<div
											className="absolute inset-0 opacity-30 mix-blend-overlay"
											style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
										/>

										{/* Animated Central Assembly */}
										<div className="relative z-10 flex flex-col items-center">

											{/* Pulsing Rings */}
											<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
												<div className="w-40 h-40 md:w-56 md:h-56 rounded-full border border-indigo-400/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
												<div className="absolute w-28 h-28 md:w-36 md:h-36 rounded-full border border-indigo-400/30 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite_1.5s]" />
											</div>

											{/* Premium Glass Logo Box */}
											<div className="relative w-24 h-24 md:w-32 md:h-32 rounded-[24px] md:rounded-[32px] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.3)] flex items-center justify-center p-5 md:p-6 mb-5 md:mb-8 group">
												{/* Inner Glow Spotlight */}
												<div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-[24px] md:rounded-[32px] opacity-60" />

												{schoolLogo ? (
													<img
														src={schoolLogo}
														alt="School Logo"
														className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
													/>
												) : (
													<School className="w-10 h-10 md:w-14 md:h-14 text-indigo-100 relative z-10" />
												)}
											</div>

											{/* System Status Pill */}
											<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/50 border border-white/10 backdrop-blur-md shadow-lg">
												<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
												<span className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-100">
													System Online
												</span>
											</div>
										</div>
									</div>

									{/* -----------------------
				                                        BOTTOM CONTENT (Mobile) / RIGHT PANE (Desktop)
				                                    ------------------------ */}
									<div className="relative w-full md:w-[55%] bg-white p-8 md:p-12 flex flex-col justify-center">

										{/* 1. Header Greeting (MD3 Typography) */}
										<div className="mb-8 md:mb-10 text-center md:text-left">
											<h4 className="text-[13px] md:text-sm font-bold text-indigo-600 mb-2 uppercase tracking-wider flex items-center justify-center md:justify-start gap-2">
												<Sparkles size={14} /> Welcome Back
											</h4>
											<h2 className="text-3xl md:text-[40px] leading-tight font-[900] text-slate-900 tracking-tight mb-2.5">
												{userProfile?.firstName}
											</h2>
											<p className="text-[15px] md:text-[17px] text-slate-500">
												Connected to <span className="font-semibold text-slate-800">{schoolName}</span>.
											</p>
										</div>

										{/* 2. Feature Grid (MD3 Surface Variants) */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 md:mb-12 text-left">
											{/* Tile 1 */}
											<div className="group p-4 rounded-[20px] bg-slate-50/80 border border-slate-200/60 hover:bg-white hover:shadow-lg hover:border-indigo-200 transition-all duration-300">
												<div className="flex items-center gap-4 md:block">
													<div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 md:mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform flex-shrink-0">
														<Share2 size={20} strokeWidth={2.5} />
													</div>
													<div>
														<h5 className="font-bold text-slate-900 text-[15px] mb-0.5">Shared Resources</h5>
														<p className="text-[13px] md:text-[14px] text-slate-500 leading-snug">
															Access materials from sister schools.
														</p>
													</div>
												</div>
											</div>

											{/* Tile 2 */}
											<div className="group p-4 rounded-[20px] bg-slate-50/80 border border-slate-200/60 hover:bg-white hover:shadow-lg hover:border-emerald-200 transition-all duration-300">
												<div className="flex items-center gap-4 md:block">
													<div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 md:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform flex-shrink-0">
														<ShieldCheck size={20} strokeWidth={2.5} />
													</div>
													<div>
														<h5 className="font-bold text-slate-900 text-[15px] mb-0.5">Encrypted Space</h5>
														<p className="text-[13px] md:text-[14px] text-slate-500 leading-snug">
															Your data is strictly isolated.
														</p>
													</div>
												</div>
											</div>
										</div>

										{/* 3. Footer Actions (MD3 Components) */}
										<div className="mt-auto flex flex-col gap-6">

											{/* MD3 Switch for Opt-out */}
											<div className="flex justify-center md:justify-start">
												<label className="flex items-center gap-3 cursor-pointer group">
													<div className="relative inline-flex items-center">
														<input
															type="checkbox"
															className="peer sr-only"
															checked={dontShowAgain}
															onChange={(e) => setDontShowAgain(e.target.checked)}
														/>
														<div className={`
                                                                            w-[44px] h-[24px] rounded-full transition-colors duration-300 ease-in-out border-2
                                                                            ${dontShowAgain ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-slate-100'}
                                                                        `}></div>
														<div className={`
                                                                            absolute left-[2px] top-[2px] bg-white w-[16px] h-[16px] rounded-full transition-all duration-300 ease-in-out shadow-sm origin-center flex items-center justify-center
                                                                            ${dontShowAgain ? 'translate-x-[20px] scale-110' : 'translate-x-0'}
                                                                        `}>
															<Check size={10} className={`text-indigo-600 ${dontShowAgain ? 'opacity-100' : 'opacity-0'} transition-opacity`} strokeWidth={4} />
														</div>
													</div>
													<span className="text-[13px] font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
														Don't show this again
													</span>
												</label>
											</div>

											{/* MD3 Filled Button */}
											<button
												type="button"
												onClick={handleCloseWelcome}
												className="group relative w-full py-4 rounded-full font-bold text-white shadow-md hover:shadow-lg overflow-hidden bg-slate-900 active:scale-[0.98] transition-all duration-300"
											>
												{/* Shine */}
												<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />

												<div className="relative z-10 flex items-center justify-center gap-2">
													<span className="text-[15px] tracking-wide">Enter Dashboard</span>
													<ArrowRight size={18} className="group-hover:translate-x-1 transition-transform text-indigo-200/80" />
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