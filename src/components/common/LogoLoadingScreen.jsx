import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

// 🏫 SHARED SCHOOL CONFIGURATION
const SCHOOL_BRANDING = {
    'srcs_main': { name: 'SRCS Digital Ecosystem', logo: '/logo.png', color: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/30' },
    'hras_sipalay': { name: 'HRA Digital Academy', logo: '/logos/hra.png', color: 'from-red-500 to-rose-600', shadow: 'shadow-red-500/30' },
    'kcc_kabankalan': { name: 'KCC Cyber Campus', logo: '/logos/kcc.png', color: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/30' },
    'icad_dancalan': { name: 'ICA Learning Nexus', logo: '/logos/ica.png', color: 'from-amber-400 to-yellow-600', shadow: 'shadow-yellow-500/30' },
    'mchs_magballo': { name: 'MCHS Portal', logo: '/logos/mchs.png', color: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/30' },
    'ichs_ilog': { name: 'ICHS Platform', logo: '/logos/ichs.png', color: 'from-orange-500 to-red-500', shadow: 'shadow-orange-500/30' }
};

// Detect Android once
const IS_ANDROID = typeof document !== 'undefined' && document.documentElement.classList.contains('is-android');

const LogoLoadingScreen = ({ message = "Initializing Neural Core..." }) => {
    const { userProfile } = useAuth();
    const [activeBrand, setActiveBrand] = useState(SCHOOL_BRANDING['srcs_main']);

    useEffect(() => {
        if (userProfile?.schoolId && SCHOOL_BRANDING[userProfile.schoolId]) {
            setActiveBrand(SCHOOL_BRANDING[userProfile.schoolId]);
            return;
        }
        const cachedAlias = localStorage.getItem('active_app_alias');
        if (cachedAlias && SCHOOL_BRANDING[cachedAlias]) {
            setActiveBrand(SCHOOL_BRANDING[cachedAlias]);
        }
    }, [userProfile]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#050505] overflow-hidden font-sans">
            
            {/* --- IMMERSIVE MESH GRADIENT BACKGROUND --- */}
            {/* Android: no blur, opacity-only colored divs | Desktop: full blur blobs */}
            <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 mix-blend-screen isolate">
                {IS_ANDROID ? (
                    <>
                        <div className={`absolute -top-[30%] -left-[10%] w-[70vw] h-[70vw] bg-gradient-to-tr ${activeBrand.color} rounded-full opacity-20`} />
                        <div className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] bg-gradient-to-bl from-purple-500 to-pink-500 rounded-full opacity-15" />
                    </>
                ) : (
                    <>
                        <motion.div 
                            animate={{ rotate: 360, scale: [1, 1.2, 1] }} 
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className={`absolute -top-[30%] -left-[10%] w-[70vw] h-[70vw] bg-gradient-to-tr ${activeBrand.color} rounded-full blur-[100px] opacity-30`}
                        />
                        <motion.div 
                            animate={{ rotate: -360, scale: [1, 1.3, 1] }} 
                            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                            className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] bg-gradient-to-bl from-purple-500 to-pink-500 rounded-full blur-[120px] opacity-20"
                        />
                    </>
                )}
            </div>

            {/* --- PREMIUM GLASS RECEPTACLE --- */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10 flex flex-col items-center"
            >
                {/* Logo Orb */}
                <div className="relative group perspective-1000 mb-8">
                    {/* Glowing Aura Ring — Android: no blur-2xl, just opacity */}
                    <div className={`absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr ${activeBrand.color} ${IS_ANDROID ? 'opacity-30' : 'blur-2xl opacity-40 group-hover:opacity-60'} transition-opacity duration-700 animate-pulse`} />
                    
                    {/* The Glass Container — Android: solid bg | Desktop: backdrop-blur */}
                    <motion.div 
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-[2.5rem] border shadow-2xl overflow-hidden flex items-center justify-center p-8 ${
                            IS_ANDROID
                                ? 'bg-white/90 dark:bg-white/15 border-white/60 dark:border-white/10'
                                : 'bg-white/40 dark:bg-white/5 backdrop-blur-2xl border-white/60 dark:border-white/10'
                        }`}
                    >
                        {/* Shimmer Effect — lightweight, keep on all platforms */}
                        <motion.div 
                            animate={{ x: ['-200%', '200%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent -skew-x-12"
                        />
                        
                        <img 
                            src={activeBrand.logo} 
                            alt={`${activeBrand.name} Logo`}
                            className="w-full h-full object-contain relative z-10 drop-shadow-md"
                        />
                    </motion.div>
                </div>

                {/* Typography & Status */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex flex-col items-center"
                >
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-800 dark:text-white mb-3 text-center drop-shadow-sm">
                        {activeBrand.name}
                    </h1>
                    
                    {/* Status pill — Android: solid bg | Desktop: backdrop-blur */}
                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-sm ${
                        IS_ANDROID
                            ? 'bg-white/80 dark:bg-white/10 border-slate-200/50 dark:border-white/5'
                            : 'bg-white/50 dark:bg-white/5 backdrop-blur-md border-slate-200/50 dark:border-white/5'
                    }`}>
                        {/* High-Tech Spinner Sequence */}
                        <div className="flex gap-1 h-3 items-center">
                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} className={`w-1 rounded-full bg-gradient-to-t ${activeBrand.color}`} />
                            <motion.div animate={{ height: [4, 16, 4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className={`w-1 rounded-full bg-gradient-to-t ${activeBrand.color}`} />
                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className={`w-1 rounded-full bg-gradient-to-t ${activeBrand.color}`} />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold tracking-widest uppercase text-slate-600 dark:text-slate-400 mt-0.5">
                            {message}
                        </span>
                    </div>
                </motion.div>
            </motion.div>
            
        </div>
    );
};

export default LogoLoadingScreen;