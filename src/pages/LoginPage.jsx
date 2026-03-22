// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AtSign, Lock, Eye, EyeOff, Fingerprint, ArrowRight } from 'lucide-react';
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

// --- PREMIUM NEUMORPHIC / GLASS INPUT WITH FLOATING LABEL ---
const PremiumInput = ({ icon: Icon, isPassword, togglePassword, showPassword, label, id, ...props }) => (
    <div className="relative group mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none transition-colors duration-300 text-white/40 group-focus-within:text-indigo-400">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>

        {/* The input uses Tailwind's "peer" class so the label can react to its state */}
        <input
            id={id}
            {...props}
            type={isPassword && !showPassword ? 'password' : 'text'}
            // We use placeholder-transparent so the actual placeholder doesn't show, but :placeholder-shown still works for the CSS trick
            placeholder=" "
            className="peer w-full h-[60px] bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl pl-[3.25rem] pr-12 text-[15px] text-white focus:bg-white/[0.06] focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300"
            style={{ fontFamily: FONT }}
        />

        {/* Floating Label */}
        <label
            htmlFor={id}
            className="absolute left-[3.25rem] top-1/2 -translate-y-1/2 text-white/40 text-[15px] pointer-events-none transition-all duration-300
                       peer-focus:-translate-y-[26px] peer-focus:-translate-x-3 peer-focus:text-[11px] peer-focus:font-bold peer-focus:tracking-widest peer-focus:uppercase peer-focus:text-indigo-400
                       peer-[:not(:placeholder-shown)]:-translate-y-[26px] peer-[:not(:placeholder-shown)]:-translate-x-3 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:text-white/70"
        >
            {label}
        </label>

        {isPassword && (
            <button
                type="button"
                onClick={togglePassword}
                className="absolute inset-y-0 right-0 flex items-center pr-5 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
            >
                {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={1.5} /> : <Eye className="w-5 h-5" strokeWidth={1.5} />}
            </button>
        )}
    </div>
);

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [showBiometricButton, setShowBiometricButton] = useState(false);
    const [hasAgreed, setHasAgreed] = useState(true);

    useEffect(() => {
        if (location.state?.formData) {
            const { email, password, hasAgreed } = location.state.formData;
            if (email) setEmail(email);
            if (password) setPassword(password);
            if (hasAgreed !== undefined) setHasAgreed(hasAgreed);
        }
    }, [location.state]);

    useEffect(() => {
        const checkBiometricSupport = async () => {
            try {
                const { isAvailable } = await BiometricAuth.checkBiometry();
                if (!isAvailable) return;
                const { value } = await Preferences.get({ key: 'userCredentials' });
                if (value) setShowBiometricButton(true);
            } catch (error) { console.error('Biometric check failed:', error); }
        };
        checkBiometricSupport();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasAgreed) { showToast("Please accept the terms to continue.", 'error'); return; }
        setError('');
        setIsLoading(true);
        try {
            const fullEmail = `${email}@srcs.edu`;
            await login(fullEmail, password);
            try {
                const { isAvailable } = await BiometricAuth.checkBiometry();
                if (isAvailable) {
                    const { value } = await Preferences.get({ key: 'userCredentials' });
                    if (!value) {
                        const credentials = JSON.stringify({ email: fullEmail, password });
                        await Preferences.set({ key: 'tempUserCredentials', value: credentials });
                    }
                }
            } catch (e) { }
        } catch (err) { setError(err.message); showToast(err.message, 'error'); }
        finally { setIsLoading(false); }
    };

    const handleBiometricLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await BiometricAuth.authenticate({ reason: "Verify identity", title: "Sign In" });
            const { value } = await Preferences.get({ key: 'userCredentials' });
            if (!value) throw new Error("No stored credentials.");
            const { email, password } = JSON.parse(value);
            await login(email, password);
        } catch (error) {
            if (error.code === BiometryErrorType.NoEnrollment) { setError("Biometrics not set up."); setShowBiometricButton(false); }
            else { setError(error.message || "Authentication failed"); }
        } finally { setIsLoading(false); }
    };

    const currentFormData = { email, password, hasAgreed };

    return (
        <div
            className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-[#0B0910]"
            style={{ fontFamily: FONT }}
        >
            {/* --- GLOBAL DARK BACKGROUND & MESH GRADIENTS --- */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 opacity-40 mix-blend-luminosity scale-105"
                    style={{
                        backgroundImage: "url('/srcs.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0B0910]/95 via-[#0B0910]/80 to-[#1A1525]/95 backdrop-blur-sm" />

                {/* Decorative Glowing Orbs */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
            </div>

            {/* --- MAIN GLASS CARD --- */}
            <div className="relative z-20 w-full max-w-[1050px] mx-4 lg:mx-8 flex flex-col lg:flex-row rounded-[2.5rem] lg:rounded-[3rem] border border-white/[0.08] shadow-[0_30px_100px_rgba(0,0,0,0.4)] overflow-hidden bg-white/[0.02] backdrop-blur-3xl">

                {/* LEFT: Branding & Aesthetics (Desktop Only) */}
                <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-14 border-r border-white/[0.08]">

                    {/* Inner subtle gradient map */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-16 shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-lg" />
                        </div>

                        <h1 className="text-[3.5rem] font-[900] tracking-tight text-white leading-[1] mb-6 drop-shadow-md">
                            SRCS<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Digital</span>
                        </h1>
                        <p className="text-[16px] text-white/60 font-medium leading-relaxed max-w-[280px]">
                            Next-generation learning ecosystem. Boundless intelligence, unified precision.
                        </p>
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-wrap gap-3">
                            {['AI-Powered', 'Real-time Analytics', 'Zero-Trust Security'].map(tag => (
                                <span key={tag} className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] font-bold text-white/80 uppercase tracking-widest backdrop-blur-md">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Login Form */}
                <div className="w-full lg:w-[55%] p-8 sm:p-12 lg:p-16 relative">

                    {/* Subtle top glow ring in form area */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    {/* Mobile Logo & Header */}
                    <div className="lg:hidden flex flex-col items-center text-center mb-10 mt-2 relative z-10">
                        <div className="w-20 h-20 rounded-[1.25rem] bg-white/[0.05] border border-white/10 flex items-center justify-center shadow-xl mb-6 backdrop-blur-md relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent" />
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain relative z-10" />
                        </div>
                        <h1 className="text-3xl font-[900] tracking-tight text-white mb-2">
                            SRCS Digital
                        </h1>
                        <p className="text-white/50 font-medium text-[14px]">Access your intelligence hub</p>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block mb-12 relative z-10">
                        <h2 className="text-[32px] font-[800] text-white tracking-tight leading-tight">
                            Sign In
                        </h2>
                        <p className="text-white/50 font-medium text-[15px] mt-2">Access your personalized learning hub</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col relative z-10">
                        <PremiumInput
                            id="email"
                            icon={AtSign}
                            label="Username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <PremiumInput
                            id="password"
                            icon={Lock}
                            label="Password"
                            isPassword={true}
                            showPassword={showPassword}
                            togglePassword={() => setShowPassword(!showPassword)}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* Error */}
                        <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-20 mb-6 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}>
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                                <p className="text-[13px] font-semibold text-red-400">{error}</p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-[60px] mt-2 rounded-2xl font-bold text-white text-[16px] tracking-wide bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)]"
                        >
                            {/* Inner shine effect */}
                            <div className="absolute inset-0 w-1/2 translate-x-[-150%] skew-x-[-30deg] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shine_1.5s_ease-in-out]" />

                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <>Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" /></>
                            )}
                        </button>

                        {/* Terms */}
                        <div className="mt-8 text-center">
                            <p className="text-[13px] text-white/40 font-medium">
                                By signing in, you agree to the{' '}
                                <Link to="/terms" state={{ formData: currentFormData }} className="text-white/70 hover:text-white transition-colors font-semibold">Terms</Link>
                                {' '}&{' '}
                                <Link to="/privacy" state={{ formData: currentFormData }} className="text-white/70 hover:text-white transition-colors font-semibold">Privacy</Link>
                            </p>
                        </div>
                    </form>

                    {/* Biometric Spacer / Divider */}
                    {showBiometricButton && (
                        <div className="mt-8 pt-8 relative">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <div className="flex justify-center relative z-10">
                                <button
                                    onClick={handleBiometricLogin}
                                    className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-300 group shadow-[0_0_20px_rgba(255,255,255,0.02)] active:scale-95"
                                >
                                    <Fingerprint className="w-5 h-5 text-indigo-400 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-300" />
                                    <span className="text-[14px] font-bold text-white/90">Use Biometrics</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Global Keyframes & Custom Autofill Styles to override browser defaults and keep the dark sleek look */}
            <style>{`
                @keyframes shine {
                    0% { transform: translateX(-150%) skewX(-30deg); }
                    100% { transform: translateX(250%) skewX(-30deg); }
                }
                
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px #13111A inset !important;
                    -webkit-text-fill-color: white !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;