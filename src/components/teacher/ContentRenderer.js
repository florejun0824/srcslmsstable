// src/components/teacher/ContentRenderer.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'katex/dist/katex.min.css';

// --- SVG cleaner (No changes needed) ---
const processSvgContent = (svgString) => {
  // ... (rest of the function is unchanged)
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

// --- Helper functions (No changes needed) ---
const removeDuplicateLines = (text) => {
    // ... (rest of the function is unchanged)
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
    // ... (rest of the function is unchanged)
    if (!text) return '';
    let normalized = text;
    normalized = normalized.replace(/°/g, '^\\circ');
    normalized = normalized.replace(/\\degree/g, '^\\circ');
    return normalized;
};


// ✅ --- NEW HELPER: Get all text from a node and its children ---
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


export default function ContentRenderer({ htmlContent, text }) {
    // ... (Diagram and SVG logic is unchanged)
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

    if (htmlContent && typeof htmlContent === 'string') {
        const sanitizedHtml = processSvgContent(htmlContent);
        return (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
    }
    
    // --- Markdown Rendering ---
    if (text && typeof text === 'string') {
        let processedText = text;

        if (processedText.trim().startsWith('```mermaid')) {
            processedText = processedText
            .replace(/^```mermaid/, '')
            .replace(/```$/, '')
            .trim();
        }

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
                            // ✅ Use the robust helper function to get text
                            const textContent = getNodeText(node);
                            
                            // ✅ Determine style class based on content
                            let styleClass = 'border-blue-500 bg-blue-50 text-blue-800'; // Default info style
                            if (textContent.toLowerCase().includes('tip:')) {
                                styleClass = 'border-green-500 bg-green-50 text-green-800';
                            } else if (textContent.toLowerCase().includes('warning:')) {
                                styleClass = 'border-yellow-500 bg-yellow-50 text-yellow-800';
                            }
                            
                            // ✅ Apply the correct styleClass and REMOVE `not-italic`
                            return <blockquote className={`border-l-4 p-4 my-4 rounded-md ${styleClass}`} {...props} />;
                        },
                        strong: ({ node, ...props }) => {
                            return <strong className="font-bold text-slate-800" {...props} />;
                        },
                        img: ({ node, ...props }) => (
                            <img {...props} alt="" className="max-w-full" />
                        ),
                    }}
                />
            </div>
        );
    }

    return null;
}