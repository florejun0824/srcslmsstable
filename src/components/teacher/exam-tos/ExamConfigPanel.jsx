import React from 'react';
import { SparklesIcon, ClockIcon, GlobeAltIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function ExamConfigPanel({ totalConfiguredItems, totalHours, setTotalHours, language, setLanguage, themeStyles }) {
    
    // Optimized Input Styles (Reduced padding for mobile compactness)
    const inputClasses = `
        w-full px-3 py-2.5 md:px-4 md:py-4 
        bg-black/5 dark:bg-black/20 
        border border-slate-200/50 dark:border-white/5 
        rounded-[12px] md:rounded-[20px] 
        text-[13px] md:text-base font-bold 
        focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 
        transition-all duration-300 shadow-inner active:scale-[0.99]
    `;

    return (
        <div 
            className="relative rounded-[20px] md:rounded-[32px] p-4 md:p-8 transition-all duration-500 border shadow-sm group overflow-hidden"
            style={{ 
                borderColor: themeStyles?.outline || themeStyles?.borderColor || 'rgba(226, 232, 240, 0.8)', 
                backgroundColor: themeStyles?.innerPanelBg || 'rgba(255, 255, 255, 0.8)' 
            }}
        >
            {/* Ambient background decoration - Scaled down */}
            <div className="absolute -top-16 -right-16 w-32 h-32 md:w-48 md:h-48 bg-indigo-500/5 dark:bg-indigo-500/10 blur-[30px] rounded-full pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>

            <div className="relative z-10">
                {/* Compact Header for Mobile */}
                <h3 className="text-[15px] md:text-xl font-black mb-4 md:mb-8 flex items-center gap-2.5 tracking-tight" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>
                    <div 
                        className="p-1.5 md:p-2 rounded-[10px] shadow-inner flex items-center justify-center border border-current/20" 
                        style={{ backgroundColor: themeStyles?.primary ? `${themeStyles.primary}15` : '#eef2ff', color: themeStyles?.primary || '#6366f1' }}
                    >
                        <SparklesIcon className="w-4 h-4 md:w-6 md:h-6 stroke-[2.5]" />
                    </div>
                    Configuration Matrix
                </h3>
                
                {/* 2-Column Mobile Grid strictly manages vertical space consumption */}
                <div className="grid grid-cols-2 gap-3.5 md:gap-6">
                    
                    {/* Total Items - Full Width on mobile but with reduced height */}
                    <div className="col-span-2">
                        <label className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold mb-1.5 tracking-widest uppercase opacity-80" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                            <ChartBarIcon className="w-3 h-3 stroke-[2.5]" /> Total Items
                        </label>
                        <div 
                            className="w-full px-4 py-3 md:py-5 rounded-[12px] md:rounded-[20px] font-black text-lg md:text-2xl shadow-inner border flex items-center justify-between transition-colors" 
                            style={{ 
                                backgroundColor: themeStyles?.inputBg || 'rgba(0, 0, 0, 0.03)', 
                                borderColor: themeStyles?.outline || 'rgba(255, 255, 255, 0.1)',
                                color: themeStyles?.primary || themeStyles?.accentText || '#4f46e5' 
                            }}
                        >
                            <span>{totalConfiguredItems}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>Items</span>
                        </div>
                    </div>

                    {/* Total Hours - Half Width on mobile */}
                    <div className="col-span-1">
                        <label className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold mb-1.5 tracking-widest uppercase opacity-80" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                            <ClockIcon className="w-3 h-3 stroke-[2.5]" /> Duration
                        </label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={totalHours} 
                                onChange={(e) => setTotalHours(e.target.value)} 
                                className={inputClasses} 
                                placeholder="Hrs" 
                                style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] md:text-xs font-bold uppercase tracking-widest opacity-40 pointer-events-none" style={{ color: themeStyles?.onSurface || themeStyles?.textColor }}>HRS</span>
                        </div>
                    </div>

                    {/* Language Segmented Control - Half Width on mobile */}
                    <div className="col-span-1">
                        <label className="flex items-center gap-1.5 text-[9px] md:text-xs font-bold mb-1.5 tracking-widest uppercase opacity-80" style={{ color: themeStyles?.onSurfaceVariant || themeStyles?.textColor }}>
                            <GlobeAltIcon className="w-3 h-3 stroke-[2.5]" /> Language
                        </label>
                        
                        <div className="flex p-1 bg-black/5 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-[12px] md:rounded-[20px] shadow-inner relative">
                            {/* Sliding Background Highlight */}
                            <div 
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-[9px] md:rounded-[16px] shadow-sm transition-all duration-300 ease-out border border-black/5 dark:border-white/5"
                                style={{ 
                                    backgroundColor: themeStyles?.innerPanelBg || '#ffffff',
                                    transform: language === 'Filipino' ? 'translateX(100%)' : 'translateX(0)'
                                }}
                            />
                            
                            <button
                                type="button"
                                onClick={() => setLanguage('English')}
                                className="flex-1 relative z-10 py-1.5 md:py-3 text-[10px] md:text-sm font-bold rounded-[9px] md:rounded-[16px] transition-colors duration-300 active:scale-[0.98]"
                                style={{ color: language === 'English' ? (themeStyles?.primary || '#4f46e5') : (themeStyles?.onSurfaceVariant || '#64748b') }}
                            >
                                ENGLISH
                            </button>
                            
                            <button
                                type="button"
                                onClick={() => setLanguage('Filipino')}
                                className="flex-1 relative z-10 py-1.5 md:py-3 text-[10px] md:text-sm font-bold rounded-[9px] md:rounded-[16px] transition-colors duration-300 active:scale-[0.98]"
                                style={{ color: language === 'Filipino' ? (themeStyles?.primary || '#4f46e5') : (themeStyles?.onSurfaceVariant || '#64748b') }}
                            >
                                FILIPINO
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}