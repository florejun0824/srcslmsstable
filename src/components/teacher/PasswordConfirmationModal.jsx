import React, { useState } from 'react';
import Modal from '../common/Modal'; // Adjust path if your Modal component is elsewhere
import { Button, TextInput } from '@tremor/react';
import { KeyIcon } from '@heroicons/react/24/outline';

const PasswordConfirmationModal = ({ isOpen, onClose, onConfirm, deletingItemType }) => {
    const [password, setPassword] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirm = async () => {
        setIsConfirming(true);
        await onConfirm(password);
        setIsConfirming(false);
        setPassword('');
    };

    // Reset state when modal is closed
    const handleClose = () => {
        setPassword('');
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
                    To permanently delete this {deletingItemType}, please enter your password. This action cannot be undone.
                </p>
                <TextInput
                    icon={KeyIcon}
                    type="password"
                    placeholder="Enter your password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                />
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="light" onClick={handleClose}>Cancel</Button>
                    <Button 
                        color="red" 
                        onClick={handleConfirm}
                        loading={isConfirming}
                        disabled={!password || isConfirming}
                    >
                        Confirm Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PasswordConfirmationModal;