// src/pages/TermsPage.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

// --- SHARED BACKGROUND ---
const MeshGradientBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden bg-[#f8f9fc] dark:bg-[#050505] transition-colors duration-1000">
    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 bg-teal-400 dark:bg-teal-900 animate-blob"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-30 bg-emerald-400 dark:bg-emerald-900 animate-blob animation-delay-2000"></div>
  </div>
);

const TermsPage = () => {
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
                    <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-sm border border-teal-100 dark:border-teal-900/30">
                        <DocumentTextIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            Terms of Service
                        </h1>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                            Last Updated: January 2026
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-600 dark:prose-p:text-slate-300">
                   <h3>1. Acceptance of Terms</h3>
                   <p>
                     By accessing and using the SRCS Learning Portal ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                   </p>

                   <h3>2. Educational Use Only</h3>
                   <p>
                     This platform is intended solely for educational purposes related to San Ramon Catholic School, Inc. (SRCS). Unauthorized commercial use or distribution of platform content is strictly prohibited.
                   </p>

                   <h3>3. User Accounts & Security</h3>
                   <p>
                     You are responsible for maintaining the confidentiality of your login credentials. You are fully responsible for all activities that occur under your account. You agree to immediately notify SRCS administration of any unauthorized use of your account.
                   </p>

                   <h3>4. User Conduct</h3>
                   <p>
                     You agree not to use the Service to:
                   </p>
                   <ul className="list-disc pl-5 space-y-1">
                     <li>Upload or transmit any content that is unlawful, harmful, threatening, or abusive.</li>
                     <li>Impersonate any person or entity.</li>
                     <li>Submit false or misleading information.</li>
                     <li>Attempt to gain unauthorized access to other user accounts or system data.</li>
                   </ul>

                   <h3>5. Intellectual Property</h3>
                   <p>
                     All learning materials, quizzes, and resources provided on this platform are the property of SRCS or their respective content creators and are protected by applicable copyright laws.
                   </p>

                   <h3>6. Data Privacy</h3>
                   <p>
                     Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the terms of the Privacy Policy.
                   </p>

                   <h3>7. Termination</h3>
                   <p>
                     We reserve the right to terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                   </p>

                   <h3>8. Changes to Terms</h3>
                   <p>
                     We reserve the right, at our sole discretion, to modify or replace these Terms at any time. Continued use of the Service following the posting of any changes constitutes acceptance of those changes.
                   </p>
                </div>
            </div>

            {/* --- FOOTER (Sticky) --- */}
            <div className="flex-none p-6 sm:p-8 border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/5 backdrop-blur-xl z-20">
                <button
                    onClick={handleBack}
                    className="
                        group w-full py-4 rounded-2xl font-bold text-white text-[15px] shadow-lg
                        bg-gradient-to-r from-teal-600 to-emerald-600 
                        hover:shadow-teal-500/25 hover:scale-[1.01] active:scale-[0.98] 
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

export default TermsPage;