import React from 'react';
import { translations } from './examTosUtils';

// --- TOS Preview Table ---
const TOSPreviewTable = ({ tos, styles }) => (
    <div className="overflow-x-auto text-sm">
        <div className="p-5 rounded-[20px] mb-4 border" style={{ backgroundColor: styles.innerPanelBg, borderColor: styles.outline || styles.borderColor }}>
            <h3 className="text-lg font-semibold text-center" style={{ color: styles.onSurface || styles.textColor }}>{tos?.header?.examTitle}</h3>
            <p className="text-center text-sm mt-0.5" style={{ color: styles.onSurfaceVariant || styles.textColor, opacity: 0.8 }}>{tos?.header?.subject}</p>
            <p className="text-center text-sm" style={{ color: styles.onSurfaceVariant || styles.textColor, opacity: 0.8 }}>{tos?.header?.gradeLevel}</p>
            <h4 className="font-medium text-center mt-2 text-xs tracking-widest uppercase" style={{ color: styles.primary || styles.accentText }}>Table of Specifications</h4>
        </div>
        <div className="rounded-[16px] overflow-hidden border" style={{ borderColor: styles.outline || styles.borderColor }}>
            <table className="min-w-full">
                <thead>
                    <tr style={{ backgroundColor: styles.innerPanelBg }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Competencies</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Hours</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Weight</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: styles.onSurfaceVariant || styles.textColor }}>Items</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg" style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: styles.onSurfaceVariant || styles.textColor }}>Easy<br /><span className="text-[10px] font-normal">(Rem/Und)</span></th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg" style={{ backgroundColor: 'rgba(234,179,8,0.08)', color: styles.onSurfaceVariant || styles.textColor }}>Average<br /><span className="text-[10px] font-normal">(App/Ana)</span></th>
                        <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: styles.onSurfaceVariant || styles.textColor }}>Difficult<br /><span className="text-[10px] font-normal">(Eva/Cre)</span></th>
                    </tr>
                </thead>
                <tbody>
                    {tos?.competencyBreakdown?.map((row, index) => (
                        <tr key={index} className="border-t" style={{ borderColor: styles.outline || styles.borderColor, color: styles.onSurface || styles.textColor }}>
                            <td className="px-4 py-3.5 text-sm">{row.competency}</td>
                            <td className="px-3 py-3.5 text-center text-sm">{row.noOfHours}</td>
                            <td className="px-3 py-3.5 text-center text-sm">{row.weightPercentage}</td>
                            <td className="px-3 py-3.5 text-center text-sm font-medium">{row.noOfItems}</td>
                            <td className="px-3 py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(34,197,94,0.04)' }}>{row.easyItems.itemNumbers}</td>
                            <td className="px-3 py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(234,179,8,0.04)' }}>{row.averageItems.itemNumbers}</td>
                            <td className="px-3 py-3.5 text-center text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.04)' }}>{row.difficultItems.itemNumbers}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2" style={{ borderColor: styles.outline || styles.borderColor, color: styles.primary || styles.accentText }}>
                        <td className="px-4 py-3 font-bold text-sm">TOTAL</td>
                        <td className="px-3 py-3 text-center font-bold text-sm">{tos?.totalRow?.hours}</td>
                        <td className="px-3 py-3 text-center font-bold text-sm">{tos?.totalRow?.weightPercentage}</td>
                        <td className="px-3 py-3 text-center font-bold text-sm">{tos?.totalRow?.noOfItems}</td>
                        <td colSpan="3"></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
);

// --- Questions Preview Section ---
const QuestionsPreview = ({ examQuestions, language, themeStyles }) => {
    const groupedQuestions = examQuestions.reduce((acc, q) => {
        const type = q.type || 'unknown';
        if (!acc[type]) {
            acc[type] = {
                instruction: q.instruction,
                passage: q.passage,
                choicesBox: q.choicesBox,
                questions: []
            };
        }
        acc[type].questions.push(q);
        return acc;
    }, {});

    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const t = translations[language] || translations['English'];

    return Object.entries(groupedQuestions).map(([type, data], typeIndex) => {
        const typeHeader = t.test_types[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        return (
            <div key={type} className="mt-6 first:mt-0">
                <h4 className="text-sm font-bold tracking-wide" style={{ color: themeStyles.primary || themeStyles.accentText }}>{romanNumerals[typeIndex]}. {typeHeader}</h4>
                {data.instruction && <p className="text-sm font-medium italic my-2" style={{ color: themeStyles.onSurfaceVariant || themeStyles.textColor }}>{data.instruction}</p>}
                {data.passage && <p className="text-sm my-2 p-4 rounded-2xl border" style={{ backgroundColor: themeStyles.inputBg, borderColor: themeStyles.outline || themeStyles.borderColor, color: themeStyles.onSurface || themeStyles.textColor }}>{data.passage}</p>}

                {type === 'identification' && data.choicesBox && (
                    <div className="text-center p-3 my-4 border rounded-2xl" style={{ backgroundColor: themeStyles.inputBg, borderColor: themeStyles.outline || themeStyles.borderColor }}>
                        <p className="text-sm font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                            {(() => {
                                const box = data.choicesBox;
                                if (Array.isArray(box)) {
                                    return box.map(c => (typeof c === 'object' ? c.text || c.value : c)).join('   •   ');
                                }
                                return String(box);
                            })()}
                        </p>
                    </div>
                )}
                <div className="space-y-4 mt-4">
                    {type === 'matching-type' ? (
                        (() => {
                            const q = data.questions[0];
                            if (!q || !q.prompts || !q.options) return null;

                            return (
                                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 pl-2">
                                    <div className="flex-1">
                                        <p className="font-semibold mb-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{t.columnA}</p>
                                        <ul className="list-none space-y-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>
                                            {q.prompts.map((prompt, promptIndex) => (
                                                <li key={prompt.id} className="flex items-start">
                                                    <span className="w-8 flex-shrink-0 font-medium">{q.questionNumber + promptIndex}.</span>
                                                    <span>{prompt.text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold mb-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{t.columnB}</p>
                                        <ul className="list-none space-y-2 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>
                                            {q.options.map((option, optionIndex) => (
                                                <li key={option.id} className="flex items-start">
                                                    <span className="w-8 flex-shrink-0 font-medium">{String.fromCharCode(97 + optionIndex)}.</span>
                                                    <span>{option.text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        data.questions.map((q, index) => (
                            <div key={index} className="pl-2">
                                <p className="font-medium text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{q.questionNumber}. {q.question}</p>

                                {q.options && Array.isArray(q.options) && (
                                    <ul className="list-none mt-2 ml-8 text-sm space-y-1.5" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>
                                        {q.options.map((option, optIndex) => (
                                            <li key={optIndex}>{String.fromCharCode(97 + optIndex)}. {option}</li>
                                        ))}
                                    </ul>
                                )}

                                {type === 'identification' && (
                                    <p className="mt-2 ml-5 text-sm" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Answer: <span className="font-mono">__________________</span></p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    });
};

// --- Main Preview Component ---
export default function ExamPreview({ previewData, language, themeStyles }) {
    if (!previewData) return null;

    return (
        <div className="space-y-5">
            {/* Preview header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-8 rounded-full" style={{ backgroundColor: themeStyles.primary || '#818cf8' }} />
                <h2 className="text-xl lg:text-2xl font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>
                    {previewData?.examTitle || 'Generated Exam'}
                </h2>
            </div>

            <div className="space-y-5">
                {previewData.tos ? (
                    <>
                        {/* TOS PAGE */}
                        <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}>Page 1</span>
                                <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Table of Specifications</h3>
                            </div>
                            <TOSPreviewTable tos={previewData.tos} styles={themeStyles} />
                        </div>

                        {/* QUESTIONS PAGE */}
                        {previewData.examQuestions && previewData.examQuestions.length > 0 && (
                            <>
                                <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: themeStyles.primaryContainer || 'rgba(99,102,241,0.15)', color: themeStyles.primary || '#818cf8' }}>Page 2</span>
                                        <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Exam Questions</h3>
                                    </div>
                                    <QuestionsPreview examQuestions={previewData.examQuestions} language={language} themeStyles={themeStyles} />
                                </div>

                                {/* ANSWER KEY PAGE */}
                                <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>Page 3</span>
                                        <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Answer Key</h3>
                                    </div>
                                    <ul className="list-none space-y-2">
                                        {previewData.examQuestions.map((q, index) => (
                                            <li key={index} className="text-sm py-1.5 border-b last:border-b-0" style={{ borderColor: themeStyles.outline || themeStyles.borderColor }}>
                                                <strong className="font-semibold" style={{ color: themeStyles.primary || themeStyles.accentText }}>Q{q.questionNumber}:</strong>{' '}
                                                <span style={{ color: themeStyles.onSurface || themeStyles.textColor }}>{q.correctAnswer || (q.correctAnswers && Object.entries(q.correctAnswers).map(([key, val]) => `${key}-${val}`).join(', '))}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* EXPLANATIONS PAGE */}
                                <div className="rounded-[20px] border p-5 lg:p-6" style={{ borderColor: themeStyles.outline || themeStyles.borderColor, backgroundColor: themeStyles.innerPanelBg }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: '#fbbf24' }}>Page 4</span>
                                        <h3 className="text-base font-semibold" style={{ color: themeStyles.onSurface || themeStyles.textColor }}>Explanations</h3>
                                    </div>
                                    <ul className="list-none space-y-4">
                                        {previewData.examQuestions.filter(q => q.explanation || q.solution).map((q, index) => (
                                            <li key={index} className="text-sm">
                                                <strong className="font-semibold" style={{ color: themeStyles.primary || themeStyles.accentText }}>Q{q.questionNumber}:</strong>
                                                {q.explanation && <p className="ml-4 mt-0.5" style={{ color: themeStyles.onSurface || themeStyles.textColor, opacity: 0.9 }}>{q.explanation}</p>}
                                                {q.solution && <p className="ml-4 mt-0.5 font-mono text-xs p-3 rounded-xl mt-1" style={{ backgroundColor: themeStyles.inputBg, color: themeStyles.onSurface || themeStyles.textColor }}>{q.solution}</p>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </>
                ) : <p className="text-red-400 font-medium p-4">Could not generate a valid preview.</p>}
            </div>
        </div>
    );
}
