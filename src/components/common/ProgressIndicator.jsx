import React from 'react';

const ProgressIndicator = ({ progress = 0 }) => {
  return (
    <div 
      className="p-8 rounded-3xl bg-slate-200 dark:bg-neumorphic-base-dark 
                 shadow-[10px_10px_20px_#bdc1c6,-10px_-10px_20px_#ffffff] dark:shadow-lg 
                 w-full max-w-md mx-auto flex flex-col items-center"
    >
      <div 
        className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5"
      >
        Progress
      </div>
      <div 
        className="w-full h-8 rounded-full bg-slate-200 dark:bg-neumorphic-base-dark 
                   shadow-[inset_8px_8px_16px_#bdc1c6,inset_-8px_-8px_16px_#ffffff] 
                   dark:shadow-neumorphic-inset-dark overflow-hidden"
      >
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out 
                     bg-gradient-to-r from-purple-500 to-sky-500
                     shadow-[0_0_15px_3px_rgba(168,85,247,0.5)] 
                     dark:shadow-[0_0_15px_3px_rgba(168,85,247,0.4)]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div 
        className="mt-5 text-base font-semibold text-slate-700 dark:text-slate-200"
      >
        {`${Math.round(progress)}%`}
      </div>
    </div>
  );
};

export default ProgressIndicator;