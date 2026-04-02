// src/components/teacher/ContentRenderer.js

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
// mermaid is now dynamically imported inside MermaidRenderer to save ~15MB
import { ChevronDownIcon } from '@heroicons/react/24/solid';

// --- API KEY RETRIEVAL ---
const POLLINATIONS_API_KEY = (import.meta && import.meta.env && import.meta.env.VITE_POLLINATIONS_API_KEY) 
    || process.env.REACT_APP_POLLINATIONS_API_KEY 
    || 'YOUR_API_KEY_MISSING';

// --- CSS OVERRIDES: FIX INDEX.CSS CONFLICTS ---
const katexDarkFix = `
  .content-renderer .katex {
    color: inherit !important;
    font-size: 1.1em;
  }
  
  /* 1. Fix the "roof" of the square root (vinculum) */
  .content-renderer .katex .sqrt > .root {
    border-top-color: currentColor !important;
  }
  
  /* 2. Fix fraction bars */
  .content-renderer .katex .frac-line {
    border-bottom-color: currentColor !important;
  }
  
  /* 3. CRITICAL FIX: NEUTRALIZE GLOBAL INDEX.CSS CONFLICT */
  .content-renderer .katex svg {
    display: inline-block !important; /* Override 'display: block' */
    width: auto !important;           /* Override 'width: 100%' */
    height: auto !important;          /* Let KaTeX control height via attributes */
    max-width: none !important;       /* Remove 'max-width: 600px' limit */
    margin: 0 !important;             /* Remove 'margin: auto' centering */
    
    /* Restore KaTeX's specific positioning for the radical hook */
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
  }

  /* 4. Ensure the SVG path (the hook itself) is visible */
  .content-renderer .katex path {
    fill: currentColor !important;
    stroke: none !important;
    fill-opacity: 1 !important;
  }

  /* Ensure proper spacing and scrolling in display mode for large matrices */
  .content-renderer .katex-display {
    margin: 1em 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 0.5em; /* Prevent scrollbar clipping */
  }
`;

// --- HELPER: Google Drive Image Fixer ---
const convertGoogleDriveLink = (url) => {
  if (!url) return '';
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  return url;
};

// --- NEW HELPER: Markdown Image URL Fixer & Retroactive Key Swapper ---
const fixMarkdownImages = (text) => {
  if (!text) return '';
  // RegEx looks for ![alt](url)
  return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    // 1. CLEANING: Remove accidental spaces/newlines and escape quotes
    // This fixes issues caused by sanitizeLessonText.js newline-to-space conversion
    let fixedUrl = url.replace(/\s+/g, '').replace(/"/g, '%22');
    
    // 2. THE MODEL FIX: Force 'flux' model for your publishable key (pk_)
    // This prevents the "Model 'zimage' is not allowed" 403 error
    if (fixedUrl.includes('pollinations.ai') && !fixedUrl.includes('model=')) {
        fixedUrl = fixedUrl.replace('?', '?model=flux&');
    }

    // 3. THE KEY FIX: Hot-swap old/broken sk_ keys for the clean .env key
    if (fixedUrl.includes('key=')) {
        fixedUrl = fixedUrl.replace(/key=[^&)]+/, `key=${POLLINATIONS_API_KEY}`);
    }

    return `![${alt}](${fixedUrl})`;
  });
};

// --- HELPER: The "Healer" (Fixes Broken Table Rows) ---
const healBrokenMarkdown = (text) => {
  if (!text) return '';

  const rawLines = text.split(/\r?\n/);
  const healedLines = [];
  let insideTable = false;

  const isSeparator = (str) => /^\|?[\s-:]+\|[\s-:]+\|?$/.test(str.trim());

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();

    if (!insideTable && rawLines[i + 1] && isSeparator(rawLines[i + 1])) {
      insideTable = true;
    }

    if (insideTable) {
      if (line === '') {
        insideTable = false;
        healedLines.push(line);
        continue;
      }

      if (line.startsWith('|')) {
        healedLines.push(line);
      } else {
        if (healedLines.length > 0) {
          healedLines[healedLines.length - 1] += ' ' + line;
        }
      }
    } else {
      healedLines.push(line);
    }
  }

  return healedLines.join('\n');
};

// --- SVG cleaner ---
const processSvgContent = (svgString) => {
  let cleanedSvg = svgString.replace(/\$/g, '');
  cleanedSvg = cleanedSvg.replace(/\\delta\^\{?-\}?/g, 'δ-');
  cleanedSvg = cleanedSvg.replace(/\\delta\^\{?\+\}?/g, 'δ+');
  cleanedSvg = cleanedSvg.replace(/Na\^\{?\+\}?/g, 'Na⁺');
  cleanedSvg = cleanedSvg.replace(/Cl\^\{?-\}?/g, 'Cl⁻');

  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(cleanedSvg, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    if (!svgElement.getAttribute('viewBox')) {
      const width = svgElement.getAttribute('width');
      const height = svgElement.getAttribute('height');
      if (width && height) {
        svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgDoc);
  } catch (error) {
    console.error('Could not parse or process SVG:', error);
    return cleanedSvg;
  }
};

// --- Helper functions ---
const removeDuplicateLines = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const uniqueLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].trim() !== '' &&
      lines[i].trim() !== (lines[i - 1] || '').trim()
    ) {
      uniqueLines.push(lines[i]);
    } else if (
      lines[i].trim() === '' &&
      (uniqueLines[uniqueLines.length - 1] || '').trim() !== ''
    ) {
      uniqueLines.push(lines[i]);
    }
  }
  return uniqueLines.join('\n');
};

