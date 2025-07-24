// src/components/teacher/ContentRenderer.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

/**
 * ✨ NEW: Robust SVG processing function.
 * This acts as a safety net to fix AI mistakes in SVGs.
 */
const processSvgContent = (svgString) => {
  // 1. Remove LaTeX math delimiters ($) and common commands
  let cleanedSvg = svgString.replace(/\$/g, '');
  cleanedSvg = cleanedSvg.replace(/\\delta\^\{?-\}?/g, 'δ-');
  cleanedSvg = cleanedSvg.replace(/\\delta\^\{?\+\}?/g, 'δ+');
  cleanedSvg = cleanedSvg.replace(/Na\^\{?\+\}?/g, 'Na⁺');
  cleanedSvg = cleanedSvg.replace(/Cl\^\{?-\}?/g, 'Cl⁻');

  try {
    // 2. Parse the SVG to manipulate it as a DOM object in memory
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(cleanedSvg, "image/svg+xml");
    const textElements = svgDoc.getElementsByTagName('text');

    // 3. Force font-size and prevent overflow on all text elements
    for (let i = 0; i < textElements.length; i++) {
      const textElement = textElements[i];
      const currentFontSize = parseFloat(textElement.getAttribute('font-size')) || 6;

      // Force font-size to be within a safe range (e.g., max 6px)
      if (currentFontSize > 6) {
        textElement.setAttribute('font-size', '6px');
      }

      // Add text-fitting attributes to prevent long labels from overflowing
      textElement.setAttribute('textLength', '100%');
      textElement.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }

    // 4. Serialize the modified SVG back to a string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
  } catch (error) {
    console.error("Could not parse or process SVG:", error);
    // Fallback to the initial cleaned string if parsing fails
    return cleanedSvg;
  }
};


/**
 * NEW: Helper function to remove duplicated lines from AI output.
 */
const removeDuplicateLines = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    const uniqueLines = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== '' && lines[i].trim() !== (lines[i-1] || '').trim()) {
            uniqueLines.push(lines[i]);
        } else if (lines[i].trim() === '' && (uniqueLines[uniqueLines.length - 1] || '').trim() !== '') {
            uniqueLines.push(lines[i]);
        }
    }
    return uniqueLines.join('\n');
};


export default function ContentRenderer({ htmlContent, text }) {
  
  // --- Priority 1: If raw HTML content (like an SVG) is provided, clean and render it ---
  if (htmlContent && typeof htmlContent === 'string') {
    // ✅ FIX: Use the new, more robust SVG processing function.
    const sanitizedHtml = processSvgContent(htmlContent);
    return (
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // --- Priority 2: If Markdown text is provided, process and render it ---
  if (text && typeof text === 'string') {
    const unescapedText = text.replace(/\\u([\dA-F]{4})/gi, (match, grp) =>
      String.fromCharCode(parseInt(grp, 16))
    );
    
    // ✅ FIX: The AI prompt now handles escaping correctly, so we no longer need
    // to process \\n or \\" here. We will just process the escaped backslashes in the LaTeX.
    // This looks for an even number of backslashes and replaces them with half that many.
    // e.g., `\\frac` becomes `\frac`, and `\\\\` becomes `\\`.
    const normalizedText = unescapedText.replace(/\\\\/g, '\\');
    
    let processedText = normalizedText;

    const trimmedText = processedText.trim();
    if (trimmedText.startsWith('```') && trimmedText.endsWith('```')) {
      processedText = trimmedText.substring(3, trimmedText.length - 3).trim();
    }
    
    processedText = removeDuplicateLines(processedText);

    return (
      <div className="content-renderer prose max-w-full">
        <ReactMarkdown
          children={processedText}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]} 
          components={{
            strong: ({ node, ...props }) => {
              if (props.children && typeof props.children[0] === 'string' && props.children[0].includes('___')) {
                return <span className="font-normal tracking-widest text-blue-500">{props.children}</span>;
              }
              return <strong {...props} />;
            },
            img: ({ node, ...props }) => <img {...props} alt="" className="max-w-full" />,
          }}
        />
      </div>
    );
  }

  // --- Fallback: If no valid content is provided, render nothing ---
  return null;
}