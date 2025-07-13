import React from 'react';
import ContentRenderer from './ContentRenderer';

const LessonPage = ({ page }) => {
  // Return null if the page or its content is invalid to prevent errors
  if (!page || typeof page.content !== 'string') {
    return null;
  }

  // ✅ This logic checks if the title exists and is not just empty spaces.
  const shouldRenderTitle = page.title && page.title.trim() !== '';

  // Use a switch to handle different page types for better organization
  switch (page.type) {
    case 'diagram-data':
    case 'diagram':
      return (
        <div className="mb-6 last:mb-0 p-4 border rounded-lg bg-slate-50">
          {/* The title will only be rendered if it passes the check above. */}
          {shouldRenderTitle && (
            <h4 className="font-semibold text-gray-700 mb-3">{page.title}</h4>
          )}
          <div
            className="flex justify-center items-center w-full"
            dangerouslySetInnerHTML={{ __html: page.content }} // This renders the raw SVG
          />
        </div>
      );

    case 'text':
    default:
      const isHtmlContent = page.content.trim().startsWith('<');
      return (
        <div className="mb-6 last:mb-0">
          {/* The same conditional logic is applied here. */}
          {shouldRenderTitle && (
            <h4 className="font-semibold text-gray-700 mb-2">{page.title}</h4>
          )}
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