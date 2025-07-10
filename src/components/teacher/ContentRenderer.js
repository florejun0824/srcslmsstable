// src/components/teacher/ContentRenderer.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
// Note: rehype-mermaidjs is removed as it can be complex to set up. Add it back if you use mermaid diagrams.

// This new version can handle raw HTML or Markdown text.
export default function ContentRenderer({ htmlContent, text }) {
  
  // --- Priority 1: If raw HTML content is provided, render it directly ---
  if (htmlContent && typeof htmlContent === 'string') {
    return (
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  // --- Priority 2: If Markdown text is provided, process and render it ---
  if (text && typeof text === 'string') {
    // These steps are for formatting Markdown correctly.
    const normalizedText = text.replace(/\\n/g, '\n');
    const processedText = normalizedText.replace(/\n/g, '  \n');

    return (
      <div className="content-renderer prose max-w-full">
        <ReactMarkdown
          children={processedText}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]} // Removed mermaid for simplicity
          components={{
            strong: ({ node, ...props }) => {
              if (props.children && typeof props.children[0] === 'string' && props.children[0].includes('___')) {
                return <span className="font-normal tracking-widest text-blue-500">{props.children}</span>;
              }
              return <strong {...props} />;
            },
            img: ({ node, ...props }) => <img {...props} alt="" className="max-w-full" />,
            svg: ({ node, ...props }) => <svg {...props} className="max-w-full" />,
          }}
        />
      </div>
    );
  }

  // --- Fallback: If no valid content is provided, render nothing ---
  return null;
}