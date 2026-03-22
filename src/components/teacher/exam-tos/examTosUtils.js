// --- M3 Style Tokens ---
export const inputBaseStyles = "block w-full text-sm rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[var(--monet-primary,#6366f1)] focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 transition-colors duration-200";
export const btnBase = "w-full inline-flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
export const btnExtruded = `hover:shadow-md active:scale-[0.98]`;
export const btnDisabled = "disabled:opacity-50 disabled:pointer-events-none";

// --- M3 THEME HELPER (Adapted for M3 surfaces) ---
export const getThemeStyles = (overlay) => {
    const base = {
        modalBg: '', borderColor: '', innerPanelBg: '', inputBg: '', textColor: '', accentText: '',
        // M3 additions
        surfaceContainerLow: '', onSurface: '', onSurfaceVariant: '', outline: '', primary: '', primaryContainer: '', onPrimaryContainer: '',
    };
    switch (overlay) {
        case 'christmas':
            return { ...base, modalBg: '#0a1f15', borderColor: 'rgba(34,197,94,0.15)', innerPanelBg: 'rgba(20,83,45,0.25)', inputBg: 'rgba(0,0,0,0.2)', textColor: '#e2e8f0', accentText: '#86efac', surfaceContainerLow: '#0f291e', onSurface: '#e2e8f0', onSurfaceVariant: '#a7c4b8', outline: 'rgba(34,197,94,0.2)', primary: '#4ade80', primaryContainer: 'rgba(34,197,94,0.15)', onPrimaryContainer: '#86efac' };
        case 'valentines':
            return { ...base, modalBg: '#200810', borderColor: 'rgba(244,63,94,0.15)', innerPanelBg: 'rgba(80,7,36,0.25)', inputBg: 'rgba(0,0,0,0.2)', textColor: '#ffe4e6', accentText: '#fda4af', surfaceContainerLow: '#2a0a12', onSurface: '#ffe4e6', onSurfaceVariant: '#d4a0a8', outline: 'rgba(244,63,94,0.2)', primary: '#fb7185', primaryContainer: 'rgba(244,63,94,0.15)', onPrimaryContainer: '#fda4af' };
        case 'graduation':
            return { ...base, modalBg: '#151200', borderColor: 'rgba(234,179,8,0.15)', innerPanelBg: 'rgba(66,32,6,0.25)', inputBg: 'rgba(0,0,0,0.2)', textColor: '#fefce8', accentText: '#fde047', surfaceContainerLow: '#1a1600', onSurface: '#fefce8', onSurfaceVariant: '#d4c88a', outline: 'rgba(234,179,8,0.2)', primary: '#facc15', primaryContainer: 'rgba(234,179,8,0.15)', onPrimaryContainer: '#fde047' };
        case 'rainy':
            return { ...base, modalBg: '#0c1322', borderColor: 'rgba(56,189,248,0.15)', innerPanelBg: 'rgba(30,41,59,0.35)', inputBg: 'rgba(15,23,42,0.4)', textColor: '#f1f5f9', accentText: '#7dd3fc', surfaceContainerLow: '#0f172a', onSurface: '#f1f5f9', onSurfaceVariant: '#94a3b8', outline: 'rgba(56,189,248,0.2)', primary: '#38bdf8', primaryContainer: 'rgba(56,189,248,0.15)', onPrimaryContainer: '#7dd3fc' };
        case 'cyberpunk':
            return { ...base, modalBg: '#140828', borderColor: 'rgba(217,70,239,0.2)', innerPanelBg: 'rgba(46,16,101,0.25)', inputBg: 'rgba(0,0,0,0.3)', textColor: '#fae8ff', accentText: '#e879f9', surfaceContainerLow: '#180a2e', onSurface: '#fae8ff', onSurfaceVariant: '#c084b0', outline: 'rgba(217,70,239,0.25)', primary: '#d946ef', primaryContainer: 'rgba(217,70,239,0.15)', onPrimaryContainer: '#e879f9' };
        case 'spring':
            return { ...base, modalBg: '#22151a', borderColor: 'rgba(244,114,182,0.15)', innerPanelBg: 'rgba(80,20,40,0.2)', inputBg: 'rgba(0,0,0,0.15)', textColor: '#fce7f3', accentText: '#f9a8d4', surfaceContainerLow: '#2a1a1f', onSurface: '#fce7f3', onSurfaceVariant: '#c8a0b0', outline: 'rgba(244,114,182,0.2)', primary: '#f472b6', primaryContainer: 'rgba(244,114,182,0.15)', onPrimaryContainer: '#f9a8d4' };
        case 'space':
            return { ...base, modalBg: '#090d16', borderColor: 'rgba(99,102,241,0.15)', innerPanelBg: 'rgba(17,24,39,0.4)', inputBg: 'rgba(0,0,0,0.35)', textColor: '#e0e7ff', accentText: '#a5b4fc', surfaceContainerLow: '#0b0f19', onSurface: '#e0e7ff', onSurfaceVariant: '#94a0c8', outline: 'rgba(99,102,241,0.2)', primary: '#818cf8', primaryContainer: 'rgba(99,102,241,0.15)', onPrimaryContainer: '#a5b4fc' };
        case 'none':
        default:
            return { ...base, modalBg: '#ffffff', borderColor: 'rgba(0,0,0,0.06)', innerPanelBg: '#f8fafc', inputBg: '#ffffff', textColor: '#1e293b', accentText: '#64748b', surfaceContainerLow: '#f8fafc', onSurface: '#1e293b', onSurfaceVariant: '#475569', outline: 'rgba(0,0,0,0.08)', primary: '#6366f1', primaryContainer: 'rgba(99,102,241,0.1)', onPrimaryContainer: '#4338ca' };
    }
};

