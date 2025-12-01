import React, { useState, Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext'; // Import Theme Context

// --- MONET EFFECT HELPER (Copied from CreateExamAndTosModal for consistency) ---
const getThemeStyles = (overlay) => {
    switch (overlay) {
        case 'christmas':
            return {
                modalBg: '#0f291e', 
                borderColor: 'rgba(34, 197, 94, 0.3)', 
                innerPanelBg: 'rgba(20, 83, 45, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#e2e8f0',
                accentText: '#86efac', 
            };
        case 'valentines':
            return {
                modalBg: '#2a0a12', 
                borderColor: 'rgba(244, 63, 94, 0.3)', 
                innerPanelBg: 'rgba(80, 7, 36, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#ffe4e6',
                accentText: '#fda4af', 
            };
        case 'graduation':
            return {
                modalBg: '#1a1600', 
                borderColor: 'rgba(234, 179, 8, 0.3)', 
                innerPanelBg: 'rgba(66, 32, 6, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.3)',
                textColor: '#fefce8',
                accentText: '#fde047', 
            };
        case 'rainy':
            return {
                modalBg: '#0f172a', 
                borderColor: 'rgba(56, 189, 248, 0.3)', 
                innerPanelBg: 'rgba(30, 41, 59, 0.5)',
                inputBg: 'rgba(15, 23, 42, 0.5)',
                textColor: '#f1f5f9',
                accentText: '#7dd3fc', 
            };
        case 'cyberpunk':
            return {
                modalBg: '#180a2e', 
                borderColor: 'rgba(217, 70, 239, 0.4)', 
                innerPanelBg: 'rgba(46, 16, 101, 0.4)',
                inputBg: 'rgba(0, 0, 0, 0.4)',
                textColor: '#fae8ff',
                accentText: '#e879f9', 
            };
        case 'spring':
            return {
                modalBg: '#2a1a1f', 
                borderColor: 'rgba(244, 114, 182, 0.3)', 
                innerPanelBg: 'rgba(80, 20, 40, 0.3)',
                inputBg: 'rgba(0, 0, 0, 0.2)',
                textColor: '#fce7f3',
                accentText: '#f9a8d4', 
            };
        case 'space':
            return {
                modalBg: '#0b0f19', 
                borderColor: 'rgba(99, 102, 241, 0.3)', 
                innerPanelBg: 'rgba(17, 24, 39, 0.6)',
                inputBg: 'rgba(0, 0, 0, 0.5)',
                textColor: '#e0e7ff',
                accentText: '#a5b4fc', 
            };
        case 'none':
        default:
            return {
                modalBg: '#262a33', 
                borderColor: 'rgba(255, 255, 255, 0.1)',
                innerPanelBg: '#2b303b', 
                inputBg: '#20242c', 
                textColor: '#f1f5f9',
                accentText: '#cbd5e1', 
            };
    }
};

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, deletingItemType }) {
    const [confirmationText, setConfirmationText] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    
    // --- THEME HOOK ---
    const { activeOverlay } = useTheme(); 
    const themeStyles = getThemeStyles(activeOverlay);

    const handleConfirmClick = async () => {
        if (confirmationText !== 'srcsadmin' || isConfirming) return;
        setIsConfirming(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error("Confirmation failed:", error);
        } finally {
            setIsConfirming(false);
            setConfirmationText(''); 
        }
    };

    const handleClose = () => {
        if (isConfirming) return;
        setConfirmationText('');
        onClose();
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && confirmationText === 'srcsadmin') {
            e.preventDefault();
            handleConfirmClick();
        }
    };

    // --- BUTTON STYLES ---
    const primaryBtn = `
        w-full py-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-red-500/20 
        bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
        border border-red-400/20 active:scale-[0.98] transition-all duration-200
        disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:shadow-none
    `;
    
    // Extruded style for the secondary button (Cancel) to match the other modal
    const secondaryBtnExtruded = `
        w-full py-4 rounded-xl font-bold text-sm 
        shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.02)] 
        hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] 
        active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.02)]
        transition-all duration-150 disabled:opacity-50
    `;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[120]" onClose={handleClose}>
                
                {/* Backdrop - Reduced blur */}
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        
                        {/* Modal Panel */}
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95 translate-y-4"
                            enterTo="opacity-100 scale-100 translate-y-0"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100 translate-y-0"
                            leaveTo="opacity-0 scale-95 translate-y-4"
                        >
                            <DialogPanel 
                                className="w-full max-w-md transform overflow-hidden rounded-[2.5rem] p-8 text-center shadow-2xl transition-all border"
                                style={{ 
                                    backgroundColor: themeStyles.modalBg, 
                                    borderColor: themeStyles.borderColor 
                                }}
                            >
                                
                                {/* Icon with Glow Effect - Keeping Red for Danger Context */}
                                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-900/20 text-red-500">
                                    <div className="absolute inset-0 rounded-full bg-red-500 blur-2xl opacity-20"></div>
                                    <ShieldExclamationIcon className="h-10 w-10 relative z-10" aria-hidden="true" strokeWidth={1.5} />
                                </div>
                                
                                <DialogTitle as="h3" className="text-2xl font-bold tracking-tight mb-2" style={{ color: themeStyles.textColor }}>
                                    Confirm Deletion
                                </DialogTitle>
                                
                                <p className="text-sm font-medium leading-relaxed mb-8 px-4 opacity-80" style={{ color: themeStyles.textColor }}>
                                    You are about to permanently delete this <span className="font-bold" style={{ color: themeStyles.accentText }}>{deletingItemType || 'item'}</span>. 
                                    <br/>
                                    This action <span className="text-red-500 font-bold">cannot be undone</span>.
                                </p>
                                
                                {/* Input Section */}
                                <div className="mb-8 space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: themeStyles.textColor }}>
                                        Admin Authorization
                                    </label>
                                    <input
                                        type="password"
                                        placeholder="Enter Admin Code"
                                        value={confirmationText}
                                        onChange={(e) => setConfirmationText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full px-4 py-4 text-center rounded-xl text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all shadow-inner"
                                        style={{ 
                                            backgroundColor: themeStyles.inputBg, 
                                            color: themeStyles.textColor,
                                            borderColor: 'transparent'
                                        }}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete="off"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleClose}
                                        disabled={isConfirming}
                                        className={secondaryBtnExtruded}
                                        style={{ 
                                            backgroundColor: themeStyles.innerPanelBg, 
                                            color: themeStyles.textColor 
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmClick}
                                        disabled={confirmationText !== 'srcsadmin' || isConfirming}
                                        className={primaryBtn}
                                    >
                                        {isConfirming ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            'Delete Permanently'
                                        )}
                                    </button>
                                </div>

                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}