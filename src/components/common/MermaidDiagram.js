// src/components/common/MermaidDiagram.js
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { v4 as uuidv4 } from 'uuid'; // npm install uuid

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#f4f4f4',
    primaryTextColor: '#333',
    lineColor: '#555',
  }
});

const MermaidDiagram = ({ chart }) => {
  const containerRef = useRef(null);
  const chartId = `mermaid-chart-${uuidv4()}`;

  useEffect(() => {
    if (chart && containerRef.current) {
      mermaid.render(chartId, chart)
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        })
        .catch(err => {
          console.error("Error rendering Mermaid chart:", err);
          if (containerRef.current) {
            containerRef.current.innerHTML = "Error rendering diagram.";
          }
        });
    }
  }, [chart, chartId]);

  return <div ref={containerRef} className="mermaid-diagram-container w-full flex justify-center p-4" />;
};

export default MermaidDiagram;