// --- UTILS & PARSERS ---

export const uniqueId = () => `id_${Math.random().toString(36).substr(2, 9)}`;
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const calculateItemsForRange = (rangeString) => {
    if (!rangeString) return 0;
    const ranges = rangeString.split(',').map(r => r.trim());
    let totalItems = 0;
    for (const range of ranges) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) totalItems += (end - start + 1);
        else if (!isNaN(start)) totalItems += 1;
    }
    return totalItems;
};

export const extractJson = (text) => {
    let match = text.match(/```json\s*([\sS]*?)\s*```/);
    if (!match) match = text.match(/```([\sS]*?)```/);
    if (match && match[1]) return match[1].trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace > -1 && lastBrace > firstBrace) return text.substring(firstBrace, lastBrace + 1);
    return text;
};

export const tryParseJson = (jsonString) => {
    try {
        const sanitizedString = jsonString
            .replace(/\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
            .replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitizedString);
    } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("Invalid JSON format from AI.");
    }
};

export const roundPercentagesToSum100 = (breakdown) => {
    if (!breakdown || breakdown.length === 0) {
        return [];
    }
    const percentages = breakdown.map((item, index) => {
        const value = parseFloat(item.weightPercentage);
        return {
            originalIndex: index,
            value: value,
            floorValue: Math.floor(value),
            remainder: value - Math.floor(value),
        };
    });
    const sumOfFloors = percentages.reduce((sum, p) => sum + p.floorValue, 0);
    let remainderToDistribute = 100 - sumOfFloors;
    percentages.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remainderToDistribute; i++) {
        if (percentages[i]) {
            percentages[i].floorValue += 1;
        }
    }
    percentages.sort((a, b) => a.originalIndex - b.originalIndex);
    const updatedBreakdown = breakdown.map((item, index) => ({
        ...item,
        weightPercentage: `${percentages[index].floorValue}%`,
    }));
    return updatedBreakdown;
};

// --- TRANSLATIONS ---

export const translations = {
    'English': {
        'multiple_choice': 'Instructions: Choose the letter of the best answer.',
        'alternative_response': 'Instructions: Read and understand each statement. Write "True" if the statement is correct and "False" if it is incorrect.',
        'matching-type': 'Instructions: Match the items in Column A with the corresponding items in Column B.',
        'identification': 'Instructions: Identify the correct term for each statement from the choices in the box. Write your answer on the space provided.',
        'essay': 'Instructions: Answer the following question in a comprehensive essay.',
        'solving': 'Instructions: Solve the following problems. Show your complete solution.',
        'analogy': 'Instructions: Complete the following analogies by choosing the best answer.',
        'interpretive': 'Instructions: Read the passage below and answer the questions that follow.',
        'columnA': 'Column A',
        'columnB': 'Column B',
        'rubric': 'Scoring Rubric',
        'test_types': {
            'multiple_choice': 'Multiple Choice',
            'alternative_response': 'Alternative Response',
            'matching-type': 'Matching Type',
            'identification': 'Identification',
            'essay': 'Essay',
            'solving': 'Solving',
            'analogy': 'Analogy',
            'interpretive': 'Interpretive',
        }
    },
    'Filipino': {
        'multiple_choice': 'Panuto: Piliin ang titik ng pinakamahusay na sagot.',
        'alternative_response': 'Panuto: Basahin at unawain ang bawat pahayag. Isulat ang "Tama" kung ito ay totoo at "Mali" kung hindi.',
        'matching-type': 'Panuto: Itugma ang mga aytem sa Hanay A sa katumbas na mga aytem sa Hanay B.',
        'identification': 'Panuto: Tukuyin ang tamang termino para sa bawat pahayag mula sa mga pagpipilian sa kahon. Isulat ang iyong sagot sa nakalaang espasyo.',
        'essay': 'Panuto: Sagutin ang sumusunod na tanong sa isang komprehensibong sanaysay.',
        'solving': 'Panuto: Lutasin ang mga sumusunod na suliranin. Ipakita ang iyong kumpletong solusyon.',
        'analogy': 'Panuto: Kumpletuhin ang mga sumusunod na analohiya sa pamamagitan ng pagpili ng pinakamahusay na sagot.',
        'interpretive': 'Panuto: Basahin ang talata sa ibaba at sagutin ang mga sumusunod na tanong.',
        'columnA': 'Hanay A',
        'columnB': 'Hanay B',
        'rubric': 'Rubrik sa Pagmamarka',
        'test_types': {
            'multiple_choice': 'Maraming Pagpipilian',
            'alternative_response': 'Alternatibong Pagtugon',
            'matching-type': 'Pagtutugma',
            'identification': 'Pagtukoy',
            'essay': 'Sanaysay',
            'solving': 'Paglutas ng Suliranin',
            'analogy': 'Analohiya',
            'interpretive': 'Interpretibong Pagbasa',
        }
    }
};

// --- GRADE LEVELS ---

export const gradeLevels = [
    'Kinder',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12'
];
