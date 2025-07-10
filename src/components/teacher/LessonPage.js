// src/components/teacher/LessonPage.js

import React from 'react';
import ContentRenderer from './ContentRenderer';

const LessonPage = ({ page }) => {
    if (!page || typeof page.content !== 'string') return null;

    // ✅ FIX: Intelligently detect if the content is raw HTML or Markdown.
    // HTML content from your ULP/ATG will start with '<table...>'
    const isHtmlContent = page.content.trim().startsWith('<');

    return (
        <div className="mb-6 last:mb-0">
            <h4 className="font-semibold text-gray-700 mb-2">{page.title || 'Untitled Page'}</h4>
            
            {/* This now passes the content to the correct prop based on its type.
              - 'htmlContent' is used for ULP/ATG tables.
              - 'text' is used for student lesson Markdown content.
            */}
            {isHtmlContent ? (
                <ContentRenderer htmlContent={page.content} />
            ) : (
                <ContentRenderer text={page.content} />
            )}
        </div>
    );
};

export default LessonPage;