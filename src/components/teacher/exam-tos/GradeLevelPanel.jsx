import React from 'react';
import { AcademicCapIcon, StarIcon } from '@heroicons/react/24/outline';
import { gradeLevels } from './examTosUtils';

export default function GradeLevelPanel({ gradeLevel, setGradeLevel, themeStyles }) {
    return (
        <div 
            className="relative rounded-[20px] md:rounded-[32px] p-3.5 sm:p-5 md:p-8 transition-all duration-500 border shadow-sm group bg-white dark:bg-slate-900"
            style={{ 
                borderColor: themeStyles?.outline || themeStyles?.borderColor || 'rgba(226, 232, 240, 0.8)', 
                backgroundColor: themeStyles?.innerPanelBg || 'rgba(255, 255, 255, 0.8)' 
            }}
        >
            {/* Ambient blue background decoration - Scaled down for mobile performance */}
            <div className="absolute -bottom-8 -right-8 w-24 h-24 md:w-40 md:h-40 bg-blue-500/5 dark:bg-blue-500/10 blur-[25px] md:blur-[40px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 flex flex-col">
                {/* Ultra-Compact Header for Mobile */}
                <h3 className="text-[15px] md:text-xl font-black mb-3 md:mb-8 flex items-center gap-2.5 tracking-tight shrink-0" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>
                    <div 
                        className="p-1.5 md:p-2 rounded-[10px] md:rounded-[12px] shadow-inner flex items-center justify-center border border-current/20 shrink-0" 
                        style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}
                    >
                        <AcademicCapIcon className="w-4 h-4 md:w-6 md:h-6 stroke-[2.5]" />
                    </div>
                    Target Level
                </h3>
                
                <div className="flex flex-col">

                    
                    {/* Premium Grid: 4 columns on mobile strictly manages vertical space consumption */}
                    <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 md:gap-3 w-full">
                        {gradeLevels.map((level) => {
                            const isSelected = gradeLevel === level;
                            return (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setGradeLevel(level)}
                                    className={`
                                        py-1.5 px-0.5 md:px-5 md:py-3 
                                        rounded-[10px] md:rounded-[16px] 
                                        text-[11px] md:text-sm font-bold 
                                        transition-all duration-300 active:scale-95 border
                                        ${isSelected 
                                            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500 shadow-md -translate-y-0.5' 
                                            : 'bg-black/5 dark:bg-white/5 border-slate-200/50 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 shadow-inner'
                                        }
                                    `}
                                    style={!isSelected ? { color: themeStyles?.onSurface || themeStyles?.textColor } : {}}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}