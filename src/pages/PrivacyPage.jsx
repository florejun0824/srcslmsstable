// src/pages/PrivacyPage.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PrivacyPolicyContent, { POLICY_VERSION } from '../components/PrivacyPolicyContent';
import { ShieldCheckIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

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
  const previousFormData = location.state?.formData;

  const handleBack = () => {
     navigate('/login', { state: { formData: previousFormData } });
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center font-sans overflow-hidden bg-slate-50 dark:bg-black p-4 sm:p-6">
      <MeshGradientBackground />

      {/* CARD CONTAINER */}
      <div className="relative z-20 w-full max-w-4xl h-[90vh] sm:h-[85vh] animate-in fade-in zoom-in-95 duration-500">
        <div className="
            flex flex-col h-full
            bg-white/70 dark:bg-[#121212]/70
            backdrop-blur-2xl backdrop-saturate-[1.5]
            rounded-[2.5rem] 
            border border-white/60 dark:border-white/10
            shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]
            overflow-hidden
        ">
            
            {/* --- HEADER (Sticky) --- */}
            <div className="flex-none p-6 sm:p-8 border-b border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30">
                        <ShieldCheckIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Privacy & Data Agreement
                        </h1>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                            Version {POLICY_VERSION}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 dark:prose-a:text-blue-400">
                    <PrivacyPolicyContent />
                </div>
            </div>

            {/* --- FOOTER (Sticky) --- */}
            <div className="flex-none p-6 sm:p-8 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
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