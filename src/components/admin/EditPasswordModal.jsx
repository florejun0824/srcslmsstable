// src/components/admin/EditPasswordModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X, Lock, ShieldCheck } from 'lucide-react';

const EditPasswordModal = ({ user, onSubmit, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(password);
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Animations
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 font-sans">
        {/* Backdrop Click */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div 
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative glass-panel bg-white/95 dark:bg-slate-900/95 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-white/40 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200/50 dark:border-white/5">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        Security Update
                    </h2>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Change Password
                    </p>
                </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all active:scale-90"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Enter a new password for <span className="font-bold text-slate-800 dark:text-white">{user.email}</span>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">New Password</label>
                <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-12 py-3.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent outline-none transition-all shadow-inner text-sm font-medium"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!password}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                    Update Password
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default EditPasswordModal;