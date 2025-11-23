import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    IconX, 
    IconLock, 
    IconEye, 
    IconEyeOff, 
    IconKey,
    IconLoader,
    IconShieldLock,
    IconCheck
} from '@tabler/icons-react';

// --- MACOS 26 DESIGN SYSTEM CONSTANTS ---

const headingStyle = "font-display font-bold tracking-tight text-slate-800 dark:text-white";
const subHeadingStyle = "font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase text-[0.65rem] letter-spacing-2";

const windowContainerClasses = "relative w-full max-w-md bg-white/80 dark:bg-[#121212]/80 backdrop-blur-[50px] rounded-[2rem] shadow-2xl shadow-black/20 dark:shadow-black/50 ring-1 ring-white/40 dark:ring-white/5 overflow-hidden flex flex-col";
const glassInput = "w-full bg-slate-50/50 dark:bg-black/20 border border-slate-200/60 dark:border-white/10 rounded-xl px-4 py-3 pl-10 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm hover:bg-white/40 dark:hover:bg-white/5";
const labelStyle = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide ml-1";

// Enhanced Button Styles
const primaryButton = `
    relative font-semibold rounded-full transition-all duration-300 w-full
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 
    px-6 py-3 text-sm text-white 
    bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
    shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_16px_rgba(37,99,235,0.4)]
    border border-blue-400/20
    disabled:opacity-50 disabled:cursor-not-allowed
`;

const secondaryButton = `
    relative font-semibold rounded-full transition-all duration-300 w-full
    flex items-center justify-center gap-2 active:scale-95 tracking-wide shrink-0 select-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50
    px-5 py-2.5 text-sm text-slate-600 dark:text-slate-300 
    hover:bg-slate-100 dark:hover:bg-white/5 
    border border-transparent hover:border-slate-200 dark:hover:border-white/10
`;

const iconButton = `
    relative font-semibold rounded-full transition-all duration-300 
    flex items-center justify-center p-2 text-slate-500 dark:text-slate-400 
    hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent hover:border-white/20
`;

// Helper for Password Fields (Adds show/hide visual toggle)
const PasswordField = ({ id, label, value, onChange, placeholder }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative group">
            <label htmlFor={id} className={labelStyle}>{label}</label>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <IconLock size={18} />
                </div>
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    className={glassInput}
                    placeholder={placeholder}
                    required
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-md"
                >
                    {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
            </div>
        </div>
    );
};

const ChangePasswordModal = ({ isOpen, onClose, onSubmit }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (!isOpen) {
            setNewPassword('');
            setConfirmPassword('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        
        setError('');
        setLoading(true);

        try {
            // Call the parent's logic
            await onSubmit(newPassword);
            
            // Show success state briefly before closing
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1000); 

        } catch (err) {
            console.error(err);
            setError('Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Window */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={windowContainerClasses}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 shadow-inner">
                                    <IconKey size={24} />
                                </div>
                                <div>
                                    <h2 className={headingStyle + " text-lg"}>Change Password</h2>
                                    <p className={subHeadingStyle}>Security Update</p>
                                </div>
                            </div>
                            <button onClick={onClose} className={iconButton}>
                                <IconX size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {success ? (
                                <div className="py-8 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 shadow-sm animate-pulse">
                                        <IconCheck size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Updated!</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                        Your password has been changed successfully.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2"
                                        >
                                            <IconShieldLock size={18} className="shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <div className="space-y-4">
                                        <PasswordField
                                            id="newPassword"
                                            label="New Password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                        />
                                        
                                        <PasswordField
                                            id="confirmPassword"
                                            label="Confirm Password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter to confirm"
                                        />
                                    </div>

                                    <div className="pt-2 flex flex-col gap-3">
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className={primaryButton}
                                        >
                                            {loading ? (
                                                <>
                                                    <IconLoader className="animate-spin" size={18} />
                                                    <span>Updating...</span>
                                                </>
                                            ) : (
                                                <span>Update Password</span>
                                            )}
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            onClick={onClose} 
                                            disabled={loading}
                                            className={secondaryButton}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ChangePasswordModal;