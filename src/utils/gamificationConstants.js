// --- ADDED: Rewards Definition ---
export const REWARDS_BY_LEVEL = {
    5: ['border_basic'],
    10: ['border_animated'],
    15: ['canSetBio'], // Special case handled separately
    20: ['bg_pattern_1'],
    25: ['badge_scholar'],
    30: ['border_advanced_animated'],
    35: ['title_adept'],
    40: ['bg_pattern_2'],
    45: ['badge_master'],
    50: ['border_elite_animated'],
    60: ['bg_pattern_elite'],
    70: ['title_guru'],
    80: ['border_legendary_animated'],
    90: ['bg_pattern_legendary'],
    100: ['title_legend', 'badge_legend'],
};

// Define the order of titles for upgrade logic
export const TITLE_ORDER = ['title_adept', 'title_guru', 'title_legend'];