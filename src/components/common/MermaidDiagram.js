import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

// Basic configuration for the Mermaid library
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral', // You can choose themes like 'default', 'forest', 'dark'
  securityLevel: 'loose', // Allows the diagrams to be rendered
  fontFamily: '"-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"',
});

const MermaidDiagram = ({ chartDefinition }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (chartDefinition && containerRef.current) {
      try {
        // Generate a unique ID for each diagram to prevent conflicts
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
        
        // Render the diagram code into SVG
        mermaid.render(id, chartDefinition, (svgCode) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svgCode;
          }
        });
      } catch (error) {
        console.error("Error rendering Mermaid diagram:", error);
        if (containerRef.current) {
          containerRef.current.innerHTML = "Error rendering diagram.";
        }
      }
    }
  }, [chartDefinition]); // Re-render whenever the diagram code changes

  // Using the diagram code as a key forces React to re-mount the component
  // when the code changes, which helps avoid some rendering glitches.
  return <div key={chartDefinition} ref={containerRef} />;
};

export default MermaidDiagram;