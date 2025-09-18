// src/components/teacher/PrintableLessonPage.js

import React, { useState, useEffect } from 'react';
import ContentRenderer from './ContentRenderer';

const PrintableLessonPage = ({ page }) => {
  const [embeddedImageUrl, setEmbeddedImageUrl] = useState(null);

  useEffect(() => {
    if (!page.imageUrl) {
      return;
    }

    fetch(page.imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEmbeddedImageUrl(reader.result);
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error("Could not embed image for PDF:", error);
      });
  }, [page.imageUrl]);

  return (
    <div className="mb-8 p-4 border-b border-gray-200" style={{ pageBreakInside: 'avoid' }}>
      <h3 className="font-bold text-lg mb-2" style={{ color: 'black' }}>{page.title}</h3>
      
      {embeddedImageUrl && (
        <div className="my-4 text-center">
          <img 
            src={embeddedImageUrl} 
            alt={page.title}
            style={{ maxWidth: '80%', height: 'auto', display: 'inline-block' }} 
          />
        </div>
      )}
      
      <div style={{ color: 'black' }}>
        <ContentRenderer text={page.content} />
      </div>
    </div>
  );
};

export default PrintableLessonPage;