const normalizeLatex = (text) => {
  if (!text) return '';
  let normalized = text;

  // DELIMITER NORMALIZATION
  normalized = normalized.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  normalized = normalized.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // FIXES
  normalized = normalized.replace(/\\text{\\char`\\₱}/g, '₱');
  normalized = normalized.replace(/\\₱/g, '₱');
  normalized = normalized.replace(/\\degree/g, '°');
  normalized = normalized.replace(/\^\\\circ/g, '°');

  // SYMBOL FALLBACKS
  normalized = normalized.replace(/\\ne /g, '≠ ');
  normalized = normalized.replace(/\\neq /g, '≠ ');
  normalized = normalized.replace(/\\le /g, '≤ ');
  normalized = normalized.replace(/\\ge /g, '≥ ');
  normalized = normalized.replace(/\\times /g, '× ');
  normalized = normalized.replace(/\\div /g, '÷ ');
  normalized = normalized.replace(/\\approx /g, '≈ ');
  normalized = normalized.replace(/\\infty /g, '∞ ');

  return normalized;
};

// Extract plain text from node tree
const getNodeText = (node) => {
  if (!node) return '';
  if (node.type === 'text') {
    return node.value || '';
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(getNodeText).join('');
  }
  return '';
};

// Mermaid Renderer Component
const MermaidRenderer = ({ code }) => {
  const ref = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderMermaid = async () => {
      if (!ref.current) return;
      try {
        const mermaid = (await import('mermaid')).default;
        if (cancelled) return;
        mermaid.initialize({ startOnLoad: false });
        mermaid.contentLoaded();
        mermaid.init(undefined, ref.current);
      } catch (e) {
        console.error('Mermaid render failed:', e);
        if (!cancelled) setError(true);
      }
    };

    renderMermaid();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="overflow-x-auto flex justify-center my-4">
        <pre className="text-sm text-gray-500">{code}</pre>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto flex justify-center my-4">
      <div
        className="mermaid"
        ref={ref}
        dangerouslySetInnerHTML={{ __html: code }}
      />
    </div>
  );
};

export default function ContentRenderer({ htmlContent, text }) {
  // --- Diagram renderer logic ---
  if (text && typeof text === 'object' && text.diagram_prompt) {
    if (text.generatedImageUrl) {
      const processedUrl = convertGoogleDriveLink(text.generatedImageUrl);
      return (
        <div className="diagram-renderer flex flex-col items-center my-4">
          <img
            src={processedUrl}
            alt="Generated diagram"
            className="max-w-full rounded shadow"
            referrerPolicy="no-referrer"
          />
          {Array.isArray(text.labels) && text.labels.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              {text.labels.map((label, idx) => (
                <li key={idx}>{label}</li>
              ))}
            </ul>
          )}
        </div>
      );
    } else {
      return (
        <div className="diagram-placeholder flex flex-col items-center justify-center border border-dashed border-gray-400 rounded-lg p-6 text-gray-500 my-4">
          <span className="italic">Diagram pending generation…</span>
        </div>
      );
    }
  }

  // --- Raw HTML content (e.g., svg) ---
  if (htmlContent && typeof htmlContent === 'string') {
    if (/<div[^>]*class=["']?mermaid["']?[^>]*>([\s\S]*?)<\/div>/i.test(htmlContent)) {
      const match = htmlContent.match(/<div[^>]*class=["']?mermaid["']?[^>]*>([\s\S]*?)<\/div>/i);
      const mermaidCode = match ? match[1] : '';
      return <MermaidRenderer code={mermaidCode} />;
    }

    const sanitizedHtml = processSvgContent(htmlContent);
    return (
      <div
        className="prose max-w-none overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // --- Markdown Rendering ---
  if (text && typeof text === 'string') {
    let processedText = text;

    // --- 🚨 APPLY THE FIXERS FIRST 🚨 ---
    processedText = fixMarkdownImages(processedText);
    processedText = healBrokenMarkdown(processedText);

    // Replace non-breaking spaces
    processedText = processedText.replace(/\u00A0/g, ' ');

    // Find SVG code wrapped in markdown fences
    processedText = processedText.replace(
      /```(html)?\s*(<svg[\s\S]*?<\/svg>)\s*```/gi,
      '$2'
    );

    // Find SVG code prefixed with html
    processedText = processedText.replace(
      /(?:^|\n)html\s*\n(<svg[\s\S]*?<\/svg>)/gi,
      (match, svgContent) => {
        let cleanedSvg = svgContent.replace(/\\"/g, '"');
        cleanedSvg = cleanedSvg.split('\n').map(line => line.trim()).join('\n');
        return cleanedSvg;
      }
    );

    // Handle Mermaid code blocks
    if (processedText.trim().startsWith('```mermaid')) {
      processedText = processedText
        .replace(/^```mermaid/, '')
        .replace(/```$/, '')
        .trim();
      return <MermaidRenderer code={processedText} />;
    }

    // Handle "html" prefixes
    if (/^html\s*\n/i.test(processedText.trim())) {
      processedText = processedText.replace(/^html\s*\n?/i, '');
    }

    // Handle inline "html <svg>"
    processedText = processedText.replace(
      /\bhtml\s*<svg([\s\S]*?)<\/svg>/gi,
      '<svg$1</svg>'
    );

    // Handle ```html fenced blocks
    if (/^```html/i.test(processedText.trim())) {
      processedText = processedText
        .replace(/^```html/i, '')
        .replace(/```$/, '')
        .trim();

      if (/<div[^>]*class=["']?mermaid["']?[^>]*>([\s\S]*?)<\/div>/i.test(processedText)) {
        const match = processedText.match(/<div[^>]*class=["']?mermaid["']?[^>]*>([\s\S]*?)<\/div>/i);
        const mermaidCode = match ? match[1] : '';
        return <MermaidRenderer code={mermaidCode} />;
      }

      return (
        <div
          className="prose max-w-none overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: processedText }}
        />
      );
    }

    // Decode unicode escapes
    const unescapedText = processedText.replace(/\\u([\dA-F]{4})/gi, (match, grp) =>
      String.fromCharCode(parseInt(grp, 16))
    );

    processedText = unescapedText;
    processedText = removeDuplicateLines(processedText);
    processedText = normalizeLatex(processedText);

    return (
      <div className="content-renderer prose max-w-full dark:prose-invert">
        <style>{katexDarkFix}</style>

        <ReactMarkdown
          children={processedText}
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
          rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false, throwOnError: false }]]}
          components={{
            blockquote: ({ node, ...props }) => {
              const textContent = getNodeText(node);
              let styleClass = 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200';
              if (textContent.toLowerCase().includes('tip:')) {
                styleClass = 'border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-900/30 dark:text-green-200';
              } else if (textContent.toLowerCase().includes('warning:')) {
                styleClass = 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-200';
              } else if (textContent.toLowerCase().includes('think about it:')) {
                styleClass = 'border-purple-500 bg-purple-50 text-purple-800 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-200';
              }
              return (
                <blockquote
                  className={`border-l-4 p-4 my-4 rounded-md ${styleClass}`}
                  {...props}
                />
              );
            },
            strong: ({ node, ...props }) => {
              return <strong className="font-bold text-slate-800 dark:text-slate-100" {...props} />;
            },
            img: ({ node, src, ...props }) => {
              let processedSrc = convertGoogleDriveLink(src);
              
              if (processedSrc.includes('pollinations.ai')) {
                  // Apply same robust healing as the pre-processor to cover all images
                  processedSrc = processedSrc.replace(/\s+/g, ''); 
                  if (!processedSrc.includes('model=')) {
                      processedSrc = processedSrc.replace('?', '?model=flux&');
                  }
                  if (processedSrc.includes('key=')) {
                      processedSrc = processedSrc.replace(/key=[^&)]+/, `key=${POLLINATIONS_API_KEY}`);
                  }
                  // Specific fix for AI trailing characters
                  processedSrc = processedSrc.replace(/\.%2C%20/g, '%2C%20'); 
              }

              return (
                <img
                  src={processedSrc}
                  {...props}
                  alt={props.alt || ""}
                  className="max-w-full rounded-lg shadow-sm my-4"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              );
            },
            svg: ({ node, ...props }) => (
              <div className="overflow-x-auto flex justify-center my-4 not-prose">
                <svg {...props} />
              </div>
            ),
            div: ({ node, ...props }) => {
              if (props.className && props.className.includes('mermaid')) {
                return <MermaidRenderer code={getNodeText(node)} />;
              }
              return <div className="overflow-x-auto my-2" {...props} />;
            },
            details: ({ node, ...props }) => {
              const summaryChild = props.children[0];
              const contentChildren = props.children.slice(1);
              return (
                <details
                  className="my-4 bg-neumorphic-base dark:bg-neumorphic-base-dark rounded-2xl shadow-neumorphic dark:shadow-lg group overflow-hidden"
                  {...props}
                >
                  {summaryChild}
                  <div className="p-4 pt-0">
                    <div className="p-4 rounded-xl bg-neumorphic-base dark:bg-neumorphic-base-dark shadow-neumorphic-inset dark:shadow-neumorphic-inset-dark prose max-w-full dark:prose-invert">
                      {contentChildren}
                    </div>
                  </div>
                </details>
              );
            },
            summary: ({ node, ...props }) => (
              <summary
                className="flex items-center justify-between p-4 cursor-pointer select-none list-none font-semibold text-gray-800 dark:text-slate-100 transition-all active:shadow-neumorphic-inset active:dark:shadow-neumorphic-inset-dark"
                {...props}
              >
                {props.children}
                <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-slate-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
            ),
          }}
        />
      </div>
    );
  }

  return null;
}