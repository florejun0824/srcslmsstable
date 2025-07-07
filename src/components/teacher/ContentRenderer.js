import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeMermaid from 'rehype-mermaidjs';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

// The sanitizeText function has been REMOVED.

export default function ContentRenderer({ text = '' }) {
  return (
    <div className="content-renderer prose max-w-full">
      <ReactMarkdown
        children={text} // Pass the raw, unmodified text directly
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