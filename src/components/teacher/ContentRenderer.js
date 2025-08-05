// src/components/teacher/ContentRenderer.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

/**
 * Robust SVG processing function.
 * This acts as a safety net to fix AI mistakes in SVGs.
 */
const processSvgContent = (svgString) => {
  // 1. Initial text-based cleaning
  let cleanedSvg = svgString.replace(/\$/g, ''); // Remove LaTeX delimiters
  cleanedSvg = cleanedSvg.replace(/\\delta\^\{?-\}?/g, 'δ-');
  cleanedSvg = cleanedSvg.replace(/\\delta\^\{?\+\}?/g, 'δ+');
  cleanedSvg = cleanedSvg.replace(/Na\^\{?\+\}?/g, 'Na⁺');
  cleanedSvg = cleanedSvg.replace(/Cl\^\{?-\}?/g, 'Cl⁻');

  try {
    // 2. Parse the SVG for DOM manipulation
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(cleanedSvg, "image/svg+xml");
    const svgElement = svgDoc.documentElement;

    // Ensure a viewBox is present for proper scaling
    if (!svgElement.getAttribute('viewBox')) {
      const width = svgElement.getAttribute('width');
      const height = svgElement.getAttribute('height');
      if (width && height) {
        svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }
    }
    
    // Create a clipping path to prevent overflow
    const clipPathId = 'svg-clip-path';
    const clipPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', clipPathId);
    
    const clipRect = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    clipRect.setAttribute('width', '100%');
    clipRect.setAttribute('height', '100%');
    clipPath.appendChild(clipRect);
    
    // Add the clip path to the <defs> section of the SVG
    let defs = svgDoc.getElementsByTagName('defs')[0];
    if (!defs) {
      defs = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgElement.prepend(defs);
    }
    defs.appendChild(clipPath);

    // Apply the clipping path to all top-level graphical elements
    const topLevelElements = Array.from(svgElement.children).filter(
        (child) => ['g', 'path', 'rect', 'circle', 'line', 'text'].includes(child.tagName.toLowerCase())
    );
    topLevelElements.forEach(el => el.setAttribute('clip-path', `url(#${clipPathId})`));


    // 3. Apply professional styling to all elements
    const allElements = svgDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        
        // Set a professional, sans-serif font for all text
        if (el.tagName.toLowerCase() === 'text') {
            el.setAttribute('font-family', "'Inter', sans-serif"); // Using Inter from your index.html
            el.setAttribute('font-size', '6px'); // Keep font size small and consistent
            el.setAttribute('font-weight', 'normal'); // Ensure text is not bold
            el.setAttribute('textLength', '100%'); // Fit text to its container
            el.setAttribute('lengthAdjust', 'spacingAndGlyphs'); // Adjust spacing to fit
        }

        // Standardize strokes for a cleaner look
        if (el.hasAttribute('stroke')) {
            el.setAttribute('stroke', '#333'); // A dark grey for all strokes
            el.setAttribute('stroke-width', '0.5'); // A thin, consistent stroke width
        }
    }

    // 4. Serialize the modified SVG back to a string
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
  } catch (error) {
    console.error("Could not parse or process SVG:", error);
    return cleanedSvg; // Fallback to the cleaned string
  }
};


/**
 * Helper function to remove duplicated lines from AI output.
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
    // FIX: Use the new, more robust SVG processing function.
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
    
    // The AI prompt now handles escaping correctly, so we no longer need
    // to process \\n or \\" here. We will just process the escaped backslashes in the LaTeX.
    // This looks for an even number of backslashes and replaces them with half that many.
    // e.g., `\\frac` becomes `\frac`, and `\\\\` becomes `\\`.
    const normalizedText = unescapedText.replace(/\\\\/g, '\\');
    
    let processedText = normalizedText;

    // FIX: Replace single newlines with a markdown hard line break (two spaces + newline)
    // This ensures that newlines are correctly rendered as line breaks instead of being ignored.
    processedText = processedText.replace(/\n(?!\n)/g, '  \n');

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
