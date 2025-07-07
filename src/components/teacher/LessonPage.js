// src/components/teacher/LessonPage.js

import React from 'react';
import ContentRenderer from './ContentRenderer';

const LessonPage = ({ page }) => {
  if (!page || typeof page.content !== 'string') return null;

  // Only wrap actual mermaid code if not already fenced properly
  const cleanedContent = page.content.replace(/^\s*mermaid\s*\n/, '```mermaid\n').replace(/(?<!`)mermaid\n([\s\S]+?)(?=\n\S|\n$)/g, '```mermaid\n$1\n```');

  return (
    <div className="mb-6 last:mb-0">
      <h4 className="font-semibold text-gray-700 mb-2">{page.title || 'Untitled Page'}</h4>
      <ContentRenderer text={cleanedContent} />
    </div>
  );
};

export default LessonPage;
