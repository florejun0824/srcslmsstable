// src/components/student/ViewAvatarModal.jsx
import React from 'react';
import AvatarDisplay from '../common/AvatarDisplay';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A modal to display the user's full-body 3D avatar.
 * @param {boolean} isOpen - Controls if the modal is open.
 * @param {function} onClose - Function to close the modal.
 * @param {string} url - The .glb URL of the 3D model to display.
 */
const ViewAvatarModal = ({ isOpen, onClose, url }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose} // Close when clicking the background
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full h-full max-w-lg max-h-[80vh] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 bg-gray-900 bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>

            {/* The Avatar Display Component */}
            {url ? (
              <AvatarDisplay 
                url={url} 
                shot="full" // Tell the component to show the full-body shot
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                No avatar to display.
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ViewAvatarModal;