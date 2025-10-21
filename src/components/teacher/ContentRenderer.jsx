// src/components/teacher/ContentRenderer.js

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';

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
  // ✅ FIX: Replace both complex and simple broken Peso sign commands.
  normalized = normalized.replace(/\\text{\\char`\\₱}/g, '₱');
  normalized = normalized.replace(/\\₱/g, '₱');
  
  normalized = normalized.replace(/°/g, '^\\circ');
  normalized = normalized.replace(/\\degree/g, '^\\circ');
  return normalized;
};

// ✅ Robust helper: extract plain text from node tree
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

// ✅ Mermaid Renderer Component
const MermaidRenderer = ({ code }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      try {
        mermaid.initialize({ startOnLoad: false });
        mermaid.contentLoaded();
        mermaid.init(undefined, ref.current);
      } catch (e) {
        console.error('Mermaid render failed:', e);
      }
    }
  }, [code]);

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
      return (
        <div className="diagram-renderer flex flex-col items-center my-4">
          <img
            src={text.generatedImageUrl}
            alt="Generated diagram"
            className="max-w-full rounded shadow"
          />
          {Array.isArray(text.labels) && text.labels.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
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
    // Detect Mermaid inside HTML
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
    
    // ✅ FIX: Replace non-breaking spaces (\u00A0) with regular spaces to fix list rendering.
    processedText = processedText.replace(/\u00A0/g, ' ');

    // ✅ Find SVG code wrapped in markdown fences (```) and unwrap it.
    processedText = processedText.replace(
      /```(html)?\s*(<svg[\s\S]*?<\/svg>)\s*```/gi,
      '$2'
    );
    
    // ✅ Find SVG code prefixed with an `html` keyword, unescape its quotes,
    // and trim leading whitespace from each line to fix parsing errors.
    processedText = processedText.replace(
        /(?:^|\n)html\s*\n(<svg[\s\S]*?<\/svg>)/gi,
        (match, svgContent) => {
            // Unescape quotes
            let cleanedSvg = svgContent.replace(/\\"/g, '"');
            // Remove leading whitespace/invisible characters from each line
            cleanedSvg = cleanedSvg.split('\n').map(line => line.trim()).join('\n');
            return cleanedSvg;
        }
    );

    // ✅ Handle Mermaid code blocks
    if (processedText.trim().startsWith('```mermaid')) {
      processedText = processedText
        .replace(/^```mermaid/, '')
        .replace(/```$/, '')
        .trim();
      return <MermaidRenderer code={processedText} />;
    }

    // ✅ Handle "html" prefixes (inline at the start) - This is a fallback
    if (/^html\s*\n/i.test(processedText.trim())) {
      processedText = processedText.replace(/^html\s*\n?/i, '');
    }

    // ✅ Handle inline "html <svg>" snippets inside text
    processedText = processedText.replace(
      /\bhtml\s*<svg([\s\S]*?)<\/svg>/gi,
      '<svg$1</svg>'
    );

    // ✅ Handle ```html fenced blocks
    if (/^```html/i.test(processedText.trim())) {
      processedText = processedText
        .replace(/^```html/i, '') // strip opening fence
        .replace(/```$/, '')     // strip closing fence
        .trim();

      // If it contains Mermaid code
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

    // Decode unicode escapes like \u221e → ∞
    const unescapedText = processedText.replace(/\\u([\dA-F]{4})/gi, (match, grp) =>
      String.fromCharCode(parseInt(grp, 16))
    );

    processedText = unescapedText;
    processedText = removeDuplicateLines(processedText);
    processedText = normalizeLatex(processedText);

    return (
      <div className="content-renderer prose max-w-full">
        <ReactMarkdown
          children={processedText}
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
          rehypePlugins={[rehypeRaw, rehypeKatex]}
          components={{
            blockquote: ({ node, ...props }) => {
              const textContent = getNodeText(node);
              let styleClass = 'border-blue-500 bg-blue-50 text-blue-800';
              if (textContent.toLowerCase().includes('tip:')) {
                styleClass = 'border-green-500 bg-green-50 text-green-800';
              } else if (textContent.toLowerCase().includes('warning:')) {
                styleClass = 'border-yellow-500 bg-yellow-50 text-yellow-800';
              }
              return (
                <blockquote
                  className={`border-l-4 p-4 my-4 rounded-md ${styleClass}`}
                  {...props}
                />
              );
            },
            strong: ({ node, ...props }) => {
              return <strong className="font-bold text-slate-800" {...props} />;
            },
            img: ({ node, ...props }) => (
              <img {...props} alt="" className="max-w-full" />
            ),
            svg: ({ node, ...props }) => (
              <div className="overflow-x-auto flex justify-center my-4 not-prose">
                <svg {...props} />
              </div>
            ),
            div: ({ node, ...props }) => {
              // Auto-detect Mermaid inside Markdown HTML
              if (props.className && props.className.includes('mermaid')) {
                return <MermaidRenderer code={getNodeText(node)} />;
              }
              return <div className="overflow-x-auto my-2" {...props} />;
            },
          }}
        />
      </div>
    );
  }

  return null;
}