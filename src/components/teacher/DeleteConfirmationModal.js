import React, { useState } from 'react';
import Modal from '../common/Modal'; // Adjust path if your Modal component is elsewhere
import { Button, TextInput } from '@tremor/react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, deletingItemType }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirm = async () => {
        setIsConfirming(true);
        // The onConfirm function will now receive the text, not a password
        await onConfirm(confirmationText);
        setIsConfirming(false);
        setConfirmationText(''); 
    };

    const handleClose = () => {
        setConfirmationText('');
        setIsConfirming(false);
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title={`Confirm Deletion`}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    To permanently delete this {deletingItemType}, please type{' '}
                    <strong className="text-red-600">srcsadmin</strong> in the box below.
                    This action cannot be undone.
                </p>
                <TextInput
                    icon={ShieldExclamationIcon}
                    placeholder="srcsadmin"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                />
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="light" onClick={handleClose}>Cancel</Button>
                    <Button 
                        color="red" 
                        onClick={handleConfirm}
                        loading={isConfirming}
                        // Button is disabled until the user types the exact phrase
                        disabled={confirmationText !== 'srcsadmin' || isConfirming}
                    >
                        Confirm Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default DeleteConfirmationModal;