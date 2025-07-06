import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import katex from 'katex'; // <-- Import the katex library
import DOMPurify from 'dompurify';

// Replace ^n with Unicode superscripts
const toSuperscript = (text) =>
  text
    .replace(/\^2/g, '²')
    .replace(/\^3/g, '³')
    .replace(/\^4/g, '⁴')
    .replace(/\^5/g, '⁵')
    .replace(/\^6/g, '⁶')
    .replace(/\^7/g, '⁷')
    .replace(/\^8/g, '⁸')
    .replace(/\^9/g, '⁹')
    .replace(/\^0/g, '⁰')
    .replace(/\^1/g, '¹');

const ContentRenderer = ({ text }) => {
  if (typeof text !== 'string') return null;

  // This is your original function for rendering formatted text. It remains unchanged.
  const renderTextPart = (textBlock, baseKey) => {
    let safeText = textBlock
      .replace(/∗/g, '*')
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '')
      .replace(/\$a\s*\\?n?eq\s*0\$/gi, '$a \\neq 0$')
      .replace(/([abc])\s*=\s*\\text\{_+\}/g, (_, letter) => `${letter} = ___________`)
      .replace(/\(\$ax\^2 \+ bx \+ c = 0\$\)/g, '(ax² + bx + c = 0)')
      .replace(/\$\\Delta\s*>\s*0\$/g, 'Δ > 0')
      .replace(/\$\\Delta\s*=\s*0\$/g, 'Δ = 0')
      .replace(/\$\\Delta\s*<\s*0\$/g, 'Δ < 0')
      .replace(/\$\\Delta\$/g, 'Δ')
      .replace(/\$([abcxX])\$/g, '$1')
      .replace(/^\*([^*].*?)\*$/gm, '_$1_')
      .replace(/\$\s*\\sqrt\{([^}]+)\}\s*\$/g, (_, expr) => `√(${expr})`)
      .replace(/\$\s*\\pm\s*\$/g, '±')
      .replace(/\$\s*\\frac\{([^}]+)\}\{([^}]+)\}\s*\$/g, (_, num, den) => `(${num} ÷ ${den})`)
      .replace(/\$(\d+x²\s*[\+\-]\s*\d+x\s*[\+\-]\s*\d+)\$/g, (_, expr) => expr);

    const lines = safeText.split('\n').filter(line => line.trim() !== '');

    const renderInline = (input) => {
      const parts = input.split(/(\$\$[^$]*\$\$|\$[^$]*\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return parts.map((part, idx) => {
        if (!part) return null;
        if (part.startsWith('$$') && part.endsWith('$$')) return <BlockMath key={idx} math={part.slice(2, -2)} />;
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldContent = part.slice(2, -2).replace(/\$([^$]+)\$/g, '$1').replace(/\\neq/g, '≠');
          return <strong key={idx}>{boldContent}</strong>;
        }
        if (part.startsWith('$') && part.endsWith('$')) return <InlineMath key={idx} math={part.slice(1, -1)} />;
        if (part.startsWith('*') && part.endsWith('*') && !part.trim().startsWith('* ')) return <em key={idx}>{part.slice(1, -1)}</em>;
        return <React.Fragment key={idx}>{toSuperscript(part)}</React.Fragment>;
      });
    };

    return lines.map((line, index) => {
      const key = `${baseKey}-${index}`;
      if (line.trim().startsWith('* ')) {
        return (
          <ul key={key} className="list-disc list-inside mb-2">
            <li>{renderInline(line.trim().slice(2))}</li>
          </ul>
        );
      }
      return (
        <p key={key} className="mb-2 whitespace-pre-wrap">
          {renderInline(line)}
        </p>
      );
    });
  };

  // Main rendering logic
  const contentParts = text.split(/(<svg[\s\S]+?<\/svg>|<table[\s\S]+?<\/table>)/g);

  return (
    <div>
      {contentParts.map((part, index) => {
        const key = `part-${index}`;
        
        if (part.startsWith('<svg')) {
          const cleanSvg = DOMPurify.sanitize(part, { USE_PROFILES: { svg: true } });
          return (
            <div
              key={key}
              className="my-4 w-full flex justify-center"
              dangerouslySetInnerHTML={{ __html: cleanSvg }}
            />
          );
        } else if (part.startsWith('<table')) {
          // --- START OF NEW LOGIC FOR TABLES ---
          // First, render LaTeX math that is *inside* the table HTML string.
          const tableWithMath = part.replace(/\$([^$]+?)\$/g, (match, equation) => {
            try {
              return katex.renderToString(equation, { throwOnError: false, displayMode: false });
            } catch (e) {
              return match; // If math is invalid, return the original string
            }
          });

          // Then, sanitize the entire resulting HTML block.
          const cleanHtml = DOMPurify.sanitize(tableWithMath, { USE_PROFILES: { html: true } });
          return (
            <div
              key={key}
              className="my-4 w-full"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          );
          // --- END OF NEW LOGIC FOR TABLES ---

        } else if (part.trim() !== '') {
          // This is a regular text part. Process it with all your original formatting rules.
          return renderTextPart(part, key);
        }
        return null;
      })}
    </div>
  );
};

export default ContentRenderer;