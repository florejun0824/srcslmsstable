import React from 'react';
import { inputBaseStyles, gradeLevels } from './examTosUtils';

export default function GradeLevelPanel({ gradeLevel, setGradeLevel, themeStyles }) {
    const neumorphicSelect = `${inputBaseStyles} pl-4 pr-10 py-2.5 sm:text-sm appearance-none bg-no-repeat bg-[right_0.5rem_center]`;

    return (
        <div className="rounded-[20px] border p-5 lg:p-6 transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Target Level
            </h3>
            <div>
                <label className="block text-xs font-medium mb-1.5 tracking-wide uppercase" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Grade Level (Context)</label>
                <select
                    value={gradeLevel}
                    onChange={e => setGradeLevel(e.target.value)}
                    className={neumorphicSelect}
                    style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }}
                >
                    <option value="" disabled>Select Grade Level</option>
                    {gradeLevels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
                <p className="text-xs mt-2" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor, opacity: 0.7 }}>
                    Sets the difficulty and vocabulary level for generated questions.
                </p>
            </div>
        </div>
    );
}
