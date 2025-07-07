import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeMermaid from 'rehype-mermaidjs';
import 'katex/dist/katex.min.css';

const sanitizeText = (text = '') =>
  text
    .replace(/a =\s*\\?ext\{[_]*\}/g, 'a = ___________')
    .replace(/\\?ext\{[_]*\}/g, '___________')
    .replace(/\\t_+/g, '___________')
    .replace(/\^\^?2/g, '²')
    .replace(/\^\^?3/g, '³')
    .replace(/\$(.*?)\\neq(.*?)\$/g, (_, a, b) => `$${a} \\ne ${b}$`)
    .replace(/\$(.*?)\\pm(.*?)\$/g, (_, a, b) => `$${a} \\pm ${b}$`)
    .replace(/\$(.*?)\\Delta(.*?)\$/g, (_, a, b) => `$${a} \\Delta ${b}$`)
    // Extra cleanups:
    .replace(/\$\\angle\s?([A-Z])\s*=\s*[_]+\$/g, '∠$1 = ___________')
    .replace(/\$(\w+\s*=\s*[_]+)\$/g, '$1');


export default function ContentRenderer({ text = '' }) {
  const containerRef = useRef();

  return (
    <div ref={containerRef} className="content-renderer prose max-w-full">
      <ReactMarkdown
        children={sanitizeText(text)}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw, rehypeMermaid]}
        components={{
          img: ({ node, ...props }) => <img {...props} alt="" className="max-w-full" />,
          svg: ({ node, ...props }) => <svg {...props} className="max-w-full" />,
        }}
      />
    </div>
  );
}
