// src/components/teacher/LessonPage.js
import React, { useState, useEffect, useRef } from 'react';
import ContentRenderer from './ContentRenderer';
import { CheckCircleIcon, ArrowUturnLeftIcon, PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/solid';

/**
 * Converts a standard video URL (YouTube, .mp4) into an embeddable URL.
 * @param {string} url The original video URL.
 * @returns {string|null} The embeddable URL or null if invalid.
 */
const getVideoEmbedUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    let videoId;
    
    // YouTube: handles standard, shortened, and embed URLs
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch && youtubeMatch[1]) {
        videoId = youtubeMatch[1];
        return `http://googleusercontent.com/youtube.com/7{videoId}`;
    }

    // Direct video file
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return url;
    }

    return null;
};

/**
 * Renders a single page of a lesson, with interactive diagram editing.
 * Relies solely on provided URLs for images.
 */
const LessonPage = ({ page, isEditable, onFinalizeDiagram, isFinalizing }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
  
  const [diagramData, setDiagramData] = useState(null);
  const [labels, setLabels] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDrag, setActiveDrag] = useState(null);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState(null);
  const [editingLabelIndex, setEditingLabelIndex] = useState(null);
  const imageContainerRef = useRef(null);

  useEffect(() => {
    let pageContent = page.content;
    if (page.type === 'diagram-data' && typeof page.content === 'string') {
      try {
        pageContent = JSON.parse(page.content);
      } catch (e) {
        console.error("Failed to parse diagram data:", e);
        setError("Could not load diagram data.");
        return;
      }
    }
    
    setImageUrl(pageContent?.generatedImageUrl || null);
    setError(null);
    setDiagramData(pageContent || null);
    
    if (isEditable) {
        setIsEditing(true);
    }
    
    if (page && page.type === 'diagram-data' && pageContent) {
      const initialLabels = (pageContent.labels || []).map((label, index) => {
        if (typeof label === 'string') {
          return { text: label, labelX: 15, labelY: 10 + (index * 8), pointX: 50, pointY: 50, fontSize: 12, isPlaced: false };
        }
        return { fontSize: 12, ...label };
      });
      setLabels(initialLabels);
    }
  }, [page, isEditable]);

  const handleMouseDown = (index, part) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({ index, part });
    setSelectedLabelIndex(index);
  };

  const handleMouseMove = (e) => {
    if (activeDrag === null || !imageContainerRef.current) return;
    
    const { index, part } = activeDrag;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setLabels(prev => prev.map((label, i) => {
      if (i === index) {
        const newLabel = { ...label };
        if (part === 'label') {
          newLabel.labelX = x;
          newLabel.labelY = y;
        } else {
          newLabel.pointX = x;
          newLabel.pointY = y;
          newLabel.isPlaced = true;
        }
        return newLabel;
      }
      return label;
    }));
  };

  const handleMouseUp = () => setActiveDrag(null);

  const handleLabelClick = (index) => {
    if (!isEditing) return;
    setSelectedLabelIndex(index);
    setEditingLabelIndex(null);
  };

  const handleLabelDoubleClick = (index) => {
    if (!isEditing) return;
    setEditingLabelIndex(index);
  };

  const handleLabelTextChange = (e) => {
    const newText = e.target.value;
    setLabels(prev => prev.map((label, i) => i === editingLabelIndex ? { ...label, text: newText } : label));
  };

  const handleLabelTextBlur = () => {
    setEditingLabelIndex(null);
  };
  
  const handleFontSizeChange = (amount) => {
      if (selectedLabelIndex === null) return;
      setLabels(prev => prev.map((label, i) => i === selectedLabelIndex ? {...label, fontSize: Math.max(8, label.fontSize + amount)} : label));
  };

  const handleDeleteLabel = () => {
      if (selectedLabelIndex === null) return;
      setLabels(prev => prev.filter((_, i) => i !== selectedLabelIndex));
      setSelectedLabelIndex(null);
  };
  
  const handleAddLabel = () => {
    const newLabel = {
        text: 'New Label',
        labelX: 50,
        labelY: 50,
        pointX: 50,
        pointY: 50,
        fontSize: 12,
        isPlaced: false,
    };
    setLabels(prev => [...prev, newLabel]);
  };

  const handleFinalize = () => {
    setIsEditing(false);
    setSelectedLabelIndex(null);
    onFinalizeDiagram({ ...diagramData, labels: labels, generatedImageUrl: imageUrl });
  };
  
  const allLabelsPlaced = labels.every(l => l.isPlaced);

  if (!page || (typeof page.content !== 'string' && typeof page.content !== 'object')) return null;

  const shouldRenderTitle = page.title && page.title.trim() !== '';

  switch (page.type) {
    case 'video': {
      const embedUrl = getVideoEmbedUrl(page.content);
      const isDirectVideo = embedUrl && embedUrl.match(/\.(mp4|webm|ogg)$/i);

      return (
        <div className="my-6">
          {shouldRenderTitle && <h4 className="text-xl font-bold text-slate-700 mb-4">{page.title}</h4>}
          {embedUrl ? (
            isDirectVideo ? (
              <video controls className="w-full rounded-lg shadow-md aspect-video bg-black">
                <source src={embedUrl} type={`video/${embedUrl.split('.').pop()}`} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="aspect-w-16 aspect-h-9">
                <iframe
                  className="w-full h-full rounded-lg shadow-md"
                  src={embedUrl}
                  title={page.title || 'Lesson Video'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )
          ) : (
            <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
              Invalid or unsupported video URL. Please provide a valid YouTube or direct video (.mp4) link.
            </div>
          )}
        </div>
      );
    }

    case 'diagram-data':
      return (
        <div className="my-6 p-4 border-2 border-dashed rounded-lg bg-slate-50 select-none">
          {shouldRenderTitle && <h4 className="text-xl font-bold text-slate-700 mb-2">{page.title}</h4>}
          
          {isEditing && (
             <div className="p-3 mb-4 text-center bg-blue-100 border-2 border-blue-200 text-blue-800 rounded-md text-sm font-medium">
                <p className="font-bold">Interactive Label Instructions:</p>
                <p>Drag each blue dot to a point on the diagram, then position the green label text. Double-click text to rename.</p>
             </div>
          )}
          
          {error && <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>}
          
          {imageUrl && diagramData ? (
            <div 
              className="relative w-full max-w-3xl mx-auto"
              ref={imageContainerRef}
              onMouseMove={isEditing ? handleMouseMove : null}
              onMouseUp={isEditing ? handleMouseUp : null}
              onMouseLeave={isEditing ? handleMouseUp : null}
            >
              <img src={imageUrl} alt="Lesson Diagram" className="w-full h-auto rounded-md shadow-md bg-gray-200" draggable="false" />
              <svg className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
                {labels.map((label, index) => (
                  (label.isPlaced || !isEditing) && <g key={index}>
                    <line x1={`${label.labelX}%`} y1={`${label.labelY}%`} x2={`${label.pointX}%`} y2={`${label.pointY}%`} stroke="black" strokeWidth="2" strokeDasharray="4,3" />
                    <circle cx={`${label.pointX}%`} cy={`${label.pointY}%`} r="4" fill="red" stroke="white" strokeWidth="1" />
                  </g>
                ))}
              </svg>
              <div className="absolute top-0 left-0 w-full h-full">
                {labels.map((label, index) => (
                  <div key={index} onMouseDown={isEditing ? handleMouseDown(index, 'label') : null}
                    onClick={() => handleLabelClick(index)} onDoubleClick={() => handleLabelDoubleClick(index)}
                    className={`absolute p-1 rounded font-bold text-white shadow-lg ${isEditing ? 'cursor-move' : 'cursor-default'} ${label.isPlaced ? 'bg-green-600' : 'bg-blue-600'} ${selectedLabelIndex === index ? 'ring-2 ring-yellow-400' : ''}`}
                    style={{ left: `${label.labelX}%`, top: `${label.labelY}%`, transform: 'translate(-50%, -50%)', fontSize: `${label.fontSize}px`, pointerEvents: 'auto' }}>
                    {editingLabelIndex === index ? (
                        <input type="text" value={label.text} onChange={handleLabelTextChange} onBlur={handleLabelTextBlur} onKeyDown={e => e.key === 'Enter' && handleLabelTextBlur()} autoFocus className="bg-transparent text-white w-full outline-none border-b border-white"/>
                    ) : (
                        label.text
                    )}
                  </div>
                ))}
                {isEditing && labels.map((label, index) => (
                  !label.isPlaced && <div key={`point-${index}`}
                    className="absolute w-4 h-4 bg-blue-500 rounded-full animate-pulse cursor-move border-2 border-white"
                    style={{ left: `${label.pointX}%`, top: `${label.pointY}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
                    onMouseDown={handleMouseDown(index, 'point')}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 p-4 bg-slate-100 rounded-lg">
                Please provide an image URL in the lesson editor to display a diagram.
            </div>
          )}
          {/* ✅ FIX: Removed labels.length > 0 to ensure controls always show in edit mode with an image */}
          {isEditable && imageUrl && <div className="flex justify-center items-center flex-wrap gap-3 mt-4">
            {selectedLabelIndex !== null && isEditing && (
                <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-lg">
                    <button onClick={() => handleFontSizeChange(-1)} className="px-2 py-1 bg-white rounded shadow hover:bg-slate-100"><MinusIcon className="h-4 w-4"/></button>
                    <span className="text-xs font-semibold w-6 text-center">{labels[selectedLabelIndex]?.fontSize}pt</span>
                    <button onClick={() => handleFontSizeChange(1)} className="px-2 py-1 bg-white rounded shadow hover:bg-slate-100"><PlusIcon className="h-4 w-4"/></button>
                    <button onClick={handleDeleteLabel} className="px-2 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600 ml-2"><TrashIcon className="h-4 w-4"/></button>
                </div>
            )}
            {isEditing ? (
              <div className="flex items-center gap-3">
                <button onClick={handleAddLabel} disabled={isFinalizing} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400">
                    <PlusIcon className="h-5 w-5" /> Add Label
                </button>
                <button onClick={handleFinalize} disabled={!allLabelsPlaced || isFinalizing} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    <CheckCircleIcon className={`h-5 w-5 ${isFinalizing ? 'animate-spin' : ''}`} /> {isFinalizing ? 'Finalizing...' : 'Finalize Labels'}
                </button>
              </div>
            ) : (
              labels.length > 0 && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600">
                <ArrowUturnLeftIcon className="h-5 w-5" /> Re-edit Labels
              </button>
            )}
          </div>}
        </div>
      );

    default: // This will render text pages
      return (
        <div className="mb-6 last:mb-0">
          {shouldRenderTitle && <h4 className="font-semibold text-gray-700 mb-2">{page.title}</h4>}
          <ContentRenderer text={page.content} />
        </div>
      );
  }
};
export default LessonPage;