import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const GradeWarningModal = ({ message, onClose }) => {
  return (
    // This modal uses z-60 to appear on top of JoinClassModal (which is z-50)
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex justify-center items-center z-60 p-4 font-sans">
      <div className="relative bg-neumorphic-base rounded-3xl shadow-neumorphic p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">
            Grade Level Mismatch
          </h3>
          <p className="text-slate-600 text-center mb-6">{message}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-semibold text-white bg-red-600 shadow-lg shadow-red-500/40 hover:bg-red-700 transition-all"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeWarningModal;