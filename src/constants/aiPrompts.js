export const languageInstruction = `
**Primary Language Directive (Zero-Tolerance Policy):**
1.  Your most important task is to **automatically detect the primary language** from the provided 'Authoritative Inputs' and 'Source Content'.
2.  You **MUST** generate the **entire response** (all headings, content, analysis, and instructional terms) in that **SAME language**. Do not mix languages. This is a non-negotiable, critical instruction.
3.  **Filipino Translation Dictionary:** If the detected language is Filipino, you **MUST** use the following translations for all common instructional terms. Do not use the English term.
    - "I can..." -> "Kaya kong..."
    - "Activity" -> "Gawain"
    - "Assessment" -> "Pagtataya"
    - "Materials" -> "Mga Kagamitan"
    - "Discussion" -> "Talakayan"
    - "Support Discussion" -> "Talakayan"
    - "Goal" -> "Layunin"
    - "Role" -> "Gampanin"
    - "Audience" -> "Manonood"
    - "Situation" -> "Sitwasyon"
    - "Product" -> "Produkto" or "Awtput"
    - "Standards" -> "Pamantayan"
    - "Explore" -> "Tuklasin"
    - "Firm-Up" -> "Linangin"
    - "Deepen" -> "Palalimin"
    - "Transfer" -> "Ilipat"
`;