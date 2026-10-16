import React, { useState, useRef, useEffect } from 'react';
import { MedicalImage } from '../types/medical';
import { ZoomIn, ZoomOut, RotateCw, Contrast, X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Trash2 } from 'lucide-react';

interface Props {
  images: MedicalImage[];
  initialImageId: string;
  onClose: () => void;
  onDeleteImage?: (imageId: string) => void;
  onUpdateInterpretation?: (imageId: string, interpretation: string, aspects?: string) => void;
}

export const ImageViewerModal: React.FC<Props> = ({
  images,
  initialImageId,
  onClose,
  onDeleteImage,
  onUpdateInterpretation,
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = images.findIndex((img) => img.id === initialImageId);
    return idx >= 0 ? idx : 0;
  });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [inverted, setInverted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit interpretation state
  const currentImage = images[currentIndex];
  const [interpretation, setInterpretation] = useState(currentImage?.interpretation || '');
  const [aspects, setAspects] = useState(currentImage?.aspectsScore || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  useEffect(() => {
    if (currentImage) {
      setInterpretation(currentImage.interpretation || '');
      setAspects(currentImage.aspectsScore || '');
      resetTransform();
    }
  }, [currentIndex, currentImage?.id]);

  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setInverted(false);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 4.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSaveNotes = () => {
    if (onUpdateInterpretation && currentImage) {
      onUpdateInterpretation(currentImage.id, interpretation, aspects);
      setIsEditingNotes(false);
    }
  };

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 select-none">
      {/* Top Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 sm:px-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-cyan-400 font-mono font-semibold">
              {currentImage.modality}
            </span>
            <h3 className="text-sm sm:text-base font-semibold text-white truncate max-w-xs sm:max-w-md">
              {currentImage.title}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Study Time: {new Date(currentImage.studyDate).toLocaleString()} &bull; Image {currentIndex + 1} of {images.length}
            </span>
          </div>
        </div>

        {/* Action icons bar */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg bg-slate-800/80 border border-slate-700/80 p-0.5 text-white">
            <button
              onClick={() => handleZoom(-0.25)}
              className="p-1.5 hover:bg-slate-700 rounded transition"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => handleZoom(0.25)}
              className="p-1.5 hover:bg-slate-700 rounded transition"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-white hover:bg-slate-700 transition"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Invert contrast */}
          <button
            onClick={() => setInverted((prev) => !prev)}
            className={`p-2 rounded-lg border transition ${
              inverted
                ? 'bg-cyan-600 border-cyan-400 text-white'
                : 'bg-slate-800/80 border-slate-700/80 text-white hover:bg-slate-700'
            }`}
            title="Invert CT/MRI contrast (Windowing)"
          >
            <Contrast className="w-4 h-4" />
          </button>

          {/* Reset View */}
          <button
            onClick={resetTransform}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-300 hover:bg-slate-700 transition hidden sm:inline-block"
          >
            Reset
          </button>

          {/* Delete Scan Button */}
          {onDeleteImage && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition"
              title="Delete this scan"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white transition ml-1"
            title="Close viewer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal inside Lightbox */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full space-y-3 text-slate-100 shadow-2xl">
            <h4 className="font-bold text-sm text-white">Delete This Scan?</h4>
            <p className="text-xs text-slate-300">
              Are you sure you want to remove scan <strong className="text-white">"{currentImage.title}"</strong> from this case? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteImage?.(currentImage.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                Delete Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing pt-14 pb-20"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            filter: inverted ? 'invert(1) hue-rotate(180deg)' : 'none',
          }}
          className="relative max-h-full max-w-full flex items-center justify-center"
        >
          {currentImage.fileType === 'application/pdf' ? (
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl text-center max-w-lg">
              <p className="text-white font-medium mb-3">PDF Medical Document</p>
              <iframe
                src={currentImage.dataUrl}
                className="w-[80vw] h-[60vh] rounded border border-slate-700"
                title={currentImage.title}
              />
            </div>
          ) : (
            <img
              src={currentImage.dataUrl}
              alt={currentImage.title}
              className="max-h-[75vh] max-w-[85vw] object-contain rounded shadow-2xl pointer-events-none"
            />
          )}
        </div>
      </div>

      {/* Prev / Next Buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-cyan-600 transition shadow-lg"
            title="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 border border-slate-700 text-white hover:bg-cyan-600 transition shadow-lg"
            title="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Radiological Report / Interpretation Drawer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-950/90 border-t border-slate-800 p-3 sm:px-6 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Radiological Interpretation &amp; Notes
              </span>
              {currentImage.aspectsScore && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  ASPECTS: {currentImage.aspectsScore}/10
                </span>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2 mt-1">
                <textarea
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  rows={2}
                  className="w-full text-xs rounded border border-slate-700 bg-slate-900 p-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Enter radiological findings, ASPECTS score, occlusion site, hemorrhage size..."
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aspects}
                    onChange={(e) => setAspects(e.target.value)}
                    placeholder="ASPECTS (e.g. 8)"
                    className="w-32 text-xs rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                  />
                  <button
                    onClick={handleSaveNotes}
                    className="px-3 py-1 rounded bg-cyan-600 text-white text-xs font-medium hover:bg-cyan-500"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-300 line-clamp-2">
                {currentImage.interpretation || <span className="text-slate-500 italic">No formal interpretation recorded yet. Click edit to document findings.</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isEditingNotes && onUpdateInterpretation && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Edit Interpretation
              </button>
            )}

            {onDeleteImage && (
              <button
                onClick={() => {
                  if (confirm(`Remove ${currentImage.title} from this patient's case?`)) {
                    onDeleteImage(currentImage.id);
                    if (images.length <= 1) {
                      onClose();
                    } else {
                      setCurrentIndex(0);
                    }
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs font-medium text-rose-300 hover:bg-rose-900 transition"
              >
                Delete Image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
