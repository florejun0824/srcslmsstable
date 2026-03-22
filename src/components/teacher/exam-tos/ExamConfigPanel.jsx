import React from 'react';
import { inputBaseStyles } from './examTosUtils';

export default function ExamConfigPanel({ totalConfiguredItems, totalHours, setTotalHours, language, setLanguage, themeStyles }) {
    const neumorphicInput = `${inputBaseStyles} px-4 py-2.5 sm:text-sm`;
    const neumorphicSelect = `${inputBaseStyles} pl-4 pr-10 py-2.5 sm:text-sm appearance-none bg-no-repeat bg-[right_0.5rem_center]`;

    return (
        <div className="rounded-[20px] border p-5 lg:p-6 transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeStyles.primary || '#818cf8' }} />
                Exam Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Total Number of Items</label>
                    <div className={`${neumorphicInput} font-semibold text-base`} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.primary || themeStyles.accentText }}>
                        {totalConfiguredItems}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Total Hours Spent</label>
                    <input type="number" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className={neumorphicInput} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }} placeholder="e.g., 10" />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Language</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className={neumorphicSelect} style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }}>
                        <option>English</option>
                        <option>Filipino</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
