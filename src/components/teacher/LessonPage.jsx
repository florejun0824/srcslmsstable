// src/components/teacher/LessonPage.jsx
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import ContentRenderer from "./ContentRenderer";
import {
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";

const getVideoEmbedUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
  return null;
};

const DEFAULT_IMAGE_WIDTH = 50;

// Component is wrapped in forwardRef to receive a ref from its parent
const LessonPage = forwardRef(({ page, isEditable, onFinalizeDiagram, onRevertDiagram, isFinalizing }, ref) => {
  const [error, setError] = useState(null);
  const [diagramData, setDiagramData] = useState(null);
  const [labels, setLabels] = useState([]);
  const [images, setImages] = useState([]);
  const [activeDrag, setActiveDrag] = useState(null);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState(null);
  const [editingLabelIndex, setEditingLabelIndex] = useState(null);
  const [activeImageDrag, setActiveImageDrag] = useState(null);
  const imageContainerRef = useRef(null);

  // Expose specific functions to the parent component (ViewLessonModal)
  useImperativeHandle(ref, () => ({
    addImage() {
      const url = window.prompt("Enter image URL");
      if (url) handleAddImage(url);
    },
    addLabel() {
      handleAddLabel();
    },
    finalizeDiagram() {
      if (!allLabelsPlaced || isFinalizing) {
        alert("All labels must be placed on the diagram before finalizing.");
        return;
      }
      handleFinalize();
    }
  }));

  useEffect(() => {
    if (!page) return;
    let pageContent = page.content;
    if (page.type === "diagram-data" && typeof page.content === "string") {
      const trimmed = page.content.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          pageContent = JSON.parse(trimmed);
        } catch (e) {
          console.error("Failed to parse diagram data as JSON:", e);
          setError("Could not load diagram data.");
          pageContent = null;
        }
      } else {
        pageContent = { generatedImageUrl: page.content || null, labels: [] };
      }
    }
    if (page.type === "diagram-data") {
      setError(null);
      setDiagramData(pageContent || null);
      const initialLabels = (pageContent?.labels || []).map((label, index) => {
        if (typeof label === "string") {
          return { text: label, labelX: 15, labelY: 10 + index * 8, pointX: 50, pointY: 50, fontSize: 12, isPlaced: false };
        }
        return { fontSize: 12, ...label };
      });
      setLabels(initialLabels);
      let urls = [];
      if (pageContent?.imageUrls && Array.isArray(pageContent.imageUrls) && pageContent.imageUrls.length > 0) {
        urls = pageContent.imageUrls.filter((url) => typeof url === "string" && url.trim() !== "");
      } else if (pageContent?.generatedImageUrl && typeof pageContent.generatedImageUrl === "string" && pageContent.generatedImageUrl.trim() !== "") {
        urls = [pageContent.generatedImageUrl];
      }
      const initialImages = pageContent?.images && Array.isArray(pageContent.images)
        ? pageContent.images.map((img, idx) => ({ url: img.url || urls[idx] || "", left: typeof img.left === "number" ? img.left : 50, top: typeof img.top === "number" ? img.top : 50, width: typeof img.width === "number" ? img.width : DEFAULT_IMAGE_WIDTH }))
        : urls.map((u, idx) => ({ url: u, left: 50, top: 50, width: DEFAULT_IMAGE_WIDTH }));
      setImages(initialImages);
    }
  }, [page]);

  const handleLabelMouseDown = (index, part) => (e) => { e.preventDefault(); e.stopPropagation(); setActiveDrag({ index, part }); setSelectedLabelIndex(index); };
  const handleLabelMouseMove = (e) => { if (activeDrag === null || !imageContainerRef.current) return; const { index, part } = activeDrag; const rect = imageContainerRef.current.getBoundingClientRect(); const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)); const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)); setLabels((prev) => prev.map((label, i) => { if (i === index) { const newLabel = { ...label }; if (part === "label") { newLabel.labelX = x; newLabel.labelY = y; newLabel.isPlaced = true; } else if (part === "point") { newLabel.pointX = x; newLabel.pointY = y; newLabel.isPlaced = true; } return newLabel; } return label; })); };
  const handleLabelMouseUp = () => setActiveDrag(null);
  const onImageMouseDown = (index, part) => (e) => { e.preventDefault(); e.stopPropagation(); if (!imageContainerRef.current) return; const rect = imageContainerRef.current.getBoundingClientRect(); const startX = e.clientX; const startY = e.clientY; const img = images[index]; setActiveImageDrag({ index, part, startX, startY, startLeft: img.left, startTop: img.top, startWidth: img.width, containerRect: rect }); };
  const handleImageMouseMove = (e) => { if (!activeImageDrag || !imageContainerRef.current) return; const { index, part, startX, startY, startLeft, startTop, startWidth, containerRect } = activeImageDrag; const rect = containerRect || imageContainerRef.current.getBoundingClientRect(); const dx = e.clientX - startX; const dy = e.clientY - startY; if (part === "move") { const deltaXPercent = (dx / rect.width) * 100; const deltaYPercent = (dy / rect.height) * 100; setImages((prev) => prev.map((img, i) => i === index ? { ...img, left: Math.max(0, Math.min(100, startLeft + deltaXPercent)), top: Math.max(0, Math.min(100, startTop + deltaYPercent)), } : img)); } else if (part === "resize") { const deltaWidthPercent = (dx / rect.width) * 100; setImages((prev) => prev.map((img, i) => i === index ? { ...img, width: Math.max(5, Math.min(100, startWidth + deltaWidthPercent)), } : img)); } };
  const handleImageMouseUp = () => setActiveImageDrag(null);
  const handleLabelClick = (index) => { if (!isEditable) return; setSelectedLabelIndex(index); setEditingLabelIndex(null); };
  const handleLabelDoubleClick = (index) => { if (!isEditable) return; setEditingLabelIndex(index); };
  const handleLabelTextChange = (e) => { const newText = e.target.value; setLabels((prev) => prev.map((label, i) => i === editingLabelIndex ? { ...label, text: newText } : label)); };
  const handleLabelTextBlur = () => setEditingLabelIndex(null);
  const handleFontSizeChange = (amount) => { if (selectedLabelIndex === null) return; setLabels((prev) => prev.map((label, i) => i === selectedLabelIndex ? { ...label, fontSize: Math.max(8, label.fontSize + amount) } : label)); };
  const handleDeleteLabel = () => { if (selectedLabelIndex === null) return; setLabels((prev) => prev.filter((_, i) => i !== selectedLabelIndex)); setSelectedLabelIndex(null); };
  const handleAddLabel = () => { const newLabel = { text: "New Label", labelX: 50, labelY: 50, pointX: 50, pointY: 50, fontSize: 12, isPlaced: false }; setLabels((prev) => [...prev, newLabel]); };
  const handleAddImage = (url = "") => { setImages((prev) => [ ...prev, { url, left: 50, top: 50, width: DEFAULT_IMAGE_WIDTH }, ]); };
  const handleRemoveImage = (index) => { setImages((prev) => prev.filter((_, i) => i !== index)); };
  const handleFinalize = () => { setSelectedLabelIndex(null); const payload = { ...diagramData, labels, images: images.map((img) => ({ url: img.url, left: typeof img.left === "number" ? img.left : 10, top: typeof img.top === "number" ? img.top : 10, width: typeof img.width === "number" ? img.width : DEFAULT_IMAGE_WIDTH, })), generatedImageUrl: images && images[0] ? images[0].url : diagramData?.generatedImageUrl, imageUrls: images.map((i) => i.url), }; if (typeof onFinalizeDiagram === "function") { onFinalizeDiagram(payload); } };
  const allLabelsPlaced = labels.length === 0 ? true : labels.every((l) => l.isPlaced);
  
  const shouldRenderTitle = page.title && page.title.trim() !== "";

  switch (page.type) {
    case "video": {
      const embedUrl = getVideoEmbedUrl(page.content); 
      const isDirectVideo = embedUrl && embedUrl.match(/\.(mp4|webm|ogg)$/i); 
      return ( 
        <div className="my-6"> 
          {/* --- MODIFIED: Themed title --- */}
          {shouldRenderTitle && ( <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-4"> {page.title} </h4> )} 
          {embedUrl ? ( 
              isDirectVideo ? ( 
                <video controls className="w-full rounded-lg shadow-md aspect-video bg-black"> 
                    <source src={embedUrl} type={`video/${embedUrl.split(".").pop()}`} /> 
                    Your browser does not support the video tag. 
                </video> 
              ) : ( 
                <div className="aspect-video"> 
                    <iframe className="w-full h-full rounded-lg shadow-md" src={embedUrl} title={page.title || "Lesson Video"} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen ></iframe> 
                </div> 
              ) 
          ) : ( 
            <div className="text-center text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"> 
                Invalid or unsupported video URL. 
            </div> 
          )} 
        </div> 
      );
    }
    case "diagram-data": {
      return (
        // --- MODIFIED: Themed container ---
        <div className="my-6 p-4 border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/20 dark:border-slate-700 select-none">
          {/* --- MODIFIED: Themed title --- */}
          {shouldRenderTitle && <h4 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">{page.title}</h4>}

          <div
            // --- MODIFIED: Themed image container ---
            className="relative w-full max-w-4xl mx-auto bg-white dark:bg-slate-800"
            ref={imageContainerRef}
            onMouseMove={(e) => { if (activeImageDrag) handleImageMouseMove(e); if (activeDrag) handleLabelMouseMove(e); }}
            onMouseUp={() => { handleImageMouseUp(); handleLabelMouseUp(); }}
            onMouseLeave={() => { handleImageMouseUp(); handleLabelMouseUp(); }}
            style={{ minHeight: 480 }}
          >
            {/* --- MODIFIED: Themed empty state --- */}
            {images.length === 0 && ( <div className="text-center text-slate-500 dark:text-slate-400 p-6 bg-slate-100 dark:bg-slate-700 rounded-lg"> No diagram available. Add an image to begin. </div> )}
            <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 1 }}> 
              {images.map((img, idx) => ( 
                <div key={idx} style={{ position: "absolute", left: `${img.left}%`, top: `${img.top}%`, width: `${img.width}%`, transform: "translate(-50%, -50%)", cursor: isEditable ? "move" : "default", pointerEvents: isEditable ? "auto" : "none", }} onMouseDown={ isEditable ? onImageMouseDown(idx, "move") : undefined } draggable={false} > 
                  <div className="relative"> 
                    <img src={img.url} alt={`diagram-${idx + 1}`} className="block w-full h-auto rounded-lg shadow-lg" draggable={false} /> 
                    {isEditable && ( 
                      <> 
                        {/* --- MODIFIED: Themed resize handle --- */}
                        <div onMouseDown={onImageMouseDown(idx, "resize")} className="absolute w-3.5 h-3.5 -right-1.5 -bottom-1.5 rounded-sm bg-white dark:bg-slate-700 border-2 border-gray-400 dark:border-slate-500 cursor-nwse-resize pointer-events-auto" /> 
                        <button title="Remove image" onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow z-10" > <TrashIcon className="h-4 w-4" /> 
                        </button> 
                      </> 
                    )} 
                  </div> 
                </div> 
              ))} 
            </div>
            <svg className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ zIndex: 2, pointerEvents: 'none' }}> 
              {labels.map( (label, index) => label.isPlaced && ( 
                <g key={index}> 
                  <line x1={`${label.labelX}%`} y1={`${label.labelY}%`} x2={`${label.pointX}%`} y2={`${label.pointY}%`} stroke="black" strokeWidth="2" strokeDasharray="4,3" /> 
                  <circle cx={`${label.pointX}%`} cy={`${label.pointY}%`} r="4" fill="red" stroke="white" strokeWidth="1" style={{ cursor: "grab", pointerEvents: isEditable ? "auto" : "none" }} onMouseDown={isEditable ? handleLabelMouseDown(index, "point") : null} /> 
                </g> 
              ))} 
            </svg>
            <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 3, pointerEvents: 'none' }}> 
              {labels.map((label, index) => ( 
                <div key={index} onMouseDown={isEditable ? handleLabelMouseDown(index, "label") : null} onClick={() => handleLabelClick(index)} onDoubleClick={() => handleLabelDoubleClick(index)} className={`absolute p-1 rounded font-bold text-white shadow-lg pointer-events-auto ${ isEditable ? "cursor-move" : "cursor-default" } ${label.isPlaced ? "bg-green-600" : "bg-blue-600"} ${ selectedLabelIndex === index ? "ring-2 ring-yellow-400" : "" }`} style={{ left: `${label.labelX}%`, top: `${label.labelY}%`, transform: "translate(-50%, -50%)", fontSize: `${label.fontSize}px`, }} > 
                  {editingLabelIndex === index ? ( 
                    /* --- MODIFIED: Themed input --- */
                    <input type="text" value={label.text} onChange={handleLabelTextChange} onBlur={handleLabelTextBlur} onKeyDown={(e) => e.key === "Enter" && handleLabelTextBlur()} autoFocus className="bg-transparent text-white w-full outline-none border-b border-white" /> ) : ( label.text )} 
                </div> 
              ))} 
            </div>
          </div>
          
          {isEditable && selectedLabelIndex !== null && (
            /* --- MODIFIED: Themed control bar --- */
            <div className="flex justify-center items-center gap-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg mt-4">
              <button onClick={() => handleFontSizeChange(-1)} className="px-2 py-1 bg-white dark:bg-slate-800 rounded shadow hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-100"><MinusIcon className="h-4 w-4" /></button>
              <span className="text-xs font-semibold w-6 text-center text-slate-800 dark:text-slate-100">{labels[selectedLabelIndex]?.fontSize}pt</span>
              <button onClick={() => handleFontSizeChange(1)} className="px-2 py-1 bg-white dark:bg-slate-800 rounded shadow hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-100"><PlusIcon className="h-4 w-4" /></button>
              <button onClick={handleDeleteLabel} className="px-2 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600 ml-2"><TrashIcon className="h-4 w-4" /></button>
            </div>
          )}

          {/* --- MODIFIED: Themed error text --- */}
          {error && <div className="text-red-500 dark:text-red-400 text-sm mt-4 text-center">{error}</div>}
        </div>
      );
    }

    case "diagram": {
        const content = page.content;
        return (
            <div className="my-6">
                {/* --- MODIFIED: Themed title --- */}
                {shouldRenderTitle && <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">{page.title}</h4>}
                
                {/* Container for the finalized diagram. */}
                <div 
                    // --- MODIFIED: Themed image container ---
                    className="relative block w-full max-w-4xl mx-auto bg-gray-100 dark:bg-slate-800 rounded-lg shadow-md overflow-hidden" 
                    style={{ height: '480px' }}
                >
                    {content && content.generatedImageUrl ? (
                        <img
                            src={content.generatedImageUrl}
                            alt="Finalized Diagram"
                            className="absolute top-1/2 left-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 object-contain"
                        />
                    ) : (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-gray-500 dark:text-slate-400">
                            Diagram image not available.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    default: {
      const content = page.content; 
      const contentString = (typeof content === 'string') ? content : JSON.stringify(content, null, 2); 
      return (
        <div className="mb-6 last:mb-0 overflow-x-auto"> 
          {/* --- MODIFIED: Themed title --- */}
          {shouldRenderTitle && ( <h4 className="font-semibold text-gray-700 dark:text-slate-200 mb-2">{page.title}</h4> )} 
          <ContentRenderer text={contentString} /> 
        </div> 
      );
    }
  }
});

export default LessonPage;