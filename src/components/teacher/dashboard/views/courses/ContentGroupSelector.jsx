// src/components/teacher/dashboard/views/courses/ContentGroupSelector.jsx
import React, { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { UsersIcon, AcademicCapIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { getSchoolLogo } from './coursesStyles';

const ContentGroupSelector = memo((props) => {
    const { userProfile, setActiveSubject, handleBackToCategoryList } = props;
    
    useEffect(() => { 
        if (setActiveSubject) setActiveSubject(null); 
        if (handleBackToCategoryList) handleBackToCategoryList(); 
    }, [setActiveSubject, handleBackToCategoryList]);

    const schoolLogoUrl = userProfile?.schoolId ? getSchoolLogo(userProfile.schoolId) : '/logo.png';
    const firstName = userProfile?.firstName || 'Back';

    const PortalCard = ({ to, title, subtitle, icon: Icon, glowColor, delay }) => {
        return (
            <motion.div
                style={{ willChange: "transform, opacity" }} // Hardware acceleration 
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay, type: "spring", stiffness: 200, damping: 20 }}
                className="w-full"
            >
                <Link 
                    to={to} 
                    // Optimized: bg-white/95 on mobile, bg-white/70 + backdrop-blur on desktop. Added inner shadows.
                    className="group relative block w-full h-full min-h-[280px] md:min-h-[340px] rounded-[32px] md:rounded-[40px] overflow-hidden bg-white/95 dark:bg-slate-900/95 md:bg-white/70 md:dark:bg-slate-900/70 md:backdrop-blur-2xl border border-white/80 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-white dark:hover:border-slate-600 transition-all duration-500 hover:-translate-y-2"
                >
                    {/* Ambient Glow Orb Inside Card */}
                    <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${glowColor} blur-[60px] opacity-30 mix-blend-multiply dark:mix-blend-screen transition-all duration-700 md:group-hover:scale-125 group-hover:opacity-60 pointer-events-none`} />

                    <div className="relative z-10 p-6 md:p-10 h-full flex flex-col justify-between">
                        {/* Top Section: Icon & Action Button */}
                        <div className="flex justify-between items-start">
                            {/* Optimized inner icon container */}
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] md:rounded-[24px] bg-white dark:bg-slate-800 md:bg-white/80 md:dark:bg-slate-800/80 md:backdrop-blur-md flex items-center justify-center shadow-inner border border-white/60 dark:border-slate-700 text-slate-800 dark:text-slate-200 group-hover:scale-110 transition-transform duration-500">
                                <Icon className="w-8 h-8 md:w-10 md:h-10 text-slate-700 dark:text-slate-200" />
                            </div>
                            
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-100 dark:bg-slate-800 md:bg-slate-100/80 md:dark:bg-slate-800/80 md:backdrop-blur-sm flex items-center justify-center border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-700 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-slate-900 transition-all duration-500 shadow-sm">
                                <ArrowRightIcon className="w-5 h-5 md:w-6 md:h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                            </div>
                        </div>

                        {/* Bottom Section: Typography */}
                        <div className="mt-8 relative z-10">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2 md:mb-3">
                                {title}
                            </h2>
                            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-[90%]">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                </Link>
            </motion.div>
        );
    };

    return (
        /* Outer wrapper adds padding so the rounded corners of the main container are visible */
        <div className="p-2 sm:p-4 md:p-6 min-h-[calc(100vh-6rem)] flex selection:bg-indigo-500/30">
            
            {/* Main Window Container - Optimized background opacity and blur for mobile vs desktop */}
            <div className="relative w-full flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden bg-slate-50/95 dark:bg-slate-950/95 md:bg-slate-50/80 md:dark:bg-slate-950/80 md:backdrop-blur-3xl font-sans rounded-[32px] sm:rounded-[40px] lg:rounded-[48px] shadow-[0_8px_30px_rgb(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-200/50 dark:border-slate-800/50">
                
                {/* Lightweight Aurora Background - Animations disabled on mobile (md:animate-pulse) */}
                <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-400/20 dark:bg-indigo-900/20 blur-[100px] md:animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-400/20 dark:bg-teal-900/20 blur-[120px] md:animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                    <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] rounded-full bg-rose-400/20 dark:bg-rose-900/20 blur-[90px] md:animate-pulse" style={{ animationDuration: '12s', animationDelay: '1s' }} />
                </div>

                <div className="w-full max-w-5xl relative z-10 flex flex-col items-center mt-8 md:mt-0">
                    
                    {/* Header Section */}
                    <motion.div 
                        style={{ willChange: "transform, opacity" }} // Hardware acceleration 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="flex flex-col items-center text-center mb-6 md:mb-16 mt-2 md:mt-0"
                    >
                        {/* Logo Container with inner shadow - Optimized bg for mobile */}
                        <div className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 rounded-[20px] md:rounded-[32px] bg-white dark:bg-slate-900 md:bg-white/80 md:dark:bg-slate-900/80 md:backdrop-blur-md shadow-lg flex items-center justify-center p-2.5 md:p-3 border border-white dark:border-slate-700/50 relative">
                            <div className="absolute inset-0 rounded-[inherit] shadow-inner pointer-events-none" />
                            <img 
                                src={schoolLogoUrl} 
                                alt="School Logo" 
                                className="w-full h-full object-contain drop-shadow-sm rounded-[12px] md:rounded-[20px]" 
                            />
                        </div>
                        
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-teal-500 mb-2 md:mb-3">
                            Choose Your Destination
                        </span>
                        
                        <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-2 md:mb-4 leading-tight px-2">
                            Welcome to the SRCS Digital Ecosystem
                        </h1>
                        
                        <p className="text-xs sm:text-sm md:text-lg text-slate-500 dark:text-slate-400 font-semibold max-w-2xl px-4 md:px-0 leading-snug">
                            Hi {firstName}. Please select your designated portal below to proceed securely.
                        </p>
                    </motion.div>
                    
                    {/* Portal Selection Cards */}
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 px-2 md:px-0">
                        <PortalCard
                            to="learner"
                            title="Learner Space"
                            subtitle="Access your digital assignments, track your progress, and explore your modules."
                            icon={UsersIcon}
                            glowColor="from-teal-400 to-emerald-500"
                            delay={0.1}
                        />
                        <PortalCard
                            to="teacher"
                            title="Teacher Space"
                            subtitle="Manage your curriculum, handle grading tools, and seamlessly track student performance."
                            icon={AcademicCapIcon}
                            glowColor="from-indigo-400 to-blue-500"
                            delay={0.2}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
});

export default ContentGroupSelector;