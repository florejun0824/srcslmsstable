// src/components/teacher/LessonPage.js
import React, { useState, useEffect, useRef } from "react";
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

  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return url;
  }

  return null;
};

const DEFAULT_IMAGE_WIDTH = 50; // percent of container width

const LessonPage = ({ page, isEditable, onFinalizeDiagram, isFinalizing }) => {
  const [error, setError] = useState(null);

  // Diagram data: labels + images array
  const [diagramData, setDiagramData] = useState(null);
  const [labels, setLabels] = useState([]);
  const [images, setImages] = useState([]); // each: { url, left, top, width } percentages
  const [isEditing, setIsEditing] = useState(false);

  // dragging state for labels
  const [activeDrag, setActiveDrag] = useState(null);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState(null);
  const [editingLabelIndex, setEditingLabelIndex] = useState(null);

  // dragging/resizing state for images
  const [activeImageDrag, setActiveImageDrag] = useState(null); // { index, part, startX,... }

  const imageContainerRef = useRef(null);

  // Initialize diagramData, labels and images from page.content
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
        pageContent = {
          generatedImageUrl: page.content || null,
          labels: [],
        };
      }
    }

    if (page.type === "diagram-data") {
      setError(null);
      setDiagramData(pageContent || null);

      const initialLabels = (pageContent?.labels || []).map((label, index) => {
        if (typeof label === "string") {
          return {
            text: label,
            labelX: 15,
            labelY: 10 + index * 8,
            pointX: 50,
            pointY: 50,
            fontSize: 12,
            isPlaced: false,
          };
        }
        return { fontSize: 12, ...label };
      });
      setLabels(initialLabels);

      let urls = [];
      if (
        pageContent?.imageUrls &&
        Array.isArray(pageContent.imageUrls) &&
        pageContent.imageUrls.length > 0
      ) {
        urls = pageContent.imageUrls.filter(
          (url) => typeof url === "string" && url.trim() !== ""
        );
      } else if (
        pageContent?.generatedImageUrl &&
        typeof pageContent.generatedImageUrl === "string" &&
        pageContent.generatedImageUrl.trim() !== ""
      ) {
        urls = [pageContent.generatedImageUrl];
      }

      const initialImages =
        pageContent?.images && Array.isArray(pageContent.images)
          ? pageContent.images.map((img, idx) => ({
              url: img.url || urls[idx] || "",
              left: typeof img.left === "number" ? img.left : 10 + idx * 8,
              top: typeof img.top === "number" ? img.top : 10 + idx * 8,
              width:
                typeof img.width === "number"
                  ? img.width
                  : DEFAULT_IMAGE_WIDTH,
            }))
          : urls.map((u, idx) => ({
              url: u,
              left: 10 + idx * 8,
              top: 10 + idx * 8,
              width: DEFAULT_IMAGE_WIDTH,
            }));

      setImages(initialImages);
    }

    setIsEditing(!!isEditable);
  }, [page, isEditable]);

  // ---------- Label dragging ----------
  const handleLabelMouseDown = (index, part) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDrag({ index, part });
    setSelectedLabelIndex(index);
  };

  const handleLabelMouseMove = (e) => {
    if (activeDrag === null || !imageContainerRef.current) return;
    const { index, part } = activeDrag;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const y = Math.max(
      0,
      Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
    );

    setLabels((prev) =>
      prev.map((label, i) => {
        if (i === index) {
          const newLabel = { ...label };
          if (part === "label") {
            newLabel.labelX = x;
            newLabel.labelY = y;
            newLabel.isPlaced = true;
          } else if (part === "point") {
            newLabel.pointX = x;
            newLabel.pointY = y;
            newLabel.isPlaced = true;
          }
          return newLabel;
        }
        return label;
      })
    );
  };

  const handleLabelMouseUp = () => setActiveDrag(null);

  // ---------- Image dragging & resizing ----------
  const onImageMouseDown = (index, part) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const img = images[index];
    setActiveImageDrag({
      index,
      part,
      startX,
      startY,
      startLeft: img.left,
      startTop: img.top,
      startWidth: img.width,
      containerRect: rect,
    });
  };

  const handleImageMouseMove = (e) => {
    if (!activeImageDrag || !imageContainerRef.current) return;
    const {
      index,
      part,
      startX,
      startY,
      startLeft,
      startTop,
      startWidth,
      containerRect,
    } = activeImageDrag;
    const rect =
      containerRect || imageContainerRef.current.getBoundingClientRect();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (part === "move") {
      const deltaXPercent = (dx / rect.width) * 100;
      const deltaYPercent = (dy / rect.height) * 100;
      setImages((prev) =>
        prev.map((img, i) =>
          i === index
            ? {
                ...img,
                left: Math.max(0, Math.min(100, startLeft + deltaXPercent)),
                top: Math.max(0, Math.min(100, startTop + deltaYPercent)),
              }
            : img
        )
      );
    } else if (part === "resize") {
      const deltaWidthPercent = (dx / rect.width) * 100;
      setImages((prev) =>
        prev.map((img, i) =>
          i === index
            ? {
                ...img,
                width: Math.max(5, Math.min(100, startWidth + deltaWidthPercent)),
              }
            : img
        )
      );
    }
  };

  const handleImageMouseUp = () => setActiveImageDrag(null);

  // ---------- Label UI helpers ----------
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
    setLabels((prev) =>
      prev.map((label, i) =>
        i === editingLabelIndex ? { ...label, text: newText } : label
      )
    );
  };

  const handleLabelTextBlur = () => setEditingLabelIndex(null);

  const handleFontSizeChange = (amount) => {
    if (selectedLabelIndex === null) return;
    setLabels((prev) =>
      prev.map((label, i) =>
        i === selectedLabelIndex
          ? { ...label, fontSize: Math.max(8, label.fontSize + amount) }
          : label
      )
    );
  };

  const handleDeleteLabel = () => {
    if (selectedLabelIndex === null) return;
    setLabels((prev) => prev.filter((_, i) => i !== selectedLabelIndex));
    setSelectedLabelIndex(null);
  };

  const handleAddLabel = () => {
    const newLabel = {
      text: "New Label",
      labelX: 50,
      labelY: 50,
      pointX: 50,
      pointY: 50,
      fontSize: 12,
      isPlaced: false,
    };
    setLabels((prev) => [...prev, newLabel]);
  };

  // ---------- Image helpers ----------
  const handleAddImage = (url = "") => {
    setImages((prev) => [
      ...prev,
      {
        url,
        left: 10 + prev.length * 8,
        top: 10 + prev.length * 8,
        width: DEFAULT_IMAGE_WIDTH,
      },
    ]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- Finalize ----------
  const handleFinalize = () => {
    setIsEditing(false);
    setSelectedLabelIndex(null);

    const payload = {
      ...diagramData,
      labels,
      images: images.map((img) => ({
        url: img.url,
        left: typeof img.left === "number" ? img.left : 10,
        top: typeof img.top === "number" ? img.top : 10,
        width: typeof img.width === "number" ? img.width : DEFAULT_IMAGE_WIDTH,
      })),
      generatedImageUrl:
        images && images[0] ? images[0].url : diagramData?.generatedImageUrl,
      imageUrls: images.map((i) => i.url),
    };

    if (typeof onFinalizeDiagram === "function") {
      onFinalizeDiagram(payload);
    }
  };

  const allLabelsPlaced =
    labels.length === 0 ? true : labels.every((l) => l.isPlaced);

  if (
    !page ||
    (typeof page.content !== "string" && typeof page.content !== "object")
  )
    return null;
  const shouldRenderTitle = page.title && page.title.trim() !== "";

  // ---------- RENDER ----------
  switch (page.type) {
    case "video": {
      const embedUrl = getVideoEmbedUrl(page.content);
      const isDirectVideo =
        embedUrl && embedUrl.match(/\.(mp4|webm|ogg)$/i);

      return (
        <div className="my-6">
          {shouldRenderTitle && (
            <h4 className="text-xl font-bold text-slate-700 mb-4">
              {page.title}
            </h4>
          )}
          {embedUrl ? (
            isDirectVideo ? (
              <video
                controls
                className="w-full rounded-lg shadow-md aspect-video bg-black"
              >
                <source
                  src={embedUrl}
                  type={`video/${embedUrl.split(".").pop()}`}
                />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg shadow-md"
                  src={embedUrl}
                  title={page.title || "Lesson Video"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )
          ) : (
            <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
              Invalid or unsupported video URL.
            </div>
          )}
        </div>
      );
    }

    case "diagram-data": {
      return (
        <div className="my-6 p-4 border-2 border-dashed rounded-lg bg-slate-50 select-none">
          {shouldRenderTitle && (
            <h4 className="text-xl font-bold text-slate-700 mb-2">
              {page.title}
            </h4>
          )}

          <div
            className="relative w-full max-w-4xl mx-auto bg-white"
            ref={imageContainerRef}
            onMouseMove={(e) => {
              if (activeImageDrag) handleImageMouseMove(e);
              if (activeDrag) handleLabelMouseMove(e);
            }}
            onMouseUp={() => {
              handleImageMouseUp();
              handleLabelMouseUp();
            }}
            onMouseLeave={() => {
              handleImageMouseUp();
              handleLabelMouseUp();
            }}
            style={{ minHeight: 480 }}
          >
            {images.length === 0 && (
              <div className="text-center text-slate-500 p-6 bg-slate-100 rounded-lg">
                No diagram available.
              </div>
            )}

            {/* Layer 1: Images */}
            <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 1 }}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    left: `${img.left}%`,
                    top: `${img.top}%`,
                    width: `${img.width}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: isEditing ? "move" : "default",
                    pointerEvents: isEditing ? "auto" : "none",
                  }}
                  onMouseDown={
                    isEditing ? onImageMouseDown(idx, "move") : undefined
                  }
                  draggable={false}
                >
                  <div className="relative">
                    <img
                      src={img.url}
                      alt={`diagram-${idx + 1}`}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "auto",
                        borderRadius: 8,
                        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                        userSelect: "none",
                      }}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                    />

                    {isEditing && (
                      <>
                        <div
                          onMouseDown={onImageMouseDown(idx, "resize")}
                          className="absolute"
                          style={{
                            width: 14,
                            height: 14,
                            right: -7,
                            bottom: -7,
                            borderRadius: 3,
                            background: "white",
                            border: "2px solid rgba(0,0,0,0.2)",
                            cursor: "nwse-resize",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pointerEvents: "auto",
                          }}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M21 3v6M21 3h-6"
                              stroke="#333"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <button
                          title="Remove image"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                          style={{ zIndex: 50, pointerEvents: "auto" }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Layer 2: SVG for lines */}
            <svg className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ zIndex: 2, pointerEvents: 'none' }}>
              {labels.map(
                (label, index) =>
                  (label.isPlaced || !isEditing) && (
                    <g key={index}>
                      <line
                        x1={`${label.labelX}%`}
                        y1={`${label.labelY}%`}
                        x2={`${label.pointX}%`}
                        y2={`${label.pointY}%`}
                        stroke="black"
                        strokeWidth="2"
                        strokeDasharray="4,3"
                        style={{ pointerEvents: "none" }}
                      />
                      <circle
                        cx={`${label.pointX}%`}
                        cy={`${label.pointY}%`}
                        r="4"
                        fill="red"
                        stroke="white"
                        strokeWidth="1"
                        style={{ cursor: "grab", pointerEvents: isEditing ? "auto" : "none" }}
                        onMouseDown={isEditing ? handleLabelMouseDown(index, "point") : null}
                      />
                    </g>
                  )
              )}
            </svg>

            {/* Layer 3: Label boxes */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }}>
              {labels.map((label, index) => (
                <div
                  key={index}
                  onMouseDown={isEditing ? handleLabelMouseDown(index, "label") : null}
                  onClick={() => handleLabelClick(index)}
                  onDoubleClick={() => handleLabelDoubleClick(index)}
                  className={`absolute p-1 rounded font-bold text-white shadow-lg pointer-events-auto ${
                    isEditing ? "cursor-move" : "cursor-default"
                  } ${label.isPlaced ? "bg-green-600" : "bg-blue-600"} ${
                    selectedLabelIndex === index ? "ring-2 ring-yellow-400" : ""
                  }`}
                  style={{
                    left: `${label.labelX}%`,
                    top: `${label.labelY}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${label.fontSize}px`,
                  }}
                >
                  {editingLabelIndex === index ? (
                    <input
                      type="text"
                      value={label.text}
                      onChange={handleLabelTextChange}
                      onBlur={handleLabelTextBlur}
                      onKeyDown={(e) => e.key === "Enter" && handleLabelTextBlur()}
                      autoFocus
                      className="bg-transparent text-white w-full outline-none border-b border-white"
                    />
                  ) : (
                    label.text
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Teacher controls */}
          {isEditable && images.length >= 0 && (
            <div className="flex justify-center items-center flex-wrap gap-3 mt-4">
              {/* Add Image, Add Label, and Finalize buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const url = window.prompt("Enter image URL");
                    if (url) handleAddImage(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <PhotoIcon className="h-5 w-5" /> Add Image
                </button>

                {isEditing && (
                  <button
                    onClick={handleAddLabel}
                    disabled={isFinalizing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 active:scale-95 transition-all"
                  >
                    <PlusIcon className="h-5 w-5" /> Add Label
                  </button>
                )}

                {isEditing ? (
                  <button
                    onClick={handleFinalize}
                    disabled={!allLabelsPlaced || isFinalizing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    <CheckCircleIcon className={`h-5 w-5 ${isFinalizing ? "animate-spin" : ""}`} />
                    {isFinalizing ? "Finalizing..." : "Finalize Labels & Images"}
                  </button>
                ) : (
                  labels.length > 0 && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 active:scale-95 transition-all"
                    >
                      <ArrowUturnLeftIcon className="h-5 w-5" /> Re-edit
                    </button>
                  )
                )}
              </div>

              {/* Label controls */}
              {selectedLabelIndex !== null && isEditing && (
                <div className="flex items-center gap-1 p-1 bg-slate-200 rounded-lg mt-2">
                  <button
                    onClick={() => handleFontSizeChange(-1)}
                    className="px-2 py-1 bg-white rounded shadow hover:bg-slate-100"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold w-6 text-center">
                    {labels[selectedLabelIndex]?.fontSize}pt
                  </span>
                  <button
                    onClick={() => handleFontSizeChange(1)}
                    className="px-2 py-1 bg-white rounded shadow hover:bg-slate-100"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleDeleteLabel}
                    className="px-2 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600 ml-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              <span className="text-sm text-slate-600 mt-2 block w-full text-center">
                Drag images to position them. Use the bottom-right handle to resize.
              </span>
            </div>
          )}

          {error && <div className="text-red-500 text-sm mt-4 text-center">{error}</div>}
        </div>
      );
    }

    // ✅ FIX: Add a new case specifically for the finalized 'diagram' type
    case "diagram": {
        const content = page.content;
        // Ensure content is an object with the URL we need
        if (content && typeof content === 'object' && content.generatedImageUrl) {
            return (
                <div className="my-6">
                    {shouldRenderTitle && <h4 className="font-semibold text-gray-700 mb-2">{page.title}</h4>}
                    <img
                        src={content.generatedImageUrl}
                        alt="Lesson Diagram"
                        className="w-full h-auto rounded-md shadow-md bg-gray-200"
                    />
                </div>
            );
        }
        // Fallback if the data is malformed
        return (
            <div className="my-6 p-4 border rounded bg-yellow-50 text-yellow-700">
                Invalid diagram format.
            </div>
        );
    }

    default: {
      const content = page.content;
      const shouldRenderTitle = page.title && page.title.trim() !== "";
      
      // The default case now only handles strings. All special objects have their own cases.
      const contentString = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);

      return (
        <div className="mb-6 last:mb-0">
          {shouldRenderTitle && (
            <h4 className="font-semibold text-gray-700 mb-2">{page.title}</h4>
          )}
          <ContentRenderer text={contentString} />
        </div>
      );
    }
  }
};

export default LessonPage;