import React, { useState } from 'react';
import Modal from '../common/Modal';

const EditPasswordModal = ({ user, onSubmit, onClose }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(password);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Change Password for ${user.email}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="New Password" 
                    required 
                    className="w-full p-2 border rounded" 
                />
                <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Update Password</button>
            </form>
        </Modal>
    );
};

export default EditPasswordModal;