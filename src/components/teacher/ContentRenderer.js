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
    // Decode incorrectly escaped Unicode sequences that the AI may generate.
    const unescapedText = text.replace(/\\u([\dA-F]{4})/gi, (match, grp) =>
      String.fromCharCode(parseInt(grp, 16))
    );
    
    // ✅ BAND-AID FIX: Add this line to clean up escaped quotation marks.
    const cleanText = unescapedText.replace(/\\"/g, '"');
    
    // Use the new `cleanText` variable for the next operation.
    const normalizedText = cleanText.replace(/\\n/g, '\n');
    let processedText = normalizedText.replace(/\n/g, '  \n');

    // FIX: Sanitize the text to remove code block fences (```) that the AI
    // sometimes adds around regular paragraphs.
    const trimmedText = processedText.trim();
    if (trimmedText.startsWith('```') && trimmedText.endsWith('```')) {
      // Remove the first and last ```, then trim any resulting whitespace.
      processedText = trimmedText.substring(3, trimmedText.length - 3).trim();
    }


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