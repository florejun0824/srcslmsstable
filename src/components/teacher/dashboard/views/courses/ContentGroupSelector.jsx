// src/components/teacher/dashboard/views/courses/ContentGroupSelector.jsx
import React, { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { UsersIcon as LearnerIcon, AcademicCapIcon as TeacherIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { MATERIAL_STYLES, getSchoolLogo } from './coursesStyles';

const ContentGroupSelector = memo((props) => {
    const { userProfile, setActiveSubject, handleBackToCategoryList } = props;
    
    useEffect(() => { 
        if (setActiveSubject) setActiveSubject(null); 
        if (handleBackToCategoryList) handleBackToCategoryList(); 
    }, [setActiveSubject, handleBackToCategoryList]);

    const schoolLogoUrl = userProfile?.schoolId ? getSchoolLogo(userProfile.schoolId) : '/logo.png';
    const firstName = userProfile?.firstName || 'Back';

    const SelectionCard = ({ to, title, subtitle, auraColor, icon: Icon, secondaryColor }) => {
        const x = useMotionValue(0);
        const y = useMotionValue(0);
        const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 150, damping: 20 });
        const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 150, damping: 20 });

        function handleMouse(event) {
            const rect = event.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            x.set(event.clientX - centerX);
            y.set(event.clientY - centerY);
        }

        function handleMouseLeave() {
            x.set(0);
            y.set(0);
        }

        return (
            <motion.div
                style={{ rotateX, rotateY, perspective: 1000 }}
                onMouseMove={handleMouse}
                onMouseLeave={handleMouseLeave}
                className="relative group h-[300px] md:h-[400px]"
            >
                <Link 
                    to={to} 
                    className={`relative block w-full h-full p-8 md:p-12 overflow-hidden rounded-[40px] border border-white/20 shadow-2xl transition-all duration-500 bg-gradient-to-br ${secondaryColor}`}
                >
                    {/* Glass Overlay (The Gleam) */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] opacity-50 pointer-events-none" />
                    
                    {/* Animated Aura */}
                    <motion.div
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3],
                            rotate: [0, 90, 0]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className={`absolute -right-24 -top-24 w-96 h-96 rounded-full blur-[100px] pointer-events-none ${auraColor} mix-blend-screen opacity-40`}
                    />
                    
                    {/* Floating Proxy Icon */}
                    <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:opacity-30 transition-all duration-700 pointer-events-none group-hover:scale-110 group-hover:-rotate-12">
                        <Icon className="w-48 h-48 md:w-64 md:h-64 text-white" />
                    </div>

                    {/* Content Layer */}
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            {/* Role Badge */}
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/20 backdrop-blur-xl border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-white mb-6"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                {title} Portal
                            </motion.div>

                            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl leading-[0.9]">
                                {title}
                            </h2>
                            <p className="text-sm md:text-lg font-medium text-white/80 max-w-[300px] leading-tight mb-8">
                                {subtitle}
                            </p>
                        </div>

                        {/* CTA Portal Button */}
                        <div className="flex items-center">
                            <div className="group/btn relative px-10 py-5 rounded-2xl bg-white text-slate-950 font-black text-xs md:text-sm uppercase tracking-widest overflow-hidden transition-all duration-500 hover:scale-105 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]">
                                <span className="relative z-10 flex items-center gap-3">
                                    Join Session
                                    <svg className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>
        );
    };

    return (
        <div className={`min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center p-4 md:p-6 ${MATERIAL_STYLES.bgScaffold} relative overflow-hidden bg-gradient-to-br from-slate-50 to-zinc-100/50 dark:from-slate-950 dark:to-slate-900 border-none sm:border-solid`}>
            {/* Ambient background glow */}
            <div className="absolute top-[10%] left-[15%] w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '4s' }}></div>
            <div className="absolute bottom-[10%] right-[15%] w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>

            <div className="mb-8 md:mb-12 text-center animate-spring-up relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 md:w-24 md:h-24 mb-5 md:mb-6 rounded-[28px] md:rounded-[32px] bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center p-2 border border-white/50 dark:border-white/20 hover:scale-105 hover:rotate-3 transition-transform duration-500">
                    <img src={schoolLogoUrl} alt="Logo" className="w-full h-full object-contain rounded-[20px] md:rounded-[24px]" />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight mb-3 md:mb-4 px-4 drop-shadow-sm">
                    Welcome {firstName}
                </h1>
                <p className="text-base md:text-xl text-slate-500 dark:text-slate-400 font-medium tracking-wide">Choose your workspace to begin</p>
            </div>
            
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 animate-spring-up relative z-10 px-2 sm:px-0" style={{ animationDelay: '0.1s' }}>
                <SelectionCard
                    to="learner"
                    title="Learner"
                    subtitle="Access your assignments, modules, and student resources."
                    auraColor="bg-emerald-500/30"
                    secondaryColor="from-emerald-500 to-teal-600"
                    icon={LearnerIcon}
                />
                <SelectionCard
                    to="teacher"
                    title="Teacher"
                    subtitle="Manage curriculum, grading tools, and student tracking."
                    auraColor="bg-indigo-500/30"
                    secondaryColor="from-indigo-600 to-blue-700"
                    icon={TeacherIcon}
                />
            </div>
        </div>
    );
});

export default ContentGroupSelector;
