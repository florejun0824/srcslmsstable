// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AtSign, Lock, Eye, EyeOff, Fingerprint, ArrowRight, ArrowLeft } from 'lucide-react';
import { BiometricAuth, BiometryErrorType } from '@aparajita/capacitor-biometric-auth';
import { Preferences } from '@capacitor/preferences';

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

// --- LIGHT GLASS INPUT ---
const PremiumInput = ({ icon: Icon, isPassword, togglePassword, showPassword, label, ...props }) => (
    <div className="relative group mb-5">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 ml-1">
            {label}
        </label>
        <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 shadow-sm flex items-center transition-all duration-300 overflow-hidden group-focus-within:bg-white group-focus-within:border-blue-400 group-focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]">
            <div className="pl-4 pr-3 text-slate-400 transition-colors duration-300 group-focus-within:text-blue-500">
                <Icon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <input
                {...props}
                type={isPassword && !showPassword ? 'password' : 'text'}
                className="w-full h-[54px] bg-transparent border-none text-[15px] font-semibold text-slate-900 placeholder-slate-400 focus:ring-0 focus:outline-none pr-4"
                style={{ fontFamily: FONT }}
            />
            {isPassword && (
                <button type="button" onClick={togglePassword} className="pr-4 pl-2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            )}
        </div>
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
            className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center bg-slate-100"
            style={{ fontFamily: FONT }}
        >
            {/* --- GLOBAL CLEAR BACKGROUND --- */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: "url('/srcs.jpg')",
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-white/10" />
            </div>

            {/* --- MAIN GLASS CARD --- */}
            <div className="relative z-20 w-full max-w-[1000px] mx-4 lg:mx-8 flex flex-col lg:flex-row rounded-[2.5rem] border border-white/40 shadow-[0_20px_80px_rgba(0,0,0,0.15)] overflow-hidden">

                {/* LEFT: Transparent Brand Panel (Shows clear background on Desktop) */}
                <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden border-r border-white/30 bg-black/10">
                    {/* Dark gradient at the bottom so the white text stays readable regardless of the background photo */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mb-12 shadow-sm">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
                        </div>
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-[3rem] font-[900] tracking-tight text-white leading-[1.1] mb-4 drop-shadow-md">
                            SRCS<br />
                            <span className="text-blue-300 drop-shadow-sm">Digital</span>
                        </h1>
                        <p className="text-[15px] text-white/90 font-medium leading-relaxed max-w-[280px] drop-shadow">
                            Your unified campus learning experience. AI-powered, real-time, secure.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2.5">
                            {['AI-Powered', 'Real-time', 'Secure'].map(tag => (
                                <span key={tag} className="px-3.5 py-1.5 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold text-white uppercase tracking-widest shadow-sm">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Frosted Light Login Form */}
                <div className="w-full lg:w-[55%] p-8 sm:p-12 lg:p-14 relative bg-white/85 backdrop-blur-2xl">

                    {/* Mobile Logo & Header */}
                    <div className="lg:hidden flex flex-col items-center text-center mb-8 mt-2">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-md mb-5">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <h1 className="text-3xl font-[900] tracking-tight text-slate-900 mb-1">
                            SRCS Digital
                        </h1>
                        <p className="text-slate-500 font-medium text-[13px]">Enter your credentials to continue</p>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:block mb-10">
                        <h2 className="text-[28px] font-[800] text-slate-900 tracking-tight leading-tight">
                            Sign in
                        </h2>
                        <p className="text-slate-500 font-medium text-[14px] mt-1.5">Welcome back to the ecosystem</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <PremiumInput
                            icon={AtSign}
                            label="Username"
                            placeholder="Enter your username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <PremiumInput
                            icon={Lock}
                            label="Password"
                            isPassword={true}
                            showPassword={showPassword}
                            togglePassword={() => setShowPassword(!showPassword)}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* Error */}
                        {error && (
                            <div className="mt-1 mb-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <p className="text-[13px] font-semibold text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-[54px] mt-4 rounded-2xl font-bold text-white text-[15px] tracking-wide bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden shadow-md shadow-blue-600/20"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>

                        {/* Terms */}
                        <div className="mt-6 text-center">
                            <p className="text-[12px] text-slate-500 font-medium">
                                By signing in, you agree to the{' '}
                                <Link to="/terms" state={{ formData: currentFormData }} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-semibold">Terms</Link>
                                {' '}&{' '}
                                <Link to="/privacy" state={{ formData: currentFormData }} className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-semibold">Privacy</Link>
                            </p>
                        </div>
                    </form>

                    {/* Biometric */}
                    {showBiometricButton && (
                        <div className="mt-8 pt-8 border-t border-slate-200 flex justify-center">
                            <button
                                onClick={handleBiometricLogin}
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all duration-300 group shadow-sm active:scale-95"
                            >
                                <Fingerprint className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-all" />
                                <span className="text-[14px] font-bold text-slate-700">Use Biometrics</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Autofill Styles for Light Mode */}
            <style>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px white inset !important;
                    -webkit-text-fill-color: #0f172a !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;