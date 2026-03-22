import React from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function TestStructurePanel({ testTypes, onTestTypeChange, onAddTestType, onRemoveTestType, totalConfiguredItems, themeStyles }) {
    return (
        <div className="rounded-[20px] border p-5 lg:p-6 flex flex-col transition-colors duration-500" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Test Structure
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>Define the types of tests for the exam.</p>
                </div>
                <button
                    onClick={onAddTestType}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                    style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add</span>
                </button>
            </div>
            <div className="space-y-2.5 flex-1">
                {testTypes.map((test, index) => (
                    <div key={index} className="flex items-center gap-2 p-2.5 rounded-2xl border transition-colors" style={{ backgroundColor: themeStyles.inputBg, borderColor: themeStyles.outline || themeStyles.borderColor }}>
                        <div className="flex-1">
                            <select value={test.type} onChange={e => onTestTypeChange(index, 'type', e.target.value)} className="w-full text-sm bg-transparent border-none rounded-md focus:ring-0 font-medium" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Multiple Choice</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Matching Type</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Alternative Response</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Identification</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Solving</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Essay</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Analogy</option>
                                <option style={{ backgroundColor: themeStyles.modalBg }}>Interpretive</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <input type="text" value={test.range} onChange={e => onTestTypeChange(index, 'range', e.target.value)} placeholder="Range (e.g., 1-10)" className="w-full px-3 py-1.5 text-sm rounded-xl border focus:ring-1 bg-transparent" style={{ color: themeStyles.primary || themeStyles.accentText, borderColor: themeStyles.outline || themeStyles.borderColor, '--tw-ring-color': themeStyles.primary || '#818cf8' }} />
                        </div>
                        <button onClick={() => onRemoveTestType(index)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-500/10 transition-colors" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>
                            <TrashIcon className="w-4.5 h-4.5" />
                        </button>
                    </div>
                ))}
                {testTypes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: themeStyles.inputBg }}>
                            <PlusIcon className="w-6 h-6" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>No test types added yet</p>
                        <p className="text-xs mt-0.5" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor, opacity: 0.6 }}>Tap "Add" to define your exam structure.</p>
                    </div>
                )}
            </div>
            {totalConfiguredItems === 0 && testTypes.length > 0 && (
                <p className="text-red-400 text-xs mt-3 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Warning: Total items is 0. Add ranges to your test types.
                </p>
            )}
        </div>
    );
}
