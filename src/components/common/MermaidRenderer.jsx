// components/MermaidRenderer.js
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const MermaidRenderer = ({ code }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      try {
        mermaid.initialize({ startOnLoad: false });
        mermaid.render('generated-mermaid', code, (svgCode) => {
          ref.current.innerHTML = svgCode;
        });
      } catch (err) {
        console.error('Mermaid render error:', err);
        ref.current.innerHTML = `<pre>${code}</pre>`;
      }
    }
  }, [code]);

  return <div ref={ref} className="overflow-x-auto" />;
};

export default MermaidRenderer;
