// src/components/LandingPage.jsx
import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  PresentationChartLineIcon, 
  SparklesIcon, 
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  BoltIcon,
  ArrowRightIcon,
  CpuChipIcon,
  GlobeAltIcon
} from '@heroicons/react/24/solid';

// --- SUB-COMPONENTS ---

const FeatureCard = ({ icon: Icon, title, desc, fromColor, toColor, delay }) => {
  return (
    <div 
      className="group relative h-full min-h-[220px] rounded-[2rem] transition-all duration-500 hover:-translate-y-2"
      style={{ animationDelay: delay }}
    >
      {/* Dynamic Border Gradient */}
      <div className={`absolute -inset-[1px] bg-gradient-to-b ${fromColor} ${toColor} rounded-[2rem] opacity-20 group-hover:opacity-100 blur-sm transition-opacity duration-500 will-change-transform`} />
      
      {/* Glass Container */}
      <div className="relative h-full bg-[#0B1121]/70 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 flex flex-col items-start overflow-hidden hover:bg-[#0B1121]/80 transition-colors">
        
        {/* Ambient Light Leak */}
        <div className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${fromColor} ${toColor} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />

        {/* Gemstone Icon */}
        <div className="relative w-14 h-14 mb-6 group-hover:scale-110 transition-transform duration-500 ease-out">
           <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${fromColor} ${toColor} blur-md opacity-40`} />
           <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-inner">
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent opacity-50 rounded-t-xl" />
              <Icon className={`w-7 h-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] relative z-10`} />
           </div>
        </div>

        {/* Text Content */}
        <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-200 transition-all">
            {title}
        </h3>
        <p className="text-sm text-slate-400 font-medium leading-relaxed group-hover:text-slate-200 transition-colors">
            {desc}
        </p>
      </div>
    </div>
  );
};

const StatBadge = ({ number, label }) => (
    <div className="flex flex-col">
        <span className="text-3xl font-black text-white tracking-tighter drop-shadow-md">{number}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200/60 mt-1">{label}</span>
    </div>
);

// --- MAIN COMPONENT ---

const LandingPage = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);
  
  const scrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLaunch = (e) => {
    e.preventDefault();
    setIsLaunching(true);
    setTimeout(() => {
        navigate('/login');
    }, 2000); 
  };

  if (userProfile) {
    return <Navigate to={userProfile.role === 'student' ? "/student" : "/dashboard"} replace />;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      
      {/* --- CONNECTING TRANSITION SCREEN --- */}
      {isLaunching && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#020617] to-[#020617]"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 mb-8 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
                    <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-indigo-500 border-b-transparent border-l-indigo-500 animate-spin-reverse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain animate-pulse" />
                    </div>
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Connecting...</h2>
                <p className="text-blue-400 text-sm font-bold uppercase tracking-widest animate-pulse">Establishing Secure Uplink</p>
                
                <div className="w-64 h-1 bg-white/10 rounded-full mt-10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite]"></div>
                </div>
            </div>
            
            <style>{`
                @keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
                .animate-spin-reverse { animation: spin-reverse 2s linear infinite; }
            `}</style>
        </div>
      )}

      {/* --- MAIN LAYOUT --- */}
      <div className={`transition-opacity duration-700 ${isLaunching ? 'opacity-0' : 'opacity-100'}`}>

          {/* --- GLOBAL BACKGROUND (Visible to Both Panes) --- */}
          <div 
            className="fixed inset-0 z-0"
            style={{
              backgroundImage: "url('/srcs.jpg')", 
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="absolute inset-0 bg-[#020617]/50 backdrop-blur-[2px]"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-[#020617]/60 to-blue-900/10"></div>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
            
            {/* --- LEFT WING (Fixed & Top Aligned) --- */}
            <div className="
                lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:w-[45%] lg:z-20
                flex flex-col justify-start p-8 lg:p-16 
                border-r border-white/10 bg-[#020617]/40 backdrop-blur-xl shadow-2xl
            ">
                
                {/* 1. Header */}
                <div className="flex items-center gap-4 mb-16">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-lg">
                        <img src="/logo.png" alt="SRCS Logo" className="w-7 h-7 object-contain drop-shadow-md" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-none tracking-tight">SRCS</h1>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Digital Ecosystem</span>
                    </div>
                </div>

                {/* 2. Main Content (Top Aligned) */}
                <div className="flex flex-col items-start gap-8">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        System Online v2.0
                    </div>
                    
                    <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.95] drop-shadow-2xl">
                        Education <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                            Reimagined.
                        </span>
                    </h2>
                    
                    <p className="text-lg text-blue-100/90 font-medium max-w-md leading-relaxed drop-shadow-md">
                        Welcome to the future of learning. Experience AI-driven automation, gamified progress, and seamless connectivity.
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
                        <button 
                            onClick={handleLaunch}
                            className="group relative px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <span className="relative z-10 flex items-center gap-2">
                                Launch Portal <ArrowRightIcon className="w-4 h-4" />
                            </span>
                        </button>
                        
                        <button 
                            onClick={scrollToExplore}
                            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                        >
                            <GlobeAltIcon className="w-4 h-4 text-blue-300" /> Explore
                        </button>
                    </div>
                </div>

                {/* 3. Footer (Updated with Routing) */}
                <div className="mt-auto pt-12 border-t border-white/10 w-full">
                    <div className="flex gap-12 mb-8">
                        <StatBadge number="24/7" label="Access" />
                        <StatBadge number="100%" label="Uptime" />
                        <StatBadge number="AI" label="Powered" />
                    </div>
                    <div className="flex gap-6 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        <Link to="/privacy" className="hover:text-white hover:underline hover:decoration-dotted transition-all">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-white hover:underline hover:decoration-dotted transition-all">Terms of Service</Link>
                        <span className="ml-auto opacity-70">© 2026 SRCS Digital</span>
                    </div>
                </div>
            </div>

            {/* --- RIGHT WING (Scrollable) --- */}
            <div className="lg:w-[55%] lg:ml-[45%] relative z-10" id="explore">
                <div className="p-6 lg:p-16 space-y-8 pb-32">
                    
                    {/* Section Header */}
                    <div className="flex items-center gap-4 mb-8 opacity-90">
                        <span className="text-xs font-bold uppercase tracking-widest text-white drop-shadow-md">System Capabilities</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-white/30 to-transparent"></div>
                    </div>

                    {/* HERO FEATURE CARD */}
                    <div className="relative rounded-[2.5rem] overflow-hidden min-h-[320px] flex items-end p-10 border border-white/10 bg-[#0B1121]/60 backdrop-blur-md shadow-2xl hover:bg-[#0B1121]/70 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent z-10"></div>
                        
                        <div className="relative z-20 max-w-xl">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)] border border-white/10">
                                <BoltIcon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4 drop-shadow-md">AI Auto-Pilot</h3>
                            <p className="text-lg text-blue-100/90 leading-relaxed font-medium">
                                Generating curriculum materials has never been faster. Our AI engine converts raw topics into formatted Google Slides, quizzes, and lesson plans in seconds.
                            </p>
                        </div>
                    </div>

                    {/* FEATURE GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FeatureCard 
                            icon={PresentationChartLineIcon}
                            title="Smart Slides"
                            desc="Auto-formatted slides with speaker notes generated instantly."
                            fromColor="from-blue-500"
                            toColor="to-cyan-500"
                            delay="0ms"
                        />
                        <FeatureCard 
                            icon={SparklesIcon}
                            title="Gamified Growth"
                            desc="Earn XP, unlock themes, and level up as you complete tasks."
                            fromColor="from-amber-400"
                            toColor="to-orange-600"
                            delay="50ms"
                        />
                        <FeatureCard 
                            icon={ChartBarIcon}
                            title="Deep Analytics"
                            desc="Real-time insight into performance gaps and attendance."
                            fromColor="from-emerald-400"
                            toColor="to-teal-500"
                            delay="100ms"
                        />
                        <FeatureCard 
                            icon={ChatBubbleLeftRightIcon}
                            title="Social Campus"
                            desc="Interactive feeds, class announcements, and reactions."
                            fromColor="from-pink-500"
                            toColor="to-rose-500"
                            delay="150ms"
                        />
                        <FeatureCard 
                            icon={DevicePhoneMobileIcon}
                            title="Offline Ready"
                            desc="Access content anywhere, anytime. Learning never stops."
                            fromColor="from-slate-400"
                            toColor="to-slate-600"
                            delay="200ms"
                        />
                        <FeatureCard 
                            icon={DocumentTextIcon}
                            title="Docu-Vault"
                            desc="Secure storage for all academic resources and files."
                            fromColor="from-violet-500"
                            toColor="to-purple-500"
                            delay="250ms"
                        />
                    </div>

                    {/* CTA Card */}
                    <div className="relative rounded-[2.5rem] bg-gradient-to-br from-blue-900/80 to-indigo-900/80 p-12 text-center overflow-hidden shadow-2xl mt-8 border border-white/10 backdrop-blur-xl">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <CpuChipIcon className="w-16 h-16 text-white/50 mb-6" />
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-6">Ready to upgrade your workflow?</h3>
                            <button 
                                onClick={handleLaunch}
                                className="px-10 py-4 rounded-2xl bg-white text-blue-900 font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                            >
                                Get Started Now
                            </button>
                        </div>
                    </div>

                </div>
            </div>

          </div>
      </div>
    </div>
  );
};

export default LandingPage;