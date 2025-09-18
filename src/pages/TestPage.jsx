// src/components/teacher/TestRenderer.js

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';

// This is the text we want to render. It's placed here directly for testing.
const lessonText = `
### The Formula
The solution or "roots" for *x* can be found using the following formula:
$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$
The part of the formula inside the square root, $\\Delta = b^2 - 4ac$, is called the discriminant.

### Example
Let's solve the equation $2x^2 - 5x - 3 = 0$.
* $a = 2$, $b = -5$, $c = -3$
* Substitute into the formula: $x = \\frac{-(-5) \\pm \\sqrt{(-5)^2 - 4(2)(-3)}}{2(2)}$
* Simplify: $x = \\frac{5 \\pm \\sqrt{49}}{4}$
* The two roots are $x = 3$ and $x = -\\frac{1}{2}$.
`;


// This is the renderer component.
const ContentRenderer = ({ text }) => {
  if (typeof text !== 'string') return null;

  // Note: No sanitizer is used here because the text above is already clean.
  // We double escape backslashes in the hardcoded string.
  const processedText = text;

  return (
    <div className="prose max-w-none p-8">
      <ReactMarkdown
        children={processedText}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
      />
    </div>
  );
};


// The final test component that uses the renderer.
export default function TestRenderer() {
  return (
    <div>
      <h1 style={{ padding: '2rem' }}>Test Page for Content Renderer</h1>
      <hr />
      <ContentRenderer text={lessonText} />
    </div>
  );
}