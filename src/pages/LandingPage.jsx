import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  AcademicCapIcon, 
  PresentationChartLineIcon, 
  SparklesIcon, 
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BoltIcon
} from '@heroicons/react/24/solid';

const LandingPage = () => {
  const { userProfile } = useAuth();

  // If user is already logged in, auto-redirect them
  if (userProfile) {
    return <Navigate to={userProfile.role === 'student' ? "/student" : "/dashboard"} replace />;
  }

  return (
    <div className="min-h-screen font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
      
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div 
        className="fixed inset-0 z-0 scale-105" // Slight scale to prevent white edges
        style={{
          backgroundImage: "url('/srcs.jpg')", 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dark Overlay: Stronger gradient to make text pop */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/85 to-slate-900/95 backdrop-blur-[3px]"></div>
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10">
        
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                 <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 rounded-full"></div>
                 <img src="/logo.png" alt="Logo" className="relative w-9 h-9 drop-shadow-md" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                SRCS Digital Ecosystem
              </span>
            </div>
            <Link 
              to="/login"
              className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold hover:bg-white hover:text-slate-900 transition-all duration-300 shadow-lg"
            >
              Sign In
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            Official Learning Portal
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight drop-shadow-2xl">
            Education, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x">
              Reimagined.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Experience the future of learning with SRCS Digital Ecosystem. 
            Featuring AI-powered lesson generation, gamified progress tracking, and automated Google Slides creation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link 
              to="/login"
              className="group relative w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-xl shadow-blue-500/20 hover:scale-[1.02] hover:shadow-blue-500/40 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              <div className="flex items-center justify-center gap-3">
                <AcademicCapIcon className="w-5 h-5" />
                <span>Access Portal</span>
              </div>
            </Link>
            <a 
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors backdrop-blur-md"
            >
              Explore Features
            </a>
          </div>
        </main>

        {/* FEATURE SECTION */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
          
          {/* STUDENTS */}
          <div className="mb-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">For Students</h2>
              <p className="text-slate-400 text-lg">Immersive, engaging, and personalized for every learner.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={SparklesIcon}
                title="Gamified Learning"
                desc="Earn rewards, XP, and badges as you complete lessons. Watch your progress bar grow!"
                color="from-yellow-400 to-orange-500"
                iconColor="text-yellow-400"
              />
              <FeatureCard 
                icon={ShieldCheckIcon}
                title="Interactive Quizzes"
                desc="Experience a smooth, timed quiz interface with built-in anti-cheat protection mechanisms."
                color="from-green-400 to-emerald-600"
                iconColor="text-green-400"
              />
               <FeatureCard 
                icon={ChatBubbleLeftRightIcon}
                title="Social Newsfeed"
                desc="Stay connected with class announcements. React with animated emojis and join the conversation."
                color="from-blue-400 to-indigo-600"
                iconColor="text-blue-400"
              />
              <FeatureCard 
                icon={PaintBrushIcon}
                title="Personalized Themes"
                desc="Make it yours. Choose immersive backgrounds like Christmas, Space, or Cyberpunk."
                color="from-purple-400 to-pink-600"
                iconColor="text-purple-400"
              />
              <FeatureCard 
                icon={DevicePhoneMobileIcon}
                title="Offline-Ready"
                desc="No internet? No problem. Access your education on the go with full offline support."
                color="from-slate-400 to-slate-600"
                iconColor="text-slate-300"
              />
            </div>
          </div>

          {/* TEACHERS */}
          <div>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">For Teachers</h2>
              <p className="text-slate-400 text-lg">Powerful tools to automate your workflow.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* SPOTLIGHT CARD: GOOGLE SLIDES */}
              <div className="col-span-full md:col-span-2 lg:col-span-1 group relative rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 opacity-90 transition-opacity"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                
                <div className="relative h-full p-10 flex flex-col justify-between border border-white/20 rounded-[2rem]">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center mb-6 shadow-inner border border-white/20">
                      <PresentationChartLineIcon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">Automated Slide Generation</h3>
                    <p className="text-blue-100 text-lg leading-relaxed mb-8">
                      Transform your topics into professional Google Slides presentations instantly using our AI engine.
                    </p>
                  </div>
                  
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 w-fit">
                    <BoltIcon className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <span className="font-bold text-white">Powered by AI</span>
                  </div>
                </div>
              </div>

              <FeatureCard 
                icon={DocumentTextIcon}
                title="AI Document Hub"
                desc="Generate comprehensive lessons, quizzes, and handouts in seconds using integrated AI."
                color="from-indigo-400 to-violet-600"
                iconColor="text-indigo-400"
              />
              <FeatureCard 
                icon={ChartBarIcon}
                title="Deep Analytics"
                desc="Monitor student performance with detailed reports and AI-driven insights on learning gaps."
                color="from-emerald-400 to-teal-600"
                iconColor="text-emerald-400"
              />
              <FeatureCard 
                icon={DevicePhoneMobileIcon}
                title="Seamless Exports"
                desc="Turn your lessons into professional PDF or Word documents with a single tap."
                color="from-orange-400 to-red-500"
                iconColor="text-orange-400"
              />
              <FeatureCard 
                icon={AcademicCapIcon}
                title="Class Management"
                desc="Organize units, lessons, and students with an intuitive drag-and-drop interface."
                color="from-cyan-400 to-blue-600"
                iconColor="text-cyan-400"
              />
            </div>
          </div>

        </section>

        {/* Footer */}
        <footer className="py-12 text-center border-t border-white/5 bg-slate-900/80 backdrop-blur-xl">
          <div className="flex justify-center gap-8 mb-6 text-sm font-bold text-slate-400">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            © 2026 SRCS Digital Ecosystem. All rights reserved.
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes shimmer {
            100% { transform: translateX(100%); }
        }
        .animate-shimmer {
            animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

// --- NEW BEAUTIFUL CARD COMPONENT ---
const FeatureCard = ({ icon: Icon, title, desc, color, iconColor }) => (
  <div className="group relative rounded-[24px]">
    {/* 1. Dynamic Glow Effect Behind Card */}
    <div className={`absolute -inset-[1px] bg-gradient-to-br ${color} rounded-[24px] opacity-20 blur-sm group-hover:opacity-100 transition duration-500`}></div>
    
    {/* 2. Glass Container */}
    <div className="relative h-full p-8 rounded-[23px] bg-slate-900/90 backdrop-blur-xl border border-white/10 group-hover:bg-slate-900/95 transition-all duration-300">
      
      {/* 3. Icon Container */}
      <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:scale-110 transition-transform duration-300 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>

      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
        {title}
      </h3>
      
      <p className="text-slate-400 leading-relaxed font-medium group-hover:text-slate-300 transition-colors">
        {desc}
      </p>

      {/* 4. Decorative Top Right Shine */}
      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
         <div className={`w-16 h-16 bg-gradient-to-br ${color} blur-[40px] rounded-full opacity-20`}></div>
      </div>
    </div>
  </div>
);

export default LandingPage;