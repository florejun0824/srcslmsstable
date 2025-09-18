// src/pages/LoginPage.js

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AcademicCapIcon, BriefcaseIcon, AtSymbolIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import RoleDock from '../components/common/RoleDock'; 

const HeliosBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden bg-gray-50">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-purple-100 rounded-full filter blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[20%] left-[15%] w-80 h-80 bg-teal-100 rounded-full filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
    </div>
);


const LoginPage = () => {
    const [selectedRole, setSelectedRole] = useState('student');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const { showToast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(`${email}@srcs.edu`, password, selectedRole);
        } catch (err) {
            setError(err.message);
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const accentColor = selectedRole === 'student' ? 'blue' : 'teal';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <HeliosBackground />
            
            <div className="relative z-10 w-full max-w-sm space-y-6 animate-fade-in-up">
                <div className="text-center">
                    <img src="https://i.ibb.co/XfJ8scGX/1.png" alt="SRCS Logo" className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg" />
                    <h1 className="text-4xl font-bold text-gray-800">
                        Welcome Back
                    </h1>
                    <p className="text-gray-500">Please sign in to continue.</p>
                </div>

                {/* MODIFIED: Changed rounded-5xl to rounded-3xl for a more standard rounded corner. */}
                <div className="bg-white/60 backdrop-blur-3xl p-6 rounded-3xl shadow-2xl border border-white/50 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <RoleDock
                            role="student"
                            title="Student"
                            Icon={AcademicCapIcon}
                            isSelected={selectedRole === 'student'}
                            onSelect={setSelectedRole}
                            accentColor="blue"
                        />
                        <RoleDock
                            role="teacher"
                            title="Teacher"
                            Icon={BriefcaseIcon}
                            isSelected={selectedRole === 'teacher'}
                            onSelect={setSelectedRole}
                            accentColor="teal"
                        />
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4">
                           <div className="relative group">
                                <AtSymbolIcon className={`absolute top-1/2 -translate-y-1/2 left-4 w-5 h-5 text-gray-400 group-focus-within:text-${accentColor}-500 transition-colors duration-300`} />
                                <input
                                    className={`w-full bg-gray-100/70 h-14 pl-12 pr-4 text-gray-800 placeholder:text-gray-500 rounded-2xl
                                                border-2 border-transparent focus:outline-none focus:bg-white focus:border-${accentColor}-300 transition-all duration-300`}
                                    id="username"
                                    type="text"
                                    placeholder="Username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                           </div>
                           <div className="relative group">
                                <LockClosedIcon className={`absolute top-1/2 -translate-y-1/2 left-4 w-5 h-5 text-gray-400 group-focus-within:text-${accentColor}-500 transition-colors duration-300`} />
                                <input
                                    className={`w-full bg-gray-100/70 h-14 pl-12 pr-4 text-gray-800 placeholder:text-gray-500 rounded-2xl
                                                border-2 border-transparent focus:outline-none focus:bg-white focus:border-${accentColor}-300 transition-all duration-300`}
                                    id="password"
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                           </div>
                        </div>
                        
                        {error && <p className="text-red-600 pt-1 text-sm text-center">{error}</p>}

                        <button
                            className={`w-full h-16 bg-gradient-to-br from-${accentColor}-400 to-${accentColor}-500 text-white font-bold text-lg 
                                       rounded-3xl focus:outline-none focus:ring-4 focus:ring-${accentColor}-200 transition-all duration-300 
                                       disabled:opacity-60 active:scale-95 active:shadow-inner-lg shadow-lg shadow-${accentColor}-500/30
                                       hover:shadow-xl hover:shadow-${accentColor}-500/40`}
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
            
            <p className="text-sm text-gray-500/80 mt-8 absolute bottom-5 z-10">SRCS Learning Portal &copy; 2025</p>
        </div>
    );
};

export default LoginPage;