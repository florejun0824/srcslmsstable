import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeMermaid from 'rehype-mermaidjs';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

// The sanitizeText function has been REMOVED.

export default function ContentRenderer({ text }) { // Default value removed to handle explicitly
  
  // --- FIX: Ensure the input is always a string before processing ---
  // This handles cases where 'text' might be null, undefined, a boolean, or a number.
  const stringifiedText = String(text ?? '');

  // Process the guaranteed string
  const normalizedText = stringifiedText.replace(/\\n/g, '\n');
  const processedText = normalizedText.replace(/\n/g, '  \n');

  return (
    <div className="content-renderer prose max-w-full">
      <ReactMarkdown
        children={processedText} // Pass the processed, safe text
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw, rehypeMermaid]}
        components={{
          // Example: If you use bold for blanks, you can style it here
          strong: ({ node, ...props }) => {
            if (props.children.includes('___')) {
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