// src/components/teacher/LessonPage.js

import React from 'react';
import ContentRenderer from './ContentRenderer';

const LessonPage = ({ page }) => {
  if (!page || typeof page.content !== 'string') {
    return null;
  }

  // --- 1. Check for SVG Diagram Pages ---
  if (page.type === 'diagram') {
    return (
      <div className="mb-6 last:mb-0 p-4 border rounded-lg bg-slate-50">
        <h4 className="font-semibold text-gray-700 mb-3">{page.title || 'Untitled Diagram'}</h4>
        {/* This div will render the raw SVG string from the AI */}
        <div 
          className="flex justify-center items-center" 
          dangerouslySetInnerHTML={{ __html: page.content }} 
        />
      </div>
    );
  }
  
  // --- 2. Handle Text or HTML Pages (Your existing logic) ---
  // Intelligently detect if the content is raw HTML or standard text/Markdown.
  const isHtmlContent = page.content.trim().startsWith('<');

  return (
    <div className="mb-6 last:mb-0">
      <h4 className="font-semibold text-gray-700 mb-2">{page.title || 'Untitled Page'}</h4>
      
      {/* Pass content to the ContentRenderer based on its detected format */}
      {isHtmlContent ? (
        <ContentRenderer htmlContent={page.content} />
      ) : (
        <ContentRenderer text={page.content} />
      )}
    </div>
  );
};

export default LessonPage;