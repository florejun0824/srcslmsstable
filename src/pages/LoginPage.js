import React, { useState, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft } from 'lucide-react';

// --- Lazy-loaded RoleCard Component ---
const RoleCard = React.lazy(() => import('./RoleCard')); // Assuming RoleCard is in a separate file

// --- Main Login Page Component ---
const LoginPage = () => {
    const [step, setStep] = useState('roleSelection'); // 'roleSelection' or 'loginForm'
    const [selectedRole, setSelectedRole] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();

    const handleRoleSelect = (role) => {
        setSelectedRole(role);
        setStep('loginForm');
    };

    const handleBack = () => {
        setStep('roleSelection');
        setSelectedRole(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100 text-gray-800 flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-6xl mx-auto">
                {step === 'roleSelection' && (
                    <Suspense fallback={<div>Loading roles...</div>}>
                        <RoleSelection onSelect={handleRoleSelect} />
                    </Suspense>
                )}
                {step === 'loginForm' && (
                    <LoginForm
                        role={selectedRole}
                        onBack={handleBack}
                        login={login}
                        showToast={showToast}
                        isLoading={isLoading}
                        setIsLoading={setIsLoading}
                    />
                )}
            </div>
            <p className="text-sm text-gray-500 mt-8">SRCS Learning Portal &copy; 2025</p>
        </div>
    );
};


// --- Role Selection Screen Component ---
const RoleSelection = ({ onSelect }) => {
    return (
        <div className="text-center">
            <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-white shadow-lg" />

            {/* --- UPDATED HEADING STYLE FOR BETTER VISIBILITY --- */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Your Learning Adventure Awaits
            </h1>

            <p className="text-lg text-gray-600 mb-12">Who are you logging in as today?</p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
                <RoleCard
                    role="student"
                    title="I'm a Student"
                    imgSrc="https://i.ibb.co/5WbmXSq6/Google-Gemini-2.webp" // Using WebP format
                    onSelect={onSelect}
                />
                <RoleCard
                    role="teacher"
                    title="I'm a Teacher"
                    imgSrc="https://i.ibb.co/5g3m8Ckg/Google-Gemini.webp" // Using WebP format
                    onSelect={onSelect}
                />
            </div>
        </div>
    );
};


// --- Reusable Role Card Component ---
// This should be in a separate file, e.g., RoleCard.js
/*
import React from 'react';

const RoleCard = ({ role, title, imgSrc, onSelect }) => {
    return (
        <div
            className="group cursor-pointer flex flex-col items-center gap-4 transition-transform duration-300 hover:scale-105"
            onClick={() => onSelect(role)}
        >
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white group-hover:border-blue-300 transition-all duration-300 shadow-2xl">
                <img
                    className="w-full h-full object-cover"
                    src={imgSrc}
                    alt={`${title} character`}
                    loading="lazy" // Lazy loading attribute
                />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 group-hover:text-black transition-colors duration-300">{title}</h2>
        </div>
    );
};

export default RoleCard;
*/


// --- Login Form Component ---
const LoginForm = ({ role, onBack, login, showToast, isLoading, setIsLoading }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(`${email}@srcs.edu`, password, role);
        } catch (err) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const roleTitle = role === 'student' ? 'Student Portal' : 'Teacher Portal';
    const accentColor = role === 'student' ? 'from-blue-500 to-purple-600' : 'from-green-500 to-teal-600';

    return (
        <div className="w-full max-w-md mx-auto bg-white bg-opacity-60 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-black mb-6 transition-colors">
                <ArrowLeft size={20} className="mr-2" />
                Back to Role Selection
            </button>

            <h2 className={`text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r ${accentColor}`}>
                {roleTitle}
            </h2>
            <p className="text-center text-gray-600 mb-8">Welcome! Please sign in to continue.</p>

            {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm text-center">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">Username</label>
                    <div className="flex items-center bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-400 transition-all">
                        <input
                            className="appearance-none bg-transparent w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none"
                            id="username"
                            type="text"
                            placeholder="e.g., srcslearn01"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <span className="bg-gray-100 p-3 text-gray-500 rounded-r-lg border-l border-gray-300">@srcs.edu</span>
                    </div>
                </div>
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
                    <input
                        className="shadow-sm appearance-none bg-white border border-gray-300 rounded-lg w-full py-3 px-4 text-gray-800 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button
                    className={`w-full bg-gradient-to-r ${accentColor} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-opacity duration-300 disabled:opacity-50`}
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
