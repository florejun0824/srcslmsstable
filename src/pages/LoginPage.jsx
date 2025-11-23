// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  AcademicCapIcon,
  BriefcaseIcon,
  AtSymbolIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  FingerPrintIcon,
  SparklesIcon
} from '@heroicons/react/24/solid';
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

// --- AESTHETIC COMPONENTS ---

const MeshGradientBackground = ({ role }) => {
  // Dynamic colors based on role
  const primary = role === 'student' ? 'bg-blue-600' : 'bg-teal-600';
  const secondary = role === 'student' ? 'bg-purple-600' : 'bg-emerald-600';
  const tertiary = role === 'student' ? 'bg-indigo-400' : 'bg-cyan-400';

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#f2f2f7] dark:bg-[#000000] transition-colors duration-700">
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] z-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
      
      {/* Floating Orbs */}
      <div className={`absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full ${primary} mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob`}></div>
      <div className={`absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full ${secondary} mix-blend-multiply dark:mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-2000`}></div>
      <div className={`absolute top-[20%] left-[20%] w-[600px] h-[600px] rounded-full ${tertiary} mix-blend-multiply dark:mix-blend-screen filter blur-[100px] opacity-30 animate-blob animation-delay-4000`}></div>
    </div>
  );
};

const GlassInput = ({ icon: Icon, isPassword, togglePassword, showPassword, ...props }) => (
  <div className="relative group">
    <div className="absolute inset-0 bg-white/40 dark:bg-white/5 rounded-2xl border border-white/50 dark:border-white/10 shadow-sm transition-all duration-300 group-focus-within:ring-2 group-focus-within:ring-[#007AFF]/50 group-focus-within:border-[#007AFF] group-focus-within:bg-white/60 dark:group-focus-within:bg-white/10 group-hover:border-white/80 dark:group-hover:border-white/20"></div>
    
    <div className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400 dark:text-gray-500 transition-colors duration-300 group-focus-within:text-[#007AFF] group-focus-within:scale-110 transform">
      <Icon className="w-5 h-5" />
    </div>
    
    <input
      {...props}
      type={isPassword && !showPassword ? 'password' : 'text'}
      className="relative w-full h-[52px] pl-12 pr-12 bg-transparent border-none rounded-2xl text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0 transition-all"
    />
    
    {isPassword && (
      <button
        type="button"
        onClick={togglePassword}
        className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
      >
        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    )}
  </div>
);

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  // ... (Biometric Effect & Handlers kept identical to maintain logic) ...
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (!isAvailable) return;
        const { value } = await Preferences.get({ key: 'userCredentials' });
        if (value) setShowBiometricButton(true);
      } catch (error) {
        console.error('Error checking biometric support:', error);
      }
    };
    checkBiometricSupport();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const fullEmail = `${email}@srcs.edu`;
      await login(fullEmail, password, selectedRole);
      // Temp credential logic
      try {
        const { isAvailable } = await BiometricAuth.checkBiometry();
        if (isAvailable) {
            const { value } = await Preferences.get({ key: 'userCredentials' });
            if (!value) {
                const credentials = JSON.stringify({ email: fullEmail, password, role: selectedRole });
                await Preferences.set({ key: 'tempUserCredentials', value: credentials });
            }
        }
      } catch (e) { console.error(e); }

    } catch (err) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await BiometricAuth.authenticate({ reason: "Please authenticate", title: "SRCS Login" });
      const { value } = await Preferences.get({ key: 'userCredentials' });
      if (!value) throw new Error("No stored credentials.");
      const { email, password, role } = JSON.parse(value);
      setSelectedRole(role);
      await login(email, password, role);
    } catch (error) {
      if (error.code === BiometryErrorType.NoEnrollment) {
          setError("No biometrics enrolled.");
          setShowBiometricButton(false);
      } else {
          setError(error.message || "Authentication failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#007AFF] selection:text-white">
      <MeshGradientBackground role={selectedRole} />

      {/* --- MAIN CARD CONTAINER --- */}
      <div className="relative z-20 w-full max-w-[400px] perspective-1000 animate-fade-in-up">
        
        {/* Frosted Glass Card */}
        <div className="
          relative overflow-hidden
          bg-white/60 dark:bg-[#1c1c1e]/60 
          backdrop-blur-[40px] backdrop-saturate-150
          rounded-[40px] 
          border border-white/40 dark:border-white/10
          shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.2)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]
          p-8 sm:p-10
          transition-all duration-500
        ">
            
            {/* Logo Area with Glow */}
            <div className="flex flex-col items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 blur-[40px] opacity-20 dark:opacity-30 rounded-full"></div>
                <div className="relative w-24 h-24 rounded-[28px] bg-white/80 dark:bg-white/10 shadow-2xl border border-white/50 dark:border-white/10 flex items-center justify-center p-4 backdrop-blur-sm">
                    <img
                        src="https://i.ibb.co/XfJ8scGX/1.png"
                        alt="SRCS Logo"
                        className="w-full h-full object-contain drop-shadow-md transform hover:scale-105 transition-transform duration-300"
                    />
                </div>
                <div className="mt-6 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white drop-shadow-sm">
                      Welcome Back
                    </h1>
                    <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
                      SRCS Learning Portal <SparklesIcon className="w-4 h-4 text-yellow-500 animate-pulse" />
                    </p>
                </div>
            </div>

            {/* Segmented Control */}
            <div className="mb-8 p-1.5 bg-gray-100/80 dark:bg-black/30 border border-white/20 dark:border-white/5 rounded-[20px] flex items-center relative backdrop-blur-md shadow-inner">
                {/* Sliding Indicator */}
                <div 
                    className={`absolute top-1.5 bottom-1.5 rounded-[16px] bg-white dark:bg-[#636366] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/5 dark:border-white/10 transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) w-[calc(50%-6px)] ${selectedRole === 'student' ? 'left-1.5' : 'left-[calc(50%)]'}`} 
                />
                
                <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`relative flex-1 py-2.5 text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors duration-300 z-10 rounded-[16px] ${selectedRole === 'student' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    <AcademicCapIcon className={`w-4 h-4 transition-transform duration-300 ${selectedRole === 'student' ? 'scale-110 text-blue-500' : ''}`} />
                    Student
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedRole('teacher')}
                    className={`relative flex-1 py-2.5 text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors duration-300 z-10 rounded-[16px] ${selectedRole === 'teacher' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    <BriefcaseIcon className={`w-4 h-4 transition-transform duration-300 ${selectedRole === 'teacher' ? 'scale-110 text-teal-500' : ''}`} />
                    Teacher
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <GlassInput 
                    icon={AtSymbolIcon}
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <GlassInput 
                    icon={LockClosedIcon}
                    isPassword={true}
                    showPassword={showPassword}
                    togglePassword={() => setShowPassword(!showPassword)}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {error && (
                    <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20 rounded-2xl p-3 text-center animate-pulse">
                        <p className="text-[13px] font-semibold text-red-600 dark:text-red-300">{error}</p>
                    </div>
                )}

                {/* Primary Button - Glossy Style */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="
                        group relative w-full h-[52px] mt-2 rounded-2xl overflow-hidden 
                        bg-[#007AFF] hover:bg-[#0062CC] 
                        active:scale-[0.97] transition-all duration-300
                        shadow-[0_8px_20px_-6px_rgba(0,122,255,0.4)] hover:shadow-[0_12px_25px_-8px_rgba(0,122,255,0.5)]
                        disabled:opacity-70 disabled:shadow-none disabled:cursor-not-allowed
                    "
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-100 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-100 pointer-events-none"></div>
                    
                    <span className="relative z-10 text-[16px] font-bold text-white flex items-center justify-center gap-2">
                        {isLoading && !showBiometricButton ? (
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Sign In'}
                    </span>
                </button>
            </form>

            {/* Biometric Option */}
            {showBiometricButton && (
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/10">
                    <button
                        type="button"
                        onClick={handleBiometricLogin}
                        disabled={isLoading}
                        className="
                            w-full h-[52px] rounded-2xl font-semibold text-[15px]
                            flex items-center justify-center gap-3
                            text-gray-700 dark:text-white bg-white/50 dark:bg-white/5
                            border border-white/60 dark:border-white/10 
                            shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-none
                            hover:bg-white/80 dark:hover:bg-white/10 hover:border-white/80
                            active:scale-[0.98] transition-all duration-300
                            backdrop-blur-md
                        "
                    >
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-full text-[#007AFF] dark:text-blue-400">
                            <FingerPrintIcon className="w-5 h-5" />
                        </div>
                        <span>Login with Face ID / Touch ID</span>
                    </button>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
            <p className="text-[13px] font-medium text-gray-500/80 dark:text-white/30">
                &copy; 2025 SRCS Learning Portal
            </p>
        </div>
      </div>
      
      {/* Animations for Blob Movements */}
      <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 10s infinite cubic-bezier(0.44, 0, 0.56, 1);
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
      `}</style>
    </div>
  );
};

export default LoginPage;