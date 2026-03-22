// src/components/teacher/dashboard/views/courses/coursesStyles.js

export const GLOBAL_CSS = `
  .courses-system-font { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  .animate-spring-up { animation: springUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  @keyframes springUp { 
      0% { opacity: 0; transform: translateY(30px) scale(0.98); } 
      100% { opacity: 1; transform: translateY(0) scale(1); } 
  }
`;

// Optimized Material You Styles - Updated for premium glassmorphic feel
export const MATERIAL_STYLES = {
    bgScaffold: "courses-system-font bg-white/60 dark:bg-slate-950 m-0 sm:m-4 rounded-[24px] sm:rounded-[32px] border border-zinc-200/50 dark:border-white/10 shadow-xl flex-1 flex flex-col min-h-[calc(100vh-6rem)] relative selection:bg-indigo-200 selection:text-indigo-900 overflow-visible",
    bgSurface: "bg-white dark:bg-slate-900 shadow-sm border border-zinc-200/50 dark:border-white/10 rounded-[24px] sm:rounded-[32px]",
    navPill: "bg-white dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm",
    textOnSurface: "text-zinc-900 dark:text-white tracking-tight",
    textVariant: "text-zinc-500 dark:text-slate-400 font-medium",
    // Enhanced button styles
    btnFilled: "flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold text-xs md:text-sm transition-all duration-300 active:scale-95 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex-shrink-0 relative overflow-hidden",
    btnTonal: "flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-full font-bold text-xs md:text-sm transition-all duration-300 active:scale-95 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-100/50 dark:border-indigo-500/10 flex-shrink-0 backdrop-blur-sm",
    btnIcon: "p-2.5 rounded-full bg-zinc-100/50 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all duration-300 text-zinc-600 dark:text-slate-300 active:scale-95 flex-shrink-0 backdrop-blur-sm shadow-sm hover:shadow",
    searchBar: "w-full pl-10 pr-4 py-2.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-zinc-200/50 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-white/20"
};

export const SCHOOL_BRANDING = {
    'srcs_main': { logo: '/logo.png' },
    'hras_sipalay': { logo: '/logos/hra.png' },
    'kcc_kabankalan': { logo: '/logos/kcc.png' },
    'icad_dancalan': { logo: '/logos/ica.png' },
    'mchs_magballo': { logo: '/logos/mchs.png' },
    'ichs_ilog': { logo: '/logos/ichs.png' }
};

export const getSchoolLogo = (schoolId) => SCHOOL_BRANDING[schoolId]?.logo || '/logo.png';
