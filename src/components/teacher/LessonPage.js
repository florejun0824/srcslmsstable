import React from 'react';
// import MermaidDiagram from '../common/MermaidDiagram'; // ⬅️ This is no longer needed
import ContentRenderer from './ContentRenderer';

const LessonPage = ({ page }) => {
  // Return null if the page or its content is invalid to prevent errors
  if (!page || typeof page.content !== 'string') {
    return null;
  }

  // Use a switch to handle different page types for better organization
  switch (page.type) {
    // ✅ --- This case now handles both 'diagram-data' (for new SVGs) and 'diagram' (for backward compatibility) ---
    case 'diagram-data':
    case 'diagram':
      return (
        <div className="mb-6 last:mb-0 p-4 border rounded-lg bg-slate-50">
          <h4 className="font-semibold text-gray-700 mb-3">{page.title || 'Untitled Diagram'}</h4>
          <div
            className="flex justify-center items-center w-full"
            dangerouslySetInnerHTML={{ __html: page.content }} // This renders the raw SVG
          />
        </div>
      );

    // --- This handles all other text or HTML content ---
    case 'text':
    default:
      const isHtmlContent = page.content.trim().startsWith('<');
      return (
        <div className="mb-6 last:mb-0">
          <h4 className="font-semibold text-gray-700 mb-2">{page.title || 'Untitled Page'}</h4>
          {isHtmlContent ? (
            <ContentRenderer htmlContent={page.content} />
          ) : (
            <ContentRenderer text={page.content} />
          )}
        </div>
      );
  }
};

export default LessonPage;