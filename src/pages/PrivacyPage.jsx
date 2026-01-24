// src/pages/PrivacyPage.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PrivacyPolicyContent, { POLICY_VERSION } from '../components/PrivacyPolicyContent';
import { ShieldCheckIcon, ArrowLeftIcon, HomeIcon } from '@heroicons/react/24/solid';

// --- SHARED BACKGROUND (Matching Login) ---
const MeshGradientBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#f8f9fc] dark:bg-[#050505] transition-colors duration-1000">
    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 bg-blue-400 dark:bg-blue-900 animate-blob"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 bg-indigo-400 dark:bg-indigo-900 animate-blob animation-delay-2000"></div>
  </div>
);

const PrivacyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.state?.formData) {
        navigate('/login', { state: { formData: location.state.formData } });
    } else {
        navigate('/login');
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative font-sans bg-slate-50 dark:bg-black">
      
      <MeshGradientBackground />

      <div className="absolute inset-0 flex flex-col p-4 sm:p-6 md:p-8">
        
        {/* CARD CONTAINER */}
        <div className="
            relative flex flex-col w-full max-w-4xl mx-auto h-full
            bg-white/70 dark:bg-[#121212]/70
            backdrop-blur-2xl backdrop-saturate-[1.5]
            rounded-[2.5rem] 
            border border-white/60 dark:border-white/10
            shadow-2xl overflow-hidden
        ">
            
            {/* --- HEADER --- */}
            <div className="flex-none p-6 sm:p-8 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                        <ShieldCheckIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Privacy Policy
                        </h1>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Last Updated: {POLICY_VERSION}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="text-blue-600 dark:text-blue-400">Official</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT (Scrollable) --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="p-6 sm:p-10">
                    <PrivacyPolicyContent />
                </div>
            </div>

            {/* --- FOOTER (Sticky Buttons) --- */}
            <div className="flex-none p-6 sm:p-8 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* BUTTON 1: Back to Main Page (Secondary/Ghost Style) */}
                    <button
                        onClick={handleHome}
                        className="
                            group w-full py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 text-[15px]
                            bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10
                            hover:bg-white dark:hover:bg-white/20 hover:scale-[1.01] active:scale-[0.98]
                            transition-all duration-300 flex items-center justify-center gap-2
                        "
                    >
                        <HomeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span>Main Page</span>
                    </button>

                    {/* BUTTON 2: Back to Login (Primary Gradient Style) */}
                    <button
                        onClick={handleBack}
                        className="
                            group w-full py-4 rounded-2xl font-bold text-white text-[15px] shadow-lg
                            bg-gradient-to-r from-blue-600 to-indigo-600 
                            hover:shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] 
                            transition-all duration-300 overflow-hidden flex items-center justify-center gap-2
                        "
                    >
                        <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
                        <span>Back to Login</span>
                    </button>

                </div>
            </div>

        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 15s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
};

export default PrivacyPage;