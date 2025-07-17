// src/components/teacher/ContentRenderer.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

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
    const normalizedText = text.replace(/\\n/g, '\n');
    const processedText = normalizedText.replace(/\n/g, '  \n');

    return (
      <div className="content-renderer prose max-w-full">
        <ReactMarkdown
          children={processedText}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]} // This plugin correctly handles SVG rendering now
          components={{
            // The custom rule for 'strong' tags remains unchanged.
            strong: ({ node, ...props }) => {
              if (props.children && typeof props.children[0] === 'string' && props.children[0].includes('___')) {
                return <span className="font-normal tracking-widest text-blue-500">{props.children}</span>;
              }
              return <strong {...props} />;
            },
            // The custom rule for 'img' tags remains unchanged.
            img: ({ node, ...props }) => <img {...props} alt="" className="max-w-full" />,
            // ✅ FIXED: The faulty 'svg' override has been removed.
            // rehype-raw will now handle rendering SVG diagrams correctly.
          }}
        />
      </div>
    );
  }

  // --- Fallback: If no valid content is provided, render nothing ---
  return null;
}