/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImagePlay, 
  Trash2, 
  Play, 
  FileDown, 
  FileCheck,
  ArrowUp, 
  ArrowDown,
  Settings
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useApp } from '../../context/AppContext';
import UploadDropzone from '../../components/UploadDropzone';
import { toast, Toaster } from 'sonner';

type PageSize = 'a4' | 'letter' | 'fit';
type Orientation = 'portrait' | 'landscape';
type MarginSize = 'none' | 'small' | 'medium' | 'large';

interface ImageFileItem {
  id: string;
  name: string;
  size: number;
  url: string;
  file: File;
}

export default function ImagesToPdfPage() {
  const { addProcessedStat } = useApp();
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('');

  // PDF Page Settings
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [marginSize, setMarginSize] = useState<MarginSize>('none');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesSelected = (files: File[]) => {
    const newItems = files.map(file => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      file: file
    }));

    setImages(prev => [...prev, ...newItems]);
    toast.success(`Added ${files.length} images to queue.`);

    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleRemove = (id: string, url: string) => {
    URL.revokeObjectURL(url);
    setImages(prev => prev.filter(item => item.id !== id));
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    setImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // Convert WebP, AVIF, HEIC to standard JPEG via client canvas buffer
  const convertImageToStandardBuffer = async (file: File): Promise<{ buffer: ArrayBuffer, type: 'png' | 'jpg' }> => {
    const type = file.type.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (type === 'image/png') {
      return { buffer: arrayBuffer, type: 'png' };
    }
    if (type === 'image/jpeg' || type === 'image/jpg') {
      return { buffer: arrayBuffer, type: 'jpg' };
    }

    // Dynamic browser canvas transcoding for WEBP/AVIF/etc.
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context failed."));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Blob compilation failed."));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve({ buffer: reader.result, type: 'jpg' });
            } else {
              reject(new Error("Buffer load failed."));
            }
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', 0.92);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image decoding failed."));
      };
      img.src = url;
    });
  };

  const handleCompile = async () => {
    if (images.length === 0) return;

    setIsCompiling(true);
    const toastId = toast.loading("Compiling images into PDF pages...", {
      style: {
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: "10px",
        borderRadius: "0",
        border: "1px solid black"
      }
    });

    try {
      const pdfDoc = await PDFDocument.create();

      // Determine page dimensions
      let pWidth = 595.28; // A4 default width in points
      let pHeight = 841.89; // A4 default height in points

      if (pageSize === 'letter') {
        pWidth = 612;
        pHeight = 792;
      }

      // Apply Orientation
      if (pageSize !== 'fit' && orientation === 'landscape') {
        const temp = pWidth;
        pWidth = pHeight;
        pHeight = temp;
      }

      // Determine Margins
      let margin = 0;
      if (marginSize === 'small') margin = 10;
      else if (marginSize === 'medium') margin = 20;
      else if (marginSize === 'large') margin = 35;

      for (const item of images) {
        const { buffer, type } = await convertImageToStandardBuffer(item.file);
        
        let embeddedImg;
        if (type === 'png') {
          embeddedImg = await pdfDoc.embedPng(buffer);
        } else {
          embeddedImg = await pdfDoc.embedJpg(buffer);
        }

        const imgWidth = embeddedImg.width;
        const imgHeight = embeddedImg.height;

        let finalPageWidth = pWidth;
        let finalPageHeight = pHeight;

        if (pageSize === 'fit') {
          // Wrap page around image exactly with no margin
          finalPageWidth = imgWidth;
          finalPageHeight = imgHeight;
        }

        const page = pdfDoc.addPage([finalPageWidth, finalPageHeight]);

        // Proportional sizing calculations with margins
        const availWidth = finalPageWidth - (margin * 2);
        const availHeight = finalPageHeight - (margin * 2);

        const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
        
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;

        const x = margin + (availWidth - drawWidth) / 2;
        const y = margin + (availHeight - drawHeight) / 2;

        page.drawImage(embeddedImg, {
          x,
          y,
          width: drawWidth,
          height: drawHeight
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setPdfName(`images-bundle-${Date.now()}.pdf`);

      // Update Session Telemetry
      addProcessedStat(0);

      toast.success("Images compiled to PDF successfully!", {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to compile PDF. Ensure images are readable formats.", {
        id: toastId,
        style: {
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: "10px",
          borderRadius: "0",
          border: "1px solid black"
        }
      });
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 font-mono">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <h1 className="text-sm font-black tracking-widest text-black dark:text-white uppercase flex items-center gap-2 leading-none">
            [ IMAGES TO PDF ]
            {isCompiling && (
              <span className="w-1.5 h-1.5 bg-black dark:bg-white animate-pulse" />
            )}
          </h1>
        </div>

        {images.length > 0 && (
          <div className="flex items-center gap-3 bg-transparent p-3 py-1.5 border border-black dark:border-white rounded-none shrink-0 font-mono text-[9px] tracking-widest text-black dark:text-white select-none">
            <div>
              <span className="font-extrabold block">TOTAL IMAGES: {images.length}</span>
              <span className="block mt-0.5 opacity-60">LAYOUT: {pageSize.toUpperCase()} ({orientation.toUpperCase()})</span>
            </div>
          </div>
        )}
      </div>

      {/* Dropzone */}
      <UploadDropzone
        onFilesSelected={handleFilesSelected}
        acceptedTypes={['image/*']}
        acceptedExtensions={['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']}
        descriptionText="UPLOAD BATCH IMAGES TO COMPILE"
      />

      {images.length > 0 && (
        <div className="flex flex-col gap-6 mt-2">
          
          {/* Configurations Box */}
          <div className="border border-neutral-200 dark:border-neutral-800 p-5 rounded-none flex flex-col gap-5 bg-neutral-50/20 dark:bg-neutral-950/20">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-neutral-400" />
              PAGE DESIGN LAYOUT
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
              {/* Option 1: Page Size */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  PAGE DIMENSIONS
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as PageSize)}
                  className="bg-transparent border border-neutral-300 dark:border-neutral-800 p-2.5 text-xs text-black dark:text-white font-mono focus:outline-none rounded-none w-full"
                >
                  <option value="a4" className="bg-white dark:bg-black">A4 Standard (595 x 841 pt)</option>
                  <option value="letter" className="bg-white dark:bg-black">US Letter (612 x 792 pt)</option>
                  <option value="fit" className="bg-white dark:bg-black">Fit Image Bounds (No margin)</option>
                </select>
              </div>

              {/* Option 2: Orientation */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  PAGE ORIENTATION
                </span>
                <select
                  value={orientation}
                  disabled={pageSize === 'fit'}
                  onChange={(e) => setOrientation(e.target.value as Orientation)}
                  className="bg-transparent border border-neutral-300 dark:border-neutral-800 p-2.5 text-xs text-black dark:text-white font-mono focus:outline-none rounded-none w-full disabled:opacity-20"
                >
                  <option value="portrait" className="bg-white dark:bg-black">PORTRAIT</option>
                  <option value="landscape" className="bg-white dark:bg-black">LANDSCAPE</option>
                </select>
              </div>

              {/* Option 3: Margins */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-extrabold text-neutral-450 dark:text-neutral-500 tracking-widest uppercase">
                  PAGE MARGINS
                </span>
                <select
                  value={marginSize}
                  disabled={pageSize === 'fit'}
                  onChange={(e) => setMarginSize(e.target.value as MarginSize)}
                  className="bg-transparent border border-neutral-300 dark:border-neutral-800 p-2.5 text-xs text-black dark:text-white font-mono focus:outline-none rounded-none w-full disabled:opacity-20"
                >
                  <option value="none" className="bg-white dark:bg-black">NONE (0 pt)</option>
                  <option value="small" className="bg-white dark:bg-black">SMALL (10 pt)</option>
                  <option value="medium" className="bg-white dark:bg-black">MEDIUM (20 pt)</option>
                  <option value="large" className="bg-white dark:bg-black">LARGE (35 pt)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex justify-between items-center">
              <span className="text-[8px] text-neutral-400 dark:text-neutral-550 leading-relaxed max-w-md uppercase">
                * Scaling: Proportional fit is automatically applied to draw full images without stretching.
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompile}
                  disabled={isCompiling}
                  className="px-5 py-2 bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-35 text-white dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer shadow-xs border border-black dark:border-white transition-all duration-100 active:scale-98"
                >
                  <Play className="w-3 h-3 fill-current" />
                  COMPILE PDF
                </button>
                
                <button
                  onClick={handleClear}
                  disabled={isCompiling}
                  className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-450 hover:text-black dark:hover:text-white rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Queue
                </button>
              </div>
            </div>
          </div>

          {/* Compiled Download Result Card */}
          {pdfUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-green-600 dark:border-green-400 p-5 rounded-none flex flex-col sm:flex-row items-center justify-between gap-4 bg-transparent font-mono"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border border-green-600 dark:border-green-400 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest leading-none">
                    PDF COMPILATION COMPLETE
                  </span>
                  <span className="text-[9px] text-neutral-450 dark:text-neutral-500 mt-1.5 truncate max-w-xs sm:max-w-md">
                    {pdfName}
                  </span>
                </div>
              </div>
              
              <a
                href={pdfUrl}
                download={pdfName}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-black rounded-none text-[9px] tracking-widest font-extrabold uppercase flex items-center gap-1.5 cursor-pointer select-none transition-all duration-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </motion.div>
          )}

          {/* Queue Title */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
            <span className="text-[10px] font-bold tracking-widest text-neutral-450 dark:text-neutral-500 uppercase">
              COMPILER IMAGE QUEUE ({images.length} ITEMS)
            </span>
          </div>

          {/* Reorderable Image List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {images.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border border-neutral-200 dark:border-neutral-800 p-4 rounded-none flex items-center gap-4 bg-transparent justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[8px] font-bold text-neutral-400 w-4">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    
                    {/* Tiny Image Thumbnail */}
                    <div className="w-10 h-10 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={item.url} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover" 
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-black dark:text-white truncate max-w-[120px] sm:max-w-[160px] uppercase tracking-wider">
                        {item.name}
                      </span>
                      <span className="text-[8px] text-neutral-450 dark:text-neutral-500 mt-0.5">
                        SIZE: {formatBytes(item.size)}
                      </span>
                    </div>
                  </div>

                  {/* Reorder actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0 || isCompiling}
                      className="p-1 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-20 text-neutral-400 dark:text-neutral-500 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === images.length - 1 || isCompiling}
                      className="p-1 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-20 text-neutral-400 dark:text-neutral-500 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(item.id, item.url)}
                      disabled={isCompiling}
                      className="p-1 border border-red-200 dark:border-red-950 text-red-550 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      )}

      {images.length === 0 && (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-4 bg-transparent border border-dashed border-neutral-200 dark:border-neutral-800 rounded-none font-mono">
          <div className="w-10 h-10 border border-black dark:border-white flex items-center justify-center text-black dark:text-white shrink-0">
            <ImagePlay className="w-4 h-4" />
          </div>
          <div className="max-w-xs">
            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest block">
              [ IMAGES QUEUE IS EMPTY ]
            </span>
            <p className="text-[9px] text-neutral-450 dark:text-neutral-500 mt-2 leading-relaxed tracking-wider">
              Upload images (PNG, JPG, WEBP, AVIF). Sort their compile order, configure design dimensions, margins, and compile them into a multi-page PDF locally.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
