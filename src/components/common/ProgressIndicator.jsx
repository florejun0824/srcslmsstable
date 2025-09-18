import React from 'react';

const ProgressIndicator = ({ progress = 0 }) => {
  return (
    <div className="w-3/4 max-w-md">
      <div className="w-full bg-slate-200 rounded-full shadow-inner">
        <div
          className="bg-gradient-to-r from-purple-500 to-violet-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          {progress > 5 ? `${Math.round(progress)}%` : ''}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;