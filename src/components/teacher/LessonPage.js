// src/components/teacher/LessonPage.js

import React from 'react';
import ContentRenderer from './ContentRenderer';

const LessonPage = ({ page }) => {
  // All image fetching logic and state has been removed.
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="font-semibold text-gray-700 mb-2">{page.title || 'Untitled Page'}</h4>
      <ContentRenderer text={page.content} />
    </div>
  );
};

export default LessonPage;