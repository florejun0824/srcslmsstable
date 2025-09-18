// utils/sanitizeLessonText.js

export default function sanitizeLessonText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // Convert escaped newlines to real ones
  text = text.replace(/\\n/g, '\n');

  // Convert Unicode asterisks to actual asterisks
  text = text.replace(/∗/g, '*');

  // Merge character-by-character spacing (e.g., S\nT\nE\nP → STEP)
  text = text.replace(/(?:\*+\n*)*([A-Za-z])(?:\n| )([A-Za-z])(?:\n| )([A-Za-z])(?:\n| )([A-Za-z])(?:\n| )?/g, (_, a, b, c, d) => `${a}${b}${c}${d}`);

  // Merge any bold/italic glitches
  text = text.replace(/\*{2}([^\*]+?)\*{2}/g, (_, content) => `**${content.replace(/\s+/g, '')}**`);

  // Fix inline character splits (x \n = \n − \n 5 ...)
  text = text.replace(/([a-zA-Z0-9])\n([a-zA-Z0-9])/g, '$1$2');

  // Remove trailing LaTeX slashes
  text = text.replace(/\\+\s*$/gm, '');

  // Fix broken inline LaTeX (single $)
  text = text.replace(/\$([^\$]*?)\n+([^\$]*?)\$/g, (_, p1, p2) => `$${p1} ${p2}$`);
  text = text.replace(/\$([^\$]*?)\$/g, (_, math) => `$${math.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()}$`);

  // Fix broken block LaTeX
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `$$${math.replace(/\s*\n\s*/g, ' ')}$$`);

  // Remove duplicated lines
  const lines = text.split('\n');
  const deduped = lines.filter((line, idx) => line !== lines[idx - 1]);

  // Final spacing fixes (new 👇)
  let cleaned = deduped.join('\n');

  cleaned = cleaned
    .replace(/Step(\d+)/g, 'Step $1') // Step1 → Step 1
    .replace(/([a-z])([A-Z])/g, '$1 $2') // word boundaries
    .replace(/([a-zA-Z])(\d)/g, '$1 $2') // x2 → x 2
    .replace(/(\d)([a-zA-Z])/g, '$1 $2') // 2x → 2 x
    .replace(/([.,:;])([A-Za-z])/g, '$1 $2') // fix punctuation spacing
    .replace(/\s+/g, ' '); // collapse excess spacing

  return cleaned.trim();
}
