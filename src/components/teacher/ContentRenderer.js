import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

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

  let safeText = text
.replace(/∗/g, '*')
.replace(/∗/g, '*')
   .replace(/\\n/g, '\n')
   .replace(/\r/g, '')
   .replace(/\$a\s*\\?n?eq\s*0\$/gi, '$a \\neq 0$')
   .replace(/([abc])\s*=\s*\\text\{_+\}/g, (_, letter) => `${letter} = ___________`)
   .replace(/\^2/g, '²')
   .replace(/\^3/g, '³')
   .replace(/\(\$ax\^2 \+ bx \+ c = 0\$\)/g, '(ax² + bx + c = 0)')
   .replace(/\$\\Delta\s*>\s*0\$/g, 'Δ > 0')
   .replace(/\$\\Delta\s*=\s*0\$/g, 'Δ = 0')
   .replace(/\$\\Delta\s*<\s*0\$/g, 'Δ < 0')
   .replace(/\$\\Delta\$/g, 'Δ')
   .replace(/\$([abcxX])\$/g, '$1')
  .replace(/^\*([^*].*?)\*$/gm, '_$1_') // italic full-line fallback
   .replace(/\$\s*\\sqrt\{([^}]+)\}\s*\$/g, (_, expr) => `√(${expr})`)
   .replace(/\$\s*\\pm\s*\$/g, '±')
   .replace(/\$\s*\\frac\{([^}]+)\}\{([^}]+)\}\s*\$/g, (_, num, den) => `(${num} ÷ ${den})`)
   .replace(/\$(\d+x²\s*[\+\-]\s*\d+x\s*[\+\-]\s*\d+)\$/g, (_, expr) => expr); // Prevent math rendering in example text

  const lines = safeText.split('\n');

  const renderInline = (input) => {
    const parts = input.split(/(\$\$[^$]*\$\$|\$[^$]*\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <BlockMath key={idx} math={part.slice(2, -2)} />;
      }
	  if (part.startsWith('**') && part.endsWith('**')) {
	    const boldContent = part.slice(2, -2).replace(/\$([^$]+)\$/g, '$1') // <-- this is the fix
		  .replace(/\\neq/g, '≠'); // Replace \neq with ≠ inside bold
	    return <strong key={idx}>{boldContent}</strong>;
	  }

      if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={idx} math={part.slice(1, -1)} />;
      }
	  if (
	    part.startsWith('*') &&
	    part.endsWith('*') &&
	    !part.trim().startsWith('* ') // ← prevents italic formatting on bullet lines
	  ) {
	    return <em key={idx}>{part.slice(1, -1)}</em>;
	  }

      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx}>
            {toSuperscript(part.slice(2, -2))}
          </strong>
        );
      }

      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }

      return <React.Fragment key={idx}>{toSuperscript(part)}</React.Fragment>;
    });
  };

  return (
    <div>
      {lines.map((line, index) => {
        const trimmed = line.trim();
		
		if (line.trim().startsWith('* ')) {
		  return (
		    <ul key={index} className="list-disc list-inside mb-2">
		      <li>{renderInline(line.trim().slice(2))}</li>
		    </ul>
		  );
		}

        if (trimmed.startsWith('* ')) {
          return (
            <ul key={index} className="list-disc list-inside mb-2">
              <li>{renderInline(trimmed.slice(2))}</li>
            </ul>
          );
        }

        return (
          <p key={index} className="mb-2 whitespace-pre-wrap">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};

export default ContentRenderer;
