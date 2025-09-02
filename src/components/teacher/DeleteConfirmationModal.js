import React, { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { Button } from '@tremor/react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, deletingItemType }) {
    const [confirmationText, setConfirmationText] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    // This function now handles the async operation and state changes internally
    const handleConfirmClick = async () => {
        // The button's disabled state ensures this function only runs when text is correct
        setIsConfirming(true);
        try {
            // onConfirm is now called without arguments
            await onConfirm();
        } catch (error) {
            console.error("Confirmation failed:", error);
        }
        // The parent component will close the modal, which will trigger handleClose
        // But we reset isConfirming state here.
        setIsConfirming(false);
    };

    // Resets internal state when the modal is closed
    const handleClose = () => {
        setConfirmationText('');
        setIsConfirming(false);
        onClose();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && confirmationText === 'srcsadmin') {
            e.preventDefault();
            handleConfirmClick();
        }
    };

    return (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-[120]">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                <DialogPanel className="w-full max-w-sm rounded-2xl bg-zinc-50/95 p-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                        <ShieldExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Confirm Deletion
                    </h2>
                    
                    <p className="text-sm text-zinc-600 mb-6">
                        To permanently delete this {deletingItemType || 'item'}, please type{' '}
                        <strong className="font-semibold text-red-600">srcsadmin</strong>{' '}
                        in the box below.
                    </p>
                    
                    <input
                        type="text"
                        placeholder="srcsadmin"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="form-input-ios w-full text-center"
                        autoCapitalize="none"
                        autoCorrect="off"
                    />

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button
                            variant="light"
                            onClick={handleClose}
                            className="btn-secondary-ios"
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            onClick={handleConfirmClick}
                            loading={isConfirming}
                            disabled={confirmationText !== 'srcsadmin' || isConfirming}
                            className="btn-primary-ios bg-red-500 hover:bg-red-600"
                        >
                            {isConfirming ? 'Deleting...' : 'Confirm Delete'}
                        </Button>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}